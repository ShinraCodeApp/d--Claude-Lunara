import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'

import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

const SECTIONS = [
  {
    title: '1. Responsable del tratamiento',
    body: 'ShinraCode, con domicilio en Puerto Rico, es el responsable del tratamiento de tus datos personales. Contacto: yamilrueda88@gmail.com',
  },
  {
    title: '2. Datos que recopilamos',
    body: 'Recopilamos exclusivamente los datos que tú introduces en la aplicación:\n\n• Datos del ciclo menstrual: fechas, duración, síntomas\n• Estado de ánimo, energía y bienestar\n• Temperatura basal corporal (opcional)\n• Peso, sueño y consumo de agua (opcional)\n• Actividad íntima (solo si la registras, cifrada)\n• Dirección de correo electrónico para tu cuenta\n\nNO recopilamos datos de ubicación, contactos, cámara ni micrófono sin tu permiso explícito.',
  },
  {
    title: '3. Finalidad del tratamiento',
    body: 'Tus datos se usan para:\n\n• Predecir y registrar tu ciclo menstrual\n• Generar análisis y correlaciones personalizadas\n• Notificarte sobre fases de tu ciclo\n• Sincronizar tus datos en la nube (Premium)\n\nNO vendemos, alquilamos ni compartimos tus datos con terceros, anunciantes, aseguradoras ni empleadores.',
  },
  {
    title: '4. Base legal (RGPD)',
    body: 'El tratamiento de tus datos se basa en:\n\n• Tu consentimiento explícito (Art. 6.1.a RGPD)\n• Ejecución del contrato de servicio (Art. 6.1.b RGPD)\n\nPuedes retirar tu consentimiento en cualquier momento desde Perfil → Privacidad y datos.',
  },
  {
    title: '5. Seguridad de los datos',
    body: 'Implementamos medidas técnicas y organizativas adecuadas:\n\n• Cifrado AES-256 en reposo\n• TLS 1.3 para datos en tránsito\n• Autenticación segura con tokens JWT\n• Acceso restringido al personal mínimo necesario\n• Almacenamiento local cifrado con MMKV',
  },
  {
    title: '6. Tus derechos',
    body: 'Tienes derecho a:\n\n• Acceso: conocer qué datos tenemos sobre ti\n• Rectificación: corregir datos inexactos\n• Supresión: eliminar tu cuenta y todos tus datos\n• Portabilidad: exportar tus datos en JSON\n• Oposición: oponerte a ciertos tratamientos\n• Limitación: solicitar la restricción del tratamiento\n\nEjerce tus derechos desde Perfil → Privacidad y datos → Mis datos.',
  },
  {
    title: '7. Conservación de datos',
    body: 'Conservamos tus datos mientras mantengas tu cuenta activa. Al eliminar tu cuenta, todos tus datos son borrados permanentemente en un plazo máximo de 30 días. Los datos anonimizados para análisis estadístico no pueden vincularse a tu persona.',
  },
  {
    title: '8. Transferencias internacionales',
    body: 'Nuestros servidores están alojados en Railway (EE. UU.), que cumple con el Escudo de Privacidad UE-EE. UU. y las Cláusulas Contractuales Tipo de la Comisión Europea.',
  },
  {
    title: '9. Menores de edad',
    body: 'Lunara no está dirigida a menores de 13 años. Si tienes conocimiento de que un menor ha proporcionado datos, contáctanos para eliminarlos.',
  },
  {
    title: '10. Cambios en la política',
    body: 'Notificaremos cualquier cambio significativo en esta política mediante una notificación en la app. El uso continuado de la aplicación tras la notificación implica la aceptación de los cambios.',
  },
  {
    title: '11. Contacto y reclamaciones',
    body: 'Para cualquier consulta sobre privacidad: yamilrueda88@gmail.com\n\nSi consideras que el tratamiento de tus datos no es conforme al RGPD, puedes presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es) o la autoridad supervisora de tu país.',
  },
]

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets()

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Política de Privacidad</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        <View style={styles.metaBox}>
          <Text style={styles.metaText}>Última actualización: junio 2026</Text>
          <Text style={styles.metaText}>Aplicable a: Lunara by ShinraCode v1.0+</Text>
        </View>

        <Text style={styles.intro}>
          En Lunara, la información sobre tu salud reproductiva es extremadamente sensible.
          Esta política explica de forma clara y transparente cómo la manejamos.
        </Text>

        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 ShinraCode · Lunara</Text>
          <Text style={styles.footerText}>yamilrueda88@gmail.com</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { marginBottom: 8 },
  backBtnText: { color: Colors.lavender[300], fontSize: Typography.fontSize.sm },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: '#fff',
  },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, gap: Spacing.lg },
  metaBox: {
    backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
  },
  metaText: { fontSize: Typography.fontSize.sm, color: Colors.lavender[300] },
  intro: {
    fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.7)',
    lineHeight: 22, fontStyle: 'italic',
  },
  section: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold,
    color: Colors.lavender[200],
  },
  sectionBody: {
    fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center', gap: 4,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: Spacing.lg,
  },
  footerText: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.3)' },
})
