import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Linking,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'

import { useCycleStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

const PHASE_TIPS: Record<string, { title: string; tips: string[] }> = {
  menstrual: {
    title: '🩸 Fase Menstrual — Tu cuerpo pide descanso',
    tips: [
      'El magnesio reduce los cólicos — prueba chocolate oscuro 70%+.',
      'El calor en el abdomen (bolsa de agua caliente) alivia hasta un 40% del dolor.',
      'Es normal sentirte más introspectiva — no te fuerces a socializar.',
      'Evita el café en exceso: intensifica los cólicos en algunas personas.',
      'Movimiento suave: yoga, caminata o estiramientos ayudan más que el reposo absoluto.',
    ],
  },
  follicular: {
    title: '🌱 Fase Folicular — Tu energía aumenta',
    tips: [
      'Es el mejor momento del mes para iniciar proyectos nuevos.',
      'Tu memoria verbal está en su punto más alto — ideal para estudiar.',
      'El metabolismo es más eficiente — los carbohidratos se queman mejor.',
      'Es buena época para hacer networking o citas importantes.',
      'La piel suele mejorar — el estrógeno aumenta el colágeno.',
    ],
  },
  ovulatory: {
    title: '🌕 Fase Ovulatoria — Tu momento de mayor poder',
    tips: [
      'La fertilidad está en su pico — si buscas o evitas embarazo, ten presente estos días.',
      'Tu voz y lenguaje corporal son más atractivos — úsalo a tu favor.',
      'Alta tolerancia al dolor — buen momento para citas médicas o dentales.',
      'La libido suele ser mayor — es completamente normal.',
      'Aprovecha para conversaciones difíciles: tu empatía está en su máximo.',
    ],
  },
  luteal: {
    title: '🌘 Fase Lútea — Cuídate con intención',
    tips: [
      'Si tienes PMS, reducir la sal ayuda a disminuir la retención de líquidos.',
      'El magnesio y la vitamina B6 reducen la irritabilidad premenstrual.',
      'Es normal sentirse más cansada — no es holgazanería, es biología.',
      'Prioriza el sueño: el insomnio es más común en esta fase.',
      'Deseos de carbohidratos son normales — elige opciones nutritivas.',
    ],
  },
}

const GENERAL_TIPS = [
  { emoji: '💊', title: 'Ácido fólico', body: '400mcg/día es recomendado para todas las mujeres en edad fértil, no solo en embarazo.' },
  { emoji: '🌡️', title: 'BBT y ovulación', body: 'La temperatura basal sube 0.2–0.5°C después de ovular — regístrala al despertar antes de moverte.' },
  { emoji: '💧', title: 'Hidratación y ciclo', body: 'Beber 2L/día reduce el dolor menstrual y mejora el moco cervical en fase folicular.' },
  { emoji: '🧘', title: 'Cortisol y ciclo', body: 'El estrés crónico puede retrasar o eliminar la ovulación — el cortisol compite con la progesterona.' },
  { emoji: '🥦', title: 'Hierro en menstruación', body: 'Consumir vitamina C junto con alimentos ricos en hierro triplica la absorción.' },
]

export default function CommunityScreen() {
  const insets = useSafeAreaInsets()
  const cycleStore = useCycleStore()
  const [expandedTip, setExpandedTip] = useState<number | null>(null)

  const phase = cycleStore.currentPhase ?? 'follicular'
  const phaseTips = PHASE_TIPS[phase] ?? PHASE_TIPS.follicular

  const openLink = (url: string) => Linking.openURL(url).catch(() => {})

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      >
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🤝 Comunidad</Text>
          <Text style={styles.subtitle}>Consejos, recursos y conexión</Text>
        </Animated.View>

        {/* Phase-specific tips */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <LinearGradient colors={['rgba(139,92,246,0.2)', 'rgba(168,85,247,0.1)']} style={styles.phaseCard}>
            <Text style={styles.phaseTitle}>{phaseTips.title}</Text>
            <Text style={styles.phaseSubtitle}>Consejos para tu fase actual</Text>
            {phaseTips.tips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </LinearGradient>
        </Animated.View>

        {/* General health tips */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.sectionTitle}>💡 Sabías que...</Text>
          {GENERAL_TIPS.map((tip, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setExpandedTip(expandedTip === i ? null : i)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={expandedTip === i
                  ? ['rgba(139,92,246,0.25)', 'rgba(168,85,247,0.15)']
                  : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.03)']}
                style={styles.generalTipCard}
              >
                <View style={styles.generalTipHeader}>
                  <Text style={styles.generalTipEmoji}>{tip.emoji}</Text>
                  <Text style={styles.generalTipTitle}>{tip.title}</Text>
                  <Text style={styles.expandIcon}>{expandedTip === i ? '−' : '+'}</Text>
                </View>
                {expandedTip === i && (
                  <Text style={styles.generalTipBody}>{tip.body}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Join community */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <LinearGradient
            colors={['rgba(236,72,153,0.15)', 'rgba(139,92,246,0.1)']}
            style={styles.joinCard}
          >
            <Text style={styles.joinEmoji}>💬</Text>
            <Text style={styles.joinTitle}>Únete a la comunidad Lunara</Text>
            <Text style={styles.joinBody}>
              Conecta con otras mujeres, comparte experiencias y aprende
              de la comunidad en nuestro grupo de WhatsApp.
            </Text>
            <TouchableOpacity
              style={styles.whatsappBtn}
              onPress={() => openLink('https://chat.whatsapp.com/lunara-community')}
              activeOpacity={0.8}
            >
              <Text style={styles.whatsappBtnText}>💚 Unirse al grupo de WhatsApp</Text>
            </TouchableOpacity>
            <Text style={styles.comingSoon}>
              📱 Foro integrado en la app — próximamente
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Resources */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <Text style={styles.sectionTitle}>📚 Recursos recomendados</Text>
          {[
            { title: 'Planificación familiar natural', org: 'OMS', icon: '🌍' },
            { title: 'Síndrome premenstrual (SPM)', org: 'Mayo Clinic', icon: '🏥' },
            { title: 'Endometriosis: síntomas y tratamiento', org: 'ACOG', icon: '📋' },
            { title: 'Fertilidad y nutrición', org: 'Harvard Health', icon: '🥗' },
          ].map((r, i) => (
            <View key={i} style={styles.resourceRow}>
              <Text style={styles.resourceIcon}>{r.icon}</Text>
              <View style={styles.resourceInfo}>
                <Text style={styles.resourceTitle}>{r.title}</Text>
                <Text style={styles.resourceOrg}>{r.org}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Luna AI teaser */}
        <Animated.View entering={FadeInDown.delay(500)}>
          <LinearGradient
            colors={['rgba(139,92,246,0.15)', 'rgba(168,85,247,0.08)']}
            style={styles.lunaCard}
          >
            <Text style={styles.lunaEmoji}>🌙</Text>
            <Text style={styles.lunaTitle}>Luna IA — Tu guía personal</Text>
            <Text style={styles.lunaBody}>
              Tienes preguntas sobre tu ciclo? Luna está disponible en la
              pantalla de inicio para responderte con base en tus propios datos.
            </Text>
          </LinearGradient>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  header: { gap: 4 },
  backBtn: { marginBottom: Spacing.sm },
  backText: { color: Colors.lavender[300], fontSize: Typography.fontSize.base },
  title: { fontSize: Typography.fontSize['3xl'], fontFamily: Typography.fontFamily.bold, color: '#fff' },
  subtitle: { fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.5)' },
  phaseCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', gap: 8,
  },
  phaseTitle: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold, color: '#c4b5fd' },
  phaseSubtitle: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipBullet: { color: Colors.lavender[400], fontSize: Typography.fontSize.md, lineHeight: 22 },
  tipText: { flex: 1, fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
  sectionTitle: {
    fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold,
    color: '#fff', marginTop: 4,
  },
  generalTipCard: {
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginTop: 8,
  },
  generalTipHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  generalTipEmoji: { fontSize: 20 },
  generalTipTitle: { flex: 1, fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  expandIcon: { color: Colors.lavender[400], fontSize: 20, fontFamily: Typography.fontFamily.bold },
  generalTipBody: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 10, lineHeight: 20 },
  joinCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(236,72,153,0.2)', alignItems: 'center', gap: 10,
  },
  joinEmoji: { fontSize: 36 },
  joinTitle: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, color: '#fff', textAlign: 'center' },
  joinBody: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 20 },
  whatsappBtn: {
    backgroundColor: '#25D366', borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.lg, marginTop: 4,
  },
  whatsappBtnText: { color: '#fff', fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold },
  comingSoon: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  resourceRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  resourceIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  resourceInfo: { flex: 1 },
  resourceTitle: { fontSize: Typography.fontSize.sm, color: '#fff', fontFamily: Typography.fontFamily.medium },
  resourceOrg: { fontSize: Typography.fontSize.xs, color: Colors.lavender[400], marginTop: 1 },
  lunaCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', alignItems: 'center', gap: 8,
  },
  lunaEmoji: { fontSize: 32 },
  lunaTitle: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold, color: '#c4b5fd' },
  lunaBody: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 20 },
})
