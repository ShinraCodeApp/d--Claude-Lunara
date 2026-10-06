import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import i18n from 'i18next'

// Aviso que pide la política de salud de Google Play: la app no reemplaza a un
// profesional. Va en todas las pantallas con predicciones o datos de salud.
const TEXTS: Record<string, string> = {
  es: '⚕️ Lunara es informativa y no reemplaza a un profesional de la salud. Las predicciones son estimaciones: no las uses como método anticonceptivo ni para diagnósticos. Ante cualquier duda, síntoma o tratamiento, consultá a tu médica/o o ginecóloga/o.',
  en: '⚕️ Lunara is for information only and does not replace a healthcare professional. Predictions are estimates: do not use them as contraception or for diagnosis. For any question, symptom or treatment, consult your doctor or gynecologist.',
  pt: '⚕️ A Lunara é informativa e não substitui um profissional de saúde. As previsões são estimativas: não as use como método contraceptivo nem para diagnósticos. Em caso de dúvida, sintoma ou tratamento, consulte sua médica ou ginecologista.',
}

export function medicalDisclaimerText(): string {
  const lang = (i18n.language ?? 'es').substring(0, 2)
  return TEXTS[lang] ?? TEXTS.es
}

export default function MedicalDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.box, compact && styles.compact]} accessibilityRole="text">
      <Text style={styles.text}>{medicalDisclaimerText()}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(253, 230, 138, 0.45)',
    backgroundColor: 'rgba(253, 230, 138, 0.10)',
  },
  compact: { marginVertical: 8, padding: 10 },
  text: { fontSize: 12, lineHeight: 18, color: '#f59e0b', textAlign: 'center' },
})
