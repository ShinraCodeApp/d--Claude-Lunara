import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware'
import { PartnerService } from './partner.service'
import { prisma } from '@/config/database'

export async function partnerRoutes(fastify: FastifyInstance) {
  const svc = new PartnerService()

  // Send partner invite
  fastify.post('/invite', { preHandler: [authenticate] }, async (req, reply) => {
    const { partnerEmail } = req.body as { partnerEmail: string }
    const link = await svc.createInvite(req.currentUser!.id, partnerEmail)
    return reply.send({ inviteCode: link.inviteCode, expiresAt: link.expiresAt })
  })

  // Accept partner invite
  fastify.post('/accept/:code', { preHandler: [authenticate] }, async (req, reply) => {
    const { code } = req.params as { code: string }
    const link = await svc.acceptInvite(req.currentUser!.id, code)
    return reply.send({ partnerId: link.partnerId, partnerName: link.partnerName })
  })

  // Get partner dashboard data (shared info for partner to see)
  fastify.get('/dashboard', { preHandler: [authenticate] }, async (req, reply) => {
    const data = await svc.getPartnerDashboard(req.currentUser!.id)
    if (!data) return reply.code(404).send({ message: 'No tienes pareja vinculada' })
    return reply.send(data)
  })

  // Get partner link status
  fastify.get('/status', { preHandler: [authenticate] }, async (req, reply) => {
    const status = await svc.getLinkStatus(req.currentUser!.id)
    return reply.send(status)
  })

  // Remove partner link
  fastify.delete('/unlink', { preHandler: [authenticate] }, async (req, reply) => {
    await svc.unlink(req.currentUser!.id)
    return reply.send({ success: true })
  })

  // POST /partner/notify-phase — send push notification to linked partner
  fastify.post('/notify-phase', { preHandler: [authenticate] }, async (req, reply) => {
    const body = z.object({
      phase: z.enum(['menstrual', 'follicular', 'ovulatory', 'luteal']),
      daysUntilPeriod: z.number().optional(),
    }).parse(req.body)

    const PHASE_MESSAGES: Record<string, { title: string; body: string }> = {
      menstrual: { title: '🩸 Período de tu pareja', body: 'Tu pareja está en su período. Un buen momento para ser extra atenta/o 💜' },
      follicular: { title: '🌱 Nueva fase de tu pareja', body: 'Tu pareja está en fase folicular — llena de energía y creatividad ✨' },
      ovulatory: { title: '🌕 Tu pareja se siente radiante', body: 'Está en su fase de ovulación — ideal para planes juntos y conexión emocional 💛' },
      luteal: { title: '🌘 Fase lútea de tu pareja', body: `Tu pareja puede necesitar más espacio y comprensión${body.daysUntilPeriod ? ` — período en ~${body.daysUntilPeriod} días` : ''} 💜` },
    }

    const link = await prisma.partnerLink.findFirst({
      where: { ownerId: req.currentUser!.id, isActive: true, guestId: { not: null } },
      include: { guest: { include: { devices: { where: { isActive: true, fcmToken: { not: null } } } } } },
    })

    if (!link?.guest?.devices?.length) {
      return reply.send({ sent: false, reason: 'Pareja no vinculada o sin dispositivo registrado' })
    }

    const tokens = link.guest.devices.map((d: any) => d.fcmToken!).filter(Boolean)
    const msg = PHASE_MESSAGES[body.phase]

    try {
      const { default: firebaseAdmin } = await import('@/config/firebase')
      await firebaseAdmin.messaging().sendEachForMulticast({
        tokens,
        notification: { title: msg.title, body: msg.body },
        data: { type: 'partner_phase', phase: body.phase },
        android: { priority: 'high', notification: { channelId: 'lunara_notifications', color: '#8b5cf6' } },
      })
      return reply.send({ sent: true })
    } catch {
      return reply.send({ sent: false, reason: 'Error al enviar notificación' })
    }
  })
}
