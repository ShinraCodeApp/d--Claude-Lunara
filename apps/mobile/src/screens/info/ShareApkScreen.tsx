import React, { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Share, Clipboard, Alert, Linking, Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'
import Constants from 'expo-constants'

const SHINRA_LOGO = require('../../../assets/images/ShinraCodeLogo1.png')
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'

const APK_INFO = {
  name: 'Lunara by ShinraCode',
  version: '1.0.0',
  buildNumber: '1',
  packageName: 'com.shinracode.lunara',
  path: 'apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk',
  size: '~45 MB',
  minAndroid: 'Android 7.0 (API 24)',
}

const INSTALL_STEPS = [
  { n: '1', text: 'Descarga o recibe el archivo APK en tu Android.' },
  { n: '2', text: 'Ve a Ajustes → Seguridad → Orígenes desconocidos y actívalo.' },
  { n: '3', text: 'Abre el archivo APK desde tu carpeta de Descargas.' },
  { n: '4', text: 'Toca "Instalar" y espera a que termine.' },
  { n: '5', text: 'Abre Lunara y comparte tus impresiones.' },
]

// Path where build-apk.ps1 copies the APK via adb push
const DEVICE_APK_DOWNLOAD = 'file:///sdcard/Download/lunara-release.apk'

export default function ShareApkScreen() {
  const insets = useSafeAreaInsets()
  const [copied, setCopied] = useState(false)
  const [apkReady, setApkReady] = useState(false)
  const [sharing, setSharing] = useState(false)

  const appVersion = Constants.expoConfig?.version ?? APK_INFO.version

  const SHARE_MSG =
    `🌙 *Lunara by ShinraCode* — App de salud femenina con IA\n\n` +
    `✅ Predicción de período\n` +
    `✅ Jardín Lunar (gamificación)\n` +
    `✅ Asistente Luna IA\n` +
    `✅ Análisis de patrones\n\n` +
    `📲 *Para instalar el APK adjunto:*\n` +
    `1. Ajustes → Seguridad → activa "Orígenes desconocidos"\n` +
    `2. Abre el archivo APK\n` +
    `3. Toca Instalar\n\n` +
    `v${appVersion} · Android 7.0+\n¡Tu feedback es muy valioso! 🙏`

  useEffect(() => {
    FileSystem.getInfoAsync(DEVICE_APK_DOWNLOAD)
      .then((info) => setApkReady(info.exists))
      .catch(() => setApkReady(false))
  }, [])

  // Returns a shareable URI for the APK (copies to cache so FileProvider can serve it)
  const getShareableApkUri = async (): Promise<string | null> => {
    try {
      const info = await FileSystem.getInfoAsync(DEVICE_APK_DOWNLOAD)
      if (!info.exists) return null
      const cacheUri = FileSystem.cacheDirectory + 'lunara-release.apk'
      await FileSystem.copyAsync({ from: DEVICE_APK_DOWNLOAD, to: cacheUri })
      return cacheUri
    } catch {
      return null
    }
  }

  const shareViaSystem = async () => {
    if (sharing) return
    setSharing(true)
    try {
      const uri = await getShareableApkUri()
      if (uri) {
        // Copy caption to clipboard so user can paste it as message in the target app
        Clipboard.setString(SHARE_MSG)
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.android.package-archive',
          dialogTitle: 'Compartir Lunara APK',
        })
      } else {
        // APK not on device yet — share text only with instructions
        await Share.share({ title: 'Prueba Lunara', message: SHARE_MSG })
        Alert.alert(
          'APK no encontrado en el teléfono',
          'Conecta el dispositivo al PC y ejecuta build-apk.ps1 para copiar el APK automáticamente.',
          [{ text: 'Entendido' }]
        )
      }
    } catch {
      // user cancelled
    } finally {
      setSharing(false)
    }
  }

  const copyPath = () => {
    Clipboard.setString(APK_INFO.path)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareWhatsApp = async () => {
    if (sharing) return
    setSharing(true)
    try {
      const uri = await getShareableApkUri()
      if (uri) {
        // Copy caption then open share picker — user selects WhatsApp
        Clipboard.setString(SHARE_MSG)
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.android.package-archive',
          dialogTitle: 'Enviar por WhatsApp',
        })
      } else {
        // Fallback: open WhatsApp with pre-filled text only
        const available = await Linking.canOpenURL('whatsapp://send?text=test')
        if (available) {
          await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(SHARE_MSG)}`)
        } else {
          Alert.alert('WhatsApp no disponible', 'No se encontró WhatsApp instalado.')
        }
      }
    } catch {
      Alert.alert('WhatsApp no disponible', 'No se encontró WhatsApp instalado.')
    } finally {
      setSharing(false)
    }
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
          <Text style={styles.subtitle}>Comparte Lunara con tus testers</Text>
        </Animated.View>

        {/* APK Info Card */}
        <Animated.View entering={FadeInDown.delay(80)}>
          <LinearGradient
            colors={['rgba(139,92,246,0.25)', 'rgba(168,85,247,0.1)']}
            style={styles.apkCard}
          >
            <View style={styles.apkIconRow}>
              <Image source={SHINRA_LOGO} style={styles.apkIcon} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={styles.apkName}>{APK_INFO.name}</Text>
                <Text style={styles.apkDev}>Programador Yamil.D.Rueda</Text>
                <Text style={styles.apkVersion}>v{appVersion} · Build {APK_INFO.buildNumber}</Text>
              </View>
              <View style={styles.apkBadge}>
                <Text style={styles.apkBadgeText}>APK</Text>
              </View>
            </View>

            <View style={styles.apkDetails}>
              {[
                ['📦', 'Tamaño', APK_INFO.size],
                ['🤖', 'Android mínimo', APK_INFO.minAndroid],
                ['🏷️', 'Paquete', APK_INFO.packageName],
              ].map(([icon, label, value]) => (
                <View key={label} style={styles.detailRow}>
                  <Text style={styles.detailIcon}>{icon}</Text>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Share Buttons */}
        <Animated.View entering={FadeInDown.delay(160)}>
          <Text style={styles.sectionTitle}>
            {apkReady ? '📎 APK listo para compartir' : 'Compartir app'}
          </Text>
          {apkReady && (
            <Text style={styles.apkReadyHint}>
              El APK está en tu dispositivo. Se enviará junto con las instrucciones de instalación.
            </Text>
          )}
          <View style={styles.shareRow}>
            <TouchableOpacity
              style={[styles.shareBtn, styles.shareBtnPrimary, sharing && styles.shareBtnDisabled]}
              onPress={shareViaSystem}
              disabled={sharing}
            >
              <Text style={styles.shareBtnIcon}>{sharing ? '⏳' : '📤'}</Text>
              <Text style={styles.shareBtnText}>{sharing ? 'Compartiendo…' : 'Compartir'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareBtn, styles.shareBtnWhatsApp, sharing && styles.shareBtnDisabled]}
              onPress={shareWhatsApp}
              disabled={sharing}
            >
              <Text style={styles.shareBtnIcon}>💬</Text>
              <Text style={styles.shareBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* APK Path */}
        <Animated.View entering={FadeInDown.delay(220)}>
          <Text style={styles.sectionTitle}>Ruta del APK (Debug)</Text>
          <View style={styles.pathCard}>
            <Text style={styles.pathText} numberOfLines={3}>{APK_INFO.path}</Text>
            <TouchableOpacity style={[styles.copyBtn, copied && styles.copyBtnDone]} onPress={copyPath}>
              <Text style={styles.copyBtnText}>{copied ? '✓ Copiado' : '📋 Copiar'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.pathHint}>
            Genera el APK con: <Text style={styles.pathCode}>cd apps/mobile/android && ./gradlew assembleDebug</Text>
          </Text>
        </Animated.View>

        {/* Build Release APK */}
        <Animated.View entering={FadeInDown.delay(280)}>
          <LinearGradient
            colors={['rgba(5,150,105,0.2)', 'rgba(6,78,59,0.15)']}
            style={styles.buildCard}
          >
            <Text style={styles.buildTitle}>🔨 Generar APK de distribución</Text>
            <Text style={styles.buildSubtitle}>Ejecuta en tu terminal desde la raíz del proyecto:</Text>
            {[
              { label: 'APK Debug (rápido)', cmd: 'cd apps/mobile/android\n./gradlew assembleDebug' },
              { label: 'APK Release (distribución)', cmd: 'cd apps/mobile/android\n./gradlew assembleRelease' },
            ].map((item) => (
              <View key={item.label} style={styles.codeBlock}>
                <Text style={styles.codeLabel}>{item.label}</Text>
                <Text style={styles.codeText}>{item.cmd}</Text>
              </View>
            ))}
            <Text style={styles.buildNote}>
              💡 El APK estará en: <Text style={styles.buildPath}>android/app/build/outputs/apk/</Text>
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Install Instructions */}
        <Animated.View entering={FadeInDown.delay(340)}>
          <Text style={styles.sectionTitle}>Instrucciones para el tester</Text>
          <LinearGradient
            colors={['rgba(139,92,246,0.15)', 'rgba(88,28,135,0.1)']}
            style={styles.stepsCard}
          >
            {INSTALL_STEPS.map((step) => (
              <View key={step.n} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{step.n}</Text>
                </View>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            ))}
          </LinearGradient>
        </Animated.View>

        {/* Feedback CTA */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <LinearGradient
            colors={[Colors.primary[700], '#be185d']}
            style={styles.feedbackCard}
          >
            <Text style={styles.feedbackTitle}>¿Ya probaste la app?</Text>
            <Text style={styles.feedbackText}>
              Tu feedback es clave para mejorar Lunara antes del lanzamiento en Google Play.
            </Text>
            <TouchableOpacity style={styles.feedbackBtn} onPress={shareViaSystem}>
              <Text style={styles.feedbackBtnText}>Enviar feedback →</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* ShinraCode Branding */}
        <Animated.View entering={FadeInDown.delay(460)}>
          <LinearGradient
            colors={['rgba(255,255,255,0.04)', 'rgba(139,92,246,0.08)']}
            style={styles.shinraCard}
          >
            <Image source={SHINRA_LOGO} style={styles.shinraLogo} resizeMode="contain" />
            <Text style={styles.shinraBy}>Programador Yamil.D.Rueda</Text>
            <Text style={styles.shinraTagline}>Lunara v1.0.0 · ShinraCode</Text>
            <View style={styles.shinraLinks}>
              <TouchableOpacity
                style={styles.shinraLink}
                onPress={() => Linking.openURL('https://www.instagram.com/ShinraCode')}
              >
                <Text style={styles.shinraLinkText}>📸 @ShinraCode</Text>
              </TouchableOpacity>
              <View style={styles.shinraDot} />
              <TouchableOpacity
                style={styles.shinraLink}
                onPress={() => Linking.openURL('https://shinracode.com')}
              >
                <Text style={styles.shinraLinkText}>🌐 shinracode.com</Text>
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
  sectionTitle: {
    fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 4,
  },
  apkCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', gap: Spacing.md,
  },
  apkIconRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  apkIcon: { width: 56, height: 56, borderRadius: BorderRadius.lg },
  apkName: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  apkDev: { fontSize: Typography.fontSize.xs, color: Colors.lavender[300], marginTop: 1 },
  apkVersion: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  apkBadge: {
    backgroundColor: Colors.primary[600], borderRadius: BorderRadius.sm,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  apkBadgeText: { fontSize: 11, fontFamily: Typography.fontFamily.bold, color: '#fff', letterSpacing: 0.5 },
  apkDetails: { gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: Spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  detailIcon: { fontSize: 14, width: 20 },
  detailLabel: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)', width: 110 },
  detailValue: { fontSize: Typography.fontSize.sm, color: '#fff', flex: 1 },
  apkReadyHint: {
    fontSize: Typography.fontSize.sm, color: '#6ee7b7',
    marginBottom: Spacing.sm, lineHeight: 18,
  },
  shareRow: { flexDirection: 'row', gap: Spacing.sm },
  shareBtnDisabled: { opacity: 0.5 },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1,
  },
  shareBtnPrimary: {
    backgroundColor: Colors.primary[700],
    borderColor: Colors.primary[500],
  },
  shareBtnWhatsApp: {
    backgroundColor: 'rgba(37,211,102,0.2)',
    borderColor: 'rgba(37,211,102,0.4)',
  },
  shareBtnIcon: { fontSize: 18 },
  shareBtnText: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  pathCard: {
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  pathText: { flex: 1, fontSize: 11, color: '#a78bfa', fontFamily: 'monospace', lineHeight: 16 },
  copyBtn: {
    backgroundColor: 'rgba(139,92,246,0.3)', borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.5)',
  },
  copyBtnDone: { backgroundColor: 'rgba(5,150,105,0.3)', borderColor: 'rgba(5,150,105,0.5)' },
  copyBtnText: { fontSize: 12, color: '#fff', fontFamily: Typography.fontFamily.bold },
  pathHint: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6, lineHeight: 18 },
  pathCode: { color: '#a78bfa', fontFamily: 'monospace' },
  buildCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.md, gap: Spacing.sm,
    borderWidth: 1, borderColor: 'rgba(5,150,105,0.3)',
  },
  buildTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  buildSubtitle: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  codeBlock: {
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: BorderRadius.md,
    padding: Spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  codeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  codeText: { fontSize: 12, color: '#6ee7b7', fontFamily: 'monospace', lineHeight: 18 },
  buildNote: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },
  buildPath: { color: '#a78bfa', fontFamily: 'monospace' },
  stepsCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)', gap: 14,
  },
  stepRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary[600], alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontSize: 13, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  stepText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.75)', flex: 1, lineHeight: 20, paddingTop: 4 },
  feedbackCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm,
  },
  feedbackTitle: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  feedbackText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20 },
  feedbackBtn: {
    marginTop: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  feedbackBtnText: { color: '#fff', fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.base },
  shinraCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    alignItems: 'center', gap: Spacing.xs,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },
  shinraLogo: { width: 88, height: 88, marginBottom: 4 },
  shinraBy: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium, color: '#e9d5ff' },
  shinraTagline: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.3)' },
  shinraLinks: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: 4 },
  shinraLink: {},
  shinraLinkText: { fontSize: Typography.fontSize.sm, color: Colors.lavender[300], textDecorationLine: 'underline' },
  shinraDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
})
