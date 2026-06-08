import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery, useMutation } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import apiClient from '@/api/client'
import { useAuthStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

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

export default function InsightsScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'cycles' | 'symptoms' | 'reports'>('cycles')

  const isPremium = user?.subscription?.tier !== 'FREE'

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
    { id: 'reports', label: '📄 Informes' },
  ] as const

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
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
                    { label: 'Ciclos registrados', value: stats.totalCycles.toString(), icon: '🔄' },
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
                {/* Placeholder bar - in production would use real symptom frequency data */}
                <View style={styles.freqBarBg}>
                  <LinearGradient
                    colors={[cat.color + 'aa', cat.color + '44']}
                    style={[styles.freqBar, { width: `${[72, 58, 45, 30, 20][i]}%` }]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  />
                </View>
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

        {/* ─── REPORTS TAB ─────────────────────────────── */}
        {activeTab === 'reports' && (
          <Animated.View entering={FadeInDown.delay(100)}>
            {!isPremium ? (
              <TouchableOpacity style={styles.premiumCta} onPress={() => router.push('/premium')}>
                <LinearGradient colors={['#7c3aed', '#a855f7']} style={styles.premiumCtaGradient}>
                  <Text style={styles.premiumCtaTitle}>👑 Informes PDF en Premium</Text>
                  <Text style={styles.premiumCtaText}>
                    Genera informes mensuales y anuales en PDF para compartir con tu ginecóloga
                  </Text>
                  <Text style={styles.premiumCtaBtn}>Desbloquear →</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.generateBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                    generateMonthlyMutation.mutate()
                  }}
                  disabled={generateMonthlyMutation.isPending}
                >
                  <LinearGradient colors={[Colors.primary[600], Colors.lavender[500]]} style={styles.generateBtnGradient}>
                    {generateMonthlyMutation.isPending
                      ? <ActivityIndicator color="#fff" />
                      : <>
                          <Text style={styles.generateBtnIcon}>📊</Text>
                          <Text style={styles.generateBtnText}>Generar informe mensual</Text>
                        </>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.sectionLabel}>Informes anteriores</Text>

                {(reports ?? []).length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>📄</Text>
                    <Text style={styles.emptyTitle}>No hay informes todavía</Text>
                    <Text style={styles.emptyText}>Genera tu primer informe mensual para verlo aquí</Text>
                  </View>
                ) : (
                  (reports ?? []).map((report: any) => (
                    <TouchableOpacity
                      key={report.id}
                      style={styles.reportCard}
                      onPress={() => {
                        // Open presigned PDF URL
                        if (report.signedUrl) {
                          // In production: Linking.openURL(report.signedUrl)
                        }
                      }}
                    >
                      <Text style={styles.reportIcon}>📄</Text>
                      <View style={styles.reportInfo}>
                        <Text style={styles.reportTitle}>{report.title}</Text>
                        <Text style={styles.reportDate}>
                          {new Date(report.createdAt).toLocaleDateString('es')}
                        </Text>
                      </View>
                      <Text style={styles.reportDownload}>↓</Text>
                    </TouchableOpacity>
                  ))
                )}
              </>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </LinearGradient>
  )
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
})
