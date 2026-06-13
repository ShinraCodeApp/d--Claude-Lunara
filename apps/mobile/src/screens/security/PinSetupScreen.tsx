import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, Vibration } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated'
import { router } from 'expo-router'

import { useSettingsStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

export default function PinSetupScreen() {
  const insets = useSafeAreaInsets()
  const { setPinEnabled, setPinCode, pinEnabled, pinCode } = useSettingsStore()
  const [step, setStep] = useState<'create' | 'confirm' | 'disable'>('create')
  const [firstPin, setFirstPin] = useState('')
  const [dots, setDots] = useState<string>('')

  const handleKey = (key: string) => {
    if (key === '') return
    if (key === '⌫') { setDots((d) => d.slice(0, -1)); return }
    const next = dots + key
    setDots(next)
    if (next.length === 4) {
      setTimeout(() => {
        if (step === 'disable') {
          if (next === pinCode) {
            setPinEnabled(false)
            setPinCode(null)
            Alert.alert('PIN desactivado', 'Tu app ya no requiere PIN.', [
              { text: 'OK', onPress: () => router.back() },
            ])
          } else {
            Vibration.vibrate(300)
            Alert.alert('PIN incorrecto', '', [{ text: 'OK', onPress: () => setDots('') }])
          }
        } else if (step === 'create') {
          setFirstPin(next)
          setDots('')
          setStep('confirm')
        } else {
          if (next === firstPin) {
            setPinCode(next)
            setPinEnabled(true)
            Alert.alert('🔒 PIN activado', 'Tu app está protegida.', [
              { text: 'OK', onPress: () => router.back() },
            ])
          } else {
            Vibration.vibrate(300)
            Alert.alert('PINs no coinciden', 'Inténtalo de nuevo.', [
              { text: 'OK', onPress: () => { setDots(''); setStep('create'); setFirstPin('') } },
            ])
          }
        }
      }, 150)
    }
  }

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Atrás</Text>
      </TouchableOpacity>

      <Animated.View entering={FadeIn} style={styles.center}>
        <Text style={styles.lockEmoji}>{step === 'disable' ? '🔓' : '🔒'}</Text>
        <Text style={styles.title}>
          {step === 'create' ? 'Crea tu PIN' : step === 'confirm' ? 'Confirma tu PIN' : 'Desactivar PIN'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'create' ? '4 dígitos para proteger tu privacidad'
            : step === 'confirm' ? 'Ingresa el mismo PIN de nuevo'
            : 'Ingresa tu PIN actual para desactivarlo'}
        </Text>

        {/* Current status */}
        {pinEnabled && step === 'create' && (
          <TouchableOpacity onPress={() => { setDots(''); setStep('disable') }} style={styles.disableBtn}>
            <Text style={styles.disableBtnText}>Desactivar PIN actual</Text>
          </TouchableOpacity>
        )}

        {/* Dots */}
        <View style={styles.dotsRow}>
          {[0,1,2,3].map((i) => (
            <Animated.View
              key={i}
              entering={dots.length > i ? ZoomIn : undefined}
              style={[styles.dot, dots.length > i && styles.dotFilled]}
            />
          ))}
        </View>

        {/* Keypad */}
        <View style={styles.keypad}>
          {KEYS.map((key, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.key, key === '' && styles.keyEmpty]}
              onPress={() => handleKey(key)}
              disabled={key === ''}
              activeOpacity={0.7}
            >
              <Text style={styles.keyText}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {pinEnabled && (
          <View style={styles.statusChip}>
            <Text style={styles.statusText}>🔒 PIN activo</Text>
          </View>
        )}
      </Animated.View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  backText: { color: Colors.lavender[300], fontSize: Typography.fontSize.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, paddingBottom: 60 },
  lockEmoji: { fontSize: 52 },
  title: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: '#fff' },
  subtitle: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  dotsRow: { flexDirection: 'row', gap: Spacing.xl, marginVertical: Spacing.md },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  dotFilled: { backgroundColor: Colors.lavender[400], borderColor: Colors.lavender[400] },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 260, gap: Spacing.md, justifyContent: 'center' },
  key: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
  },
  keyEmpty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyText: { fontSize: Typography.fontSize.xl, color: '#fff', fontFamily: Typography.fontFamily.bold },
  disableBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  disableBtnText: { color: Colors.rose[400], fontSize: Typography.fontSize.sm, textDecorationLine: 'underline' },
  statusChip: {
    paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: 'rgba(139,92,246,0.2)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)',
  },
  statusText: { color: Colors.lavender[300], fontSize: Typography.fontSize.sm },
})
