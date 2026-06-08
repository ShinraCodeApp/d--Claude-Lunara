import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuthStore } from '@/store'
import { Colors } from '@/theme'

export default function Index() {
  const { isAuthenticated, hasSeenOnboarding } = useAuthStore()

  if (!isAuthenticated) return <Redirect href="/auth" />
  if (!hasSeenOnboarding) return <Redirect href="/onboarding" />
  return <Redirect href="/(tabs)" />
}
