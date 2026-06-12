import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware'
import { GardenService } from './garden.service'

const gardenService = new GardenService()

export async function gardenRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET /garden — garden status
  app.get('/', async (req, reply) => {
    const result = await gardenService.getGardenStatus(req.currentUser.id)
    return reply.send(result)
  })

  // POST /garden/rewarded-video — claim rewarded video crystals
  app.post('/rewarded-video', async (req, reply) => {
    const body = z.object({
      adUnitId: z.string(),
      verificationToken: z.string().optional(),
    }).parse(req.body)

    // In production: verify with AdMob server-side verification
    await gardenService.awardCrystals(
      req.currentUser.id,
      15,
      'REWARDED_VIDEO',
      'Video recompensado completado'
    )

    return reply.send({ crystalsEarned: 15, message: '¡Cristales ganados!' })
  })

  // POST /garden/spend — spend crystals on items
  app.post('/spend', async (req, reply) => {
    const body = z.object({
      amount: z.number().int().positive(),
      description: z.string(),
    }).parse(req.body)

    const success = await gardenService.spendCrystals(
      req.currentUser.id,
      body.amount,
      body.description
    )

    if (!success) {
      return reply.status(400).send({ error: 'Cristales insuficientes' })
    }

    return reply.send({ success: true, message: '¡Cristales gastados!' })
  })

  // POST /garden/customize — update garden customization (costs crystals)
  app.post('/customize', async (req, reply) => {
    const body = z.object({
      background: z.string().optional(),
      decorations: z.array(z.string()).optional(),
      mascotAccessory: z.string().optional(),
      crystalCost: z.number().int().min(0).default(0),
    }).parse(req.body)

    if (body.crystalCost > 0) {
      const success = await gardenService.spendCrystals(
        req.currentUser.id,
        body.crystalCost,
        'Personalización del jardín'
      )
      if (!success) {
        return reply.status(400).send({ error: 'Cristales insuficientes' })
      }
    }

    const { prisma } = await import('@/config/database')
    const updated = await prisma.lunarGarden.update({
      where: { userId: req.currentUser.id },
      data: {
        customization: { background: body.background, decorations: body.decorations },
        mascotAccessory: body.mascotAccessory,
      },
    })

    return reply.send(updated)
  })

  // GET /garden/achievements — all achievements with user progress
  app.get('/achievements', async (req, reply) => {
    const { prisma } = await import('@/config/database')
    const [all, unlocked] = await Promise.all([
      prisma.achievement.findMany({ where: { isHidden: false }, orderBy: { xpReward: 'desc' } }),
      prisma.userAchievement.findMany({
        where: { userId: req.currentUser.id },
        select: { achievementId: true, unlockedAt: true },
      }),
    ])

    const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]))

    return reply.send(all.map((a) => ({
      ...a,
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id) ?? null,
    })))
  })

  // GET /garden/leaderboard — future feature
  app.get('/leaderboard', async (_req, reply) => {
    return reply.send({ message: 'Próximamente', data: [] })
  })
}
