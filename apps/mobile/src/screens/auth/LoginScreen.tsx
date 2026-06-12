import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useMutation } from '@tanstack/react-query'
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'

import apiClient from '@/api/client'
import { useAuthStore, useSettingsStore } from '@/store'
import { registerLocalAccount, loginLocalAccount } from '@/utils/localAuth'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { setUser, setToken } = useAuthStore()
  const { hasSeenOnboarding } = useSettingsStore()

  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const applyLocalAccount = (account: ReturnType<typeof loginLocalAccount> extends { account: infer A } ? A : never, isNew: boolean) => {
    setToken(`local-token-${account.id}`)
    setUser({
      id: account.id,
      email: account.email,
      role: 'user',
      profile: {
        firstName: account.firstName,
        lastName: '',
        avatarUrl: undefined,
        onboardingCompleted: !isNew && hasSeenOnboarding,
      },
      subscription: {
        tier: account.isPremium ? 'PREMIUM' : 'FREE',
        status: 'active',
        isPremium: account.isPremium,
        currentPeriodEnd: account.isPremium ? '2099-01-01T00:00:00.000Z' : undefined,
      },
    })
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    router.replace(isNew ? '/onboarding' : hasSeenOnboarding ? '/(tabs)' : '/onboarding')
  }

  const handleLocalAuth = () => {
    setError('')
    if (isLogin) {
      const result = loginLocalAccount(email, password)
      if (!result.success) {
        setError(result.error)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        return
      }
      applyLocalAccount(result.account, false)
    } else {
      const result = registerLocalAccount(email, password, firstName)
      if (!result.success) {
        setError(result.error)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        return
      }
      applyLocalAccount(result.account, true)
    }
  }

  const authMutation = useMutation({
    mutationFn: async () => {
      // Try backend first; fall back to local auth if unreachable
      if (isLogin) {
        const { data } = await apiClient.post('/auth/login', { email, password })
        return { ...data, fromBackend: true }
      } else {
        const { data } = await apiClient.post('/auth/register', {
          email, password, firstName, acceptTerms: true,
        })
        return { ...data, fromBackend: true }
      }
    },
    onSuccess: (data) => {
      if (data.fromBackend) {
        setToken(data.accessToken)
        if (data.refreshToken) useAuthStore.getState().setRefreshToken(data.refreshToken)
        setUser(data.user)
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      if (data.isNewUser) router.replace('/onboarding')
      else router.replace('/(tabs)')
    },
    onError: () => {
      // Backend unreachable — use local auth
      handleLocalAuth()
    },
  })

  const googleMutation = useMutation({
    mutationFn: async () => {
      GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID })
      await GoogleSignin.hasPlayServices()
      const { idToken } = await GoogleSignin.signIn()
      const { data } = await apiClient.post('/auth/google', { idToken })
      return data
    },
    onSuccess: (data) => {
      setToken(data.accessToken)
      setUser(data.user)
      if (data.isNewUser) router.replace('/onboarding')
      else router.replace('/(tabs)')
    },
    onError: () => setError('Error con Google Sign-In'),
  })

  const isLoading = authMutation.isPending || googleMutation.isPending

  return (
    <LinearGradient colors={['#0d0118', '#1a0533', '#2d0145']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}>
          {/* Logo */}
          <Animated.View entering={FadeInDown.delay(0)} style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🌙</Text>
            <Text style={styles.logoTitle}>Lunara</Text>
            <Text style={styles.logoSubtitle}>by ShinraCode</Text>
            <Text style={styles.logoTagline}>Conecta con tu ciclo. Comprende tu bienestar.</Text>
          </Animated.View>

          {/* Toggle Login / Register */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, isLogin && styles.toggleBtnActive]}
              onPress={() => { setIsLogin(true); setError('') }}
            >
              <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>Iniciar sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !isLogin && styles.toggleBtnActive]}
              onPress={() => { setIsLogin(false); setError('') }}
            >
              <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>Crear cuenta</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.form}>
            {!isLogin && (
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Nombre (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="¿Cómo te llamamos?"
                  placeholderTextColor={Colors.dark.muted}
                  autoComplete="given-name"
                />
              </View>
            )}

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
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError('') }}
                  placeholder={isLogin ? 'Tu contraseña' : 'Mínimo 8 caracteres'}
                  placeholderTextColor={Colors.dark.muted}
                  secureTextEntry={!showPass}
                  autoComplete={isLogin ? 'password' : 'new-password'}
                />
                <TouchableOpacity
                  style={styles.showPassBtn}
                  onPress={() => setShowPass(!showPass)}
                >
                  <Text style={styles.showPassText}>{showPass ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {isLogin && (
              <TouchableOpacity
                style={styles.forgotPass}
                onPress={() => router.push('/auth/forgot-password')}
              >
                <Text style={styles.forgotPassText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            )}

            {!isLogin && (
              <Text style={styles.termsText}>
                Al crear una cuenta aceptas nuestros{' '}
                <Text style={styles.termsLink}>Términos de Servicio</Text> y{' '}
                <Text style={styles.termsLink}>Política de Privacidad</Text>.
                Tus datos de salud son privados y seguros.
              </Text>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            {/* Main CTA */}
            <TouchableOpacity
              style={styles.mainBtn}
              onPress={() => authMutation.mutate()}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[Colors.primary[600], Colors.lavender[500]]}
                style={styles.mainBtnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {authMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.mainBtnText}>
                      {isLogin ? 'Entrar a Lunara 🌙' : 'Crear mi cuenta ✨'}
                    </Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o continúa con</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In */}
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => googleMutation.mutate()}
              disabled={isLoading}
            >
              {googleMutation.isPending
                ? <ActivityIndicator color={Colors.dark.text} />
                : <>
                    <Text style={styles.socialBtnEmoji}>🔵</Text>
                    <Text style={styles.socialBtnText}>Continuar con Google</Text>
                  </>
              }
            </TouchableOpacity>

            {/* Apple Sign-In (iOS only) */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={[styles.socialBtn, styles.appleBtn]}>
                <Text style={styles.socialBtnEmoji}>🍎</Text>
                <Text style={[styles.socialBtnText, { color: '#fff' }]}>Continuar con Apple</Text>
              </TouchableOpacity>
            )}

          </Animated.View>

          {/* Footer */}
          <Text style={styles.footerText}>
            🔒 Tus datos de salud están encriptados y son 100% privados
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  content: { paddingHorizontal: Spacing.md },
  logoContainer: { alignItems: 'center', marginBottom: Spacing.xl },
  logoEmoji: { fontSize: 56, marginBottom: 8 },
  logoTitle: {
    fontSize: Typography.fontSize['4xl'], fontFamily: Typography.fontFamily.heading,
    color: '#fff', letterSpacing: 2,
  },
  logoSubtitle: {
    fontSize: Typography.fontSize.sm, color: Colors.lavender[300],
    fontFamily: Typography.fontFamily.medium, letterSpacing: 3, marginTop: -4,
  },
  logoTagline: {
    fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', marginTop: Spacing.sm, fontStyle: 'italic',
  },
  toggleContainer: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.xl, padding: 4, marginBottom: Spacing.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  toggleBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: Colors.primary[600] },
  toggleText: { fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.5)' },
  toggleTextActive: { color: '#fff', fontFamily: Typography.fontFamily.bold },
  form: { gap: Spacing.md },
  inputWrapper: { gap: 6 },
  inputLabel: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.6)' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    color: '#fff', fontSize: Typography.fontSize.base,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    fontFamily: Typography.fontFamily.regular,
  },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  showPassBtn: { padding: 8 },
  showPassText: { fontSize: 18 },
  forgotPass: { alignSelf: 'flex-end' },
  forgotPassText: { color: Colors.lavender[300], fontSize: Typography.fontSize.sm },
  termsText: {
    fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.4)',
    textAlign: 'center', lineHeight: 18,
  },
  termsLink: { color: Colors.lavender[300], textDecorationLine: 'underline' },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: { color: '#fca5a5', fontSize: Typography.fontSize.sm, textAlign: 'center' },
  mainBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  mainBtnGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  mainBtnText: { color: '#fff', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  dividerText: { color: 'rgba(255,255,255,0.3)', fontSize: Typography.fontSize.xs },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md, gap: Spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  appleBtn: { backgroundColor: '#000', borderColor: '#333' },
  socialBtnEmoji: { fontSize: 18 },
  socialBtnText: { fontSize: Typography.fontSize.base, color: Colors.dark.text, fontFamily: Typography.fontFamily.medium },
  footerText: {
    textAlign: 'center', fontSize: Typography.fontSize.xs,
    color: 'rgba(255,255,255,0.3)', marginTop: Spacing.xl,
  },
})
