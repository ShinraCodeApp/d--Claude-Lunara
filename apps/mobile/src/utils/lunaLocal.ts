import { SymptomEntry } from '@/store'

// Generates a personalized offline response for Luna when the backend is unavailable.
// Uses the user's real cycle and symptom data to make responses feel relevant.

const PHASE_BASE: Record<string, string> = {
  menstrual: 'menstrual',
  follicular: 'folicular',
  ovulatory: 'ovulatoria',
  luteal: 'lútea',
}

function topSymptoms(logs: SymptomEntry[]): string[] {
  const count: Record<string, number> = {}
  logs.forEach((l) => l.symptoms.forEach((s) => { count[s] = (count[s] ?? 0) + 1 }))
  return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s.replace(/_/g, ' '))
}

function topMood(logs: SymptomEntry[]): string | null {
  const count: Record<string, number> = {}
  logs.forEach((l) => { if (l.mood) count[l.mood] = (count[l.mood] ?? 0) + 1 })
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function avgSleep(logs: SymptomEntry[]): number | null {
  const vals = logs.filter((l) => l.sleep?.hours).map((l) => l.sleep!.hours)
  if (!vals.length) return null
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
}

export function buildLunaContext(
  phase: string | null,
  dayOfCycle: number | null,
  logs: SymptomEntry[]
): string {
  const last14 = logs.slice(-14)
  const symptoms = topSymptoms(last14)
  const mood = topMood(last14)
  const sleep = avgSleep(last14)
  const phaseName = PHASE_BASE[phase ?? ''] ?? 'actual'

  const parts = [
    `Estás en la fase ${phaseName}, día ${dayOfCycle ?? '?'} del ciclo.`,
    symptoms.length > 0 ? `Síntomas frecuentes recientes: ${symptoms.join(', ')}.` : '',
    mood ? `Tu ánimo predominante ha sido: ${mood}.` : '',
    sleep ? `Duermes en promedio ${sleep}h.` : '',
  ].filter(Boolean)

  return parts.join(' ')
}

export function generateLocalResponse(
  userMessage: string,
  phase: string | null,
  dayOfCycle: number | null,
  logs: SymptomEntry[]
): string {
  const msg = userMessage.toLowerCase()
  const last14 = logs.slice(-14)
  const symptoms = topSymptoms(last14)
  const phaseName = PHASE_BASE[phase ?? ''] ?? 'actual'
  const sleep = avgSleep(last14)
  const ctx = buildLunaContext(phase, dayOfCycle, logs)

  // Dolor / cólicos
  if (/dolor|cólico|calambr|menstrual/.test(msg)) {
    const hasCramps = symptoms.some((s) => /colico|calambr|dolor/.test(s))
    return [
      `🌙 ${ctx}`,
      '',
      hasCramps
        ? `Veo que los cólicos han aparecido en tus registros recientes. Aquí algunas estrategias que ayudan:`
        : `Sobre el dolor menstrual:`,
      '• El calor local (bolsa de agua caliente) puede reducir los cólicos hasta un 40%.',
      '• El magnesio (chocolate oscuro 70%+, espinacas) ayuda a relajar la musculatura.',
      '• El ibuprofeno funciona mejor si se toma antes de que empiece el dolor.',
      '• Movimiento suave como yoga o caminatas puede aliviar mejor que el reposo total.',
      '',
      '⚕️ Si el dolor es muy intenso o incapacitante, consulta a tu ginecóloga.',
    ].join('\n')
  }

  // Fertilidad / embarazo / ovulación
  if (/fertil|embaraz|ovulaci|concebir|quedar|bebé/.test(msg)) {
    const isOvulatory = phase === 'ovulatory'
    const isFolicular = phase === 'follicular'
    return [
      `🌙 ${ctx}`,
      '',
      isOvulatory
        ? '¡Estás en tu fase ovulatoria, que es cuando la fertilidad está en su pico! Los días alrededor de la ovulación son los más fértiles (±2 días).'
        : isFolicular
          ? 'Estás en la fase folicular — tu cuerpo se está preparando para ovular. La ventana fértil se acerca.'
          : 'La fertilidad varía mucho a lo largo del ciclo.',
      '',
      '• El moco cervical elástico (como clara de huevo) indica proximidad a la ovulación.',
      '• La temperatura basal sube 0.2–0.5°C DESPUÉS de ovular.',
      `• Día ${dayOfCycle ?? '?'} del ciclo: en un ciclo de 28 días, la ovulación típica ocurre alrededor del día 14.`,
      '',
      '⚕️ Si llevas más de 12 meses intentando sin éxito, consulta con un especialista en fertilidad.',
    ].join('\n')
  }

  // Ánimo / emociones
  if (/ánimo|humor|triste|deprimi|ansiosa|irritable|llor|emocional|mal|sentir/.test(msg)) {
    const mood = topMood(last14)
    return [
      `🌙 ${ctx}`,
      '',
      `Los cambios de ánimo son muy comunes durante el ciclo, especialmente en la fase ${phaseName}.`,
      mood ? `En tus últimos registros, tu ánimo más frecuente ha sido "${mood}".` : '',
      '',
      phase === 'luteal'
        ? '• En la fase lútea, la progesterona puede causar irritabilidad y sensibilidad emocional — es completamente normal.'
        : phase === 'menstrual'
          ? '• Durante el período, los niveles hormonales están bajos, lo que puede generar melancolía. Date permiso de descansar.'
          : '• En la fase folicular y ovulatoria el estrógeno generalmente eleva el ánimo.',
      '• El ejercicio moderado libera endorfinas que contrarrestan el mal humor hormonal.',
      '• Si el bajo ánimo es intenso y recurrente cada mes, puede ser TDPM — hablalo con tu médica.',
    ].filter(Boolean).join('\n')
  }

  // Sueño
  if (/sueño|dormir|insomnio|cansad|fatiga|agotada/.test(msg)) {
    return [
      `🌙 ${ctx}`,
      '',
      sleep
        ? `Según tus registros, duermes un promedio de ${sleep}h. ${sleep < 7 ? 'Eso está por debajo de las 7-8h recomendadas.' : '¡Estás dentro del rango saludable!'}`
        : 'El sueño es muy importante para la salud hormonal.',
      '',
      phase === 'luteal'
        ? '• El insomnio es más frecuente en la fase lútea por los cambios de progesterona.'
        : phase === 'menstrual'
          ? '• Dormir más durante el período ayuda a la recuperación. Es perfectamente normal necesitar más horas.'
          : '',
      '• Evitar pantallas 1h antes de dormir mejora la calidad del sueño.',
      '• La melatonina puede ayudar con el insomnio lúteo.',
      '• El magnesio por la noche tiene efecto relajante.',
    ].filter(Boolean).join('\n')
  }

  // Peso / nutrición
  if (/peso|dieta|comer|nutric|aliment|engord|adelgaz/.test(msg)) {
    return [
      `🌙 ${ctx}`,
      '',
      `La nutrición óptima cambia a lo largo del ciclo. En la fase ${phaseName}:`,
      '',
      phase === 'menstrual'
        ? '• Alimentos ricos en hierro: lentejas, espinacas, carne roja magra.\n• Vitamina C con el hierro triplica la absorción.\n• Evita el alcohol y el exceso de cafeína — intensifican los cólicos.'
        : phase === 'follicular'
          ? '• Fase de mayor sensibilidad a la insulina — buenos carbohidratos se procesan mejor.\n• Proteínas magras y vegetales de hoja verde para apoyar el estrógeno.'
          : phase === 'ovulatory'
            ? '• Tu metabolismo está en su pico — puedes tolerar comidas más variadas.\n• Antioxidantes (frutas de colores) para apoyar la fertilidad.'
            : '• Reduce la sal para disminuir retención de líquidos.\n• Magnesio y B6 contra el PMS.\n• Los antojos de carbohidratos son normales — elige integrales.',
      '',
      '⚕️ Para cambios de peso significativos, consulta con un especialista en nutrición.',
    ].join('\n')
  }

  // Pregunta sobre la fase actual
  if (/qué es|que es|estoy en|mi fase|mi ciclo|cuando|cuándo/.test(msg)) {
    return [
      `🌙 ${ctx}`,
      '',
      phase === 'menstrual'
        ? 'Estás en la fase menstrual. Tu cuerpo está renovándose — el endometrio se desprende. Es normal sentir más cansancio, cólicos y querer descansar. Escúchate.'
        : phase === 'follicular'
          ? 'Estás en la fase folicular. Los estrógenos están subiendo — muchas mujeres se sienten más energéticas, creativas y sociables en esta fase. ¡Aprovéchala!'
          : phase === 'ovulatory'
            ? `Estás en la fase ovulatoria, probablemente alrededor del día ${dayOfCycle ?? 14}. Es cuando la fertilidad está en su máximo y muchas mujeres se sienten en su mejor momento.`
            : 'Estás en la fase lútea. La progesterona domina — puedes sentirte más introspectiva, con cambios de ánimo o fatiga. Es normal querer más descanso.',
    ].join('\n')
  }

  // Respuesta genérica personalizada
  return [
    `🌙 ${ctx}`,
    '',
    'Entiendo tu pregunta. Aunque no tengo conexión al servidor en este momento para darte una respuesta más completa, puedo decirte que:',
    '',
    `• En la fase ${phaseName} es importante escuchar a tu cuerpo.`,
    symptoms.length > 0
      ? `• He notado que has registrado: ${symptoms.join(', ')} — si te molestan frecuentemente, podría valer la pena comentarlo con tu ginecóloga.`
      : '',
    '• Si tu pregunta es sobre síntomas persistentes o cambios inusuales, siempre es mejor consultar con un profesional médico.',
    '',
    '💡 Cuando haya conexión disponible, podrás hacerme preguntas más específicas.',
  ].filter(Boolean).join('\n')
}
