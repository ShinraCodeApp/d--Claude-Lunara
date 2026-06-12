import { prisma } from '@/config/database'
import { env } from '@/config/env'
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client'

export class SubscriptionService {
  async getStatus(userId: string) {
    const sub = await prisma.subscription.findUnique({ where: { userId } })
    if (!sub) {
      return { tier: 'FREE', status: 'ACTIVE', isPremium: false }
    }

    const isPremium =
      ['PREMIUM_MONTHLY', 'PREMIUM_ANNUAL'].includes(sub.tier) &&
      sub.status === 'ACTIVE' &&
      (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date())

    return { ...sub, isPremium }
  }

  async processWebhook(payload: Record<string, unknown>) {
    // RevenueCat webhook structure
    const event = payload.event as Record<string, unknown>
    if (!event) return

    const eventType = event.type as string
    const appUserId = event.app_user_id as string
    const productId = event.product_id as string

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: appUserId },
          { subscription: { revenuecatCustomerId: appUserId } },
        ],
      },
    })

    if (!user) return

    const tierMap: Record<string, SubscriptionTier> = {
      'lunara.premium.monthly': SubscriptionTier.PREMIUM_MONTHLY,
      'lunara.premium.annual': SubscriptionTier.PREMIUM_ANNUAL,
    }

    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        await prisma.subscription.upsert({
          where: { userId: user.id },
          update: {
            tier: tierMap[productId] ?? SubscriptionTier.PREMIUM_MONTHLY,
            status: SubscriptionStatus.ACTIVE,
            productId,
            currentPeriodStart: new Date(event.purchased_at_ms as number),
            currentPeriodEnd: new Date(event.expiration_at_ms as number),
          },
          create: {
            userId: user.id,
            tier: tierMap[productId] ?? SubscriptionTier.PREMIUM_MONTHLY,
            status: SubscriptionStatus.ACTIVE,
            productId,
            revenuecatCustomerId: appUserId,
            currentPeriodStart: new Date(event.purchased_at_ms as number),
            currentPeriodEnd: new Date(event.expiration_at_ms as number),
          },
        })

        // Update user role
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'PREMIUM' },
        })
        break

      case 'CANCELLATION':
        await prisma.subscription.update({
          where: { userId: user.id },
          data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
        })
        break

      case 'EXPIRATION':
        await prisma.subscription.update({
          where: { userId: user.id },
          data: { status: SubscriptionStatus.EXPIRED, tier: SubscriptionTier.FREE },
        })
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'USER' },
        })
        break

      case 'TRIAL_STARTED':
        await prisma.subscription.upsert({
          where: { userId: user.id },
          update: {
            status: SubscriptionStatus.TRIAL,
            tier: tierMap[productId] ?? SubscriptionTier.PREMIUM_MONTHLY,
            trialEnd: new Date(event.expiration_at_ms as number),
          },
          create: {
            userId: user.id,
            status: SubscriptionStatus.TRIAL,
            tier: tierMap[productId] ?? SubscriptionTier.PREMIUM_MONTHLY,
            revenuecatCustomerId: appUserId,
            trialEnd: new Date(event.expiration_at_ms as number),
          },
        })
        break
    }
  }

  async restorePurchases(userId: string, data: { platform: string; revenuecatUserId: string }) {
    // Fetch from RevenueCat API to verify entitlements
    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${data.revenuecatUserId}`,
      {
        headers: {
          Authorization: `Bearer ${env.REVENUECAT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw { statusCode: 402, message: 'No se encontraron compras para restaurar' }
    }

    const rcData = await response.json()
    const entitlements = rcData.subscriber?.entitlements

    if (entitlements?.premium?.is_active) {
      const productId = entitlements.premium.product_identifier
      const tier = productId.includes('annual') ? 'PREMIUM_ANNUAL' : 'PREMIUM_MONTHLY'

      await prisma.subscription.upsert({
        where: { userId },
        update: { tier: tier as SubscriptionTier, status: SubscriptionStatus.ACTIVE, revenuecatCustomerId: data.revenuecatUserId },
        create: { userId, tier: tier as SubscriptionTier, status: SubscriptionStatus.ACTIVE, revenuecatCustomerId: data.revenuecatUserId },
      })

      return { restored: true, tier, message: 'Compras restauradas correctamente' }
    }

    return { restored: false, message: 'No se encontraron suscripciones activas' }
  }

  async cancelSubscription(userId: string, reason?: string) {
    await prisma.subscription.update({
      where: { userId },
      data: {
        cancelledAt: new Date(),
        cancelReason: reason,
        status: 'CANCELLED',
      },
    })
  }
}
