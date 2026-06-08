import { FastifyInstance } from 'fastify'
import { authenticate } from '@/middleware/auth.middleware'
import { prisma } from '@/config/database'
import { redis, REDIS_KEYS } from '@/config/redis'

export async function predictionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET /predictions/current — current active prediction
  app.get('/current', async (req, reply) => {
    const userId = req.currentUser.id

    // Try cache first
    const cached = await redis.get(REDIS_KEYS.cyclePrediction(userId))
    if (cached) return reply.send(JSON.parse(cached))

    const prediction = await prisma.cyclePrediction.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    if (prediction) {
      await redis.setex(REDIS_KEYS.cyclePrediction(userId), 300, JSON.stringify(prediction))
    }

    return reply.send(prediction)
  })

  // GET /predictions/history — prediction history
  app.get('/history', async (req, reply) => {
    const predictions = await prisma.cyclePrediction.findMany({
      where: { userId: req.currentUser.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id: true,
        predictedStartDate: true,
        predictedEndDate: true,
        ovulationDate: true,
        fertilityWindowStart: true,
        fertilityWindowEnd: true,
        confidence: true,
        cyclesAnalyzed: true,
        createdAt: true,
        isActive: true,
      },
    })

    return reply.send(predictions)
  })

  // GET /predictions/fertility-score — daily fertility scores for current cycle
  app.get('/fertility-score', async (req, reply) => {
    const prediction = await prisma.cyclePrediction.findFirst({
      where: { userId: req.currentUser.id, isActive: true },
      select: { dailyFertilityScores: true, predictedStartDate: true },
    })

    if (!prediction) return reply.send({ scores: [], message: 'No hay predicción activa' })

    return reply.send({
      scores: prediction.dailyFertilityScores,
      cycleStart: prediction.predictedStartDate,
    })
  })
}
