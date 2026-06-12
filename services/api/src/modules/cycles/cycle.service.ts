import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import { prisma } from '@/config/database'

dayjs.extend(isBetween)
import { redis, REDIS_KEYS } from '@/config/redis'
import { PredictionEngine } from '../predictions/prediction.engine'
import { GardenService } from '../garden/garden.service'

const gardenService = new GardenService()

export class CycleService {
  async getCycles(userId: string, { limit, offset }: { limit: number; offset: number }) {
    const [cycles, total] = await Promise.all([
      prisma.menstrualCycle.findMany({
        where: { userId },
        orderBy: { startDate: 'desc' },
        take: limit,
        skip: offset,
        include: { bleedingDays: { orderBy: { date: 'asc' } } },
      }),
      prisma.menstrualCycle.count({ where: { userId } }),
    ])

    return { cycles, total, limit, offset }
  }

  async getCurrentCycle(userId: string) {
    const today = dayjs().startOf('day').toDate()

    const activeCycle = await prisma.menstrualCycle.findFirst({
      where: {
        userId,
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
      orderBy: { startDate: 'desc' },
      include: { bleedingDays: true },
    })

    const prediction = await prisma.cyclePrediction.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    const dayOfCycle = activeCycle
      ? dayjs().diff(dayjs(activeCycle.startDate), 'day') + 1
      : null

    return {
      activeCycle,
      prediction,
      dayOfCycle,
      phase: dayOfCycle && prediction
        ? this.getCurrentPhase(dayOfCycle, prediction)
        : null,
    }
  }

  async startCycle(userId: string, data: { startDate: string; notes?: string }) {
    // Close any open cycles
    await prisma.menstrualCycle.updateMany({
      where: { userId, endDate: null },
      data: { endDate: dayjs(data.startDate).subtract(1, 'day').toDate() },
    })

    const cycle = await prisma.menstrualCycle.create({
      data: {
        userId,
        startDate: new Date(data.startDate),
        notes: data.notes,
        bleedingDays: {
          create: {
            date: new Date(data.startDate),
            intensity: 'MEDIUM',
          },
        },
      },
      include: { bleedingDays: true },
    })

    // Recalculate predictions
    await this.recalculatePredictions(userId)

    // Award XP for cycle tracking
    await gardenService.awardXP(userId, 10, 'cycle_log')

    // Invalidate cache
    await redis.del(REDIS_KEYS.cyclePrediction(userId))

    return cycle
  }

  async endCycle(userId: string, cycleId: string, data: { endDate: string; notes?: string }) {
    const cycle = await prisma.menstrualCycle.findUnique({
      where: { id: cycleId, userId },
    })
    if (!cycle) throw { statusCode: 404, message: 'Ciclo no encontrado' }

    const endDate = new Date(data.endDate)
    const periodLength = dayjs(endDate).diff(dayjs(cycle.startDate), 'day') + 1

    const updated = await prisma.menstrualCycle.update({
      where: { id: cycleId },
      data: {
        endDate,
        periodLength,
        notes: data.notes ?? cycle.notes,
      },
    })

    // Award XP for completing cycle log
    await gardenService.awardXP(userId, 20, 'cycle_complete')
    await this.recalculatePredictions(userId)

    return updated
  }

  async logBleedingDay(userId: string, cycleId: string, data: {
    date: string
    intensity: string
    notes?: string
  }) {
    // Verify cycle belongs to user
    const cycle = await prisma.menstrualCycle.findUnique({
      where: { id: cycleId, userId },
    })
    if (!cycle) throw { statusCode: 404, message: 'Ciclo no encontrado' }

    const bleedingDay = await prisma.bleedingDay.upsert({
      where: { cycleId_date: { cycleId, date: new Date(data.date) } },
      update: { intensity: data.intensity as any, notes: data.notes },
      create: {
        cycleId,
        date: new Date(data.date),
        intensity: data.intensity as any,
        notes: data.notes,
      },
    })

    return bleedingDay
  }

  async getCalendarData(userId: string, year: number, month: number) {
    const startOfMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).startOf('month')
    const endOfMonth = startOfMonth.endOf('month')

    const [cycles, prediction] = await Promise.all([
      prisma.menstrualCycle.findMany({
        where: {
          userId,
          startDate: { lte: endOfMonth.toDate() },
          OR: [
            { endDate: { gte: startOfMonth.toDate() } },
            { endDate: null },
          ],
        },
        include: { bleedingDays: true },
      }),
      prisma.cyclePrediction.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // Build day-by-day map for the month
    const days: Record<string, {
      type: 'period' | 'predicted_period' | 'ovulation' | 'fertile' | 'normal'
      intensity?: string
      cycleDay?: number
      phase?: string
    }> = {}

    // Mark actual period days
    for (const cycle of cycles) {
      for (const bleeding of cycle.bleedingDays) {
        const dateStr = dayjs(bleeding.date).format('YYYY-MM-DD')
        if (dayjs(bleeding.date).isBetween(startOfMonth, endOfMonth, 'day', '[]')) {
          days[dateStr] = { type: 'period', intensity: bleeding.intensity }
        }
      }
    }

    // Mark predicted days
    if (prediction) {
      const predStart = dayjs(prediction.predictedStartDate)
      const predEnd = dayjs(prediction.predictedEndDate)
      const ovulation = dayjs(prediction.ovulationDate)
      const fertileStart = dayjs(prediction.fertilityWindowStart)
      const fertileEnd = dayjs(prediction.fertilityWindowEnd)

      let d = startOfMonth
      while (d.isBefore(endOfMonth) || d.isSame(endOfMonth, 'day')) {
        const dateStr = d.format('YYYY-MM-DD')
        if (!days[dateStr]) {
          if (d.isBetween(predStart, predEnd, 'day', '[]')) {
            days[dateStr] = { type: 'predicted_period' }
          } else if (d.isSame(ovulation, 'day')) {
            days[dateStr] = { type: 'ovulation' }
          } else if (d.isBetween(fertileStart, fertileEnd, 'day', '[]')) {
            days[dateStr] = { type: 'fertile' }
          }
        }
        d = d.add(1, 'day')
      }
    }

    return { days, prediction, cycles }
  }

  async getStats(userId: string) {
    const cycles = await prisma.menstrualCycle.findMany({
      where: { userId, endDate: { not: null } },
      orderBy: { startDate: 'desc' },
      take: 12,
    })

    if (cycles.length === 0) return { message: 'No hay datos suficientes' }

    const cycleLengths = this.calculateCycleLengths(cycles)
    const periodLengths = cycles.filter((c) => c.periodLength).map((c) => c.periodLength!)

    return {
      totalCyclesTracked: await prisma.menstrualCycle.count({ where: { userId } }),
      averageCycleLength: this.avg(cycleLengths),
      shortestCycle: Math.min(...cycleLengths),
      longestCycle: Math.max(...cycleLengths),
      averagePeriodLength: this.avg(periodLengths),
      cycleRegularity: this.calculateRegularity(cycleLengths),
      recentCycles: cycles.slice(0, 6),
    }
  }

  async deleteCycle(userId: string, cycleId: string) {
    const cycle = await prisma.menstrualCycle.findUnique({
      where: { id: cycleId, userId },
    })
    if (!cycle) throw { statusCode: 404, message: 'Ciclo no encontrado' }

    await prisma.menstrualCycle.delete({ where: { id: cycleId } })
    await this.recalculatePredictions(userId)
  }

  private async recalculatePredictions(userId: string) {
    const cycles = await prisma.menstrualCycle.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
      take: 6,
    })

    const profile = await prisma.userProfile.findUnique({ where: { userId } })
    const periodLength = profile?.averagePeriodLength ?? 5

    const prediction = PredictionEngine.predict(cycles, periodLength)

    // Deactivate old predictions
    await prisma.cyclePrediction.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    })

    // Save new prediction
    await prisma.cyclePrediction.create({
      data: {
        userId,
        predictedStartDate: prediction.predictedStartDate,
        predictedEndDate: prediction.predictedEndDate,
        ovulationDate: prediction.ovulationDate,
        fertilityWindowStart: prediction.fertilityWindowStart,
        fertilityWindowEnd: prediction.fertilityWindowEnd,
        confidence: prediction.confidence,
        cyclesAnalyzed: prediction.cyclesAnalyzed,
        dailyFertilityScores: prediction.dailyFertilityScores as never,
        algorithm: 'weighted_average_v2',
      },
    })

    // Update user profile averages
    if (cycles.length >= 2) {
      const lengths = this.calculateCycleLengths(cycles)
      await prisma.userProfile.update({
        where: { userId },
        data: { averageCycleLength: Math.round(this.avg(lengths)) },
      })
    }

    await redis.del(REDIS_KEYS.cyclePrediction(userId))
  }

  private calculateCycleLengths(cycles: { startDate: Date }[]): number[] {
    const lengths: number[] = []
    for (let i = 0; i < cycles.length - 1; i++) {
      const len = dayjs(cycles[i].startDate).diff(dayjs(cycles[i + 1].startDate), 'day')
      if (len >= 21 && len <= 45) lengths.push(len)
    }
    return lengths
  }

  private avg(arr: number[]): number {
    if (arr.length === 0) return 0
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10
  }

  private calculateRegularity(lengths: number[]): 'very_regular' | 'regular' | 'somewhat_irregular' | 'irregular' {
    if (lengths.length < 2) return 'regular'
    const mean = this.avg(lengths)
    const variance = lengths.reduce((s, l) => s + Math.pow(l - mean, 2), 0) / lengths.length
    const stdDev = Math.sqrt(variance)
    if (stdDev <= 1) return 'very_regular'
    if (stdDev <= 3) return 'regular'
    if (stdDev <= 7) return 'somewhat_irregular'
    return 'irregular'
  }

  private getCurrentPhase(dayOfCycle: number, prediction: any): string {
    if (dayOfCycle <= 5) return 'menstrual'
    const ovulationDay = Math.round(prediction.averageCycleLength - 14)
    if (dayOfCycle < ovulationDay - 1) return 'follicular'
    if (dayOfCycle >= ovulationDay - 1 && dayOfCycle <= ovulationDay + 1) return 'ovulatory'
    return 'luteal'
  }
}
