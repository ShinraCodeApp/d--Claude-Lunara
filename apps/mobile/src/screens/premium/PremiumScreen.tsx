import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated'
import Purchases, { PurchasesPackage } from 'react-native-purchases'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import { useAuthStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/theme'

const { width } = Dimensions.get('window')

const FEATURES_FREE = [
  'Seguimiento básico del ciclo',
  'Calendario menstrual',
  'Predicción de período',
  'Registro de síntomas y estado de ánimo',
  'Notificaciones básicas',
  'Jardín Lunar (fase inicial)',
]

const FEATURES_PREMIUM = [
  'Todo lo del plan gratuito',
  '🤖 Chat IA Luna ilimitado',
  '📊 Informes mensuales y anuales en PDF',
  '📈 Análisis avanzado de patrones',
  '🌡️ Temperatura basal y fertilidad avanzada',
  '☁️ Sincronización en la nube',
  '🚫 Sin publicidad',
  '🌸 Estadísticas históricas completas',
  '💎 Cristales x2 en todas las actividades',
  '🎯 Recomendaciones personalizadas IA',
]

const PLAN_COLORS = {
  monthly: ['#7c3aed', '#a855f7'] as const,
  annual: ['#d97706', '#f59e0b'] as const,
}

export default function PremiumScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual')
  const [packages, setPackages] = useState<PurchasesPackage[]>([])

  const isPremium = user?.subscription?.isPremium

  const { isLoading: loadingPackages } = useQuery({
    queryKey: ['revenueCat', 'packages'],
    queryFn: async () => {
      const offerings = await Purchases.getOfferings()
      const pkgs = offerings.current?.availablePackages ?? []
      setPackages(pkgs)
      return pkgs
    },
  })

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const { customerInfo } = await Purchases.purchasePackage(pkg)
      return customerInfo
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      router.back()
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    },
  })

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const { customerInfo } = await Purchases.restorePurchases()
      return customerInfo
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
  })

  const getPackage = (planType: 'monthly' | 'annual') => {
    return packages.find((p) =>
      planType === 'annual' ? p.identifier.includes('annual') : p.identifier.includes('monthly')
    )
  }

  const monthlyPkg = getPackage('monthly')
  const annualPkg = getPackage('annual')

  const monthlyPrice = monthlyPkg?.product.priceString ?? '$4.99'
  const annualPrice = annualPkg?.product.priceString ?? '$34.99'
  const annualMonthly = annualPkg ? `$${(annualPkg.product.price / 12).toFixed(2)}/mes` : '$2.92/mes'

  if (isPremium) {
    return (
      <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
        <View style={[styles.premiumActiveContainer, { paddingTop: insets.top + 40, paddingBottom: insets.bottom }]}>
          <Text style={styles.premiumActiveEmoji}>👑</Text>
          <Text style={styles.premiumActiveTitle}>¡Eres Premium!</Text>
          <Text style={styles.premiumActiveSubtitle}>Tienes acceso a todas las funciones de Lunara</Text>
          <Text style={styles.premiumExpiry}>
            {user?.subscription?.currentPeriodEnd
              ? `Válido hasta: ${new Date(user.subscription.currentPeriodEnd).toLocaleDateString('es')}`
              : 'Suscripción activa'}
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient colors={['#0d0118', '#1a0533', '#2d0145']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      >
        {/* ─── Header ─────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.crownEmoji}>👑</Text>
          <Text style={styles.headerTitle}>Lunara Premium</Text>
          <Text style={styles.headerSubtitle}>
            Desbloquea todo el poder de tu ciclo con IA
          </Text>
        </Animated.View>

        {/* ─── Plan selector ───────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.plansContainer}>
          {/* Annual plan (recommended) */}
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
            onPress={() => setSelectedPlan('annual')}
          >
            <LinearGradient
              colors={selectedPlan === 'annual' ? PLAN_COLORS.annual : ['transparent', 'transparent']}
              style={styles.planGradient}
            >
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>MEJOR VALOR 🔥</Text>
              </View>
              <Text style={styles.planPeriod}>Anual</Text>
              <Text style={styles.planPrice}>{annualPrice}</Text>
              <Text style={styles.planMonthly}>{annualMonthly} · Ahorra 42%</Text>
              <View style={[styles.radioCircle, selectedPlan === 'annual' && styles.radioCircleSelected]}>
                {selectedPlan === 'annual' && <View style={styles.radioFill} />}
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Monthly plan */}
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <LinearGradient
              colors={selectedPlan === 'monthly' ? PLAN_COLORS.monthly : ['transparent', 'transparent']}
              style={styles.planGradient}
            >
              <Text style={styles.planPeriod}>Mensual</Text>
              <Text style={styles.planPrice}>{monthlyPrice}</Text>
              <Text style={styles.planMonthly}>por mes</Text>
              <View style={[styles.radioCircle, selectedPlan === 'monthly' && styles.radioCircleSelected]}>
                {selectedPlan === 'monthly' && <View style={styles.radioFill} />}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* ─── CTA Button ──────────────────────────────── */}
        <Animated.View entering={ZoomIn.delay(200)}>
          <TouchableOpacity
            style={styles.purchaseBtn}
            onPress={() => {
              const pkg = selectedPlan === 'annual' ? annualPkg : monthlyPkg
              if (pkg) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                purchaseMutation.mutate(pkg)
              }
            }}
            disabled={purchaseMutation.isPending || loadingPackages}
          >
            <LinearGradient
              colors={selectedPlan === 'annual' ? PLAN_COLORS.annual : PLAN_COLORS.monthly}
              style={styles.purchaseBtnGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              {purchaseMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.purchaseBtnText}>
                    Comenzar prueba gratuita de 7 días 🌙
                  </Text>
              }
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.trialNote}>
            Prueba 7 días gratis · Cancela cuando quieras
          </Text>
        </Animated.View>

        {/* ─── Feature comparison ──────────────────────── */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>¿Qué incluye Premium?</Text>

          <View style={styles.featuresCard}>
            {FEATURES_PREMIUM.map((feature, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ─── Testimonials ────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.testimonialsSection}>
          <Text style={styles.featuresTitle}>Lo que dicen nuestras usuarias</Text>
          {[
            { text: '"Luna me ayudó a entender mis ciclos irregulares y por fin entendí mi cuerpo"', author: 'María G.' },
            { text: '"Los informes PDF son increíbles para llevar al ginecólogo"', author: 'Sara M.' },
            { text: '"La IA me explicó la ventana fértil mejor que cualquier libro"', author: 'Ana P.' },
          ].map((t, i) => (
            <View key={i} style={styles.testimonialCard}>
              <Text style={styles.testimonialStars}>⭐⭐⭐⭐⭐</Text>
              <Text style={styles.testimonialText}>{t.text}</Text>
              <Text style={styles.testimonialAuthor}>— {t.author}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ─── Restore & Legal ─────────────────────────── */}
        <View style={styles.legalContainer}>
          <TouchableOpacity onPress={() => restoreMutation.mutate()} disabled={restoreMutation.isPending}>
            <Text style={styles.legalLink}>Restaurar compras</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity>
            <Text style={styles.legalLink}>Política de privacidad</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity>
            <Text style={styles.legalLink}>Términos</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legalText}>
          El pago se cargará a tu cuenta de la tienda de aplicaciones. La suscripción se renueva automáticamente a menos que se cancele al menos 24 horas antes del final del período actual. Puedes gestionar y cancelar tu suscripción desde la configuración de tu cuenta en la tienda de aplicaciones.
        </Text>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  closeBtn: {
    alignSelf: 'flex-end', width: 36, height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  closeBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
  crownEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  headerTitle: {
    fontSize: Typography.fontSize['3xl'], fontFamily: Typography.fontFamily.bold,
    color: '#fff', textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.6)',
    textAlign: 'center', marginTop: 8,
  },
  plansContainer: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  planCard: {
    flex: 1, borderRadius: BorderRadius.xl, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)',
  },
  planCardSelected: { borderColor: Colors.gold.main },
  planGradient: { padding: Spacing.md, alignItems: 'center', minHeight: 160, justifyContent: 'center' },
  planBadge: {
    position: 'absolute', top: -1, left: -1, right: -1,
    backgroundColor: Colors.gold.main, paddingVertical: 4, alignItems: 'center',
  },
  planBadgeText: {
    fontSize: 9, fontFamily: Typography.fontFamily.bold, color: '#000', letterSpacing: 1,
  },
  planPeriod: {
    fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)',
    marginTop: 24, fontFamily: Typography.fontFamily.medium,
  },
  planPrice: {
    fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: '#fff',
  },
  planMonthly: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.6)' },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  radioCircleSelected: { borderColor: '#fff' },
  radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  purchaseBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.sm },
  purchaseBtnGradient: { paddingVertical: Spacing.md + 4, alignItems: 'center' },
  purchaseBtnText: { color: '#fff', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold },
  trialNote: {
    textAlign: 'center', fontSize: Typography.fontSize.xs,
    color: 'rgba(255,255,255,0.5)', marginBottom: Spacing.xl,
  },
  featuresSection: { marginBottom: Spacing.xl },
  featuresTitle: {
    fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold,
    color: '#fff', marginBottom: Spacing.md,
  },
  featuresCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, gap: Spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  featureCheck: { color: Colors.lavender[400], fontFamily: Typography.fontFamily.bold, width: 16 },
  featureText: { flex: 1, fontSize: Typography.fontSize.base, color: '#e9d5ff' },
  testimonialsSection: { marginBottom: Spacing.xl },
  testimonialCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  testimonialStars: { fontSize: 12, marginBottom: 6 },
  testimonialText: { fontSize: Typography.fontSize.sm, color: '#e9d5ff', fontStyle: 'italic' },
  testimonialAuthor: { fontSize: Typography.fontSize.xs, color: Colors.lavender[400], marginTop: 6 },
  legalContainer: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    flexWrap: 'wrap', marginBottom: Spacing.md,
  },
  legalLink: { fontSize: Typography.fontSize.xs, color: Colors.lavender[300], textDecorationLine: 'underline' },
  legalDot: { color: 'rgba(255,255,255,0.3)', fontSize: Typography.fontSize.xs },
  legalText: {
    fontSize: 10, color: 'rgba(255,255,255,0.3)',
    textAlign: 'center', lineHeight: 16,
  },
  premiumActiveContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl,
  },
  premiumActiveEmoji: { fontSize: 80, marginBottom: Spacing.lg },
  premiumActiveTitle: {
    fontSize: Typography.fontSize['3xl'], fontFamily: Typography.fontFamily.bold,
    color: Colors.gold.main,
  },
  premiumActiveSubtitle: {
    fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.6)',
    textAlign: 'center', marginTop: Spacing.sm,
  },
  premiumExpiry: { fontSize: Typography.fontSize.sm, color: Colors.lavender[300], marginTop: Spacing.md },
  backBtn: {
    marginTop: Spacing.xl, backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  backBtnText: { color: '#fff', fontFamily: Typography.fontFamily.bold },
})
