import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'

import { useCycleStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal'

const PHASE_DATA: Record<Phase, {
  label: string
  emoji: string
  gradient: readonly [string, string]
  subtitle: string
  foods: { emoji: string; name: string; benefit: string }[]
  exercises: { emoji: string; name: string; intensity: string; desc: string }[]
  recipes: { name: string; emoji: string; ingredients: string; prep: string }[]
  avoid: string[]
}> = {
  menstrual: {
    label: 'Fase Menstrual',
    emoji: '🌑',
    gradient: ['#7c3aed', '#db2777'],
    subtitle: 'Descansa, nutre y cuídate',
    foods: [
      { emoji: '🥬', name: 'Espinacas y verduras de hoja', benefit: 'Reponen hierro perdido' },
      { emoji: '🍫', name: 'Chocolate negro (+70%)', benefit: 'Magnesio para calambres' },
      { emoji: '🫐', name: 'Arándanos', benefit: 'Antioxidantes antiinflamatorios' },
      { emoji: '🐟', name: 'Salmón', benefit: 'Omega-3 reduce inflamación' },
      { emoji: '🫚', name: 'Jengibre', benefit: 'Alivia náuseas y calambres' },
      { emoji: '🍊', name: 'Cítricos con vitamina C', benefit: 'Mejora absorción del hierro' },
    ],
    exercises: [
      { emoji: '🧘', name: 'Yoga suave', intensity: 'Baja', desc: 'Posturas restaurativas, yin yoga' },
      { emoji: '🚶', name: 'Caminata ligera', intensity: 'Baja', desc: '20–30 min al aire libre' },
      { emoji: '🌊', name: 'Natación suave', intensity: 'Baja', desc: 'Alivia calambres y tensión' },
      { emoji: '😴', name: 'Descanso activo', intensity: 'Mínima', desc: 'Estiramientos suaves en casa' },
    ],
    recipes: [
      {
        name: 'Té de jengibre y cúrcuma',
        emoji: '🫖',
        ingredients: 'Jengibre fresco, cúrcuma, limón, miel',
        prep: 'Hierve 2 cm de jengibre rallado en agua 10 min. Añade cúrcuma y miel al gusto.',
      },
      {
        name: 'Bowl de espinacas con huevo',
        emoji: '🥗',
        ingredients: 'Espinacas baby, huevo pochado, aguacate, semillas de girasol',
        prep: 'Saltea espinacas 2 min. Coloca huevo pochado encima y añade aguacate en rodajas.',
      },
    ],
    avoid: ['Cafeína en exceso', 'Alcohol', 'Alimentos muy salados (hinchazón)', 'Azúcar refinado'],
  },
  follicular: {
    label: 'Fase Folicular',
    emoji: '🌒',
    gradient: ['#8b5cf6', '#a855f7'],
    subtitle: 'Aprovecha tu energía creciente',
    foods: [
      { emoji: '🥦', name: 'Brócoli y crucíferas', benefit: 'Equilibran estrógeno' },
      { emoji: '🌰', name: 'Semillas de lino', benefit: 'Fitoestrógenos naturales' },
      { emoji: '🥚', name: 'Huevos', benefit: 'Proteína y colina para energía' },
      { emoji: '🍎', name: 'Manzanas', benefit: 'Fibra prebiótica' },
      { emoji: '🫘', name: 'Legumbres', benefit: 'Zinc y folato para fertilidad' },
      { emoji: '🌿', name: 'Brotes y germinados', benefit: 'Enzimas vivos y nutrientes' },
    ],
    exercises: [
      { emoji: '🏃', name: 'Cardio moderado', intensity: 'Media', desc: 'Running, ciclismo, HIIT moderado' },
      { emoji: '💪', name: 'Entrenamiento de fuerza', intensity: 'Media-Alta', desc: 'Buen momento para nuevos retos' },
      { emoji: '🤸', name: 'Pilates', intensity: 'Media', desc: 'Fortalece el núcleo y la postura' },
      { emoji: '🏊', name: 'Natación', intensity: 'Media', desc: 'Full-body, bajo impacto' },
    ],
    recipes: [
      {
        name: 'Smoothie energizante',
        emoji: '🥤',
        ingredients: 'Manzana, espinacas, jengibre, plátano, semillas de lino',
        prep: 'Licúa todos los ingredientes con agua de coco. Añade semillas al final.',
      },
      {
        name: 'Buddha bowl primaveral',
        emoji: '🥙',
        ingredients: 'Arroz integral, garbanzos asados, brócoli al vapor, aguacate, tahini',
        prep: 'Mezcla la base de arroz. Coloca ingredientes en secciones. Aliña con tahini y limón.',
      },
    ],
    avoid: ['Exceso de grasas saturadas', 'Ultra-procesados', 'Alcohol frecuente'],
  },
  ovulatory: {
    label: 'Fase Ovulatoria',
    emoji: '🌕',
    gradient: ['#059669', '#10b981'],
    subtitle: 'Pico de energía — ¡aprovéchalo!',
    foods: [
      { emoji: '🥗', name: 'Ensaladas con hojas verdes', benefit: 'Antioxidantes para el óvulo' },
      { emoji: '🫐', name: 'Frutas del bosque', benefit: 'Vitamina C y antioxidantes' },
      { emoji: '🐟', name: 'Pescado azul', benefit: 'Omega-3 apoya la fertilidad' },
      { emoji: '🥕', name: 'Zanahorias y betacarotenos', benefit: 'Progesterona natural' },
      { emoji: '🫚', name: 'Aceite de oliva virgen extra', benefit: 'Grasas saludables para hormonas' },
      { emoji: '🍒', name: 'Cerezas', benefit: 'Antiinflamatorio natural' },
    ],
    exercises: [
      { emoji: '🔥', name: 'HIIT', intensity: 'Alta', desc: 'Tu cuerpo está en su máximo rendimiento' },
      { emoji: '🏋️', name: 'Fuerza máxima', intensity: 'Alta', desc: 'Levanta más peso, explota la testosterona' },
      { emoji: '⚽', name: 'Deportes en equipo', intensity: 'Alta', desc: 'Social y energético — ideal ahora' },
      { emoji: '🚴', name: 'Spinning', intensity: 'Alta', desc: 'Cardio intenso, gran quema calórica' },
    ],
    recipes: [
      {
        name: 'Ensalada de salmón y aguacate',
        emoji: '🥗',
        ingredients: 'Salmón a la plancha, aguacate, pepino, rúcula, limón, aceite de oliva',
        prep: 'Mezcla rúcula con pepino y aguacate. Coloca salmón encima. Aliña con limón y AOVE.',
      },
      {
        name: 'Batido de fertilidad',
        emoji: '🥤',
        ingredients: 'Granada, espinacas, jengibre, maca en polvo, leche de almendras',
        prep: 'Licúa todo. La maca apoya el equilibrio hormonal en la ovulación.',
      },
    ],
    avoid: ['Exceso de cafeína (reduce fertilidad)', 'Ultraprocesados', 'Azúcar en exceso'],
  },
  luteal: {
    label: 'Fase Lútea',
    emoji: '🌗',
    gradient: ['#d97706', '#f59e0b'],
    subtitle: 'Autocuidado y antiinflamación',
    foods: [
      { emoji: '🍫', name: 'Chocolate negro', benefit: 'Serotonina — reduce SPM' },
      { emoji: '🥜', name: 'Nueces y almendras', benefit: 'Vitamina E para dolor de pecho' },
      { emoji: '🌿', name: 'Menta y manzanilla', benefit: 'Calmante natural, reduce hinchazón' },
      { emoji: '🍠', name: 'Boniato y carbohidratos complejos', benefit: 'Estabilizan azúcar y humor' },
      { emoji: '🥑', name: 'Aguacate', benefit: 'Potasio reduce retención de líquidos' },
      { emoji: '🌰', name: 'Semillas de girasol', benefit: 'Vitamina B6 reduce SPM' },
    ],
    exercises: [
      { emoji: '🧘', name: 'Yoga y meditación', intensity: 'Baja-Media', desc: 'Reduce cortisol y ansiedad del SPM' },
      { emoji: '🚶', name: 'Caminatas en naturaleza', intensity: 'Baja', desc: 'Mejora el humor y reduce ansiedad' },
      { emoji: '🤸', name: 'Pilates suave', intensity: 'Media', desc: 'Fortalece sin sobrecargar' },
      { emoji: '🏊', name: 'Natación relajante', intensity: 'Baja-Media', desc: 'Alivia tensión muscular y retención' },
    ],
    recipes: [
      {
        name: 'Porridge antiSPM',
        emoji: '🥣',
        ingredients: 'Avena, leche de avena, plátano, canela, semillas de chía, almendras',
        prep: 'Cocina avena con leche. Añade plátano en rodajas, chía y almendras. Espolvorea canela.',
      },
      {
        name: 'Infusión calmante',
        emoji: '🫖',
        ingredients: 'Manzanilla, melissa, lavanda, miel',
        prep: 'Infusiona 3–5 min. Añade miel al gusto. Bebe antes de dormir.',
      },
    ],
    avoid: ['Sal en exceso (hinchazón)', 'Cafeína (ansiedad e insomnio)', 'Azúcar simple', 'Alcohol'],
  },
}

export default function PhaseTipsScreen() {
  const insets = useSafeAreaInsets()
  const { currentPhase } = useCycleStore()
  const [activePhase, setActivePhase] = useState<Phase>(currentPhase as Phase ?? 'follicular')
  const [activeTab, setActiveTab] = useState<'foods' | 'exercise' | 'recipes'>('foods')

  const data = PHASE_DATA[activePhase]

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recetas y ejercicio por fase</Text>
      </View>

      {/* Phase selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phaseScroll} contentContainerStyle={styles.phaseScrollContent}>
        {(Object.keys(PHASE_DATA) as Phase[]).map((ph) => (
          <TouchableOpacity
            key={ph}
            onPress={() => setActivePhase(ph)}
            style={[styles.phaseTab, activePhase === ph && styles.phaseTabActive]}
          >
            <Text style={styles.phaseTabEmoji}>{PHASE_DATA[ph].emoji}</Text>
            <Text style={[styles.phaseTabText, activePhase === ph && styles.phaseTabTextActive]}>
              {PHASE_DATA[ph].label.replace('Fase ', '')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Phase hero */}
        <Animated.View key={activePhase} entering={FadeInDown.delay(0)}>
          <LinearGradient colors={[...data.gradient] as [string, string]} style={styles.phaseHero}>
            <Text style={styles.phaseHeroEmoji}>{data.emoji}</Text>
            <Text style={styles.phaseHeroTitle}>{data.label}</Text>
            <Text style={styles.phaseHeroSub}>{data.subtitle}</Text>
            {activePhase === currentPhase && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>📍 Tu fase actual</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Tab selector */}
        <View style={styles.tabRow}>
          {([
            { key: 'foods', label: '🥗 Alimentos' },
            { key: 'exercise', label: '💪 Ejercicio' },
            { key: 'recipes', label: '🍳 Recetas' },
          ] as const).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'foods' && (
          <Animated.View entering={FadeInDown.delay(0)} style={styles.section}>
            <View style={styles.card}>
              {data.foods.map((food, i) => (
                <View key={i} style={[styles.itemRow, i < data.foods.length - 1 && styles.itemRowBorder]}>
                  <Text style={styles.itemEmoji}>{food.emoji}</Text>
                  <View style={styles.itemText}>
                    <Text style={styles.itemTitle}>{food.name}</Text>
                    <Text style={styles.itemDesc}>{food.benefit}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Text style={styles.avoidTitle}>⚠️ Evitar o reducir</Text>
            <View style={styles.card}>
              {data.avoid.map((item, i) => (
                <Text key={i} style={styles.avoidItem}>✗  {item}</Text>
              ))}
            </View>
          </Animated.View>
        )}

        {activeTab === 'exercise' && (
          <Animated.View entering={FadeInDown.delay(0)} style={styles.section}>
            {data.exercises.map((ex, i) => (
              <View key={i} style={styles.exerciseCard}>
                <Text style={styles.exerciseEmoji}>{ex.emoji}</Text>
                <View style={styles.exerciseText}>
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <View style={[
                      styles.intensityBadge,
                      ex.intensity.includes('Alta') ? styles.intensityHigh
                        : ex.intensity.includes('Baja') ? styles.intensityLow
                        : styles.intensityMed,
                    ]}>
                      <Text style={styles.intensityText}>{ex.intensity}</Text>
                    </View>
                  </View>
                  <Text style={styles.exerciseDesc}>{ex.desc}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {activeTab === 'recipes' && (
          <Animated.View entering={FadeInDown.delay(0)} style={styles.section}>
            {data.recipes.map((recipe, i) => (
              <View key={i} style={styles.recipeCard}>
                <Text style={styles.recipeEmoji}>{recipe.emoji}</Text>
                <Text style={styles.recipeName}>{recipe.name}</Text>
                <Text style={styles.recipeLabel}>🧺 Ingredientes</Text>
                <Text style={styles.recipeText}>{recipe.ingredients}</Text>
                <Text style={styles.recipeLabel}>👩‍🍳 Preparación</Text>
                <Text style={styles.recipeText}>{recipe.prep}</Text>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { marginBottom: 6 },
  backBtnText: { color: Colors.lavender[300], fontSize: Typography.fontSize.sm },
  headerTitle: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  phaseScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  phaseScrollContent: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  phaseTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  phaseTabActive: { backgroundColor: 'rgba(139,92,246,0.3)', borderColor: Colors.primary[500] },
  phaseTabEmoji: { fontSize: 16 },
  phaseTabText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  phaseTabTextActive: { color: '#fff', fontFamily: Typography.fontFamily.medium },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.md },
  phaseHero: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    alignItems: 'center', gap: Spacing.sm,
  },
  phaseHeroEmoji: { fontSize: 48 },
  phaseHeroTitle: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: '#fff' },
  phaseHeroSub: { fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.8)' },
  currentBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 4, marginTop: 4,
  },
  currentBadgeText: { color: '#fff', fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.medium },
  tabRow: { flexDirection: 'row', gap: Spacing.sm },
  tab: {
    flex: 1, paddingVertical: Spacing.sm, alignItems: 'center',
    borderRadius: BorderRadius.lg, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  tabActive: { backgroundColor: 'rgba(139,92,246,0.25)', borderColor: Colors.primary[500] },
  tabText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  tabTextActive: { color: '#fff', fontFamily: Typography.fontFamily.medium },
  section: { gap: Spacing.sm },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    gap: Spacing.sm,
  },
  itemRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  itemRowBorder: { paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  itemEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
  itemText: { flex: 1, gap: 2 },
  itemTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium, color: '#e9d5ff' },
  itemDesc: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  avoidTitle: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, color: '#fde68a', marginTop: 4 },
  avoidItem: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.55)', lineHeight: 22 },
  exerciseCard: {
    flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  exerciseEmoji: { fontSize: 28, width: 36, textAlign: 'center' },
  exerciseText: { flex: 1, gap: 4 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  exerciseName: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium, color: '#e9d5ff' },
  intensityBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  intensityHigh: { backgroundColor: 'rgba(239,68,68,0.25)' },
  intensityMed: { backgroundColor: 'rgba(251,191,36,0.25)' },
  intensityLow: { backgroundColor: 'rgba(34,197,94,0.25)' },
  intensityText: { fontSize: 10, color: '#fff', fontFamily: Typography.fontFamily.medium },
  exerciseDesc: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  recipeCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    gap: Spacing.sm,
  },
  recipeEmoji: { fontSize: 36, textAlign: 'center', marginBottom: 4 },
  recipeName: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, color: '#fff', textAlign: 'center' },
  recipeLabel: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, color: Colors.lavender[300], marginTop: 4 },
  recipeText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.65)', lineHeight: 20 },
})
