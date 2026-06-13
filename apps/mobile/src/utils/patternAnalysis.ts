import { SymptomEntry } from '@/store'

export interface PhasePattern {
  phase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal'
  label: string
  emoji: string
  totalLogs: number
  topMood: string | null
  topEnergy: 'alta' | 'media' | 'baja' | null
  topSymptoms: string[]
  avgSleepHours: number | null
  intimacyFreq: number   // 0–1
  avgDesire: number | null
  insights: string[]
}

const PHASE_LABELS: Record<string, string> = {
  menstrual: 'Menstrual',
  follicular: 'Folicular',
  ovulatory: 'Ovulatoria',
  luteal: 'Lútea',
}

const PHASE_EMOJIS: Record<string, string> = {
  menstrual: '🌑',
  follicular: '🌒',
  ovulatory: '🌕',
  luteal: '🌗',
}

const SYMPTOM_LABELS: Record<string, string> = {
  colicos: 'cólicos',
  dolor_cabeza: 'cefalea',
  dolor_espalda: 'dolor de espalda',
  hinchazón: 'hinchazón',
  sensibilidad: 'sensibilidad en senos',
  nauseas: 'náuseas',
  acne: 'acné',
  insomnio: 'insomnio',
}

const MOOD_LABELS: Record<string, string> = {
  feliz: 'alegría',
  tranquila: 'calma',
  ansiosa: 'ansiedad',
  irritable: 'irritabilidad',
  triste: 'tristeza',
}

function mode<T>(arr: T[]): T | null {
  if (!arr.length) return null
  const freq: Record<string, number> = {}
  for (const v of arr) {
    const k = String(v)
    freq[k] = (freq[k] ?? 0) + 1
  }
  return arr.reduce((a, b) => (freq[String(b)] > freq[String(a)] ? b : a))
}

function topN(arr: string[], n: number): string[] {
  const freq: Record<string, number> = {}
  for (const v of arr) freq[v] = (freq[v] ?? 0) + 1
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k)
}

function avg(arr: number[]): number | null {
  if (!arr.length) return null
  return parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1))
}

export function analyzePatterns(logs: SymptomEntry[]): PhasePattern[] {
  const phases: Array<'menstrual' | 'follicular' | 'ovulatory' | 'luteal'> = [
    'menstrual', 'follicular', 'ovulatory', 'luteal',
  ]

  return phases.map((phase) => {
    const phaseLogs = logs.filter((l) => l.phase === phase)
    const moods = phaseLogs.map((l) => l.mood).filter(Boolean) as string[]
    const energies = phaseLogs.map((l) => l.energy).filter(Boolean) as string[]
    const allSymptoms = phaseLogs.flatMap((l) => l.symptoms)

    const topMood = mode(moods)
    const topEnergy = mode(energies) as 'alta' | 'media' | 'baja' | null
    const topSymptoms = topN(allSymptoms, 3)

    const sleepValues = phaseLogs.map((l) => l.sleep?.hours).filter((h): h is number => h != null)
    const avgSleepHours = avg(sleepValues)

    const intimacyLogs = phaseLogs.filter((l) => l.intimacy != null)
    const intimacyFreq = intimacyLogs.length > 0
      ? intimacyLogs.filter((l) => l.intimacy!.hadSex).length / phaseLogs.length
      : 0

    const desireValues = phaseLogs.map((l) => l.intimacy?.desireLevel).filter((d): d is number => d != null)
    const avgDesire = avg(desireValues)

    const insights: string[] = []

    if (phaseLogs.length >= 2) {
      if (topEnergy === 'alta') {
        insights.push(`Tu energía suele ser alta en la fase ${PHASE_LABELS[phase].toLowerCase()} — aprovéchala para actividades intensas.`)
      } else if (topEnergy === 'baja') {
        insights.push(`En la fase ${PHASE_LABELS[phase].toLowerCase()} tiendes a sentirte con poca energía. Planea días más tranquilos.`)
      }

      if (topMood && MOOD_LABELS[topMood]) {
        insights.push(`Tu estado de ánimo más frecuente en esta fase es ${MOOD_LABELS[topMood]}.`)
      }

      if (topSymptoms.length > 0) {
        const names = topSymptoms.map((s) => SYMPTOM_LABELS[s] ?? s).join(', ')
        insights.push(`Los síntomas que más aparecen: ${names}.`)
      }

      if (avgSleepHours !== null) {
        if (avgSleepHours < 6.5) {
          insights.push(`Duermes un promedio de ${avgSleepHours}h en esta fase — menos de lo recomendado. El sueño afecta tus hormonas.`)
        } else if (avgSleepHours >= 7.5) {
          insights.push(`Tu sueño promedio en esta fase es ${avgSleepHours}h — excelente para la regulación hormonal.`)
        }
      }

      if (intimacyFreq > 0.5) {
        insights.push(`Tu actividad íntima es más frecuente en la fase ${PHASE_LABELS[phase].toLowerCase()} — la libido varía con el ciclo.`)
      }

      if (avgDesire !== null && avgDesire >= 4) {
        insights.push(`Tu deseo sexual es alto durante esta fase (promedio ${avgDesire}/5).`)
      } else if (avgDesire !== null && avgDesire <= 2 && avgDesire > 0) {
        insights.push(`Tu deseo tiende a ser bajo en la fase ${PHASE_LABELS[phase].toLowerCase()} (promedio ${avgDesire}/5) — completamente normal.`)
      }

      if (phase === 'luteal' && topSymptoms.includes('colicos')) {
        insights.push('Tus cólicos suelen comenzar en la fase lútea — considera calor local o ibuprofeno preventivo.')
      }

      if (phase === 'follicular' && topEnergy === 'alta') {
        insights.push('Tu fase folicular es tu ventana de mayor rendimiento. Ideal para reuniones importantes y entrenamientos.')
      }

      if (phase === 'ovulatory' && intimacyFreq > 0.3) {
        insights.push('Tu actividad íntima aumenta en la ovulación — el instinto biológico funciona.')
      }
    } else if (phaseLogs.length === 1) {
      insights.push('Con más registros podrás ver tus patrones en esta fase.')
    } else {
      insights.push('Aún no tienes registros en esta fase. ¡Empieza a registrar para ver tus patrones!')
    }

    return {
      phase,
      label: PHASE_LABELS[phase],
      emoji: PHASE_EMOJIS[phase],
      totalLogs: phaseLogs.length,
      topMood,
      topEnergy,
      topSymptoms,
      avgSleepHours,
      intimacyFreq,
      avgDesire,
      insights,
    }
  })
}

export interface WellnessSummary {
  avgSleepOverall: number | null
  avgWater: number | null
  totalIntimacyDays: number
  avgDesireOverall: number | null
  bbtLogs: Array<{ date: string; bbt: number }>
}

export function computeWellnessSummary(logs: SymptomEntry[]): WellnessSummary {
  const sleepVals = logs.map((l) => l.sleep?.hours).filter((h): h is number => h != null)
  const waterVals = logs.map((l) => l.water).filter((w): w is number => w != null)
  const intimacyDays = logs.filter((l) => l.intimacy?.hadSex).length
  const desireVals = logs.map((l) => l.intimacy?.desireLevel).filter((d): d is number => d != null)
  const bbtLogs = logs
    .filter((l) => l.bbt != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => ({ date: l.date, bbt: l.bbt! }))

  return {
    avgSleepOverall: avg(sleepVals),
    avgWater: avg(waterVals),
    totalIntimacyDays: intimacyDays,
    avgDesireOverall: avg(desireVals),
    bbtLogs,
  }
}
