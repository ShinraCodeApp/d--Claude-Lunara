import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch, TextInput,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { router } from 'expo-router'

import apiClient from '@/api/client'
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/theme'

const MOODS = [
  { key: 'HAPPY', emoji: '😊', label: 'Feliz' },
  { key: 'SAD', emoji: '😢', label: 'Triste' },
  { key: 'ANXIOUS', emoji: '😰', label: 'Ansiosa' },
  { key: 'STRESSED', emoji: '😤', label: 'Estresada' },
  { key: 'MOTIVATED', emoji: '💪', label: 'Motivada' },
  { key: 'RELAXED', emoji: '😌', label: 'Relajada' },
  { key: 'IRRITABLE', emoji: '😠', label: 'Irritable' },
  { key: 'ENERGETIC', emoji: '⚡', label: 'Energética' },
  { key: 'TIRED', emoji: '😴', label: 'Cansada' },
  { key: 'EMOTIONAL', emoji: '🥺', label: 'Emocional' },
  { key: 'NEUTRAL', emoji: '😐', label: 'Neutral' },
]

const SYMPTOM_CATEGORIES: Record<string, { label: string; icon: string }> = {
  PAIN:      { label: 'Dolor', icon: '🔴' },
  PHYSICAL:  { label: 'Físico', icon: '💊' },
  EMOTIONAL: { label: 'Emocional', icon: '💜' },
  DIGESTIVE: { label: 'Digestivo', icon: '🫧' },
  SKIN:      { label: 'Piel', icon: '✨' },
  ENERGY:    { label: 'Energía', icon: '⚡' },
  SLEEP:     { label: 'Sueño', icon: '🌙' },
  OTHER:     { label: 'Otro', icon: '📝' },
}

const INTENSITIES = [
  { key: 'MILD', label: 'Leve', color: Colors.gold.main },
  { key: 'MODERATE', label: 'Moderado', color: Colors.rose[500] },
  { key: 'SEVERE', label: 'Severo', color: '#ef4444' },
]

const ENERGY_LEVELS = ['😫', '😔', '😐', '😊', '⚡']
const SLEEP_LABELS = ['Muy mal', 'Mal', 'Regular', 'Bien', 'Excelente']

export default function SymptomsScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const today = dayjs().format('YYYY-MM-DD')

  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [moodIntensity, setMoodIntensity] = useState(3)
  const [selectedSymptoms, setSelectedSymptoms] = useState<Record<string, string>>({}) // symptomId -> intensity
  const [energyLevel, setEnergyLevel] = useState(3)
  const [sleepHours, setSleepHours] = useState('7')
  const [sleepQuality, setSleepQuality] = useState(3)
  const [notes, setNotes] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const { data: symptoms } = useQuery({
    queryKey: ['symptoms'],
    queryFn: () => apiClient.get('/symptoms').then((r) => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises = []

      if (selectedMood) {
        promises.push(apiClient.post('/symptoms/mood', {
          date: today,
          mood: selectedMood,
          intensity: moodIntensity,
          notes,
        }))
      }

      for (const [symptomId, intensity] of Object.entries(selectedSymptoms)) {
        promises.push(apiClient.post('/symptoms/log', {
          date: today,
          symptomId,
          intensity,
        }))
      }

      promises.push(apiClient.post('/symptoms/daily-log', {
        date: today,
        energyLevel,
        sleepHours: parseFloat(sleepHours),
        sleepQuality,
        notes,
      }))

      await Promise.all(promises)
    },
    onSuccess: () => {
      setSaved(true)
      queryClient.invalidateQueries({ queryKey: ['cycles', 'current'] })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTimeout(() => router.back(), 1500)
    },
  })

  const grouped = symptoms?.reduce((acc: Record<string, any[]>, s: any) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {}) ?? {}

  const toggleSymptom = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedSymptoms((prev) => {
      if (prev[id]) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: 'MODERATE' }
    })
  }

  const setSymptomIntensity = (id: string, intensity: string) => {
    setSelectedSymptoms((prev) => ({ ...prev, [id]: intensity }))
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.dark.surface, Colors.dark.bg]} style={styles.header}>
        <Text style={styles.headerTitle}>¿Cómo te sientes hoy? 🌙</Text>
        <Text style={styles.headerSub}>{dayjs().format('dddd, D [de] MMMM')}</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ─── Mood ────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(0)} style={styles.section}>
          <Text style={styles.sectionTitle}>Estado de ánimo</Text>
          <View style={styles.moodGrid}>
            {MOODS.map((mood) => (
              <TouchableOpacity
                key={mood.key}
                style={[styles.moodBtn, selectedMood === mood.key && styles.moodBtnSelected]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setSelectedMood(mood.key === selectedMood ? null : mood.key)
                }}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={[styles.moodLabel, selectedMood === mood.key && styles.moodLabelSelected]}>
                  {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedMood && (
            <Animated.View entering={ZoomIn} style={styles.intensityRow}>
              <Text style={styles.intensityTitle}>Intensidad</Text>
              <View style={styles.intensityBtns}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.intensityBtn, moodIntensity === i && styles.intensityBtnActive]}
                    onPress={() => setMoodIntensity(i)}
                  >
                    <Text style={styles.intensityBtnText}>{i}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}
        </Animated.View>

        {/* ─── Energy & Sleep ──────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <Text style={styles.sectionTitle}>Energía y descanso</Text>

          <View style={styles.card}>
            <Text style={styles.cardSubTitle}>Nivel de energía</Text>
            <View style={styles.emojiScale}>
              {ENERGY_LEVELS.map((emoji, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setEnergyLevel(i + 1)}
                  style={[styles.scaleBtn, energyLevel === i + 1 && styles.scaleBtnActive]}
                >
                  <Text style={styles.scaleEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.cardSubTitle, { marginTop: Spacing.md }]}>Horas de sueño</Text>
            <View style={styles.sleepRow}>
              <TouchableOpacity onPress={() => setSleepHours((h) => String(Math.max(0, parseFloat(h) - 0.5)))}>
                <Text style={styles.sleepBtn}>−</Text>
              </TouchableOpacity>
              <Text style={styles.sleepValue}>{sleepHours}h</Text>
              <TouchableOpacity onPress={() => setSleepHours((h) => String(Math.min(24, parseFloat(h) + 0.5)))}>
                <Text style={styles.sleepBtn}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.cardSubTitle, { marginTop: Spacing.md }]}>Calidad del sueño</Text>
            <View style={styles.qualityRow}>
              {SLEEP_LABELS.map((label, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.qualityBtn, sleepQuality === i + 1 && styles.qualityBtnActive]}
                  onPress={() => setSleepQuality(i + 1)}
                >
                  <Text style={styles.qualityBtnText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ─── Symptoms ────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Síntomas físicos</Text>

          {/* Category tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <TouchableOpacity
              style={[styles.categoryTab, activeCategory === null && styles.categoryTabActive]}
              onPress={() => setActiveCategory(null)}
            >
              <Text style={styles.categoryTabText}>Todos</Text>
            </TouchableOpacity>
            {Object.entries(SYMPTOM_CATEGORIES).map(([key, cat]) => (
              <TouchableOpacity
                key={key}
                style={[styles.categoryTab, activeCategory === key && styles.categoryTabActive]}
                onPress={() => setActiveCategory(key === activeCategory ? null : key)}
              >
                <Text style={styles.categoryTabText}>{cat.icon} {cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.symptomsGrid}>
            {Object.entries(grouped)
              .filter(([cat]) => !activeCategory || cat === activeCategory)
              .flatMap(([, items]) => items as any[])
              .map((symptom: any) => {
                const isSelected = !!selectedSymptoms[symptom.id]
                const currentIntensity = selectedSymptoms[symptom.id]
                return (
                  <View key={symptom.id} style={styles.symptomWrapper}>
                    <TouchableOpacity
                      style={[styles.symptomBtn, isSelected && styles.symptomBtnSelected]}
                      onPress={() => toggleSymptom(symptom.id)}
                    >
                      <Text style={styles.symptomEmoji}>{symptom.icon}</Text>
                      <Text style={[styles.symptomLabel, isSelected && styles.symptomLabelSelected]}>
                        {symptom.nameEs}
                      </Text>
                      {isSelected && (
                        <View style={[styles.checkBadge]}>
                          <Text style={styles.checkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {isSelected && (
                      <Animated.View entering={ZoomIn} style={styles.intensityRow}>
                        {INTENSITIES.map((int) => (
                          <TouchableOpacity
                            key={int.key}
                            onPress={() => setSymptomIntensity(symptom.id, int.key)}
                            style={[
                              styles.smallIntBtn,
                              { borderColor: int.color },
                              currentIntensity === int.key && { backgroundColor: int.color },
                            ]}
                          >
                            <Text style={styles.smallIntText}>{int.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </Animated.View>
                    )}
                  </View>
                )
              })}
          </View>
        </Animated.View>

        {/* ─── Notes ───────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Notas (opcional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="¿Algo más que quieras registrar?"
            placeholderTextColor={Colors.dark.muted}
            multiline
            maxLength={500}
          />
        </Animated.View>
      </ScrollView>

      {/* ─── Save button ───────────────────────────────── */}
      <View style={[styles.saveContainer, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.saveBtnSuccess]}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || saved}
        >
          <LinearGradient
            colors={saved ? ['#10b981', '#059669'] : [Colors.primary[600], Colors.lavender[500]]}
            style={styles.saveBtnGradient}
          >
            <Text style={styles.saveBtnText}>
              {saved ? '✓ ¡Guardado! +10 XP' : saveMutation.isPending ? 'Guardando...' : 'Guardar registro de hoy'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.border,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.text, textAlign: 'center',
  },
  headerSub: {
    fontSize: Typography.fontSize.sm, color: Colors.dark.muted,
    textAlign: 'center', textTransform: 'capitalize', marginTop: 4,
  },
  section: { paddingHorizontal: Spacing.md, marginTop: Spacing.xl },
  sectionTitle: {
    fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.text, marginBottom: Spacing.md,
  },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  moodBtn: {
    width: 70, alignItems: 'center', backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  moodBtnSelected: { borderColor: Colors.lavender[400], backgroundColor: Colors.lavender[500] + '30' },
  moodEmoji: { fontSize: 24, marginBottom: 4 },
  moodLabel: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted, textAlign: 'center' },
  moodLabelSelected: { color: Colors.lavender[300] },
  intensityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  intensityTitle: { fontSize: Typography.fontSize.sm, color: Colors.dark.muted },
  intensityBtns: { flexDirection: 'row', gap: 6 },
  intensityBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.dark.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.dark.border,
  },
  intensityBtnActive: { backgroundColor: Colors.primary[500], borderColor: Colors.primary[400] },
  intensityBtnText: { fontSize: Typography.fontSize.sm, color: Colors.dark.text },
  card: {
    backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border,
  },
  cardSubTitle: {
    fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium,
    color: Colors.dark.muted, marginBottom: Spacing.sm,
  },
  emojiScale: { flexDirection: 'row', gap: Spacing.md },
  scaleBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.dark.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  scaleBtnActive: { backgroundColor: Colors.primary[600] + '40', borderWidth: 2, borderColor: Colors.primary[400] },
  scaleEmoji: { fontSize: 24 },
  sleepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl },
  sleepBtn: { fontSize: 28, color: Colors.lavender[300], fontFamily: Typography.fontFamily.bold },
  sleepValue: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: Colors.dark.text },
  qualityRow: { flexDirection: 'row', gap: 4 },
  qualityBtn: {
    flex: 1, paddingVertical: 6, borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.surface, alignItems: 'center',
  },
  qualityBtnActive: { backgroundColor: Colors.lavender[600] },
  qualityBtnText: { fontSize: 9, color: Colors.dark.muted, textAlign: 'center' },
  categoryScroll: { marginBottom: Spacing.md },
  categoryTab: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: BorderRadius.full, backgroundColor: Colors.dark.card,
    marginRight: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.border,
  },
  categoryTabActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[400] },
  categoryTabText: { fontSize: Typography.fontSize.xs, color: Colors.dark.text },
  symptomsGrid: { gap: Spacing.sm },
  symptomWrapper: { gap: 6 },
  symptomBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.dark.card, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border,
  },
  symptomBtnSelected: { borderColor: Colors.lavender[400], backgroundColor: Colors.lavender[500] + '20' },
  symptomEmoji: { fontSize: 20 },
  symptomLabel: { flex: 1, fontSize: Typography.fontSize.base, color: Colors.dark.text },
  symptomLabelSelected: { color: Colors.lavender[300] },
  checkBadge: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.lavender[500],
    alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 10, fontFamily: Typography.fontFamily.bold },
  smallIntBtn: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full,
    borderWidth: 1, marginLeft: 36,
  },
  smallIntText: { fontSize: 10, color: Colors.dark.text },
  notesInput: {
    backgroundColor: Colors.dark.card, borderRadius: BorderRadius.lg,
    padding: Spacing.md, color: Colors.dark.text, fontSize: Typography.fontSize.base,
    minHeight: 80, borderWidth: 1, borderColor: Colors.dark.border,
    fontFamily: Typography.fontFamily.regular, textAlignVertical: 'top',
  },
  saveContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.md, backgroundColor: Colors.dark.bg + 'E0',
  },
  saveBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  saveBtnSuccess: {},
  saveBtnGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  saveBtnText: {
    color: '#fff', fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
  },
})
