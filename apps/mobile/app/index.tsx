import { Redirect } from 'expo-router'
import { useAuthStore, useSettingsStore } from '@/store'

export default function Index() {
  const { isAuthenticated } = useAuthStore()
  const { hasSeenOnboarding } = useSettingsStore()

  if (!isAuthenticated) return <Redirect href="/auth" />
  if (!hasSeenOnboarding) return <Redirect href="/onboarding" />
  return <Redirect href="/(tabs)" />
}
