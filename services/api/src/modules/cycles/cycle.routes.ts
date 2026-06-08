import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware'
import { CycleService } from './cycle.service'

const cycleService = new CycleService()

export async function cycleRoutes(app: FastifyInstance) {
  // All routes require auth
  app.addHook('preHandler', authenticate)

  // GET /cycles — list user cycles
  app.get('/', async (req, reply) => {
    const query = z.object({
      limit: z.coerce.number().min(1).max(50).default(12),
      offset: z.coerce.number().min(0).default(0),
    }).parse(req.query)

    const result = await cycleService.getCycles(req.currentUser.id, query)
    return reply.send(result)
  })

  // GET /cycles/current — current cycle info
  app.get('/current', async (req, reply) => {
    const result = await cycleService.getCurrentCycle(req.currentUser.id)
    return reply.send(result)
  })

  // POST /cycles — start period
  app.post('/', async (req, reply) => {
    const body = z.object({
      startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
      notes: z.string().max(500).optional(),
    }).parse(req.body)

    const result = await cycleService.startCycle(req.currentUser.id, body)
    return reply.status(201).send(result)
  })

  // PUT /cycles/:id/end — end period
  app.put('/:id/end', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body = z.object({
      endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
      notes: z.string().max(500).optional(),
    }).parse(req.body)

    const result = await cycleService.endCycle(req.currentUser.id, id, body)
    return reply.send(result)
  })

  // POST /cycles/:id/bleeding — log bleeding day
  app.post('/:id/bleeding', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      intensity: z.enum(['SPOTTING', 'LIGHT', 'MEDIUM', 'HEAVY', 'VERY_HEAVY']),
      notes: z.string().max(200).optional(),
    }).parse(req.body)

    const result = await cycleService.logBleedingDay(req.currentUser.id, id, body)
    return reply.status(201).send(result)
  })

  // GET /cycles/calendar — calendar view data
  app.get('/calendar', async (req, reply) => {
    const query = z.object({
      year: z.coerce.number().min(2000).max(2100),
      month: z.coerce.number().min(1).max(12),
    }).parse(req.query)

    const result = await cycleService.getCalendarData(req.currentUser.id, query.year, query.month)
    return reply.send(result)
  })

  // GET /cycles/stats — cycle statistics
  app.get('/stats', async (req, reply) => {
    const result = await cycleService.getStats(req.currentUser.id)
    return reply.send(result)
  })

  // DELETE /cycles/:id — delete cycle (with GDPR consideration)
  app.delete('/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await cycleService.deleteCycle(req.currentUser.id, id)
    return reply.status(204).send()
  })
}
