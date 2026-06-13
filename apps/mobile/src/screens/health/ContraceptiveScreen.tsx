import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import dayjs from 'dayjs'

import { useSettingsStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'
import { schedulePillReminder } from '@/utils/notifications'

const METHODS = [
  { key: 'pill', emoji: '💊', label: 'Pastilla diaria', desc: 'Anticonceptivo oral combinado o solo progesterona' },
  { key: 'mini_pill', emoji: '🔵', label: 'Minipíldora', desc: 'Solo progesterona, tomar a la misma hora exacta' },
  { key: 'iud_hormonal', emoji: '🔄', label: 'DIU Hormonal', desc: 'Mirena, Kyleena — dura 3–7 años' },
  { key: 'iud_copper', emoji: '🟡', label: 'DIU de Cobre', desc: 'No hormonal — dura hasta 10 años' },
  { key: 'patch', emoji: '🩹', label: 'Parche', desc: 'Cambiar cada 7 días, 3 semanas activo + 1 semana libre' },
  { key: 'ring', emoji: '💍', label: 'Anillo Vaginal', desc: 'NuvaRing — 3 semanas puesto, 1 semana libre' },
  { key: 'injection', emoji: '💉', label: 'Inyección', desc: 'Depo-Provera — cada 3 meses' },
  { key: 'implant', emoji: '📍', label: 'Implante', desc: 'Subdérmico — dura 3 años' },
  { key: 'condom', emoji: '🛡️', label: 'Preservativo', desc: 'Barrera, no hormonal' },
  { key: 'natural', emoji: '🌿', label: 'Método natural', desc: 'FAM, Billings, temperatura basal' },
]

const PILL_HOURS = ['6:00', '7:00', '8:00', '9:00', '10:00', '12:00', '18:00', '20:00', '22:00']

interface ContraceptiveSettings {
  method: string | null
  pillHour: number
  reminderEnabled: boolean
  startDate: string | null
}

export default function ContraceptiveScreen() {
  const insets = useSafeAreaInsets()
  const { contraceptive, setContraceptive } = useSettingsStore()
  const [settings, setSettings] = useState<ContraceptiveSettings>({
    method: contraceptive?.method ?? null,
    pillHour: contraceptive?.pillHour ?? 8,
    reminderEnabled: contraceptive?.reminderEnabled ?? true,
    startDate: contraceptive?.startDate ?? null,
  })
  const [saved, setSaved] = useState(false)

  const selectedMethod = METHODS.find((m) => m.key === settings.method)
  const needsDailyReminder = ['pill', 'mini_pill'].includes(settings.method ?? '')
  const needsChangeReminder = ['patch', 'ring', 'injection', 'implant', 'iud_hormonal', 'iud_copper'].includes(settings.method ?? '')

  const getChangeInfo = () => {
    switch (settings.method) {
      case 'patch': return { days: 7, label: 'cada 7 días' }
      case 'ring': return { days: 21, label: 'cada 21 días' }
      case 'injection': return { days: 90, label: 'cada 3 meses' }
      case 'implant': return { days: 365 * 3, label: 'cada 3 años' }
      case 'iud_hormonal': return { days: 365 * 5, label: 'cada 5–7 años' }
      case 'iud_copper': return { days: 365 * 10, label: 'cada 10 años' }
      default: return null
    }
  }

  const changeInfo = getChangeInfo()
  const nextChange = settings.startDate && changeInfo
    ? dayjs(settings.startDate).add(changeInfo.days, 'day')
    : null

  const handleSave = async () => {
    setContraceptive(settings)
    if (needsDailyReminder && settings.reminderEnabled) {
      await schedulePillReminder(settings.pillHour, 0)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    Alert.alert('Guardado', settings.method ? `Método: ${selectedMethod?.label}` : 'Configuración guardada.')
  }

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.title}>💊 Anticonceptivo</Text>
          <Text style={styles.subtitle}>Recordatorios inteligentes para tu método</Text>
        </Animated.View>

        {/* Method picker */}
        <Animated.View entering={FadeInDown.delay(60)}>
          <Text style={styles.sectionLabel}>MÉTODO ACTUAL</Text>
          <View style={styles.methodsGrid}>
            {METHODS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.methodBtn, settings.method === m.key && styles.methodBtnActive]}
                onPress={() => setSettings((s) => ({ ...s, method: m.key }))}
                activeOpacity={0.8}
              >
                <Text style={styles.methodEmoji}>{m.emoji}</Text>
                <Text style={[styles.methodLabel, settings.method === m.key && styles.methodLabelActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedMethod && (
            <Text style={styles.methodDesc}>{selectedMethod.desc}</Text>
          )}
        </Animated.View>

        {/* Daily pill reminder */}
        {needsDailyReminder && (
          <Animated.View entering={FadeInDown.delay(120)} style={styles.reminderCard}>
            <View style={styles.reminderRow}>
              <Text style={styles.reminderTitle}>Recordatorio diario</Text>
              <Switch
                value={settings.reminderEnabled}
                onValueChange={(v) => setSettings((s) => ({ ...s, reminderEnabled: v }))}
                thumbColor={settings.reminderEnabled ? Colors.lavender[400] : '#555'}
                trackColor={{ false: '#333', true: Colors.lavender[700] }}
              />
            </View>
            {settings.reminderEnabled && (
              <>
                <Text style={styles.hourLabel}>Hora del recordatorio</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.hoursRow}>
                    {PILL_HOURS.map((h) => {
                      const hour = parseInt(h)
                      return (
                        <TouchableOpacity
                          key={h}
                          style={[styles.hourChip, settings.pillHour === hour && styles.hourChipActive]}
                          onPress={() => setSettings((s) => ({ ...s, pillHour: hour }))}
                        >
                          <Text style={[styles.hourText, settings.pillHour === hour && styles.hourTextActive]}>{h}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </ScrollView>
                {settings.method === 'mini_pill' && (
                  <Text style={styles.warningText}>
                    ⚠️ Minipíldora: tomar dentro de una ventana de 3 horas. Sé muy puntual.
                  </Text>
                )}
              </>
            )}
          </Animated.View>
        )}

        {/* Change reminder */}
        {needsChangeReminder && changeInfo && (
          <Animated.View entering={FadeInDown.delay(120)} style={styles.changeCard}>
            <Text style={styles.changeTitle}>Recordatorio de cambio</Text>
            <Text style={styles.changeFreq}>🔄 Cada: {changeInfo.label}</Text>
            <Text style={styles.changeDateLabel}>Fecha de colocación / inicio:</Text>
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => setSettings((s) => ({ ...s, startDate: dayjs().format('YYYY-MM-DD') }))}
            >
              <Text style={styles.datePickerText}>
                {settings.startDate ?? 'Toca para marcar hoy'}
              </Text>
            </TouchableOpacity>
            {nextChange && (
              <View style={styles.nextChangeBox}>
                <Text style={styles.nextChangeLabel}>Próximo cambio:</Text>
                <Text style={styles.nextChangeDate}>{nextChange.format('D [de] MMMM YYYY')}</Text>
                <Text style={styles.nextChangeDays}>
                  En {Math.max(0, nextChange.diff(dayjs(), 'day'))} días
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.saveBtnDone]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>{saved ? '✓ Guardado' : 'Guardar configuración'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingBottom: 40, gap: Spacing.md },
  header: { gap: 4, paddingTop: Spacing.sm },
  backBtn: { marginBottom: 4 },
  backText: { color: Colors.lavender[300], fontSize: Typography.fontSize.sm },
  title: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: '#fff' },
  subtitle: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  sectionLabel: {
    fontSize: 11, fontFamily: Typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.35)', letterSpacing: 1.2, textTransform: 'uppercase',
  },
  methodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  methodBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },
  methodBtnActive: { backgroundColor: 'rgba(139,92,246,0.3)', borderColor: Colors.lavender[400] },
  methodEmoji: { fontSize: 18 },
  methodLabel: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.65)' },
  methodLabelActive: { color: Colors.lavender[200], fontFamily: Typography.fontFamily.bold },
  methodDesc: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.4)', marginTop: 6, fontStyle: 'italic' },
  reminderCard: {
    backgroundColor: 'rgba(139,92,246,0.12)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
  },
  reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reminderTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  hourLabel: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  hoursRow: { flexDirection: 'row', gap: Spacing.sm, paddingBottom: 4 },
  hourChip: {
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  hourChipActive: { backgroundColor: Colors.primary[600], borderColor: Colors.lavender[400] },
  hourText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  hourTextActive: { color: '#fff', fontFamily: Typography.fontFamily.bold },
  warningText: { fontSize: Typography.fontSize.xs, color: Colors.gold.main, lineHeight: 16 },
  changeCard: {
    backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
  },
  changeTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  changeFreq: { fontSize: Typography.fontSize.sm, color: Colors.gold.main },
  changeDateLabel: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  datePickerBtn: {
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: BorderRadius.lg,
    padding: Spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  datePickerText: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.fontSize.sm },
  nextChangeBox: {
    backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: BorderRadius.lg,
    padding: Spacing.sm, alignItems: 'center', gap: 2,
  },
  nextChangeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  nextChangeDate: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: Colors.gold.main },
  nextChangeDays: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  saveBtn: {
    backgroundColor: Colors.primary[600], borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  saveBtnDone: { backgroundColor: '#059669' },
  saveBtnText: { color: '#fff', fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.base },
})
