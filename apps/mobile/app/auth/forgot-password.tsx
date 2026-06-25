import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'

import apiClient from '@/api/client'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!email.trim()) {
      setError('Ingresá tu correo electrónico')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError('El correo no es válido')
      return
    }
    setError('')
    setLoading(true)
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim().toLowerCase() })
    } catch {
      // Always show success to avoid email enumeration
    } finally {
      setLoading(false)
      setSent(true)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }

  return (
    <LinearGradient colors={['#0d0118', '#1a0533', '#2d0145']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>

          <Animated.View entering={FadeInDown} style={styles.card}>
            <Text style={styles.emoji}>{sent ? '📬' : '🔑'}</Text>
            <Text style={styles.title}>{sent ? '¡Correo enviado!' : 'Recuperar contraseña'}</Text>

            {sent ? (
              <>
                <Text style={styles.subtitle}>
                  Si <Text style={styles.highlight}>{email}</Text> tiene una cuenta en Lunara, recibirás un correo con instrucciones para restablecer tu contraseña.
                </Text>
                <Text style={styles.tip}>
                  Revisá tu carpeta de spam si no aparece en unos minutos.
                </Text>
                <TouchableOpacity style={styles.mainBtn} onPress={() => router.back()}>
                  <LinearGradient
                    colors={[Colors.primary[600], Colors.lavender[500]]}
                    style={styles.mainBtnGradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.mainBtnText}>Volver al inicio de sesión</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  Ingresá tu correo y te enviaremos instrucciones para crear una nueva contraseña.
                </Text>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Correo electrónico</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError('') }}
                    placeholder="tu@correo.com"
                    placeholderTextColor={Colors.dark.muted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoFocus
                  />
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>⚠️ {error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.mainBtn}
                  onPress={handleSend}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={[Colors.primary[600], Colors.lavender[500]]}
                    style={styles.mainBtnGradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.mainBtnText}>Enviar instrucciones 📨</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.md },
  backBtn: { marginBottom: Spacing.xl },
  backText: { color: Colors.lavender[300], fontSize: Typography.fontSize.base },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    gap: Spacing.md,
  },
  emoji: { fontSize: 48 },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontFamily: Typography.fontFamily.bold,
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  highlight: { color: Colors.lavender[300], fontFamily: Typography.fontFamily.medium },
  tip: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  inputWrapper: { gap: 6, width: '100%' },
  inputLabel: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.6)' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: '#fff',
    fontSize: Typography.fontSize.base,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    fontFamily: Typography.fontFamily.regular,
    width: '100%',
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    width: '100%',
  },
  errorText: { color: '#fca5a5', fontSize: Typography.fontSize.sm, textAlign: 'center' },
  mainBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden', width: '100%' },
  mainBtnGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  mainBtnText: { color: '#fff', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold },
})
