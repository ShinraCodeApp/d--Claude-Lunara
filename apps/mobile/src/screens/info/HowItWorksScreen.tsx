import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Image, Linking,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated'
import { router } from 'expo-router'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

const SHINRA_LOGO = require('../../../assets/images/ShinraCodeLogo1.png')

const { width } = Dimensions.get('window')

const FEATURES = [
  {
    id: 'cycle',
    emoji: '🌙',
    title: 'Seguimiento de ciclo',
    color: Colors.primary[600],
    gradient: ['#7c3aed', '#a855f7'] as const,
    description: 'Registra tu período y Lunara predice tus próximas fechas con inteligencia artificial. Conoce en qué fase estás cada día.',
    bullets: [
      'Predicción de período y ovulación',
      'Ventana fértil automática',
      '4 fases: menstrual, folicular, ovulatoria, lútea',
      'Historial de hasta 12 ciclos',
    ],
  },
  {
    id: 'log',
    emoji: '📝',
    title: 'Registro diario rápido',
    color: Colors.rose[500],
    gradient: ['#be185d', '#f43f5e'] as const,
    description: 'Un toque desde el inicio para registrar cómo te sientes. Estado de ánimo, energía y síntomas en menos de 10 segundos.',
    bullets: [
      'Registro de ánimo y energía',
      'Síntomas físicos con un tap',
      'Notas personales',
      '+10 XP por cada registro',
    ],
  },
  {
    id: 'ai',
    emoji: '🤖',
    title: 'Luna IA — Tu asistente de salud',
    color: Colors.lavender[500],
    gradient: ['#4c1d95', '#7c3aed'] as const,
    description: 'Habla con Luna, tu asistente de salud femenina. Pregúntale sobre síntomas, fertilidad, nutrición o simplemente cómo sentirte mejor hoy.',
    bullets: [
      'Respuestas personalizadas a tu ciclo actual',
      'Consejos de nutrición y ejercicio por fase',
      'Información médica verificada',
      'Disponible 24/7',
    ],
  },
  {
    id: 'garden',
    emoji: '🌸',
    title: 'Jardín Lunar — Gamificación',
    color: Colors.gold.main,
    gradient: ['#92400e', '#d97706'] as const,
    description: 'Cada registro cuida tu jardín. Gana XP, sube de nivel y colecciona cristales lunares mientras construyes hábitos de bienestar.',
    bullets: [
      '4 etapas: Semilla → Brote → Flor → Jardín Lunar',
      'Rachas diarias y logros',
      'Cristales 💎 para recompensas',
      'Sistema de niveles hasta nivel 50',
    ],
  },
  {
    id: 'patterns',
    emoji: '🔮',
    title: 'Patrones — Conoce tu ciclo',
    color: '#06b6d4',
    gradient: ['#164e63', '#0891b2'] as const,
    description: 'Lunara analiza tu historial y te muestra patrones personales: cuándo tienes más energía, qué síntomas aparecen en cada fase y más.',
    bullets: [
      'Análisis por fase menstrual',
      'Patrones de energía y ánimo',
      'Predicción de síntomas recurrentes',
      'Informes PDF mensuales (Premium)',
    ],
  },
  {
    id: 'ttc',
    emoji: '🥚',
    title: 'Modo Búsqueda de Embarazo',
    color: Colors.success,
    gradient: ['#064e3b', '#059669'] as const,
    description: 'Activa el modo TTC para un seguimiento avanzado de fertilidad. Registra temperatura basal y moco cervical para identificar tu ventana fértil exacta.',
    bullets: [
      'Temperatura basal diaria (BBT)',
      'Registro de moco cervical',
      'Ventana fértil destacada',
      'Consejos por fase para concebir',
    ],
  },
  {
    id: 'premium',
    emoji: '👑',
    title: 'Lunara Premium',
    color: Colors.gold.main,
    gradient: ['#78350f', '#d97706'] as const,
    description: 'Desbloquea todo el potencial de Lunara con el plan Premium. Sin anuncios, con análisis avanzados y acceso prioritario a nuevas funciones.',
    bullets: [
      'Informes PDF para tu ginecóloga',
      'Análisis avanzado de síntomas',
      'Sincronización entre dispositivos',
      'Soporte prioritario',
    ],
  },
]

export default function HowItWorksScreen() {
  const insets = useSafeAreaInsets()
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Cómo funciona Lunara</Text>
          <Text style={styles.subtitle}>Tu compañera de bienestar femenino</Text>
        </Animated.View>

        {/* Hero */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <LinearGradient
            colors={['rgba(139,92,246,0.3)', 'rgba(168,85,247,0.1)']}
            style={styles.heroCard}
          >
            <Text style={styles.heroEmoji}>🌙</Text>
            <Text style={styles.heroTitle}>Lunara by ShinraCode</Text>
            <Text style={styles.heroText}>
              Una app diseñada para que entiendas tu cuerpo, predecir cómo te sentirás cada día
              y construir hábitos de bienestar que duran toda la vida.
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Features */}
        {FEATURES.map((feat, i) => (
          <Animated.View key={feat.id} entering={FadeInDown.delay(150 + i * 60)}>
            <TouchableOpacity
              style={styles.featureCard}
              onPress={() => setExpanded(expanded === feat.id ? null : feat.id)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[feat.gradient[0] + '40', feat.gradient[1] + '20']}
                style={styles.featureGradient}
              >
                <View style={styles.featureHeader}>
                  <View style={[styles.featureIconBg, { backgroundColor: feat.color + '30', borderColor: feat.color + '50' }]}>
                    <Text style={styles.featureEmoji}>{feat.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureTitle}>{feat.title}</Text>
                    <Text style={styles.featureDesc} numberOfLines={expanded === feat.id ? undefined : 2}>
                      {feat.description}
                    </Text>
                  </View>
                  <Text style={styles.expandIcon}>{expanded === feat.id ? '▲' : '▼'}</Text>
                </View>

                {expanded === feat.id && (
                  <Animated.View entering={FadeInRight.duration(200)} style={styles.featureBullets}>
                    {feat.bullets.map((b, bi) => (
                      <View key={bi} style={styles.bulletRow}>
                        <Text style={[styles.bulletDot, { color: feat.color }]}>✦</Text>
                        <Text style={styles.bulletText}>{b}</Text>
                      </View>
                    ))}
                  </Animated.View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ))}

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(600)}>
          <LinearGradient
            colors={[Colors.primary[700], Colors.lavender[500]]}
            style={styles.ctaCard}
          >
            <Text style={styles.ctaTitle}>¿Lista para empezar?</Text>
            <Text style={styles.ctaText}>
              Regresa al inicio y toca "Registra cómo estás hoy" para comenzar tu primer registro.
            </Text>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => router.replace('/(tabs)')}>
              <Text style={styles.ctaBtnText}>Ir al inicio →</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* ShinraCode branding */}
        <Animated.View entering={FadeInDown.delay(700)}>
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'rgba(139,92,246,0.1)']}
            style={styles.shinraCard}
          >
            <Image source={SHINRA_LOGO} style={styles.shinraLogo} resizeMode="contain" />
            <Text style={styles.shinraBy}>Programador Yamil.D.Rueda</Text>
            <Text style={styles.shinraVersion}>Lunara v1.0.0 · ShinraCode</Text>
            <View style={styles.shinraLinks}>
              <TouchableOpacity
                style={styles.shinraLink}
                onPress={() => Linking.openURL('https://www.instagram.com/ShinraCode')}
              >
                <Text style={styles.shinraLinkIcon}>📸</Text>
                <Text style={styles.shinraLinkText}>@ShinraCode</Text>
              </TouchableOpacity>
              <View style={styles.shinraLinkDivider} />
              <TouchableOpacity
                style={styles.shinraLink}
                onPress={() => Linking.openURL('https://shinracode.com')}
              >
                <Text style={styles.shinraLinkIcon}>🌐</Text>
                <Text style={styles.shinraLinkText}>shinracode.com</Text>
              </TouchableOpacity>
            </View>
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
  subtitle: { fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  heroCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
  },
  heroEmoji: { fontSize: 56 },
  heroTitle: {
    fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold,
    color: '#fff', textAlign: 'center',
  },
  heroText: {
    fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.65)',
    textAlign: 'center', lineHeight: 22,
  },
  featureCard: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  featureGradient: {
    padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.xl,
  },
  featureHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  featureIconBg: {
    width: 48, height: 48, borderRadius: BorderRadius.lg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  featureEmoji: { fontSize: 24 },
  featureTitle: {
    fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold,
    color: '#fff', marginBottom: 4,
  },
  featureDesc: {
    fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.65)', lineHeight: 20,
  },
  expandIcon: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  featureBullets: { marginTop: Spacing.md, gap: 8, paddingLeft: 4 },
  bulletRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  bulletDot: { fontSize: 10, marginTop: 4 },
  bulletText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.75)', flex: 1, lineHeight: 20 },
  ctaCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm,
  },
  ctaTitle: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  ctaText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20 },
  ctaBtn: {
    marginTop: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  ctaBtnText: { color: '#fff', fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.base },
  shinraCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },
  shinraLogo: { width: 100, height: 100, marginBottom: 4 },
  shinraBy: {
    fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium, color: '#e9d5ff',
  },
  shinraVersion: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.35)' },
  shinraLinks: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: 4 },
  shinraLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shinraLinkIcon: { fontSize: 16 },
  shinraLinkText: { fontSize: Typography.fontSize.sm, color: Colors.lavender[300], textDecorationLine: 'underline' },
  shinraLinkDivider: { width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.15)' },
})
