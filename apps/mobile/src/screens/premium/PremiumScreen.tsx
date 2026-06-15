import React, { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, ActivityIndicator, Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated'
import {
  withIAPContext, useIAP,
  requestSubscription, getAvailablePurchases, finishTransaction,
} from 'react-native-iap'
import { useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import { useAuthStore } from '@/store'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'
import apiClient from '@/api/client'

const { width } = Dimensions.get('window')

const SKUS = {
  monthly: 'com.shinracode.lunara.premium.monthly',
  annual:  'com.shinracode.lunara.premium.annual',
}

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
  annual:  ['#d97706', '#f59e0b'] as const,
}

const COMPARISON_ROWS = [
  { feature: 'Registro del ciclo',          free: '✓',      premium: '✓' },
  { feature: 'Predicción de período',        free: '✓',      premium: '✓' },
  { feature: 'Síntomas y estado de ánimo',  free: '✓',      premium: '✓' },
  { feature: 'Calendario con emojis',        free: '✓',      premium: '✓' },
  { feature: 'Jardín Lunar',                 free: 'Básico', premium: 'Completo + 2x XP' },
  { feature: 'Chat con Luna IA',             free: '5/mes',  premium: 'Ilimitado 🤖' },
  { feature: 'Informes PDF',                 free: '✗',      premium: '✓' },
  { feature: 'Análisis de patrones',         free: 'Básico', premium: 'Avanzado 📊' },
  { feature: 'Temperatura basal (BBT)',      free: '✗',      premium: '✓ 🌡️' },
  { feature: 'Sincronización en la nube',    free: '✗',      premium: '✓ ☁️' },
  { feature: 'Comparación de ciclos',        free: '2 ciclos', premium: 'Ilimitado' },
  { feature: 'Publicidad',                   free: 'Sí',     premium: 'Sin anuncios 🚫' },
  { feature: 'Modo pareja',                  free: '✗',      premium: '✓ 💑' },
  { feature: 'Recomendaciones IA',           free: '✗',      premium: 'Personalizadas 🎯' },
]

function PremiumScreenInner() {
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual')
  const [purchasing, setPurchasing] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const { subscriptions, getSubscriptions, currentPurchase, currentPurchaseError } = useIAP()

  const isPremium = user?.subscription?.isPremium

  useEffect(() => {
    getSubscriptions({ skus: Object.values(SKUS) })
  }, [])

  useEffect(() => {
    if (!currentPurchase) return
    const complete = async () => {
      try {
        await finishTransaction({ purchase: currentPurchase, isConsumable: false })

        // Notify backend to activate Premium in DB
        try {
          const { data } = await apiClient.post('/subscriptions/activate', {
            productId: currentPurchase.productId,
            purchaseToken: currentPurchase.purchaseToken ?? currentPurchase.transactionReceipt,
            platform: 'android',
          })
          const current = useAuthStore.getState().user
          if (current) {
            useAuthStore.getState().setUser({
              ...current,
              subscription: {
                tier: data.tier,
                status: 'active',
                isPremium: true,
                currentPeriodEnd: data.currentPeriodEnd,
              },
            })
          }
        } catch {
          // Fallback: update local state only
          const current = useAuthStore.getState().user
          if (current) {
            useAuthStore.getState().setUser({
              ...current,
              subscription: { tier: 'PREMIUM_MONTHLY', status: 'active', isPremium: true },
            })
          }
        }

        queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Alert.alert('🎉 ¡Bienvenida a Premium!', 'Tu suscripción está activa. Disfruta todas las funciones.', [
          { text: 'Genial', onPress: () => router.back() },
        ])
      } finally {
        setPurchasing(false)
      }
    }
    complete()
  }, [currentPurchase])

  useEffect(() => {
    if (currentPurchaseError) {
      setPurchasing(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [currentPurchaseError])

  const getSub = (plan: 'monthly' | 'annual') =>
    subscriptions.find((s) => s.productId === SKUS[plan])

  const getPrice = (plan: 'monthly' | 'annual'): string => {
    const sub = getSub(plan) as any
    const price = sub?.subscriptionOfferDetails?.[0]?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice
    return price ?? (plan === 'monthly' ? '$4.99' : '$34.99')
  }

  const getAnnualMonthly = (): string => {
    const sub = getSub('annual') as any
    const micros = sub?.subscriptionOfferDetails?.[0]?.pricingPhases?.pricingPhaseList?.[0]?.priceAmountMicros
    if (!micros) return '$2.92/mes'
    return `$${(Number(micros) / 1_000_000 / 12).toFixed(2)}/mes`
  }

  const handlePurchase = async () => {
    const sku = SKUS[selectedPlan]
    const sub = getSub(selectedPlan) as any
    try {
      setPurchasing(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      const offerToken = sub?.subscriptionOfferDetails?.[0]?.offerToken
      await requestSubscription({
        sku,
        ...(offerToken ? { subscriptionOffers: [{ sku, offerToken }] } : {}),
      })
    } catch (e: any) {
      if (e?.code !== 'E_USER_CANCELLED') {
        Alert.alert('Error', 'No se pudo completar la compra. Intenta de nuevo.')
      }
      setPurchasing(false)
    }
  }

  const handleRestore = async () => {
    try {
      setRestoring(true)
      const purchases = await getAvailablePurchases()
      const hasActive = purchases.some((p) => Object.values(SKUS).includes(p.productId))
      if (hasActive) {
        const current = useAuthStore.getState().user
        if (current) {
          useAuthStore.getState().setUser({
            ...current,
            subscription: { tier: 'premium', status: 'active', isPremium: true },
          })
        }
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
        Alert.alert('✓ Compras restauradas', 'Tu suscripción Premium está activa.')
      } else {
        Alert.alert('Sin compras', 'No encontramos suscripciones activas en esta cuenta.')
      }
    } catch {
      Alert.alert('Error', 'No se pudieron restaurar las compras.')
    } finally {
      setRestoring(false)
    }
  }

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
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0)} style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.crownEmoji}>👑</Text>
          <Text style={styles.headerTitle}>Lunara Premium</Text>
          <Text style={styles.headerSubtitle}>Desbloquea todo el poder de tu ciclo con IA</Text>
        </Animated.View>

        {/* Plan selector */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.plansContainer}>
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
              <Text style={styles.planPrice}>{getPrice('annual')}</Text>
              <Text style={styles.planMonthly}>{getAnnualMonthly()} · Ahorra 42%</Text>
              <View style={[styles.radioCircle, selectedPlan === 'annual' && styles.radioCircleSelected]}>
                {selectedPlan === 'annual' && <View style={styles.radioFill} />}
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <LinearGradient
              colors={selectedPlan === 'monthly' ? PLAN_COLORS.monthly : ['transparent', 'transparent']}
              style={styles.planGradient}
            >
              <Text style={styles.planPeriod}>Mensual</Text>
              <Text style={styles.planPrice}>{getPrice('monthly')}</Text>
              <Text style={styles.planMonthly}>por mes</Text>
              <View style={[styles.radioCircle, selectedPlan === 'monthly' && styles.radioCircleSelected]}>
                {selectedPlan === 'monthly' && <View style={styles.radioFill} />}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* CTA */}
        <Animated.View entering={ZoomIn.delay(200)}>
          <TouchableOpacity
            style={styles.purchaseBtn}
            onPress={handlePurchase}
            disabled={purchasing}
          >
            <LinearGradient
              colors={selectedPlan === 'annual' ? PLAN_COLORS.annual : PLAN_COLORS.monthly}
              style={styles.purchaseBtnGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              {purchasing
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.purchaseBtnText}>Comenzar prueba gratuita de 7 días 🌙</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.trialNote}>Prueba 7 días gratis · Cancela cuando quieras</Text>
        </Animated.View>

        {/* Comparison table */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Gratis vs Premium</Text>
          <View style={styles.compTable}>
            <View style={[styles.compRow, styles.compHeader]}>
              <Text style={[styles.compCell, styles.compCellFeature, styles.compHeaderText]}>Función</Text>
              <Text style={[styles.compCell, styles.compCellPlan, styles.compHeaderText]}>Gratis</Text>
              <Text style={[styles.compCell, styles.compCellPlan, styles.compHeaderText, styles.compPremiumHeader]}>Premium 👑</Text>
            </View>
            {COMPARISON_ROWS.map((row, i) => (
              <View key={i} style={[styles.compRow, i % 2 === 0 && styles.compRowEven]}>
                <Text style={[styles.compCell, styles.compCellFeature]}>{row.feature}</Text>
                <Text style={[styles.compCell, styles.compCellPlan, styles.compFreeText]}>{row.free}</Text>
                <Text style={[styles.compCell, styles.compCellPlan, styles.compPremiumText]}>{row.premium}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Feature list */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Todo incluido en Premium</Text>
          <View style={styles.featuresCard}>
            {FEATURES_PREMIUM.map((feature, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Testimonials */}
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

        {/* Restore & Legal */}
        <View style={styles.legalContainer}>
          <TouchableOpacity onPress={handleRestore} disabled={restoring}>
            <Text style={styles.legalLink}>{restoring ? 'Restaurando...' : 'Restaurar compras'}</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity onPress={() => router.push('/privacy-policy' as any)}>
            <Text style={styles.legalLink}>Política de privacidad</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity>
            <Text style={styles.legalLink}>Términos</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legalText}>
          El pago se cargará a tu cuenta de Google Play. La suscripción se renueva automáticamente a menos que se cancele al menos 24 horas antes del final del período actual. Puedes gestionar y cancelar tu suscripción desde la configuración de tu cuenta en Google Play.
        </Text>
      </ScrollView>
    </LinearGradient>
  )
}

export default withIAPContext(PremiumScreenInner)

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
  planBadgeText: { fontSize: 9, fontFamily: Typography.fontFamily.bold, color: '#000', letterSpacing: 1 },
  planPeriod: {
    fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)',
    marginTop: 24, fontFamily: Typography.fontFamily.medium,
  },
  planPrice: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold, color: '#fff' },
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
  compTable: { borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  compRow: { flexDirection: 'row' },
  compRowEven: { backgroundColor: 'rgba(255,255,255,0.04)' },
  compHeader: { backgroundColor: 'rgba(139,92,246,0.3)' },
  compHeaderText: { fontFamily: Typography.fontFamily.bold, color: '#fff', fontSize: Typography.fontSize.xs },
  compCell: { paddingVertical: 8, paddingHorizontal: 6 },
  compCellFeature: { flex: 2, fontSize: 11, color: 'rgba(255,255,255,0.7)', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.08)' },
  compCellPlan: { flex: 1, textAlign: 'center', fontSize: 11 },
  compFreeText: { color: 'rgba(255,255,255,0.4)' },
  compPremiumText: { color: '#e9d5ff', fontFamily: Typography.fontFamily.medium },
  compPremiumHeader: { color: Colors.gold.main },
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
  legalText: { fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 16 },
  premiumActiveContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  premiumActiveEmoji: { fontSize: 80, marginBottom: Spacing.lg },
  premiumActiveTitle: { fontSize: Typography.fontSize['3xl'], fontFamily: Typography.fontFamily.bold, color: Colors.gold.main },
  premiumActiveSubtitle: { fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: Spacing.sm },
  premiumExpiry: { fontSize: Typography.fontSize.sm, color: Colors.lavender[300], marginTop: Spacing.md },
  backBtn: {
    marginTop: Spacing.xl, backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  backBtnText: { color: '#fff', fontFamily: Typography.fontFamily.bold },
})
