import React, { useState, useMemo, Component, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, ActivityIndicator, Alert, RefreshControl,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import apiClient from '@/api/client'
import { useAuthStore, useSymptomStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'
import { analyzePatterns, computeWellnessSummary, PhasePattern, WellnessSummary } from '@/utils/patternAnalysis'

const { width } = Dimensions.get('window')
const BAR_MAX_HEIGHT = 80
const CHART_WIDTH = width - Spacing.md * 2 - 32

interface CycleStat {
  averageLength: number
  averagePeriodLength: number
  totalCycles: number
  regularity: 'very_regular' | 'regular' | 'somewhat_irregular' | 'irregular'
  shortestCycle: number
  longestCycle: number
}

const REGULARITY_LABELS = {
  very_regular: { label: 'Muy regular', color: Colors.success },
  regular: { label: 'Regular', color: '#34d399' },
  somewhat_irregular: { label: 'Algo irregular', color: Colors.gold.main },
  irregular: { label: 'Irregular', color: Colors.rose[400] },
}

const SYMPTOM_CATEGORIES = [
  { id: 'PAIN', label: 'Dolor', icon: '🎯', color: '#f87171' },
  { id: 'MOOD', label: 'Estado de ánimo', icon: '💭', color: '#818cf8' },
  { id: 'ENERGY', label: 'Energía', icon: '⚡', color: '#fbbf24' },
  { id: 'DIGESTIVE', label: 'Digestivo', icon: '🌿', color: '#34d399' },
  { id: 'SKIN', label: 'Piel', icon: '✨', color: '#f9a8d4' },
]

class InsightsErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0d0118', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📊</Text>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
            Estadísticas no disponibles
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
            Hubo un problema al cargar tus estadísticas. Registra algunos días de síntomas y vuelve a intentarlo.
          </Text>
        </View>
      )
    }
    return this.props.children
  }
}

function InsightsScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { logs } = useSymptomStore()
  const [activeTab, setActiveTab] = useState<'cycles' | 'symptoms' | 'patterns' | 'reports'>('cycles')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['cycleStats'] })
    await queryClient.invalidateQueries({ queryKey: ['cycleLengths'] })
    await queryClient.invalidateQueries({ queryKey: ['reports'] })
    setRefreshing(false)
  }, [queryClient])
  const patterns = analyzePatterns(logs)
  const wellness = computeWellnessSummary(logs)

  const isPremium = user?.subscription?.tier !== 'FREE'

  const symptomFrequencies = useMemo(() => {
    if (!logs.length) return [0, 0, 0, 0, 0]
    const counts = [0, 0, 0, 0, 0]
    logs.forEach((log) => {
      const syms = log.symptoms ?? []
      if (syms.some((s) => ['colicos', 'dolor_cabeza', 'dolor_espalda'].includes(s))) counts[0]++
      if (['ansiosa', 'irritable', 'triste'].includes(log.mood ?? '')) counts[1]++
      if (log.energy === 'baja') counts[2]++
      if (syms.some((s) => ['nauseas', 'hinchazón'].includes(s))) counts[3]++
      if (syms.includes('acne')) counts[4]++
    })
    const max = Math.max(...counts, 1)
    return counts.map((c) => Math.round((c / max) * 100))
  }, [logs])

  const { data: stats, isLoading: loadingStats } = useQuery<CycleStat>({
    queryKey: ['cycleStats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/cycles/stats')
      return data
    },
    staleTime: 10 * 60 * 1000,
  })

  const { data: cycleLengths } = useQuery<number[]>({
    queryKey: ['cycleLengths'],
    queryFn: async () => {
      const { data } = await apiClient.get('/cycles?limit=12')
      return data.cycles?.map((c: any) => c.length).filter(Boolean).slice(0, 12).reverse() ?? []
    },
    staleTime: 10 * 60 * 1000,
  })

  const { data: reports } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const { data } = await apiClient.get('/reports')
      return data.reports ?? []
    },
    enabled: isPremium,
    staleTime: 5 * 60 * 1000,
  })

  const generateMonthlyMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/reports/monthly')
      return data
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
  })

  const maxCycleLength = Math.max(...(cycleLengths ?? [0]), 1)

  const regularity = stats?.regularity
    ? REGULARITY_LABELS[stats.regularity]
    : { label: 'Sin datos', color: 'rgba(255,255,255,0.3)' }

  const tabs = [
    { id: 'cycles', label: '📈 Ciclos' },
    { id: 'symptoms', label: '🎯 Síntomas' },
    { id: 'patterns', label: '🔮 Patrones' },
    { id: 'reports', label: '📄 Informes' },
  ] as const

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a78bfa" colors={['#a78bfa']} />}
      >
        {/* ─── Header ─────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <Text style={styles.screenTitle}>Estadísticas</Text>
          <Text style={styles.screenSubtitle}>Descubre los patrones de tu ciclo</Text>
        </Animated.View>

        {/* ─── Tabs ────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(50)} style={styles.tabsRow}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => {
                setActiveTab(tab.id)
                Haptics.selectionAsync()
              }}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* ─── CYCLES TAB ──────────────────────────────── */}
        {activeTab === 'cycles' && (
          <>
            {loadingStats ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={Colors.lavender[400]} />
                <Text style={styles.loadingText}>Calculando estadísticas...</Text>
              </View>
            ) : stats ? (
              <>
                {/* KPI Cards */}
                <Animated.View entering={FadeInDown.delay(100)} style={styles.kpiGrid}>
                  {[
                    { label: 'Duración media', value: `${stats.averageLength} días`, icon: '📅' },
                    { label: 'Período medio', value: `${stats.averagePeriodLength} días`, icon: '🩸' },
                    { label: 'Ciclos registrados', value: String(stats.totalCycles ?? 0), icon: '🔄' },
                    { label: 'Regularidad', value: regularity.label, icon: '📊', highlight: regularity.color },
                  ].map((kpi) => (
                    <View key={kpi.label} style={styles.kpiCard}>
                      <Text style={styles.kpiIcon}>{kpi.icon}</Text>
                      <Text style={[styles.kpiValue, kpi.highlight ? { color: kpi.highlight } : undefined]}>
                        {kpi.value}
                      </Text>
                      <Text style={styles.kpiLabel}>{kpi.label}</Text>
                    </View>
                  ))}
                </Animated.View>

                {/* Range Card */}
                <Animated.View entering={FadeInDown.delay(150)} style={styles.rangeCard}>
                  <Text style={styles.cardTitle}>Rango de ciclos</Text>
                  <View style={styles.rangeRow}>
                    <View style={styles.rangeItem}>
                      <Text style={styles.rangeValue}>{stats.shortestCycle}</Text>
                      <Text style={styles.rangeLabel}>días mínimo</Text>
                    </View>
                    <View style={styles.rangeSeparator}>
                      <View style={styles.rangeLine} />
                      <Text style={styles.rangeDash}>{'<···>'}</Text>
                      <View style={styles.rangeLine} />
                    </View>
                    <View style={styles.rangeItem}>
                      <Text style={styles.rangeValue}>{stats.longestCycle}</Text>
                      <Text style={styles.rangeLabel}>días máximo</Text>
                    </View>
                  </View>
                </Animated.View>

                {/* Cycle length chart */}
                {cycleLengths && cycleLengths.length > 1 && (
                  <Animated.View entering={FadeInDown.delay(200)} style={styles.chartCard}>
                    <Text style={styles.cardTitle}>Últimos {cycleLengths.length} ciclos</Text>
                    <View style={styles.barChart}>
                      {cycleLengths.map((len, i) => {
                        const barH = (len / maxCycleLength) * BAR_MAX_HEIGHT
                        const isLast = i === cycleLengths.length - 1
                        return (
                          <View key={i} style={styles.barCol}>
                            <Text style={styles.barValue}>{len}</Text>
                            <View style={styles.barBg}>
                              <LinearGradient
                                colors={isLast
                                  ? [Colors.primary[500], Colors.lavender[400]]
                                  : ['rgba(139,92,246,0.4)', 'rgba(139,92,246,0.2)']}
                                style={[styles.bar, { height: barH }]}
                              />
                            </View>
                            <Text style={styles.barLabel}>{i + 1}</Text>
                          </View>
                        )
                      })}
                    </View>
                    <Text style={styles.chartNote}>Días de duración por ciclo</Text>
                  </Animated.View>
                )}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📊</Text>
                <Text style={styles.emptyTitle}>Sin datos todavía</Text>
                <Text style={styles.emptyText}>Registra al menos un ciclo para ver tus estadísticas</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/calendar')}>
                  <Text style={styles.emptyBtnText}>Ir al calendario →</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ─── SYMPTOMS TAB ────────────────────────────── */}
        {activeTab === 'symptoms' && (
          <Animated.View entering={FadeInDown.delay(100)}>
            <Text style={styles.sectionLabel}>Síntomas más frecuentes por categoría</Text>
            {SYMPTOM_CATEGORIES.map((cat, i) => (
              <View key={cat.id} style={styles.symptomCategoryCard}>
                <View style={styles.symptomCategoryHeader}>
                  <Text style={styles.symptomCategoryIcon}>{cat.icon}</Text>
                  <Text style={styles.symptomCategoryName}>{cat.label}</Text>
                </View>
                <View style={styles.freqBarBg}>
                  {symptomFrequencies[i] > 0 && (
                    <LinearGradient
                      colors={[cat.color + 'aa', cat.color + '44']}
                      style={[styles.freqBar, { width: `${symptomFrequencies[i]}%` }]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    />
                  )}
                </View>
                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                  {symptomFrequencies[i] > 0 ? `${symptomFrequencies[i]}% de días` : 'Sin registros'}
                </Text>
              </View>
            ))}

            {!isPremium && (
              <TouchableOpacity style={styles.premiumCta} onPress={() => router.push('/premium')}>
                <LinearGradient colors={['#7c3aed', '#a855f7']} style={styles.premiumCtaGradient}>
                  <Text style={styles.premiumCtaTitle}>👑 Análisis detallado de síntomas</Text>
                  <Text style={styles.premiumCtaText}>
                    Activa Premium para ver correlaciones entre síntomas, fases y tendencias mensuales
                  </Text>
                  <Text style={styles.premiumCtaBtn}>Comenzar prueba gratuita →</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* ─── PATTERNS TAB ────────────────────────────── */}
        {activeTab === 'patterns' && (
          <Animated.View entering={FadeInDown.delay(100)} style={{ gap: Spacing.md }}>
            <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>
              Basado en {logs.length} registro{logs.length !== 1 ? 's' : ''} locales
            </Text>

            {/* Wellness stats row */}
            <View style={styles.wellnessRow}>
              {[
                { icon: '😴', label: 'Sueño medio', value: wellness.avgSleepOverall ? `${wellness.avgSleepOverall}h` : '--' },
                { icon: '💧', label: 'Agua media', value: wellness.avgWater ? `${wellness.avgWater} vasos` : '--' },
                { icon: '💕', label: 'Días íntimos', value: String(wellness.totalIntimacyDays ?? 0) },
                { icon: '❤️', label: 'Deseo medio', value: wellness.avgDesireOverall ? `${wellness.avgDesireOverall}/5` : '--' },
              ].map((stat) => (
                <View key={stat.label} style={styles.wellnessStat}>
                  <Text style={styles.wellnessStatIcon}>{stat.icon}</Text>
                  <Text style={styles.wellnessStatValue}>{stat.value}</Text>
                  <Text style={styles.wellnessStatLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* BBT Chart */}
            {wellness.bbtLogs.length >= 3 && (
              <View style={styles.bbtCard}>
                <Text style={styles.bbtTitle}>🌡️ Temperatura basal (BBT)</Text>
                <Text style={styles.bbtSubtitle}>Últimos {wellness.bbtLogs.slice(-20).length} registros</Text>
                <BBTChart bbtLogs={wellness.bbtLogs.slice(-20)} />
                <Text style={styles.bbtHint}>El aumento sostenido de 0.2–0.5°C indica ovulación</Text>
              </View>
            )}

            {patterns.map((p) => (
              <PatternCard key={p.phase} pattern={p} />
            ))}
          </Animated.View>
        )}

        {/* ─── REPORTS TAB ─────────────────────────────── */}
        {activeTab === 'reports' && (
          <Animated.View entering={FadeInDown.delay(100)} style={{ gap: Spacing.md }}>

            {/* Local PDF — available for all users */}
            <View style={styles.reportSection}>
              <Text style={styles.sectionLabel}>📊 Informe mensual local</Text>
              <Text style={styles.reportHint}>
                Genera un PDF con tu ciclo, síntomas, BBT, sueño y más. Listo para compartir con tu ginecóloga.
              </Text>
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={async () => {
                  if (logs.length === 0) {
                    Alert.alert('Sin registros', 'Registra al menos un día para generar el informe.')
                    return
                  }
                  setPdfLoading(true)
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  const now = new Date()
                  const monthName = now.toLocaleString('es-ES', { month: 'long' })
                  const monthCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1)
                  try {
                    const { generateMonthlyReport } = await import('@/utils/pdfReport')
                    await generateMonthlyReport({
                      userName: user?.profile?.firstName ?? 'Usuaria',
                      month: monthCapitalized,
                      year: now.getFullYear(),
                      logs,
                    })
                  } catch (e: any) {
                    Alert.alert('Error', e?.message ?? 'No se pudo generar el PDF.')
                  } finally {
                    setPdfLoading(false)
                  }
                }}
                disabled={pdfLoading}
              >
                <LinearGradient colors={[Colors.primary[600], Colors.lavender[500]]} style={styles.generateBtnGradient}>
                  {pdfLoading
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Text style={styles.generateBtnIcon}>📄</Text>
                        <Text style={styles.generateBtnText}>Generar y compartir PDF</Text>
                      </>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Premium cloud reports upsell */}
            {!isPremium && (
              <TouchableOpacity onPress={() => router.push('/premium')}>
                <LinearGradient colors={['rgba(124,58,237,0.25)', 'rgba(168,85,247,0.15)']} style={styles.premiumCtaGradient}>
                  <Text style={styles.premiumCtaTitle}>👑 Informes históricos en Premium</Text>
                  <Text style={styles.premiumCtaText}>
                    Accede a informes de meses anteriores, análisis anuales y sincronización en la nube
                  </Text>
                  <Text style={styles.premiumCtaBtn}>Ver Premium →</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </LinearGradient>
  )
}

export default function InsightsScreenWithBoundary() {
  return <InsightsErrorBoundary><InsightsScreen /></InsightsErrorBoundary>
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  header: { marginBottom: Spacing.xs },
  screenTitle: {
    fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: '#fff',
  },
  screenSubtitle: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  tabsRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.xl, padding: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary[700] },
  tabText: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.4)', fontFamily: Typography.fontFamily.medium },
  tabTextActive: { color: '#fff' },
  loadingContainer: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xl },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: Typography.fontSize.sm },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  kpiCard: {
    flex: 1, minWidth: (CHART_WIDTH / 2) - Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  kpiIcon: { fontSize: 24 },
  kpiValue: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, color: '#e9d5ff' },
  kpiLabel: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  rangeCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  cardTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#e9d5ff', marginBottom: Spacing.md },
  rangeRow: { flexDirection: 'row', alignItems: 'center' },
  rangeItem: { flex: 1, alignItems: 'center', gap: 4 },
  rangeValue: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: Colors.lavender[300] },
  rangeLabel: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.4)' },
  rangeSeparator: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 4 },
  rangeLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  rangeDash: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.3)' },
  chartCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: BAR_MAX_HEIGHT + 40 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  barValue: { fontSize: 9, color: 'rgba(255,255,255,0.5)' },
  barBg: { width: '100%', height: BAR_MAX_HEIGHT, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 9, color: 'rgba(255,255,255,0.3)' },
  chartNote: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: Spacing.sm },
  emptyContainer: { alignItems: 'center', paddingTop: Spacing.xl, gap: Spacing.sm },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  emptyText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  emptyBtn: { backgroundColor: Colors.primary[600], borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, marginTop: Spacing.sm },
  emptyBtnText: { color: '#fff', fontFamily: Typography.fontFamily.bold },
  sectionLabel: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.4)', fontFamily: Typography.fontFamily.medium },
  symptomCategoryCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl, padding: Spacing.md,
    gap: Spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  symptomCategoryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  symptomCategoryIcon: { fontSize: 20 },
  symptomCategoryName: { fontSize: Typography.fontSize.base, color: '#e9d5ff', fontFamily: Typography.fontFamily.medium },
  freqBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  freqBar: { height: '100%', borderRadius: 4 },
  reportSection: { gap: Spacing.sm },
  reportHint: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.55)', lineHeight: 20 },
  premiumCta: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  premiumCtaGradient: { padding: Spacing.lg, gap: Spacing.sm },
  premiumCtaTitle: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  premiumCtaText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)', lineHeight: 20 },
  premiumCtaBtn: { color: Colors.gold.main, fontFamily: Typography.fontFamily.bold },
  generateBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  generateBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.md, gap: Spacing.sm },
  generateBtnIcon: { fontSize: 20 },
  generateBtnText: { color: '#fff', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold },
  reportCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  reportIcon: { fontSize: 24 },
  reportInfo: { flex: 1, gap: 2 },
  reportTitle: { fontSize: Typography.fontSize.base, color: '#e9d5ff', fontFamily: Typography.fontFamily.medium },
  reportDate: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.4)' },
  reportDownload: { fontSize: Typography.fontSize.xl, color: Colors.lavender[300] },
  patternCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl,
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  patternHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  patternEmoji: { fontSize: 28 },
  patternPhaseLabel: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  patternLogCount: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  patternTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  patternTag: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  patternTagText: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.medium },
  patternInsights: { padding: Spacing.md, paddingTop: 0, gap: 8 },
  patternInsightRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  patternInsightDot: { color: Colors.lavender[400], fontSize: 10, marginTop: 4 },
  patternInsightText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)', flex: 1, lineHeight: 20 },
  wellnessRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  wellnessStat: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 3 },
  wellnessStatIcon: { fontSize: 18 },
  wellnessStatValue: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold, color: '#e9d5ff' },
  wellnessStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  bbtCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 4,
  },
  bbtTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#e9d5ff' },
  bbtSubtitle: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.4)' },
  bbtHint: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.3)', marginTop: 4, lineHeight: 16 },
})

function BBTChart({ bbtLogs }: { bbtLogs: Array<{ date: string; bbt: number }> }) {
  const values = bbtLogs.map((l) => l.bbt)
  const minV = Math.min(...values) - 0.1
  const maxV = Math.max(...values) + 0.1
  const range = maxV - minV || 0.5
  const BAR_HEIGHT = 60

  return (
    <View style={bbtStyles.chart}>
      {/* Y-axis labels */}
      <View style={bbtStyles.yAxis}>
        <Text style={bbtStyles.yLabel}>{maxV.toFixed(1)}</Text>
        <Text style={bbtStyles.yLabel}>{minV.toFixed(1)}</Text>
      </View>
      {/* Bars */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={[bbtStyles.barsRow, { height: BAR_HEIGHT + 24 }]}>
          {bbtLogs.map((entry, i) => {
            const normalised = (entry.bbt - minV) / range
            const barH = Math.max(4, normalised * BAR_HEIGHT)
            const isHigh = entry.bbt >= 37.0
            return (
              <View key={i} style={bbtStyles.barCol}>
                <Text style={bbtStyles.barVal}>{entry.bbt.toFixed(1)}</Text>
                <View style={[bbtStyles.barBg, { height: BAR_HEIGHT }]}>
                  <LinearGradient
                    colors={isHigh
                      ? [Colors.rose[400], Colors.rose[500]]
                      : [Colors.primary[400], Colors.lavender[500]]}
                    style={[bbtStyles.bar, { height: barH }]}
                  />
                </View>
                <Text style={bbtStyles.barDate}>
                  {entry.date.slice(5).replace('-', '/')}
                </Text>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

const bbtStyles = StyleSheet.create({
  chart: { flexDirection: 'row', gap: 8, marginTop: 8 },
  yAxis: { justifyContent: 'space-between', paddingBottom: 20, paddingTop: 14 },
  yLabel: { fontSize: 9, color: 'rgba(255,255,255,0.35)' },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingBottom: 0 },
  barCol: { alignItems: 'center', gap: 2 },
  barVal: { fontSize: 8, color: 'rgba(255,255,255,0.4)', marginBottom: 2 },
  barBg: { width: 18, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3 },
  barDate: { fontSize: 7, color: 'rgba(255,255,255,0.3)', marginTop: 2, textAlign: 'center' },
})

const PHASE_COLORS: Record<string, string> = {
  menstrual: Colors.rose[400],
  follicular: Colors.primary[400],
  ovulatory: Colors.success,
  luteal: Colors.gold.main,
}

function PatternCard({ pattern }: { pattern: PhasePattern }) {
  const color = PHASE_COLORS[pattern.phase]
  const energyColors = { alta: Colors.success, media: Colors.gold.main, baja: Colors.dark.muted }
  return (
    <View style={styles.patternCard}>
      <View style={[styles.patternHeader, { borderLeftWidth: 3, borderLeftColor: color }]}>
        <Text style={styles.patternEmoji}>{pattern.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.patternPhaseLabel}>Fase {pattern.label}</Text>
          <Text style={styles.patternLogCount}>{pattern.totalLogs} registro{pattern.totalLogs !== 1 ? 's' : ''}</Text>
        </View>
      </View>
      {(pattern.topMood || pattern.topEnergy || pattern.topSymptoms.length > 0) && (
        <View style={styles.patternTags}>
          {pattern.topEnergy && (
            <View style={[styles.patternTag, { borderColor: energyColors[pattern.topEnergy] + '60', backgroundColor: energyColors[pattern.topEnergy] + '20' }]}>
              <Text style={[styles.patternTagText, { color: energyColors[pattern.topEnergy] }]}>
                Energía {pattern.topEnergy}
              </Text>
            </View>
          )}
          {pattern.topMood && (
            <View style={[styles.patternTag, { borderColor: Colors.lavender[400] + '60', backgroundColor: Colors.lavender[400] + '20' }]}>
              <Text style={[styles.patternTagText, { color: Colors.lavender[300] }]}>{pattern.topMood}</Text>
            </View>
          )}
          {pattern.topSymptoms.slice(0, 2).map((s) => (
            <View key={s} style={[styles.patternTag, { borderColor: Colors.rose[400] + '60', backgroundColor: Colors.rose[400] + '20' }]}>
              <Text style={[styles.patternTagText, { color: Colors.rose[300] }]}>{s.replace(/_/g, ' ')}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.patternInsights}>
        {pattern.insights.map((insight, i) => (
          <View key={i} style={styles.patternInsightRow}>
            <Text style={styles.patternInsightDot}>✦</Text>
            <Text style={styles.patternInsightText}>{insight}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
