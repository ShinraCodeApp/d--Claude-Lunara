import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware'
import { SubscriptionService } from './subscription.service'
import { MercadoPagoService } from './subscription.mp.service'

const subscriptionService = new SubscriptionService()
const mpService = new MercadoPagoService()

export async function subscriptionRoutes(app: FastifyInstance) {
  // ─── MercadoPago webhook — sin auth (MP lo llama directamente) ───
  app.post('/mp/webhook', { preHandler: [] }, async (req, reply) => {
    const query = req.query as Record<string, string>
    const body = req.body as Record<string, unknown>
    await mpService.handleWebhook(query, body)
    return reply.status(200).send({ received: true })
  })

  app.addHook('preHandler', authenticate)

  // GET /subscriptions/status — current subscription
  app.get('/status', async (req, reply) => {
    const status = await subscriptionService.getStatus(req.currentUser.id)
    return reply.send(status)
  })

  // POST /subscriptions/webhook — RevenueCat webhook (no auth)
  app.post('/webhook', {
    config: { rawBody: true },
    preHandler: [],
  }, async (req, reply) => {
    const body = req.body as Record<string, unknown>
    await subscriptionService.processWebhook(body)
    return reply.status(200).send({ received: true })
  })

  // POST /subscriptions/activate — activate after direct IAP purchase (react-native-iap)
  app.post('/activate', async (req, reply) => {
    const body = z.object({
      productId: z.string(),
      purchaseToken: z.string(),
      platform: z.enum(['ios', 'android']),
    }).parse(req.body)

    const result = await subscriptionService.activatePurchase(req.currentUser.id, body)
    return reply.send(result)
  })

  // POST /subscriptions/restore — restore purchases
  app.post('/restore', async (req, reply) => {
    const body = z.object({
      platform: z.enum(['ios', 'android']),
      revenuecatUserId: z.string(),
    }).parse(req.body)

    const result = await subscriptionService.restorePurchases(req.currentUser.id, body)
    return reply.send(result)
  })

  // POST /subscriptions/mp/create-preference — crear preferencia de pago MP
  app.post('/mp/create-preference', async (req, reply) => {
    const body = z.object({
      plan: z.enum(['monthly', 'annual']),
    }).parse(req.body)

    if (!process.env.MP_ACCESS_TOKEN) {
      return reply.status(503).send({ error: 'MercadoPago no está configurado' })
    }

    const result = await mpService.createPreference(
      req.currentUser.id,
      body.plan,
      req.currentUser.email,
    )
    return reply.send(result)
  })

  // POST /subscriptions/cancel — cancel subscription
  app.post('/cancel', async (req, reply) => {
    const body = z.object({
      reason: z.string().max(200).optional(),
    }).parse(req.body)

    await subscriptionService.cancelSubscription(req.currentUser.id, body.reason)
    return reply.send({ message: 'Suscripción cancelada. Seguirás teniendo acceso hasta el final del período.' })
  })
}
