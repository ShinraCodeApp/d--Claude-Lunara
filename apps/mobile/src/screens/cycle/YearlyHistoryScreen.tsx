import React, { useState, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import dayjs from 'dayjs'

import { useSymptomStore } from '@/store'
import { useCalendar } from '@/api/hooks/useCycle'
import { useTranslation } from '@/i18n'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

const { width } = Dimensions.get('window')
const CELL = Math.floor((width - Spacing.md * 2 - 32) / 14)

const MONTH_COLORS = {
  period:    '#ef4444',
  logged:    Colors.lavender[500],
  predicted: Colors.primary[700],
  empty:     Colors.dark.border,
}

export default function YearlyHistoryScreen() {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const { logs } = useSymptomStore()
  const [year, setYear] = useState(dayjs().year())

  const logMap = useMemo(() => {
    const map: Record<string, { isPeriod: boolean; hasLog: boolean }> = {}
    logs.forEach((l) => {
      if (dayjs(l.date).year() === year) {
        map[l.date] = { isPeriod: l.phase === 'menstrual', hasLog: true }
      }
    })
    return map
  }, [logs, year])

  const stats = useMemo(() => {
    const yearLogs = logs.filter((l) => dayjs(l.date).year() === year)
    const periodDays = yearLogs.filter((l) => l.phase === 'menstrual').map((l) => l.date).sort()
    let cycles = 0
    let lastPeriodStart: string | null = null
    const cycleLengths: number[] = []
    periodDays.forEach((d, i) => {
      if (i === 0 || dayjs(d).diff(dayjs(periodDays[i - 1]), 'day') > 2) {
        if (lastPeriodStart) {
          const len = dayjs(d).diff(dayjs(lastPeriodStart), 'day')
          if (len > 15 && len < 50) cycleLengths.push(len)
        }
        lastPeriodStart = d
        cycles++
      }
    })
    return {
      cycles,
      avgLength: cycleLengths.length > 0 ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length) : null,
      daysLogged: yearLogs.length,
    }
  }, [logs, year])

  const months = t('yearly.months') as unknown as string[]

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.dark.surface, Colors.dark.bg]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('yearly.title')}</Text>

        <View style={styles.yearNav}>
          <TouchableOpacity onPress={() => setYear((y) => y - 1)} style={styles.navBtn}>
            <Text style={styles.navText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.yearLabel}>{year}</Text>
          <TouchableOpacity
            onPress={() => setYear((y) => y + 1)}
            style={styles.navBtn}
            disabled={year >= dayjs().year()}
          >
            <Text style={[styles.navText, year >= dayjs().year() && { opacity: 0.3 }]}>→</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.md, gap: Spacing.lg }}>

        {/* Stats */}
        <Animated.View entering={FadeInDown} style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.cycles}</Text>
            <Text style={styles.statLabel}>{t('yearly.cyclesLogged')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.avgLength ? `${stats.avgLength}d` : '—'}</Text>
            <Text style={styles.statLabel}>{t('yearly.avgLength')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.daysLogged}</Text>
            <Text style={styles.statLabel}>{t('yearly.daysLogged')}</Text>
          </View>
        </Animated.View>

        {/* Heatmap - one row per month */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.heatmapCard}>
          {Array.from({ length: 12 }, (_, monthIdx) => {
            const monthStart = dayjs(`${year}-${String(monthIdx + 1).padStart(2, '0')}-01`)
            const daysInMonth = monthStart.daysInMonth()
            return (
              <View key={monthIdx} style={styles.monthRow}>
                <Text style={styles.monthLabel}>{months[monthIdx]}</Text>
                <View style={styles.daysRow}>
                  {Array.from({ length: daysInMonth }, (_, d) => {
                    const date = monthStart.date(d + 1).format('YYYY-MM-DD')
                    const info = logMap[date]
                    const isFuture = dayjs(date).isAfter(dayjs())
                    let color = MONTH_COLORS.empty
                    if (!isFuture && info?.isPeriod) color = MONTH_COLORS.period
                    else if (!isFuture && info?.hasLog) color = MONTH_COLORS.logged
                    return (
                      <View
                        key={d}
                        style={[
                          styles.heatCell,
                          { backgroundColor: color },
                          isFuture && { opacity: 0.2 },
                        ]}
                      />
                    )
                  })}
                </View>
              </View>
            )
          })}

          {/* Legend */}
          <View style={styles.legend}>
            {([
              [MONTH_COLORS.period, t('yearly.legend.period')],
              [MONTH_COLORS.logged, t('yearly.legend.logged')],
              [MONTH_COLORS.empty, '—'],
            ] as [string, string][]).map(([color, label]) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>{label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  backBtn: { marginBottom: 6 },
  backText: { color: Colors.lavender[300], fontSize: Typography.fontSize.sm },
  title: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: Colors.dark.text, textAlign: 'center', marginBottom: Spacing.sm },
  yearNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  navBtn: { padding: 8 },
  navText: { color: Colors.lavender[300], fontSize: Typography.fontSize.xl },
  yearLabel: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: Colors.dark.text, minWidth: 60, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  statNum: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: Colors.lavender[300] },
  statLabel: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted, textAlign: 'center', marginTop: 2 },
  heatmapCard: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl, padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border, gap: 6 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthLabel: { width: 28, fontSize: 10, color: Colors.dark.muted, textAlign: 'right' },
  daysRow: { flexDirection: 'row', gap: 2, flexWrap: 'nowrap' },
  heatCell: { width: CELL, height: CELL, borderRadius: 2 },
  legend: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.dark.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted },
})
