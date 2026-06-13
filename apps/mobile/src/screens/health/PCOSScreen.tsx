import React from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import { useSettingsStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

const PCOS_CHANGES = [
  { icon: '📅', title: 'Rango de ciclo ampliado', desc: 'Ciclos de 21–90 días considerados como irregulares (vs 21–35 días normal)' },
  { icon: '🎯', title: 'Predicciones adaptadas', desc: 'Las predicciones de período usan el promedio de tus últimos ciclos sin forzar regularidad' },
  { icon: '📊', title: 'Indicador de irregularidad', desc: 'La app muestra cuándo detecta variación alta entre ciclos' },
  { icon: '🔬', title: 'Síntomas relacionados', desc: 'Acné, exceso de vello, fluctuaciones de peso aparecen resaltados en correlaciones' },
  { icon: '💊', title: 'Recordatorio médico', desc: 'Sugerencia periódica de compartir datos con tu ginecólogo/a o endocrinólogo/a' },
  { icon: '🌙', title: 'Luna IA adaptada', desc: 'Las respuestas de IA toman en cuenta ciclos irregulares al dar recomendaciones' },
]

const SYMPTOMS_LIST = [
  'Ciclos irregulares o ausentes', 'Acné hormonal', 'Exceso de vello corporal (hirsutismo)',
  'Adelgazamiento del cabello', 'Aumento de peso sin causa clara', 'Dificultad para concebir',
  'Manchas oscuras en la piel', 'Fatiga crónica',
]

export default function PCOSScreen() {
  const insets = useSafeAreaInsets()
  const { pcosMode, setPcosMode } = useSettingsStore()

  const handleToggle = (v: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setPcosMode(v)
  }

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modo PCOS / Ciclos irregulares</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Toggle card */}
        <Animated.View entering={FadeInDown.delay(0)}>
          <LinearGradient
            colors={pcosMode ? ['rgba(168,85,247,0.25)', 'rgba(139,92,246,0.15)'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.04)']}
            style={styles.toggleCard}
          >
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextBlock}>
                <Text style={styles.toggleTitle}>
                  {pcosMode ? '✅ Modo PCOS activo' : 'Activar modo PCOS'}
                </Text>
                <Text style={styles.toggleSub}>
                  Adapta las predicciones para ciclos irregulares
                </Text>
              </View>
              <Switch
                value={pcosMode}
                onValueChange={handleToggle}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: Colors.primary[500] }}
                thumbColor="#fff"
              />
            </View>
            {pcosMode && (
              <View style={styles.activeBanner}>
                <Text style={styles.activeBannerText}>
                  🌙 Lunara está ajustada para tu ciclo único
                </Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* What is PCOS */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <Text style={styles.sectionTitle}>¿Qué es el SOP?</Text>
          <View style={styles.card}>
            <Text style={styles.bodyText}>
              El Síndrome de Ovario Poliquístico (SOP o PCOS por sus siglas en inglés) es una condición hormonal que afecta a 1 de cada 10 mujeres en edad reproductiva.
            </Text>
            <Text style={styles.bodyText}>
              Se caracteriza por ciclos irregulares o ausentes, niveles elevados de andrógenos y en algunos casos quistes en los ovarios.
            </Text>
            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                ⚕️ Este modo NO reemplaza el diagnóstico médico. Si sospechas que tienes SOP, consulta a un/a ginecólogo/a o endocrinólogo/a.
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Symptoms */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
          <Text style={styles.sectionTitle}>Síntomas comunes del SOP</Text>
          <View style={styles.card}>
            {SYMPTOMS_LIST.map((s, i) => (
              <View key={i} style={styles.symptomRow}>
                <Text style={styles.symptomDot}>•</Text>
                <Text style={styles.symptomText}>{s}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* What changes in the app */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>¿Qué cambia en la app?</Text>
          {PCOS_CHANGES.map((item, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(220 + i * 40)} style={styles.changeCard}>
              <Text style={styles.changeIcon}>{item.icon}</Text>
              <View style={styles.changeText}>
                <Text style={styles.changeTitle}>{item.title}</Text>
                <Text style={styles.changeDesc}>{item.desc}</Text>
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Resources */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.section}>
          <Text style={styles.sectionTitle}>Recursos</Text>
          <View style={styles.card}>
            <Text style={styles.bodyText}>
              📖 Asociación Española de Síndrome de Ovario Poliquístico (aedv.es){'\n'}
              🌐 PCOS Awareness Association (pcosaa.org){'\n'}
              🏥 Consulta con tu ginecólogo/a para diagnóstico y tratamiento personalizado
            </Text>
          </View>
        </Animated.View>
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
  headerTitle: {
    fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: '#fff',
  },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, gap: Spacing.lg },
  toggleCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
    gap: Spacing.sm,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  toggleTextBlock: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  toggleSub: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.55)' },
  activeBanner: {
    backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm, alignItems: 'center',
  },
  activeBannerText: { color: Colors.lavender[200], fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium },
  section: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#fff',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    gap: Spacing.sm,
  },
  bodyText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.65)', lineHeight: 20 },
  disclaimer: {
    backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: BorderRadius.md,
    padding: Spacing.sm, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)',
  },
  disclaimerText: { fontSize: Typography.fontSize.sm, color: '#fde68a', lineHeight: 18 },
  symptomRow: { flexDirection: 'row', gap: Spacing.sm },
  symptomDot: { color: Colors.lavender[400], fontSize: Typography.fontSize.sm, marginTop: 2 },
  symptomText: { flex: 1, fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.65)', lineHeight: 20 },
  changeCard: {
    flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  changeIcon: { fontSize: 24, width: 30, textAlign: 'center' },
  changeText: { flex: 1, gap: 2 },
  changeTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium, color: '#e9d5ff' },
  changeDesc: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },
})
