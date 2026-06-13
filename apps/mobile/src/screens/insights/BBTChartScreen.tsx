import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import dayjs from 'dayjs'

import { useSymptomStore } from '@/store'
import { useTranslation } from '@/i18n'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

const { width } = Dimensions.get('window')
const CHART_WIDTH = width - Spacing.md * 2 - Spacing.md * 2
const CHART_HEIGHT = 160

export default function BBTChartScreen() {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const { logs } = useSymptomStore()

  const bbtData = useMemo(() => {
    const last30 = dayjs().subtract(29, 'day')
    return logs
      .filter((l) => l.bbt !== null && dayjs(l.date).isAfter(last30))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((l) => ({ date: l.date, bbt: l.bbt!, phase: l.phase }))
  }, [logs])

  const hasBbt = bbtData.length > 1

  const minBbt = hasBbt ? Math.min(...bbtData.map((d) => d.bbt)) - 0.2 : 36.0
  const maxBbt = hasBbt ? Math.max(...bbtData.map((d) => d.bbt)) + 0.2 : 37.5
  const range = maxBbt - minBbt

  const avgBbt = hasBbt
    ? (bbtData.reduce((s, d) => s + d.bbt, 0) / bbtData.length).toFixed(2)
    : '—'

  const toY = (val: number) => CHART_HEIGHT - ((val - minBbt) / range) * CHART_HEIGHT

  const points = bbtData.map((d, i) => ({
    x: (i / Math.max(bbtData.length - 1, 1)) * CHART_WIDTH,
    y: toY(d.bbt),
    ...d,
  }))

  const pathD = points.length > 1
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    : ''

  // Ovulation line (temperature shift detection: 3 days above avg pre-ovulation)
  const ovulationIdx = useMemo(() => {
    if (bbtData.length < 6) return -1
    const preAvg = bbtData.slice(0, Math.floor(bbtData.length / 2))
      .reduce((s, d) => s + d.bbt, 0) / Math.floor(bbtData.length / 2)
    for (let i = 3; i < bbtData.length; i++) {
      if (bbtData[i].bbt > preAvg + 0.2 && bbtData[i - 1].bbt > preAvg + 0.1) return i
    }
    return -1
  }, [bbtData])

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.dark.surface, Colors.dark.bg]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('bbt.title')}</Text>
        <Text style={styles.subtitle}>{t('bbt.subtitle')}</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.md, gap: Spacing.lg }}>
        {!hasBbt ? (
          <Animated.View entering={FadeInDown} style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌡️</Text>
            <Text style={styles.emptyTitle}>{t('bbt.noData')}</Text>
            <Text style={styles.emptySub}>{t('bbt.noDataSub')}</Text>
          </Animated.View>
        ) : (
          <>
            {/* Stats row */}
            <Animated.View entering={FadeInDown} style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>{t('bbt.avg')}</Text>
                <Text style={styles.statValue}>{avgBbt}°</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>{t('bbt.min')}</Text>
                <Text style={[styles.statValue, { color: '#60a5fa' }]}>{minBbt.toFixed(2)}°</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>{t('bbt.max')}</Text>
                <Text style={[styles.statValue, { color: '#f87171' }]}>{maxBbt.toFixed(2)}°</Text>
              </View>
            </Animated.View>

            {/* Chart */}
            <Animated.View entering={FadeInDown.delay(100)} style={styles.chartCard}>
              <View style={styles.chartArea}>
                {/* Y-axis labels */}
                <View style={styles.yAxis}>
                  {[maxBbt, (maxBbt + minBbt) / 2, minBbt].map((v, i) => (
                    <Text key={i} style={styles.yLabel}>{v.toFixed(1)}</Text>
                  ))}
                </View>

                {/* SVG chart */}
                <View style={[styles.svgContainer, { width: CHART_WIDTH, height: CHART_HEIGHT }]}>
                  {/* Horizontal grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                    <View key={f} style={[styles.gridLine, { top: f * CHART_HEIGHT }]} />
                  ))}

                  {/* Ovulation marker */}
                  {ovulationIdx >= 0 && (
                    <View style={[styles.ovulationLine, {
                      left: (ovulationIdx / Math.max(bbtData.length - 1, 1)) * CHART_WIDTH
                    }]}>
                      <Text style={styles.ovulationLabel}>🥚</Text>
                    </View>
                  )}

                  {/* Data points and connecting lines */}
                  {points.map((p, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && (
                        <View style={{
                          position: 'absolute',
                          left: points[i - 1].x,
                          top: Math.min(points[i - 1].y, p.y),
                          width: Math.sqrt(Math.pow(p.x - points[i - 1].x, 2) + Math.pow(p.y - points[i - 1].y, 2)),
                          height: 2,
                          backgroundColor: Colors.lavender[400],
                          transform: [{ rotate: `${Math.atan2(p.y - points[i - 1].y, p.x - points[i - 1].x)}rad` }],
                          transformOrigin: '0 0',
                        }} />
                      )}
                      <View style={[styles.dataPoint, {
                        left: p.x - 4,
                        top: p.y - 4,
                        backgroundColor: p.phase === 'menstrual' ? Colors.rose[500] :
                          p.phase === 'ovulatory' ? Colors.success : Colors.lavender[400],
                      }]} />
                    </React.Fragment>
                  ))}
                </View>
              </View>

              {/* X-axis: dates */}
              <View style={styles.xAxis}>
                {points.filter((_, i) => i % Math.ceil(points.length / 6) === 0).map((p) => (
                  <Text key={p.date} style={styles.xLabel}>{dayjs(p.date).format('D/M')}</Text>
                ))}
              </View>
            </Animated.View>

            {/* Phase legend */}
            <Animated.View entering={FadeInDown.delay(200)} style={styles.legendCard}>
              {ovulationIdx >= 0 && (
                <View style={styles.legendRow}>
                  <Text style={styles.legendEmoji}>🥚</Text>
                  <Text style={styles.legendText}>{t('bbt.shift')} — {dayjs(bbtData[ovulationIdx].date).format('D MMM')}</Text>
                </View>
              )}
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#60a5fa' }]} />
                <Text style={styles.legendText}>{t('bbt.phases.pre')}</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#f87171' }]} />
                <Text style={styles.legendText}>{t('bbt.phases.post')}</Text>
              </View>
              <Text style={styles.tip}>💡 {t('bbt.tip')}</Text>
            </Animated.View>
          </>
        )}
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
  emptyCard: { alignItems: 'center', padding: Spacing.xl * 2, gap: Spacing.md },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, color: Colors.dark.text, textAlign: 'center' },
  emptySub: { fontSize: Typography.fontSize.sm, color: Colors.dark.muted, textAlign: 'center', lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  statLabel: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted, marginBottom: 4 },
  statValue: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: Colors.dark.text },
  chartCard: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl, padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
  chartArea: { flexDirection: 'row', gap: 8 },
  yAxis: { justifyContent: 'space-between', height: CHART_HEIGHT },
  yLabel: { fontSize: 9, color: Colors.dark.muted },
  svgContainer: { position: 'relative', overflow: 'hidden' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: Colors.dark.border + '60' },
  ovulationLine: { position: 'absolute', top: 0, bottom: 0, width: 1.5, backgroundColor: Colors.gold.main + '80' },
  ovulationLabel: { position: 'absolute', top: -16, left: -8, fontSize: 14 },
  dataPoint: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm, paddingLeft: 28 },
  xLabel: { fontSize: 9, color: Colors.dark.muted },
  legendCard: { backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.border },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  legendEmoji: { fontSize: 16 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: Typography.fontSize.sm, color: Colors.dark.muted },
  tip: { fontSize: Typography.fontSize.xs, color: Colors.lavender[300], marginTop: 4, lineHeight: 18 },
})
