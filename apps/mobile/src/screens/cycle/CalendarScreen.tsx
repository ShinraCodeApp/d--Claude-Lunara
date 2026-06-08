import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import weekday from 'dayjs/plugin/weekday'
import isBetween from 'dayjs/plugin/isBetween'
import { router } from 'expo-router'

import { useCalendar } from '@/api/hooks/useCycle'
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/theme'

dayjs.extend(weekday)
dayjs.extend(isBetween)
dayjs.locale('es')

const { width } = Dimensions.get('window')
const DAY_SIZE = (width - Spacing.md * 2 - Spacing.sm * 6) / 7

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const DAY_COLORS: Record<string, { bg: string; border: string; label: string; emoji: string }> = {
  period: { bg: Colors.rose[500] + 'CC', border: Colors.rose[500], label: 'Menstruación', emoji: '🌑' },
  predicted_period: { bg: Colors.primary[500] + '40', border: Colors.primary[400], label: 'Período predicho', emoji: '🌒' },
  ovulation: { bg: Colors.success + 'CC', border: Colors.success, label: 'Ovulación', emoji: '🌕' },
  fertile: { bg: Colors.success + '40', border: Colors.success, label: 'Fértil', emoji: '🌿' },
  normal: { bg: 'transparent', border: 'transparent', label: '', emoji: '' },
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(dayjs())

  const { data, isLoading } = useCalendar(currentMonth.year(), currentMonth.month() + 1)

  const days = data?.days as Record<string, { type: string; intensity?: string }> ?? {}

  const startOfMonth = currentMonth.startOf('month')
  const daysInMonth = currentMonth.daysInMonth()
  const firstDayOfWeek = (startOfMonth.day() + 6) % 7 // Monday = 0

  const calendarDays: Array<{ date: string | null; dayNum: number | null }> = [
    ...Array(firstDayOfWeek).fill({ date: null, dayNum: null }),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const date = currentMonth.date(i + 1).format('YYYY-MM-DD')
      return { date, dayNum: i + 1 }
    }),
  ]

  const handleDayPress = (date: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedDate(date === selectedDate ? null : date)
  }

  const prevMonth = () => setCurrentMonth((m) => m.subtract(1, 'month'))
  const nextMonth = () => setCurrentMonth((m) => m.add(1, 'month'))

  const selectedDayInfo = selectedDate ? days[selectedDate] : null
  const isToday = (date: string) => date === dayjs().format('YYYY-MM-DD')

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

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ─── Legend ────────────────────────────────────── */}
        <Animated.View entering={FadeIn} style={styles.legend}>
          {Object.entries(DAY_COLORS).filter(([k]) => k !== 'normal').map(([key, val]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: val.bg, borderColor: val.border }]} />
              <Text style={styles.legendText}>{val.label}</Text>
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

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.lavender[400]} size="large" />
            </View>
          ) : (
            <View style={styles.daysGrid}>
              {calendarDays.map((item, i) => {
                if (!item.date) {
                  return <View key={`empty-${i}`} style={styles.dayCell} />
                }

                const dayType = days[item.date]?.type || 'normal'
                const dayStyle = DAY_COLORS[dayType] || DAY_COLORS.normal
                const isSelected = selectedDate === item.date
                const today = isToday(item.date)

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
                    {dayType !== 'normal' && (
                      <Text style={styles.dayEmoji}>{dayStyle.emoji}</Text>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </Animated.View>

        {/* ─── Selected day info ─────────────────────────── */}
        {selectedDate && (
          <Animated.View entering={FadeInDown} style={styles.selectedInfo}>
            <Text style={styles.selectedDateText}>
              {dayjs(selectedDate).format('dddd, D [de] MMMM')}
            </Text>
            {selectedDayInfo ? (
              <View style={styles.selectedDayDetail}>
                <Text style={styles.selectedDayEmoji}>
                  {DAY_COLORS[selectedDayInfo.type]?.emoji || '📅'}
                </Text>
                <Text style={styles.selectedDayLabel}>
                  {DAY_COLORS[selectedDayInfo.type]?.label || 'Sin datos'}
                </Text>
                {selectedDayInfo.intensity && (
                  <Text style={styles.intensityLabel}>
                    Intensidad: {INTENSITY_LABELS[selectedDayInfo.intensity] || selectedDayInfo.intensity}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.noDayData}>Sin registros para este día</Text>
            )}

            <TouchableOpacity
              style={styles.logDayBtn}
              onPress={() => router.push({ pathname: '/cycle/log', params: { date: selectedDate } })}
            >
              <Text style={styles.logDayBtnText}>+ Registrar este día</Text>
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
  legendText: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted },
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
    width: DAY_SIZE,
    textAlign: 'center',
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.muted,
  },
  loadingContainer: { height: 200, alignItems: 'center', justifyContent: 'center' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm / 2 },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    margin: 1,
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
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.dark.text,
  },
  todayNum: { color: Colors.gold.main, fontFamily: Typography.fontFamily.bold },
  markedDayNum: { color: '#fff', fontFamily: Typography.fontFamily.bold },
  dayEmoji: { fontSize: 8, marginTop: -2 },
  selectedInfo: {
    margin: Spacing.md,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  selectedDateText: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.text,
    textTransform: 'capitalize',
    marginBottom: Spacing.sm,
  },
  selectedDayDetail: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
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
