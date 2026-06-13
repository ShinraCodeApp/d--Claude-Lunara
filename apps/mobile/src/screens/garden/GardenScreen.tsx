import React, { useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  useAnimatedStyle, useSharedValue, withRepeat,
  withSequence, withTiming, FadeInDown, ZoomIn, Easing,
} from 'react-native-reanimated'
import { useQuery, useMutation } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'

import apiClient from '@/api/client'
import { useGardenStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/theme'

const { width } = Dimensions.get('window')

const GARDEN_STAGES = {
  SEED: {
    emoji: '🌱',
    name: 'Semilla',
    description: 'Tu jardín está comenzando a despertar...',
    bgColors: ['#1a0533', '#0d3320'] as const,
    nextXP: 100,
    unlocks: ['Primera planta', 'Decoración básica'],
  },
  SPROUT: {
    emoji: '🌿',
    name: 'Brote',
    description: 'Tu dedicación hace crecer tu jardín',
    bgColors: ['#1a0533', '#1a3300'] as const,
    nextXP: 300,
    unlocks: ['Flores de luna', 'Mascota activa', 'Fondos premium'],
  },
  FLOWER: {
    emoji: '🌸',
    name: 'Flor',
    description: 'Tu jardín florece con tu constancia',
    bgColors: ['#2d0145', '#450130'] as const,
    nextXP: 600,
    unlocks: ['Jardín animado', 'Cristales x2', 'Accesorios especiales'],
  },
  LUNAR_GARDEN: {
    emoji: '🌕',
    name: 'Jardín Lunar',
    description: '¡Has alcanzado el máximo! Tu jardín brilla bajo la luna',
    bgColors: ['#2d0145', '#0d1a45'] as const,
    nextXP: null,
    unlocks: ['Todo desbloqueado', 'Insignia exclusiva', 'Luna mística'],
  },
}

const SHOP_ITEMS = [
  { id: 'theme_luna', name: 'Tema Luna', emoji: '🌙', cost: 50, type: 'theme' },
  { id: 'theme_aurora', name: 'Tema Aurora', emoji: '🌌', cost: 80, type: 'theme' },
  { id: 'deco_starflower', name: 'Estrella Flor', emoji: '⭐', cost: 30, type: 'decoration' },
  { id: 'deco_mooncrystal', name: 'Cristal Lunar', emoji: '💎', cost: 40, type: 'decoration' },
  { id: 'avatar_moon', name: 'Avatar Luna', emoji: '🌕', cost: 60, type: 'avatar' },
  { id: 'accessory_crown', name: 'Corona para Luna', emoji: '👑', cost: 45, type: 'mascot_accessory' },
]

export default function GardenScreen() {
  const insets = useSafeAreaInsets()
  const { stage, xp, level, crystalBalance, setGarden, spendCrystals, earnCrystals } = useGardenStore()
  const stageInfo = GARDEN_STAGES[stage]
  const [purchasedItems, setPurchasedItems] = React.useState<Set<string>>(new Set())

  // Floating animation for garden emoji
  const floatY = useSharedValue(0)
  const glowOpacity = useSharedValue(0.5)
  const crystalScale = useSharedValue(1)

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    )
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500 }),
        withTiming(0.3, { duration: 2500 })
      ),
      -1
    )
    crystalScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500 }),
        withTiming(0.95, { duration: 1500 })
      ),
      -1
    )
  }, [])

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }))
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }))
  const crystalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: crystalScale.value }],
  }))

  const { data: gardenData, refetch } = useQuery({
    queryKey: ['garden'],
    queryFn: () => apiClient.get('/garden').then((r) => r.data),
    onSuccess: (data) => {
      setGarden({
        stage: data.garden?.stage ?? 'SEED',
        xp: data.garden?.xp ?? 0,
        level: data.garden?.level ?? 1,
        crystalBalance: data.wallet?.balance ?? 0,
        currentStreak: data.streak?.currentStreak ?? 0,
        longestStreak: data.streak?.longestStreak ?? 0,
      })
    },
  })

  const purchaseMutation = useMutation({
    mutationFn: async (item: (typeof SHOP_ITEMS)[0]) => {
      await apiClient.post('/garden/spend', { amount: item.cost, description: item.name })
      return item
    },
    onMutate: (item) => {
      spendCrystals(item.cost)
    },
    onSuccess: (item) => {
      setPurchasedItems((prev) => new Set([...prev, item.id]))
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      refetch()
    },
    onError: (_err, item) => {
      earnCrystals(item.cost) // rollback optimistic spend
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    },
  })

  const xpProgress = stageInfo.nextXP
    ? Math.min((xp % stageInfo.nextXP) / stageInfo.nextXP, 1)
    : 1

  const handleRewardedVideo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // TODO: Show Google AdMob rewarded ad, then call API
    await apiClient.post('/garden/rewarded-video', { adUnitId: 'ca-app-pub-test' })
    refetch()
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ─── Main garden visual ─────────────────────── */}
        <LinearGradient
          colors={stageInfo.bgColors}
          style={styles.gardenHero}
        >
          {/* Glow effect */}
          <Animated.View style={[styles.glow, glowStyle]} />

          {/* Stars background */}
          <View style={styles.starsContainer}>
            {Array.from({ length: 20 }).map((_, i) => (
              <View
                key={i}
                style={[styles.star, {
                  top: `${Math.random() * 80}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: 0.3 + Math.random() * 0.5,
                }]}
              />
            ))}
          </View>

          {/* Garden emoji */}
          <Animated.Text style={[styles.gardenEmoji, floatStyle]}>
            {stageInfo.emoji}
          </Animated.Text>

          {/* Stage info */}
          <View style={styles.stageInfo}>
            <Text style={styles.stageName}>{stageInfo.name}</Text>
            <Text style={styles.stageDesc}>{stageInfo.description}</Text>
          </View>

          {/* Level badge */}
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Nivel {level}</Text>
          </View>

          {/* XP Progress */}
          {stageInfo.nextXP && (
            <View style={styles.xpContainer}>
              <View style={styles.xpBar}>
                <Animated.View style={[styles.xpFill, { width: `${xpProgress * 100}%` }]} />
              </View>
              <Text style={styles.xpLabel}>{xp} / {stageInfo.nextXP} XP</Text>
            </View>
          )}
        </LinearGradient>

        {/* ─── Stats Row ───────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.statsRow}>
          <Animated.View style={[styles.crystalCard, crystalStyle]}>
            <Text style={styles.crystalEmoji}>💎</Text>
            <Text style={styles.crystalValue}>{crystalBalance}</Text>
            <Text style={styles.crystalLabel}>Cristales</Text>
          </Animated.View>

          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{gardenData?.streak?.currentStreak ?? 0}</Text>
            <Text style={styles.statLabel}>Racha actual</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={styles.statValue}>{gardenData?.streak?.longestStreak ?? 0}</Text>
            <Text style={styles.statLabel}>Mejor racha</Text>
          </View>
        </Animated.View>

        {/* ─── Next stage unlocks ──────────────────────── */}
        {stageInfo.nextXP && (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
            <Text style={styles.sectionTitle}>Próxima etapa desbloquea</Text>
            <View style={styles.unlocksCard}>
              {stageInfo.unlocks.map((unlock, i) => (
                <View key={i} style={styles.unlockRow}>
                  <Text style={styles.unlockDot}>✦</Text>
                  <Text style={styles.unlockText}>{unlock}</Text>
                </View>
              ))}
              <View style={styles.xpNeeded}>
                <Text style={styles.xpNeededText}>
                  Necesitas {stageInfo.nextXP - xp} XP más
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ─── Earn Crystals ───────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Ganar Cristales 💎</Text>
          <View style={styles.earnGrid}>
            <TouchableOpacity style={styles.earnCard} onPress={handleRewardedVideo}>
              <Text style={styles.earnEmoji}>📺</Text>
              <Text style={styles.earnLabel}>Ver video</Text>
              <Text style={styles.earnReward}>+15 💎</Text>
            </TouchableOpacity>
            <View style={styles.earnCard}>
              <Text style={styles.earnEmoji}>📅</Text>
              <Text style={styles.earnLabel}>Registro diario</Text>
              <Text style={styles.earnReward}>+10 XP</Text>
            </View>
            <View style={styles.earnCard}>
              <Text style={styles.earnEmoji}>🏆</Text>
              <Text style={styles.earnLabel}>Logros</Text>
              <Text style={styles.earnReward}>+💎 Varía</Text>
            </View>
            <View style={styles.earnCard}>
              <Text style={styles.earnEmoji}>🔥</Text>
              <Text style={styles.earnLabel}>Racha 7 días</Text>
              <Text style={styles.earnReward}>+10 💎</Text>
            </View>
          </View>
        </Animated.View>

        {/* ─── Shop ────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Tienda Lunar 🛍️</Text>
          <View style={styles.shopGrid}>
            {SHOP_ITEMS.map((item) => {
              const canAfford = crystalBalance >= item.cost
              const isPurchased = purchasedItems.has(item.id)
              const isBuying = purchaseMutation.isPending && purchaseMutation.variables?.id === item.id
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.shopItem,
                    (!canAfford || isPurchased) && styles.shopItemDisabled,
                  ]}
                  onPress={() => {
                    if (!canAfford || isPurchased || isBuying) return
                    purchaseMutation.mutate(item)
                  }}
                  disabled={isBuying}
                >
                  <Text style={styles.shopEmoji}>{isPurchased ? '✅' : item.emoji}</Text>
                  <Text style={styles.shopName}>{item.name}</Text>
                  <View style={styles.shopCost}>
                    {isPurchased ? (
                      <Text style={[styles.shopCostText, { color: Colors.lavender[400] }]}>Obtenido</Text>
                    ) : (
                      <Text style={[styles.shopCostText, !canAfford && styles.shopCostInsufficient]}>
                        {item.cost} 💎
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </Animated.View>

        {/* ─── Recent Achievements ─────────────────────── */}
        {gardenData?.recentAchievements?.length > 0 && (
          <Animated.View entering={FadeInDown.delay(500)} style={styles.section}>
            <Text style={styles.sectionTitle}>Logros recientes 🏆</Text>
            {gardenData.recentAchievements.slice(0, 3).map((ua: any) => (
              <View key={ua.achievementId} style={styles.achievementRow}>
                <Text style={styles.achievementEmoji}>{ua.achievement.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.achievementName}>{ua.achievement.nameEs}</Text>
                  <Text style={styles.achievementDesc}>{ua.achievement.descriptionEs}</Text>
                </View>
                <Text style={styles.achievementXP}>+{ua.achievement.xpReward} XP</Text>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  gardenHero: {
    height: 320, alignItems: 'center', justifyContent: 'center',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    overflow: 'hidden', position: 'relative',
  },
  glow: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: Colors.lavender[500], top: '20%',
    shadowColor: Colors.lavender[400], shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 40, elevation: 0,
  },
  starsContainer: { ...StyleSheet.absoluteFillObject },
  star: {
    position: 'absolute', width: 2, height: 2,
    borderRadius: 1, backgroundColor: '#fff',
  },
  gardenEmoji: { fontSize: 80, zIndex: 1 },
  stageInfo: { alignItems: 'center', marginTop: Spacing.md, zIndex: 1 },
  stageName: {
    fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold,
    color: '#fff',
  },
  stageDesc: {
    fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)',
    marginTop: 4, textAlign: 'center', paddingHorizontal: Spacing.xl,
  },
  levelBadge: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: Colors.gold.main + 'CC',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  levelText: {
    color: '#fff', fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.bold,
  },
  xpContainer: { position: 'absolute', bottom: 24, left: Spacing.xl, right: Spacing.xl },
  xpBar: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full, overflow: 'hidden', marginBottom: 4,
  },
  xpFill: {
    height: '100%', backgroundColor: Colors.gold.medium,
    borderRadius: BorderRadius.full,
  },
  xpLabel: { color: Colors.gold.medium, fontSize: Typography.fontSize.xs, textAlign: 'right' },
  statsRow: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, marginTop: Spacing.lg,
  },
  crystalCard: {
    flex: 1, backgroundColor: Colors.gold.soft, borderRadius: BorderRadius.xl,
    padding: Spacing.md, alignItems: 'center', ...Shadows.glow,
    borderWidth: 1, borderColor: Colors.gold.main + '80',
  },
  crystalEmoji: { fontSize: 28 },
  crystalValue: {
    fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: Colors.gold.dark,
  },
  crystalLabel: { fontSize: Typography.fontSize.xs, color: Colors.gold.dark },
  statCard: {
    flex: 1, backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl,
    padding: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  statEmoji: { fontSize: 24 },
  statValue: {
    fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: Colors.dark.text,
  },
  statLabel: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted },
  section: { paddingHorizontal: Spacing.md, marginTop: Spacing.xl },
  sectionTitle: {
    fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.text, marginBottom: Spacing.md,
  },
  unlocksCard: {
    backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border,
  },
  unlockRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 8 },
  unlockDot: { color: Colors.lavender[400], fontSize: 10 },
  unlockText: { fontSize: Typography.fontSize.base, color: Colors.dark.text },
  xpNeeded: {
    marginTop: Spacing.sm, backgroundColor: Colors.primary[900] + '60',
    borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center',
  },
  xpNeededText: {
    fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium,
    color: Colors.lavender[300],
  },
  earnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  earnCard: {
    width: (width - Spacing.md * 2 - Spacing.sm * 3) / 4,
    backgroundColor: Colors.dark.card, borderRadius: BorderRadius.lg,
    padding: Spacing.sm, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  earnEmoji: { fontSize: 24 },
  earnLabel: { fontSize: 9, color: Colors.dark.muted, textAlign: 'center', marginTop: 2 },
  earnReward: {
    fontSize: 10, color: Colors.gold.main, fontFamily: Typography.fontFamily.bold, marginTop: 4,
  },
  shopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  shopItem: {
    width: (width - Spacing.md * 2 - Spacing.sm) / 3,
    backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl,
    padding: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  shopItemDisabled: { opacity: 0.5 },
  shopEmoji: { fontSize: 32, marginBottom: Spacing.sm },
  shopName: {
    fontSize: Typography.fontSize.xs, color: Colors.dark.text,
    textAlign: 'center', fontFamily: Typography.fontFamily.medium,
  },
  shopCost: {
    marginTop: Spacing.sm, backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  shopCostText: { fontSize: 10, color: Colors.gold.main, fontFamily: Typography.fontFamily.bold },
  shopCostInsufficient: { color: Colors.dark.muted },
  achievementRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.dark.card, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  achievementEmoji: { fontSize: 28 },
  achievementName: {
    fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.text,
  },
  achievementDesc: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted, marginTop: 2 },
  achievementXP: {
    fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold,
    color: Colors.gold.main,
  },
})
