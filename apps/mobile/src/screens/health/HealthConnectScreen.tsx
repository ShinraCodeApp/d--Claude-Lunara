import React, { useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Linking, PermissionsAndroid,
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
  SdkAvailabilityStatus,
} from 'react-native-health-connect'

import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

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

const PERMISSIONS = [
  { accessType: 'read' as const, recordType: 'Steps' as const },
  { accessType: 'read' as const, recordType: 'SleepSession' as const },
  { accessType: 'read' as const, recordType: 'HeartRate' as const },
  { accessType: 'read' as const, recordType: 'ActiveCaloriesBurned' as const },
  { accessType: 'read' as const, recordType: 'Weight' as const },
]

import { Platform } from 'react-native'

const PROVIDER = 'com.google.android.apps.healthdata'

// On Android 14+, health permissions are standard runtime permissions requested via PermissionsAndroid
const ANDROID_14_PLUS = Platform.OS === 'android' && (Platform.Version as number) >= 34

const HEALTH_PERMISSIONS_ANDROID = [
  'android.permission.health.READ_STEPS',
  'android.permission.health.READ_SLEEP',
  'android.permission.health.READ_HEART_RATE',
  'android.permission.health.READ_WEIGHT',
  'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
] as const

async function loadHealthConnectData(): Promise<{ data: HealthData; sdkAvailable: boolean; sdkStatus?: number; error?: string; grantedCount?: number; debugInfo?: string }> {
  try {
    const status = await getSdkStatus(PROVIDER)
    if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
      return { data: EMPTY_DATA, sdkAvailable: false, sdkStatus: status, debugInfo: `SDK status: ${status}` }
    }

    const initialized = await initialize(PROVIDER)
    if (!initialized) return { data: EMPTY_DATA, sdkAvailable: true, error: 'No se pudo inicializar Health Connect', debugInfo: 'initialize() = false' }

    let grantedCount = 0
    let debugInfo = `v6 SDK:${status} init:${initialized}`

    if (ANDROID_14_PLUS) {
      // Android 14+: health permissions are runtime permissions — use standard PermissionsAndroid
      const results = await PermissionsAndroid.requestMultiple(HEALTH_PERMISSIONS_ANDROID as unknown as string[])
      grantedCount = Object.values(results).filter(r => r === PermissionsAndroid.RESULTS.GRANTED).length
      debugInfo += ` android14:true granted:${grantedCount}/${HEALTH_PERMISSIONS_ANDROID.length}`
    } else {
      // Android < 14: use Health Connect SDK permission flow
      const alreadyGranted = await getGrantedPermissions()
      if (alreadyGranted.length === 0) {
        await requestPermission(PERMISSIONS)
      }
      const grantedAfter = await getGrantedPermissions()
      grantedCount = grantedAfter.length
      debugInfo += ` android14:false afterReq:${grantedCount}`
    }

    const today = dayjs().startOf('day').toISOString()
    const now = new Date().toISOString()
    const yesterday = dayjs().subtract(1, 'day').startOf('day').toISOString()
    const week = dayjs().subtract(7, 'day').toISOString()

    const [stepsResult, sleepResult, hrResult, calResult, weightResult] = await Promise.allSettled([
      readRecords('Steps', { timeRangeFilter: { operator: 'between', startTime: today, endTime: now } }),
      readRecords('SleepSession', { timeRangeFilter: { operator: 'between', startTime: yesterday, endTime: now } }),
      readRecords('HeartRate', { timeRangeFilter: { operator: 'between', startTime: today, endTime: now } }),
      readRecords('ActiveCaloriesBurned', { timeRangeFilter: { operator: 'between', startTime: today, endTime: now } }),
      readRecords('Weight', { timeRangeFilter: { operator: 'between', startTime: week, endTime: now } }),
    ])

    const steps = stepsResult.status === 'fulfilled'
      ? stepsResult.value.records.reduce((sum: number, r: any) => sum + (r.count ?? 0), 0)
      : null

    const sleepHours = sleepResult.status === 'fulfilled' && sleepResult.value.records.length > 0
      ? (() => {
          const s = sleepResult.value.records[sleepResult.value.records.length - 1] as any
          return Math.round(((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3600000) * 10) / 10
        })()
      : null

    const hrSamples = hrResult.status === 'fulfilled' ? hrResult.value.records as any[] : []
    const heartRate = hrSamples.length > 0
      ? Math.round(hrSamples[hrSamples.length - 1]?.samples?.[0]?.beatsPerMinute ?? 0) || null
      : null

    const calories = calResult.status === 'fulfilled'
      ? Math.round(calResult.value.records.reduce((sum: number, r: any) => sum + (r.energy?.inKilocalories ?? 0), 0)) || null
      : null

    const weightRecords = weightResult.status === 'fulfilled' ? weightResult.value.records as any[] : []
    const weight = weightRecords.length > 0
      ? Math.round((weightRecords[weightRecords.length - 1]?.weight?.inKilograms ?? 0) * 10) / 10 || null
      : null

    return { data: { steps, sleepHours, heartRate, calories, weight }, sdkAvailable: true, grantedCount, debugInfo }
  } catch (e: any) {
    return { data: EMPTY_DATA, sdkAvailable: false, error: e?.message ?? 'Error desconocido', debugInfo: `catch: ${e?.message}` }
  }
}

export default function HealthConnectScreen() {
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(false)
  const [synced, setSynced] = useState(false)
  const [sdkAvailable, setSdkAvailable] = useState<boolean | null>(null)
  const [sdkStatus, setSdkStatus] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [grantedCount, setGrantedCount] = useState<number | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [data, setData] = useState<HealthData>(EMPTY_DATA)

  const handleSync = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    const result = await loadHealthConnectData()
    setSdkAvailable(result.sdkAvailable)
    setSdkStatus(result.sdkStatus ?? null)
    setData(result.data)
    if (result.grantedCount !== undefined) setGrantedCount(result.grantedCount)
    if (result.error) setErrorMsg(result.error)
    if (result.debugInfo) setDebugInfo(result.debugInfo)
    setSynced(true)
    setLoading(false)
  }, [])

  const hasAnyData = Object.values(data).some((v) => v !== null)

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      >
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🏃‍♀️ Health Connect</Text>
          <Text style={styles.subtitle}>Datos de actividad y salud de hoy</Text>
        </Animated.View>

        {/* Sync card */}
        <Animated.View entering={FadeInDown.delay(80)}>
          <LinearGradient
            colors={['rgba(139,92,246,0.2)', 'rgba(168,85,247,0.1)']}
            style={styles.syncCard}
          >
            <Text style={styles.syncEmoji}>🔗</Text>
            <Text style={styles.syncTitle}>Sincronizar con Health Connect</Text>
            <Text style={styles.syncBody}>
              Lunara lee tus pasos, sueño, frecuencia cardíaca y más directamente desde Google Health Connect, sin almacenar datos en la nube.
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
                  </Text>
              }
            </TouchableOpacity>

            {synced && sdkAvailable === false && (
              <View style={styles.notAvailableBox}>
                <Text style={styles.notAvailableText}>
                  ⚠️ Health Connect no está disponible en este dispositivo.{'\n'}
                  {sdkStatus === 1 ? 'La app de Health Connect no está instalada.' :
                   sdkStatus === 2 ? 'Health Connect necesita actualización.' :
                   'Estado SDK: ' + sdkStatus}
                  {errorMsg ? `\n\nDetalle: ${errorMsg}` : ''}
                </Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata')}>
                  <Text style={styles.installLink}>Instalar Health Connect desde Play Store →</Text>
                </TouchableOpacity>
              </View>
            )}

            {synced && debugInfo && (
              <View style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderRadius: 8, width: '100%' }}>
                <Text style={{ color: '#a78bfa', fontSize: 11, fontFamily: 'monospace' }}>🔍 {debugInfo}</Text>
              </View>
            )}

            {synced && sdkAvailable === true && grantedCount === 0 && (
              <View style={styles.notAvailableBox}>
                <Text style={styles.notAvailableText}>
                  🔒 Los permisos de salud fueron denegados anteriormente y Android los bloqueó permanentemente.{'\n\n'}
                  Ve a: <Text style={{ fontWeight: 'bold' }}>Ajustes → Apps → Lunara → Permisos</Text> y activa todos los permisos de salud.
                </Text>
                <TouchableOpacity onPress={() => Linking.openSettings()} style={{ marginTop: 8 }}>
                  <Text style={styles.installLink}>Abrir ajustes de Lunara →</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openHealthConnectSettings()} style={{ marginTop: 4 }}>
                  <Text style={styles.installLink}>Abrir Health Connect →</Text>
                </TouchableOpacity>
              </View>
            )}

            {synced && sdkAvailable === true && (grantedCount ?? 0) > 0 && !hasAnyData && (
              <View style={styles.notAvailableBox}>
                <Text style={styles.notAvailableText}>
                  📭 Permisos concedidos ({grantedCount}/{PERMISSIONS.length}) pero sin datos para hoy. Asegúrate de que Google Fit o Samsung Health estén sincronizando datos con Health Connect.
                </Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Health metrics grid */}
        {hasAnyData && (
          <Animated.View entering={FadeInDown.delay(160)}>
            <Text style={styles.sectionTitle}>📊 Datos de hoy</Text>
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

        {/* Cycle correlation tip */}
        {hasAnyData && data.steps !== null && (
          <Animated.View entering={FadeInDown.delay(240)}>
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

        {/* Privacy note */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <View style={styles.privacyNote}>
            <Text style={styles.privacyText}>
              🔒 Lunara solo lee los datos, no los almacena en servidores. Todo queda en tu dispositivo.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  )
}

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

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  header: { gap: 4 },
  backBtn: { marginBottom: Spacing.sm },
  backText: { color: Colors.lavender[300], fontSize: Typography.fontSize.base },
  title: { fontSize: Typography.fontSize['3xl'], fontFamily: Typography.fontFamily.bold, color: '#fff' },
  subtitle: { fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.5)' },
  syncCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
    alignItems: 'center', gap: Spacing.sm,
  },
  syncEmoji: { fontSize: 40 },
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
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center', gap: 8, width: '100%',
  },
  notAvailableText: { fontSize: Typography.fontSize.sm, color: '#fca5a5', textAlign: 'center', lineHeight: 20 },
  installLink: { fontSize: Typography.fontSize.sm, color: '#60a5fa', textDecorationLine: 'underline' },
  sectionTitle: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold, color: '#fff', marginTop: 4 },
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
