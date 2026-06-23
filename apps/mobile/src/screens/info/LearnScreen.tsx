import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'

import { Colors, Typography, Spacing, BorderRadius } from '@/theme'
import { useAppTheme } from '@/context/ThemeContext'

const { width } = Dimensions.get('window')

interface Article {
  id: string
  phase: string
  emoji: string
  title: string
  readTime: string
  color: string
  summary: string
  sections: { heading: string; body: string }[]
}

const ARTICLES: Article[] = [
  {
    id: 'menstrual',
    phase: 'Fase Menstrual',
    emoji: '🌑',
    title: 'Tu período: lo que pasa en tu cuerpo',
    readTime: '4 min',
    color: '#ef4444',
    summary: 'Días 1–5 del ciclo. El revestimiento uterino se desprende porque no hubo embarazo.',
    sections: [
      {
        heading: '¿Qué ocurre hormonalmente?',
        body: 'Estrógeno y progesterona están en sus niveles más bajos. El útero se contrae para expulsar el endometrio, lo que causa los cólicos.',
      },
      {
        heading: 'Por qué te sientes así',
        body: 'La caída de prostaglandinas genera dolor e inflamación. El descenso de serotonina puede traer tristeza o irritabilidad. Tu cuerpo trabaja fuerte — es normal sentir menos energía.',
      },
      {
        heading: 'Qué ayuda de verdad',
        body: '• Calor local (bolsa de agua caliente) alivia los cólicos\n• Ibuprofeno funciona mejor que paracetamol porque actúa sobre las prostaglandinas\n• Movimiento suave como yoga o caminar puede reducir el dolor\n• Hierro (espinaca, legumbres) para compensar el sangrado',
      },
      {
        heading: 'Señales de alerta',
        body: 'Consultá a tu ginecóloga si:\n• El dolor te impide hacer actividades normales\n• Sangrado muy abundante (cambias toalla cada hora)\n• Coágulos grandes (más de 2 cm)\n• Ciclos irregulares que cambian mucho mes a mes',
      },
    ],
  },
  {
    id: 'follicular',
    phase: 'Fase Folicular',
    emoji: '🌒',
    title: 'La primavera de tu ciclo',
    readTime: '3 min',
    color: Colors.primary[500],
    summary: 'Días 6–13. El estrógeno sube y con él tu energía, creatividad y bienestar.',
    sections: [
      {
        heading: '¿Qué ocurre hormonalmente?',
        body: 'La FSH (hormona folículo-estimulante) activa varios folículos en los ovarios. Uno de ellos madura y produce estrógeno que va aumentando día a día.',
      },
      {
        heading: 'El estrógeno es tu aliado',
        body: 'Esta hormona mejora el estado de ánimo, la memoria, la cognición y la libido. También fortalece los huesos, mejora la piel y aumenta la tolerancia al dolor.',
      },
      {
        heading: 'Aprovechá esta fase',
        body: '• Mejor momento para empezar proyectos nuevos\n• Entrenamientos de alta intensidad: tu rendimiento es máximo\n• Socializar y hacer networking es más fácil\n• Ideal para aprender cosas nuevas: tu memoria está optimizada',
      },
      {
        heading: 'Nutrición en esta fase',
        body: 'Semillas de lino y calabaza apoyan la producción de estrógeno. Crucíferas (brócoli, coliflor) ayudan a metabolizarlo correctamente. Hidratación: el moco cervical empieza a cambiar.',
      },
    ],
  },
  {
    id: 'ovulatory',
    phase: 'Ovulación',
    emoji: '🌕',
    title: 'Tu día más fértil',
    readTime: '3 min',
    color: Colors.success,
    summary: 'Día 14 (aprox). El óvulo es liberado. Tu fertilidad es máxima.',
    sections: [
      {
        heading: '¿Qué ocurre exactamente?',
        body: 'Un pico de LH (hormona luteinizante) dispara la ovulación: el folículo maduro se rompe y libera el óvulo. Este viaja por la trompa de Falopio hacia el útero.',
      },
      {
        heading: 'Tu ventana fértil',
        body: 'El óvulo vive 12–24 horas, pero los espermatozoides pueden sobrevivir 3–5 días en el aparato reproductor. La ventana fértil real es 5 días antes de ovular + el día de ovulación.',
      },
      {
        heading: 'Señales de ovulación',
        body: '• Moco cervical claro y elástico (como clara de huevo)\n• Ligero dolor en un costado (mittelschmerz)\n• Libido elevada — la naturaleza es muy inteligente\n• Temperatura basal sube 0.2–0.5°C después de ovular',
      },
      {
        heading: 'Si no querés quedar embarazada',
        body: 'Ningún método de detección de ovulación reemplaza a un anticonceptivo. El método del ritmo tiene una tasa de fallo alta. Consultá con tu ginecóloga el método más adecuado para vos.',
      },
    ],
  },
  {
    id: 'luteal',
    phase: 'Fase Lútea',
    emoji: '🌗',
    title: 'La fase que nadie te explicó',
    readTime: '5 min',
    color: Colors.gold.main,
    summary: 'Días 15–28. Progesterona alta, SPM posible. Tu cuerpo se prepara para el siguiente ciclo.',
    sections: [
      {
        heading: '¿Qué ocurre hormonalmente?',
        body: 'El folículo vacío se convierte en el cuerpo lúteo, que produce progesterona. Esta hormona prepara el endometrio por si hay embarazo. Si no hay, el cuerpo lúteo se degrada y la progesterona cae, iniciando el período.',
      },
      {
        heading: 'El SPM tiene base biológica',
        body: 'La progesterona alta puede causar retención de líquidos, sensibilidad en los senos y cambios de humor. La caída de serotonina explica la irritabilidad, ansiedad y antojos de carbohidratos.',
      },
      {
        heading: 'TDPM: cuando el SPM es severo',
        body: 'El Trastorno Disfórico Premenstrual afecta al 3–8% de las mujeres. Si tus síntomas son muy intensos y afectan tu vida diaria, hay tratamientos efectivos. Hablá con tu médica.',
      },
      {
        heading: 'Estrategias que funcionan',
        body: '• Reducir sal y cafeína disminuye la retención de líquidos\n• Magnesio (chocolate negro, semillas de girasol) reduce cólicos y mejora el humor\n• Ejercicio moderado — no te fuerces\n• Dormir más: tu temperatura corporal es más alta y puede afectar el sueño',
      },
    ],
  },
  {
    id: 'bbt',
    phase: 'Temperatura Basal',
    emoji: '🌡️',
    title: 'Cómo leer tu temperatura basal',
    readTime: '4 min',
    color: '#06b6d4',
    summary: 'La BBT (temperatura corporal basal) sube después de ovular. Es la forma más confiable de confirmar que ovulaste.',
    sections: [
      {
        heading: 'Cómo medirla correctamente',
        body: 'Tomá la temperatura apenas te despertés, antes de levantarte o hablar. Usá siempre el mismo termómetro y a la misma hora. Cualquier enfermedad, alcohol o sueño irregular afecta la lectura.',
      },
      {
        heading: 'Qué buscás en el gráfico',
        body: 'Las temperaturas pre-ovulatorias son más bajas (36.1–36.4°C). Después de ovular, sube 0.2–0.5°C y se mantiene alta. Este cambio confirma que ovulaste.',
      },
      {
        heading: 'Limitaciones importantes',
        body: 'La BBT confirma ovulación DESPUÉS de que ocurrió, no antes. No sirve para evitar el embarazo sin combinarlo con otros métodos (método sintotérmico). Sí sirve para conocer tu ciclo y detectar irregularidades.',
      },
      {
        heading: 'Cuándo buscar ayuda',
        body: 'Si llevás 3+ meses de gráficos y no ves el cambio bifásico claro, hablá con tu ginecóloga. Puede indicar ciclos anovulatorios que merecen evaluación.',
      },
    ],
  },
  {
    id: 'pcos',
    phase: 'SOP',
    emoji: '🔬',
    title: 'Síndrome de Ovario Poliquístico',
    readTime: '5 min',
    color: '#8b5cf6',
    summary: 'El SOP afecta al 10% de las mujeres. Es tratable. Conocer los síntomas es el primer paso.',
    sections: [
      {
        heading: '¿Qué es exactamente?',
        body: 'El SOP es un desequilibrio hormonal donde los ovarios producen más andrógenos (hormonas masculinas) de lo normal. Esto interfiere con el desarrollo de los folículos y puede impedir la ovulación regular.',
      },
      {
        heading: 'Síntomas más comunes',
        body: '• Ciclos irregulares o ausentes\n• Acné, especialmente en mandíbula y espalda\n• Vello facial o corporal excesivo (hirsutismo)\n• Pérdida o adelgazamiento del cabello\n• Dificultad para bajar de peso\n• Quistes en los ovarios (aunque no todas los tienen)',
      },
      {
        heading: 'Diagnóstico',
        body: 'Se diagnostica con 2 de 3 criterios: ciclos irregulares, exceso de andrógenos (en sangre o síntomas), o quistes en ecografía. Un ginecólogo o endocrinólogo puede evaluarte.',
      },
      {
        heading: 'Tratamiento y manejo',
        body: 'No tiene cura pero se controla bien. Opciones incluyen anticonceptivos hormonales, metformina, cambios en alimentación (menos azúcar refinada) y ejercicio regular. El tratamiento se personaliza según los síntomas y objetivos.',
      },
    ],
  },
]

function ArticleCard({ article, onPress }: { article: Article; onPress: () => void }) {
  const { isDark, cardBg, textPrimary, textMuted, borderColor } = useAppTheme()
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', borderColor }]}>
        <View style={[styles.cardAccent, { backgroundColor: article.color }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardEmoji}>{article.emoji}</Text>
            <View style={[styles.phaseBadge, { backgroundColor: article.color + '22' }]}>
              <Text style={[styles.phaseLabel, { color: article.color }]}>{article.phase}</Text>
            </View>
            <Text style={[styles.readTime, { color: textMuted }]}>{article.readTime}</Text>
          </View>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>{article.title}</Text>
          <Text style={[styles.cardSummary, { color: textMuted }]} numberOfLines={2}>{article.summary}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function ArticleDetail({ article, onBack }: { article: Article; onBack: () => void }) {
  const insets = useSafeAreaInsets()
  const { isDark, textPrimary, textMuted, cardBg, borderColor } = useAppTheme()
  return (
    <ScrollView
      style={[styles.detailContainer, { backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, paddingHorizontal: Spacing.md }}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={{ color: article.color, fontSize: Typography.fontSize.base }}>← Volver</Text>
      </TouchableOpacity>

      <View style={[styles.detailHero, { borderLeftColor: article.color }]}>
        <Text style={styles.detailEmoji}>{article.emoji}</Text>
        <View style={[styles.phaseBadge, { backgroundColor: article.color + '22' }]}>
          <Text style={[styles.phaseLabel, { color: article.color }]}>{article.phase}</Text>
        </View>
        <Text style={[styles.detailTitle, { color: textPrimary }]}>{article.title}</Text>
        <Text style={[styles.detailSummary, { color: textMuted }]}>{article.summary}</Text>
      </View>

      {article.sections.map((s, i) => (
        <Animated.View key={i} entering={FadeInDown.delay(i * 80)} style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff', borderColor }]}>
          <Text style={[styles.sectionHeading, { color: article.color }]}>{s.heading}</Text>
          <Text style={[styles.sectionBody, { color: textPrimary }]}>{s.body}</Text>
        </Animated.View>
      ))}

      <View style={[styles.disclaimer, { borderColor }]}>
        <Text style={[styles.disclaimerText, { color: textMuted }]}>
          📚 Este contenido es educativo. No reemplaza la consulta con tu ginecóloga o médica.
        </Text>
      </View>
    </ScrollView>
  )
}

export default function LearnScreen() {
  const insets = useSafeAreaInsets()
  const [selected, setSelected] = useState<Article | null>(null)
  const { isDark, textPrimary, textMuted } = useAppTheme()

  if (selected) {
    return <ArticleDetail article={selected} onBack={() => setSelected(null)} />
  }

  return (
    <LinearGradient
      colors={isDark ? ['#0d0118', '#1a0533'] : [Colors.primary[50], Colors.lavender[100]]}
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
      >
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <Text style={{ color: Colors.lavender[300], fontSize: Typography.fontSize.base }}>← Atrás</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: textPrimary }]}>📚 Aprendé sobre tu ciclo</Text>
          <Text style={[styles.subtitle, { color: textMuted }]}>
            {ARTICLES.length} artículos · Basados en evidencia médica
          </Text>
        </Animated.View>

        {ARTICLES.map((article, i) => (
          <Animated.View key={article.id} entering={FadeInDown.delay(80 + i * 60)}>
            <ArticleCard article={article} onPress={() => setSelected(article)} />
          </Animated.View>
        ))}
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  header: { gap: 4, marginBottom: Spacing.sm },
  headerBack: { marginBottom: Spacing.sm },
  title: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold },
  subtitle: { fontSize: Typography.fontSize.sm },
  card: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    overflow: 'hidden', flexDirection: 'row',
  },
  cardAccent: { width: 4 },
  cardContent: { flex: 1, padding: Spacing.md, gap: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardEmoji: { fontSize: 20 },
  phaseBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  phaseLabel: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.bold },
  readTime: { fontSize: Typography.fontSize.xs, marginLeft: 'auto' },
  cardTitle: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold },
  cardSummary: { fontSize: Typography.fontSize.sm, lineHeight: 19 },
  detailContainer: { flex: 1 },
  backBtn: { marginBottom: Spacing.md },
  detailHero: { borderLeftWidth: 4, paddingLeft: Spacing.md, marginBottom: Spacing.md, gap: 6 },
  detailEmoji: { fontSize: 32 },
  detailTitle: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold },
  detailSummary: { fontSize: Typography.fontSize.base, lineHeight: 22 },
  sectionCard: {
    borderRadius: BorderRadius.lg, borderWidth: 1,
    padding: Spacing.md, marginBottom: Spacing.sm, gap: 8,
  },
  sectionHeading: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold },
  sectionBody: { fontSize: Typography.fontSize.sm, lineHeight: 21 },
  disclaimer: {
    borderTopWidth: 1, paddingTop: Spacing.md, marginTop: Spacing.md,
  },
  disclaimerText: { fontSize: Typography.fontSize.xs, textAlign: 'center', lineHeight: 18 },
})
