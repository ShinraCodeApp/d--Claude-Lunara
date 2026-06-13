import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeIn, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated'

import { useSettingsStore } from '@/store'
import { Colors, Typography, Spacing } from '@/theme'

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

interface Props {
  onUnlock: () => void
}

export default function PinLockScreen({ onUnlock }: Props) {
  const { pinCode } = useSettingsStore()
  const [dots, setDots] = useState('')
  const [error, setError] = useState(false)
  const shakeX = useSharedValue(0)

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }))

  const handleKey = (key: string) => {
    if (key === '') return
    if (key === '⌫') { setDots((d) => d.slice(0, -1)); return }
    const next = dots + key
    setDots(next)
    if (next.length === 4) {
      setTimeout(() => {
        if (next === pinCode) {
          onUnlock()
        } else {
          Vibration.vibrate([0, 80, 80, 80])
          shakeX.value = withSequence(
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(-8, { duration: 50 }),
            withTiming(8, { duration: 50 }),
            withTiming(0, { duration: 50 })
          )
          setError(true)
          setDots('')
          setTimeout(() => setError(false), 1500)
        }
      }, 150)
    }
  }

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.logo}>🌙</Text>
        <Text style={styles.title}>Lunara</Text>
        <Text style={styles.subtitle}>{error ? '❌ PIN incorrecto' : 'Ingresa tu PIN'}</Text>

        <Animated.View style={[styles.dotsRow, shakeStyle]}>
          {[0,1,2,3].map((i) => (
            <View key={i} style={[
              styles.dot,
              dots.length > i && styles.dotFilled,
              error && styles.dotError,
            ]} />
          ))}
        </Animated.View>

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
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  logo: { fontSize: 56 },
  title: { fontSize: Typography.fontSize['3xl'], fontFamily: Typography.fontFamily.bold, color: '#fff' },
  subtitle: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)', height: 20 },
  dotsRow: { flexDirection: 'row', gap: Spacing.xl, marginVertical: Spacing.md },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  dotFilled: { backgroundColor: Colors.lavender[400], borderColor: Colors.lavender[400] },
  dotError: { backgroundColor: Colors.rose[500], borderColor: Colors.rose[500] },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 260, gap: Spacing.md, justifyContent: 'center' },
  key: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
  },
  keyEmpty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyText: { fontSize: Typography.fontSize.xl, color: '#fff', fontFamily: Typography.fontFamily.bold },
})
