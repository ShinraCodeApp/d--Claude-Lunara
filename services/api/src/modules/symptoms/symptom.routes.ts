import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware'
import { prisma } from '@/config/database'
import { GardenService } from '../garden/garden.service'

const gardenService = new GardenService()

export async function symptomRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET /symptoms — available symptoms
  app.get('/', async (_req, reply) => {
    const symptoms = await prisma.symptom.findMany({
      where: { isDefault: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
    return reply.send(symptoms)
  })

  // POST /symptoms/log — log symptom
  app.post('/log', async (req, reply) => {
    const body = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      symptomId: z.string().uuid(),
      intensity: z.enum(['MILD', 'MODERATE', 'SEVERE']),
      notes: z.string().max(200).optional(),
    }).parse(req.body)

    const log = await prisma.symptomLog.create({
      data: {
        userId: req.currentUser.id,
        date: new Date(body.date),
        symptomId: body.symptomId,
        intensity: body.intensity,
        notes: body.notes,
      },
      include: { symptom: true },
    })

    await gardenService.awardXP(req.currentUser.id, 5, 'symptom_log')
    return reply.status(201).send(log)
  })

  // GET /symptoms/logs — user symptom history
  app.get('/logs', async (req, reply) => {
    const query = z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.coerce.number().default(50),
    }).parse(req.query)

    const logs = await prisma.symptomLog.findMany({
      where: {
        userId: req.currentUser.id,
        ...(query.startDate && { date: { gte: new Date(query.startDate) } }),
        ...(query.endDate && { date: { lte: new Date(query.endDate) } }),
      },
      include: { symptom: true },
      orderBy: { date: 'desc' },
      take: query.limit,
    })

    return reply.send(logs)
  })

  // POST /symptoms/mood — log mood
  app.post('/mood', async (req, reply) => {
    const body = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      mood: z.enum(['HAPPY', 'SAD', 'ANXIOUS', 'STRESSED', 'MOTIVATED', 'RELAXED', 'IRRITABLE', 'NEUTRAL', 'EMOTIONAL', 'ENERGETIC', 'TIRED']),
      intensity: z.number().min(1).max(5),
      notes: z.string().max(200).optional(),
    }).parse(req.body)

    const log = await prisma.moodLog.upsert({
      where: {
        id: `${req.currentUser.id}_${body.date}`,
      },
      update: { mood: body.mood, intensity: body.intensity, notes: body.notes },
      create: {
        userId: req.currentUser.id,
        date: new Date(body.date),
        mood: body.mood,
        intensity: body.intensity,
        notes: body.notes,
      },
    })

    await gardenService.awardXP(req.currentUser.id, 5, 'mood_log')
    return reply.status(201).send(log)
  })

  // POST /symptoms/daily-log — complete daily log
  app.post('/daily-log', async (req, reply) => {
    const body = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      energyLevel: z.number().min(1).max(5).optional(),
      sleepHours: z.number().min(0).max(24).optional(),
      sleepQuality: z.number().min(1).max(5).optional(),
      libido: z.number().min(1).max(5).optional(),
      notes: z.string().max(500).optional(),
    }).parse(req.body)

    const log = await prisma.dailyLog.upsert({
      where: { userId_date: { userId: req.currentUser.id, date: new Date(body.date) } },
      update: { ...body, date: new Date(body.date) },
      create: { userId: req.currentUser.id, ...body, date: new Date(body.date) },
    })

    // Award XP for daily log
    const { currentStreak } = await gardenService.updateDailyStreak(req.currentUser.id)
    await gardenService.awardXP(req.currentUser.id, 10, 'daily_log')

    return reply.status(201).send({ log, currentStreak })
  })
}
