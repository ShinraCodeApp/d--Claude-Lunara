import { NativeModules, Platform } from 'react-native'
import dayjs from 'dayjs'

const { LunaraWidget } = NativeModules

const PHASE_NAMES: Record<string, string> = {
  menstrual: 'Fase Menstrual',
  follicular: 'Fase Folicular',
  ovulatory: 'Fase Ovulatoria',
  luteal: 'Fase Lútea',
}

const PHASE_EMOJIS: Record<string, string> = {
  menstrual: '🩸',
  follicular: '🌱',
  ovulatory: '🌕',
  luteal: '🌘',
}

interface WidgetData {
  phase: string | null
  dayOfCycle: number | null
  nextPeriodDate: string | null
}

export function updateHomeWidget(data: WidgetData) {
  if (Platform.OS !== 'android' || !LunaraWidget?.updateWidgetData) return

  const phase = data.phase ?? 'follicular'
  const daysUntilPeriod = data.nextPeriodDate
    ? dayjs(data.nextPeriodDate).diff(dayjs(), 'day')
    : -1

  LunaraWidget.updateWidgetData({
    phase: PHASE_NAMES[phase] ?? 'Fase Folicular',
    phaseEmoji: PHASE_EMOJIS[phase] ?? '🌙',
    dayOfCycle: data.dayOfCycle ?? 1,
    daysUntilPeriod,
  })
}
