import React, { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch, TextInput, Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { router, useLocalSearchParams } from 'expo-router'

import apiClient from '@/api/client'
import { useSettingsStore, useSymptomStore, useCycleStore, useGardenStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/theme'

const MUCUS_OPTIONS = [
  { key: 'seco', label: '🌵 Seco', desc: 'Sin flujo visible' },
  { key: 'cremoso', label: '🤍 Cremoso', desc: 'Blanco opaco' },
  { key: 'acuoso', label: '💧 Acuoso', desc: 'Transparente, húmedo' },
  { key: 'elástico', label: '🌿 Elástico', desc: 'Clara de huevo — fértil' },
] as const

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

const SKIN_OPTIONS = [
  { key: 'normal',    label: 'Normal',    emoji: '✨' },
  { key: 'acne',      label: 'Acné',      emoji: '🔴' },
  { key: 'oily',      label: 'Grasa',     emoji: '💦' },
  { key: 'dry',       label: 'Seca',      emoji: '🏜️' },
  { key: 'sensitive', label: 'Sensible',  emoji: '🌸' },
  { key: 'glowing',   label: 'Radiante',  emoji: '⭐' },
]

const PERIOD_INTENSITIES = [
  { key: 'spotting', label: 'Manchado', emoji: '🩸', color: '#fca5a5' },
  { key: 'light',    label: 'Ligero',   emoji: '🩸🩸', color: '#f87171' },
  { key: 'medium',   label: 'Moderado', emoji: '🩸🩸🩸', color: '#ef4444' },
  { key: 'heavy',    label: 'Abundante', emoji: '🩸🩸🩸🩸', color: '#b91c1c' },
]

export default function SymptomsScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>()
  const targetDate = dateParam ?? dayjs().format('YYYY-MM-DD')
  const isToday = targetDate === dayjs().format('YYYY-MM-DD')

  // Period tracking
  const [isPeriod, setIsPeriod] = useState(false)
  const [periodIntensity, setPeriodIntensity] = useState('medium')

  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [moodIntensity, setMoodIntensity] = useState(3)
  const [selectedSymptoms, setSelectedSymptoms] = useState<Record<string, string>>({}) // symptomId -> intensity
  const [energyLevel, setEnergyLevel] = useState(3)
  const [sleepHours, setSleepHours] = useState('7')
  const [sleepQuality, setSleepQuality] = useState(3)
  const [notes, setNotes] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const { ttcMode } = useSettingsStore()
  const { updateLog, deleteLog, getLogForDate } = useSymptomStore()
  const { currentPhase } = useCycleStore()

  // Detect existing log and pre-fill
  const existingLog = getLogForDate(targetDate)
  const isEditing = !!existingLog

  useEffect(() => {
    // Reset all fields to defaults first (handles switching between days)
    setIsPeriod(false)
    setPeriodIntensity('medium')
    setSelectedMood(null)
    setMoodIntensity(3)
    setSelectedSymptoms({})
    setEnergyLevel(3)
    setSleepHours('7')
    setSleepQuality(3)
    setNotes('')
    setActiveCategory(null)
    setSaved(false)
    setBbt('')
    setMucus(null)
    setHadSex(false)
    setSexProtected(null)
    setOrgasm(null)
    setDesireLevel(null)
    setWeight('')
    setWater(0)
    setMedicationPill(false)
    setSelectedSkin(null)
    setHasMigraine(false)
    setMigraineIntensity('moderada')

    if (!existingLog) return
    if (existingLog.phase === 'menstrual') setIsPeriod(true)
    if (existingLog.mood) setSelectedMood(existingLog.mood)
    if (existingLog.energy) {
      const map: Record<string, number> = { alta: 5, media: 3, baja: 1 }
      setEnergyLevel(map[existingLog.energy] ?? 3)
    }
    if (existingLog.sleep) {
      setSleepHours(String(existingLog.sleep.hours))
      const qmap: Record<string, number> = { bueno: 4, regular: 3, malo: 2 }
      setSleepQuality(qmap[existingLog.sleep.quality] ?? 3)
    }
    if (existingLog.symptoms.length > 0) {
      const symMap: Record<string, string> = {}
      existingLog.symptoms.forEach((id) => { symMap[id] = 'MODERATE' })
      setSelectedSymptoms(symMap)
    }
    if (existingLog.notes) setNotes(existingLog.notes)
    if ((existingLog as any).skin) setSelectedSkin((existingLog as any).skin)
    if ((existingLog as any).migraine) setHasMigraine(true)
    if ((existingLog as any).flowIntensity) setPeriodIntensity((existingLog as any).flowIntensity)
    if (existingLog.water) setWater(existingLog.water)
    if (existingLog.weight) setWeight(String(existingLog.weight))
    if (existingLog.medications?.pill) setMedicationPill(true)
    if (existingLog.bbt) setBbt(String(existingLog.bbt))
    if (existingLog.mucus) setMucus(existingLog.mucus)
    if (existingLog.intimacy) {
      setHadSex(existingLog.intimacy.hadSex)
      setSexProtected(existingLog.intimacy.protected)
      setOrgasm(existingLog.intimacy.orgasm)
      setDesireLevel(existingLog.intimacy.desireLevel)
    }
  }, [targetDate])
  const { xp, crystalBalance, level, setGarden } = useGardenStore()
  // Capture whether log existed BEFORE this screen opened, to avoid giving XP on edits
  const isNewLog = !existingLog
  const [bbt, setBbt] = useState('')
  const [mucus, setMucus] = useState<string | null>(null)
  // Intimacy
  const [hadSex, setHadSex] = useState(false)
  const [sexProtected, setSexProtected] = useState<boolean | null>(null)
  const [orgasm, setOrgasm] = useState<boolean | null>(null)
  const [desireLevel, setDesireLevel] = useState<number | null>(null)
  // Wellness
  const [weight, setWeight] = useState('')
  const [water, setWater] = useState(0)
  const [medicationPill, setMedicationPill] = useState(false)
  const [selectedSkin, setSelectedSkin] = useState<string | null>(null)
  const [hasMigraine, setHasMigraine] = useState(false)
  const [migraineIntensity, setMigraineIntensity] = useState<'leve' | 'moderada' | 'severa'>('moderada')

  const { data: symptoms } = useQuery({
    queryKey: ['symptoms'],
    queryFn: () => apiClient.get('/symptoms').then((r) => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises: Promise<any>[] = []

      if (selectedMood) {
        promises.push(apiClient.post('/symptoms/mood', {
          date: targetDate,
          mood: selectedMood,
          intensity: moodIntensity,
          notes,
        }))
      }

      for (const [symptomId, intensity] of Object.entries(selectedSymptoms)) {
        promises.push(apiClient.post('/symptoms/log', {
          date: targetDate,
          symptomId,
          intensity,
        }))
      }

      promises.push(apiClient.post('/symptoms/daily-log', {
        date: targetDate,
        energyLevel,
        sleepHours: parseFloat(sleepHours),
        sleepQuality,
        notes,
      }))

      await Promise.allSettled(promises)
    },
    onSuccess: () => {
      // Save locally (works offline too)
      const energyMap: Record<number, 'alta' | 'media' | 'baja'> = { 5: 'alta', 4: 'alta', 3: 'media', 2: 'baja', 1: 'baja' }
      const sleepQualityMap: Record<number, 'bueno' | 'regular' | 'malo'> = { 5: 'bueno', 4: 'bueno', 3: 'regular', 2: 'malo', 1: 'malo' }
      updateLog(targetDate, isPeriod ? 'menstrual' : currentPhase ?? null, {
        mood: selectedMood,
        energy: energyMap[energyLevel] ?? 'media',
        symptoms: Object.keys(selectedSymptoms),
        phase: isPeriod ? 'menstrual' : currentPhase ?? null,
        bbt: bbt ? parseFloat(bbt) : null,
        mucus: mucus as any,
        notes,
        intimacy: hadSex ? { hadSex, protected: sexProtected, orgasm, desireLevel } : null,
        sleep: { hours: parseFloat(sleepHours), quality: sleepQualityMap[sleepQuality] ?? 'regular' },
        water: water || null,
        weight: weight ? parseFloat(weight) : null,
        medications: medicationPill ? { pill: medicationPill, other: '' } : null,
        skin: selectedSkin,
        migraine: hasMigraine || null,
        flowIntensity: isPeriod ? periodIntensity : null,
      })
      // XP + cristales solo en registros nuevos del día de hoy
      if (isNewLog && isToday) {
        const gainedXp = 15
        const newXp = xp + gainedXp
        const newLevel = Math.floor(newXp / 200) + 1
        setGarden({ xp: newXp, level: newLevel, crystalBalance: crystalBalance + 5 })
      }
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isToday ? '¿Cómo te sientes hoy? 🌙' : '¿Cómo te sentiste? 🌙'}
        </Text>
        <Text style={styles.headerSub}>
          {dayjs(targetDate).format('dddd, D [de] MMMM')}
        </Text>
        {isEditing && (
          <View style={styles.editingBadge}>
            <Text style={styles.editingBadgeText}>✏️ Editando registro guardado</Text>
          </View>
        )}

        {/* ─── Top action bar ───────────────────────────── */}
        <View style={styles.topActionBar}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={styles.topDeleteBtn}
                onPress={() => {
                  Alert.alert(
                    'Borrar registro',
                    `¿Borrar el registro del ${dayjs(targetDate).format('D [de] MMMM')}?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Borrar', style: 'destructive',
                        onPress: () => {
                          deleteLog(targetDate)
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
                          router.back()
                        },
                      },
                    ]
                  )
                }}
              >
                <Text style={styles.topDeleteText}>🗑️ Borrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.topSaveBtn}
                onPress={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || saved}
              >
                <Text style={styles.topSaveText}>
                  {saved ? '✓ Guardado' : saveMutation.isPending ? '...' : '✏️ Guardar cambios'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.topSaveBtn, { flex: 1 }]}
              onPress={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || saved}
            >
              <Text style={styles.topSaveText}>
                {saved ? '✓ ¡Guardado!' : saveMutation.isPending ? 'Guardando...' : '💾 Guardar registro'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ─── Período ─────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(0)} style={styles.section}>
          <TouchableOpacity
            style={[styles.periodToggle, isPeriod && styles.periodToggleActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              setIsPeriod(!isPeriod)
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.periodToggleEmoji}>🩸</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.periodToggleLabel, isPeriod && styles.periodToggleLabelActive]}>
                {isPeriod ? 'Estoy en período' : '¿Estás en período?'}
              </Text>
              {!isPeriod && (
                <Text style={styles.periodToggleSub}>Toca para marcar inicio del período</Text>
              )}
            </View>
            <View style={[styles.periodToggleDot, isPeriod && styles.periodToggleDotActive]} />
          </TouchableOpacity>

          {isPeriod && (
            <Animated.View entering={FadeInDown} style={styles.periodIntensityRow}>
              <Text style={styles.cardSubTitle}>Flujo</Text>
              <View style={styles.periodIntensityBtns}>
                {PERIOD_INTENSITIES.map((pi) => (
                  <TouchableOpacity
                    key={pi.key}
                    style={[
                      styles.periodIntensityBtn,
                      periodIntensity === pi.key && { backgroundColor: pi.color + '40', borderColor: pi.color },
                    ]}
                    onPress={() => setPeriodIntensity(pi.key)}
                  >
                    <Text style={styles.periodIntensityEmoji}>{pi.emoji}</Text>
                    <Text style={[styles.periodIntensityLabel, periodIntensity === pi.key && { color: pi.color }]}>
                      {pi.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}
        </Animated.View>

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

        {/* ─── Piel ────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(280)} style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Piel</Text>
          <View style={styles.moodGrid}>
            {SKIN_OPTIONS.map((opt) => {
              const selected = selectedSkin === opt.key
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.moodBtn, selected && styles.moodBtnSelected]}
                  onPress={() => { Haptics.selectionAsync(); setSelectedSkin(selected ? null : opt.key) }}
                >
                  <Text style={styles.moodEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.moodLabel, selected && styles.moodLabelSelected]}>{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </Animated.View>

        {/* ─── Migraña ─────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(290)} style={styles.section}>
          <Text style={styles.sectionTitle}>🤯 Migraña / Dolor de cabeza</Text>
          <TouchableOpacity
            style={[styles.periodToggle, hasMigraine && { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setHasMigraine(!hasMigraine) }}
          >
            <Text style={styles.periodToggleEmoji}>{hasMigraine ? '🤯' : '🧠'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.periodToggleLabel, hasMigraine && { color: '#f87171' }]}>
                {hasMigraine ? 'Tengo migraña hoy' : '¿Tienes migraña o dolor de cabeza?'}
              </Text>
              {!hasMigraine && <Text style={styles.periodToggleSub}>Toca para registrar</Text>}
            </View>
            <View style={[styles.periodToggleDot, hasMigraine && { backgroundColor: '#ef4444' }]} />
          </TouchableOpacity>
          {hasMigraine && (
            <Animated.View entering={FadeInDown} style={styles.periodIntensityRow}>
              <Text style={styles.cardSubTitle}>Intensidad de la migraña</Text>
              <View style={styles.periodIntensityBtns}>
                {([
                  { key: 'leve', label: 'Leve', color: '#fbbf24' },
                  { key: 'moderada', label: 'Moderada', color: '#f87171' },
                  { key: 'severa', label: 'Severa', color: '#ef4444' },
                ] as const).map((mi) => (
                  <TouchableOpacity
                    key={mi.key}
                    style={[
                      styles.periodIntensityBtn,
                      migraineIntensity === mi.key && { backgroundColor: mi.color + '40', borderColor: mi.color },
                    ]}
                    onPress={() => setMigraineIntensity(mi.key)}
                  >
                    <Text style={[styles.periodIntensityLabel, migraineIntensity === mi.key && { color: mi.color }]}>
                      {mi.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}
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

        {/* ─── Actividad íntima ────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(320)} style={styles.section}>
          <Text style={styles.sectionTitle}>💕 Actividad íntima</Text>
          <Text style={styles.intimacyHint}>Información privada — nunca se comparte</Text>

          <Text style={styles.subLabel}>¿Tuve relaciones hoy?</Text>
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
            <Animated.View entering={ZoomIn} style={{ gap: Spacing.md, marginTop: Spacing.sm }}>
              <View style={styles.intimacyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subLabel}>¿Protegida?</Text>
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
                </View>
              </View>
              <View>
                <Text style={styles.subLabel}>¿Orgasmo?</Text>
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
            </Animated.View>
          )}

          <Text style={[styles.subLabel, { marginTop: Spacing.md }]}>Nivel de deseo</Text>
          <View style={styles.desireRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => { Haptics.selectionAsync(); setDesireLevel(desireLevel === n ? null : n) }}
              >
                <Text style={styles.desireHeart}>{n <= (desireLevel ?? 0) ? '❤️' : '🤍'}</Text>
              </TouchableOpacity>
            ))}
            {desireLevel && (
              <Text style={styles.desireLabel}>
                {['', 'Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto'][desireLevel]}
              </Text>
            )}
          </View>
        </Animated.View>

        {/* ─── Peso, agua y medicamentos ───────────────── */}
        <Animated.View entering={FadeInDown.delay(340)} style={styles.section}>
          <Text style={styles.sectionTitle}>🌿 Bienestar diario</Text>

          <View style={styles.wellnessGrid}>
            {/* Weight */}
            <View style={styles.wellnessCard}>
              <Text style={styles.wellnessLabel}>⚖️ Peso</Text>
              <View style={styles.weightInputRow}>
                <TextInput
                  style={styles.wellnessInput}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="0.0"
                  placeholderTextColor={Colors.dark.muted}
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
                <Text style={styles.wellnessUnit}>kg</Text>
              </View>
            </View>

            {/* Water */}
            <View style={styles.wellnessCard}>
              <Text style={styles.wellnessLabel}>💧 Agua: {water}/8</Text>
              <View style={styles.waterRow}>
                <TouchableOpacity onPress={() => setWater(Math.max(0, water - 1))} style={styles.waterBtn}>
                  <Text style={styles.waterBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.waterValue}>{water}</Text>
                <TouchableOpacity onPress={() => setWater(Math.min(8, water + 1))} style={styles.waterBtn}>
                  <Text style={styles.waterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Medications */}
          <View style={styles.pillRow}>
            <Text style={styles.subLabel}>💊 Tomé anticonceptivo hoy</Text>
            <Switch
              value={medicationPill}
              onValueChange={(v) => { Haptics.selectionAsync(); setMedicationPill(v) }}
              trackColor={{ false: Colors.dark.border, true: Colors.primary[500] }}
              thumbColor="#fff"
            />
          </View>
        </Animated.View>

        {/* ─── TTC Section ─────────────────────────────── */}
        {ttcMode && (
          <Animated.View entering={FadeInDown.delay(350)} style={styles.section}>
            <View style={styles.ttcSectionHeader}>
              <Text style={styles.sectionTitle}>🥚 Fertilidad (TTC)</Text>
              <View style={styles.ttcBadge}><Text style={styles.ttcBadgeText}>Modo activo</Text></View>
            </View>

            <Text style={styles.ttcLabel}>Temperatura basal (°C)</Text>
            <TextInput
              style={styles.bbtInput}
              value={bbt}
              onChangeText={setBbt}
              placeholder="ej. 36.5"
              placeholderTextColor={Colors.dark.muted}
              keyboardType="decimal-pad"
              maxLength={5}
            />

            <Text style={[styles.ttcLabel, { marginTop: Spacing.md }]}>Moco cervical</Text>
            <View style={styles.mucusGrid}>
              {MUCUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.mucusCard, mucus === opt.key && styles.mucusCardActive]}
                  onPress={() => { Haptics.selectionAsync(); setMucus(mucus === opt.key ? null : opt.key) }}
                >
                  <Text style={styles.mucusLabel}>{opt.label}</Text>
                  <Text style={styles.mucusDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>

    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.border,
  },
  backBtn: { marginBottom: 6 },
  backBtnText: { color: Colors.lavender[300], fontSize: Typography.fontSize.sm },
  headerTitle: {
    fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.text, textAlign: 'center',
  },
  headerSub: {
    fontSize: Typography.fontSize.sm, color: Colors.dark.muted,
    textAlign: 'center', textTransform: 'capitalize', marginTop: 4,
  },
  periodToggle: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 2, borderColor: Colors.dark.border,
  },
  periodToggleActive: {
    borderColor: Colors.rose[500], backgroundColor: Colors.rose[500] + '15',
  },
  periodToggleEmoji: { fontSize: 28 },
  periodToggleLabel: {
    fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.text,
  },
  periodToggleLabelActive: { color: Colors.rose[400] },
  periodToggleSub: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted, marginTop: 2 },
  periodToggleDot: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.dark.border,
  },
  periodToggleDotActive: { backgroundColor: Colors.rose[500], borderColor: Colors.rose[500] },
  periodIntensityRow: { marginTop: Spacing.md },
  periodIntensityBtns: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginTop: Spacing.sm },
  periodIntensityBtn: {
    flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: Spacing.sm,
    backgroundColor: Colors.dark.card, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.dark.border,
  },
  periodIntensityEmoji: { fontSize: 16, marginBottom: 2 },
  periodIntensityLabel: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted },
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
  topActionBar: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
  },
  topSaveBtn: {
    flex: 1, backgroundColor: Colors.primary[600], borderRadius: BorderRadius.xl,
    paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
  },
  topSaveText: { color: '#fff', fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold },
  topDeleteBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderRadius: BorderRadius.xl, borderWidth: 1.5, borderColor: Colors.rose[500],
    backgroundColor: Colors.rose[500] + '15', alignItems: 'center', justifyContent: 'center',
  },
  topDeleteText: { color: Colors.rose[400], fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold },
  editingBadge: {
    alignSelf: 'center', marginTop: 6,
    backgroundColor: Colors.lavender[500] + '30', borderRadius: BorderRadius.full,
    paddingHorizontal: 12, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.lavender[500] + '60',
  },
  editingBadgeText: { fontSize: Typography.fontSize.xs, color: Colors.lavender[300] },
  ttcSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  ttcBadge: {
    backgroundColor: Colors.success + '30', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  ttcBadgeText: { fontSize: Typography.fontSize.xs, color: Colors.success, fontFamily: Typography.fontFamily.medium },
  ttcLabel: { fontSize: Typography.fontSize.sm, color: Colors.dark.muted, marginBottom: 8 },
  bbtInput: {
    backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, color: Colors.dark.text,
    fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  mucusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  mucusCard: {
    width: '48%', backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.dark.border,
  },
  mucusCardActive: { borderColor: Colors.success, backgroundColor: Colors.success + '20' },
  mucusLabel: { fontSize: Typography.fontSize.base, color: Colors.dark.text, fontFamily: Typography.fontFamily.medium },
  mucusDesc: { fontSize: Typography.fontSize.xs, color: Colors.dark.muted, marginTop: 2 },
  // Intimacy
  intimacyHint: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.3)', marginBottom: Spacing.sm, lineHeight: 16 },
  subLabel: { fontSize: Typography.fontSize.sm, color: Colors.dark.muted, marginBottom: 8, fontFamily: Typography.fontFamily.medium },
  yesNoRow: { flexDirection: 'row', gap: Spacing.sm },
  yesNoBtn: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xl, alignItems: 'center',
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border,
  },
  yesNoBtnActive: { backgroundColor: Colors.primary[600] + '40', borderColor: Colors.primary[400] },
  yesNoBtnText: { fontSize: Typography.fontSize.base, color: Colors.dark.muted, fontFamily: Typography.fontFamily.medium },
  yesNoBtnTextActive: { color: '#fff' },
  intimacyRow: { gap: Spacing.sm },
  desireRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  desireHeart: { fontSize: 28 },
  desireLabel: { fontSize: Typography.fontSize.sm, color: Colors.lavender[300], marginLeft: 4 },
  // Wellness
  wellnessGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  wellnessCard: {
    flex: 1, backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border, gap: 8,
  },
  wellnessLabel: { fontSize: Typography.fontSize.sm, color: Colors.dark.muted, fontFamily: Typography.fontFamily.medium },
  weightInputRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wellnessInput: {
    flex: 1, color: Colors.dark.text, fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.bold, textAlign: 'center',
  },
  wellnessUnit: { fontSize: Typography.fontSize.sm, color: Colors.dark.muted },
  waterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  waterBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.dark.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.dark.border,
  },
  waterBtnText: { fontSize: 18, color: Colors.lavender[300], fontFamily: Typography.fontFamily.bold },
  waterValue: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: Colors.dark.text },
  pillRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.dark.card, borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border,
  },
})
