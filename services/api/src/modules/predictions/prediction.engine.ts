import dayjs from 'dayjs'

export interface CycleData {
  startDate: Date
  endDate?: Date | null
  cycleLength?: number | null
}

export interface PredictionResult {
  predictedStartDate: Date
  predictedEndDate: Date
  ovulationDate: Date
  fertilityWindowStart: Date
  fertilityWindowEnd: Date
  confidence: number
  cyclesAnalyzed: number
  dailyFertilityScores: DailyFertilityScore[]
  averageCycleLength: number
  irregularityScore: number
}

export interface DailyFertilityScore {
  date: string
  score: number       // 0-100
  phase: CyclePhase
}

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal'

export class PredictionEngine {
  private static readonly MAX_CYCLES_ANALYZED = 6
  private static readonly MIN_CYCLE_LENGTH = 21
  private static readonly MAX_CYCLE_LENGTH = 45
  private static readonly DEFAULT_CYCLE_LENGTH = 28
  private static readonly DEFAULT_PERIOD_LENGTH = 5
  private static readonly LUTEAL_PHASE_LENGTH = 14 // relatively constant

  static predict(cycles: CycleData[], defaultPeriodLength = 5): PredictionResult {
    const validCycles = this.filterValidCycles(cycles)
    const cyclesToAnalyze = validCycles.slice(0, this.MAX_CYCLES_ANALYZED)

    if (cyclesToAnalyze.length === 0) {
      return this.defaultPrediction(defaultPeriodLength)
    }

    const cycleLengths = this.calculateCycleLengths(cyclesToAnalyze)
    const averageCycleLength = this.weightedAverage(cycleLengths)
    const irregularityScore = this.calculateIrregularity(cycleLengths)
    const confidence = this.calculateConfidence(cyclesToAnalyze.length, irregularityScore)

    const lastCycle = cyclesToAnalyze[0]
    const lastStart = dayjs(lastCycle.startDate)

    const predictedStart = lastStart.add(Math.round(averageCycleLength), 'day')
    const predictedEnd = predictedStart.add(defaultPeriodLength - 1, 'day')

    // Ovulation: cycle length - luteal phase (relatively constant at 14 days)
    const ovulationDay = Math.round(averageCycleLength) - this.LUTEAL_PHASE_LENGTH
    const ovulationDate = predictedStart.add(ovulationDay - 1, 'day')
    const fertilityWindowStart = ovulationDate.subtract(5, 'day')
    const fertilityWindowEnd = ovulationDate.add(1, 'day')

    const dailyFertilityScores = this.generateDailyScores(
      predictedStart.toDate(),
      averageCycleLength,
      defaultPeriodLength,
      ovulationDay
    )

    return {
      predictedStartDate: predictedStart.toDate(),
      predictedEndDate: predictedEnd.toDate(),
      ovulationDate: ovulationDate.toDate(),
      fertilityWindowStart: fertilityWindowStart.toDate(),
      fertilityWindowEnd: fertilityWindowEnd.toDate(),
      confidence,
      cyclesAnalyzed: cyclesToAnalyze.length,
      dailyFertilityScores,
      averageCycleLength,
      irregularityScore,
    }
  }

  private static filterValidCycles(cycles: CycleData[]): CycleData[] {
    return cycles
      .filter((c) => c.startDate)
      .sort((a, b) => dayjs(b.startDate).valueOf() - dayjs(a.startDate).valueOf())
      .filter((_, i, arr) => {
        if (i === arr.length - 1) return true
        const len = dayjs(arr[i].startDate).diff(arr[i + 1].startDate, 'day')
        return len >= this.MIN_CYCLE_LENGTH && len <= this.MAX_CYCLE_LENGTH
      })
  }

  private static calculateCycleLengths(cycles: CycleData[]): number[] {
    const lengths: number[] = []
    for (let i = 0; i < cycles.length - 1; i++) {
      const len = dayjs(cycles[i].startDate).diff(cycles[i + 1].startDate, 'day')
      if (len >= this.MIN_CYCLE_LENGTH && len <= this.MAX_CYCLE_LENGTH) {
        lengths.push(len)
      }
    }
    return lengths.length > 0 ? lengths : [this.DEFAULT_CYCLE_LENGTH]
  }

  private static weightedAverage(lengths: number[]): number {
    if (lengths.length === 0) return this.DEFAULT_CYCLE_LENGTH
    // Recent cycles have more weight (exponential decay)
    const weights = lengths.map((_, i) => Math.pow(0.7, i))
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    const weightedSum = lengths.reduce((sum, len, i) => sum + len * weights[i], 0)
    return weightedSum / totalWeight
  }

  private static calculateIrregularity(lengths: number[]): number {
    if (lengths.length < 2) return 0
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length
    const stdDev = Math.sqrt(variance)
    return Math.min(stdDev / mean, 1) // 0 = regular, 1 = very irregular
  }

  private static calculateConfidence(cycleCount: number, irregularity: number): number {
    const countFactor = Math.min(cycleCount / this.MAX_CYCLES_ANALYZED, 1)
    const regularityFactor = 1 - irregularity
    return Math.round((countFactor * 0.6 + regularityFactor * 0.4) * 100) / 100
  }

  private static generateDailyScores(
    cycleStart: Date,
    cycleLength: number,
    periodLength: number,
    ovulationDay: number
  ): DailyFertilityScore[] {
    const scores: DailyFertilityScore[] = []
    const days = Math.round(cycleLength)

    for (let day = 1; day <= days; day++) {
      const date = dayjs(cycleStart).add(day - 1, 'day')
      const phase = this.getPhase(day, periodLength, ovulationDay, days)
      const score = this.getFertilityScore(day, ovulationDay)

      scores.push({
        date: date.format('YYYY-MM-DD'),
        score,
        phase,
      })
    }

    return scores
  }

  private static getPhase(
    day: number,
    periodLength: number,
    ovulationDay: number,
    cycleLength: number
  ): CyclePhase {
    if (day <= periodLength) return 'menstrual'
    if (day < ovulationDay - 1) return 'follicular'
    if (day >= ovulationDay - 1 && day <= ovulationDay + 1) return 'ovulatory'
    return 'luteal'
  }

  private static getFertilityScore(day: number, ovulationDay: number): number {
    const distance = Math.abs(day - ovulationDay)
    if (distance === 0) return 95
    if (distance === 1) return 80
    if (distance === 2) return 65
    if (distance === 3) return 45
    if (distance === 4) return 25
    if (distance === 5) return 10
    return 0
  }

  private static defaultPrediction(periodLength: number): PredictionResult {
    const today = dayjs()
    const predictedStart = today.add(this.DEFAULT_CYCLE_LENGTH, 'day')
    const ovulationDay = this.DEFAULT_CYCLE_LENGTH - this.LUTEAL_PHASE_LENGTH

    return {
      predictedStartDate: predictedStart.toDate(),
      predictedEndDate: predictedStart.add(periodLength - 1, 'day').toDate(),
      ovulationDate: today.add(ovulationDay - 1, 'day').toDate(),
      fertilityWindowStart: today.add(ovulationDay - 6, 'day').toDate(),
      fertilityWindowEnd: today.add(ovulationDay, 'day').toDate(),
      confidence: 0.3,
      cyclesAnalyzed: 0,
      dailyFertilityScores: [],
      averageCycleLength: this.DEFAULT_CYCLE_LENGTH,
      irregularityScore: 0,
    }
  }
}
