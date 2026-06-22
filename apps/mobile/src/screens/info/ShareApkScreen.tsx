import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Share, Alert, Linking, Image, TextInput,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import { Clipboard } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { Colors, Typography, Spacing, BorderRadius } from '@/theme'
import Constants from 'expo-constants'

const SHINRA_LOGO = require('../../../assets/images/ShinraCodeLogo1.png')

// ─── Configura aquí el link de descarga (Google Drive, Dropbox, etc.) ─────────
// Cuando subas el APK a Google Drive, reemplaza este valor con el link público.
// Ejemplo: https://drive.google.com/file/d/XXXX/view?usp=sharing
const DOWNLOAD_LINK = 'https://github.com/ShinraCodeApp/d--Claude-Lunara/releases/download/v1.0.0/Lunara-v1.0.0-release.apk'

const SHARE_MSG =
  `🌙 *Lunara by ShinraCode* — App de salud femenina con IA\n\n` +
  `✅ Predicción de período con IA\n` +
  `✅ Jardín Lunar (gamificación)\n` +
  `✅ Asistente Luna IA\n` +
  `✅ Análisis de patrones\n\n` +
  `📲 Descarga aquí: ${DOWNLOAD_LINK}\n\n` +
  `¡Tu feedback es muy valioso! 🙏`

export default function ShareApkScreen() {
  const insets = useSafeAreaInsets()
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const appVersion = Constants.expoConfig?.version ?? '1.0.0'
  const linkCopiedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => { if (linkCopiedTimer.current) clearTimeout(linkCopiedTimer.current) }
  }, [])

  const copyLink = () => {
    Clipboard.setString(DOWNLOAD_LINK)
    setLinkCopied(true)
    if (linkCopiedTimer.current) clearTimeout(linkCopiedTimer.current)
    linkCopiedTimer.current = setTimeout(() => setLinkCopied(false), 2500)
  }

  const shareViaWhatsApp = async () => {
    const url = `whatsapp://send?text=${encodeURIComponent(SHARE_MSG)}`
    const canOpen = await Linking.canOpenURL(url)
    if (canOpen) {
      await Linking.openURL(url)
    } else {
      Alert.alert('WhatsApp no disponible', 'No se encontró WhatsApp instalado.')
    }
  }

  const shareViaSystem = async () => {
    await Share.share({ title: 'Prueba Lunara', message: SHARE_MSG })
  }

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
          <Text style={styles.title}>Compartir app</Text>
          <Text style={styles.subtitle}>Comparte Lunara con testers antes de Play Store</Text>
        </Animated.View>

        {/* App info card */}
        <Animated.View entering={FadeInDown.delay(60)}>
          <LinearGradient
            colors={['rgba(139,92,246,0.25)', 'rgba(168,85,247,0.1)']}
            style={styles.appCard}
          >
            <View style={styles.appRow}>
              <Image source={SHINRA_LOGO} style={styles.appIcon} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={styles.appName}>Lunara by ShinraCode</Text>
                <Text style={styles.appDev}>Yamil D. Rueda</Text>
                <Text style={styles.appVersion}>v{appVersion} · Android 8.0+</Text>
              </View>
              <View style={styles.apkBadge}>
                <Text style={styles.apkBadgeText}>APK</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ─── QR Code ─────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(120)}>
          <Text style={styles.sectionLabel}>Escanear para descargar</Text>
          <LinearGradient
            colors={['rgba(139,92,246,0.15)', 'rgba(88,28,135,0.08)']}
            style={styles.qrCard}
          >
            <Text style={styles.qrHint}>
              El tester escanea este QR con la cámara del celular y descarga el APK directo
            </Text>

            <View style={styles.qrWrapper}>
              <QRCode
                value={DOWNLOAD_LINK}
                size={200}
                backgroundColor="white"
                color="#1a0533"
                logo={SHINRA_LOGO}
                logoSize={40}
                logoBackgroundColor="white"
                logoBorderRadius={8}
              />
            </View>

            {/* Link copiable */}
            <View style={styles.linkRow}>
              <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="middle">
                {DOWNLOAD_LINK}
              </Text>
              <TouchableOpacity
                style={[styles.copyBtn, linkCopied && styles.copyBtnDone]}
                onPress={copyLink}
              >
                <Text style={styles.copyBtnText}>{linkCopied ? '✓' : '📋'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.qrNote}>
              💡 Sube el APK a Google Drive → Compartir → "Cualquiera con el enlace" → pega el link en el código
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* ─── Botones de compartir ─────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.sectionLabel}>Enviar link</Text>
          <View style={styles.shareRow}>
            <TouchableOpacity style={[styles.shareBtn, styles.shareBtnWhatsApp]} onPress={shareViaWhatsApp}>
              <Text style={styles.shareBtnIcon}>💬</Text>
              <Text style={styles.shareBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareBtn, styles.shareBtnSystem]} onPress={shareViaSystem}>
              <Text style={styles.shareBtnIcon}>📤</Text>
              <Text style={styles.shareBtnText}>Compartir</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ─── Instrucciones para el tester ────────────────────── */}
        <Animated.View entering={FadeInDown.delay(260)}>
          <Text style={styles.sectionLabel}>Instrucciones para el tester</Text>
          <LinearGradient
            colors={['rgba(139,92,246,0.12)', 'rgba(88,28,135,0.06)']}
            style={styles.stepsCard}
          >
            {[
              ['1', 'Escanea el QR o abre el link que te enviaron'],
              ['2', 'Descarga el archivo APK desde Google Drive'],
              ['3', 'Ve a Ajustes → Seguridad → activa "Fuentes desconocidas"'],
              ['4', 'Abre el APK desde Descargas y toca Instalar'],
              ['5', 'Abre Lunara y comparte tus impresiones 🙏'],
            ].map(([n, text]) => (
              <View key={n} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{n}</Text>
                </View>
                <Text style={styles.stepText}>{text}</Text>
              </View>
            ))}
          </LinearGradient>
        </Animated.View>

        {/* ─── Próximamente: Play Store ─────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(320)}>
          <LinearGradient
            colors={['rgba(5,150,105,0.18)', 'rgba(6,78,59,0.1)']}
            style={styles.comingSoonCard}
          >
            <Text style={styles.comingSoonTitle}>🚀 Próximamente en Play Store</Text>
            <Text style={styles.comingSoonText}>
              Cuando la app esté en Google Play, los testers podrán instalar y actualizar directamente desde la tienda sin pasos extras.
            </Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonBadgeText}>v{appVersion} · com.shinracode.lunara</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ─── ShinraCode branding ──────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(380)}>
          <LinearGradient
            colors={['rgba(255,255,255,0.04)', 'rgba(139,92,246,0.08)']}
            style={styles.shinraCard}
          >
            <Image source={SHINRA_LOGO} style={styles.shinraLogo} resizeMode="contain" />
            <Text style={styles.shinraBy}>Yamil D. Rueda · ShinraCode</Text>
            <View style={styles.shinraLinks}>
              <TouchableOpacity onPress={() => Linking.openURL('https://www.instagram.com/ShinraCode')}>
                <Text style={styles.shinraLink}>📸 @ShinraCode</Text>
              </TouchableOpacity>
              <Text style={styles.shinraDot}>·</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://shinracode.com')}>
                <Text style={styles.shinraLink}>🌐 shinracode.com</Text>
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
  backBtn: { marginBottom: 4 },
  backText: { color: Colors.lavender[300], fontSize: Typography.fontSize.base },
  title: { fontSize: Typography.fontSize['3xl'], fontFamily: Typography.fontFamily.bold, color: '#fff' },
  subtitle: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  sectionLabel: {
    fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 4,
  },
  appCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
  },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  appIcon: { width: 52, height: 52, borderRadius: BorderRadius.lg },
  appName: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  appDev: { fontSize: Typography.fontSize.xs, color: Colors.lavender[300], marginTop: 1 },
  appVersion: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  apkBadge: {
    backgroundColor: Colors.primary[600], borderRadius: BorderRadius.sm,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  apkBadgeText: { fontSize: 11, fontFamily: Typography.fontFamily.bold, color: '#fff', letterSpacing: 0.5 },
  qrCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
    alignItems: 'center', gap: Spacing.md,
  },
  qrHint: {
    fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.55)',
    textAlign: 'center', lineHeight: 20,
  },
  qrWrapper: {
    padding: 16, backgroundColor: '#fff',
    borderRadius: BorderRadius.xl,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    width: '100%',
  },
  linkText: {
    flex: 1, fontSize: 11, color: '#a78bfa',
    fontFamily: 'monospace',
  },
  copyBtn: {
    backgroundColor: 'rgba(139,92,246,0.3)', borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.5)',
  },
  copyBtnDone: { backgroundColor: 'rgba(5,150,105,0.35)', borderColor: 'rgba(5,150,105,0.5)' },
  copyBtnText: { fontSize: 14, color: '#fff' },
  qrNote: {
    fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.35)',
    textAlign: 'center', lineHeight: 18,
  },
  shareRow: { flexDirection: 'row', gap: Spacing.sm },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: BorderRadius.xl, paddingVertical: Spacing.md,
    borderWidth: 1,
  },
  shareBtnWhatsApp: {
    backgroundColor: 'rgba(37,211,102,0.18)',
    borderColor: 'rgba(37,211,102,0.35)',
  },
  shareBtnSystem: {
    backgroundColor: Colors.primary[700],
    borderColor: Colors.primary[500],
  },
  shareBtnIcon: { fontSize: 18 },
  shareBtnText: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  stepsCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', gap: 14,
  },
  stepRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  stepNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primary[600], alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontSize: 12, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  stepText: {
    flex: 1, fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.7)', lineHeight: 20, paddingTop: 3,
  },
  comingSoonCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(5,150,105,0.3)', gap: Spacing.sm,
    alignItems: 'center',
  },
  comingSoonTitle: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  comingSoonText: {
    fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.6)',
    textAlign: 'center', lineHeight: 20,
  },
  comingSoonBadge: {
    marginTop: 4, backgroundColor: 'rgba(5,150,105,0.2)',
    borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(5,150,105,0.4)',
  },
  comingSoonBadgeText: { fontSize: Typography.fontSize.xs, color: '#6ee7b7', fontFamily: Typography.fontFamily.medium },
  shinraCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },
  shinraLogo: { width: 72, height: 72, marginBottom: 4 },
  shinraBy: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, color: '#e9d5ff' },
  shinraLinks: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  shinraLink: { fontSize: Typography.fontSize.sm, color: Colors.lavender[300], textDecorationLine: 'underline' },
  shinraDot: { color: 'rgba(255,255,255,0.2)', fontSize: 12 },
})
