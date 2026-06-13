const es = {
  // Common
  save: 'Guardar',
  cancel: 'Cancelar',
  delete: 'Borrar',
  edit: 'Editar',
  back: 'Atrás',
  yes: 'Sí',
  no: 'No',
  close: 'Cerrar',
  loading: 'Cargando...',
  error: 'Error',
  success: 'Éxito',
  confirm: 'Confirmar',
  optional: 'Opcional',
  active: 'Activo',
  inactive: 'Inactivo',
  days: 'días',
  day: 'día',
  hours: 'horas',
  minutes: 'minutos',
  today: 'Hoy',
  yesterday: 'Ayer',
  tomorrow: 'Mañana',
  week: 'semana',
  month: 'mes',
  year: 'año',

  // Navigation tabs
  nav: {
    home: 'Inicio',
    calendar: 'Calendario',
    log: 'Registrar',
    garden: 'Jardín',
    insights: 'Insights',
  },

  // Home
  home: {
    greeting: 'Hola',
    cycleDay: 'Día {{day}} del ciclo',
    nextPeriod: 'Próximo período en {{days}} días',
    periodActive: 'Período activo',
    energy: 'Energía',
    sharePhase: 'Compartir',
    quickLog: 'Registro rápido',
    phases: {
      menstrual: 'Fase Menstrual',
      follicular: 'Fase Folicular',
      ovulatory: 'Fase Ovulatoria',
      luteal: 'Fase Lútea',
    },
    phaseDesc: {
      menstrual: 'Tu cuerpo se renueva. Descansa y cuídate.',
      follicular: 'Tu energía aumenta. ¡Es tiempo de nuevos proyectos!',
      ovulatory: 'Estás en tu pico de energía y fertilidad.',
      luteal: 'Tu cuerpo se prepara. Atiende tus necesidades.',
    },
  },

  // Calendar
  calendar: {
    title: 'Calendario Lunar',
    legend: {
      period: 'Menstruación',
      predicted: 'Período predicho',
      ovulation: 'Ovulación',
      fertile: 'Fértil',
    },
    noData: 'Sin registros para este día',
    registerDay: '+ Registrar este día',
    editDay: '✏️ Editar registro',
    predictions: 'Predicciones del ciclo',
    nextPeriod: 'Próximo período',
    confidence: 'Confianza',
    weekdays: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
  },

  // Log / Symptoms
  log: {
    titleToday: '¿Cómo te sientes hoy? 🌙',
    titlePast: '¿Cómo te sentiste? 🌙',
    editingBadge: '✏️ Editando registro guardado',
    saveRecord: '💾 Guardar registro',
    saveChanges: '✏️ Guardar cambios',
    saving: 'Guardando...',
    saved: '✓ ¡Guardado!',
    period: {
      question: '¿Estás en período?',
      active: 'Estoy en período',
      tap: 'Toca para marcar inicio del período',
      flow: 'Flujo',
      spotting: 'Manchado',
      light: 'Ligero',
      medium: 'Moderado',
      heavy: 'Abundante',
    },
    mood: {
      title: 'Estado de ánimo',
      intensity: 'Intensidad',
      happy: 'Feliz',
      sad: 'Triste',
      anxious: 'Ansiosa',
      stressed: 'Estresada',
      motivated: 'Motivada',
      relaxed: 'Relajada',
      irritable: 'Irritable',
      energetic: 'Energética',
      tired: 'Cansada',
      emotional: 'Emocional',
      neutral: 'Neutral',
    },
    energy: {
      title: 'Energía y descanso',
      level: 'Nivel de energía',
      sleep: 'Horas de sueño',
      quality: 'Calidad del sueño',
      qualities: ['Muy mal', 'Mal', 'Regular', 'Bien', 'Excelente'],
    },
    symptoms: {
      title: 'Síntomas físicos',
      all: 'Todos',
      mild: 'Leve',
      moderate: 'Moderado',
      severe: 'Severo',
    },
    notes: {
      title: 'Notas (opcional)',
      placeholder: '¿Algo más que quieras registrar?',
    },
    intimacy: {
      title: '💕 Actividad íntima',
      hint: 'Información privada — nunca se comparte',
      hadSex: '¿Tuve relaciones hoy?',
      protected: '¿Protegida?',
      orgasm: '¿Orgasmo?',
      desire: 'Nivel de deseo',
      desireLabels: ['', 'Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto'],
    },
    wellness: {
      title: '🌿 Bienestar diario',
      weight: '⚖️ Peso',
      water: '💧 Agua',
      pill: '💊 Tomé anticonceptivo hoy',
    },
    ttc: {
      title: '🥚 Fertilidad (TTC)',
      bbt: 'Temperatura basal (°C)',
      mucus: 'Moco cervical',
    },
    skin: {
      title: '✨ Piel',
      acne: 'Acné',
      oily: 'Piel grasa',
      dry: 'Piel seca',
      sensitive: 'Piel sensible',
      glowing: 'Piel radiante',
      normal: 'Normal',
    },
    deleteConfirm: 'Borrar registro',
    deleteMsg: '¿Borrar el registro del {{date}}?',
  },

  // Profile
  profile: {
    title: 'Mi Perfil',
    account: 'Mi cuenta',
    health: 'Salud',
    security: 'Seguridad',
    notifications: 'Notificaciones',
    partner: 'Modo pareja',
    contraceptive: 'Anticonceptivo',
    pregnancy: 'Modo embarazo',
    correlations: 'Mis correlaciones',
    pin: 'PIN / Bloqueo',
    avatar: 'Cambiar avatar',
    medical: 'Resumen médico',
    language: 'Idioma',
    bbtChart: 'Gráfico de temperatura',
    yearlyHistory: 'Historial anual',
    share: 'Compartir app',
    howItWorks: 'Cómo funciona',
    logout: 'Cerrar sesión',
  },

  // Settings
  settings: {
    language: 'Idioma',
    selectLanguage: 'Selecciona tu idioma',
    languages: {
      es: '🇪🇸 Español',
      en: '🇺🇸 English',
      pt: '🇧🇷 Português',
    },
  },

  // Phases
  phases: {
    menstrual: 'Menstrual',
    follicular: 'Folicular',
    ovulatory: 'Ovulatoria',
    luteal: 'Lútea',
  },

  // BBT Chart
  bbt: {
    title: 'Temperatura Corporal Basal',
    subtitle: 'Últimos 30 días',
    noData: 'Sin datos de temperatura',
    noDataSub: 'Registra tu temperatura cada mañana al despertar para ver la gráfica',
    avg: 'Promedio',
    min: 'Mínima',
    max: 'Máxima',
    shift: 'Cambio post-ovulación',
    tip: 'Mide a la misma hora, antes de levantarte',
    phases: {
      pre: 'Pre-ovulación (baja)',
      post: 'Post-ovulación (alta)',
    },
  },

  // Yearly history
  yearly: {
    title: 'Historial Anual',
    cyclesLogged: 'ciclos registrados',
    avgLength: 'duración promedio',
    daysLogged: 'días con registro',
    noData: 'Sin registros este año',
    months: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
    legend: {
      period: 'Período',
      logged: 'Registro',
      predicted: 'Predicho',
    },
  },

  // Medical summary
  medical: {
    title: 'Resumen Médico',
    subtitle: 'Comparte con tu ginecóloga',
    generated: 'Generado',
    patient: 'Paciente',
    cycleStats: 'Estadísticas del ciclo',
    avgCycle: 'Duración promedio del ciclo',
    avgPeriod: 'Duración promedio del período',
    shortestCycle: 'Ciclo más corto',
    longestCycle: 'Ciclo más largo',
    regularity: 'Regularidad',
    regular: 'Regular',
    irregular: 'Irregular',
    symptoms: 'Síntomas más frecuentes',
    moods: 'Estados de ánimo frecuentes',
    avgSleep: 'Sueño promedio',
    avgWater: 'Agua promedio',
    notes: 'Observaciones',
    export: '📄 Exportar PDF',
    share: '📤 Compartir',
    disclaimer: 'Este resumen es orientativo. Tu médica tiene la información definitiva.',
  },

  // Skin tracker
  skin: {
    title: 'Seguimiento de Piel',
    correlation: 'Correlación piel-ciclo',
  },
}

export default es
export type TranslationKeys = typeof es
