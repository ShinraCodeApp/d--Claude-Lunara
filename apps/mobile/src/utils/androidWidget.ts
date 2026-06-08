import { NativeModules, Platform } from 'react-native'

interface WidgetData {
  phase: string
  phaseEmoji: string
  dayOfCycle: number
  daysUntilPeriod: number
}

const PHASE_EMOJIS: Record<string, string> = {
  MENSTRUAL: '🩸',
  FOLLICULAR: '🌱',
  OVULATORY: '⭐',
  LUTEAL: '🌙',
}

const PHASE_NAMES: Record<string, string> = {
  MENSTRUAL: 'Fase menstrual',
  FOLLICULAR: 'Fase folicular',
  OVULATORY: 'Fase ovulatoria',
  LUTEAL: 'Fase lútea',
}

export function updateAndroidWidget(data: WidgetData) {
  if (Platform.OS !== 'android') return

  try {
    // Uses SharedPreferences to pass data to the native widget
    const { LunaraWidgetModule } = NativeModules
    if (LunaraWidgetModule?.updateWidget) {
      LunaraWidgetModule.updateWidget(data)
    }
  } catch {
    // Widget update is non-critical; fail silently
  }
}

export function buildWidgetData(params: {
  currentPhase: string | null
  dayOfCycle: number
  nextPeriodDate: string | null
}): WidgetData {
  const phase = params.currentPhase ?? 'LUTEAL'
  const daysUntil = params.nextPeriodDate
    ? Math.ceil((new Date(params.nextPeriodDate).getTime() - Date.now()) / 86400000)
    : -1

  return {
    phase: PHASE_NAMES[phase] ?? 'Fase lútea',
    phaseEmoji: PHASE_EMOJIS[phase] ?? '🌙',
    dayOfCycle: params.dayOfCycle,
    daysUntilPeriod: daysUntil,
  }
}
