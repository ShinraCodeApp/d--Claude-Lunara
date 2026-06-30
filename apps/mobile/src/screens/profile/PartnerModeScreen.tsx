import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Share, Alert } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import { useMutation } from '@tanstack/react-query'

import { useSettingsStore, useCycleStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'
import apiClient from '@/api/client'

const PHASE_INFO: Record<string, { emoji: string; title: string; partnerTip: string; color: string }> = {
  menstrual: {
    emoji: '🌑', title: 'Período', color: Colors.rose[500],
    partnerTip: 'Es un buen momento para ser extra atento/a. Un abrazo, una bolsa de agua caliente o su snack favorito pueden hacer mucho.',
  },
  follicular: {
    emoji: '🌒', title: 'Fase Folicular', color: Colors.lavender[400],
    partnerTip: 'Está con mucha energía y creatividad. Buen momento para planes y actividades nuevas juntos.',
  },
  ovulatory: {
    emoji: '🌕', title: 'Ovulación', color: Colors.gold.main,
    partnerTip: 'Se siente radiante y sociable. Ideal para salidas, citas y conexión emocional profunda.',
  },
  luteal: {
    emoji: '🌖', title: 'Fase Lútea', color: '#a78bfa',
    partnerTip: 'Puede necesitar más espacio y comprensión. Reduce el estrés externo y sé paciente.',
  },
}

export default function PartnerModeScreen() {
  const insets = useSafeAreaInsets()
  const { partnerMode, partnerName, setPartnerMode, setPartnerName } = useSettingsStore()
  const { currentPhase, nextPeriodDate, dayOfCycle } = useCycleStore()
  const [nameInput, setNameInput] = useState(partnerName)
  const [saved, setSaved] = useState(false)

  const phaseInfo = currentPhase ? PHASE_INFO[currentPhase] : null
  const daysUntilPeriod = nextPeriodDate
    ? Math.max(0, Math.ceil((new Date(nextPeriodDate).getTime() - Date.now()) / 86400000))
    : null

  const notifyMutation = useMutation({
    mutationFn: () => apiClient.post('/partner/notify-phase', {
      phase: currentPhase,
      daysUntilPeriod: daysUntilPeriod ?? undefined,
    }),
    onSuccess: (res) => {
      if (res.data.sent) Alert.alert('💜 Enviado', 'Tu pareja recibió una notificación sobre tu fase actual.')
      else Alert.alert('Sin pareja vinculada', 'Vinculá una cuenta de pareja para enviar notificaciones. Usá el código de invitación.')
    },
  })

  const handleShareNative = () => {
    if (!phaseInfo) return
    const msg = `💑 Estoy en mi ${phaseInfo.title.toLowerCase()} (día ${dayOfCycle ?? '?'} del ciclo).\n\n${phaseInfo.partnerTip}\n\n— via Lunara app 🌙`
    Share.share({ message: msg, title: 'Mi ciclo — Lunara' })
  }

  const handleSave = () => {
    setPartnerName(nameInput.trim())
    if (!partnerMode) setPartnerMode(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.title}>💑 Modo Pareja</Text>
          <Text style={styles.subtitle}>Una vista pensada para tu pareja — sin datos médicos</Text>
        </Animated.View>

        {/* Toggle */}
        <Animated.View entering={FadeInDown.delay(60)}>
          <TouchableOpacity
            style={[styles.toggleCard, partnerMode && styles.toggleCardActive]}
            onPress={() => setPartnerMode(!partnerMode)}
            activeOpacity={0.8}
          >
            <Text style={styles.toggleEmoji}>{partnerMode ? '💑' : '👤'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, partnerMode && styles.toggleLabelActive]}>
                {partnerMode ? 'Modo pareja activado' : 'Activar modo pareja'}
              </Text>
              <Text style={styles.toggleSub}>
                {partnerMode
                  ? 'Tu pareja puede ver el resumen del ciclo sin detalles privados'
                  : 'Comparte solo lo que importa para tu relación'}
              </Text>
            </View>
            <View style={[styles.toggleDot, partnerMode && styles.toggleDotActive]} />
          </TouchableOpacity>
        </Animated.View>

        {/* Partner name */}
        <Animated.View entering={FadeInDown.delay(120)} style={styles.nameCard}>
          <Text style={styles.nameLabel}>Nombre de tu pareja (opcional)</Text>
          <TextInput
            style={styles.nameInput}
            value={nameInput}
            onChangeText={setNameInput}
            placeholder="Ej: Yamil, Amor, etc."
            placeholderTextColor="rgba(255,255,255,0.25)"
            maxLength={20}
          />
          <TouchableOpacity
            style={[styles.saveBtn, saved && styles.saveBtnDone]}
            onPress={handleSave}
          >
            <Text style={styles.saveBtnText}>{saved ? '✓ Guardado' : 'Guardar'}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Partner view preview */}
        {partnerMode && phaseInfo && (
          <Animated.View entering={FadeInDown.delay(180)}>
            <Text style={styles.previewLabel}>Vista de tu pareja</Text>
            <LinearGradient
              colors={[phaseInfo.color + '25', phaseInfo.color + '10']}
              style={[styles.previewCard, { borderColor: phaseInfo.color + '50' }]}
            >
              <Text style={styles.previewEmoji}>{phaseInfo.emoji}</Text>
              <Text style={[styles.previewPhase, { color: phaseInfo.color }]}>{phaseInfo.title}</Text>
              {dayOfCycle && (
                <Text style={styles.previewDay}>Día {dayOfCycle} del ciclo</Text>
              )}
              {daysUntilPeriod !== null && daysUntilPeriod <= 7 && (
                <View style={styles.alertChip}>
                  <Text style={styles.alertChipText}>
                    🌑 Próximo período en {daysUntilPeriod === 0 ? 'hoy' : `${daysUntilPeriod} días`}
                  </Text>
                </View>
              )}
              <View style={styles.tipCard}>
                <Text style={styles.tipTitle}>💡 Consejo para {partnerName || 'tu pareja'}</Text>
                <Text style={styles.tipText}>{phaseInfo.partnerTip}</Text>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Notify partner buttons */}
        {partnerMode && phaseInfo && (
          <Animated.View entering={FadeInDown.delay(220)} style={styles.notifyRow}>
            <TouchableOpacity
              style={styles.notifyBtn}
              onPress={() => notifyMutation.mutate()}
              disabled={notifyMutation.isPending}
            >
              <Text style={styles.notifyBtnText}>
                {notifyMutation.isPending ? '...' : '🔔 Notificar en la app'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.notifyBtn, styles.notifyBtnShare]} onPress={handleShareNative}>
              <Text style={styles.notifyBtnText}>📤 Compartir por WhatsApp</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* What's hidden */}
        <Animated.View entering={FadeInDown.delay(240)} style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>🔒 Privacidad garantizada</Text>
          <Text style={styles.privacyText}>El modo pareja nunca muestra:</Text>
          {['BBT y temperatura basal', 'Moco cervical', 'Síntomas detallados', 'Datos de intimidad', 'Medicamentos', 'Peso y métricas personales'].map((item) => (
            <View key={item} style={styles.privacyRow}>
              <Text style={styles.privacyDot}>✗</Text>
              <Text style={styles.privacyItem}>{item}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingBottom: 60, gap: Spacing.md },
  notifyRow: { flexDirection: 'row', gap: Spacing.sm },
  notifyBtn: {
    flex: 1, backgroundColor: 'rgba(109,40,217,0.3)', borderWidth: 1, borderColor: '#7c3aed',
    borderRadius: BorderRadius.lg, paddingVertical: 12, alignItems: 'center',
  },
  notifyBtnShare: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10b981' },
  notifyBtnText: { color: '#fff', fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium },
  header: { gap: 4, paddingTop: Spacing.sm },
  backBtn: { marginBottom: 4 },
  backBtnText: { color: Colors.lavender[300], fontSize: Typography.fontSize.sm },
  title: { fontSize: Typography.fontSize['3xl'], fontFamily: Typography.fontFamily.bold, color: '#fff' },
  subtitle: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },
  toggleCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 2, borderColor: 'rgba(139,92,246,0.25)',
  },
  toggleCardActive: { borderColor: '#ec4899', backgroundColor: 'rgba(236,72,153,0.12)' },
  toggleEmoji: { fontSize: 28 },
  toggleLabel: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  toggleLabelActive: { color: '#f9a8d4' },
  toggleSub: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  toggleDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  toggleDotActive: { backgroundColor: '#ec4899', borderColor: '#ec4899' },
  nameCard: {
    backgroundColor: 'rgba(139,92,246,0.12)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
  },
  nameLabel: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.6)' },
  nameInput: {
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: BorderRadius.lg,
    padding: Spacing.sm, color: '#fff', fontSize: Typography.fontSize.base,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  saveBtn: {
    backgroundColor: Colors.primary[600], borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm, alignItems: 'center',
  },
  saveBtnDone: { backgroundColor: '#059669' },
  saveBtnText: { color: '#fff', fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.base },
  previewLabel: {
    fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4,
  },
  previewCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm, borderWidth: 1,
  },
  previewEmoji: { fontSize: 56 },
  previewPhase: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold },
  previewDay: { fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.6)' },
  alertChip: {
    backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
  },
  alertChipText: { fontSize: Typography.fontSize.sm, color: '#fca5a5' },
  tipCard: {
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: BorderRadius.lg,
    padding: Spacing.md, width: '100%', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  tipTitle: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold, color: '#e9d5ff' },
  tipText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)', lineHeight: 20 },
  privacyCard: {
    backgroundColor: 'rgba(5,150,105,0.1)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, gap: 8, borderWidth: 1, borderColor: 'rgba(5,150,105,0.2)',
  },
  privacyTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#6ee7b7' },
  privacyText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  privacyRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  privacyDot: { color: '#f87171', fontSize: 12, width: 14 },
  privacyItem: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
})
