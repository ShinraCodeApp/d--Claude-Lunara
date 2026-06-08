import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'

import apiClient from '@/api/client'
import { useAuthStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

const CYCLE_LENGTHS = Array.from({ length: 25 }, (_, i) => i + 21)
const PERIOD_LENGTHS = Array.from({ length: 9 }, (_, i) => i + 2)

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const { user, updateProfile } = useAuthStore()

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [avgCycleLength, setAvgCycleLength] = useState(28)
  const [avgPeriodLength, setAvgPeriodLength] = useState(5)

  const { isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await apiClient.get('/users/profile')
      if (data.averageCycleLength) setAvgCycleLength(data.averageCycleLength)
      if (data.averagePeriodLength) setAvgPeriodLength(data.averagePeriodLength)
      return data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.put('/users/profile', {
        firstName, lastName, averageCycleLength: avgCycleLength, averagePeriodLength: avgPeriodLength,
      })
      return data
    },
    onSuccess: (data) => {
      updateProfile({ firstName, lastName })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    },
  })

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Editar perfil</Text>
        </View>

        <View style={styles.form}>
          {[
            { label: 'Nombre', value: firstName, onChange: setFirstName, placeholder: 'Tu nombre' },
            { label: 'Apellido', value: lastName, onChange: setLastName, placeholder: 'Tu apellido' },
          ].map((field) => (
            <View key={field.label} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <TextInput
                style={styles.input}
                value={field.value}
                onChangeText={field.onChange}
                placeholder={field.placeholder}
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>
          ))}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Duración media del ciclo</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => setAvgCycleLength(Math.max(21, avgCycleLength - 1))}>
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{avgCycleLength} días</Text>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => setAvgCycleLength(Math.min(45, avgCycleLength + 1))}>
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Duración media del período</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => setAvgPeriodLength(Math.max(2, avgPeriodLength - 1))}>
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{avgPeriodLength} días</Text>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => setAvgPeriodLength(Math.min(10, avgPeriodLength + 1))}>
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <LinearGradient colors={[Colors.primary[600], Colors.lavender[500]]} style={styles.saveBtnGradient}>
              {saveMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Guardar cambios</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.lg },
  header: { gap: Spacing.sm },
  backBtn: { color: Colors.lavender[300], fontSize: Typography.fontSize.base },
  title: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: '#fff' },
  form: { gap: Spacing.md },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.6)' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 14, color: '#fff',
    fontSize: Typography.fontSize.base, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  stepperBtn: { padding: Spacing.md, paddingHorizontal: Spacing.lg },
  stepperBtnText: { color: '#fff', fontSize: Typography.fontSize.xl },
  stepperValue: { flex: 1, textAlign: 'center', color: '#fff', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold },
  saveBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden', marginTop: Spacing.md },
  saveBtnGradient: { padding: Spacing.md, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold },
})
