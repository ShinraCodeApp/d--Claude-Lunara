import React, { useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import dayjs from 'dayjs'

import { useSettingsStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

const TRIMESTERS = [
  { n: 1, label: 'Primer Trimestre', weeks: '1–12', emoji: '🌱', color: '#34d399' },
  { n: 2, label: 'Segundo Trimestre', weeks: '13–26', emoji: '🌸', color: Colors.lavender[400] },
  { n: 3, label: 'Tercer Trimestre', weeks: '27–40', emoji: '🌺', color: Colors.gold.main },
]

const WEEKLY_HIGHLIGHTS: Record<number, { size: string; milestone: string }> = {
  4: { size: 'semilla de amapola', milestone: 'El embrión se implanta' },
  6: { size: 'lenteja', milestone: 'Latido del corazón inicia' },
  8: { size: 'frambuesa', milestone: 'Todos los órganos en formación' },
  10: { size: 'fresa', milestone: 'Ya es un feto' },
  12: { size: 'lima', milestone: 'Fin del primer trimestre' },
  16: { size: 'aguacate', milestone: 'Puede mover los dedos' },
  20: { size: 'mango', milestone: 'Mitad del embarazo 🎉' },
  24: { size: 'mazorca', milestone: 'Puede sobrevivir prematuramente' },
  28: { size: 'berenjena', milestone: 'Puede abrir los ojos' },
  32: { size: 'coco', milestone: 'Posición final (cabeza abajo)' },
  36: { size: 'lechuga', milestone: 'Considerado a término temprano' },
  40: { size: 'sandía pequeña', milestone: '¡Listo para nacer! 🎊' },
}

const COMMON_SYMPTOMS_BY_TRIMESTER: Record<number, string[]> = {
  1: ['Náuseas / vómitos', 'Fatiga extrema', 'Sensibilidad en senos', 'Antojos', 'Cambios de humor', 'Aumento de micción'],
  2: ['Más energía', 'Movimientos del bebé', 'Dolor de espalda', 'Reflujo', 'Cambios en la piel'],
  3: ['Dificultad para dormir', 'Contracciones de Braxton Hicks', 'Hinchazón de pies', 'Frecuencia urinaria', 'Ansiedad preparto'],
}

export default function PregnancyModeScreen() {
  const insets = useSafeAreaInsets()
  const { pregnancyMode, pregnancyStartDate, setPregnancyMode, setPregnancyStartDate } = useSettingsStore()
  const [dateInput, setDateInput] = useState(pregnancyStartDate ?? '')
  const [loggedSymptoms, setLoggedSymptoms] = useState<string[]>([])

  const pregnancy = useMemo(() => {
    if (!pregnancyStartDate) return null
    const start = dayjs(pregnancyStartDate)
    if (!start.isValid()) return null
    const weeks = dayjs().diff(start, 'week')
    const days = dayjs().diff(start, 'day') % 7
    const dueDate = start.add(280, 'day')
    const daysLeft = dueDate.diff(dayjs(), 'day')
    const trimester = weeks <= 12 ? 1 : weeks <= 26 ? 2 : 3
    const closestWeek = Object.keys(WEEKLY_HIGHLIGHTS)
      .map(Number)
      .sort((a, b) => Math.abs(a - weeks) - Math.abs(b - weeks))[0]
    return { weeks, days, dueDate, daysLeft, trimester, highlight: WEEKLY_HIGHLIGHTS[closestWeek] }
  }, [pregnancyStartDate])

  const handleSave = () => {
    const d = dayjs(dateInput)
    if (!d.isValid()) {
      Alert.alert('Fecha inválida', 'Usa el formato YYYY-MM-DD')
      return
    }
    setPregnancyStartDate(dateInput)
    setPregnancyMode(true)
    Alert.alert('¡Modo embarazo activado!', `Fecha de inicio: ${d.format('D [de] MMMM YYYY')}`)
  }

  const trimesterInfo = pregnancy ? TRIMESTERS[pregnancy.trimester - 1] : null

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🤰 Modo Embarazo</Text>
          <Text style={styles.subtitle}>Seguimiento semana a semana</Text>
        </Animated.View>

        {/* Setup */}
        {!pregnancyMode && (
          <Animated.View entering={FadeInDown.delay(60)} style={styles.setupCard}>
            <Text style={styles.setupTitle}>¿Cuándo fue el primer día de tu última regla?</Text>
            <Text style={styles.setupSub}>Usamos esta fecha para calcular las semanas de embarazo</Text>
            <TextInput
              style={styles.dateInput}
              value={dateInput}
              onChangeText={setDateInput}
              placeholder="YYYY-MM-DD  ej: 2026-04-01"
              placeholderTextColor="rgba(255,255,255,0.25)"
              keyboardType="numbers-and-punctuation"
            />
            <TouchableOpacity style={styles.activateBtn} onPress={handleSave}>
              <Text style={styles.activateBtnText}>Activar modo embarazo</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Current status */}
        {pregnancy && trimesterInfo && (
          <>
            <Animated.View entering={FadeInDown.delay(60)}>
              <LinearGradient
                colors={[trimesterInfo.color + '25', trimesterInfo.color + '08']}
                style={[styles.weekCard, { borderColor: trimesterInfo.color + '50' }]}
              >
                <Text style={styles.weekEmoji}>{trimesterInfo.emoji}</Text>
                <Text style={[styles.weekNumber, { color: trimesterInfo.color }]}>
                  Semana {pregnancy.weeks} + {pregnancy.days} días
                </Text>
                <Text style={styles.trimesterLabel}>{trimesterInfo.label}</Text>
                {pregnancy.highlight && (
                  <View style={styles.highlightBox}>
                    <Text style={styles.highlightSize}>Tamaño: {pregnancy.highlight.size}</Text>
                    <Text style={styles.highlightMilestone}>✨ {pregnancy.highlight.milestone}</Text>
                  </View>
                )}
                <View style={styles.dueDateRow}>
                  <View style={styles.dueItem}>
                    <Text style={styles.dueLabel}>Fecha probable de parto</Text>
                    <Text style={styles.dueDate}>{pregnancy.dueDate.format('D MMM YYYY')}</Text>
                  </View>
                  <View style={styles.dueItem}>
                    <Text style={styles.dueLabel}>Días restantes</Text>
                    <Text style={[styles.dueDate, { color: trimesterInfo.color }]}>
                      {Math.max(0, pregnancy.daysLeft)}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Progress bar through all 40 weeks */}
            <Animated.View entering={FadeInDown.delay(120)} style={styles.progressCard}>
              <View style={styles.progressHeader}>
                {TRIMESTERS.map((t) => (
                  <Text key={t.n} style={[styles.progressLabel, pregnancy.trimester === t.n && { color: t.color }]}>
                    {t.emoji} T{t.n}
                  </Text>
                ))}
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, {
                  width: `${Math.min(100, (pregnancy.weeks / 40) * 100)}%`,
                  backgroundColor: trimesterInfo.color,
                }]} />
              </View>
              <Text style={styles.progressPct}>{Math.round((pregnancy.weeks / 40) * 100)}% completado</Text>
            </Animated.View>

            {/* Today's symptoms */}
            <Animated.View entering={FadeInDown.delay(180)}>
              <Text style={styles.sectionLabel}>SÍNTOMAS DE HOY</Text>
              <View style={styles.symptomsGrid}>
                {(COMMON_SYMPTOMS_BY_TRIMESTER[pregnancy.trimester] ?? []).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.symptomBtn, loggedSymptoms.includes(s) && styles.symptomBtnActive]}
                    onPress={() => setLoggedSymptoms((prev) =>
                      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                    )}
                  >
                    <Text style={[styles.symptomText, loggedSymptoms.includes(s) && styles.symptomTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>

            {/* Trimester guide */}
            <Animated.View entering={FadeInDown.delay(240)}>
              <Text style={styles.sectionLabel}>GUÍA DE TRIMESTRES</Text>
              {TRIMESTERS.map((t) => (
                <LinearGradient
                  key={t.n}
                  colors={[t.color + '15', t.color + '05']}
                  style={[styles.trimCard, { borderColor: t.color + '30' }, pregnancy.trimester === t.n && { borderColor: t.color + '80', borderWidth: 2 }]}
                >
                  <Text style={styles.trimEmoji}>{t.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.trimLabel, { color: t.color }]}>{t.label}</Text>
                    <Text style={styles.trimWeeks}>Semanas {t.weeks}</Text>
                  </View>
                  {pregnancy.trimester === t.n && (
                    <View style={[styles.currentChip, { backgroundColor: t.color }]}>
                      <Text style={styles.currentChipText}>Actual</Text>
                    </View>
                  )}
                </LinearGradient>
              ))}
            </Animated.View>

            {/* Deactivate */}
            <TouchableOpacity
              style={styles.deactivateBtn}
              onPress={() => Alert.alert('Desactivar', '¿Salir del modo embarazo?', [
                { text: 'Cancelar' },
                { text: 'Sí', style: 'destructive', onPress: () => { setPregnancyMode(false); setPregnancyStartDate(null) } },
              ])}
            >
              <Text style={styles.deactivateText}>Desactivar modo embarazo</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingBottom: 40, gap: Spacing.md },
  header: { gap: 4, paddingTop: Spacing.sm },
  backBtn: { marginBottom: 4 },
  backText: { color: Colors.lavender[300], fontSize: Typography.fontSize.sm },
  title: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: '#fff' },
  subtitle: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  setupCard: {
    backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
  },
  setupTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  setupSub: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  dateInput: {
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: BorderRadius.lg,
    padding: Spacing.sm, color: '#fff', fontSize: Typography.fontSize.base,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  activateBtn: {
    backgroundColor: '#ec4899', borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm, alignItems: 'center',
  },
  activateBtnText: { color: '#fff', fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.base },
  weekCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm, borderWidth: 1,
  },
  weekEmoji: { fontSize: 52 },
  weekNumber: { fontSize: Typography.fontSize['3xl'], fontFamily: Typography.fontFamily.bold },
  trimesterLabel: { fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.6)' },
  highlightBox: {
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: BorderRadius.lg,
    padding: Spacing.sm, alignItems: 'center', width: '100%', gap: 4,
  },
  highlightSize: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)' },
  highlightMilestone: { fontSize: Typography.fontSize.base, color: '#fff', fontFamily: Typography.fontFamily.medium },
  dueDateRow: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.sm },
  dueItem: { alignItems: 'center', gap: 2 },
  dueLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  dueDate: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  progressCard: {
    backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.4)' },
  progressTrack: { height: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },
  progressPct: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  sectionLabel: {
    fontSize: 11, fontFamily: Typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.35)', letterSpacing: 1.2, textTransform: 'uppercase',
  },
  symptomsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  symptomBtn: {
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    backgroundColor: 'rgba(139,92,246,0.12)', borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
  },
  symptomBtnActive: { backgroundColor: 'rgba(236,72,153,0.25)', borderColor: '#ec4899' },
  symptomText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.6)' },
  symptomTextActive: { color: '#f9a8d4' },
  trimCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, marginBottom: Spacing.xs,
  },
  trimEmoji: { fontSize: 24 },
  trimLabel: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold },
  trimWeeks: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.4)' },
  currentChip: {
    borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3,
  },
  currentChipText: { fontSize: 11, color: '#fff', fontFamily: Typography.fontFamily.bold },
  deactivateBtn: { padding: Spacing.md, alignItems: 'center' },
  deactivateText: { color: 'rgba(255,255,255,0.3)', fontSize: Typography.fontSize.sm, textDecorationLine: 'underline' },
})
