import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'
import { SymptomEntry } from '@/store'

interface ReportData {
  userName: string
  month: string
  year: number
  logs: SymptomEntry[]
  cycleLength?: number
  currentPhase?: string | null
}

function phaseLabel(phase: string | null | undefined): string {
  const map: Record<string, string> = {
    menstrual: 'Menstrual', follicular: 'Folicular',
    ovulatory: 'Ovulatoria', luteal: 'Lútea',
  }
  return phase ? (map[phase] ?? phase) : '—'
}

function moodEmoji(mood: string | null): string {
  const map: Record<string, string> = {
    feliz: '😊', triste: '😢', irritable: '😤', ansiosa: '😰',
    tranquila: '😌', energética: '⚡', cansada: '😴', sensible: '🥺',
  }
  return mood ? (map[mood] ?? '😐') : '—'
}

export async function generateMonthlyReport(data: ReportData): Promise<void> {
  const { userName, month, year, logs } = data
  if (logs.length === 0) {
    throw new Error('No hay registros para este mes')
  }

  // Stats
  const moodCounts: Record<string, number> = {}
  const symptomCounts: Record<string, number> = {}
  let totalSleep = 0, sleepDays = 0
  let totalWater = 0, waterDays = 0
  let totalWeight = 0, weightDays = 0
  let intimacyDays = 0
  let pillDays = 0

  logs.forEach((l) => {
    if (l.mood) moodCounts[l.mood] = (moodCounts[l.mood] ?? 0) + 1
    l.symptoms.forEach((s) => { symptomCounts[s] = (symptomCounts[s] ?? 0) + 1 })
    if (l.sleep) { totalSleep += l.sleep.hours; sleepDays++ }
    if (l.water) { totalWater += l.water; waterDays++ }
    if (l.weight) { totalWeight += l.weight; weightDays++ }
    if (l.intimacy?.hadSex) intimacyDays++
    if (l.medications?.pill) pillDays++
  })

  const avgSleep = sleepDays > 0 ? (totalSleep / sleepDays).toFixed(1) : '—'
  const avgWater = waterDays > 0 ? Math.round(totalWater / waterDays) : '—'
  const avgWeight = weightDays > 0 ? (totalWeight / weightDays).toFixed(1) : '—'
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  const topSymptoms = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, c]) => `${s} (${c}x)`)

  const bbtLogs = logs.filter((l) => l.bbt).map((l) => ({
    date: l.date.slice(5), bbt: l.bbt!, phase: l.phase,
  }))

  // Build HTML
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reporte Lunara — ${month} ${year}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a0533; background: #fff; font-size: 12px; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }

  .header { background: linear-gradient(135deg, #7c3aed, #c026d3); color: #fff; padding: 32px; border-radius: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 28px; font-weight: 800; margin-bottom: 4px; }
  .header p { opacity: 0.85; font-size: 14px; }
  .logo { font-size: 13px; opacity: 0.7; margin-top: 16px; }

  .section { margin-bottom: 24px; }
  .section-title { font-size: 14px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 2px solid #f3e8ff; padding-bottom: 6px; }

  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .stat-card { background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 16px; text-align: center; }
  .stat-icon { font-size: 24px; margin-bottom: 4px; }
  .stat-value { font-size: 22px; font-weight: 800; color: #7c3aed; }
  .stat-label { font-size: 10px; color: #6b7280; margin-top: 2px; }

  .log-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .log-table th { background: #f3e8ff; color: #7c3aed; padding: 8px; text-align: left; font-weight: 700; }
  .log-table td { padding: 7px 8px; border-bottom: 1px solid #f3e8ff; }
  .log-table tr:nth-child(even) td { background: #fafafa; }

  .bbt-row { display: flex; align-items: flex-end; gap: 4px; height: 80px; margin-top: 8px; }
  .bbt-bar-wrap { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
  .bbt-bar { width: 100%; border-radius: 3px 3px 0 0; min-height: 4px; }
  .bbt-label { font-size: 8px; color: #6b7280; }

  .symptom-pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .pill { background: #f3e8ff; color: #7c3aed; border-radius: 20px; padding: 4px 10px; font-size: 11px; font-weight: 600; }

  .footer { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
  .phase-badge { display: inline-block; border-radius: 8px; padding: 2px 7px; font-size: 10px; font-weight: 600; }
  .menstrual { background: #fee2e2; color: #dc2626; }
  .follicular { background: #dcfce7; color: #16a34a; }
  .ovulatory { background: #fef9c3; color: #ca8a04; }
  .luteal { background: #ede9fe; color: #7c3aed; }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <h1>🌙 Reporte Mensual</h1>
    <p>${month} ${year} · ${userName}</p>
    <p style="margin-top:8px;font-size:12px;opacity:0.75">${logs.length} días registrados</p>
    <div class="logo">Generado por Lunara · by ShinraCode</div>
  </div>

  <!-- Stats -->
  <div class="section">
    <div class="section-title">Resumen del mes</div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon">😴</div><div class="stat-value">${avgSleep}h</div><div class="stat-label">Sueño medio</div></div>
      <div class="stat-card"><div class="stat-icon">💧</div><div class="stat-value">${avgWater}</div><div class="stat-label">Vasos de agua/día</div></div>
      <div class="stat-card"><div class="stat-icon">⚖️</div><div class="stat-value">${avgWeight}kg</div><div class="stat-label">Peso medio</div></div>
      <div class="stat-card"><div class="stat-icon">${moodEmoji(topMood)}</div><div class="stat-value" style="font-size:14px">${topMood}</div><div class="stat-label">Estado predominante</div></div>
    </div>
  </div>

  <!-- Symptoms -->
  ${topSymptoms.length > 0 ? `
  <div class="section">
    <div class="section-title">Síntomas más frecuentes</div>
    <div class="symptom-pills">
      ${topSymptoms.map((s) => `<span class="pill">${s}</span>`).join('')}
    </div>
  </div>` : ''}

  <!-- BBT chart -->
  ${bbtLogs.length >= 3 ? `
  <div class="section">
    <div class="section-title">Temperatura Basal (BBT)</div>
    <div class="bbt-row">
      ${bbtLogs.map((b) => {
        const minT = 36.0, maxT = 37.5
        const pct = Math.round(((b.bbt - minT) / (maxT - minT)) * 70 + 10)
        const color = b.bbt >= 37.0 ? '#f43f5e' : '#818cf8'
        return `<div class="bbt-bar-wrap">
          <div class="bbt-bar" style="height:${pct}px;background:${color}"></div>
          <div class="bbt-label">${b.date}</div>
        </div>`
      }).join('')}
    </div>
    <p style="font-size:10px;color:#6b7280;margin-top:6px">🟣 Pre-ovulación &nbsp; 🔴 Post-ovulación (≥37°C)</p>
  </div>` : ''}

  <!-- Daily log table -->
  <div class="section">
    <div class="section-title">Registro diario</div>
    <table class="log-table">
      <thead>
        <tr>
          <th>Fecha</th><th>Fase</th><th>Ánimo</th><th>Energía</th>
          <th>Síntomas</th><th>Sueño</th><th>BBT</th>
        </tr>
      </thead>
      <tbody>
        ${logs.map((l) => `
        <tr>
          <td>${l.date}</td>
          <td><span class="phase-badge ${l.phase ?? ''}">${phaseLabel(l.phase)}</span></td>
          <td>${moodEmoji(l.mood)} ${l.mood ?? '—'}</td>
          <td>${l.energy === 'alta' ? '⚡' : l.energy === 'media' ? '🔸' : l.energy === 'baja' ? '🔻' : '—'} ${l.energy ?? '—'}</td>
          <td style="max-width:120px">${l.symptoms.length > 0 ? l.symptoms.slice(0, 3).join(', ') : '—'}</td>
          <td>${l.sleep ? `${l.sleep.hours}h (${l.sleep.quality})` : '—'}</td>
          <td>${l.bbt ? `${l.bbt}°C` : '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- Health summary -->
  <div class="section">
    <div class="section-title">Salud integral</div>
    <table class="log-table">
      <thead><tr><th>Métrica</th><th>Valor</th><th>Días registrados</th></tr></thead>
      <tbody>
        <tr><td>💊 Pastilla tomada</td><td>${pillDays} días</td><td>${logs.length} total</td></tr>
        <tr><td>💕 Actividad íntima</td><td>${intimacyDays} días</td><td>${logs.length} total</td></tr>
        <tr><td>⚖️ Peso promedio</td><td>${avgWeight} kg</td><td>${weightDays}</td></tr>
        <tr><td>💧 Hidratación media</td><td>${avgWater} vasos/día</td><td>${waterDays}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    Reporte generado el ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
    por Lunara · by ShinraCode · Información privada y confidencial
  </div>
</div>
</body>
</html>`

  const { uri } = await Print.printToFileAsync({ html, base64: false })

  const fileName = `Lunara_Reporte_${month.replace(/\s/g, '_')}_${year}.pdf`
  const destUri = `${FileSystem.documentDirectory}${fileName}`
  await FileSystem.copyAsync({ from: uri, to: destUri })

  const canShare = await Sharing.isAvailableAsync()
  if (canShare) {
    await Sharing.shareAsync(destUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Reporte Lunara — ${month} ${year}`,
      UTI: 'com.adobe.pdf',
    })
  }
}
