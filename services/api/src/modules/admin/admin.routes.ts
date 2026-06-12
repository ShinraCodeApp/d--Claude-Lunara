import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate, requireAdmin } from '@/middleware/auth.middleware'
import { prisma } from '@/config/database'
import dayjs from 'dayjs'

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireAdmin)

  // GET /admin/stats — dashboard KPIs
  app.get('/stats', async (_req, reply) => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfDay = new Date(now.setHours(0, 0, 0, 0))
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalUsers, premiumUsers, freeUsers,
      monthlyPremium, annualPremium,
      cyclesLoggedToday, aiMessagesToday,
      achievementsToday, dauSet,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.subscription.count({ where: { tier: { in: ['PREMIUM_MONTHLY', 'PREMIUM_ANNUAL'] }, status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { tier: 'FREE' } }),
      prisma.subscription.count({ where: { tier: 'PREMIUM_MONTHLY', status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { tier: 'PREMIUM_ANNUAL', status: 'ACTIVE' } }),
      prisma.menstrualCycle.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.aiMessage.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.userAchievement.count({ where: { unlockedAt: { gte: startOfDay } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: last30Days }, deletedAt: null } }),
    ])

    // Mock revenue calculation (replace with RevenueCat API)
    const monthlyRevenue = monthlyPremium * 4.99 + annualPremium * (34.99 / 12)

    return reply.send({
      totalUsers,
      premiumUsers,
      freeUsers,
      monthlyPremium,
      annualPremium,
      monthlyRevenue: Math.round(monthlyRevenue),
      dau: dauSet,
      cyclesLoggedToday,
      aiMessagesToday,
      achievementsToday,
      userGrowth: 12, // Placeholder — calculate from last month comparison
      premiumGrowth: 8,
      revenueGrowth: 15,
      dauChange: 5,
      alerts: [],
    })
  })

  // GET /admin/growth — growth charts data
  app.get('/growth', async (_req, reply) => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = dayjs().subtract(29 - i, 'day').format('YYYY-MM-DD')
      return { date, count: 0 }
    })

    const userGrowth = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND deleted_at IS NULL
      GROUP BY DATE(created_at)
      ORDER BY date
    `

    const growthMap = new Map(userGrowth.map((r) => [r.date, Number(r.count)]))
    const usersChart = last30Days.map((d) => ({ ...d, count: growthMap.get(d.date) || 0 }))

    return reply.send({ users: usersChart })
  })

  // GET /admin/users — user management
  app.get('/users', async (req, reply) => {
    const query = z.object({
      page: z.coerce.number().default(1),
      limit: z.coerce.number().default(20),
      search: z.string().optional(),
      tier: z.string().optional(),
    }).parse(req.query)

    const where = {
      deletedAt: null,
      ...(query.search && { email: { contains: query.search, mode: 'insensitive' as const } }),
      ...(query.tier && { subscription: { tier: query.tier as any } }),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, role: true, createdAt: true, lastLoginAt: true, emailVerified: true,
          profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          subscription: { select: { tier: true, status: true, currentPeriodEnd: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: (query.page - 1) * query.limit,
      }),
      prisma.user.count({ where }),
    ])

    return reply.send({ users, total, page: query.page, limit: query.limit })
  })

  // PUT /admin/users/:id/role — change user role
  app.put('/users/:id/role', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body = z.object({ role: z.enum(['USER', 'PREMIUM', 'ADMIN']) }).parse(req.body)

    const updated = await prisma.user.update({
      where: { id },
      data: { role: body.role },
      select: { id: true, email: true, role: true },
    })

    return reply.send(updated)
  })

  // DELETE /admin/users/:id — admin delete user
  app.delete('/users/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return reply.status(204).send()
  })

  // GET /admin/content — wellness content management
  app.get('/content', async (_req, reply) => {
    const content = await prisma.wellnessContent.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
    return reply.send(content)
  })

  // POST /admin/content — create wellness content
  app.post('/content', async (req, reply) => {
    const body = z.object({
      type: z.string(),
      category: z.string(),
      titleEs: z.string(),
      bodyEs: z.string(),
      imageUrl: z.string().optional(),
      isPremium: z.boolean().default(false),
      sortOrder: z.number().default(0),
    }).parse(req.body)

    const content = await prisma.wellnessContent.create({ data: body })
    return reply.status(201).send(content)
  })

  // GET /admin/achievements — achievement management
  app.get('/achievements', async (_req, reply) => {
    const achievements = await prisma.achievement.findMany({
      include: { _count: { select: { userAchievements: true } } },
      orderBy: { xpReward: 'desc' },
    })
    return reply.send(achievements)
  })
}
