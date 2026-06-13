import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registerNotificationCategories() {
  await Notifications.setNotificationCategoryAsync('QUICK_LOG', [
    {
      identifier: 'OPEN_LOG',
      buttonTitle: '📝 Registrar ahora',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'DISMISS',
      buttonTitle: 'Más tarde',
      options: { opensAppToForeground: false, isDestructive: false },
    },
  ])
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('lunara-default', {
      name: 'Lunara',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    })
    await Notifications.setNotificationChannelAsync('lunara-cycle', {
      name: 'Ciclo menstrual',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 250, 400],
    })
    await Notifications.setNotificationChannelAsync('lunara-health', {
      name: 'Salud diaria',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true

  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function scheduleDailyLogReminder(hour = 20, minute = 0) {
  await registerNotificationCategories()
  await Notifications.cancelScheduledNotificationAsync('daily-log').catch(() => {})
  await Notifications.scheduleNotificationAsync({
    identifier: 'daily-log',
    content: {
      title: '🌙 ¿Cómo te sientes hoy?',
      body: 'Registra tu día en Lunara y mantén tu jardín vivo.',
      data: { screen: '/(tabs)/log' },
      categoryIdentifier: 'QUICK_LOG',
    },
    trigger: {
      hour,
      minute,
      repeats: true,
      channelId: 'lunara-default',
    } as Notifications.DailyTriggerInput,
  })
}

export async function schedulePeriodReminder(nextPeriodDate: string) {
  await Notifications.cancelScheduledNotificationAsync('period-soon').catch(() => {})
  const date = new Date(nextPeriodDate)
  date.setDate(date.getDate() - 3)
  date.setHours(9, 0, 0, 0)
  if (date <= new Date()) return

  await Notifications.scheduleNotificationAsync({
    identifier: 'period-soon',
    content: {
      title: '🌙 Tu período llega en 3 días',
      body: 'Tu cuerpo se está preparando. Descansa bien y ten a mano lo que necesitas.',
      data: { screen: '/(tabs)' },
      categoryIdentifier: 'QUICK_LOG',
    },
    trigger: { date, channelId: 'lunara-cycle' } as Notifications.DateTriggerInput,
  })
}

export async function schedulePeriodOneDayReminder(nextPeriodDate: string) {
  await Notifications.cancelScheduledNotificationAsync('period-1day').catch(() => {})
  const date = new Date(nextPeriodDate)
  date.setDate(date.getDate() - 1)
  date.setHours(9, 0, 0, 0)
  if (date <= new Date()) return

  await Notifications.scheduleNotificationAsync({
    identifier: 'period-1day',
    content: {
      title: '🌑 Tu período llega mañana',
      body: 'Es normal sentirte diferente hoy. Hidrátate, descansa y prepara lo que necesitas.',
      data: { screen: '/(tabs)' },
      categoryIdentifier: 'QUICK_LOG',
    },
    trigger: { date, channelId: 'lunara-cycle' } as Notifications.DateTriggerInput,
  })
}

export async function schedulePeriodDayNotification(nextPeriodDate: string) {
  await Notifications.cancelScheduledNotificationAsync('period-today').catch(() => {})
  const date = new Date(nextPeriodDate)
  date.setHours(8, 0, 0, 0)
  if (date <= new Date()) return

  await Notifications.scheduleNotificationAsync({
    identifier: 'period-today',
    content: {
      title: '❤️ Tu período comenzó hoy',
      body: 'Cuídate mucho. Descansa, hidrátate y date permiso de ir más despacio hoy.',
      data: { screen: '/(tabs)/log' },
      categoryIdentifier: 'QUICK_LOG',
    },
    trigger: { date, channelId: 'lunara-cycle' } as Notifications.DateTriggerInput,
  })
}

export async function scheduleFertileReminder(fertileStart: string) {
  await Notifications.cancelScheduledNotificationAsync('fertile-window').catch(() => {})
  const date = new Date(fertileStart)
  date.setHours(8, 0, 0, 0)
  if (date <= new Date()) return

  await Notifications.scheduleNotificationAsync({
    identifier: 'fertile-window',
    content: {
      title: '🌸 Comienza tu ventana fértil',
      body: 'Estos son tus días de mayor probabilidad de concepción. Tu energía está subiendo.',
      data: { screen: '/(tabs)' },
      categoryIdentifier: 'QUICK_LOG',
    },
    trigger: { date, channelId: 'lunara-cycle' } as Notifications.DateTriggerInput,
  })
}

export async function schedulePillReminder(hour = 9, minute = 0) {
  await Notifications.cancelScheduledNotificationAsync('pill-reminder').catch(() => {})
  await Notifications.scheduleNotificationAsync({
    identifier: 'pill-reminder',
    content: {
      title: '💊 Recordatorio de pastilla',
      body: '¡No olvides tomar tu anticonceptivo hoy!',
      data: { screen: '/(tabs)/log' },
      categoryIdentifier: 'lunara-health',
    },
    trigger: {
      hour,
      minute,
      repeats: true,
      channelId: 'lunara-health',
    } as Notifications.DailyTriggerInput,
  })
}

export async function scheduleWaterReminder() {
  await Notifications.cancelScheduledNotificationAsync('water-reminder').catch(() => {})
  await Notifications.scheduleNotificationAsync({
    identifier: 'water-reminder',
    content: {
      title: '💧 Hidratación',
      body: '¿Ya tomaste suficiente agua hoy? Tu cuerpo te lo agradece.',
      data: { screen: '/(tabs)/log' },
      categoryIdentifier: 'lunara-health',
    },
    trigger: {
      hour: 15,
      minute: 0,
      repeats: true,
      channelId: 'lunara-health',
    } as Notifications.DailyTriggerInput,
  })
}

export async function scheduleOvulationReminder(ovulationDate: string) {
  await Notifications.cancelScheduledNotificationAsync('ovulation').catch(() => {})
  const date = new Date(ovulationDate)
  date.setDate(date.getDate() - 1)
  date.setHours(8, 0, 0, 0)
  if (date <= new Date()) return

  await Notifications.scheduleNotificationAsync({
    identifier: 'ovulation',
    content: {
      title: '🥚 Mañana es tu día de ovulación',
      body: 'Tu pico de fertilidad se acerca. Registra tu temperatura basal y flujo cervical.',
      data: { screen: '/(tabs)/log' },
      categoryIdentifier: 'QUICK_LOG',
    },
    trigger: { date, channelId: 'lunara-cycle' } as Notifications.DateTriggerInput,
  })
}

export async function scheduleOvulationDayNotification(ovulationDate: string) {
  await Notifications.cancelScheduledNotificationAsync('ovulation-today').catch(() => {})
  const date = new Date(ovulationDate)
  date.setHours(8, 30, 0, 0)
  if (date <= new Date()) return

  await Notifications.scheduleNotificationAsync({
    identifier: 'ovulation-today',
    content: {
      title: '🌕 Hoy es tu día más fértil',
      body: '¡Tu pico de fertilidad y energía! Es tu mejor día para casi todo. Registra cómo te sientes.',
      data: { screen: '/(tabs)/log' },
      categoryIdentifier: 'QUICK_LOG',
    },
    trigger: { date, channelId: 'lunara-cycle' } as Notifications.DateTriggerInput,
  })
}

export async function cancelAllLunaraNotifications() {
  const ids = [
    'daily-log', 'period-soon', 'period-1day', 'period-today',
    'fertile-window', 'pill-reminder', 'water-reminder',
    'ovulation', 'ovulation-today',
    'phase-transition', 'energy-warning', 'mood-heads-up',
  ]
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})))
}

// ─── Predictive notifications ─────────────────────────────────

const PHASE_TRANSITION_MSGS: Record<string, { title: string; body: string }> = {
  menstrual:  { title: '🌑 Tu período comenzará mañana', body: 'Prepara lo que necesitas: calor local, ibuprofeno, snacks favoritos. Tu cuerpo trabaja duro.' },
  follicular: { title: '🌒 Entrando a fase folicular', body: 'Tu energía irá subiendo los próximos días. Buen momento para proyectos y planes nuevos.' },
  ovulatory:  { title: '🌕 Mañana es tu día de ovulación', body: 'Tu pico de fertilidad se acerca. Registra tu temperatura basal y flujo cervical.' },
  luteal:     { title: '🌗 Empieza tu fase lútea', body: 'Es normal sentirse más introspectiva. Prioriza el descanso y la nutrición estos días.' },
}

export async function schedulePhaseTransitionNotification(
  nextPhase: keyof typeof PHASE_TRANSITION_MSGS,
  transitionDate: string
) {
  const date = new Date(transitionDate)
  date.setDate(date.getDate() - 1)
  date.setHours(9, 0, 0, 0)
  if (date <= new Date()) return

  const msg = PHASE_TRANSITION_MSGS[nextPhase]
  await Notifications.cancelScheduledNotificationAsync('phase-transition').catch(() => {})
  await Notifications.scheduleNotificationAsync({
    identifier: 'phase-transition',
    content: {
      title: msg.title,
      body: msg.body,
      data: { screen: '/(tabs)' },
      categoryIdentifier: 'lunara-cycle',
    },
    trigger: { date, channelId: 'lunara-cycle' } as Notifications.DateTriggerInput,
  })
}

export async function scheduleEnergyWarning(lowEnergyPhase: string) {
  // Fire 2 days into the known low-energy phase
  await Notifications.cancelScheduledNotificationAsync('energy-warning').catch(() => {})
  await Notifications.scheduleNotificationAsync({
    identifier: 'energy-warning',
    content: {
      title: '⚡ Tu energía puede bajar hoy',
      body: `Según tus patrones, la fase ${lowEnergyPhase} suele traerte fatiga. Hidrátate y descansa bien.`,
      data: { screen: '/(tabs)/log' },
      categoryIdentifier: 'lunara-health',
    },
    trigger: { seconds: 60, repeats: false } as Notifications.TimeIntervalTriggerInput,
  })
}

export async function scheduleMoodHeadsUp(phase: string, mood: string) {
  const moodMsg: Record<string, string> = {
    ansiosa: 'La ansiedad que sientes es real y tiene base hormonal. Respira, es pasajero.',
    irritable: 'Tu irritabilidad de estos días tiene causa hormonal. Comunícalo a quienes te rodean.',
    triste: 'La tristeza en esta fase es normal. Date permiso de sentir y cuídate.',
  }
  const body = moodMsg[mood.toLowerCase()]
  if (!body) return

  await Notifications.cancelScheduledNotificationAsync('mood-heads-up').catch(() => {})
  await Notifications.scheduleNotificationAsync({
    identifier: 'mood-heads-up',
    content: {
      title: '💜 Un recordatorio para ti',
      body,
      data: { screen: '/(tabs)/log' },
      categoryIdentifier: 'lunara-health',
    },
    trigger: { hour: 11, minute: 0, repeats: false } as any,
  })
}

export async function scheduleAllCycleNotifications(opts: {
  nextPeriodDate?: string | null
  fertileWindowStart?: string | null
  nextOvulationDate?: string | null
  logReminderEnabled: boolean
  pillReminderEnabled: boolean
  waterReminderEnabled: boolean
  logReminderHour: number
  pillReminderHour: number
}) {
  if (opts.logReminderEnabled) await scheduleDailyLogReminder(opts.logReminderHour)
  else await Notifications.cancelScheduledNotificationAsync('daily-log').catch(() => {})

  if (opts.pillReminderEnabled) await schedulePillReminder(opts.pillReminderHour)
  else await Notifications.cancelScheduledNotificationAsync('pill-reminder').catch(() => {})

  if (opts.waterReminderEnabled) await scheduleWaterReminder()
  else await Notifications.cancelScheduledNotificationAsync('water-reminder').catch(() => {})

  if (opts.nextPeriodDate) {
    await schedulePeriodReminder(opts.nextPeriodDate)
    await schedulePeriodOneDayReminder(opts.nextPeriodDate)
    await schedulePeriodDayNotification(opts.nextPeriodDate)
  }
  if (opts.fertileWindowStart) await scheduleFertileReminder(opts.fertileWindowStart)
  if (opts.nextOvulationDate) {
    await scheduleOvulationReminder(opts.nextOvulationDate)
    await scheduleOvulationDayNotification(opts.nextOvulationDate)
  }
}
