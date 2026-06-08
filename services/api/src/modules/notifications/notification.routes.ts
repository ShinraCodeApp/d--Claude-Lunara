import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware'
import { NotificationService } from './notification.service'

const notificationService = new NotificationService()

export async function notificationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // POST /notifications/register-device
  app.post('/register-device', async (req, reply) => {
    const body = z.object({
      fcmToken: z.string().optional(),
      apnsToken: z.string().optional(),
      platform: z.enum(['ios', 'android']),
      appVersion: z.string().optional(),
    }).parse(req.body)

    await notificationService.registerDevice(req.currentUser.id, body)
    return reply.send({ message: 'Dispositivo registrado' })
  })

  // GET /notifications/settings
  app.get('/settings', async (req, reply) => {
    const settings = await notificationService.getSettings(req.currentUser.id)
    return reply.send(settings)
  })

  // PUT /notifications/settings
  app.put('/settings', async (req, reply) => {
    const body = z.object({
      periodReminder: z.boolean().optional(),
      periodReminderDays: z.number().min(0).max(7).optional(),
      ovulationReminder: z.boolean().optional(),
      dailyLogReminder: z.boolean().optional(),
      dailyLogTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      symptomReminder: z.boolean().optional(),
      wellnessTips: z.boolean().optional(),
      achievements: z.boolean().optional(),
    }).parse(req.body)

    const updated = await notificationService.updateSettings(req.currentUser.id, body)
    return reply.send(updated)
  })

  // GET /notifications — user notifications
  app.get('/', async (req, reply) => {
    const query = z.object({
      unreadOnly: z.coerce.boolean().default(false),
      limit: z.coerce.number().default(20),
    }).parse(req.query)

    const result = await notificationService.getUserNotifications(req.currentUser.id, query)
    return reply.send(result)
  })

  // POST /notifications/:id/read — mark as read
  app.post('/:id/read', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await notificationService.markAsRead(req.currentUser.id, id)
    return reply.send({ success: true })
  })

  // POST /notifications/read-all
  app.post('/read-all', async (req, reply) => {
    await notificationService.markAllAsRead(req.currentUser.id)
    return reply.send({ success: true })
  })
}
