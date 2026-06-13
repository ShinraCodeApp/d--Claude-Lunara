import React, { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'

import { DISGUISE_OPTIONS, setDisguise, getActiveAlias } from '@/utils/disguise'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

export default function DisguiseModeScreen() {
  const insets = useSafeAreaInsets()
  const [activeAlias, setActiveAlias] = useState('MainActivityLunara')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    getActiveAlias().then((alias) => {
      setActiveAlias(alias)
      setInitializing(false)
    })
  }, [])

  const handleSelect = (alias: string) => {
    if (alias === activeAlias) return

    const option = DISGUISE_OPTIONS.find((o) => o.alias === alias)
    const isReturningToLunara = alias === 'MainActivityLunara'

    Alert.alert(
      isReturningToLunara ? 'Restaurar ícono original' : `Disfrazarse como "${option?.label}"`,
      isReturningToLunara
        ? 'El ícono de Lunara volverá a aparecer en tu pantalla de inicio.'
        : `El ícono de la app cambiará a "${option?.label}". Nadie sabrá que es Lunara.\n\nNota: Android cerrará la app brevemente para aplicar el cambio.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar', style: 'default',
          onPress: () => applyDisguise(alias),
        },
      ]
    )
  }

  const applyDisguise = async (alias: string) => {
    setLoading(true)
    const success = await setDisguise(alias)
    setLoading(false)

    if (success) {
      setActiveAlias(alias)
      const option = DISGUISE_OPTIONS.find((o) => o.alias === alias)
      Alert.alert(
        '✅ Cambio aplicado',
        alias === 'MainActivityLunara'
          ? 'El ícono original de Lunara fue restaurado.'
          : `La app ahora aparece como "${option?.label}" en tu pantalla de inicio.`,
      )
    } else {
      Alert.alert('Error', 'No se pudo cambiar el ícono. Inténtalo de nuevo.')
    }
  }

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      >
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🎭 Modo Incógnito</Text>
          <Text style={styles.subtitle}>Cambia el ícono de la app para mayor privacidad</Text>
        </Animated.View>

        {/* Info card */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <LinearGradient
            colors={['rgba(139,92,246,0.15)', 'rgba(168,85,247,0.08)']}
            style={styles.infoCard}
          >
            <Text style={styles.infoEmoji}>🔒</Text>
            <Text style={styles.infoText}>
              Con el modo incógnito, la app aparece con otro nombre e ícono en tu
              pantalla de inicio. Solo tú sabes que es Lunara.
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Options */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.sectionLabel}>ELIGE UN DISFRAZ</Text>
          {initializing ? (
            <ActivityIndicator color={Colors.lavender[400]} style={{ marginTop: 20 }} />
          ) : (
            DISGUISE_OPTIONS.map((option, i) => {
              const isActive = option.alias === activeAlias
              return (
                <TouchableOpacity
                  key={option.alias}
                  onPress={() => handleSelect(option.alias)}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Animated.View entering={FadeInDown.delay(200 + i * 60)}>
                    <LinearGradient
                      colors={isActive
                        ? [Colors.primary[700], Colors.primary[600]]
                        : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)']}
                      style={[styles.optionCard, isActive && styles.optionCardActive]}
                    >
                      <Text style={styles.optionEmoji}>{option.emoji}</Text>
                      <View style={styles.optionInfo}>
                        <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                          {option.label}
                        </Text>
                        <Text style={styles.optionDesc}>{option.description}</Text>
                      </View>
                      {isActive && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>Activo</Text>
                        </View>
                      )}
                      {loading && isActive && (
                        <ActivityIndicator size="small" color="#fff" />
                      )}
                    </LinearGradient>
                  </Animated.View>
                </TouchableOpacity>
              )
            })
          )}
        </Animated.View>

        {/* Warning */}
        <Animated.View entering={FadeInDown.delay(500)}>
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚠️ Al cambiar el ícono, Android cerrará la app momentáneamente. Esto es normal.
              Búscala por el nuevo nombre en tu pantalla de inicio.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  header: { gap: 4 },
  backBtn: { marginBottom: Spacing.sm },
  backText: { color: Colors.lavender[300], fontSize: Typography.fontSize.base },
  title: { fontSize: Typography.fontSize['3xl'], fontFamily: Typography.fontFamily.bold, color: '#fff' },
  subtitle: { fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.5)' },
  infoCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },
  infoEmoji: { fontSize: 28 },
  infoText: { flex: 1, fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)', lineHeight: 20 },
  sectionLabel: {
    fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.3)',
    fontFamily: Typography.fontFamily.medium, letterSpacing: 1,
  },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginTop: 8,
  },
  optionCardActive: { borderColor: Colors.primary[500] },
  optionEmoji: { fontSize: 32, width: 44, textAlign: 'center' },
  optionInfo: { flex: 1 },
  optionLabel: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold, color: 'rgba(255,255,255,0.8)' },
  optionLabelActive: { color: '#fff' },
  optionDesc: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  activeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  activeBadgeText: { fontSize: Typography.fontSize.xs, color: '#fff', fontFamily: Typography.fontFamily.medium },
  warningCard: {
    backgroundColor: 'rgba(234,179,8,0.08)', borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(234,179,8,0.2)',
  },
  warningText: { fontSize: Typography.fontSize.xs, color: 'rgba(234,179,8,0.8)', lineHeight: 18 },
})
