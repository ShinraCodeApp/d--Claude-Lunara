import { prisma } from '@/config/database'

interface UpsertProfileInput {
  lastMenstrualPeriod: Date
  dueDate?: Date
}

interface WeekLogInput {
  week: number
  weight?: number
  symptoms?: string[]
  notes?: string
}

// Fetal development milestones by week
const WEEK_INFO: Record<number, { size: string; development: string; tips: string[] }> = {
  4: { size: 'Semilla de amapola', development: 'El embrión se está implantando en el útero', tips: ['Toma ácido fólico', 'Evita el alcohol y tabaco'] },
  8: { size: 'Frambuesa', development: 'Brazos y piernas se forman, latido detectado', tips: ['Primera cita prenatal', 'Mantén hidratación'] },
  12: { size: 'Lima', development: 'Fin del primer trimestre, riesgo menor de aborto', tips: ['Ecografía del 1er trimestre', 'Análisis de sangre'] },
  16: { size: 'Aguacate', development: 'Movimientos fetales posibles, genitales visibles', tips: ['Considera ropa premamá', 'Ejercicio suave'] },
  20: { size: 'Plátano', development: 'Mitad del embarazo, pelo y uñas creciendo', tips: ['Ecografía morfológica', 'Siente las patadas'] },
  24: { size: 'Mazorca de maíz', development: 'Pulmones desarrollándose, ojos pueden abrirse', tips: ['Habla al bebé', 'Prepara el espacio del bebé'] },
  28: { size: 'Berenjena', development: 'Inicio del 3er trimestre, cerebro muy activo', tips: ['Clases de preparación al parto', 'Descansa de lado izquierdo'] },
  32: { size: 'Melón cantaloup', development: 'Grasa acumulándose, puede ver y oír', tips: ['Cuenta las patadas', 'Prepara la bolsa del hospital'] },
  36: { size: 'Panal de lechuga', development: 'Bebé en posición, casi a término', tips: ['Visitas semanales al médico', 'Revisa plan de parto'] },
  40: { size: 'Calabaza', development: 'Bebé a término, preparado para nacer', tips: ['Descansa', 'Confía en tu cuerpo'] },
}

export class PregnancyService {
  async upsertProfile(userId: string, input: UpsertProfileInput) {
    const gestationalAge = this.calculateGestationalAge(input.lastMenstrualPeriod)
    const dueDate = input.dueDate ?? this.calculateDueDate(input.lastMenstrualPeriod)

    return prisma.pregnancyProfile.upsert({
      where: { userId },
      create: {
        userId,
        lastMenstrualPeriod: input.lastMenstrualPeriod,
        dueDate,
        currentWeek: gestationalAge,
      },
      update: {
        lastMenstrualPeriod: input.lastMenstrualPeriod,
        dueDate,
        currentWeek: gestationalAge,
      },
    })
  }

  async getProfile(userId: string) {
    const profile = await prisma.pregnancyProfile.findUnique({ where: { userId } })
    if (!profile) return null

    const currentWeek = this.calculateGestationalAge(profile.lastMenstrualPeriod)
    const daysUntilDue = Math.ceil((profile.dueDate.getTime() - Date.now()) / 86400000)
    const weekInfo = this.getWeekInfo(currentWeek)

    return { ...profile, currentWeek, daysUntilDue, weekInfo }
  }

  async logWeek(userId: string, input: WeekLogInput) {
    const profile = await prisma.pregnancyProfile.findUniqueOrThrow({ where: { userId } })
    return prisma.pregnancyWeekLog.create({
      data: {
        profileId: profile.id,
        week: input.week,
        weight: input.weight,
        notes: input.notes,
      },
    })
  }

  async getWeekLogs(userId: string) {
    const profile = await prisma.pregnancyProfile.findUnique({ where: { userId } })
    if (!profile) return []
    return prisma.pregnancyWeekLog.findMany({
      where: { profileId: profile.id },
      orderBy: { week: 'asc' },
    })
  }

  getWeekInfo(week: number) {
    const nearestWeek = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40].reduce((prev, curr) =>
      Math.abs(curr - week) < Math.abs(prev - week) ? curr : prev
    )
    return WEEK_INFO[nearestWeek] ?? WEEK_INFO[40]
  }

  async deactivateProfile(userId: string) {
    await prisma.pregnancyProfile.deleteMany({ where: { userId } })
  }

  private calculateGestationalAge(lmp: Date): number {
    const days = Math.floor((Date.now() - lmp.getTime()) / 86400000)
    return Math.max(1, Math.min(42, Math.floor(days / 7)))
  }

  private calculateDueDate(lmp: Date): Date {
    const due = new Date(lmp)
    due.setDate(due.getDate() + 280) // Naegele's rule: LMP + 280 days
    return due
  }
}
