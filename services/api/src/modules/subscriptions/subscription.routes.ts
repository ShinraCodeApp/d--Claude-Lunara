import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware'
import { SubscriptionService } from './subscription.service'

const subscriptionService = new SubscriptionService()

export async function subscriptionRoutes(app: FastifyInstance) {
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

  // POST /subscriptions/restore — restore purchases
  app.post('/restore', async (req, reply) => {
    const body = z.object({
      platform: z.enum(['ios', 'android']),
      revenuecatUserId: z.string(),
    }).parse(req.body)

    const result = await subscriptionService.restorePurchases(req.currentUser.id, body)
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
