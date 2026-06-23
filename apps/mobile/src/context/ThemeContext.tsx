import React, { createContext, useContext } from 'react'
import { useColorScheme } from 'react-native'
import { useSettingsStore } from '@/store'
import { Colors, createTheme } from '@/theme'

type ThemeContextValue = {
  isDark: boolean
  theme: ReturnType<typeof createTheme>
  bgGradient: readonly [string, string]
  cardBg: string
  textPrimary: string
  textMuted: string
  borderColor: string
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  theme: createTheme('dark'),
  bgGradient: ['#0d0118', '#1a0533'],
  cardBg: 'rgba(255,255,255,0.05)',
  textPrimary: '#fff',
  textMuted: 'rgba(255,255,255,0.5)',
  borderColor: 'rgba(255,255,255,0.08)',
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme: storedTheme } = useSettingsStore()
  const systemScheme = useColorScheme()

  const isDark =
    storedTheme === 'dark' ||
    (storedTheme === 'auto' && systemScheme === 'dark') ||
    (storedTheme === 'auto' && systemScheme !== 'light')

  const theme = createTheme(isDark ? 'dark' : 'light')

  const value: ThemeContextValue = isDark
    ? {
        isDark: true,
        theme,
        bgGradient: ['#0d0118', '#1a0533'],
        cardBg: 'rgba(255,255,255,0.05)',
        textPrimary: '#fff',
        textMuted: 'rgba(255,255,255,0.5)',
        borderColor: 'rgba(255,255,255,0.08)',
      }
    : {
        isDark: false,
        theme,
        bgGradient: [Colors.primary[50], Colors.lavender[100]],
        cardBg: 'rgba(124,58,237,0.06)',
        textPrimary: Colors.dark.surface,
        textMuted: Colors.light.muted,
        borderColor: Colors.light.border,
      }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useAppTheme() {
  return useContext(ThemeContext)
}
