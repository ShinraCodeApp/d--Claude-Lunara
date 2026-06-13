import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

import i18n, { useTranslation } from '@/i18n'
import { useSettingsStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

const LANGUAGES = [
  { code: 'es', flag: '🇪🇸', name: 'Español', native: 'Español' },
  { code: 'en', flag: '🇺🇸', name: 'English', native: 'English' },
  { code: 'pt', flag: '🇧🇷', name: 'Português', native: 'Português (Brasil)' },
]

export default function LanguageScreen() {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const { language, setLanguage } = useSettingsStore()
  const current = language ?? i18n.language ?? 'es'

  const handleSelect = (code: string) => {
    Haptics.selectionAsync()
    setLanguage(code)
    i18n.changeLanguage(code)
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.dark.surface, Colors.dark.bg]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.language')}</Text>
        <Text style={styles.subtitle}>{t('settings.selectLanguage')}</Text>
      </LinearGradient>

      <View style={{ padding: Spacing.md, gap: Spacing.md }}>
        {LANGUAGES.map((lang, i) => {
          const isSelected = current === lang.code
          return (
            <Animated.View key={lang.code} entering={FadeInDown.delay(i * 80)}>
              <TouchableOpacity
                style={[styles.langCard, isSelected && styles.langCardActive]}
                onPress={() => handleSelect(lang.code)}
                activeOpacity={0.8}
              >
                <Text style={styles.flag}>{lang.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.langName, isSelected && styles.langNameActive]}>{lang.name}</Text>
                  <Text style={styles.langNative}>{lang.native}</Text>
                </View>
                {isSelected && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            </Animated.View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  backBtn: { marginBottom: 6 },
  backText: { color: Colors.lavender[300], fontSize: Typography.fontSize.sm },
  title: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: Colors.dark.text, textAlign: 'center' },
  subtitle: { fontSize: Typography.fontSize.sm, color: Colors.dark.muted, textAlign: 'center', marginTop: 2 },
  langCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.dark.border,
  },
  langCardActive: { borderColor: Colors.lavender[400], backgroundColor: Colors.lavender[500] + '15' },
  flag: { fontSize: 32 },
  langName: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, color: Colors.dark.text },
  langNameActive: { color: Colors.lavender[300] },
  langNative: { fontSize: Typography.fontSize.sm, color: Colors.dark.muted, marginTop: 2 },
  check: { fontSize: Typography.fontSize.xl, color: Colors.lavender[400] },
})
