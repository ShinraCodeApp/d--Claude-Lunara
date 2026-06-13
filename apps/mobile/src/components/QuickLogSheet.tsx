import React, { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, Pressable, TextInput, Switch,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { useSymptomStore, useCycleStore, useGardenStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

const MOODS = [
  { key: 'feliz', emoji: '😊', label: 'Feliz' },
  { key: 'tranquila', emoji: '😌', label: 'Tranquila' },
  { key: 'ansiosa', emoji: '😰', label: 'Ansiosa' },
  { key: 'irritable', emoji: '😤', label: 'Irritable' },
  { key: 'triste', emoji: '😔', label: 'Triste' },
]

const ENERGY_OPTIONS = [
  { key: 'alta', label: '⚡ Alta', color: Colors.success },
  { key: 'media', label: '🔆 Media', color: Colors.gold.main },
  { key: 'baja', label: '🌙 Baja', color: Colors.dark.muted },
]

const QUICK_SYMPTOMS = [
  { key: 'colicos', emoji: '🔴', label: 'Cólicos' },
  { key: 'dolor_cabeza', emoji: '🤕', label: 'Cefalea' },
  { key: 'dolor_espalda', emoji: '💆', label: 'Espalda' },
  { key: 'hinchazón', emoji: '🫀', label: 'Hinchazón' },
  { key: 'sensibilidad', emoji: '🎯', label: 'Senos' },
  { key: 'nauseas', emoji: '🌊', label: 'Náuseas' },
  { key: 'acne', emoji: '✨', label: 'Acné' },
  { key: 'insomnio', emoji: '🌛', label: 'Insomnio' },
]

const SLEEP_QUALITY = [
  { key: 'malo', label: '😫 Malo', color: Colors.rose[400] },
  { key: 'regular', label: '😐 Regular', color: Colors.gold.main },
  { key: 'bueno', label: '😊 Bueno', color: Colors.success },
]

type TabId = 'general' | 'intimacy' | 'wellness'

const TABS: { id: TabId; label: string }[] = [
  { id: 'general', label: '😊 Ánimo' },
  { id: 'intimacy', label: '💕 Íntimo' },
  { id: 'wellness', label: '🌿 Bienestar' },
]

interface Props {
  visible: boolean
  onClose: () => void
}

export default function QuickLogSheet({ visible, onClose }: Props) {
  const { updateTodayLog, getTodayLog } = useSymptomStore()
  const { currentPhase } = useCycleStore()
  const { setGarden, xp, crystalBalance } = useGardenStore()

  const todayLog = getTodayLog()
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [saved, setSaved] = useState(false)

  // General
  const [mood, setMood] = useState<string | null>(null)
  const [energy, setEnergy] = useState<string | null>(null)
  const [symptoms, setSymptoms] = useState<string[]>([])

  // Intimacy
  const [hadSex, setHadSex] = useState(false)
  const [sexProtected, setSexProtected] = useState<boolean | null>(null)
  const [orgasm, setOrgasm] = useState<boolean | null>(null)
  const [desireLevel, setDesireLevel] = useState<number | null>(null)

  // Wellness
  const [sleepHours, setSleepHours] = useState(7)
  const [sleepQuality, setSleepQuality] = useState<'bueno' | 'regular' | 'malo' | null>(null)
  const [weight, setWeight] = useState('')
  const [water, setWater] = useState(0)
  const [medicationPill, setMedicationPill] = useState(false)

  useEffect(() => {
    if (visible) {
      const log = getTodayLog()
      setMood(log?.mood ?? null)
      setEnergy(log?.energy ?? null)
      setSymptoms(log?.symptoms ?? [])
      setHadSex(log?.intimacy?.hadSex ?? false)
      setSexProtected(log?.intimacy?.protected ?? null)
      setOrgasm(log?.intimacy?.orgasm ?? null)
      setDesireLevel(log?.intimacy?.desireLevel ?? null)
      setSleepHours(log?.sleep?.hours ?? 7)
      setSleepQuality(log?.sleep?.quality ?? null)
      setWeight(log?.weight?.toString() ?? '')
      setWater(log?.water ?? 0)
      setMedicationPill(log?.medications?.pill ?? false)
      setSaved(false)
      setActiveTab('general')
    }
  }, [visible])

  const toggleSymptom = (key: string) => {
    Haptics.selectionAsync()
    setSymptoms((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    )
  }

  const handleSave = () => {
    updateTodayLog(currentPhase, {
      mood,
      energy: energy as any,
      symptoms,
      intimacy: {
        hadSex,
        protected: hadSex ? sexProtected : null,
        orgasm: hadSex ? orgasm : null,
        desireLevel,
      },
      sleep: sleepQuality ? { hours: sleepHours, quality: sleepQuality } : null,
      weight: weight ? parseFloat(weight) : null,
      water: water > 0 ? water : null,
      medications: { pill: medicationPill, other: '' },
    })
    if (!todayLog) {
      setGarden({ xp: xp + 10, crystalBalance: crystalBalance + 2 })
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setSaved(true)
    setTimeout(onClose, 700)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <Text style={styles.title}>¿Cómo estás hoy? 🌙</Text>
          <Text style={styles.subtitle}>Registro rápido · +10 XP</Text>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
                onPress={() => { Haptics.selectionAsync(); setActiveTab(tab.id) }}
              >
                <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>

            {/* ── GENERAL TAB ── */}
            {activeTab === 'general' && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionLabel}>Estado de ánimo</Text>
                <View style={styles.chipRow}>
                  {MOODS.map((m) => (
                    <TouchableOpacity
                      key={m.key}
                      style={[styles.moodChip, mood === m.key && styles.moodChipActive]}
                      onPress={() => { Haptics.selectionAsync(); setMood(mood === m.key ? null : m.key) }}
                    >
                      <Text style={styles.moodEmoji}>{m.emoji}</Text>
                      <Text style={[styles.chipLabel, mood === m.key && styles.chipLabelActive]}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Energía</Text>
                <View style={styles.chipRow}>
                  {ENERGY_OPTIONS.map((e) => (
                    <TouchableOpacity
                      key={e.key}
                      style={[
                        styles.energyChip,
                        energy === e.key && { backgroundColor: e.color + '30', borderColor: e.color },
                      ]}
                      onPress={() => { Haptics.selectionAsync(); setEnergy(energy === e.key ? null : e.key) }}
                    >
                      <Text style={[styles.energyLabel, energy === e.key && { color: e.color }]}>{e.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Síntomas físicos</Text>
                <View style={styles.symptomsGrid}>
                  {QUICK_SYMPTOMS.map((s) => {
                    const active = symptoms.includes(s.key)
                    return (
                      <TouchableOpacity
                        key={s.key}
                        style={[styles.symptomChip, active && styles.symptomChipActive]}
                        onPress={() => toggleSymptom(s.key)}
                      >
                        <Text style={styles.symptomEmoji}>{s.emoji}</Text>
                        <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{s.label}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}

            {/* ── INTIMACY TAB ── */}
            {activeTab === 'intimacy' && (
              <View style={styles.tabContent}>
                <Text style={styles.intimacyHint}>
                  Esta información es completamente privada y nunca se comparte.
                </Text>

                <Text style={styles.sectionLabel}>¿Tuve relaciones hoy?</Text>
                <View style={styles.yesNoRow}>
                  {[false, true].map((val) => (
                    <TouchableOpacity
                      key={String(val)}
                      style={[styles.yesNoBtn, hadSex === val && styles.yesNoBtnActive]}
                      onPress={() => { Haptics.selectionAsync(); setHadSex(val) }}
                    >
                      <Text style={[styles.yesNoBtnText, hadSex === val && styles.yesNoBtnTextActive]}>
                        {val ? '✓ Sí' : '✗ No'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {hadSex && (
                  <View style={styles.intimacyDetails}>
                    <Text style={styles.sectionLabel}>¿Fue protegida?</Text>
                    <View style={styles.yesNoRow}>
                      {([true, false] as const).map((val) => (
                        <TouchableOpacity
                          key={String(val)}
                          style={[styles.yesNoBtn, sexProtected === val && styles.yesNoBtnActive]}
                          onPress={() => { Haptics.selectionAsync(); setSexProtected(sexProtected === val ? null : val) }}
                        >
                          <Text style={[styles.yesNoBtnText, sexProtected === val && styles.yesNoBtnTextActive]}>
                            {val ? '🛡️ Sí' : '⚠️ No'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.sectionLabel}>¿Tuve orgasmo?</Text>
                    <View style={styles.yesNoRow}>
                      {([true, false] as const).map((val) => (
                        <TouchableOpacity
                          key={String(val)}
                          style={[styles.yesNoBtn, orgasm === val && styles.yesNoBtnActive]}
                          onPress={() => { Haptics.selectionAsync(); setOrgasm(orgasm === val ? null : val) }}
                        >
                          <Text style={[styles.yesNoBtnText, orgasm === val && styles.yesNoBtnTextActive]}>
                            {val ? '✨ Sí' : '— No'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <Text style={styles.sectionLabel}>Nivel de deseo</Text>
                <View style={styles.desireRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <TouchableOpacity
                      key={n}
                      onPress={() => { Haptics.selectionAsync(); setDesireLevel(desireLevel === n ? null : n) }}
                    >
                      <Text style={[styles.desireHeart, n <= (desireLevel ?? 0) && styles.desireHeartActive]}>
                        {n <= (desireLevel ?? 0) ? '❤️' : '🤍'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={styles.desireLabel}>
                    {desireLevel ? ['', 'Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto'][desireLevel] : 'Sin selección'}
                  </Text>
                </View>
              </View>
            )}

            {/* ── WELLNESS TAB ── */}
            {activeTab === 'wellness' && (
              <View style={styles.tabContent}>

                {/* Sleep */}
                <Text style={styles.sectionLabel}>😴 Sueño</Text>
                <View style={styles.sleepRow}>
                  <TouchableOpacity onPress={() => setSleepHours((h) => Math.max(0, h - 0.5))} style={styles.stepBtn}>
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.sleepValue}>{sleepHours}h</Text>
                  <TouchableOpacity onPress={() => setSleepHours((h) => Math.min(12, h + 0.5))} style={styles.stepBtn}>
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.qualityRow}>
                  {SLEEP_QUALITY.map((q) => (
                    <TouchableOpacity
                      key={q.key}
                      style={[styles.qualityBtn, sleepQuality === q.key && { borderColor: q.color, backgroundColor: q.color + '25' }]}
                      onPress={() => { Haptics.selectionAsync(); setSleepQuality(sleepQuality === q.key ? null : q.key as any) }}
                    >
                      <Text style={[styles.qualityLabel, sleepQuality === q.key && { color: q.color }]}>{q.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Weight */}
                <Text style={styles.sectionLabel}>⚖️ Peso</Text>
                <View style={styles.weightRow}>
                  <TextInput
                    style={styles.weightInput}
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="0.0"
                    placeholderTextColor={Colors.dark.muted}
                    keyboardType="decimal-pad"
                    maxLength={5}
                  />
                  <Text style={styles.weightUnit}>kg</Text>
                </View>

                {/* Water */}
                <Text style={styles.sectionLabel}>💧 Agua</Text>
                <View style={styles.waterRow}>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                    <TouchableOpacity
                      key={n}
                      onPress={() => { Haptics.selectionAsync(); setWater(water === n ? 0 : n) }}
                    >
                      <Text style={[styles.waterGlass, n <= water && styles.waterGlassActive]}>
                        {n <= water ? '🥤' : '🫙'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.waterLabel}>{water} de 8 vasos</Text>

                {/* Medications */}
                <View style={styles.pillRow}>
                  <Text style={styles.pillLabel}>💊 Anticonceptivo</Text>
                  <Switch
                    value={medicationPill}
                    onValueChange={(v) => { Haptics.selectionAsync(); setMedicationPill(v) }}
                    trackColor={{ false: Colors.dark.border, true: Colors.primary[500] }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            )}

          </ScrollView>

          {/* Save */}
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saved}>
            <LinearGradient
              colors={saved ? ['#10b981', '#059669'] : [Colors.primary[600], Colors.lavender[500]]}
              style={styles.saveBtnGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={styles.saveBtnText}>
                {saved ? '✓ Guardado +10 XP' : 'Guardar registro'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.md,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: Colors.dark.border,
    borderRadius: BorderRadius.full, alignSelf: 'center', marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.text, textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.sm, color: Colors.dark.muted,
    textAlign: 'center', marginBottom: Spacing.md,
  },
  tabsRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.xl, padding: 3, gap: 3, marginBottom: Spacing.sm,
  },
  tabBtn: {
    flex: 1, paddingVertical: 8, borderRadius: BorderRadius.lg, alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: Colors.primary[700] },
  tabLabel: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.4)', fontFamily: Typography.fontFamily.medium },
  tabLabelActive: { color: '#fff' },
  scrollArea: { maxHeight: 380 },
  tabContent: { gap: 2, paddingBottom: Spacing.sm },
  sectionLabel: {
    fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.muted, marginBottom: Spacing.sm, marginTop: Spacing.md,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  moodChip: {
    alignItems: 'center', backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg, padding: Spacing.sm, minWidth: 60,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  moodChipActive: { borderColor: Colors.primary[500], backgroundColor: Colors.primary[600] + '30' },
  moodEmoji: { fontSize: 22 },
  chipLabel: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted, marginTop: 2, textAlign: 'center' },
  chipLabelActive: { color: Colors.dark.text },
  energyChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: 1,
    borderColor: Colors.dark.border, backgroundColor: Colors.dark.card,
  },
  energyLabel: { fontSize: Typography.fontSize.base, color: Colors.dark.muted, fontFamily: Typography.fontFamily.medium },
  symptomsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  symptomChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.dark.card, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  symptomChipActive: { borderColor: Colors.rose[400], backgroundColor: Colors.rose[400] + '20' },
  symptomEmoji: { fontSize: 14 },
  // Intimacy
  intimacyHint: {
    fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.3)',
    textAlign: 'center', marginTop: Spacing.sm, lineHeight: 16,
  },
  yesNoRow: { flexDirection: 'row', gap: Spacing.sm },
  yesNoBtn: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xl,
    alignItems: 'center', backgroundColor: Colors.dark.card,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  yesNoBtnActive: { backgroundColor: Colors.primary[600] + '40', borderColor: Colors.primary[400] },
  yesNoBtnText: { fontSize: Typography.fontSize.base, color: Colors.dark.muted, fontFamily: Typography.fontFamily.medium },
  yesNoBtnTextActive: { color: '#fff' },
  intimacyDetails: { gap: 2 },
  desireRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  desireHeart: { fontSize: 28 },
  desireHeartActive: {},
  desireLabel: { fontSize: Typography.fontSize.sm, color: Colors.dark.muted, marginLeft: 4 },
  // Wellness
  sleepRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xl,
    backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border,
  },
  stepBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.dark.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  stepBtnText: { fontSize: 20, color: Colors.lavender[300], fontFamily: Typography.fontFamily.bold },
  sleepValue: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: Colors.dark.text, flex: 1, textAlign: 'center' },
  qualityRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  qualityBtn: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xl,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
  },
  qualityLabel: { fontSize: Typography.fontSize.sm, color: Colors.dark.muted, fontFamily: Typography.fontFamily.medium },
  weightRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.border,
  },
  weightInput: {
    flex: 1, color: Colors.dark.text, fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.bold, textAlign: 'center', padding: Spacing.sm,
  },
  weightUnit: { fontSize: Typography.fontSize.base, color: Colors.dark.muted, marginRight: Spacing.sm },
  waterRow: { flexDirection: 'row', gap: 4 },
  waterGlass: { fontSize: 26 },
  waterGlassActive: {},
  waterLabel: { fontSize: Typography.fontSize.sm, color: Colors.dark.muted, marginTop: 4 },
  pillRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border,
  },
  pillLabel: { fontSize: Typography.fontSize.base, color: Colors.dark.text, fontFamily: Typography.fontFamily.medium },
  saveBtn: { marginTop: Spacing.md, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  saveBtnGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold },
})
