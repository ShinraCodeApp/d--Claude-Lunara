import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

const { width } = Dimensions.get('window')

const SECTIONS = [
  {
    id: 'body',
    emoji: '🩸',
    title: '¿Qué está pasando en tu cuerpo?',
    color: '#f43f5e',
    gradient: ['#be185d', '#f43f5e'] as const,
    content: [
      'Tu útero tiene un revestimiento interno llamado endometrio que se forma cada mes por si hay un embarazo.',
      'Cuando no hay embarazo, las hormonas le dan la señal de desprenderse — eso es el período.',
      'Lo que ves es una mezcla de sangre, tejido y fluido. Es completamente normal.',
      'Las hormonas que regulan esto son el estrógeno y la progesterona, y seguirás sintiéndolas cada ciclo.',
    ],
  },
  {
    id: 'normal',
    emoji: '✅',
    title: '¿Qué es normal?',
    color: '#10b981',
    gradient: ['#065f46', '#10b981'] as const,
    content: [
      'Color que varía del rosado al rojo oscuro — todos son normales en distintos momentos.',
      'Duración de 3 a 7 días (el promedio es 5 días).',
      'Cólicos leves o moderados: tu útero se contrae para expulsar el tejido.',
      'Sentirte más cansada, sensible o con humor cambiante — las hormonas lo causan.',
      'Tu primer ciclo puede ser muy corto o muy largo. Eso es perfectamente normal.',
    ],
  },
  {
    id: 'phases',
    emoji: '🌙',
    title: 'Las 4 fases de tu ciclo',
    color: '#8b5cf6',
    gradient: ['#4c1d95', '#8b5cf6'] as const,
    content: [
      '🌑 Menstrual (días 1-5) — Tu período. Descansa, hidrátate, aliméntate bien.',
      '🌒 Folicular (días 6-13) — Tu energía sube. Te sentirás más activa y creativa.',
      '🌕 Ovulatoria (día 14 aprox.) — Pico de fertilidad y energía. ¡Tu mejor semana!',
      '🌗 Lútea (días 15-28) — Tu cuerpo se prepara. Puedes sentirte más introspectiva.',
    ],
  },
  {
    id: 'irregular',
    emoji: '📊',
    title: 'Los primeros ciclos',
    color: '#f59e0b',
    gradient: ['#78350f', '#f59e0b'] as const,
    content: [
      'Es muy normal que los primeros ciclos sean irregulares — pueden llegar antes o después.',
      'El ciclo promedio es de 28 días, pero el rango normal es de 21 a 45 días.',
      'Registrar en Lunara te ayudará a predecir cuándo llegará el siguiente.',
      'Si tienes dudas sobre síntomas intensos, habla siempre con una ginecóloga.',
    ],
  },
  {
    id: 'tips',
    emoji: '💡',
    title: 'Consejos para tu primer período',
    color: '#06b6d4',
    gradient: ['#164e63', '#06b6d4'] as const,
    content: [
      '🧃 Bebe más agua — ayuda con los cólicos y la retención de líquidos.',
      '🌡️ Calor local (bolsa de agua caliente) alivia los cólicos de manera natural.',
      '🚶‍♀️ Movimiento suave como caminar o yoga puede reducir el dolor.',
      '🍫 Antojos de chocolate son reales — el magnesio del cacao ayuda a los músculos.',
      '😴 Duerme más — tu cuerpo trabaja extra durante el período.',
    ],
  },
]

export default function FirstPeriodInfoScreen() {
  const insets = useSafeAreaInsets()
  const [expanded, setExpanded] = useState<string | null>('body')

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <Text style={styles.headerEmoji}>🌸</Text>
          <Text style={styles.headerTitle}>Tu primer período</Text>
          <Text style={styles.headerSubtitle}>
            Lo que necesitas saber para entender tu cuerpo
          </Text>
        </Animated.View>

        {/* Welcome card */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <LinearGradient
            colors={['rgba(139,92,246,0.3)', 'rgba(168,85,247,0.1)']}
            style={styles.welcomeCard}
          >
            <Text style={styles.welcomeText}>
              ¡Bienvenida a una nueva etapa! 🌙{'\n'}
              Tu período es una señal de que tu cuerpo funciona perfectamente.
              Lunara estará contigo en cada ciclo para ayudarte a entenderte mejor.
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Sections */}
        {SECTIONS.map((section, i) => (
          <Animated.View key={section.id} entering={FadeInDown.delay(150 + i * 80)}>
            <TouchableOpacity
              style={styles.sectionCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setExpanded(expanded === section.id ? null : section.id)
              }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[section.gradient[0] + '40', section.gradient[1] + '20']}
                style={styles.sectionGradient}
              >
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconBg, { backgroundColor: section.color + '30', borderColor: section.color + '50' }]}>
                    <Text style={styles.sectionEmoji}>{section.emoji}</Text>
                  </View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.expandIcon}>{expanded === section.id ? '▲' : '▼'}</Text>
                </View>

                {expanded === section.id && (
                  <View style={styles.sectionContent}>
                    {section.content.map((item, idx) => (
                      <View key={idx} style={styles.contentRow}>
                        <View style={[styles.contentDot, { backgroundColor: section.color }]} />
                        <Text style={styles.contentText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ))}

        {/* Lunara tip */}
        <Animated.View entering={FadeInDown.delay(600)}>
          <LinearGradient
            colors={['rgba(139,92,246,0.2)', 'rgba(168,85,247,0.1)']}
            style={styles.lunaCard}
          >
            <Text style={styles.lunaEmoji}>🌙</Text>
            <Text style={styles.lunaTitle}>Luna dice:</Text>
            <Text style={styles.lunaText}>
              "Cada ciclo es una historia única sobre tu cuerpo. Entre más lo registres,
              más aprenderás sobre ti misma — cuándo tienes más energía, qué síntomas
              son tuyos, cómo te afectan las fases. ¡Estoy aquí para ayudarte!"
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(700)}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              router.replace('/(tabs)')
            }}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[Colors.primary[600], Colors.lavender[500]]}
              style={styles.ctaBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ctaBtnText}>¡Empezar a registrar mi ciclo! 🌙</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.ctaNote}>
            Puedes volver a leer esta información desde Perfil → Cómo funciona Lunara
          </Text>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  header: { alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  headerEmoji: { fontSize: 64, marginBottom: 4 },
  headerTitle: {
    fontSize: Typography.fontSize['3xl'],
    fontFamily: Typography.fontFamily.bold,
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.base,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  welcomeCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  welcomeText: {
    fontSize: Typography.fontSize.base,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
    textAlign: 'center',
  },
  sectionCard: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  sectionGradient: {
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionIconBg: {
    width: 44, height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  sectionEmoji: { fontSize: 22 },
  sectionTitle: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.bold,
    color: '#fff',
  },
  expandIcon: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },
  sectionContent: { marginTop: Spacing.md, gap: 10, paddingLeft: 4 },
  contentRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  contentDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  contentText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 21,
  },
  lunaCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  lunaEmoji: { fontSize: 40 },
  lunaTitle: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.bold,
    color: '#c4b5fd',
  },
  lunaText: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  ctaBtn: {
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
  },
  ctaNote: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
})
