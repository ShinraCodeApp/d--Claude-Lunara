import { WidgetTaskHandlerProps, RNAndroidWidget } from '@react-native-android-widget'
import { MMKV } from 'react-native-mmkv'

const widgetStorage = new MMKV({ id: 'lunara-store' })

async function getWidgetData(): Promise<{ emoji: string; days: string; label: string }> {
  try {
    const raw = widgetStorage.getString('lunara-store')
    if (!raw) return { emoji: '🌙', days: 'Abrí Lunara', label: 'para ver tu ciclo' }

    const state = JSON.parse(raw)
    const cycleStore = state?.state?.cycleStore ?? state
    const nextPeriodDate: string | null = cycleStore?.nextPeriodDate ?? null
    const currentPhase: string | null = cycleStore?.currentPhase ?? null
    const dayOfCycle: number | null = cycleStore?.dayOfCycle ?? null

    const PHASE_EMOJI: Record<string, string> = {
      menstrual: '🩸', follicular: '🌱', ovulatory: '🌕', luteal: '🌘',
    }

    if (nextPeriodDate) {
      const daysLeft = Math.max(0, Math.ceil((new Date(nextPeriodDate).getTime() - Date.now()) / 86400000))
      const emoji = PHASE_EMOJI[currentPhase ?? ''] ?? '🌙'
      if (daysLeft === 0) return { emoji: '🩸', days: 'Período hoy', label: `Día ${dayOfCycle ?? '?'} del ciclo` }
      if (daysLeft === 1) return { emoji, days: 'Período mañana', label: `Día ${dayOfCycle ?? '?'} del ciclo` }
      return { emoji, days: `${daysLeft} días`, label: 'para tu período' }
    }

    if (dayOfCycle) {
      const emoji = PHASE_EMOJI[currentPhase ?? ''] ?? '🌙'
      return { emoji, days: `Día ${dayOfCycle}`, label: currentPhase ?? 'del ciclo' }
    }

    return { emoji: '🌙', days: 'Abrí Lunara', label: 'para ver tu ciclo' }
  } catch {
    return { emoji: '🌙', days: 'Lunara', label: 'ciclo' }
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const { emoji, days, label } = await getWidgetData()
      await RNAndroidWidget.drawWidget(widgetInfo.widgetName, widgetInfo.widgetId, {
        type: 'LinearLayout',
        orientation: 'vertical',
        gravity: 'center',
        backgroundColor: '#1a0533',
        borderRadius: 16,
        padding: { top: 8, bottom: 8, start: 12, end: 12 },
        children: [
          {
            type: 'Text',
            text: emoji,
            textSize: 24,
            gravity: 'center',
          },
          {
            type: 'Text',
            text: days,
            textSize: 14,
            textColor: '#FFFFFF',
            textStyle: 'bold',
            gravity: 'center',
          },
          {
            type: 'Text',
            text: label,
            textSize: 10,
            textColor: '#C4B5FD',
            gravity: 'center',
          },
        ],
      })
      break
    }
    case 'WIDGET_CLICK':
      // Opens Lunara when widget is tapped
      break
    default:
      break
  }
}
