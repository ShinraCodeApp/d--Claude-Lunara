import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import dayjs from 'dayjs'

import { useSymptomStore, useAuthStore } from '@/store'
import { useTranslation } from '@/i18n'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

export default function MedicalSummaryScreen() {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const { logs } = useSymptomStore()
  const { user } = useAuthStore()

  const stats = useMemo(() => {
    if (logs.length === 0) return null

    // Cycle lengths
    const periodStarts: string[] = []
    let lastWasPeriod = false
    logs.sort((a, b) => a.date.localeCompare(b.date)).forEach((l) => {
      if (l.phase === 'menstrual' && !lastWasPeriod) periodStarts.push(l.date)
      lastWasPeriod = l.phase === 'menstrual'
    })

    const cycleLengths: number[] = []
    for (let i = 1; i < periodStarts.length; i++) {
      const len = dayjs(periodStarts[i]).diff(dayjs(periodStarts[i - 1]), 'day')
      if (len >= 15 && len <= 50) cycleLengths.push(len)
    }

    // Period lengths
    const periodLengths: number[] = []
    let currentPeriodStart: string | null = null
    let currentPeriodEnd: string | null = null
    logs.forEach((l) => {
      if (l.phase === 'menstrual') {
        if (!currentPeriodStart) currentPeriodStart = l.date
        currentPeriodEnd = l.date
      } else {
        if (currentPeriodStart && currentPeriodEnd) {
          const len = dayjs(currentPeriodEnd).diff(dayjs(currentPeriodStart), 'day') + 1
          if (len >= 1 && len <= 10) periodLengths.push(len)
        }
        currentPeriodStart = null
        currentPeriodEnd = null
      }
    })

    // Top symptoms
    const symptomCount: Record<string, number> = {}
    logs.forEach((l) => l.symptoms.forEach((s) => { symptomCount[s] = (symptomCount[s] ?? 0) + 1 }))
    const topSymptoms = Object.entries(symptomCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s]) => s)

    // Top moods
    const moodCount: Record<string, number> = {}
    logs.forEach((l) => { if (l.mood) moodCount[l.mood] = (moodCount[l.mood] ?? 0) + 1 })
    const topMoods = Object.entries(moodCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => m)

    // Sleep / water averages
    const sleepLogs = logs.filter((l) => l.sleep)
    const avgSleep = sleepLogs.length
      ? (sleepLogs.reduce((s, l) => s + l.sleep!.hours, 0) / sleepLogs.length).toFixed(1)
      : null

    const waterLogs = logs.filter((l) => l.water)
    const avgWater = waterLogs.length
      ? (waterLogs.reduce((s, l) => s + l.water!, 0) / waterLogs.length).toFixed(1)
      : null

    const avgCycle = cycleLengths.length
      ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
      : null
    const avgPeriod = periodLengths.length
      ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
      : null
    const regularity = cycleLengths.length >= 2
      ? Math.max(...cycleLengths) - Math.min(...cycleLengths) <= 7 ? 'regular' : 'irregular'
      : null

    return {
      totalLogs: logs.length,
      avgCycle, avgPeriod,
      shortestCycle: cycleLengths.length ? Math.min(...cycleLengths) : null,
      longestCycle: cycleLengths.length ? Math.max(...cycleLengths) : null,
      regularity, topSymptoms, topMoods, avgSleep, avgWater,
      dateRange: { from: logs[0].date, to: logs[logs.length - 1].date },
    }
  }, [logs])

  const MOOD_LABELS: Record<string, string> = {
    HAPPY: '😊 Feliz', SAD: '😢 Triste', ANXIOUS: '😰 Ansiosa',
    STRESSED: '😤 Estresada', MOTIVATED: '💪 Motivada', RELAXED: '😌 Relajada',
    IRRITABLE: '😠 Irritable', ENERGETIC: '⚡ Energética', TIRED: '😴 Cansada',
    EMOTIONAL: '🥺 Emocional', NEUTRAL: '😐 Neutral',
  }

  const shareSummary = async () => {
    if (!stats) return
    const text = [
      `📋 ${t('medical.title')} — Lunara`,
      `${t('medical.generated')}: ${dayjs().format('D [de] MMMM, YYYY')}`,
      '',
      `📊 ${t('medical.cycleStats')}`,
      stats.avgCycle ? `• ${t('medical.avgCycle')}: ${stats.avgCycle} días` : '',
      stats.avgPeriod ? `• ${t('medical.avgPeriod')}: ${stats.avgPeriod} días` : '',
      stats.shortestCycle ? `• ${t('medical.shortestCycle')}: ${stats.shortestCycle} días` : '',
      stats.longestCycle ? `• ${t('medical.longestCycle')}: ${stats.longestCycle} días` : '',
      stats.regularity ? `• ${t('medical.regularity')}: ${t(`medical.${stats.regularity}`)}` : '',
      '',
      stats.avgSleep ? `😴 ${t('medical.avgSleep')}: ${stats.avgSleep}h` : '',
      stats.avgWater ? `💧 ${t('medical.avgWater')}: ${stats.avgWater} vasos` : '',
      '',
      `📅 ${t('medical.dateRange') ?? 'Período'}: ${dayjs(stats.dateRange.from).format('D MMM')} – ${dayjs(stats.dateRange.to).format('D MMM YYYY')}`,
      '',
      `_${t('medical.disclaimer')}_`,
    ].filter(Boolean).join('\n')

    await Share.share({ message: text, title: t('medical.title') })
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.dark.surface, Colors.dark.bg]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('medical.title')}</Text>
        <Text style={styles.subtitle}>{t('medical.subtitle')}</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.md, gap: Spacing.lg }}>

        {/* Header info */}
        <Animated.View entering={FadeInDown} style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('medical.patient')}</Text>
            <Text style={styles.infoValue}>{user?.name ?? '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('medical.generated')}</Text>
            <Text style={styles.infoValue}>{dayjs().format('D MMM YYYY')}</Text>
          </View>
          {stats?.dateRange && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Período analizado</Text>
              <Text style={styles.infoValue}>
                {dayjs(stats.dateRange.from).format('D MMM')} – {dayjs(stats.dateRange.to).format('D MMM YYYY')}
              </Text>
            </View>
          )}
        </Animated.View>

        {!stats ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>Necesitas al menos 2 registros para generar el resumen médico.</Text>
          </View>
        ) : (
          <>
            {/* Cycle stats */}
            <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
              <Text style={styles.sectionTitle}>📊 {t('medical.cycleStats')}</Text>
              <View style={styles.statsGrid}>
                {[
                  { label: t('medical.avgCycle'), value: stats.avgCycle ? `${stats.avgCycle} días` : '—' },
                  { label: t('medical.avgPeriod'), value: stats.avgPeriod ? `${stats.avgPeriod} días` : '—' },
                  { label: t('medical.shortestCycle'), value: stats.shortestCycle ? `${stats.shortestCycle} días` : '—' },
                  { label: t('medical.longestCycle'), value: stats.longestCycle ? `${stats.longestCycle} días` : '—' },
                ].map((item) => (
                  <View key={item.label} style={styles.statCard}>
                    <Text style={styles.statValue}>{item.value}</Text>
                    <Text style={styles.statLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
              {stats.regularity && (
                <View style={[styles.regularityChip, { backgroundColor: stats.regularity === 'regular' ? Colors.success + '20' : Colors.rose[500] + '20' }]}>
                  <Text style={[styles.regularityText, { color: stats.regularity === 'regular' ? Colors.success : Colors.rose[400] }]}>
                    {stats.regularity === 'regular' ? '✅' : '⚠️'} {t(`medical.${stats.regularity}`)}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Wellness */}
            <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
              <Text style={styles.sectionTitle}>🌿 Bienestar</Text>
              <View style={styles.wellnessRow}>
                {stats.avgSleep && (
                  <View style={styles.wellnessCard}>
                    <Text style={styles.wellnessEmoji}>😴</Text>
                    <Text style={styles.wellnessValue}>{stats.avgSleep}h</Text>
                    <Text style={styles.wellnessLabel}>{t('medical.avgSleep')}</Text>
                  </View>
                )}
                {stats.avgWater && (
                  <View style={styles.wellnessCard}>
                    <Text style={styles.wellnessEmoji}>💧</Text>
                    <Text style={styles.wellnessValue}>{stats.avgWater}</Text>
                    <Text style={styles.wellnessLabel}>{t('medical.avgWater')}</Text>
                  </View>
                )}
              </View>
            </Animated.View>

            {/* Top moods */}
            {stats.topMoods.length > 0 && (
              <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
                <Text style={styles.sectionTitle}>😊 {t('medical.moods')}</Text>
                <View style={styles.tagsRow}>
                  {stats.topMoods.map((m) => (
                    <View key={m} style={styles.tag}>
                      <Text style={styles.tagText}>{MOOD_LABELS[m] ?? m}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Share */}
            <Animated.View entering={FadeInDown.delay(250)}>
              <TouchableOpacity style={styles.shareBtn} onPress={shareSummary}>
                <LinearGradient colors={[Colors.primary[600], Colors.lavender[500]]} style={styles.shareBtnGradient}>
                  <Text style={styles.shareBtnText}>{t('medical.share')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}

        <Text style={styles.disclaimer}>{t('medical.disclaimer')}</Text>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  backBtn: { marginBottom: 6 },
  backText: { color: Colors.lavender[300], fontSize: Typography.fontSize.sm },
  title: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: Colors.dark.text, textAlign: 'center' },
  subtitle: { fontSize: Typography.fontSize.sm, color: Colors.dark.muted, textAlign: 'center', marginTop: 2 },
  infoCard: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.border },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: Typography.fontSize.sm, color: Colors.dark.muted },
  infoValue: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, color: Colors.dark.text },
  emptyCard: { alignItems: 'center', padding: Spacing.xl * 2, gap: Spacing.md },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: Typography.fontSize.sm, color: Colors.dark.muted, textAlign: 'center', lineHeight: 20 },
  section: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl, padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border, gap: Spacing.md },
  sectionTitle: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold, color: Colors.dark.text },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: { width: '47%', backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center' },
  statValue: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: Colors.lavender[300] },
  statLabel: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted, textAlign: 'center', marginTop: 2 },
  regularityChip: { alignSelf: 'flex-start', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  regularityText: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium },
  wellnessRow: { flexDirection: 'row', gap: Spacing.sm },
  wellnessCard: { flex: 1, backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 4 },
  wellnessEmoji: { fontSize: 24 },
  wellnessValue: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: Colors.dark.text },
  wellnessLabel: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted, textAlign: 'center' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: { backgroundColor: Colors.lavender[500] + '25', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 6, borderWidth: 1, borderColor: Colors.lavender[500] + '40' },
  tagText: { fontSize: Typography.fontSize.sm, color: Colors.lavender[300] },
  shareBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  shareBtnGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  shareBtnText: { color: '#fff', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold },
  disclaimer: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted + '80', textAlign: 'center', lineHeight: 18 },
})
