import React, { useState, useCallback, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Linking, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import dayjs from 'dayjs'
import {
  getSdkStatus,
  initialize,
  requestPermission,
  getGrantedPermissions,
  openHealthConnectSettings,
  readRecords,
  insertRecords,
  SdkAvailabilityStatus,
} from 'react-native-health-connect'
import { useCycleStore } from '@/store'

import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

// ─── Types ─────────────────────────────────────────────────────
type ProviderKey = 'health_connect' | 'google_fit' | 'native_sensor'

type HealthData = {
  steps: number | null
  sleepHours: number | null
  heartRate: number | null
  calories: number | null
  weight: number | null
}

const EMPTY_DATA: HealthData = {
  steps: null, sleepHours: null, heartRate: null, calories: null, weight: null,
}

// ─── Provider config ───────────────────────────────────────────
const API_LEVEL = Platform.OS === 'android' ? (Platform.Version as number) : 0

function getRecommended(): ProviderKey {
  if (API_LEVEL >= 34) return 'health_connect'
  if (API_LEVEL >= 21) return 'google_fit'
  return 'native_sensor'
}

const PROVIDERS: {
  id: ProviderKey
  emoji: string
  name: string
  desc: string
  forSystem: string
  implemented: boolean
}[] = [
  {
    id: 'health_connect',
    emoji: '🔗',
    name: 'Health Connect',
    desc: 'Plataforma oficial de Google integrada en Android 14+. Pasos, sueño, frecuencia cardíaca, calorías y peso.',
    forSystem: 'Android 14+ (API 34+)',
    implemented: true,
  },
  {
    id: 'google_fit',
    emoji: '💪',
    name: 'Google Fit',
    desc: 'Alternativa para Android antiguo (8–13). Requiere configurar OAuth en Google Cloud Console.',
    forSystem: 'Android 8–13 (API 21–33)',
    implemented: false,
  },
  {
    id: 'native_sensor',
    emoji: '📱',
    name: 'Sensor del Teléfono',
    desc: 'Lee pasos directamente del hardware del dispositivo. Sin apps externas, funciona en cualquier Android.',
    forSystem: 'Cualquier Android',
    implemented: true,
  },
]

// ─── Health Connect logic ──────────────────────────────────────
const HC_PERMISSIONS = [
  { accessType: 'read' as const, recordType: 'Steps' as const },
  { accessType: 'read' as const, recordType: 'SleepSession' as const },
  { accessType: 'read' as const, recordType: 'HeartRate' as const },
  { accessType: 'read' as const, recordType: 'ActiveCaloriesBurned' as const },
  { accessType: 'read' as const, recordType: 'Weight' as const },
  { accessType: 'write' as const, recordType: 'MenstruationFlow' as const },
  { accessType: 'write' as const, recordType: 'MenstruationPeriod' as const },
]

async function syncHealthConnect(): Promise<{
  data: HealthData
  ok: boolean
  sdkStatus?: number
  error?: string
  grantedCount?: number
}> {
  try {
    const status = await getSdkStatus()
    if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
      return { data: EMPTY_DATA, ok: false, sdkStatus: status }
    }
    const initialized = await initialize()
    if (!initialized) return { data: EMPTY_DATA, ok: false, error: 'No se pudo inicializar Health Connect' }

    const already = await getGrantedPermissions()
    if (already.length === 0) await requestPermission(HC_PERMISSIONS)
    const granted = await getGrantedPermissions()
    if (granted.length === 0) return { data: EMPTY_DATA, ok: true, grantedCount: 0 }

    const today = dayjs().startOf('day').toISOString()
    const now = new Date().toISOString()
    const yesterday = dayjs().subtract(1, 'day').startOf('day').toISOString()
    const week = dayjs().subtract(7, 'day').toISOString()

    const [stepsR, sleepR, hrR, calR, weightR] = await Promise.allSettled([
      readRecords('Steps', { timeRangeFilter: { operator: 'between', startTime: today, endTime: now } }),
      readRecords('SleepSession', { timeRangeFilter: { operator: 'between', startTime: yesterday, endTime: now } }),
      readRecords('HeartRate', { timeRangeFilter: { operator: 'between', startTime: today, endTime: now } }),
      readRecords('ActiveCaloriesBurned', { timeRangeFilter: { operator: 'between', startTime: today, endTime: now } }),
      readRecords('Weight', { timeRangeFilter: { operator: 'between', startTime: week, endTime: now } }),
    ])

    const steps = stepsR.status === 'fulfilled'
      ? stepsR.value.records.reduce((s: number, r: any) => s + (r.count ?? 0), 0) : null
    const sleepHours = sleepR.status === 'fulfilled' && sleepR.value.records.length > 0
      ? (() => {
          const s = sleepR.value.records[sleepR.value.records.length - 1] as any
          return Math.round(((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3600000) * 10) / 10
        })()
      : null
    const hrSamples = hrR.status === 'fulfilled' ? hrR.value.records as any[] : []
    const heartRate = hrSamples.length > 0
      ? Math.round(hrSamples[hrSamples.length - 1]?.samples?.[0]?.beatsPerMinute ?? 0) || null : null
    const calories = calR.status === 'fulfilled'
      ? Math.round(calR.value.records.reduce((s: number, r: any) => s + (r.energy?.inKilocalories ?? 0), 0)) || null : null
    const weightRecs = weightR.status === 'fulfilled' ? weightR.value.records as any[] : []
    const weight = weightRecs.length > 0
      ? Math.round((weightRecs[weightRecs.length - 1]?.weight?.inKilograms ?? 0) * 10) / 10 || null : null

    return { data: { steps, sleepHours, heartRate, calories, weight }, ok: true, grantedCount: granted.length }
  } catch (e: any) {
    return { data: EMPTY_DATA, ok: false, error: e?.message ?? 'Error desconocido' }
  }
}

// ─── Native Sensor (Pedometer) logic ──────────────────────────
async function syncNativeSensor(): Promise<{ data: HealthData; ok: boolean; error?: string; available?: boolean }> {
  try {
    const { Pedometer } = await import('expo-sensors')
    const available = await Pedometer.isAvailableAsync()
    if (!available) return { data: EMPTY_DATA, ok: false, available: false, error: 'Sensor de pasos no disponible en este dispositivo' }

    const end = new Date()
    const start = dayjs().startOf('day').toDate()
    const result = await Pedometer.getStepCountAsync(start, end)
    return {
      data: { steps: result.steps, sleepHours: null, heartRate: null, calories: null, weight: null },
      ok: true,
      available: true,
    }
  } catch (e: any) {
    return { data: EMPTY_DATA, ok: false, error: e?.message ?? 'Error al leer sensor' }
  }
}

// ─── Screen ────────────────────────────────────────────────────
export default function HealthConnectScreen() {
  const insets = useSafeAreaInsets()
  const recommended = getRecommended()
  const [selected, setSelected] = useState<ProviderKey>(recommended)
  const [loading, setLoading] = useState(false)
  const [synced, setSynced] = useState(false)
  const [data, setData] = useState<HealthData>(EMPTY_DATA)
  const [error, setError] = useState<string | null>(null)
  const [sdkStatus, setSdkStatus] = useState<number | null>(null)
  const [grantedCount, setGrantedCount] = useState<number | null>(null)
  const [sensorAvailable, setSensorAvailable] = useState<boolean | null>(null)

  const activeProvider = React.useRef<ProviderKey>(selected)

  // Reset sync state when changing provider — also cancels any in-flight sync
  useEffect(() => {
    activeProvider.current = selected
    setLoading(false)
    setSynced(false)
    setData(EMPTY_DATA)
    setError(null)
    setSdkStatus(null)
    setGrantedCount(null)
    setSensorAvailable(null)
  }, [selected])

  const handleSync = useCallback(async () => {
    const providerAtStart = selected
    setLoading(true)
    setError(null)

    if (selected === 'health_connect') {
      const r = await syncHealthConnect()
      if (activeProvider.current !== providerAtStart) return
      setData(r.data)
      setSdkStatus(r.sdkStatus ?? null)
      setGrantedCount(r.grantedCount ?? null)
      if (r.error) setError(r.error)
    } else if (selected === 'native_sensor') {
      const r = await syncNativeSensor()
      if (activeProvider.current !== providerAtStart) return
      setData(r.data)
      setSensorAvailable(r.available ?? null)
      if (r.error) setError(r.error)
    }

    setSynced(true)
    setLoading(false)
  }, [selected])

  const hasData = Object.values(data).some((v) => v !== null)
  const selectedProvider = PROVIDERS.find((p) => p.id === selected) ?? PROVIDERS[0]

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
          <Text style={styles.title}>🏃‍♀️ Datos de Salud</Text>
          <Text style={styles.subtitle}>Elige cómo sincronizar tu actividad con Lunara</Text>
          <View style={styles.systemBadge}>
            <Text style={styles.systemBadgeText}>
              📱 Tu sistema: Android {API_LEVEL >= 34 ? '14+' : API_LEVEL >= 21 ? `${API_LEVEL}` : String(API_LEVEL)} (API {API_LEVEL})
            </Text>
          </View>
        </Animated.View>

        {/* Provider selector */}
        <Animated.View entering={FadeInDown.delay(80)} style={styles.providerSection}>
          <Text style={styles.sectionLabel}>Fuente de datos</Text>
          {PROVIDERS.map((p) => {
            const isSelected = selected === p.id
            const isRecommended = recommended === p.id
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.providerCard, isSelected && styles.providerCardSelected]}
                onPress={() => setSelected(p.id)}
                activeOpacity={0.8}
              >
                {/* Recommended badge — absolute top-right */}
                {isRecommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>⭐ Recomendado para tu sistema</Text>
                  </View>
                )}
                {!p.implemented && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonBadgeText}>🔧 Próximamente</Text>
                  </View>
                )}

                <View style={styles.providerRow}>
                  {/* Radio */}
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>

                  {/* Info */}
                  <Text style={styles.providerEmoji}>{p.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.providerName, isSelected && styles.providerNameSelected]}>
                      {p.name}
                    </Text>
                    <Text style={styles.providerForSystem}>{p.forSystem}</Text>
                    <Text style={styles.providerDesc}>{p.desc}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )
          })}
        </Animated.View>

        {/* Sync panel for selected provider */}
        <Animated.View entering={FadeInDown.delay(160)}>
          <LinearGradient
            colors={['rgba(139,92,246,0.2)', 'rgba(168,85,247,0.1)']}
            style={styles.syncCard}
          >
            <Text style={styles.syncEmoji}>{selectedProvider.emoji}</Text>
            <Text style={styles.syncTitle}>Conectar con {selectedProvider.name}</Text>

            {selected === 'google_fit' ? (
              <View style={styles.notAvailableBox}>
                <Text style={styles.notAvailableText}>
                  🔧 Google Fit requiere configurar un proyecto en Google Cloud Console con la Fitness API habilitada y un OAuth Client ID.{'\n\n'}
                  Esta integración estará disponible pronto.
                </Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.fitness')}>
                  <Text style={styles.linkText}>Ver Google Fit en Play Store →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.syncBody}>
                  {selected === 'health_connect'
                    ? 'Lunara leerá tus pasos, sueño, ritmo cardíaco y más desde Health Connect.'
                    : 'Lunara leerá los pasos directamente del sensor de tu teléfono, sin apps externas.'}
                </Text>
                <TouchableOpacity
                  style={[styles.syncBtn, loading && styles.syncBtnDisabled]}
                  onPress={handleSync}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.syncBtnText}>
                        {synced ? '🔄 Actualizar datos' : '✅ Conectar y sincronizar'}
                      </Text>}
                </TouchableOpacity>

                {/* Error states */}
                {synced && error && (
                  <View style={styles.notAvailableBox}>
                    <Text style={styles.notAvailableText}>⚠️ {error}</Text>
                  </View>
                )}

                {/* Health Connect — SDK not available */}
                {selected === 'health_connect' && synced && sdkStatus !== null && sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE && (
                  <View style={styles.notAvailableBox}>
                    <Text style={styles.notAvailableText}>
                      {sdkStatus === 3
                        ? '⚠️ Health Connect necesita actualizarse en tu dispositivo.\n\nAbre Play Store y actualiza "Health Connect".'
                        : '⚠️ Health Connect no está disponible. Intenta instalarlo desde Play Store.'}
                    </Text>
                    <TouchableOpacity onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata')}>
                      <Text style={styles.linkText}>Instalar / Actualizar Health Connect →</Text>
                    </TouchableOpacity>
                    <Text style={styles.hintText}>💡 Alternativa: usa "Sensor del Teléfono" para pasos sin apps externas</Text>
                  </View>
                )}

                {/* Health Connect — permissions denied */}
                {selected === 'health_connect' && synced && grantedCount === 0 && !error && (
                  <View style={styles.notAvailableBox}>
                    <Text style={styles.notAvailableText}>
                      🔒 Permisos de salud denegados. Ve a Ajustes → Apps → Lunara → Permisos y actívalos.
                    </Text>
                    <TouchableOpacity onPress={() => Linking.openSettings()} style={{ marginTop: 4 }}>
                      <Text style={styles.linkText}>Abrir ajustes de Lunara →</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openHealthConnectSettings()} style={{ marginTop: 4 }}>
                      <Text style={styles.linkText}>Abrir Health Connect →</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Native sensor — not available */}
                {selected === 'native_sensor' && synced && sensorAvailable === false && (
                  <View style={styles.notAvailableBox}>
                    <Text style={styles.notAvailableText}>
                      ⚠️ Este dispositivo no tiene sensor de pasos por hardware.
                    </Text>
                    <Text style={styles.hintText}>💡 Prueba con Health Connect o Google Fit</Text>
                  </View>
                )}
              </>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Data grid */}
        {hasData && (
          <Animated.View entering={FadeInDown.delay(220)}>
            <Text style={styles.sectionLabel}>📊 Datos de hoy</Text>
            <View style={styles.metricsGrid}>
              <MetricCard emoji="👣" label="Pasos" value={data.steps !== null ? data.steps.toLocaleString('es') : null} unit="pasos" goal={10000} progress={data.steps !== null ? data.steps / 10000 : null} color="#8b5cf6" />
              <MetricCard emoji="😴" label="Sueño" value={data.sleepHours !== null ? String(data.sleepHours) : null} unit="horas" goal={8} progress={data.sleepHours !== null ? data.sleepHours / 8 : null} color="#ec4899" />
              <MetricCard emoji="❤️" label="Frec. cardíaca" value={data.heartRate !== null ? String(data.heartRate) : null} unit="bpm" color="#ef4444" />
              <MetricCard emoji="🔥" label="Calorías activas" value={data.calories !== null ? data.calories.toLocaleString('es') : null} unit="kcal" goal={300} progress={data.calories !== null ? data.calories / 300 : null} color="#f59e0b" />
              {data.weight !== null && (
                <MetricCard emoji="⚖️" label="Peso" value={String(data.weight)} unit="kg" color="#10b981" />
              )}
            </View>
          </Animated.View>
        )}

        {/* Luna tip */}
        {hasData && data.steps !== null && (
          <Animated.View entering={FadeInDown.delay(280)}>
            <LinearGradient colors={['rgba(236,72,153,0.12)', 'rgba(139,92,246,0.08)']} style={styles.tipCard}>
              <Text style={styles.tipTitle}>💡 Luna dice</Text>
              <Text style={styles.tipText}>
                {(data.steps ?? 0) > 7000
                  ? 'Excelente actividad hoy 🎉 El ejercicio regular mejora los síntomas del PMS y regula el ciclo.'
                  : (data.steps ?? 0) > 3000
                  ? 'Buen comienzo. Intenta llegar a 7,000 pasos — reduce la inflamación menstrual hasta un 30%.'
                  : 'Poco movimiento hoy. Incluso una caminata de 20 minutos puede reducir los cólicos menstruales.'}
              </Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Privacy */}
        <Animated.View entering={FadeInDown.delay(320)}>
          <View style={styles.privacyNote}>
            <Text style={styles.privacyText}>
              🔒 Lunara solo lee los datos, nunca los almacena en servidores. Todo queda en tu dispositivo.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  )
}

// ─── MetricCard ────────────────────────────────────────────────
function MetricCard({
  emoji, label, value, unit, color, goal, progress,
}: {
  emoji: string; label: string; value: string | null; unit: string
  color: string; goal?: number; progress?: number | null
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricEmoji}>{emoji}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {value !== null ? (
        <>
          <Text style={[styles.metricValue, { color }]}>{value}</Text>
          <Text style={styles.metricUnit}>{unit}</Text>
          {progress != null && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color }]} />
            </View>
          )}
        </>
      ) : (
        <Text style={styles.metricNoData}>Sin datos</Text>
      )}
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  header: { gap: 6 },
  backBtn: { marginBottom: 4 },
  backText: { color: Colors.lavender[300], fontSize: Typography.fontSize.base },
  title: { fontSize: Typography.fontSize['3xl'], fontFamily: Typography.fontFamily.bold, color: '#fff' },
  subtitle: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)', lineHeight: 20 },
  systemBadge: {
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)',
  },
  systemBadgeText: { fontSize: Typography.fontSize.xs, color: Colors.lavender[300] },
  sectionLabel: {
    fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1,
  },
  providerSection: { gap: Spacing.sm },
  providerCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  providerCardSelected: {
    borderColor: Colors.lavender[400],
    backgroundColor: 'rgba(139,92,246,0.12)',
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,185,129,0.25)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.5)',
  },
  recommendedBadgeText: {
    fontSize: Typography.fontSize.xs,
    color: '#34d399',
    fontFamily: Typography.fontFamily.bold,
  },
  comingSoonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
  },
  comingSoonBadgeText: {
    fontSize: Typography.fontSize.xs,
    color: '#fbbf24',
    fontFamily: Typography.fontFamily.medium,
  },
  providerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  radio: {
    width: 20, height: 20, borderRadius: 10, marginTop: 2,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.lavender[400] },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.lavender[400] },
  providerEmoji: { fontSize: 22, marginTop: 1 },
  providerName: {
    fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.7)',
  },
  providerNameSelected: { color: '#fff' },
  providerForSystem: {
    fontSize: Typography.fontSize.xs, color: Colors.lavender[400],
    fontFamily: Typography.fontFamily.medium, marginTop: 2,
  },
  providerDesc: {
    fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.45)',
    lineHeight: 17, marginTop: 3,
  },
  syncCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
    alignItems: 'center', gap: Spacing.sm,
  },
  syncEmoji: { fontSize: 36 },
  syncTitle: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  syncBody: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 20 },
  syncBtn: {
    backgroundColor: Colors.primary[600], borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.xl,
    marginTop: 4, minWidth: 220, alignItems: 'center',
  },
  syncBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.1)' },
  syncBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold },
  notAvailableBox: {
    backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    alignItems: 'center', gap: 6, width: '100%',
  },
  notAvailableText: { fontSize: Typography.fontSize.sm, color: '#fca5a5', textAlign: 'center', lineHeight: 20 },
  linkText: { fontSize: Typography.fontSize.sm, color: '#60a5fa', textDecorationLine: 'underline', textAlign: 'center' },
  hintText: { fontSize: Typography.fontSize.xs, color: Colors.lavender[300], textAlign: 'center', marginTop: 4 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metricCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    width: '47%', alignItems: 'center', gap: 4,
  },
  metricEmoji: { fontSize: 28, marginBottom: 2 },
  metricLabel: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  metricValue: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold },
  metricUnit: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.4)' },
  metricNoData: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' },
  progressBar: {
    width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2, marginTop: 4, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  tipCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(236,72,153,0.2)', gap: 8,
  },
  tipTitle: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold, color: '#f9a8d4' },
  tipText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)', lineHeight: 20 },
  privacyNote: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  privacyText: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 18 },
})
