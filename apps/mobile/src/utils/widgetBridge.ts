import { NativeModules, Platform } from 'react-native'

interface WidgetData {
  phase: string
  phaseEmoji: string
  dayOfCycle: number
  daysUntilPeriod: number
}

const PHASE_EMOJIS: Record<string, string> = {
  menstrual: '🩸',
  folicular: '🌱',
  ovulacion: '🌟',
  ovulatorio: '🌟',
  lutea: '🌙',
  luteo: '🌙',
}

const PHASE_LABELS: Record<string, string> = {
  menstrual: 'Período',
  folicular: 'Fase folicular',
  ovulacion: 'Ovulación',
  ovulatorio: 'Ovulación',
  lutea: 'Fase lútea',
  luteo: 'Fase lútea',
}

export function updateWidget(data: Partial<WidgetData>) {
  if (Platform.OS !== 'android') return
  try {
    NativeModules.LunaraWidget?.updateWidgetData(data)
  } catch {}
}

export function updateWidgetFromCycleData(params: {
  phase: string
  dayOfCycle: number
  cycleLength?: number
  periodLength?: number
}) {
  if (Platform.OS !== 'android') return
  const { phase, dayOfCycle, cycleLength = 28, periodLength = 5 } = params
  const key = phase.toLowerCase().replace(/\s/g, '')
  const phaseEmoji = PHASE_EMOJIS[key] ?? '🌙'
  const phaseLabel = PHASE_LABELS[key] ?? phase

  let daysUntilPeriod = -1
  if (key !== 'menstrual') {
    daysUntilPeriod = Math.max(0, cycleLength - dayOfCycle)
  }

  updateWidget({ phase: phaseLabel, phaseEmoji, dayOfCycle, daysUntilPeriod })
}
