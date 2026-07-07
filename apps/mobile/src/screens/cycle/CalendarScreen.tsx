import React, { useState, useMemo, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import weekday from 'dayjs/plugin/weekday'
import isBetween from 'dayjs/plugin/isBetween'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { router } from 'expo-router'

import { useCalendar } from '@/api/hooks/useCycle'
import { useSymptomStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/theme'

dayjs.extend(weekday)
dayjs.extend(isBetween)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.locale('es')

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const MOOD_ICONS: Record<string, string> = {
  HAPPY: '😊', RELAXED: '😌', SAD: '😢', ANXIOUS: '😰',
  STRESSED: '😤', TIRED: '😴', ENERGETIC: '⚡', EMOTIONAL: '🥺',
  IRRITABLE: '😠', MOTIVATED: '💪', NEUTRAL: '😐',
}

const ICON_LABELS: Record<string, string> = {
  '🩸': 'Período', '😊': 'Humor', '😌': 'Humor', '😢': 'Humor',
  '😰': 'Humor', '😤': 'Humor', '😴': 'Sueño', '⚡': 'Humor',
  '🥺': 'Humor', '😠': 'Humor', '🤩': 'Humor', '😐': 'Humor',
  '💊': 'Síntomas', '💧': 'Agua', '❤️': 'Intimidad', '📝': 'Nota',
}

const DAY_COLORS: Record<string, { bg: string; border: string; label: string; emoji: string }> = {
  period: { bg: Colors.rose[500] + 'CC', border: Colors.rose[500], label: 'Menstruación', emoji: '🌑' },
  predicted_period: { bg: Colors.primary[500] + '40', border: Colors.primary[400], label: 'Período predicho', emoji: '🌒' },
  ovulation: { bg: Colors.success + 'CC', border: Colors.success, label: 'Ovulación', emoji: '🌕' },
  fertile: { bg: Colors.success + '40', border: Colors.success, label: 'Fértil', emoji: '🌿' },
  normal: { bg: 'transparent', border: 'transparent', label: '', emoji: '' },
}

const FERTILITY_BY_TYPE: Record<string, { level: 'ALTA' | 'MEDIA' | 'BAJA'; color: string; protect: boolean }> = {
  ovulation:        { level: 'ALTA',  color: '#22c55e', protect: true },
  fertile:          { level: 'ALTA',  color: '#22c55e', protect: true },
  period:           { level: 'BAJA',  color: '#94a3b8', protect: false },
  predicted_period: { level: 'BAJA',  color: '#94a3b8', protect: false },
  normal:           { level: 'BAJA',  color: '#94a3b8', protect: false },
}

const PHASE_LABEL: Record<string, string> = {
  period:           'Menstruación',
  predicted_period: 'Período predicho',
  ovulation:        'Ovulación',
  fertile:          'Fertilidad',
  normal:           '',
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets()
  const today = dayjs().format('YYYY-MM-DD')
  const [selectedDate, setSelectedDate] = useState<string | null>(today)
  const [currentMonth, setCurrentMonth] = useState(dayjs())

  const { data, isLoading, isFetching, refetch } = useCalendar(currentMonth.year(), currentMonth.month() + 1)
  const { logs } = useSymptomStore()

  // Build a map of date → icons to show in the cell
  const loggedDates = React.useMemo(() => {
    const map: Record<string, string[]> = {}
    logs.forEach((l) => {
      const icons: string[] = []
      if (l.phase === 'menstrual') icons.push('🩸')
      if (l.mood) icons.push(MOOD_ICONS[l.mood] ?? '😊')
      if (l.symptoms.length > 0) icons.push('💊')
      if (l.sleep) icons.push('😴')
      if (l.water && l.water > 0) icons.push('💧')
      if (l.intimacy) icons.push('❤️')
      if (l.notes && l.notes.trim()) icons.push('📝')
      if (icons.length > 0) map[l.date] = icons.slice(0, 4)
    })
    return map
  }, [logs])

  const days = data?.days as Record<string, { type: string; intensity?: string }> ?? {}

  // Merge API cycle data with local period logs
  const mergedDays = React.useMemo(() => {
    const merged = { ...days }
    Object.entries(loggedDates).forEach(([date, icons]) => {
      if (icons.includes('🩸') && !merged[date]) {
        merged[date] = { type: 'period' }
      }
    })
    return merged
  }, [days, loggedDates])

  const startOfMonth = currentMonth.startOf('month')
  const daysInMonth = currentMonth.daysInMonth()
  const firstDayOfWeek = (startOfMonth.day() + 6) % 7 // Monday = 0

  const calendarCells: Array<{ date: string | null; dayNum: number | null }> = [
    ...Array(firstDayOfWeek).fill({ date: null, dayNum: null }),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const date = currentMonth.date(i + 1).format('YYYY-MM-DD')
      return { date, dayNum: i + 1 }
    }),
  ]
  // Pad to complete last week
  while (calendarCells.length % 7 !== 0) calendarCells.push({ date: null, dayNum: null })
  const calendarWeeks = Array.from({ length: calendarCells.length / 7 }, (_, i) =>
    calendarCells.slice(i * 7, i * 7 + 7)
  )

  const handleDayPress = (date: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedDate(date === selectedDate ? null : date)
  }

  const prevMonth = () => setCurrentMonth((m) => m.subtract(1, 'month'))
  const nextMonth = () => setCurrentMonth((m) => m.add(1, 'month'))

  const selectedDayInfo = selectedDate ? mergedDays[selectedDate] : null
  const isToday = (date: string) => date === today

  // Cycle day number for selected date
  const selectedCycleDay = useMemo(() => {
    if (!selectedDate || !data?.cycles?.length) return null
    const cycle = (data.cycles as Array<{ startDate: string; endDate?: string }>).find((c) =>
      dayjs(selectedDate).isSameOrAfter(dayjs(c.startDate), 'day') &&
      (!c.endDate || dayjs(selectedDate).isSameOrBefore(dayjs(c.endDate), 'day'))
    )
    if (!cycle) return null
    return dayjs(selectedDate).diff(dayjs(cycle.startDate), 'day') + 1
  }, [selectedDate, data?.cycles])

  // Fertility level for selected date
  const fertilityInfo = useMemo(() => {
    if (!selectedDate) return null
    const dayType = mergedDays[selectedDate]?.type || 'normal'
    const isHighFertilityDay = dayType === 'ovulation' || dayType === 'fertile'
    const scores = data?.prediction?.dailyFertilityScores as Record<string, number> | undefined
    const score = scores?.[selectedDate]
    if (score !== undefined) {
      if (score >= 0.65 || isHighFertilityDay) {
        const level = score >= 0.65 ? 'ALTA' : isHighFertilityDay ? 'ALTA' : 'MEDIA'
        return { level: level as 'ALTA', color: '#22c55e', protect: true }
      }
      if (score >= 0.3) return { level: 'MEDIA' as const, color: '#f59e0b', protect: false }
      return { level: 'BAJA' as const, color: '#94a3b8', protect: false }
    }
    return FERTILITY_BY_TYPE[dayType] ?? FERTILITY_BY_TYPE.normal
  }, [selectedDate, mergedDays, data?.prediction])

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ─── Header ────────────────────────────────────────── */}
      <LinearGradient colors={[Colors.dark.surface, Colors.dark.bg]} style={styles.header}>
        <Text style={styles.headerTitle}>Calendario Lunar</Text>

        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Text style={styles.navBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {currentMonth.format('MMMM YYYY')}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Text style={styles.navBtnText}>→</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#a78bfa" colors={['#a78bfa']} />}
      >
        {/* ─── Legend ────────────────────────────────────── */}
        <Animated.View entering={FadeIn} style={styles.legend}>
          {Object.entries(DAY_COLORS).filter(([k]) => k !== 'normal').map(([key, val]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: val.bg, borderColor: val.border }]} />
              <Text style={styles.legendText}>{val.label}</Text>
            </View>
          ))}
          <View style={styles.legendDivider} />
          {[['🩸','Período'],['😊','Humor'],['💊','Síntomas'],['😴','Sueño'],['💧','Agua'],['❤️','Intimidad'],['📝','Nota']].map(([icon, label]) => (
            <View key={icon} style={styles.legendItem}>
              <Text style={styles.legendEmoji}>{icon}</Text>
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ─── Calendar Grid ─────────────────────────────── */}
        <Animated.View entering={FadeInDown} style={styles.calendarCard}>
          {/* Weekday headers */}
          <View style={styles.weekdaysRow}>
            {WEEKDAYS.map((d) => (
              <Text key={d} style={styles.weekday}>{d}</Text>
            ))}
          </View>

          {calendarWeeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((item, di) => {
                if (!item.date) {
                  return <View key={`e-${wi}-${di}`} style={styles.dayCell} />
                }
                const dayType = isLoading ? 'normal' : (mergedDays[item.date]?.type || 'normal')
                const dayStyle = DAY_COLORS[dayType] || DAY_COLORS.normal
                const isSelected = selectedDate === item.date
                const today = isToday(item.date)
                const icons = loggedDates[item.date]
                return (
                  <TouchableOpacity
                    key={item.date}
                    style={[
                      styles.dayCell,
                      { backgroundColor: dayStyle.bg, borderColor: dayStyle.border, borderWidth: dayStyle.border !== 'transparent' ? 1.5 : 0 },
                      today && styles.todayCell,
                      isSelected && styles.selectedCell,
                    ]}
                    onPress={() => handleDayPress(item.date!)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dayNum,
                      today && styles.todayNum,
                      dayType !== 'normal' && styles.markedDayNum,
                    ]}>
                      {item.dayNum}
                    </Text>
                    {icons && icons.length > 0 && (
                      <View style={styles.iconRow}>
                        <Text style={styles.iconText}>{icons.slice(0, 2).join('')}</Text>
                        {icons.length > 2 && (
                          <Text style={styles.iconText}>{icons.slice(2, 4).join('')}</Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          ))}
          {isLoading && (
            <ActivityIndicator color={Colors.lavender[400]} size="small" style={{ marginTop: 8 }} />
          )}
        </Animated.View>

        {/* ─── Selected day info ─────────────────────────── */}
        {selectedDate && (
          <Animated.View entering={FadeInDown} style={styles.selectedInfo}>
            {/* Date + cycle day */}
            <Text style={styles.selectedDateText}>
              {dayjs(selectedDate).format('D MMM YYYY')}
            </Text>
            {(selectedCycleDay || selectedDayInfo) && (
              <Text style={styles.cycleDayText}>
                {selectedCycleDay ? `Día del Ciclo ${selectedCycleDay}` : ''}
                {selectedCycleDay && selectedDayInfo?.type && selectedDayInfo.type !== 'normal' ? ' - ' : ''}
                {selectedDayInfo?.type && selectedDayInfo.type !== 'normal' ? PHASE_LABEL[selectedDayInfo.type] ?? '' : ''}
              </Text>
            )}

            {/* Fertility probability */}
            {fertilityInfo && (
              <View style={[styles.fertilityRow, { borderColor: fertilityInfo.color + '55' }]}>
                <View style={[styles.fertilityBadge, { backgroundColor: fertilityInfo.color + '22' }]}>
                  <Text style={[styles.fertilityLevel, { color: fertilityInfo.color }]}>
                    {fertilityInfo.level}
                  </Text>
                </View>
                <Text style={styles.fertilityDesc}>Posibilidad de quedar embarazada</Text>
              </View>
            )}

            {/* Protection recommendation */}
            {fertilityInfo?.protect && (
              <View style={styles.protectRow}>
                <Text style={styles.protectText}>🛡️ Se recomienda usar protección</Text>
              </View>
            )}

            {/* Intensity if period */}
            {selectedDayInfo?.intensity && (
              <Text style={styles.intensityLabel}>
                Intensidad: {INTENSITY_LABELS[selectedDayInfo.intensity] || selectedDayInfo.intensity}
              </Text>
            )}

            {/* Logged icons summary */}
            {loggedDates[selectedDate] ? (
              <View style={styles.iconSummaryRow}>
                {loggedDates[selectedDate].map((icon, i) => (
                  <View key={i} style={styles.iconChip}>
                    <Text style={styles.iconChipEmoji}>{icon}</Text>
                    <Text style={styles.iconChipLabel}>{ICON_LABELS[icon] ?? ''}</Text>
                  </View>
                ))}
              </View>
            ) : (
              !selectedDayInfo && <Text style={styles.noDayData}>Sin registros para este día</Text>
            )}

            <TouchableOpacity
              style={styles.logDayBtn}
              onPress={() => router.push({ pathname: '/(tabs)/log', params: { date: selectedDate } })}
            >
              <Text style={styles.logDayBtnText}>
                {loggedDates[selectedDate] ? '✏️ Editar registro' : '+ Registrar este día'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ─── Quick stats ───────────────────────────────── */}
        {data?.prediction && (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.predictionBox}>
            <Text style={styles.predictionTitle}>Predicciones del ciclo</Text>
            <View style={styles.predictionRow}>
              <PredictionItem
                emoji="🌑"
                label="Próximo período"
                date={data.prediction.predictedStartDate}
              />
              <PredictionItem
                emoji="🌕"
                label="Ovulación"
                date={data.prediction.ovulationDate}
              />
            </View>
            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>
                Confianza: {Math.round((data.prediction.confidence || 0) * 100)}%
              </Text>
              <View style={styles.confidenceBar}>
                <View style={[styles.confidenceFill, { width: `${(data.prediction.confidence || 0) * 100}%` }]} />
              </View>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

function PredictionItem({ emoji, label, date }: { emoji: string; label: string; date: string }) {
  const daysUntil = dayjs(date).diff(dayjs(), 'day')
  return (
    <View style={styles.predictionItem}>
      <Text style={styles.predictionEmoji}>{emoji}</Text>
      <Text style={styles.predictionLabel}>{label}</Text>
      <Text style={styles.predictionDate}>{dayjs(date).format('D MMM')}</Text>
      <Text style={styles.predictionDays}>
        {daysUntil === 0 ? 'Hoy' : daysUntil > 0 ? `En ${daysUntil}d` : `Hace ${Math.abs(daysUntil)}d`}
      </Text>
    </View>
  )
}

const INTENSITY_LABELS: Record<string, string> = {
  SPOTTING: 'Manchado',
  LIGHT: 'Ligero',
  MEDIUM: 'Moderado',
  HEAVY: 'Abundante',
  VERY_HEAVY: 'Muy abundante',
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    padding: Spacing.sm,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    width: 40,
    alignItems: 'center',
  },
  navBtnText: { color: Colors.lavender[300], fontSize: Typography.fontSize.lg },
  monthLabel: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.text,
    textTransform: 'capitalize',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1 },
  legendEmoji: { fontSize: 11 },
  legendText: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted },
  legendDivider: { width: '100%', height: 1, backgroundColor: Colors.dark.border, marginVertical: 2 },
  calendarCard: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    ...Shadows.md,
  },
  weekdaysRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.muted,
  },
  loadingContainer: { height: 200, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', marginBottom: 2 },
  dayCell: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    margin: 1,
    paddingVertical: 2,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: Colors.gold.main,
  },
  selectedCell: {
    shadowColor: Colors.lavender[400],
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  dayNum: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.dark.text,
  },
  todayNum: { color: Colors.gold.main, fontFamily: Typography.fontFamily.bold },
  markedDayNum: { color: '#fff', fontFamily: Typography.fontFamily.bold },
  iconRow: { alignItems: 'center', marginTop: 1 },
  iconText: { fontSize: 8, lineHeight: 10 },
  selectedInfo: {
    margin: Spacing.md,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  selectedDateText: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.text,
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  cycleDayText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.lavender[300],
    fontFamily: Typography.fontFamily.medium,
    marginBottom: Spacing.sm,
  },
  fertilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: 6,
  },
  fertilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  fertilityLevel: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.bold,
  },
  fertilityDesc: {
    fontSize: Typography.fontSize.sm,
    color: Colors.dark.muted,
    flex: 1,
  },
  protectRow: {
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
  },
  protectText: {
    fontSize: Typography.fontSize.sm,
    color: '#fbbf24',
    fontFamily: Typography.fontFamily.medium,
  },
  selectedDayDetail: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  iconSummaryRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  iconChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.full,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  iconChipEmoji: { fontSize: 14 },
  iconChipLabel: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted },
  selectedDayEmoji: { fontSize: 28 },
  selectedDayLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.lavender[300],
    fontFamily: Typography.fontFamily.medium,
  },
  intensityLabel: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted },
  noDayData: { fontSize: Typography.fontSize.sm, color: Colors.dark.muted, marginBottom: Spacing.sm },
  logDayBtn: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  logDayBtnText: { color: '#fff', fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.base },
  predictionBox: {
    margin: Spacing.md,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  predictionTitle: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.text,
    marginBottom: Spacing.md,
  },
  predictionRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  predictionItem: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  predictionEmoji: { fontSize: 28, marginBottom: 4 },
  predictionLabel: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted, textAlign: 'center' },
  predictionDate: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: Colors.dark.text },
  predictionDays: { fontSize: Typography.fontSize.xs, color: Colors.lavender[300] },
  confidenceRow: { gap: 6 },
  confidenceLabel: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted },
  confidenceBar: {
    height: 6, backgroundColor: Colors.dark.border, borderRadius: BorderRadius.full, overflow: 'hidden',
  },
  confidenceFill: { height: '100%', backgroundColor: Colors.lavender[500], borderRadius: BorderRadius.full },
})
