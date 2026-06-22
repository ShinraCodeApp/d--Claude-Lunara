import MercadoPagoConfig, { Preference, Payment } from 'mercadopago'
import { prisma } from '@/config/database'
import { env } from '@/config/env'
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client'

function getMpClient() {
  return new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN! })
}

export class MercadoPagoService {
  async createPreference(userId: string, plan: 'monthly' | 'annual', userEmail: string) {
    const client = getMpClient()
    const preference = new Preference(client)

    const isAnnual = plan === 'annual'
    const price = isAnnual
      ? Number(env.MP_ANNUAL_PRICE ?? 34.99)
      : Number(env.MP_MONTHLY_PRICE ?? 4.99)
    const currency = env.MP_CURRENCY ?? 'ARS'
    const apiUrl = env.API_URL ?? 'https://d-claude-lunara-production.up.railway.app'

    const pref = await preference.create({
      body: {
        items: [
          {
            id: isAnnual ? 'lunara_premium_annual' : 'lunara_premium_monthly',
            title: isAnnual ? 'Lunara Premium — Plan Anual' : 'Lunara Premium — Plan Mensual',
            description: 'Acceso completo a todas las funciones de Lunara por ShinraCode',
            quantity: 1,
            currency_id: currency,
            unit_price: price,
          },
        ],
        payer: { email: userEmail },
        // userId|plan para identificar en el webhook
        external_reference: `${userId}|${plan}`,
        back_urls: {
          success: 'lunara://payment/success',
          failure: 'lunara://payment/failure',
          pending: 'lunara://payment/pending',
        },
        auto_return: 'approved',
        notification_url: `${apiUrl}/api/v1/subscriptions/mp/webhook`,
        statement_descriptor: 'LUNARA PREMIUM',
      },
    })

    return {
      preferenceId: pref.id,
      initPoint: env.NODE_ENV === 'production' ? pref.init_point : pref.sandbox_init_point,
    }
  }

  async handleWebhook(query: Record<string, string>, body: Record<string, unknown>) {
    // MP envía el payment ID por query string (IPN) o en el body (Webhooks v2)
    const paymentId = query['id'] ?? query['data.id'] ?? (body?.data as any)?.id
    const topic = query['topic'] ?? query['type'] ?? body?.type

    if (!paymentId || (topic !== 'payment')) return { ok: false, reason: 'not_a_payment' }

    const client = getMpClient()
    const paymentClient = new Payment(client)
    const paymentData = await paymentClient.get({ id: String(paymentId) })

    if (paymentData.status !== 'approved') return { ok: false, reason: 'not_approved' }

    const externalRef = paymentData.external_reference
    if (!externalRef?.includes('|')) return { ok: false, reason: 'invalid_ref' }

    const [userId, plan] = externalRef.split('|')
    if (!userId) return { ok: false, reason: 'no_user' }

    const isAnnual = plan === 'annual'
    const tier = isAnnual ? SubscriptionTier.PREMIUM_ANNUAL : SubscriptionTier.PREMIUM_MONTHLY
    const now = new Date()
    const periodEnd = new Date(now.getTime() + (isAnnual ? 365 : 30) * 24 * 60 * 60 * 1000)

    await prisma.subscription.upsert({
      where: { userId },
      update: {
        tier,
        status: SubscriptionStatus.ACTIVE,
        productId: isAnnual ? 'mp_annual' : 'mp_monthly',
        purchaseToken: String(paymentId),
        platform: 'android',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
        cancelReason: null,
      },
      create: {
        userId,
        tier,
        status: SubscriptionStatus.ACTIVE,
        productId: isAnnual ? 'mp_annual' : 'mp_monthly',
        purchaseToken: String(paymentId),
        platform: 'android',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    })

    await prisma.user.update({
      where: { id: userId },
      data: { role: 'PREMIUM' },
    })

    return { ok: true, userId, plan, periodEnd }
  }
}
