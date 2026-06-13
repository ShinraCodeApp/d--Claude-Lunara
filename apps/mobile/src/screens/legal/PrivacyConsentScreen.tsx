import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import { useSettingsStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

const DATA_POINTS = [
  { icon: '🩸', title: 'Ciclo menstrual', desc: 'Fechas de período, síntomas y patrones de ciclo' },
  { icon: '😊', title: 'Estado de ánimo y energía', desc: 'Registros de humor, energía y bienestar diario' },
  { icon: '🌡️', title: 'Salud física', desc: 'Temperatura basal, peso, sueño y medicamentos' },
  { icon: '💕', title: 'Actividad íntima', desc: 'Solo si decides registrarla — siempre privada y cifrada' },
  { icon: '📱', title: 'Datos del dispositivo', desc: 'Idioma y configuración de la app (sin tracking)' },
]

export default function PrivacyConsentScreen() {
  const insets = useSafeAreaInsets()
  const { setHasSeenPrivacyConsent } = useSettingsStore()
  const [analyticsAccepted, setAnalyticsAccepted] = useState(false)
  const [marketingAccepted, setMarketingAccepted] = useState(false)

  const handleAccept = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setHasSeenPrivacyConsent(true)
    router.replace('/')
  }

  return (
    <LinearGradient colors={['#0d0118', '#1a0533', '#2d0145']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
      >
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <Text style={styles.logo}>🌙</Text>
          <Text style={styles.title}>Bienvenida a Lunara</Text>
          <Text style={styles.subtitle}>
            Antes de comenzar, queremos explicarte cómo usamos tus datos.
            Tu privacidad es nuestra prioridad.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <Text style={styles.sectionTitle}>¿Qué datos recopilamos?</Text>
          <View style={styles.card}>
            {DATA_POINTS.map((item, i) => (
              <View key={i} style={[styles.dataRow, i < DATA_POINTS.length - 1 && styles.dataRowBorder]}>
                <Text style={styles.dataIcon}>{item.icon}</Text>
                <View style={styles.dataText}>
                  <Text style={styles.dataTitle}>{item.title}</Text>
                  <Text style={styles.dataDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Tus derechos (RGPD)</Text>
          <View style={styles.card}>
            {[
              '✅ Acceder a todos tus datos en cualquier momento',
              '✅ Exportar tus datos en formato JSON',
              '✅ Solicitar la eliminación completa de tu cuenta',
              '✅ Datos cifrados end-to-end en nuestros servidores',
              '✅ No vendemos tu información a terceros',
              '✅ No compartimos datos con aseguradoras ni empleadores',
            ].map((right, i) => (
              <Text key={i} style={styles.rightItem}>{right}</Text>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Permisos opcionales</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>📊 Análisis de uso anónimo</Text>
                <Text style={styles.toggleDesc}>Nos ayuda a mejorar la app. Sin datos personales.</Text>
              </View>
              <Switch
                value={analyticsAccepted}
                onValueChange={(v) => { Haptics.selectionAsync(); setAnalyticsAccepted(v) }}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: Colors.primary[500] }}
                thumbColor="#fff"
              />
            </View>
            <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: Spacing.md }]}>
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>📧 Consejos de salud por correo</Text>
                <Text style={styles.toggleDesc}>Artículos sobre bienestar y novedades de Lunara.</Text>
              </View>
              <Switch
                value={marketingAccepted}
                onValueChange={(v) => { Haptics.selectionAsync(); setMarketingAccepted(v) }}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: Colors.primary[500] }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={ZoomIn.delay(400)}>
          <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} activeOpacity={0.85}>
            <LinearGradient
              colors={['#7c3aed', '#a855f7']}
              style={styles.acceptGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={styles.acceptBtnText}>Acepto y continuar 🌙</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/privacy-policy')} style={styles.policyLink}>
            <Text style={styles.policyLinkText}>Leer política de privacidad completa →</Text>
          </TouchableOpacity>
          <Text style={styles.legalNote}>
            Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad.
            Puedes revocar tu consentimiento en cualquier momento desde Perfil → Privacidad y datos.
          </Text>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.lg },
  header: { alignItems: 'center', gap: Spacing.sm },
  logo: { fontSize: 64 },
  title: {
    fontSize: Typography.fontSize['3xl'], fontFamily: Typography.fontFamily.bold,
    color: '#fff', textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.6)',
    textAlign: 'center', lineHeight: 22,
  },
  section: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold,
    color: '#fff',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    gap: Spacing.sm,
  },
  dataRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  dataRowBorder: { paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  dataIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  dataText: { flex: 1, gap: 2 },
  dataTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium, color: '#e9d5ff' },
  dataDesc: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },
  rightItem: { fontSize: Typography.fontSize.sm, color: '#e9d5ff', lineHeight: 22 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  toggleText: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium, color: '#e9d5ff' },
  toggleDesc: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  acceptBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  acceptGradient: { paddingVertical: Spacing.md + 4, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold },
  policyLink: { alignItems: 'center', paddingVertical: Spacing.sm },
  policyLinkText: { color: Colors.lavender[300], fontSize: Typography.fontSize.sm, textDecorationLine: 'underline' },
  legalNote: {
    fontSize: 11, color: 'rgba(255,255,255,0.3)',
    textAlign: 'center', lineHeight: 16,
  },
})
