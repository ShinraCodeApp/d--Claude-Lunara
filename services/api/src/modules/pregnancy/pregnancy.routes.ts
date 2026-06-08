import { FastifyInstance } from 'fastify'
import { authenticate, requirePremium } from '@/middleware/auth.middleware'
import { PregnancyService } from './pregnancy.service'

export async function pregnancyRoutes(fastify: FastifyInstance) {
  const svc = new PregnancyService()

  // Activate / update pregnancy mode
  fastify.post('/profile', { preHandler: [authenticate, requirePremium] }, async (req, reply) => {
    const { lastMenstrualPeriod, dueDate, isHighRisk } = req.body as any
    const profile = await svc.upsertProfile(req.currentUser!.id, {
      lastMenstrualPeriod: new Date(lastMenstrualPeriod),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      isHighRisk: isHighRisk ?? false,
    })
    return reply.send(profile)
  })

  // Get pregnancy profile
  fastify.get('/profile', { preHandler: [authenticate] }, async (req, reply) => {
    const profile = await svc.getProfile(req.currentUser!.id)
    if (!profile) return reply.code(404).send({ message: 'Perfil de embarazo no encontrado' })
    return reply.send(profile)
  })

  // Log weekly note
  fastify.post('/week-log', { preHandler: [authenticate] }, async (req, reply) => {
    const { weekNumber, weight, symptoms, babyMovements, notes } = req.body as any
    const log = await svc.logWeek(req.currentUser!.id, {
      weekNumber, weight, symptoms, babyMovements, notes,
    })
    return reply.send(log)
  })

  // Get week logs
  fastify.get('/week-logs', { preHandler: [authenticate] }, async (req, reply) => {
    const logs = await svc.getWeekLogs(req.currentUser!.id)
    return reply.send({ logs })
  })

  // Get weekly info (fetal development, tips)
  fastify.get('/week-info/:week', { preHandler: [authenticate] }, async (req, reply) => {
    const week = parseInt((req.params as any).week)
    const info = svc.getWeekInfo(week)
    return reply.send(info)
  })

  // Deactivate pregnancy mode
  fastify.delete('/profile', { preHandler: [authenticate] }, async (req, reply) => {
    await svc.deactivateProfile(req.currentUser!.id)
    return reply.send({ success: true })
  })
}
