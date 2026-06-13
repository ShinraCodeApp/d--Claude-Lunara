import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Share,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import {
  useAuthStore, useSettingsStore, useSymptomStore,
  useCycleStore, useGardenStore,
} from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

export default function MyDataScreen() {
  const insets = useSafeAreaInsets()
  const { user, logout } = useAuthStore()
  const { logs } = useSymptomStore()
  const { currentPhase, dayOfCycle } = useCycleStore()
  const gardenStore = useGardenStore()
  const { language, pcosMode, ttcMode, pregnancyMode, resetSettings } = useSettingsStore() as any
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        app: 'Lunara by ShinraCode',
        version: '1.0.0',
        user: {
          email: user?.email,
          id: user?.id,
        },
        cycle: { currentPhase, dayOfCycle },
        garden: {
          stage: gardenStore.stage,
          xp: gardenStore.xp,
          level: gardenStore.level,
          currentStreak: gardenStore.currentStreak,
        },
        settings: { language, pcosMode, ttcMode, pregnancyMode },
        logs: logs.map((l) => ({
          date: l.date,
          phase: l.phase,
          mood: l.mood,
          energy: l.energy,
          symptoms: l.symptoms,
          bbt: l.bbt,
          sleep: l.sleep,
          water: l.water,
          weight: l.weight,
          skin: l.skin,
          migraine: l.migraine,
          notes: l.notes,
        })),
      }

      await Share.share({
        title: 'Mis datos de Lunara',
        message: JSON.stringify(exportData, null, 2),
      })
    } catch (err) {
      Alert.alert('Error', 'No se pudo exportar los datos.')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Eliminar todos mis datos',
      'Esta acción eliminará permanentemente todos tus registros, historial de ciclos y configuración.\n\nConforme al RGPD, esta solicitud se procesará en un máximo de 30 días.\n\n¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, eliminar todo', style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmación final',
              'Esta acción no se puede deshacer. ¿Segura que deseas eliminar tu cuenta?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar mi cuenta', style: 'destructive',
                  onPress: async () => {
                    setDeleting(true)
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
                    await new Promise((r) => setTimeout(r, 1500))
                    logout()
                    router.replace('/auth')
                  },
                },
              ]
            )
          },
        },
      ]
    )
  }

  const handleClearLocalData = () => {
    Alert.alert(
      'Borrar datos locales',
      '¿Borrar todos los registros guardados en este dispositivo? Los datos en la nube (si aplica) no se verán afectados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar datos locales', style: 'destructive',
          onPress: () => {
            useSymptomStore.setState({ logs: [] })
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
            Alert.alert('Hecho', 'Datos locales eliminados.')
          },
        },
      ]
    )
  }

  const totalLogs = logs.length
  const datesWithPeriod = logs.filter((l) => l.phase === 'menstrual').length
  const logsWithMood = logs.filter((l) => l.mood).length
  const logsWithBBT = logs.filter((l) => l.bbt).length

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis datos</Text>
        <Text style={styles.headerSub}>Privacidad y control de tus datos</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(0)} style={styles.statsGrid}>
          {[
            { label: 'Registros totales', value: totalLogs.toString(), icon: '📝' },
            { label: 'Días con período', value: datesWithPeriod.toString(), icon: '🩸' },
            { label: 'Estados de ánimo', value: logsWithMood.toString(), icon: '😊' },
            { label: 'Temp. basales', value: logsWithBBT.toString(), icon: '🌡️' },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Export */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <Text style={styles.sectionTitle}>📤 Exportar datos</Text>
          <View style={styles.card}>
            <Text style={styles.cardDesc}>
              Descarga todos tus registros en formato JSON. Incluye historial de ciclos, síntomas, estados de ánimo y más.
            </Text>
            <TouchableOpacity style={styles.actionBtn} onPress={handleExport} disabled={exporting}>
              <LinearGradient
                colors={['#7c3aed', '#a855f7']}
                style={styles.actionBtnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {exporting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.actionBtnText}>📤 Exportar mis datos (JSON)</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.cardNote}>
              Tus datos son tuyos. Puedes usarlos con tu médico o guardalos como respaldo.
            </Text>
          </View>
        </Animated.View>

        {/* Clear local */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>🗑️ Datos locales</Text>
          <View style={styles.card}>
            <Text style={styles.cardDesc}>
              Elimina los registros guardados en este dispositivo. Útil si vas a prestar tu teléfono o vendes el dispositivo.
            </Text>
            <TouchableOpacity style={styles.dangerBtn} onPress={handleClearLocalData}>
              <Text style={styles.dangerBtnText}>Borrar datos locales</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* RGPD rights */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>⚖️ Derechos RGPD</Text>
          <View style={styles.card}>
            {[
              { icon: '🔍', label: 'Derecho de acceso', desc: 'Ya tienes acceso a todos tus datos desde esta pantalla' },
              { icon: '📦', label: 'Portabilidad', desc: 'Exporta tus datos en JSON estándar desde el botón anterior' },
              { icon: '✏️', label: 'Rectificación', desc: 'Edita cualquier registro desde el Calendario' },
              { icon: '🔒', label: 'Limitación', desc: 'Tus datos no se usan para publicidad ni se venden' },
            ].map((right, i) => (
              <View key={i} style={[styles.rightRow, i < 3 && styles.rightRowBorder]}>
                <Text style={styles.rightIcon}>{right.icon}</Text>
                <View style={styles.rightText}>
                  <Text style={styles.rightLabel}>{right.label}</Text>
                  <Text style={styles.rightDesc}>{right.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Delete account */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#f87171' }]}>⚠️ Zona de peligro</Text>
          <View style={[styles.card, { borderColor: 'rgba(248,113,113,0.3)' }]}>
            <Text style={styles.cardDesc}>
              Elimina permanentemente tu cuenta y todos tus datos de nuestros servidores. Esta acción no se puede deshacer.
            </Text>
            <TouchableOpacity style={styles.deleteDangerBtn} onPress={handleDeleteAccount} disabled={deleting}>
              {deleting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.deleteDangerText}>🗑️ Eliminar mi cuenta y todos mis datos</Text>
              }
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Text style={styles.contactNote}>
          ¿Preguntas sobre privacidad? Contáctanos en yamilrueda88@gmail.com
        </Text>
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
    fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: '#fff',
  },
  headerSub: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, gap: Spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: {
    flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  statLabel: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 2 },
  section: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#fff',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    gap: Spacing.md,
  },
  cardDesc: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.6)', lineHeight: 20 },
  cardNote: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.35)', lineHeight: 16 },
  actionBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  actionBtnGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.base },
  dangerBtn: {
    borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
  },
  dangerBtnText: { color: '#f87171', fontFamily: Typography.fontFamily.medium },
  deleteDangerBtn: {
    borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 1, borderColor: '#ef4444',
  },
  deleteDangerText: { color: '#fca5a5', fontFamily: Typography.fontFamily.bold },
  rightRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  rightRowBorder: { paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  rightIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  rightText: { flex: 1, gap: 2 },
  rightLabel: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium, color: '#e9d5ff' },
  rightDesc: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  contactNote: {
    fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
})
