import React, { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch, Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import {
  requestNotificationPermissions,
  scheduleAllCycleNotifications,
  cancelAllLunaraNotifications,
} from '@/utils/notifications'
import { useSettingsStore, useCycleStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

interface NotifSetting {
  id: string
  icon: string
  title: string
  subtitle: string
  key: keyof NotifState
  premium?: boolean
}

interface NotifState {
  logReminder: boolean
  pillReminder: boolean
  waterReminder: boolean
  cycleAlerts: boolean
  fertileAlerts: boolean
  ovulationAlerts: boolean
}

const SETTINGS: NotifSetting[] = [
  {
    id: 'log', icon: '📝', title: 'Recordatorio diario',
    subtitle: 'Te recuerda registrar cómo te sientes cada día',
    key: 'logReminder',
  },
  {
    id: 'cycle', icon: '📅', title: 'Alertas de período',
    subtitle: 'Aviso 3 días antes de que llegue tu período',
    key: 'cycleAlerts',
  },
  {
    id: 'fertile', icon: '🌸', title: 'Ventana fértil',
    subtitle: 'Notificación al inicio de tu ventana fértil',
    key: 'fertileAlerts',
  },
  {
    id: 'ovulation', icon: '🥚', title: 'Ovulación',
    subtitle: 'Aviso un día antes de tu ovulación estimada',
    key: 'ovulationAlerts',
  },
  {
    id: 'pill', icon: '💊', title: 'Recordatorio de pastilla',
    subtitle: 'Recordatorio diario para tomar anticonceptivos',
    key: 'pillReminder',
  },
  {
    id: 'water', icon: '💧', title: 'Hidratación',
    subtitle: 'Recordatorio a las 3 PM para beber agua',
    key: 'waterReminder',
  },
]

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets()
  const { nextPeriodDate, fertileWindowStart, nextOvulationDate } = useCycleStore()
  const {
    notificationsEnabled, setNotificationsEnabled,
    pillReminderEnabled, setPillReminderEnabled,
    waterReminderEnabled, setWaterReminderEnabled,
    logReminderHour: storedLogHour, setLogReminderHour,
    pillReminderHour: storedPillHour, setPillReminderHour,
  } = useSettingsStore()

  const [state, setState] = useState<NotifState>({
    logReminder: notificationsEnabled,
    pillReminder: pillReminderEnabled,
    waterReminder: waterReminderEnabled,
    cycleAlerts: true,
    fertileAlerts: true,
    ovulationAlerts: true,
  })
  const [logHour, setLogHour] = useState(storedLogHour)
  const [pillHour, setPillHour] = useState(storedPillHour)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    requestNotificationPermissions().then(setHasPermission)
  }, [])

  const toggle = async (key: keyof NotifState) => {
    if (!hasPermission) {
      const granted = await requestNotificationPermissions()
      if (!granted) {
        Alert.alert(
          'Permisos requeridos',
          'Activa las notificaciones en Configuración del sistema para recibir alertas de Lunara.',
          [{ text: 'OK' }]
        )
        return
      }
      setHasPermission(true)
    }
    Haptics.selectionAsync()
    setState((s) => ({ ...s, [key]: !s[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Persist to store so _layout re-schedules correctly on app restart
      setNotificationsEnabled(state.logReminder)
      setPillReminderEnabled(state.pillReminder)
      setWaterReminderEnabled(state.waterReminder)
      setLogReminderHour(logHour)
      setPillReminderHour(pillHour)

      if (!Object.values(state).some(Boolean)) {
        await cancelAllLunaraNotifications()
      } else {
        await scheduleAllCycleNotifications({
          nextPeriodDate: state.cycleAlerts ? nextPeriodDate : null,
          fertileWindowStart: state.fertileAlerts ? fertileWindowStart : null,
          nextOvulationDate: state.ovulationAlerts ? nextOvulationDate : null,
          logReminderEnabled: state.logReminder,
          pillReminderEnabled: state.pillReminder,
          waterReminderEnabled: state.waterReminder,
          logReminderHour: logHour,
          pillReminderHour: pillHour,
        })
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('✓ Guardado', 'Tus preferencias de notificaciones se han actualizado.')
    } catch (e) {
      Alert.alert('Error', 'No se pudieron guardar las notificaciones.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
      >
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Notificaciones</Text>
          <Text style={styles.subtitle}>Elige qué alertas quieres recibir</Text>
        </Animated.View>

        {/* Permission banner */}
        {hasPermission === false && (
          <Animated.View entering={FadeInDown.delay(60)} style={styles.permBanner}>
            <Text style={styles.permIcon}>🔔</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.permTitle}>Notificaciones desactivadas</Text>
              <Text style={styles.permSub}>Actívalas en Configuración del sistema</Text>
            </View>
          </Animated.View>
        )}

        {/* Settings list */}
        {SETTINGS.map((s, i) => (
          <Animated.View key={s.id} entering={FadeInDown.delay(80 + i * 50)}>
            <View style={styles.row}>
              <Text style={styles.rowIcon}>{s.icon}</Text>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{s.title}</Text>
                <Text style={styles.rowSub}>{s.subtitle}</Text>

                {/* Time picker for log reminder */}
                {s.key === 'logReminder' && state.logReminder && (
                  <View style={styles.timeRow}>
                    {[8, 12, 16, 20, 22].map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[styles.timeChip, logHour === h && styles.timeChipActive]}
                        onPress={() => { setLogHour(h); Haptics.selectionAsync() }}
                      >
                        <Text style={[styles.timeChipText, logHour === h && styles.timeChipTextActive]}>
                          {h}:00
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Time picker for pill reminder */}
                {s.key === 'pillReminder' && state.pillReminder && (
                  <View style={styles.timeRow}>
                    {[7, 8, 9, 10, 12].map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[styles.timeChip, pillHour === h && styles.timeChipActive]}
                        onPress={() => { setPillHour(h); Haptics.selectionAsync() }}
                      >
                        <Text style={[styles.timeChipText, pillHour === h && styles.timeChipTextActive]}>
                          {h}:00
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <Switch
                value={state[s.key]}
                onValueChange={() => toggle(s.key)}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: Colors.primary[500] }}
                thumbColor="#fff"
              />
            </View>
            {i < SETTINGS.length - 1 && <View style={styles.divider} />}
          </Animated.View>
        ))}
      </ScrollView>

      {/* Save FAB */}
      <View style={[styles.saveBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <LinearGradient
            colors={[Colors.primary[600], Colors.lavender[500]]}
            style={styles.saveBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : '✓ Guardar preferencias'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  header: { gap: 4, marginBottom: Spacing.md },
  backBtn: { marginBottom: Spacing.sm },
  backText: { color: Colors.lavender[300], fontSize: Typography.fontSize.base },
  title: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: '#fff' },
  subtitle: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  permBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    marginBottom: Spacing.sm,
  },
  permIcon: { fontSize: 24 },
  permTitle: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold, color: '#fca5a5' },
  permSub: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.5)' },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  rowIcon: { fontSize: 22, marginTop: 2 },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  rowSub: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.5)' },
  divider: { height: 4 },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  timeChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  timeChipActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[400] },
  timeChipText: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  timeChipTextActive: { color: '#fff', fontFamily: Typography.fontFamily.bold },
  saveBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.md, backgroundColor: 'rgba(13,1,24,0.95)',
    borderTopWidth: 1, borderTopColor: 'rgba(139,92,246,0.3)',
  },
  saveBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  saveBtnGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold },
})
