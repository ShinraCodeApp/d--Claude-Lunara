import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { router } from 'expo-router'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

import { useSymptomStore, useCycleStore, useAuthStore, useGardenStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

dayjs.locale('es')

const PHASE_NAMES: Record<string, string> = {
  menstrual: 'Menstrual', follicular: 'Folicular',
  ovulatory: 'Ovulatoria', luteal: 'Lútea',
}

export default function PdfReportScreen() {
  const insets = useSafeAreaInsets()
  const [generating, setGenerating] = useState(false)
  const { logs } = useSymptomStore()
  const cycleStore = useCycleStore()
  const { user } = useAuthStore()
  const { level, xp } = useGardenStore()

  const last90 = logs.filter((l) =>
    l.date && dayjs(l.date).isAfter(dayjs().subtract(90, 'day'))
  ).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))

  const totalLogs = last90.length
  const periodDays = last90.filter((l) => l.phase === 'menstrual').length
  const avgSleep = last90.filter((l) => l.sleep).reduce((s, l) => s + (l.sleep?.hours ?? 0), 0) / (last90.filter((l) => l.sleep).length || 1)
  const avgWater = last90.filter((l) => l.water).reduce((s, l) => s + (l.water ?? 0), 0) / (last90.filter((l) => l.water).length || 1)

  const moodCount: Record<string, number> = {}
  last90.forEach((l) => { if (l.mood) moodCount[l.mood] = (moodCount[l.mood] ?? 0) + 1 })
  const topMood = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  const symptomCount: Record<string, number> = {}
  last90.forEach((l) => (l.symptoms ?? []).forEach((s) => { symptomCount[s] = (symptomCount[s] ?? 0) + 1 }))
  const topSymptoms = Object.entries(symptomCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const migraineCount = last90.filter((l) => (l as any).migraine).length

  const buildHtml = () => {
    const name = user?.profile?.firstName ?? 'Usuaria'
    const today = dayjs().format('D [de] MMMM [de] YYYY')
    const phase = cycleStore.currentPhase ? PHASE_NAMES[cycleStore.currentPhase] : '—'

    const logRows = last90.slice(-30).map((l) => `
      <tr>
        <td>${dayjs(l.date).format('D MMM')}</td>
        <td>${PHASE_NAMES[l.phase ?? ''] ?? '—'}</td>
        <td>${l.mood ?? '—'}</td>
        <td>${l.energy ?? '—'}</td>
        <td>${l.sleep?.hours ?? '—'}h</td>
        <td>${(l as any).flowIntensity ?? (l.phase === 'menstrual' ? '✓' : '—')}</td>
        <td>${(l.symptoms ?? []).length > 0 ? (l.symptoms ?? []).slice(0, 2).join(', ') : '—'}</td>
      </tr>
    `).join('')

    const symptomRows = topSymptoms.map(([s, c]) =>
      `<tr><td>${s}</td><td>${c} ${c === 1 ? 'vez' : 'veces'}</td></tr>`
    ).join('')

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: Arial, sans-serif; color: #1a0533; margin: 0; padding: 24px; }
  .header { background: linear-gradient(135deg, #1a0533, #7c3aed); color: white; padding: 24px; border-radius: 12px; margin-bottom: 20px; }
  .header h1 { margin: 0; font-size: 22px; }
  .header p { margin: 4px 0 0; opacity: 0.8; font-size: 13px; }
  .badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 12px; font-size: 11px; margin-top: 8px; }
  .grid { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .stat { background: #f5f0ff; border-radius: 10px; padding: 14px 18px; flex: 1; min-width: 120px; }
  .stat-value { font-size: 24px; font-weight: bold; color: #7c3aed; }
  .stat-label { font-size: 11px; color: #6b7280; margin-top: 2px; }
  h2 { color: #4c1d95; font-size: 15px; border-bottom: 2px solid #e9d5ff; padding-bottom: 6px; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #7c3aed; color: white; padding: 8px; text-align: left; }
  td { padding: 7px 8px; border-bottom: 1px solid #f0e7ff; }
  tr:nth-child(even) td { background: #faf5ff; }
  .disclaimer { font-size: 10px; color: #9ca3af; margin-top: 24px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  .footer { text-align: center; margin-top: 12px; font-size: 11px; color: #7c3aed; }
</style>
</head>
<body>
<div class="header">
  <h1>🌙 Reporte de Ciclo — ${name}</h1>
  <p>Generado el ${today} · Últimos 90 días</p>
  <span class="badge">Fase actual: ${phase} · Día ${cycleStore.dayOfCycle ?? '—'} del ciclo</span>
</div>

<div class="grid">
  <div class="stat"><div class="stat-value">${totalLogs}</div><div class="stat-label">Registros totales</div></div>
  <div class="stat"><div class="stat-value">${periodDays}</div><div class="stat-label">Días de período</div></div>
  <div class="stat"><div class="stat-value">${avgSleep.toFixed(1)}h</div><div class="stat-label">Sueño promedio</div></div>
  <div class="stat"><div class="stat-value">${avgWater.toFixed(1)}</div><div class="stat-label">Vasos agua/día</div></div>
  <div class="stat"><div class="stat-value">${migraineCount}</div><div class="stat-label">Días con migraña</div></div>
  <div class="stat"><div class="stat-value">${topMood}</div><div class="stat-label">Ánimo frecuente</div></div>
</div>

${topSymptoms.length > 0 ? `
<h2>Síntomas más frecuentes</h2>
<table>
  <tr><th>Síntoma</th><th>Frecuencia</th></tr>
  ${symptomRows}
</table>` : ''}

<h2>Últimos 30 días — Registro diario</h2>
<table>
  <tr>
    <th>Fecha</th><th>Fase</th><th>Ánimo</th><th>Energía</th>
    <th>Sueño</th><th>Flujo</th><th>Síntomas</th>
  </tr>
  ${logRows || '<tr><td colspan="7" style="text-align:center;color:#9ca3af">Sin registros</td></tr>'}
</table>

<p class="disclaimer">
  Este reporte fue generado por Lunara by ShinraCode. Es solo informativo y no reemplaza
  el diagnóstico médico profesional. Consulta siempre a tu ginecóloga con estos datos.
</p>
<p class="footer">🌙 Lunara by ShinraCode · shinracode.com · Nivel ${level} (${xp} XP)</p>
</body>
</html>`
  }

  const generatePdf = async () => {
    if (totalLogs === 0) {
      Alert.alert('Sin datos', 'Necesitas al menos un registro para generar el reporte.')
      return
    }
    setGenerating(true)
    try {
      const html = buildHtml()
      const { uri } = await Print.printToFileAsync({ html, base64: false })
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartir reporte de ciclo',
          UTI: 'com.adobe.pdf',
        })
      } else {
        Alert.alert('PDF generado', `Guardado en: ${uri}`)
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar el PDF. Inténtalo de nuevo.')
    } finally {
      setGenerating(false)
    }
  }

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
          <Text style={styles.title}>📄 Reporte PDF</Text>
          <Text style={styles.subtitle}>Para compartir con tu ginecóloga</Text>
        </Animated.View>

        {/* Preview stats */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <LinearGradient colors={['rgba(139,92,246,0.2)', 'rgba(168,85,247,0.1)']} style={styles.previewCard}>
            <Text style={styles.previewTitle}>Resumen últimos 90 días</Text>
            <View style={styles.statsGrid}>
              {[
                { label: 'Registros', value: String(totalLogs) },
                { label: 'Días período', value: String(periodDays) },
                { label: 'Sueño prom.', value: `${avgSleep.toFixed(1)}h` },
                { label: 'Migrañas', value: String(migraineCount) },
                { label: 'Ánimo frec.', value: topMood },
                { label: 'Fase actual', value: cycleStore.currentPhase ? PHASE_NAMES[cycleStore.currentPhase] : '—' },
              ].map((s) => (
                <View key={s.label} style={styles.statBox}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* What's included */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(139,92,246,0.05)']} style={styles.includesCard}>
            <Text style={styles.includesTitle}>El reporte incluye:</Text>
            {[
              '📅 Registros diarios de los últimos 30 días',
              '🩸 Días de período e intensidad del flujo',
              '😊 Patrones de ánimo y energía',
              '💤 Calidad y horas de sueño',
              '🤕 Síntomas más frecuentes',
              '🤕 Frecuencia de migraña',
              '💧 Hidratación promedio',
            ].map((item) => (
              <View key={item} style={styles.includesRow}>
                <Text style={styles.includesText}>{item}</Text>
              </View>
            ))}
          </LinearGradient>
        </Animated.View>

        {/* Generate button */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <TouchableOpacity onPress={generatePdf} disabled={generating} activeOpacity={0.9}>
            <LinearGradient
              colors={generating ? ['#6b7280', '#6b7280'] : [Colors.primary[600], Colors.lavender[500]]}
              style={styles.generateBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              {generating
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.generateBtnText}>📄 Generar y compartir PDF</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.disclaimer}>
            Solo informativo. No reemplaza el diagnóstico médico.
          </Text>
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
  subtitle: { fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.5)' },
  previewCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
  },
  previewTitle: {
    fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold,
    color: '#c4b5fd', marginBottom: Spacing.md,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statBox: {
    backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: BorderRadius.lg,
    padding: Spacing.sm, alignItems: 'center', minWidth: 90, flex: 1,
  },
  statValue: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  statLabel: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  includesCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8,
  },
  includesTitle: {
    fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold,
    color: '#fff', marginBottom: 4,
  },
  includesRow: { paddingLeft: 4 },
  includesText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)' },
  generateBtn: {
    borderRadius: BorderRadius.xl, paddingVertical: Spacing.md + 2, alignItems: 'center',
  },
  generateBtnText: { color: '#fff', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold },
  disclaimer: {
    fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.3)',
    textAlign: 'center', marginTop: Spacing.sm,
  },
})
