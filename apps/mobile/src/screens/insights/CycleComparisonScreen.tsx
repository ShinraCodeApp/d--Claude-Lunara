import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import dayjs from 'dayjs'

import { useSymptomStore, useCycleStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

interface CycleSlice {
  label: string
  start: string
  end: string
  logs: ReturnType<typeof useSymptomStore.getState>['logs']
  periodDays: number
  totalDays: number
}

function buildCycles(logs: ReturnType<typeof useSymptomStore.getState>['logs']): CycleSlice[] {
  if (logs.length === 0) return []
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  const periodStarts: string[] = []

  for (let i = 0; i < sorted.length; i++) {
    const l = sorted[i]
    if (l.phase !== 'menstrual') continue
    const prev = i > 0 ? sorted[i - 1] : null
    const prevDay = prev ? dayjs(l.date).diff(dayjs(prev.date), 'day') : 99
    if (prevDay > 5) periodStarts.push(l.date)
  }

  const cycles: CycleSlice[] = []
  for (let i = 0; i < Math.min(periodStarts.length, 4); i++) {
    const start = periodStarts[i]
    const end = periodStarts[i + 1]
      ? dayjs(periodStarts[i + 1]).subtract(1, 'day').format('YYYY-MM-DD')
      : sorted[sorted.length - 1].date
    const cycleLogs = sorted.filter((l) => l.date >= start && l.date <= end)
    const periodDays = cycleLogs.filter((l) => l.phase === 'menstrual').length
    const totalDays = dayjs(end).diff(dayjs(start), 'day') + 1
    cycles.push({
      label: `Ciclo ${i + 1}`,
      start,
      end,
      logs: cycleLogs,
      periodDays,
      totalDays: Math.min(totalDays, 45),
    })
  }
  return cycles.reverse()
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 10) / 10
}

function topItem(items: string[]): string {
  if (items.length === 0) return '—'
  const freq: Record<string, number> = {}
  items.forEach((s) => { freq[s] = (freq[s] || 0) + 1 })
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
}

const MOOD_LABELS: Record<string, string> = {
  HAPPY: 'Feliz', SAD: 'Triste', ANXIOUS: 'Ansiosa', STRESSED: 'Estresada',
  MOTIVATED: 'Motivada', RELAXED: 'Relajada', IRRITABLE: 'Irritable',
  ENERGETIC: 'Energética', TIRED: 'Cansada', EMOTIONAL: 'Emocional', NEUTRAL: 'Neutral',
}

export default function CycleComparisonScreen() {
  const insets = useSafeAreaInsets()
  const { logs } = useSymptomStore()
  const { nextPeriodDate } = useCycleStore()

  const cycles = useMemo(() => buildCycles(logs), [logs])

  const current = cycles[0]
  const previous = cycles[1]

  const getCycleSummary = (cycle: CycleSlice) => ({
    length: cycle.totalDays,
    periodDays: cycle.periodDays,
    avgSleep: avg(cycle.logs.filter((l) => l.sleep).map((l) => l.sleep!.hours)),
    avgWater: avg(cycle.logs.filter((l) => l.water).map((l) => l.water!)),
    topMood: topItem(cycle.logs.filter((l) => l.mood).map((l) => MOOD_LABELS[l.mood!] ?? l.mood!)),
    topSymptom: topItem(cycle.logs.flatMap((l) => l.symptoms)),
    migraineCount: cycle.logs.filter((l) => l.migraine).length,
    logsTotal: cycle.logs.length,
    avgBbt: avg(cycle.logs.filter((l) => l.bbt).map((l) => l.bbt!)),
  })

  const renderBar = (value: number, max: number, color: string) => {
    const pct = Math.min(100, Math.round((value / max) * 100))
    return (
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    )
  }

  if (cycles.length < 2) {
    return (
      <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
        <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comparación de ciclos</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>Necesitas al menos 2 ciclos</Text>
          <Text style={styles.emptyDesc}>
            Continúa registrando tus días para comparar ciclos.{'\n'}
            Tienes {cycles.length} ciclo{cycles.length !== 1 ? 's' : ''} registrado{cycles.length !== 1 ? 's' : ''}.
          </Text>
        </View>
      </LinearGradient>
    )
  }

  const curr = getCycleSummary(current)
  const prev = getCycleSummary(previous)

  const compareRows: { label: string; currVal: string; prevVal: string; curr: number; prev: number; max: number; color: string }[] = [
    { label: 'Duración del ciclo', currVal: `${curr.length}d`, prevVal: `${prev.length}d`, curr: curr.length, prev: prev.length, max: 45, color: '#a855f7' },
    { label: 'Días de período', currVal: `${curr.periodDays}d`, prevVal: `${prev.periodDays}d`, curr: curr.periodDays, prev: prev.periodDays, max: 10, color: '#db2777' },
    { label: 'Sueño promedio', currVal: `${curr.avgSleep}h`, prevVal: `${prev.avgSleep}h`, curr: curr.avgSleep, prev: prev.avgSleep, max: 10, color: '#6366f1' },
    { label: 'Agua diaria', currVal: `${curr.avgWater} vasos`, prevVal: `${prev.avgWater} vasos`, curr: curr.avgWater, prev: prev.avgWater, max: 8, color: '#0ea5e9' },
    { label: 'Temp. basal (prom.)', currVal: curr.avgBbt > 0 ? `${curr.avgBbt}°C` : '—', prevVal: prev.avgBbt > 0 ? `${prev.avgBbt}°C` : '—', curr: curr.avgBbt, prev: prev.avgBbt, max: 38, color: '#f59e0b' },
    { label: 'Registros guardados', currVal: `${curr.logsTotal}`, prevVal: `${prev.logsTotal}`, curr: curr.logsTotal, prev: prev.logsTotal, max: 31, color: '#10b981' },
  ]

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comparación de ciclos</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Cycle headers */}
        <Animated.View entering={FadeInDown.delay(0)} style={styles.cycleHeaders}>
          <View style={styles.cycleHeaderLeft}>
            <Text style={styles.cycleHeaderLabel}>📍 Ciclo actual</Text>
            <Text style={styles.cycleHeaderDate}>
              {dayjs(current.start).format('D MMM')} – {dayjs(current.end).format('D MMM YYYY')}
            </Text>
          </View>
          <View style={styles.vs}><Text style={styles.vsText}>VS</Text></View>
          <View style={styles.cycleHeaderRight}>
            <Text style={styles.cycleHeaderLabel}>⏮ Ciclo anterior</Text>
            <Text style={styles.cycleHeaderDate}>
              {dayjs(previous.start).format('D MMM')} – {dayjs(previous.end).format('D MMM YYYY')}
            </Text>
          </View>
        </Animated.View>

        {/* Bar comparison */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <Text style={styles.sectionTitle}>Métricas comparadas</Text>
          {compareRows.map((row, i) => (
            <View key={i} style={styles.compareRow}>
              <Text style={styles.compareLabel}>{row.label}</Text>
              <View style={styles.barsContainer}>
                <View style={styles.barGroup}>
                  <Text style={styles.barValue}>{row.currVal}</Text>
                  {renderBar(row.curr, row.max, row.color)}
                </View>
                <View style={styles.barGroup}>
                  <Text style={styles.barValue}>{row.prevVal}</Text>
                  {renderBar(row.prev, row.max, 'rgba(255,255,255,0.2)')}
                </View>
              </View>
            </View>
          ))}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#a855f7' }]} />
              <Text style={styles.legendText}>Ciclo actual</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
              <Text style={styles.legendText}>Ciclo anterior</Text>
            </View>
          </View>
        </Animated.View>

        {/* Qualitative comparison */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Patrones</Text>
          <View style={styles.patternsCard}>
            {[
              { label: 'Estado de ánimo dominante', curr: curr.topMood, prev: prev.topMood, icon: '😊' },
              { label: 'Síntoma más frecuente', curr: curr.topSymptom || '—', prev: prev.topSymptom || '—', icon: '💊' },
              { label: 'Días con migraña', curr: `${curr.migraineCount}`, prev: `${prev.migraineCount}`, icon: '🤯' },
            ].map((row, i) => (
              <View key={i} style={[styles.patternRow, i < 2 && styles.patternRowBorder]}>
                <Text style={styles.patternIcon}>{row.icon}</Text>
                <View style={styles.patternValues}>
                  <Text style={styles.patternLabel}>{row.label}</Text>
                  <View style={styles.patternCols}>
                    <View style={styles.patternCol}>
                      <Text style={styles.patternColLabel}>Actual</Text>
                      <Text style={styles.patternColValue}>{row.curr}</Text>
                    </View>
                    <View style={styles.patternDivider} />
                    <View style={styles.patternCol}>
                      <Text style={styles.patternColLabel}>Anterior</Text>
                      <Text style={styles.patternColValue}>{row.prev}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* More cycles */}
        {cycles.length > 2 && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Historial de ciclos ({cycles.length})</Text>
            {cycles.map((cycle, i) => {
              const s = getCycleSummary(cycle)
              return (
                <View key={i} style={styles.historyRow}>
                  <Text style={styles.historyLabel}>{cycle.label}</Text>
                  <Text style={styles.historyDate}>{dayjs(cycle.start).format('D MMM')}</Text>
                  <Text style={styles.historyDays}>{s.length}d</Text>
                  <Text style={styles.historyPeriod}>{s.periodDays}d 🩸</Text>
                </View>
              )
            })}
          </Animated.View>
        )}
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { marginBottom: 6 },
  backBtnText: { color: Colors.lavender[300], fontSize: Typography.fontSize.sm },
  headerTitle: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, gap: Spacing.lg },
  cycleHeaders: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  cycleHeaderLeft: { flex: 1, alignItems: 'flex-start' },
  cycleHeaderRight: { flex: 1, alignItems: 'flex-end' },
  cycleHeaderLabel: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, color: Colors.lavender[300] },
  cycleHeaderDate: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  vs: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(139,92,246,0.3)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.primary[500],
  },
  vsText: { color: '#fff', fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.xs },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  compareRow: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BorderRadius.lg,
    padding: Spacing.md, gap: Spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  compareLabel: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.6)' },
  barsContainer: { gap: 6 },
  barGroup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  barValue: { width: 56, fontSize: Typography.fontSize.sm, color: '#e9d5ff', fontFamily: Typography.fontFamily.medium, textAlign: 'right' },
  bar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  legend: { flexDirection: 'row', gap: Spacing.lg, justifyContent: 'center', marginTop: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.5)' },
  patternsCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  patternRow: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  patternRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  patternIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  patternValues: { flex: 1, gap: 4 },
  patternLabel: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.45)' },
  patternCols: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  patternCol: { flex: 1, gap: 2 },
  patternColLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)' },
  patternColValue: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, color: '#e9d5ff' },
  patternDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)' },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  historyLabel: { flex: 1, fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, color: '#e9d5ff' },
  historyDate: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.45)' },
  historyDays: { fontSize: Typography.fontSize.sm, color: Colors.lavender[300], fontFamily: Typography.fontFamily.medium },
  historyPeriod: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.md },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: '#fff', textAlign: 'center' },
  emptyDesc: { fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22 },
})
