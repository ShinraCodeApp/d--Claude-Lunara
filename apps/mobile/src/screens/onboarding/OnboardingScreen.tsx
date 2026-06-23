import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, ScrollView, TextInput,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useAnimatedStyle, useSharedValue,
  withTiming, FadeInDown,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'

import apiClient from '@/api/client'
import { useSettingsStore, useAuthStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'


const { width, height } = Dimensions.get('window')

const CYCLE_LENGTHS = [21, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 40, 45]
const PERIOD_LENGTHS = [2, 3, 4, 5, 6, 7, 8, 9, 10]

const GOALS = [
  { key: 'track', emoji: '📅', label: 'Seguir mi ciclo' },
  { key: 'predict', emoji: '🔮', label: 'Predecir mi período' },
  { key: 'fertility', emoji: '🥚', label: 'Planificar fertilidad' },
  { key: 'pregnancy', emoji: '🤰', label: 'Seguir embarazo' },
  { key: 'wellness', emoji: '🌿', label: 'Mejorar mi bienestar' },
  { key: 'symptoms', emoji: '📝', label: 'Controlar síntomas' },
]

const CONTRACEPTIVES = [
  { key: 'NONE', emoji: '🚫', label: 'Ninguno' },
  { key: 'PILL', emoji: '💊', label: 'Píldora' },
  { key: 'IUD_COPPER', emoji: '🔶', label: 'DIU Cobre' },
  { key: 'IUD_HORMONAL', emoji: '🔷', label: 'DIU Hormonal' },
  { key: 'CONDOM', emoji: '🛡️', label: 'Preservativo' },
  { key: 'IMPLANT', emoji: '💉', label: 'Implante' },
  { key: 'NATURAL', emoji: '🌿', label: 'Método natural' },
]

interface OnboardingData {
  firstName: string
  isFirstPeriod: boolean | null
  goals: string[]
  lastPeriodDate: string
  averageCycleLength: number
  averagePeriodLength: number
  contraceptive: string
  useMascot: boolean
}

const STEPS = [
  { key: 'welcome',        title: '¡Bienvenida a Lunara!',    subtitle: 'Tu compañera de salud femenina' },
  { key: 'name',           title: '¿Cómo te llamamos?',        subtitle: 'Esto es completamente opcional' },
  { key: 'experience',     title: '¿Es tu primer período?',    subtitle: 'Así podemos guiarte mejor' },
  { key: 'goals',          title: '¿Cuál es tu objetivo?',     subtitle: 'Elige todos los que apliquen' },
  { key: 'contraceptive',  title: '¿Usas algún anticonceptivo?', subtitle: 'Para personalizar tus notificaciones' },
  { key: 'cycle',          title: 'Tu ciclo menstrual',        subtitle: 'Esto nos ayuda a calcular predicciones' },
  { key: 'mascot',         title: 'Conoce a Luna',             subtitle: 'Tu guía personal de salud' },
]

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets()
  const { setHasSeenOnboarding, setUseMascot, setIsFirstPeriod } = useSettingsStore()
  const { updateProfile } = useAuthStore()

  const [step, setStep] = useState(0)
  const [data, setData] = useState<OnboardingData>({
    firstName: '',
    isFirstPeriod: null,
    goals: [],
    lastPeriodDate: dayjs().subtract(14, 'day').format('YYYY-MM-DD'),
    averageCycleLength: 28,
    averagePeriodLength: 5,
    contraceptive: 'NONE',
    useMascot: true,
  })

  const progress = useSharedValue((1 / STEPS.length) * 100)
  useEffect(() => {
    progress.value = withTiming(((step + 1) / STEPS.length) * 100, { duration: 350 })
  }, [step])
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }))

  const finishOnboarding = () => {
    setHasSeenOnboarding(true)
    setUseMascot(data.useMascot)
    setIsFirstPeriod(data.isFirstPeriod)
    if (data.firstName) updateProfile({ firstName: data.firstName })
    if (data.isFirstPeriod === true) {
      router.replace('/first-period-info')
    } else {
      router.replace('/(tabs)')
    }
  }

  const completeMutation = useMutation({
    mutationFn: () => apiClient.post('/users/complete-onboarding', {
      lastPeriodDate: data.lastPeriodDate,
      averageCycleLength: data.averageCycleLength,
      averagePeriodLength: data.averagePeriodLength,
    }),
    onSuccess: () => {
      if (data.firstName) apiClient.put('/users/profile', { firstName: data.firstName }).catch(() => {})
      finishOnboarding()
    },
    onError: () => {
      // Backend unavailable — complete locally so the user isn't stuck
      finishOnboarding()
    },
  })

  const canAdvance = !(STEPS[step].key === 'experience' && data.isFirstPeriod === null)
                  && !(STEPS[step].key === 'contraceptive' && !data.contraceptive)

  const nextStep = () => {
    if (!canAdvance) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      completeMutation.mutate()
    }
  }

  const prevStep = () => {
    if (step > 0) setStep(step - 1)
  }

  const toggleGoal = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setData((d) => ({
      ...d,
      goals: d.goals.includes(key) ? d.goals.filter((g) => g !== key) : [...d.goals, key],
    }))
  }

  const currentStep = STEPS[step]

  return (
    <LinearGradient colors={['#0d0118', '#1a0533', '#2d0145']} style={styles.container}>
      {/* Progress bar */}
      <View style={[styles.progressContainer, { paddingTop: insets.top + 12 }]}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
        <Text style={styles.stepCounter}>{step + 1} / {STEPS.length}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Step: Welcome ──────────────────────────── */}
        {step === 0 && (
          <Animated.View entering={FadeInDown} style={styles.stepContent}>
            <Text style={styles.heroEmoji}>🌙</Text>
            <Text style={styles.heroTitle}>{currentStep.title}</Text>
            <Text style={styles.heroSubtitle}>{currentStep.subtitle}</Text>

            <View style={styles.featureList}>
              {[
                ['📅', 'Seguimiento inteligente del ciclo'],
                ['🔮', 'Predicciones con IA'],
                ['🌿', 'Consejos de bienestar'],
                ['🌕', 'Jardín Lunar y logros'],
                ['🔒', 'Tus datos, privados y seguros'],
              ].map(([emoji, text]) => (
                <View key={text} style={styles.featureRow}>
                  <Text style={styles.featureEmoji}>{emoji}</Text>
                  <Text style={styles.featureText}>{text}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ─── Step: Name ─────────────────────────────── */}
        {step === 1 && (
          <Animated.View entering={FadeInDown} style={styles.stepContent}>
            <Text style={styles.heroEmoji}>✨</Text>
            <Text style={styles.heroTitle}>{currentStep.title}</Text>
            <Text style={styles.heroSubtitle}>{currentStep.subtitle}</Text>

            <TextInput
              style={styles.nameInput}
              value={data.firstName}
              onChangeText={(v) => setData((d) => ({ ...d, firstName: v }))}
              placeholder="Tu nombre o apodo..."
              placeholderTextColor={Colors.dark.muted}
              autoFocus
              maxLength={30}
            />
            <Text style={styles.privacyNote}>
              🔒 Tu nombre solo se guarda en tu perfil y nunca se comparte
            </Text>
            <TouchableOpacity onPress={nextStep} style={{ marginTop: Spacing.md }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: Typography.fontSize.sm, textAlign: 'center' }}>
                Saltar este paso →
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ─── Step: Experience ───────────────────────── */}
        {step === 2 && (
          <Animated.View entering={FadeInDown} style={styles.stepContent}>
            <Text style={styles.heroEmoji}>🌸</Text>
            <Text style={styles.heroTitle}>{currentStep.title}</Text>
            <Text style={styles.heroSubtitle}>{currentStep.subtitle}</Text>

            <View style={styles.experienceOptions}>
              <TouchableOpacity
                style={[styles.experienceBtn, data.isFirstPeriod === true && styles.experienceBtnSelected]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  setData((d) => ({
                    ...d,
                    isFirstPeriod: true,
                    lastPeriodDate: dayjs().format('YYYY-MM-DD'),
                  }))
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.experienceBtnEmoji}>🌱</Text>
                <Text style={styles.experienceBtnTitle}>Mi 1° período</Text>
                <Text style={styles.experienceBtnDesc}>
                  Es mi primera vez y quiero entender qué me está pasando en mi cuerpo
                </Text>
                {data.isFirstPeriod === true && (
                  <View style={styles.experienceCheck}><Text style={styles.experienceCheckText}>✓</Text></View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.experienceBtn, data.isFirstPeriod === false && styles.experienceBtnSelected]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  setData((d) => ({ ...d, isFirstPeriod: false }))
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.experienceBtnEmoji}>💪</Text>
                <Text style={styles.experienceBtnTitle}>Tengo experiencia</Text>
                <Text style={styles.experienceBtnDesc}>
                  Ya conozco mi ciclo y quiero hacer un seguimiento más detallado
                </Text>
                {data.isFirstPeriod === false && (
                  <View style={styles.experienceCheck}><Text style={styles.experienceCheckText}>✓</Text></View>
                )}
              </TouchableOpacity>
            </View>

            {data.isFirstPeriod === true && (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.firstPeriodHint}>
                <Text style={styles.firstPeriodHintText}>
                  🌙 Al terminar la configuración te explicaremos todo sobre tu primer ciclo
                </Text>
              </Animated.View>
            )}
          </Animated.View>
        )}

        {/* ─── Step: Goals ─────────────────────────────── */}
        {step === 3 && (
          <Animated.View entering={FadeInDown} style={styles.stepContent}>
            <Text style={styles.heroEmoji}>🎯</Text>
            <Text style={styles.heroTitle}>{currentStep.title}</Text>
            <Text style={styles.heroSubtitle}>{currentStep.subtitle}</Text>

            <View style={styles.goalsGrid}>
              {GOALS.map((goal) => (
                <TouchableOpacity
                  key={goal.key}
                  style={[styles.goalBtn, data.goals.includes(goal.key) && styles.goalBtnSelected]}
                  onPress={() => toggleGoal(goal.key)}
                >
                  <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                  <Text style={[styles.goalLabel, data.goals.includes(goal.key) && styles.goalLabelSelected]}>
                    {goal.label}
                  </Text>
                  {data.goals.includes(goal.key) && (
                    <View style={styles.goalCheck}><Text style={styles.goalCheckText}>✓</Text></View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ─── Step: Contraceptive ───────────────────── */}
        {step === 4 && (
          <Animated.View entering={FadeInDown} style={styles.stepContent}>
            <Text style={styles.heroEmoji}>💊</Text>
            <Text style={styles.heroTitle}>{currentStep.title}</Text>
            <Text style={styles.heroSubtitle}>{currentStep.subtitle}</Text>

            <View style={styles.goalsGrid}>
              {CONTRACEPTIVES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.goalBtn, data.contraceptive === c.key && styles.goalBtnSelected]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setData((d) => ({ ...d, contraceptive: c.key }))
                  }}
                >
                  <Text style={styles.goalEmoji}>{c.emoji}</Text>
                  <Text style={[styles.goalLabel, data.contraceptive === c.key && styles.goalLabelSelected]}>
                    {c.label}
                  </Text>
                  {data.contraceptive === c.key && (
                    <View style={styles.goalCheck}><Text style={styles.goalCheckText}>✓</Text></View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.tipText}>💡 Podés cambiarlo después en Configuración</Text>
          </Animated.View>
        )}

        {/* ─── Step: Cycle ─────────────────────────────── */}
        {step === 5 && (
          <Animated.View entering={FadeInDown} style={styles.stepContent}>
            <Text style={styles.heroEmoji}>🌑</Text>
            <Text style={styles.heroTitle}>{currentStep.title}</Text>
            <Text style={styles.heroSubtitle}>{currentStep.subtitle}</Text>

            {/* Last period date */}
            <View style={styles.cycleSection}>
              <Text style={styles.cycleSectionTitle}>¿Cuándo fue tu último período?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.dateOptions}>
                  {[0, 7, 14, 21, 28].map((days) => {
                    const date = dayjs().subtract(days, 'day').format('YYYY-MM-DD')
                    const label = days === 0 ? 'Hoy' : `Hace ${days} días`
                    return (
                      <TouchableOpacity
                        key={days}
                        style={[styles.dateOption, data.lastPeriodDate === date && styles.dateOptionSelected]}
                        onPress={() => setData((d) => ({ ...d, lastPeriodDate: date }))}
                      >
                        <Text style={styles.dateOptionLabel}>{label}</Text>
                        <Text style={styles.dateOptionDate}>{dayjs(date).format('D MMM')}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Cycle length */}
            <View style={styles.cycleSection}>
              <Text style={styles.cycleSectionTitle}>
                Duración de tu ciclo: <Text style={styles.cycleSectionValue}>{data.averageCycleLength} días</Text>
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.lengthOptions}>
                  {CYCLE_LENGTHS.map((len) => (
                    <TouchableOpacity
                      key={len}
                      style={[styles.lengthBtn, data.averageCycleLength === len && styles.lengthBtnSelected]}
                      onPress={() => setData((d) => ({ ...d, averageCycleLength: len }))}
                    >
                      <Text style={[styles.lengthBtnText, data.averageCycleLength === len && styles.lengthBtnTextSelected]}>
                        {len}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={styles.tipText}>💡 El promedio es 28 días (rango normal: 21-45 días)</Text>
            </View>

            {/* Period length */}
            <View style={styles.cycleSection}>
              <Text style={styles.cycleSectionTitle}>
                Duración de tu período: <Text style={styles.cycleSectionValue}>{data.averagePeriodLength} días</Text>
              </Text>
              <View style={styles.periodLengthRow}>
                {PERIOD_LENGTHS.map((len) => (
                  <TouchableOpacity
                    key={len}
                    style={[styles.lengthBtn, data.averagePeriodLength === len && styles.lengthBtnSelected]}
                    onPress={() => setData((d) => ({ ...d, averagePeriodLength: len }))}
                  >
                    <Text style={[styles.lengthBtnText, data.averagePeriodLength === len && styles.lengthBtnTextSelected]}>
                      {len}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* ─── Step: Mascot ─────────────────────────────── */}
        {step === 6 && (
          <Animated.View entering={FadeInDown} style={styles.stepContent}>
            <Text style={[styles.heroEmoji, { fontSize: 80 }]}>🌙</Text>
            <Text style={styles.heroTitle}>¡Hola! Soy Luna</Text>
            <Text style={styles.heroSubtitle}>Tu guía personal de salud femenina</Text>

            <View style={styles.mascotDescription}>
              {[
                ['💬', 'Te daré consejos personalizados'],
                ['🎉', 'Celebraré tus logros contigo'],
                ['📚', 'Te explicaré cómo funciona tu cuerpo'],
                ['🌱', 'Evolucionaré junto contigo'],
              ].map(([emoji, text]) => (
                <View key={text} style={styles.mascotRow}>
                  <Text style={styles.mascotEmoji}>{emoji}</Text>
                  <Text style={styles.mascotText}>{text}</Text>
                </View>
              ))}
            </View>

            <View style={styles.mascotToggle}>
              <Text style={styles.mascotToggleLabel}>¿Quieres que Luna te acompañe?</Text>
              <View style={styles.mascotToggleBtns}>
                <TouchableOpacity
                  style={[styles.mascotBtn, data.useMascot && styles.mascotBtnSelected]}
                  onPress={() => setData((d) => ({ ...d, useMascot: true }))}
                >
                  <Text style={styles.mascotBtnText}>¡Sí, quiero! 🌙</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mascotBtn, !data.useMascot && styles.mascotBtnSelected]}
                  onPress={() => setData((d) => ({ ...d, useMascot: false }))}
                >
                  <Text style={styles.mascotBtnText}>No por ahora</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* ─── Navigation buttons ─────────────────────── */}
      <View style={[styles.navContainer, { paddingBottom: insets.bottom + Spacing.sm }]}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
            <Text style={styles.backBtnText}>← Atrás</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextBtn, (step === 0) && { flex: 1 }, (!canAdvance) && { opacity: 0.4 }]}
          onPress={nextStep}
          disabled={completeMutation.isPending || !canAdvance}
        >
          <LinearGradient
            colors={[Colors.primary[600], Colors.lavender[500]]}
            style={styles.nextBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextBtnText}>
              {step === STEPS.length - 1
                ? completeMutation.isPending ? 'Configurando...' : '¡Comenzar mi viaje! 🌙'
                : !canAdvance ? 'Elige una opción'
                : 'Siguiente →'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressContainer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, gap: Spacing.sm,
  },
  progressTrack: {
    flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.full, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.lavender[400], borderRadius: BorderRadius.full },
  stepCounter: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.5)' },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xl },
  stepContent: { alignItems: 'center' },
  heroEmoji: { fontSize: 64, marginBottom: Spacing.lg },
  heroTitle: {
    fontSize: Typography.fontSize['3xl'], fontFamily: Typography.fontFamily.bold,
    color: '#fff', textAlign: 'center', marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.6)',
    textAlign: 'center', marginBottom: Spacing.xl,
  },
  featureList: { width: '100%', gap: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featureEmoji: { fontSize: 24, width: 32 },
  featureText: { fontSize: Typography.fontSize.base, color: '#e9d5ff' },
  nameInput: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    color: '#fff', fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.medium, textAlign: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: Spacing.md,
  },
  privacyNote: {
    fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.5)', textAlign: 'center',
  },
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, width: '100%' },
  goalBtn: {
    width: (width - Spacing.md * 2 - Spacing.sm) / 2,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', position: 'relative',
  },
  goalBtnSelected: {
    borderColor: Colors.lavender[400], backgroundColor: Colors.lavender[500] + '30',
  },
  goalEmoji: { fontSize: 28, marginBottom: 6 },
  goalLabel: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  goalLabelSelected: { color: Colors.lavender[300] },
  goalCheck: {
    position: 'absolute', top: 8, right: 8, width: 20, height: 20,
    borderRadius: 10, backgroundColor: Colors.lavender[500],
    alignItems: 'center', justifyContent: 'center',
  },
  goalCheckText: { color: '#fff', fontSize: 10, fontFamily: Typography.fontFamily.bold },
  cycleSection: { width: '100%', marginBottom: Spacing.xl },
  cycleSectionTitle: {
    fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.md, fontFamily: Typography.fontFamily.medium,
  },
  cycleSectionValue: { color: Colors.lavender[300], fontFamily: Typography.fontFamily.bold },
  dateOptions: { flexDirection: 'row', gap: Spacing.sm },
  dateOption: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BorderRadius.lg,
    padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    minWidth: 90,
  },
  dateOptionSelected: { borderColor: Colors.lavender[400], backgroundColor: Colors.lavender[500] + '30' },
  dateOptionLabel: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)' },
  dateOptionDate: {
    fontSize: Typography.fontSize.xs, color: Colors.lavender[300],
    fontFamily: Typography.fontFamily.medium, marginTop: 4,
  },
  lengthOptions: { flexDirection: 'row', gap: 6 },
  periodLengthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  lengthBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  lengthBtnSelected: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[400] },
  lengthBtnText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)' },
  lengthBtnTextSelected: { color: '#fff', fontFamily: Typography.fontFamily.bold },
  tipText: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.4)', marginTop: 8 },
  mascotDescription: { width: '100%', gap: Spacing.md, marginBottom: Spacing.xl },
  mascotRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  mascotEmoji: { fontSize: 24, width: 32 },
  mascotText: { fontSize: Typography.fontSize.base, color: '#e9d5ff' },
  mascotToggle: { width: '100%' },
  mascotToggleLabel: {
    fontSize: Typography.fontSize.md, color: '#fff',
    fontFamily: Typography.fontFamily.medium, textAlign: 'center', marginBottom: Spacing.md,
  },
  mascotToggleBtns: { flexDirection: 'row', gap: Spacing.sm },
  mascotBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  mascotBtnSelected: { borderColor: Colors.lavender[400], backgroundColor: Colors.lavender[500] + '30' },
  mascotBtnText: { color: '#fff', fontSize: Typography.fontSize.base },
  navContainer: {
    flexDirection: 'row', paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md, gap: Spacing.sm,
  },
  backBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center',
  },
  backBtnText: { color: 'rgba(255,255,255,0.6)', fontFamily: Typography.fontFamily.medium },
  nextBtn: { flex: 2, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  nextBtnGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold },
  // Experience step
  experienceOptions: { width: '100%', gap: Spacing.md },
  experienceBtn: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    position: 'relative',
  },
  experienceBtnSelected: {
    borderColor: Colors.lavender[400],
    backgroundColor: Colors.lavender[500] + '25',
  },
  experienceBtnEmoji: { fontSize: 36, marginBottom: Spacing.sm },
  experienceBtnTitle: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.bold,
    color: '#fff',
    marginBottom: 4,
  },
  experienceBtnDesc: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
  },
  experienceCheck: {
    position: 'absolute', top: 12, right: 12,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.lavender[500],
    alignItems: 'center', justifyContent: 'center',
  },
  experienceCheckText: { color: '#fff', fontSize: 13, fontFamily: Typography.fontFamily.bold },
  firstPeriodHint: {
    marginTop: Spacing.md,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    width: '100%',
  },
  firstPeriodHintText: {
    fontSize: Typography.fontSize.sm,
    color: '#c4b5fd',
    textAlign: 'center',
    lineHeight: 20,
  },
})
