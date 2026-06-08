import { FastifyInstance } from 'fastify'
import { authenticate } from '@/middleware/auth.middleware'
import { PartnerService } from './partner.service'

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
}
