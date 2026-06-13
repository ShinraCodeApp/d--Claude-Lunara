import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Image, Dimensions, Modal, ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeInDown, SlideInDown, ZoomIn } from 'react-native-reanimated'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import { useSettingsStore, useGardenStore, useAuthStore } from '@/store'
import { AVATARS, AvatarOption, isAvatarUnlocked, getUnlockLabel, CRYSTAL_COSTS } from '@/constants/avatars'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

const { width } = Dimensions.get('window')
const AVATAR_SIZE = (width - Spacing.md * 2 - Spacing.sm * 3) / 4

const SECTION_LABELS: Record<string, string> = {
  free: '🎁 Disponibles gratis',
  viral: '🦝 Animales virales',
  animated: '🎬 Animados',
  level: '⭐ Por nivel',
  premium: '👑 Premium',
  streak: '🔥 Por racha',
}

const grouped = AVATARS.reduce<Record<string, typeof AVATARS>>((acc, av) => {
  if (!acc[av.unlockType]) acc[av.unlockType] = []
  acc[av.unlockType].push(av)
  return acc
}, {})

export default function AvatarPickerScreen() {
  const insets = useSafeAreaInsets()
  const { avatarId, avatarUri, setAvatarId, setAvatarUri, unlockedAvatars, unlockAvatar } = useSettingsStore()
  const { level, longestStreak, crystalBalance, earnCrystals, spendCrystals } = useGardenStore()
  const { user } = useAuthStore()
  const isPremium = user?.subscription?.tier !== 'FREE'

  const [preview, setPreview] = useState<{ type: 'emoji'; id: string } | { type: 'photo'; uri: string } | null>(null)
  const [unlockModal, setUnlockModal] = useState<AvatarOption | null>(null)
  const [adLoading, setAdLoading] = useState(false)

  const currentAvatar = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0]

  // Stub for rewarded ad — replace body with real AdMob call when SDK is integrated
  // import { RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads'
  const watchRewardedAd = async () => {
    setAdLoading(true)
    await new Promise<void>((r) => setTimeout(r, 2000))
    earnCrystals(25)
    setAdLoading(false)
    Alert.alert('¡Gracias por ver el anuncio! 🎉', '+25 💎 cristales añadidos a tu balance.')
  }

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para elegir una foto.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setPreview({ type: 'photo', uri: result.assets[0].uri })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }

  const handleSelectEmoji = (id: string) => {
    const avatar = AVATARS.find((a) => a.id === id)
    if (!avatar) return

    if (!isAvatarUnlocked(avatar, level, isPremium, longestStreak, unlockedAvatars)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      if (avatar.unlockType === 'viral' || avatar.unlockType === 'animated') {
        setUnlockModal(avatar)
      } else {
        Alert.alert(
          `🔒 ${avatar.name}`,
          avatar.unlockType === 'premium'
            ? 'Activa Premium para desbloquear este avatar.'
            : avatar.unlockType === 'level'
            ? `Alcanza el nivel ${avatar.unlockValue} para desbloquearlo.`
            : `Consigue una racha de ${avatar.unlockValue} días para desbloquearlo.`,
          [
            { text: 'Cerrar', style: 'cancel' },
            ...(avatar.unlockType === 'premium'
              ? [{ text: '👑 Ver Premium', onPress: () => router.push('/premium') }]
              : []),
          ]
        )
      }
      return
    }
    Haptics.selectionAsync()
    setPreview({ type: 'emoji', id })
  }

  const handleSpendCrystals = (avatar: AvatarOption) => {
    const cost = CRYSTAL_COSTS[avatar.unlockType as keyof typeof CRYSTAL_COSTS]
    const success = spendCrystals(cost)
    if (success) {
      unlockAvatar(avatar.id)
      setPreview({ type: 'emoji', id: avatar.id })
      setUnlockModal(null)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }

  const handleConfirm = () => {
    if (!preview) return
    if (preview.type === 'photo') {
      setAvatarUri(preview.uri)
    } else {
      setAvatarId(preview.id)
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    router.back()
  }

  const previewAvatarData = preview?.type === 'emoji'
    ? AVATARS.find((a) => a.id === preview.id)
    : null

  const modalCost = unlockModal
    ? CRYSTAL_COSTS[unlockModal.unlockType as keyof typeof CRYSTAL_COSTS] ?? 0
    : 0
  const canAfford = crystalBalance >= modalCost

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Atrás</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Elige tu avatar</Text>
              <Text style={styles.subtitle}>Tu imagen en Lunara</Text>
            </View>
            <View style={styles.crystalBadge}>
              <Text style={styles.crystalIcon}>💎</Text>
              <Text style={styles.crystalCount}>{crystalBalance}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Current / Preview */}
        <Animated.View entering={FadeInDown.delay(80)} style={styles.previewSection}>
          <View style={styles.previewCircleWrapper}>
            {preview?.type === 'photo' ? (
              <Image source={{ uri: preview.uri }} style={styles.previewPhoto} />
            ) : (
              <LinearGradient
                colors={(previewAvatarData ?? currentAvatar).gradient}
                style={styles.previewCircle}
              >
                {avatarUri && !preview ? (
                  <Image source={{ uri: avatarUri }} style={styles.previewPhoto} />
                ) : (
                  <Text style={styles.previewEmoji}>
                    {previewAvatarData ? previewAvatarData.emoji : currentAvatar.emoji}
                  </Text>
                )}
              </LinearGradient>
            )}
          </View>
          <Text style={styles.previewName}>
            {preview?.type === 'photo' ? 'Tu foto' : (previewAvatarData?.name ?? currentAvatar.name)}
          </Text>
          {!preview && <Text style={styles.previewCurrent}>Avatar actual</Text>}
        </Animated.View>

        {/* Photo from gallery */}
        <Animated.View entering={FadeInDown.delay(120)}>
          <TouchableOpacity style={styles.galleryBtn} onPress={handlePickPhoto} activeOpacity={0.85}>
            <LinearGradient
              colors={['rgba(139,92,246,0.3)', 'rgba(88,28,135,0.2)']}
              style={styles.galleryBtnGradient}
            >
              <Text style={styles.galleryIcon}>📷</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.galleryTitle}>Usar foto de galería</Text>
                <Text style={styles.gallerySub}>Elige una foto cuadrada de tu teléfono</Text>
              </View>
              <Text style={styles.galleryArrow}>→</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Crystal info banner */}
        <Animated.View entering={FadeInDown.delay(140)}>
          <LinearGradient
            colors={['rgba(14,165,233,0.15)', 'rgba(99,102,241,0.1)']}
            style={styles.infoBanner}
          >
            <Text style={styles.infoBannerIcon}>💎</Text>
            <Text style={styles.infoBannerText}>
              Los avatares virales y animados se desbloquean con cristales.{'\n'}
              Gánalos viendo anuncios o con Premium.
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Avatar sections */}
        {(['free', 'viral', 'animated', 'level', 'streak', 'premium'] as const).map((type, si) => (
          <Animated.View key={type} entering={FadeInDown.delay(160 + si * 60)}>
            <Text style={styles.sectionTitle}>{SECTION_LABELS[type]}</Text>
            <View style={styles.avatarGrid}>
              {(grouped[type] ?? []).map((avatar) => {
                const unlocked = isAvatarUnlocked(avatar, level, isPremium, longestStreak, unlockedAvatars)
                const isSelected = preview
                  ? (preview.type === 'emoji' && preview.id === avatar.id)
                  : (avatarId === avatar.id && !avatarUri)

                return (
                  <TouchableOpacity
                    key={avatar.id}
                    style={[styles.avatarCell, isSelected && styles.avatarCellSelected]}
                    onPress={() => handleSelectEmoji(avatar.id)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={unlocked ? avatar.gradient : ['#1a1a2e', '#16213e']}
                      style={[styles.avatarBg, !unlocked && styles.avatarBgLocked]}
                    >
                      <Text style={[styles.avatarEmoji, !unlocked && styles.avatarEmojiLocked]}>
                        {avatar.emoji}
                      </Text>
                      {!unlocked && (
                        <View style={styles.lockBadge}>
                          <Text style={styles.lockIcon}>
                            {avatar.unlockType === 'viral' || avatar.unlockType === 'animated' ? '💎' : '🔒'}
                          </Text>
                        </View>
                      )}
                      {isSelected && (
                        <Animated.View entering={ZoomIn} style={styles.selectedBadge}>
                          <Text style={styles.selectedBadgeText}>✓</Text>
                        </Animated.View>
                      )}
                    </LinearGradient>
                    <Text style={[styles.avatarName, !unlocked && styles.avatarNameLocked]} numberOfLines={1}>
                      {avatar.name}
                    </Text>
                    <Text style={[
                      styles.avatarUnlock,
                      !unlocked && (avatar.unlockType === 'viral' || avatar.unlockType === 'animated')
                        ? { color: '#38bdf8' }
                        : !unlocked ? { color: Colors.rose[400] } : {},
                    ]}>
                      {getUnlockLabel(avatar)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Confirm FAB */}
      {preview && (
        <Animated.View
          entering={ZoomIn}
          style={[styles.confirmBar, { paddingBottom: insets.bottom + 8 }]}
        >
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <LinearGradient
              colors={[Colors.primary[600], Colors.lavender[500]]}
              style={styles.confirmGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={styles.confirmText}>✓ Guardar avatar</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Unlock Modal */}
      <Modal
        visible={!!unlockModal}
        transparent
        animationType="fade"
        onRequestClose={() => setUnlockModal(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => !adLoading && setUnlockModal(null)}
        />
        {unlockModal && (
          <Animated.View entering={SlideInDown.springify().damping(18)} style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            {/* Avatar preview */}
            <LinearGradient colors={unlockModal.gradient} style={styles.modalAvatar}>
              <Text style={styles.modalAvatarEmoji}>{unlockModal.emoji}</Text>
            </LinearGradient>
            <Text style={styles.modalName}>{unlockModal.name}</Text>
            <Text style={styles.modalDesc}>{unlockModal.description}</Text>

            {/* Crystal balance */}
            <View style={styles.modalBalanceRow}>
              <View style={styles.modalBalanceChip}>
                <Text style={styles.modalBalanceLabel}>Tu balance</Text>
                <Text style={styles.modalBalanceValue}>💎 {crystalBalance}</Text>
              </View>
              <View style={styles.modalCostChip}>
                <Text style={styles.modalBalanceLabel}>Costo</Text>
                <Text style={[styles.modalBalanceValue, !canAfford && { color: Colors.rose[400] }]}>
                  💎 {modalCost}
                </Text>
              </View>
            </View>

            {!canAfford && (
              <Text style={styles.modalInsufficient}>
                Te faltan 💎 {modalCost - crystalBalance} cristales
              </Text>
            )}

            {/* Watch ad button */}
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnAd]}
              onPress={watchRewardedAd}
              disabled={adLoading}
              activeOpacity={0.85}
            >
              {adLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.modalBtnIcon}>📺</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalBtnTitle}>Ver anuncio gratis</Text>
                    <Text style={styles.modalBtnSub}>+25 💎 cristales por anuncio</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>

            {/* Spend crystals button */}
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnCrystal, !canAfford && styles.modalBtnDisabled]}
              onPress={() => canAfford && handleSpendCrystals(unlockModal)}
              activeOpacity={canAfford ? 0.85 : 1}
            >
              <Text style={styles.modalBtnIcon}>💎</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalBtnTitle, !canAfford && { color: 'rgba(255,255,255,0.4)' }]}>
                  Gastar {modalCost} cristales
                </Text>
                <Text style={styles.modalBtnSub}>
                  {canAfford ? 'Desbloqueo permanente' : 'Cristales insuficientes'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Premium upsell */}
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnPremium]}
              onPress={() => { setUnlockModal(null); router.push('/premium') }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnIcon}>👑</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalBtnTitle}>Ver Premium</Text>
                <Text style={styles.modalBtnSub}>Todos los avatares desbloqueados</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setUnlockModal(null)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Modal>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  header: { gap: 4 },
  backBtn: { marginBottom: Spacing.sm },
  backText: { color: Colors.lavender[300], fontSize: Typography.fontSize.base },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontSize: Typography.fontSize['3xl'], fontFamily: Typography.fontFamily.bold, color: '#fff' },
  subtitle: { fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  crystalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(14,165,233,0.2)', borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(14,165,233,0.4)',
  },
  crystalIcon: { fontSize: 16 },
  crystalCount: {
    fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold,
    color: '#7dd3fc',
  },
  previewSection: { alignItems: 'center', gap: 8, paddingVertical: Spacing.md },
  previewCircleWrapper: {
    width: 100, height: 100, borderRadius: 50, overflow: 'hidden',
    shadowColor: Colors.primary[500], shadowOpacity: 0.6, shadowRadius: 20, elevation: 10,
  },
  previewCircle: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  previewPhoto: { width: 100, height: 100, borderRadius: 50 },
  previewEmoji: { fontSize: 52 },
  previewName: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  previewCurrent: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.4)' },
  galleryBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  galleryBtnGradient: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)',
    borderRadius: BorderRadius.xl,
  },
  galleryIcon: { fontSize: 28 },
  galleryTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  gallerySub: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  galleryArrow: { fontSize: 20, color: Colors.lavender[300] },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(14,165,233,0.3)',
  },
  infoBannerIcon: { fontSize: 20 },
  infoBannerText: { flex: 1, fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
  sectionTitle: {
    fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1,
  },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  avatarCell: {
    width: AVATAR_SIZE, alignItems: 'center', gap: 4,
    borderRadius: BorderRadius.xl, padding: 3,
    borderWidth: 2, borderColor: 'transparent',
  },
  avatarCellSelected: {
    borderColor: Colors.primary[400],
    backgroundColor: Colors.primary[600] + '25',
  },
  avatarBg: {
    width: AVATAR_SIZE - 6, height: AVATAR_SIZE - 6,
    borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center',
  },
  avatarBgLocked: { opacity: 0.45 },
  avatarEmoji: { fontSize: 34 },
  avatarEmojiLocked: { opacity: 0.5 },
  lockBadge: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 10, padding: 2,
  },
  lockIcon: { fontSize: 10 },
  selectedBadge: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.primary[500], alignItems: 'center', justifyContent: 'center',
  },
  selectedBadgeText: { fontSize: 10, color: '#fff', fontFamily: Typography.fontFamily.bold },
  avatarName: { fontSize: 10, fontFamily: Typography.fontFamily.medium, color: '#e9d5ff', textAlign: 'center' },
  avatarNameLocked: { color: 'rgba(255,255,255,0.3)' },
  avatarUnlock: { fontSize: 9, color: Colors.success, textAlign: 'center' },
  confirmBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.md, backgroundColor: 'rgba(13,1,24,0.95)',
    borderTopWidth: 1, borderTopColor: 'rgba(139,92,246,0.3)',
  },
  confirmBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  confirmGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold },
  // Modal
  modalBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#130228', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm,
    borderTopWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
  },
  modalAvatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  modalAvatarEmoji: { fontSize: 42 },
  modalName: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  modalDesc: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  modalBalanceRow: { flexDirection: 'row', gap: Spacing.md, width: '100%', marginBottom: 4 },
  modalBalanceChip: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: BorderRadius.lg,
    padding: Spacing.sm, alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalCostChip: {
    flex: 1, backgroundColor: 'rgba(14,165,233,0.1)', borderRadius: BorderRadius.lg,
    padding: Spacing.sm, alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: 'rgba(14,165,233,0.3)',
  },
  modalBalanceLabel: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.4)' },
  modalBalanceValue: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#7dd3fc' },
  modalInsufficient: {
    fontSize: Typography.fontSize.xs, color: Colors.rose[400],
    textAlign: 'center', marginBottom: 4,
  },
  modalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    width: '100%', borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1,
  },
  modalBtnAd: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderColor: 'rgba(139,92,246,0.5)',
  },
  modalBtnCrystal: {
    backgroundColor: 'rgba(14,165,233,0.15)',
    borderColor: 'rgba(14,165,233,0.4)',
  },
  modalBtnPremium: {
    backgroundColor: 'rgba(234,179,8,0.15)',
    borderColor: 'rgba(234,179,8,0.4)',
  },
  modalBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalBtnIcon: { fontSize: 24 },
  modalBtnTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  modalBtnSub: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  modalCancelBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl },
  modalCancelText: { fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.4)' },
})
