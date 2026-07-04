import React, { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts, Nunito_400Regular, Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito'
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display'
import * as Sentry from '@sentry/react-native'
import { ThemeProvider, useAppTheme } from '@/context/ThemeContext'

import * as Notifications from 'expo-notifications'
import { useAuthStore, useSettingsStore, useCycleStore, useGardenStore, useSymptomStore } from '@/store'
import { requestNotificationPermissions, scheduleAllCycleNotifications, registerNotificationCategories } from '@/utils/notifications'
import { updateHomeWidget } from '@/utils/widget'
import PinLockScreen from '@/screens/security/PinLockScreen'
import PrivacyConsentScreen from '@/screens/legal/PrivacyConsentScreen'
import '@/i18n'

// Dev-only: populate stores with a full admin user so the app is usable
// without a running backend. Remove or gate behind a flag before release.
if (__DEV__) {
  const auth = useAuthStore.getState()
  if (!auth.isAuthenticated) {
    auth.setToken('dev-admin-token')
    auth.setUser({
      id: 'dev-admin-001',
      email: 'admin@shinracode.com',
      role: 'admin',
      profile: {
        firstName: 'Yamil',
        lastName: 'ShinraCode',
        avatarUrl: undefined,
        onboardingCompleted: true,
      },
      subscription: {
        tier: 'PREMIUM',
        status: 'active',
        isPremium: true,
        currentPeriodEnd: '2027-01-01T00:00:00.000Z',
      },
    })
    useSettingsStore.getState().setHasSeenOnboarding(true)
    useCycleStore.getState().setCurrentCycle({
      currentPhase: 'follicular',
      dayOfCycle: 8,
      nextPeriodDate: '2026-06-22T00:00:00.000Z',
      nextOvulationDate: '2026-06-15T00:00:00.000Z',
      fertileWindowStart: '2026-06-13T00:00:00.000Z',
      fertileWindowEnd: '2026-06-17T00:00:00.000Z',
      predictionConfidence: 92,
      isInPeriod: false,
    })
    useGardenStore.getState().setGarden({
      stage: 'LUNAR_GARDEN',
      xp: 4800,
      level: 12,
      crystalBalance: 350,
      currentStreak: 14,
      longestStreak: 21,
    })

    // Seed 3 months of symptom history so Patrones tab shows real patterns
    const symptomStore = useSymptomStore.getState()
    if (symptomStore.logs.length === 0) {
      type SeedEntry = {
        daysAgo: number
        phase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal'
        mood: string
        energy: 'alta' | 'media' | 'baja'
        symptoms: string[]
        bbt?: number
        sleep?: { hours: number; quality: 'bueno' | 'regular' | 'malo' }
        water?: number
        weight?: number
        intimacy?: { hadSex: boolean; protected: boolean | null; orgasm: boolean | null; desireLevel: number | null }
        medications?: { pill: boolean; other: string }
      }
      const seed: SeedEntry[] = [
        // Cycle 1
        { daysAgo: 85, phase: 'menstrual', mood: 'tranquila', energy: 'baja', symptoms: ['colicos', 'dolor_espalda'], bbt: 36.3, sleep: { hours: 6, quality: 'malo' }, water: 4, weight: 58.2, intimacy: { hadSex: false, protected: null, orgasm: null, desireLevel: 1 } },
        { daysAgo: 84, phase: 'menstrual', mood: 'triste', energy: 'baja', symptoms: ['colicos', 'hinchazón'], bbt: 36.2, sleep: { hours: 5.5, quality: 'malo' }, water: 3, medications: { pill: true, other: '' } },
        { daysAgo: 80, phase: 'follicular', mood: 'feliz', energy: 'media', symptoms: [], bbt: 36.4, sleep: { hours: 7, quality: 'bueno' }, water: 6, weight: 58.0, intimacy: { hadSex: false, protected: null, orgasm: null, desireLevel: 2 } },
        { daysAgo: 75, phase: 'follicular', mood: 'feliz', energy: 'alta', symptoms: [], bbt: 36.5, sleep: { hours: 7.5, quality: 'bueno' }, water: 7, intimacy: { hadSex: true, protected: true, orgasm: true, desireLevel: 4 }, medications: { pill: true, other: '' } },
        { daysAgo: 70, phase: 'ovulatory', mood: 'feliz', energy: 'alta', symptoms: [], bbt: 37.0, sleep: { hours: 8, quality: 'bueno' }, water: 7, weight: 57.8, intimacy: { hadSex: true, protected: false, orgasm: true, desireLevel: 5 } },
        { daysAgo: 65, phase: 'luteal', mood: 'irritable', energy: 'media', symptoms: ['hinchazón', 'sensibilidad'], bbt: 37.1, sleep: { hours: 7, quality: 'regular' }, water: 5, intimacy: { hadSex: false, protected: null, orgasm: null, desireLevel: 2 } },
        { daysAgo: 60, phase: 'luteal', mood: 'ansiosa', energy: 'baja', symptoms: ['colicos', 'hinchazón', 'acne'], bbt: 37.2, sleep: { hours: 6, quality: 'regular' }, water: 4, weight: 58.5, medications: { pill: true, other: '' } },
        // Cycle 2
        { daysAgo: 56, phase: 'menstrual', mood: 'triste', energy: 'baja', symptoms: ['colicos', 'dolor_cabeza'], bbt: 36.2, sleep: { hours: 5.5, quality: 'malo' }, water: 3 },
        { daysAgo: 55, phase: 'menstrual', mood: 'tranquila', energy: 'baja', symptoms: ['dolor_espalda'], bbt: 36.3, sleep: { hours: 6, quality: 'regular' }, water: 5, intimacy: { hadSex: false, protected: null, orgasm: null, desireLevel: 1 } },
        { daysAgo: 50, phase: 'follicular', mood: 'feliz', energy: 'alta', symptoms: [], bbt: 36.5, sleep: { hours: 7.5, quality: 'bueno' }, water: 7, weight: 57.9, intimacy: { hadSex: true, protected: true, orgasm: false, desireLevel: 3 } },
        { daysAgo: 44, phase: 'ovulatory', mood: 'feliz', energy: 'alta', symptoms: [], bbt: 36.9, sleep: { hours: 8, quality: 'bueno' }, water: 8, intimacy: { hadSex: true, protected: false, orgasm: true, desireLevel: 5 } },
        { daysAgo: 40, phase: 'ovulatory', mood: 'feliz', energy: 'alta', symptoms: [], bbt: 37.1, sleep: { hours: 8, quality: 'bueno' }, water: 7, weight: 57.7, intimacy: { hadSex: true, protected: false, orgasm: true, desireLevel: 5 } },
        { daysAgo: 35, phase: 'luteal', mood: 'irritable', energy: 'media', symptoms: ['sensibilidad', 'acne'], bbt: 37.0, sleep: { hours: 7, quality: 'regular' }, water: 5, intimacy: { hadSex: false, protected: null, orgasm: null, desireLevel: 2 } },
        { daysAgo: 30, phase: 'luteal', mood: 'ansiosa', energy: 'baja', symptoms: ['colicos', 'insomnio', 'hinchazón'], bbt: 37.2, sleep: { hours: 5, quality: 'malo' }, water: 4, medications: { pill: true, other: '' } },
        // Cycle 3
        { daysAgo: 26, phase: 'menstrual', mood: 'tranquila', energy: 'baja', symptoms: ['colicos'], bbt: 36.2, sleep: { hours: 6, quality: 'regular' }, water: 4, weight: 58.1 },
        { daysAgo: 20, phase: 'follicular', mood: 'feliz', energy: 'alta', symptoms: [], bbt: 36.4, sleep: { hours: 7.5, quality: 'bueno' }, water: 7, intimacy: { hadSex: true, protected: true, orgasm: true, desireLevel: 4 }, medications: { pill: true, other: '' } },
        { daysAgo: 15, phase: 'follicular', mood: 'feliz', energy: 'alta', symptoms: [], bbt: 36.6, sleep: { hours: 7, quality: 'bueno' }, water: 6, weight: 57.8, intimacy: { hadSex: false, protected: null, orgasm: null, desireLevel: 3 } },
        { daysAgo: 10, phase: 'ovulatory', mood: 'feliz', energy: 'alta', symptoms: [], bbt: 37.0, sleep: { hours: 8, quality: 'bueno' }, water: 8, intimacy: { hadSex: true, protected: false, orgasm: true, desireLevel: 5 } },
        { daysAgo: 5, phase: 'luteal', mood: 'irritable', energy: 'media', symptoms: ['sensibilidad', 'hinchazón'], bbt: 37.1, sleep: { hours: 6.5, quality: 'regular' }, water: 5, weight: 58.3, intimacy: { hadSex: false, protected: null, orgasm: null, desireLevel: 2 } },
        { daysAgo: 2, phase: 'luteal', mood: 'ansiosa', energy: 'baja', symptoms: ['colicos', 'dolor_cabeza'], bbt: 37.3, sleep: { hours: 6, quality: 'regular' }, water: 4, medications: { pill: true, other: '' } },
      ]
      const now = Date.now()
      seed.forEach((s) => {
        const date = new Date(now - s.daysAgo * 86400000).toISOString().split('T')[0]
        symptomStore.addLog({
          date, phase: s.phase, mood: s.mood, energy: s.energy, symptoms: s.symptoms,
          bbt: s.bbt ?? null, mucus: null, notes: '',
          intimacy: s.intimacy ?? null,
          sleep: s.sleep ?? null,
          water: s.water ?? null,
          weight: s.weight ?? null,
          medications: s.medications ?? null,
        })
      })
    }
  }
}

if (!__DEV__) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enabled: true,
  })
}

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 2 * 60 * 1000,
    },
  },
})

function RootLayoutNav() {
  const { isAuthenticated } = useAuthStore()
  const { hasSeenOnboarding, notificationsEnabled, pinEnabled, hasSeenPrivacyConsent, pillReminderEnabled, waterReminderEnabled, logReminderHour, pillReminderHour } = useSettingsStore()
  const { nextPeriodDate, fertileWindowStart, nextOvulationDate, currentPhase, dayOfCycle } = useCycleStore()
  const [unlocked, setUnlocked] = React.useState(!pinEnabled)

  useEffect(() => {
    registerNotificationCategories()
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    updateHomeWidget({ phase: currentPhase, dayOfCycle, nextPeriodDate })
  }, [isAuthenticated, currentPhase, dayOfCycle, nextPeriodDate])

  useEffect(() => {
    if (!isAuthenticated) return
    requestNotificationPermissions().then(async (granted) => {
      if (!granted) return

      scheduleAllCycleNotifications({
        nextPeriodDate,
        fertileWindowStart,
        nextOvulationDate,
        logReminderEnabled: notificationsEnabled,
        pillReminderEnabled,
        waterReminderEnabled,
        logReminderHour,
        pillReminderHour,
      })

      // Register FCM token with backend
      try {
        const { data: tokenData } = await Notifications.getDevicePushTokenAsync()
        if (tokenData) {
          const { Platform } = await import('react-native')
          await import('@/api/client').then(({ default: api }) =>
            api.post('/notifications/register-device', {
              fcmToken: tokenData,
              platform: Platform.OS,
              appVersion: require('../../app.json').expo.version,
            }).catch(() => null)
          )
        }
      } catch {
        // Token registration is non-critical
      }
    })
  }, [isAuthenticated, nextPeriodDate])

  // Handle notification tap — route to correct screen
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const actionId = response.actionIdentifier
      const data = response.notification.request.content.data ?? {}
      const screen = data.screen as string | undefined
      const type = data.type as string | undefined

      if (actionId === 'OPEN_LOG' || actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        if (type === 'article' || screen === '/community') {
          router.push('/community' as any)
        } else if (screen) {
          router.push(screen as any)
        } else {
          router.push('/(tabs)/log')
        }
      }
    })
    return () => sub.remove()
  }, [])

  const { isDark } = useAppTheme()

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="premium" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="profile/edit" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile/notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ai-chat" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile/avatar" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="how-it-works" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="share-apk" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile/partner" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="security/pin-setup" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="security/disguise" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="insights/correlations" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="health/pregnancy" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="health/contraceptive" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="insights/bbt-chart" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="cycle/yearly-history" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile/medical" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile/language" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile/my-data" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="privacy-consent" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="privacy-policy" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="health/pcos" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="health/phase-tips" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="insights/cycle-comparison" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="first-period-info" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="community" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="insights/pdf-report" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="health/health-connect" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="learn" options={{ animation: 'slide_from_right' }} />
      </Stack>
      {!hasSeenPrivacyConsent && !__DEV__ && (
        <View style={StyleSheet.absoluteFill}>
          <PrivacyConsentScreen />
        </View>
      )}
      {pinEnabled && !unlocked && (
        <View style={StyleSheet.absoluteFill}>
          <PinLockScreen onUnlock={() => setUnlocked(true)} />
        </View>
      )}
    </>
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    PlayfairDisplay_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <RootLayoutNav />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
