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

  // POST /garden/customize — update garden customization
  app.post('/customize', async (req, reply) => {
    const body = z.object({
      background: z.string().optional(),
      decorations: z.array(z.string()).optional(),
      mascotAccessory: z.string().optional(),
    }).parse(req.body)

    // TODO: Verify user has the items (crystal balance check)
    const updated = await import('@/config/database').then(({ prisma }) =>
      prisma.lunarGarden.update({
        where: { userId: req.currentUser.id },
        data: {
          customization: body,
          mascotAccessory: body.mascotAccessory,
        },
      })
    )

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
