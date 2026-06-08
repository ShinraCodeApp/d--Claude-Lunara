import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch, Alert, ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import apiClient from '@/api/client'
import { useAuthStore, useSettingsStore, useGardenStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/theme'

interface ProfileSection {
  title: string
  items: ProfileItem[]
}

interface ProfileItem {
  id: string
  icon: string
  label: string
  type: 'nav' | 'toggle' | 'value' | 'danger'
  value?: string | boolean
  onPress?: () => void
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const { user, logout } = useAuthStore()
  const { theme, setTheme, notificationsEnabled, setNotificationsEnabled, useMascot, setUseMascot } = useSettingsStore()
  const { xp, stage, crystalBalance } = useGardenStore()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await apiClient.get('/users/profile')
      return data
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: notifSettings } = useQuery({
    queryKey: ['notifSettings'],
    queryFn: async () => {
      const { data } = await apiClient.get('/notifications/settings')
      return data
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { data } = await apiClient.put('/users/profile', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout')
    },
    onSettled: () => {
      logout()
      router.replace('/auth')
    },
  })

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/users/account')
    },
    onSuccess: () => {
      logout()
      router.replace('/auth')
    },
  })

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.get('/users/data-export')
      return data
    },
    onSuccess: () => {
      Alert.alert('Datos exportados', 'Recibirás un correo con tus datos en formato JSON.')
    },
  })

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás segura que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive',
        onPress: () => logoutMutation.mutate(),
      },
    ])
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción eliminará todos tus datos permanentemente. Conforme con el RGPD, tienes 30 días para cancelar esta solicitud.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar mi cuenta', style: 'destructive',
          onPress: () => deleteAccountMutation.mutate(),
        },
      ]
    )
  }

  const isPremium = user?.subscription?.tier !== 'FREE'
  const displayName = user?.firstName || user?.email?.split('@')[0] || 'Luna'

  const sections: ProfileSection[] = [
    {
      title: 'Mi cuenta',
      items: [
        {
          id: 'edit_profile', icon: '✏️', label: 'Editar perfil', type: 'nav',
          onPress: () => router.push('/profile/edit'),
        },
        {
          id: 'subscription', icon: '👑', label: 'Suscripción',
          type: 'value', value: isPremium ? 'Premium' : 'Gratuita',
          onPress: () => router.push('/premium'),
        },
        {
          id: 'notifications', icon: '🔔', label: 'Notificaciones', type: 'nav',
          onPress: () => router.push('/profile/notifications'),
        },
      ],
    },
    {
      title: 'Preferencias',
      items: [
        {
          id: 'theme', icon: '🌙', label: 'Tema oscuro', type: 'toggle',
          value: theme === 'dark',
          onPress: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
        },
        {
          id: 'mascot', icon: '🌸', label: 'Mostrar mascota Luna', type: 'toggle',
          value: useMascot,
          onPress: () => setUseMascot(!useMascot),
        },
        {
          id: 'language', icon: '🌍', label: 'Idioma', type: 'value', value: 'Español',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Privacidad y datos',
      items: [
        {
          id: 'export', icon: '📤', label: 'Exportar mis datos', type: 'nav',
          onPress: () => exportDataMutation.mutate(),
        },
        {
          id: 'privacy', icon: '🔒', label: 'Política de privacidad', type: 'nav',
          onPress: () => {},
        },
        {
          id: 'terms', icon: '📄', label: 'Términos de servicio', type: 'nav',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Soporte',
      items: [
        {
          id: 'help', icon: '❓', label: 'Centro de ayuda', type: 'nav',
          onPress: () => {},
        },
        {
          id: 'feedback', icon: '💌', label: 'Enviar comentarios', type: 'nav',
          onPress: () => {},
        },
        {
          id: 'rate', icon: '⭐', label: 'Valorar la app', type: 'nav',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Cuenta',
      items: [
        {
          id: 'logout', icon: '🚪', label: 'Cerrar sesión', type: 'danger',
          onPress: handleLogout,
        },
        {
          id: 'delete', icon: '⚠️', label: 'Eliminar cuenta', type: 'danger',
          onPress: handleDeleteAccount,
        },
      ],
    },
  ]

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      >
        {/* ─── Header ─────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <Text style={styles.screenTitle}>Mi Perfil</Text>
        </Animated.View>

        {/* ─── User Card ───────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(50)}>
          <LinearGradient
            colors={['rgba(139,92,246,0.3)', 'rgba(168,85,247,0.15)']}
            style={styles.userCard}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <View style={styles.userBadge}>
                <Text style={styles.userBadgeText}>
                  {isPremium ? '👑 Premium' : '🌱 Plan gratuito'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ─── Jardín Stats ────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.gardenStats}>
          {[
            { icon: '🌸', label: 'Jardín', value: stage },
            { icon: '✨', label: 'XP Total', value: xp.toString() },
            { icon: '💎', label: 'Cristales', value: crystalBalance.toString() },
          ].map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ─── Sections ────────────────────────────────── */}
        {sections.map((section, si) => (
          <Animated.View key={section.title} entering={FadeInDown.delay(150 + si * 50)}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, ii) => (
                <React.Fragment key={item.id}>
                  <TouchableOpacity
                    style={styles.itemRow}
                    onPress={() => {
                      if (item.type !== 'toggle') {
                        Haptics.selectionAsync()
                        item.onPress?.()
                      }
                    }}
                    disabled={item.type === 'toggle'}
                  >
                    <Text style={styles.itemIcon}>{item.icon}</Text>
                    <Text style={[
                      styles.itemLabel,
                      item.type === 'danger' && styles.itemLabelDanger,
                    ]}>
                      {item.label}
                    </Text>
                    <View style={styles.itemRight}>
                      {item.type === 'toggle' && (
                        <Switch
                          value={item.value as boolean}
                          onValueChange={() => {
                            Haptics.selectionAsync()
                            item.onPress?.()
                          }}
                          trackColor={{ false: 'rgba(255,255,255,0.15)', true: Colors.primary[500] }}
                          thumbColor="#fff"
                        />
                      )}
                      {item.type === 'value' && (
                        <Text style={styles.itemValue}>{item.value}</Text>
                      )}
                      {(item.type === 'nav' || item.type === 'danger') && (
                        <Text style={styles.chevron}>›</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  {ii < section.items.length - 1 && <View style={styles.itemDivider} />}
                </React.Fragment>
              ))}
            </View>
          </Animated.View>
        ))}

        {/* ─── App Version ─────────────────────────────── */}
        <Text style={styles.versionText}>Lunara v1.0.0 · by ShinraCode</Text>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  header: { marginBottom: Spacing.sm },
  screenTitle: {
    fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: '#fff',
  },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
  },
  avatarCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary[600], alignItems: 'center', justifyContent: 'center',
    ...Shadows.glow,
  },
  avatarText: { fontSize: Typography.fontSize['2xl'], color: '#fff', fontFamily: Typography.fontFamily.bold },
  userInfo: { flex: 1, gap: 4 },
  userName: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  userEmail: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  userBadge: {
    backgroundColor: 'rgba(139,92,246,0.3)', borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 2, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.5)',
  },
  userBadgeText: { fontSize: Typography.fontSize.xs, color: Colors.lavender[300], fontFamily: Typography.fontFamily.medium },
  gardenStats: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  statLabel: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.5)' },
  sectionTitle: {
    fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.4)',
    fontFamily: Typography.fontFamily.medium, letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 6, paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2, gap: Spacing.md,
  },
  itemIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  itemLabel: { flex: 1, fontSize: Typography.fontSize.base, color: '#e9d5ff' },
  itemLabelDanger: { color: '#f87171' },
  itemRight: { alignItems: 'flex-end' },
  itemValue: { fontSize: Typography.fontSize.sm, color: Colors.lavender[300] },
  chevron: { fontSize: 20, color: 'rgba(255,255,255,0.3)' },
  itemDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 52 },
  versionText: {
    textAlign: 'center', fontSize: Typography.fontSize.xs,
    color: 'rgba(255,255,255,0.2)', marginTop: Spacing.md,
  },
})
