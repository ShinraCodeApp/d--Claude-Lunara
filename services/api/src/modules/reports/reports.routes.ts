import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate, requirePremium } from '@/middleware/auth.middleware'
import { ReportsService } from './reports.service'

const reportsService = new ReportsService()

export async function reportsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET /reports — list generated reports
  app.get('/', async (req, reply) => {
    const reports = await reportsService.listReports(req.currentUser.id)
    return reply.send(reports)
  })

  // POST /reports/monthly — generate monthly PDF (PREMIUM)
  app.post('/monthly', { preHandler: [requirePremium] }, async (req, reply) => {
    const body = z.object({
      year: z.number(),
      month: z.number().min(1).max(12),
    }).parse(req.body)

    const report = await reportsService.generateMonthlyReport(req.currentUser.id, body.year, body.month)
    return reply.send(report)
  })

  // POST /reports/annual — generate annual PDF (PREMIUM)
  app.post('/annual', { preHandler: [requirePremium] }, async (req, reply) => {
    const body = z.object({ year: z.number() }).parse(req.body)
    const report = await reportsService.generateAnnualReport(req.currentUser.id, body.year)
    return reply.send(report)
  })

  // GET /reports/:id/download — get download URL
  app.get('/:id/download', { preHandler: [requirePremium] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const url = await reportsService.getDownloadUrl(req.currentUser.id, id)
    return reply.send({ url })
  })
}
