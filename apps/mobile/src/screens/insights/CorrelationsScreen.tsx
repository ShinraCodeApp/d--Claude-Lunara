import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import { TouchableOpacity } from 'react-native'

import { useSymptomStore } from '@/store'
import { analyzePatterns, computeWellnessSummary } from '@/utils/patternAnalysis'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

const { width } = Dimensions.get('window')
const BAR_MAX_W = width - Spacing.md * 4 - 80

const MOOD_EMOJIS: Record<string, string> = {
  feliz: '😊', tranquila: '😌', ansiosa: '😰',
  irritable: '😠', triste: '😢', energetica: '⚡',
  motivada: '💪', cansada: '😴', neutral: '😐',
  HAPPY: '😊', RELAXED: '😌', ANXIOUS: '😰',
  IRRITABLE: '😠', SAD: '😢', ENERGETIC: '⚡',
  MOTIVATED: '💪', TIRED: '😴', NEUTRAL: '😐',
}

const PHASE_COLORS: Record<string, string> = {
  menstrual: Colors.rose[500],
  follicular: Colors.lavender[400],
  ovulatory: Colors.gold.main,
  luteal: '#a78bfa',
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const w = max > 0 ? (value / max) * BAR_MAX_W : 0
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label}>{label}</Text>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: w, backgroundColor: color }]} />
      </View>
      <Text style={barStyles.val}>{value.toFixed(1)}</Text>
    </View>
  )
}

const barStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 6 },
  label: { width: 70, fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  track: { flex: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  val: { width: 32, fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'right' },
})

export default function CorrelationsScreen() {
  const insets = useSafeAreaInsets()
  const { logs } = useSymptomStore()

  const patterns = useMemo(() => analyzePatterns(logs), [logs])
  const wellness = useMemo(() => computeWellnessSummary(logs), [logs])

  // Cross-metric correlations
  const correlations = useMemo(() => {
    const results: Array<{ emoji: string; title: string; insight: string; strength: 'alta' | 'media' | 'baja' }> = []

    // Sleep vs symptoms
    const highSleepLogs = logs.filter((l) => (l.sleep?.hours ?? 0) >= 7)
    const lowSleepLogs = logs.filter((l) => (l.sleep?.hours ?? 0) > 0 && (l.sleep?.hours ?? 0) < 6.5)
    if (highSleepLogs.length >= 3 && lowSleepLogs.length >= 3) {
      const symptomsOnGoodSleep = highSleepLogs.map((l) => l.symptoms.length)
      const symptomsOnBadSleep = lowSleepLogs.map((l) => l.symptoms.length)
      const avgGood = symptomsOnGoodSleep.reduce((a,b) => a+b, 0) / symptomsOnGoodSleep.length
      const avgBad = symptomsOnBadSleep.reduce((a,b) => a+b, 0) / symptomsOnBadSleep.length
      if (avgBad > avgGood + 0.5) {
        results.push({
          emoji: '😴',
          title: 'Sueño → Síntomas',
          insight: `Cuando duermes menos de 6.5h, tienes ${(avgBad - avgGood).toFixed(1)} síntomas más en promedio. El sueño protege tu bienestar.`,
          strength: avgBad - avgGood > 1.5 ? 'alta' : 'media',
        })
      }
    }

    // Phase vs energy
    patterns.forEach((p) => {
      if (p.topEnergy === 'alta' && p.totalLogs >= 3) {
        results.push({
          emoji: p.emoji,
          title: `Fase ${p.label} → Energía alta`,
          insight: `Tu energía es consistentemente alta en la fase ${p.label.toLowerCase()}. Ideal para compromisos importantes.`,
          strength: 'alta',
        })
      } else if (p.topEnergy === 'baja' && p.totalLogs >= 3) {
        results.push({
          emoji: p.emoji,
          title: `Fase ${p.label} → Baja energía`,
          insight: `En la fase ${p.label.toLowerCase()} tiendes a la fatiga. Planea actividades más relajadas.`,
          strength: 'media',
        })
      }
    })

    // Mood vs phase
    const menstrual = patterns.find((p) => p.phase === 'menstrual')
    const follicular = patterns.find((p) => p.phase === 'follicular')
    if (menstrual?.topMood && follicular?.topMood && menstrual.topMood !== follicular.topMood) {
      results.push({
        emoji: '🎭',
        title: 'Cambio de humor por fase',
        insight: `Tu ánimo pasa de ${MOOD_EMOJIS[menstrual.topMood] ?? ''} en menstruación a ${MOOD_EMOJIS[follicular.topMood] ?? ''} en fase folicular — un patrón hormonal claro.`,
        strength: 'alta',
      })
    }

    // Water vs mood
    const highWaterGoodMood = logs.filter((l) => (l.water ?? 0) >= 6 && ['feliz','tranquila','HAPPY','RELAXED'].includes(l.mood ?? '')).length
    const lowWaterBadMood = logs.filter((l) => (l.water ?? 0) <= 3 && l.water !== null && ['ansiosa','irritable','ANXIOUS','IRRITABLE'].includes(l.mood ?? '')).length
    if (highWaterGoodMood >= 3 || lowWaterBadMood >= 2) {
      results.push({
        emoji: '💧',
        title: 'Hidratación → Humor',
        insight: 'Tus días con mejor humor coinciden con mayor hidratación. Beber 6+ vasos de agua se relaciona con mejor bienestar.',
        strength: 'media',
      })
    }

    return results.slice(0, 6)
  }, [logs, patterns])

  const sleepByPhase = patterns.map((p) => ({ phase: p.phase, label: p.label, val: p.avgSleepHours ?? 0 }))
  const maxSleep = Math.max(...sleepByPhase.map((p) => p.val), 1)

  const hasEnoughData = logs.length >= 5

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🔬 Tus Correlaciones</Text>
          <Text style={styles.subtitle}>Cómo se relacionan tus métricas</Text>
        </Animated.View>

        {!hasEnoughData ? (
          <Animated.View entering={FadeInDown.delay(60)} style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>Pocos datos aún</Text>
            <Text style={styles.emptyText}>
              Registra al menos 5 días para ver las correlaciones de tus patrones. Tienes {logs.length} registro{logs.length !== 1 ? 's' : ''}.
            </Text>
          </Animated.View>
        ) : (
          <>
            {/* Correlations found */}
            {correlations.length > 0 && (
              <Animated.View entering={FadeInDown.delay(60)}>
                <Text style={styles.sectionLabel}>PATRONES DETECTADOS</Text>
                {correlations.map((c, i) => (
                  <LinearGradient
                    key={i}
                    colors={['rgba(139,92,246,0.18)', 'rgba(88,28,135,0.1)']}
                    style={styles.correlCard}
                  >
                    <View style={styles.correlHeader}>
                      <Text style={styles.correlEmoji}>{c.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.correlTitle}>{c.title}</Text>
                        <View style={[styles.strengthChip, {
                          backgroundColor: c.strength === 'alta' ? '#065f46' : c.strength === 'media' ? '#78350f' : '#1e1b4b'
                        }]}>
                          <Text style={styles.strengthText}>Correlación {c.strength}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.correlInsight}>{c.insight}</Text>
                  </LinearGradient>
                ))}
              </Animated.View>
            )}

            {/* Sleep by phase */}
            <Animated.View entering={FadeInDown.delay(120)}>
              <Text style={styles.sectionLabel}>SUEÑO PROMEDIO POR FASE</Text>
              <LinearGradient colors={['rgba(139,92,246,0.12)', 'rgba(88,28,135,0.08)']} style={styles.chartCard}>
                {sleepByPhase.filter((p) => p.val > 0).map((p) => (
                  <BarRow
                    key={p.phase}
                    label={p.label}
                    value={p.val}
                    max={maxSleep}
                    color={PHASE_COLORS[p.phase] ?? Colors.lavender[400]}
                  />
                ))}
                {sleepByPhase.every((p) => p.val === 0) && (
                  <Text style={styles.noData}>Sin datos de sueño aún</Text>
                )}
              </LinearGradient>
            </Animated.View>

            {/* Phase-by-phase cards */}
            <Animated.View entering={FadeInDown.delay(180)}>
              <Text style={styles.sectionLabel}>RESUMEN POR FASE</Text>
              {patterns.map((p) => (
                <LinearGradient
                  key={p.phase}
                  colors={[PHASE_COLORS[p.phase] + '20', PHASE_COLORS[p.phase] + '08']}
                  style={[styles.phaseCard, { borderColor: PHASE_COLORS[p.phase] + '40' }]}
                >
                  <View style={styles.phaseHeader}>
                    <Text style={styles.phaseEmoji}>{p.emoji}</Text>
                    <View>
                      <Text style={[styles.phaseLabel, { color: PHASE_COLORS[p.phase] }]}>{p.label}</Text>
                      <Text style={styles.phaseLogs}>{p.totalLogs} registros</Text>
                    </View>
                  </View>
                  {p.totalLogs > 0 ? (
                    <View style={styles.phaseStats}>
                      {p.topMood && <Text style={styles.phaseStat}>{MOOD_EMOJIS[p.topMood] ?? '😊'} Humor: {p.topMood}</Text>}
                      {p.topEnergy && <Text style={styles.phaseStat}>⚡ Energía: {p.topEnergy}</Text>}
                      {p.avgSleepHours && <Text style={styles.phaseStat}>😴 Sueño: {p.avgSleepHours}h</Text>}
                      {p.topSymptoms.length > 0 && <Text style={styles.phaseStat}>🔴 Síntomas frecuentes: {p.topSymptoms.slice(0,2).join(', ')}</Text>}
                    </View>
                  ) : (
                    <Text style={styles.noData}>Sin registros en esta fase</Text>
                  )}
                  {p.insights.slice(0,1).map((ins, j) => (
                    <Text key={j} style={styles.phaseInsight}>💡 {ins}</Text>
                  ))}
                </LinearGradient>
              ))}
            </Animated.View>

            {/* Wellness summary */}
            <Animated.View entering={FadeInDown.delay(240)}>
              <Text style={styles.sectionLabel}>RESUMEN GENERAL</Text>
              <View style={styles.wellnessGrid}>
                {[
                  { emoji: '😴', label: 'Sueño prom.', val: wellness.avgSleepOverall ? `${wellness.avgSleepOverall}h` : '—' },
                  { emoji: '💧', label: 'Agua prom.', val: wellness.avgWater ? `${wellness.avgWater} vasos` : '—' },
                  { emoji: '❤️', label: 'Días íntimos', val: String(wellness.totalIntimacyDays) },
                  { emoji: '🌡️', label: 'Registros BBT', val: String(wellness.bbtLogs.length) },
                ].map((item) => (
                  <View key={item.label} style={styles.wellnessItem}>
                    <Text style={styles.wellnessEmoji}>{item.emoji}</Text>
                    <Text style={styles.wellnessVal}>{item.val}</Text>
                    <Text style={styles.wellnessLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
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
  sectionLabel: {
    fontSize: 11, fontFamily: Typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.35)', letterSpacing: 1.2, textTransform: 'uppercase',
  },
  emptyCard: {
    backgroundColor: 'rgba(139,92,246,0.12)', borderRadius: BorderRadius.xl,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  emptyText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20 },
  correlCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.md, gap: Spacing.sm,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', marginBottom: Spacing.sm,
  },
  correlHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  correlEmoji: { fontSize: 28 },
  correlTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  strengthChip: {
    borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 2,
    alignSelf: 'flex-start', marginTop: 2,
  },
  strengthText: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  correlInsight: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  chartCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },
  phaseCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.md, gap: Spacing.sm,
    borderWidth: 1, marginBottom: Spacing.sm,
  },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  phaseEmoji: { fontSize: 28 },
  phaseLabel: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold },
  phaseLogs: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  phaseStats: { gap: 4 },
  phaseStat: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.65)' },
  phaseInsight: { fontSize: Typography.fontSize.sm, color: '#c4b5fd', lineHeight: 18, fontStyle: 'italic' },
  noData: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: Spacing.sm },
  wellnessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  wellnessItem: {
    flex: 1, minWidth: '45%', backgroundColor: 'rgba(139,92,246,0.12)',
    borderRadius: BorderRadius.xl, padding: Spacing.md, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },
  wellnessEmoji: { fontSize: 24 },
  wellnessVal: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  wellnessLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
})
