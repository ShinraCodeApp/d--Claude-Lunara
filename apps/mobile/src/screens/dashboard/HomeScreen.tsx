import React, { useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import relativeTime from 'dayjs/plugin/relativeTime'

import { useAuthStore, useCycleStore, useGardenStore } from '@/store'
import { useCurrentCycle } from '@/api/hooks/useCycle'
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/theme'

dayjs.extend(relativeTime)
dayjs.locale('es')

const { width } = Dimensions.get('window')

const PHASE_INFO = {
  menstrual: {
    label: 'Fase Menstrual',
    description: 'Tu cuerpo se renueva. Descansa y cuídate.',
    gradient: ['#7c3aed', '#db2777'] as const,
    emoji: '🌑',
    energy: 'Baja',
    tips: ['Descansa más', 'Aplica calor local', 'Evita alimentos inflamatorios'],
  },
  follicular: {
    label: 'Fase Folicular',
    description: 'Tu energía aumenta. ¡Es tiempo de nuevos proyectos!',
    gradient: ['#8b5cf6', '#a855f7'] as const,
    emoji: '🌒',
    energy: 'Creciente',
    tips: ['Comienza nuevos proyectos', 'Ejercicio moderado', 'Socializa'],
  },
  ovulatory: {
    label: 'Fase Ovulatoria',
    description: 'Estás en tu pico de energía y fertilidad.',
    gradient: ['#059669', '#10b981'] as const,
    emoji: '🌕',
    energy: 'Alta',
    tips: ['Reuniones importantes', 'Ejercicio intenso', 'Ventana fértil activa'],
  },
  luteal: {
    label: 'Fase Lútea',
    description: 'Tu cuerpo se prepara. Atiende tus necesidades.',
    gradient: ['#d97706', '#f59e0b'] as const,
    emoji: '🌗',
    energy: 'Media',
    tips: ['Prioriza el autocuidado', 'Meditación', 'Dieta antiinflamatoria'],
  },
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()
  const cycleStore = useCycleStore()
  const { stage, xp, crystalBalance, currentStreak } = useGardenStore()
  const { data: cycleData, isLoading, refetch } = useCurrentCycle()

  const phase = cycleStore.currentPhase || 'follicular'
  const phaseInfo = PHASE_INFO[phase]

  const daysUntilPeriod = cycleStore.nextPeriodDate
    ? dayjs(cycleStore.nextPeriodDate).diff(dayjs(), 'day')
    : null

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const GARDEN_LABELS = {
    SEED: '🌱 Semilla',
    SPROUT: '🌿 Brote',
    FLOWER: '🌸 Flor',
    LUNAR_GARDEN: '🌕 Jardín Lunar',
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.lavender[400]} />
      }
    >
      {/* ─── Header ────────────────────────────────────────── */}
      <LinearGradient
        colors={phaseInfo.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        {/* Greeting */}
        <Animated.View entering={FadeInDown.delay(0)}>
          <Text style={styles.greeting}>{greeting()}, {user?.profile?.firstName || 'Luna'} ✨</Text>
          <Text style={styles.date}>{dayjs().format('dddd, D [de] MMMM')}</Text>
        </Animated.View>

        {/* Phase Card */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.phaseCard}>
          <View style={styles.phaseHeader}>
            <Text style={styles.phaseEmoji}>{phaseInfo.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.phaseLabel}>{phaseInfo.label}</Text>
              <Text style={styles.phaseDescription}>{phaseInfo.description}</Text>
            </View>
          </View>

          {/* Cycle day indicator */}
          {cycleStore.dayOfCycle && (
            <View style={styles.cycleDayBadge}>
              <Text style={styles.cycleDayText}>Día {cycleStore.dayOfCycle} del ciclo</Text>
            </View>
          )}
        </Animated.View>

        {/* Quick stats row */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {daysUntilPeriod !== null ? (daysUntilPeriod === 0 ? 'Hoy' : `${daysUntilPeriod}d`) : '--'}
            </Text>
            <Text style={styles.statLabel}>Próx. período</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{currentStreak}🔥</Text>
            <Text style={styles.statLabel}>Racha</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{crystalBalance}💎</Text>
            <Text style={styles.statLabel}>Cristales</Text>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* ─── Quick Actions ─────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        <View style={styles.actionsGrid}>
          <QuickAction
            emoji="🌙"
            label="Registrar período"
            onPress={() => router.push('/cycle/log')}
            color={Colors.primary[500]}
          />
          <QuickAction
            emoji="😊"
            label="Estado de ánimo"
            onPress={() => router.push('/cycle/mood')}
            color={Colors.rose[500]}
          />
          <QuickAction
            emoji="🌡️"
            label="Síntomas"
            onPress={() => router.push('/cycle/symptoms')}
            color={Colors.gold.main}
          />
          <QuickAction
            emoji="🤖"
            label="Chat IA Luna"
            onPress={() => router.push('/ai-chat')}
            color={Colors.lavender[500]}
          />
        </View>
      </Animated.View>

      {/* ─── Phase Tips ────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
        <Text style={styles.sectionTitle}>Consejos para hoy</Text>
        <View style={styles.tipsCard}>
          <Text style={styles.energyBadge}>Energía {phaseInfo.energy}</Text>
          {phaseInfo.tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipDot}>✦</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* ─── Lunar Garden Preview ──────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(500)} style={styles.section}>
        <TouchableOpacity
          style={styles.gardenCard}
          onPress={() => router.push('/garden')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#4c1d95', '#7c3aed']}
            style={styles.gardenGradient}
          >
            <Text style={styles.gardenTitle}>Jardín Lunar</Text>
            <Text style={styles.gardenStage}>{GARDEN_LABELS[stage]}</Text>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${Math.min((xp % 100) / 100 * 100, 100)}%` }]} />
            </View>
            <Text style={styles.gardenXP}>{xp} XP</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* ─── Fertility Forecast ────────────────────────────── */}
      {cycleStore.fertilityWindowStart && (
        <Animated.View entering={FadeInDown.delay(600)} style={styles.section}>
          <Text style={styles.sectionTitle}>Ventana fértil</Text>
          <View style={styles.fertilityCard}>
            <Text style={styles.fertilityEmoji}>🥚</Text>
            <View>
              <Text style={styles.fertilityText}>
                {dayjs(cycleStore.fertilityWindowStart).format('D MMM')} –{' '}
                {dayjs(cycleStore.fertilityWindowEnd).format('D MMM')}
              </Text>
              <Text style={styles.fertilityMuted}>
                Ovulación: {dayjs(cycleStore.nextOvulationDate).format('D [de] MMMM')}
              </Text>
              <Text style={styles.confidenceText}>
                Confianza: {Math.round((cycleStore.predictionConfidence || 0) * 100)}%
              </Text>
            </View>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  )
}

function QuickAction({
  emoji, label, onPress, color,
}: { emoji: string; label: string; onPress: () => void; color: string }) {
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <TouchableOpacity
      onPressIn={() => { scale.value = withSpring(0.95) }}
      onPressOut={() => { scale.value = withSpring(1) }}
      onPress={onPress}
      activeOpacity={1}
    >
      <Animated.View style={[styles.actionCard, animStyle, { borderColor: color + '40' }]}>
        <Text style={styles.actionEmoji}>{emoji}</Text>
        <Text style={styles.actionLabel}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
  },
  greeting: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.bold,
    color: '#fff',
    marginBottom: 2,
  },
  date: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'capitalize',
    marginBottom: Spacing.md,
  },
  phaseCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  phaseEmoji: {
    fontSize: 32,
  },
  phaseLabel: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
    color: '#fff',
  },
  phaseDescription: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  cycleDayBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginTop: Spacing.sm,
  },
  cycleDayText: {
    color: '#fff',
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.bold,
    color: '#fff',
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: 4,
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.text,
    marginBottom: Spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionCard: {
    width: (width - Spacing.md * 2 - Spacing.sm * 3) / 4,
    aspectRatio: 0.9,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 4,
    ...Shadows.sm,
  },
  actionEmoji: { fontSize: 24 },
  actionLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.dark.text,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.medium,
  },
  tipsCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.md,
  },
  energyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary[600] + '40',
    color: Colors.lavender[300],
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 8,
  },
  tipDot: { color: Colors.lavender[400], fontSize: 10 },
  tipText: {
    fontSize: Typography.fontSize.base,
    color: Colors.dark.text,
    fontFamily: Typography.fontFamily.regular,
    flex: 1,
  },
  gardenCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  gardenGradient: {
    padding: Spacing.xl,
  },
  gardenTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
  },
  gardenStage: {
    color: '#fff',
    fontSize: Typography.fontSize['2xl'],
    fontFamily: Typography.fontFamily.bold,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  xpBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: 8,
  },
  xpFill: {
    height: '100%',
    backgroundColor: Colors.gold.medium,
    borderRadius: BorderRadius.full,
  },
  gardenXP: {
    color: Colors.gold.medium,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
  },
  fertilityCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.md,
  },
  fertilityEmoji: { fontSize: 32 },
  fertilityText: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.text,
  },
  fertilityMuted: {
    fontSize: Typography.fontSize.sm,
    color: Colors.dark.muted,
    marginTop: 2,
  },
  confidenceText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.lavender[400],
    marginTop: 4,
  },
})
