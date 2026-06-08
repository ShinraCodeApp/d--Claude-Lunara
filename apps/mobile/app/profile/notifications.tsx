import React from 'react'
import {
  View, Text, Switch, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'

import apiClient from '@/api/client'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

interface NotifSettings {
  periodReminder: boolean
  ovulationReminder: boolean
  dailyLogReminder: boolean
  weeklyInsight: boolean
  gardenReward: boolean
  aiTips: boolean
}

const NOTIF_OPTIONS: { key: keyof NotifSettings; icon: string; label: string; desc: string }[] = [
  { key: 'periodReminder', icon: '🩸', label: 'Recordatorio de período', desc: 'Te avisamos 3 días antes' },
  { key: 'ovulationReminder', icon: '🌡️', label: 'Recordatorio de ovulación', desc: 'Alerta en tu ventana fértil' },
  { key: 'dailyLogReminder', icon: '📝', label: 'Recordatorio diario', desc: 'Registra tu día cada tarde' },
  { key: 'weeklyInsight', icon: '💡', label: 'Insight semanal', desc: 'Resumen de tu ciclo cada semana' },
  { key: 'gardenReward', icon: '🌸', label: 'Recompensas del Jardín', desc: 'Notificaciones de XP y cristales' },
  { key: 'aiTips', icon: '🤖', label: 'Consejos de Luna IA', desc: 'Recomendaciones personalizadas' },
]

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery<NotifSettings>({
    queryKey: ['notifSettings'],
    queryFn: async () => {
      const { data } = await apiClient.get('/notifications/settings')
      return data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<NotifSettings>) => {
      const { data } = await apiClient.put('/notifications/settings', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifSettings'] })
    },
  })

  const toggle = (key: keyof NotifSettings) => {
    if (!settings) return
    Haptics.selectionAsync()
    updateMutation.mutate({ [key]: !settings[key] })
  }

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Notificaciones</Text>
        </View>

        <View style={styles.card}>
          {NOTIF_OPTIONS.map((opt, i) => (
            <React.Fragment key={opt.key}>
              <View style={styles.row}>
                <Text style={styles.rowIcon}>{opt.icon}</Text>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowLabel}>{opt.label}</Text>
                  <Text style={styles.rowDesc}>{opt.desc}</Text>
                </View>
                <Switch
                  value={settings?.[opt.key] ?? false}
                  onValueChange={() => toggle(opt.key)}
                  trackColor={{ false: 'rgba(255,255,255,0.15)', true: Colors.primary[500] }}
                  thumbColor="#fff"
                  disabled={isLoading || updateMutation.isPending}
                />
              </View>
              {i < NOTIF_OPTIONS.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.note}>
          Puedes gestionar los permisos de notificación en la configuración de tu dispositivo.
        </Text>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  header: { gap: Spacing.sm },
  backBtn: { color: Colors.lavender[300], fontSize: Typography.fontSize.base },
  title: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: '#fff' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  rowIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  rowInfo: { flex: 1, gap: 2 },
  rowLabel: { fontSize: Typography.fontSize.base, color: '#e9d5ff', fontFamily: Typography.fontFamily.medium },
  rowDesc: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.4)' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 60 },
  note: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
})
