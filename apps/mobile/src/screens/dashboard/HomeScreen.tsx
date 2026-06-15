import React, { useCallback, useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, RefreshControl, Switch, Image, Share, Alert,
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
import * as Haptics from 'expo-haptics'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import relativeTime from 'dayjs/plugin/relativeTime'

import { useAuthStore, useCycleStore, useGardenStore, useSettingsStore, useSymptomStore } from '@/store'
import { AVATARS } from '@/constants/avatars'
import { useCurrentCycle } from '@/api/hooks/useCycle'
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/theme'
import QuickLogSheet from '@/components/QuickLogSheet'
import { updateWidgetFromCycleData } from '@/utils/widgetBridge'

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
    tips: [
      '🛁 Aplica calor local en el abdomen — reduce cólicos hasta un 40%',
      '🍫 Chocolate negro (70%+) aporta magnesio para aliviar calambres',
      '🐟 Omega-3 del salmón reduce la inflamación menstrual',
      '💊 Ibuprofeno funciona mejor tomado preventivo, antes del dolor',
      '🧘 Yoga restaurativo y posturas de bebé alivian la tensión pélvica',
      '💧 Beber más agua reduce hinchazón y retención de líquidos',
    ],
  },
  follicular: {
    label: 'Fase Folicular',
    description: 'Tu energía aumenta. ¡Es tiempo de nuevos proyectos!',
    gradient: ['#8b5cf6', '#a855f7'] as const,
    emoji: '🌒',
    energy: 'Creciente',
    tips: [
      '🚀 Empieza proyectos nuevos — tu cerebro está en modo creativo',
      '💪 Ideal para entrenamientos de fuerza: tu tolerancia al dolor es mayor',
      '🥦 Come crucíferas (brócoli, col) para equilibrar el estrógeno',
      '🌰 Las semillas de lino apoya la producción hormonal natural',
      '😴 Aprovecha que el sueño es más profundo en esta fase',
      '🤝 Socializa — el estrógeno alto mejora la comunicación y la empatía',
    ],
  },
  ovulatory: {
    label: 'Fase Ovulatoria',
    description: 'Estás en tu pico de energía y fertilidad.',
    gradient: ['#059669', '#10b981'] as const,
    emoji: '🌕',
    energy: 'Alta',
    tips: [
      '🔥 HIIT y ejercicio intenso — tu cuerpo rinde al máximo ahora',
      '🥚 Ventana fértil activa: mayor probabilidad de concepción',
      '🗣️ Reuniones importantes y presentaciones — la comunicación fluye',
      '🍒 Antioxidantes (frutas del bosque) protegen el óvulo',
      '❤️ El deseo sexual aumenta naturalmente — instinto biológico',
      '🥗 Ensaladas con hojas verdes aportan ácido fólico para la fertilidad',
    ],
  },
  luteal: {
    label: 'Fase Lútea',
    description: 'Tu cuerpo se prepara. Atiende tus necesidades.',
    gradient: ['#d97706', '#f59e0b'] as const,
    emoji: '🌗',
    energy: 'Media',
    tips: [
      '🧘 Meditación 10 min/día reduce el cortisol y la ansiedad del SPM',
      '🥑 El aguacate y el potasio reducen retención de líquidos',
      '☕ Reduce la cafeína — empeora ansiedad e insomnio premenstrual',
      '🛁 Baños calientes con sales de magnesio alivian tensión muscular',
      '🍠 Carbohidratos complejos estabilizan el humor y el azúcar en sangre',
      '😴 Acuéstate antes — la progesterona alta aumenta la somnolencia',
    ],
  },
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()
  const cycleStore = useCycleStore()
  const { stage, xp, crystalBalance, currentStreak } = useGardenStore()
  const { ttcMode, setTtcMode, avatarId, avatarUri } = useSettingsStore()
  const currentAvatar = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0]
  const { getTodayLog, getStreak } = useSymptomStore()
  const { data: cycleData, isLoading, refetch } = useCurrentCycle()
  const { updateLog } = useSymptomStore()
  const [quickLogVisible, setQuickLogVisible] = useState(false)
  const [periodStarted, setPeriodStarted] = useState(false)
  const todayLog = getTodayLog()
  const logStreak = getStreak()

  const handlePeriodStart = (intensity: string) => {
    const today = dayjs().format('YYYY-MM-DD')
    updateLog(today, 'menstrual', {
      phase: 'menstrual',
      flowIntensity: intensity,
      mood: todayLog?.mood ?? null,
      energy: todayLog?.energy ?? null,
      symptoms: todayLog?.symptoms ?? [],
    } as any)
    cycleStore.setCurrentCycle({ currentPhase: 'menstrual', isInPeriod: true })
    setPeriodStarted(true)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }

  const phase = cycleStore.currentPhase || 'follicular'
  const phaseInfo = PHASE_INFO[phase]
  const hasNoCycleData = !isLoading && !cycleStore.currentPhase

  const daysUntilPeriod = cycleStore.nextPeriodDate
    ? dayjs(cycleStore.nextPeriodDate).diff(dayjs(), 'day')
    : null

  useEffect(() => {
    if (cycleStore.dayOfCycle) {
      updateWidgetFromCycleData({
        phase,
        dayOfCycle: cycleStore.dayOfCycle,
        cycleLength: cycleData?.cycleLength ?? 28,
      })
    }
  }, [phase, cycleStore.dayOfCycle, cycleData])

  const handleShareCycle = async () => {
    const phaseLabels: Record<string, string> = {
      menstrual: 'Menstrual 🌑', follicular: 'Folicular 🌒',
      ovulatory: 'Ovulatoria 🌕', luteal: 'Lútea 🌗',
    }
    const phaseText = phaseLabels[phase] ?? phase
    const dayText = cycleStore.dayOfCycle ? `Día ${cycleStore.dayOfCycle}` : ''
    const periodText = daysUntilPeriod !== null
      ? (daysUntilPeriod === 0 ? 'mi período es hoy' : `mi período llega en ${daysUntilPeriod} días`)
      : ''

    const message = [
      `🌙 Estoy en la fase ${phaseText} de mi ciclo lunar${dayText ? ` · ${dayText}` : ''}`,
      periodText ? `📅 ${periodText.charAt(0).toUpperCase() + periodText.slice(1)}` : '',
      `🔥 Racha de ${currentStreak} días registrando`,
      '',
      'Hago seguimiento de mi salud femenina con Lunara ✨',
      '#Lunara #SaludFemenina #CicloMenstrual',
    ].filter(Boolean).join('\n')

    try {
      await Share.share({ message })
    } catch {
      Alert.alert('No se pudo compartir')
    }
  }

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
        <Animated.View entering={FadeInDown.delay(0)} style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting()}, {user?.profile?.firstName || 'Luna'} ✨</Text>
            <Text style={styles.date}>{dayjs().format('dddd, D [de] MMMM')}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.avatarBtn} activeOpacity={0.8}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarPhoto} />
            ) : (
              <LinearGradient colors={currentAvatar.gradient} style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>{currentAvatar.emoji}</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Phase Card — or Setup Banner when no cycle data */}
        {hasNoCycleData ? (
          <Animated.View entering={FadeInDown.delay(100)} style={styles.setupCard}>
            <Text style={styles.setupEmoji}>🌙</Text>
            <Text style={styles.setupTitle}>¡Comienza tu seguimiento!</Text>
            <Text style={styles.setupSubtitle}>
              Registra tu primer período para que Luna pueda predecir tu ciclo y darte consejos personalizados.
            </Text>
            <TouchableOpacity
              style={styles.setupBtn}
              onPress={() => router.push('/(tabs)/log')}
              activeOpacity={0.85}
            >
              <Text style={styles.setupBtnText}>Registrar mi período ahora →</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
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
        )}

        {/* Quick stats row */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.statsRow}>
          {hasNoCycleData ? (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>🌱</Text>
                <Text style={styles.statLabel}>Sin datos aún</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0🔥</Text>
                <Text style={styles.statLabel}>Racha</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{crystalBalance}💎</Text>
                <Text style={styles.statLabel}>Cristales</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {daysUntilPeriod !== null ? (daysUntilPeriod === 0 ? 'Hoy' : `${daysUntilPeriod}d`) : '--'}
                </Text>
                <Text style={styles.statLabel}>Próx. período</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{logStreak > 0 ? logStreak : currentStreak}🔥</Text>
                <Text style={styles.statLabel}>Racha</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{crystalBalance}💎</Text>
                <Text style={styles.statLabel}>Cristales</Text>
              </View>
            </>
          )}
        </Animated.View>
      </LinearGradient>

      {/* ─── Quick Log (registro rápido del día) ──────────── */}
      <Animated.View entering={FadeInDown.delay(250)} style={styles.section}>
        <TouchableOpacity
          style={[styles.quickLogBtn, todayLog && styles.quickLogBtnDone]}
          onPress={() => setQuickLogVisible(true)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={todayLog ? ['#10b981', '#059669'] : [Colors.primary[700], Colors.primary[500]]}
            style={styles.quickLogGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <View style={styles.quickLogContent}>
              <Text style={styles.quickLogEmoji}>{todayLog ? '✅' : '📝'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickLogTitle}>
                  {todayLog ? 'Registro de hoy completo' : 'Registra cómo estás hoy'}
                </Text>
                <Text style={styles.quickLogSub}>
                  {todayLog
                    ? `${todayLog.mood ?? ''} ${todayLog.energy ? `· Energía ${todayLog.energy}` : ''} ${todayLog.symptoms.length > 0 ? `· ${todayLog.symptoms.length} síntoma${todayLog.symptoms.length > 1 ? 's' : ''}` : ''}`
                    : 'Ánimo, energía y síntomas en 10 segundos · +10 XP'}
                </Text>
              </View>
              <Text style={styles.quickLogArrow}>{todayLog ? '✏️' : '→'}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* ─── Period Start Card ─────────────────────────────── */}
      {!hasNoCycleData && phase !== 'menstrual' && !cycleStore.isInPeriod && !periodStarted && (
        <Animated.View entering={FadeInDown.delay(255)} style={styles.section}>
          <LinearGradient
            colors={['rgba(190,24,93,0.2)', 'rgba(244,63,94,0.12)']}
            style={styles.periodStartCard}
          >
            <View style={styles.periodStartHeader}>
              <Text style={styles.periodStartEmoji}>🩸</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.periodStartTitle}>¿Empezó tu período hoy?</Text>
                <Text style={styles.periodStartSub}>Regístralo en un toque</Text>
              </View>
            </View>
            <View style={styles.periodStartBtns}>
              {[
                { key: 'spotting', label: 'Manchado', color: '#fca5a5' },
                { key: 'light',    label: 'Ligero',   color: '#f87171' },
                { key: 'medium',   label: 'Moderado', color: '#ef4444' },
                { key: 'heavy',    label: 'Abundante', color: '#b91c1c' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.periodStartBtn, { borderColor: opt.color + '80' }]}
                  onPress={() => handlePeriodStart(opt.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.periodStartBtnText, { color: opt.color }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {periodStarted && (
        <Animated.View entering={FadeInDown} style={styles.section}>
          <LinearGradient
            colors={['rgba(190,24,93,0.25)', 'rgba(244,63,94,0.15)']}
            style={[styles.periodStartCard, { alignItems: 'center' }]}
          >
            <Text style={{ fontSize: 28 }}>❤️</Text>
            <Text style={styles.periodStartTitle}>¡Período registrado!</Text>
            <Text style={styles.periodStartSub}>Cuídate mucho hoy 🌙</Text>
          </LinearGradient>
        </Animated.View>
      )}

      {/* ─── Streak Banner ─────────────────────────────────── */}
      {logStreak >= 3 && (
        <Animated.View entering={FadeInDown.delay(265)} style={styles.section}>
          <LinearGradient
            colors={['rgba(251,191,36,0.25)', 'rgba(245,158,11,0.15)']}
            style={styles.streakBanner}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.streakFire}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakTitle}>¡{logStreak} días seguidos!</Text>
              <Text style={styles.streakSub}>
                {logStreak >= 30 ? '¡Increíble! Un mes registrando 🏆' :
                 logStreak >= 14 ? '¡Dos semanas seguidas! Sigue así 💪' :
                 logStreak >= 7 ? '¡Una semana! Tu jardín florece 🌸' :
                 'Tu racha crece — ¡no la rompas! ✨'}
              </Text>
            </View>
            <Text style={styles.streakXp}>+{logStreak * 2} XP</Text>
          </LinearGradient>
        </Animated.View>
      )}

      {/* ─── Garden / XP Progress ─────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(272)} style={styles.section}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/garden')} activeOpacity={0.85}>
          <LinearGradient
            colors={['rgba(139,92,246,0.2)', 'rgba(168,85,247,0.12)']}
            style={styles.gardenCard}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.gardenStageEmoji}>
              {stage === 'SEED' ? '🌱' : stage === 'SPROUT' ? '🌿' : stage === 'FLOWER' ? '🌸' : '🌕'}
            </Text>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.gardenTitleRow}>
                <Text style={styles.gardenTitle}>{GARDEN_LABELS[stage]}</Text>
                <Text style={styles.gardenXp}>Nivel {Math.floor(xp / 200) + 1} · {xp} XP</Text>
              </View>
              <View style={styles.xpBarBg}>
                <LinearGradient
                  colors={[Colors.primary[500], Colors.lavender[400]]}
                  style={[styles.xpBarFill, { width: `${Math.min(100, (xp % 200) / 2)}%` }]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={styles.gardenSub}>{200 - (xp % 200)} XP para el siguiente nivel · {crystalBalance} 💎</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* ─── PDF Quick CTA ─────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(276)} style={styles.section}>
        <TouchableOpacity onPress={() => router.push('/insights/pdf-report')} activeOpacity={0.85}>
          <LinearGradient
            colors={['rgba(99,102,241,0.18)', 'rgba(139,92,246,0.1)']}
            style={styles.pdfCard}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.pdfEmoji}>📄</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.pdfTitle}>Reporte para tu ginecóloga</Text>
              <Text style={styles.pdfSub}>PDF con síntomas, sueño, BBT y más · Gratis</Text>
            </View>
            <Text style={styles.pdfArrow}>→</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* ─── Share card ────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(280)} style={styles.section}>
        <TouchableOpacity onPress={handleShareCycle} activeOpacity={0.85}>
          <LinearGradient
            colors={['rgba(139,92,246,0.25)', 'rgba(219,39,119,0.2)']}
            style={styles.shareCard}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.shareEmoji}>🌙</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.shareTitle}>Comparte tu ciclo</Text>
              <Text style={styles.shareSub}>Fase {phaseInfo.label} · Día {cycleStore.dayOfCycle ?? '—'}</Text>
            </View>
            <Text style={styles.shareArrow}>↗</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* ─── Quick Actions ─────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        <View style={styles.actionsGrid}>
          <QuickAction
            emoji="🌙"
            label="Registrar período"
            onPress={() => router.push('/(tabs)/log')}
            color={Colors.primary[500]}
          />
          <QuickAction
            emoji="🌍"
            label="Comunidad"
            onPress={() => router.push('/community')}
            color={Colors.gold.main}
          />
          <QuickAction
            emoji="🤖"
            label="Chat IA Luna"
            onPress={() => router.push('/ai-chat')}
            color={Colors.lavender[500]}
          />
          <QuickAction
            emoji="📊"
            label="Mis patrones"
            onPress={() => router.push('/(tabs)/insights')}
            color={Colors.rose[500]}
          />
          <QuickAction
            emoji="🏃‍♀️"
            label="Health Connect"
            onPress={() => router.push('/health/health-connect')}
            color="#10b981"
          />
        </View>
      </Animated.View>

      {/* ─── TTC Mode ──────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(350)} style={styles.section}>
        <View style={styles.ttcCard}>
          <LinearGradient
            colors={ttcMode ? ['#059669', '#10b981'] : [Colors.dark.card, Colors.dark.card]}
            style={styles.ttcGradient}
          >
            <View style={styles.ttcHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ttcTitle}>🥚 Modo Búsqueda de Embarazo</Text>
                <Text style={styles.ttcSub}>
                  {ttcMode
                    ? 'Activo · Registra temperatura basal y moco cervical'
                    : 'Activa para seguimiento de fertilidad avanzado'}
                </Text>
              </View>
              <Switch
                value={ttcMode}
                onValueChange={setTtcMode}
                trackColor={{ false: Colors.dark.border, true: Colors.success + '80' }}
                thumbColor={ttcMode ? Colors.success : Colors.dark.muted}
              />
            </View>
            {ttcMode && (
              <View style={styles.ttcInfo}>
                {cycleStore.fertileWindowStart && (
                  <View style={styles.ttcRow}>
                    <Text style={styles.ttcRowIcon}>🌟</Text>
                    <Text style={styles.ttcRowText}>
                      Ventana fértil: {dayjs(cycleStore.fertileWindowStart).format('D MMM')} – {dayjs(cycleStore.fertileWindowEnd).format('D MMM')}
                    </Text>
                  </View>
                )}
                {cycleStore.nextOvulationDate && (
                  <View style={styles.ttcRow}>
                    <Text style={styles.ttcRowIcon}>🥚</Text>
                    <Text style={styles.ttcRowText}>
                      Ovulación estimada: {dayjs(cycleStore.nextOvulationDate).format('D [de] MMMM')}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.ttcLogBtn}
                  onPress={() => router.push('/(tabs)/log')}
                >
                  <Text style={styles.ttcLogBtnText}>Registrar temperatura y moco →</Text>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
        </View>
      </Animated.View>

      {/* ─── Phase Tips ────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
        <View style={styles.tipsSectionHeader}>
          <Text style={styles.sectionTitle}>Consejos para hoy</Text>
          <TouchableOpacity onPress={() => router.push('/health/phase-tips')} activeOpacity={0.7}>
            <Text style={styles.tipsMoreBtn}>Ver recetas y ejercicio →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tipsCard}>
          <Text style={styles.energyBadge}>Energía {phaseInfo.energy}</Text>
          {phaseInfo.tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* ─── Lunar Garden Preview ──────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(500)} style={styles.section}>
        <TouchableOpacity
          style={styles.gardenPreviewCard}
          onPress={() => router.push('/(tabs)/garden')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#4c1d95', '#7c3aed']}
            style={styles.gardenGradient}
          >
            <Text style={styles.gardenPreviewTitle}>Jardín Lunar</Text>
            <Text style={styles.gardenStage}>{GARDEN_LABELS[stage]}</Text>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${Math.min((xp % 100) / 100 * 100, 100)}%` }]} />
            </View>
            <Text style={styles.gardenXP}>{xp} XP</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* ─── Getting Started Guide (no cycle data) ────────── */}
      {hasNoCycleData && (
        <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>¿Cómo empezar?</Text>
          <View style={styles.tipsCard}>
            {[
              ['1️⃣', 'Registra cuándo empezó tu último período'],
              ['2️⃣', 'Anota síntomas diarios para que Luna aprenda tu ciclo'],
              ['3️⃣', 'Luna predecirá tu próximo período en pocos días'],
              ['4️⃣', 'Gana XP y cristales con cada registro'],
            ].map(([num, text]) => (
              <View key={text} style={styles.tipRow}>
                <Text style={styles.tipText}>{num}  {text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* ─── Fertility Forecast ────────────────────────────── */}
      {cycleStore.fertileWindowStart && !ttcMode && (
        <Animated.View entering={FadeInDown.delay(600)} style={styles.section}>
          <Text style={styles.sectionTitle}>Ventana fértil</Text>
          <View style={styles.fertilityCard}>
            <Text style={styles.fertilityEmoji}>🥚</Text>
            <View>
              <Text style={styles.fertilityText}>
                {dayjs(cycleStore.fertileWindowStart).format('D MMM')} –{' '}
                {dayjs(cycleStore.fertileWindowEnd).format('D MMM')}
              </Text>
              <Text style={styles.fertilityMuted}>
                Ovulación: {dayjs(cycleStore.nextOvulationDate).format('D [de] MMMM')}
              </Text>
              <Text style={styles.confidenceText}>
                Confianza: {cycleStore.predictionConfidence}%
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      <QuickLogSheet visible={quickLogVisible} onClose={() => setQuickLogVisible(false)} />
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
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarBtn: { marginLeft: Spacing.sm },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarPhoto: { width: 40, height: 40, borderRadius: 20 },
  avatarEmoji: { fontSize: 20 },
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
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionCard: {
    width: (width - Spacing.md * 2 - Spacing.sm * 2) / 3,
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
  tipsSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  tipsMoreBtn: {
    fontSize: Typography.fontSize.xs, color: Colors.lavender[400],
    fontFamily: Typography.fontFamily.medium,
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
    marginTop: 8,
  },
  tipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.dark.text,
    fontFamily: Typography.fontFamily.regular,
    lineHeight: 20,
  },
  gardenGradient: {
    padding: Spacing.xl,
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
  // Setup card (no cycle data state)
  setupCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    gap: 8,
  },
  setupEmoji: { fontSize: 40 },
  setupTitle: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.bold,
    color: '#fff',
    textAlign: 'center',
  },
  setupSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 20,
  },
  setupBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  setupBtnText: {
    color: '#fff',
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.bold,
  },
  // Quick log
  quickLogBtn: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.md,
  },
  quickLogBtnDone: {},
  quickLogGradient: { borderRadius: BorderRadius.xl },
  quickLogContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  quickLogEmoji: { fontSize: 28 },
  quickLogTitle: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.bold,
    color: '#fff',
  },
  quickLogSub: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  quickLogArrow: { fontSize: 18, color: 'rgba(255,255,255,0.8)' },
  // TTC
  ttcCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadows.md },
  ttcGradient: { padding: Spacing.md, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.dark.border },
  ttcHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ttcTitle: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.text,
  },
  ttcSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.dark.muted,
    marginTop: 2,
  },
  ttcInfo: { marginTop: Spacing.md, gap: Spacing.sm },
  ttcRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ttcRowIcon: { fontSize: 16 },
  ttcRowText: { fontSize: Typography.fontSize.sm, color: '#fff', flex: 1 },
  ttcLogBtn: {
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  ttcLogBtnText: {
    color: '#fff',
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.bold,
  },
  shareCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)',
  },
  shareEmoji: { fontSize: 28 },
  shareTitle: {
    fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold,
    color: '#fff',
  },
  shareSub: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  shareArrow: { fontSize: 20, color: Colors.lavender[400] },
  periodStartCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)', gap: Spacing.md,
  },
  periodStartHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  periodStartEmoji: { fontSize: 28 },
  periodStartTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#fda4af' },
  periodStartSub: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  periodStartBtns: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  periodStartBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: BorderRadius.xl, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  periodStartBtnText: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium },
  streakBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)',
  },
  streakFire: { fontSize: 32 },
  streakTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#fde68a' },
  streakSub: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  streakXp: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold, color: '#fbbf24' },
  // Garden card (XP progress row)
  gardenCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)',
  },
  gardenStageEmoji: { fontSize: 32 },
  gardenTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gardenTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#c4b5fd' },
  gardenXp: { fontSize: Typography.fontSize.xs, color: Colors.lavender[400] },
  // Garden preview card (full banner at bottom)
  gardenPreviewCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  gardenPreviewTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
  },
  xpBarBg: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.full, overflow: 'hidden',
  },
  xpBarFill: { height: '100%', borderRadius: BorderRadius.full },
  gardenSub: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  // PDF card
  pdfCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
  },
  pdfEmoji: { fontSize: 26 },
  pdfTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#e0e7ff' },
  pdfSub: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  pdfArrow: { fontSize: 18, color: '#818cf8' },
})
