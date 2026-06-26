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
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
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

  // GET /admin/users/:id — user detail
  app.get('/users/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        subscription: true,
        _count: { select: { menstrualCycles: true, symptomLogs: true, aiMessages: true } },
      },
    })
    if (!user) return reply.status(404).send({ error: 'Usuario no encontrado' })
    return reply.send(user)
  })

  // PUT /admin/users/:id/subscription — grant or revoke premium
  app.put('/users/:id/subscription', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body = z.object({
      tier: z.enum(['FREE', 'PREMIUM_MONTHLY', 'PREMIUM_ANNUAL']),
    }).parse(req.body)

    const updated = await prisma.subscription.upsert({
      where: { userId: id },
      create: {
        userId: id,
        tier: body.tier as any,
        status: body.tier === 'FREE' ? 'CANCELLED' : 'ACTIVE',
        currentPeriodEnd: body.tier === 'FREE' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        tier: body.tier as any,
        status: body.tier === 'FREE' ? 'CANCELLED' : 'ACTIVE',
        currentPeriodEnd: body.tier === 'FREE' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })
    return reply.send(updated)
  })

  // GET /admin/community — all posts for moderation
  app.get('/community', async (req, reply) => {
    const query = z.object({
      page: z.coerce.number().default(1),
      limit: z.coerce.number().default(20),
    }).parse(req.query)

    const [posts, total] = await Promise.all([
      prisma.communityPost.findMany({
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: (query.page - 1) * query.limit,
        include: {
          author: { select: { email: true, profile: { select: { firstName: true } } } },
          _count: { select: { reactions: true } },
        },
      }),
      prisma.communityPost.count(),
    ])
    return reply.send({ posts, total, page: query.page })
  })

  // DELETE /admin/community/:postId — delete community post
  app.delete('/community/:postId', async (req, reply) => {
    const { postId } = z.object({ postId: z.string().uuid() }).parse(req.params)
    await prisma.communityPost.delete({ where: { id: postId } })
    return reply.status(204).send()
  })

  // GET /admin/achievements — achievement management
  app.get('/achievements', async (_req, reply) => {
    const achievements = await prisma.achievement.findMany({
      include: { _count: { select: { userAchievements: true } } },
      orderBy: { xpReward: 'desc' },
    })
    return reply.send(achievements)
  })

  // ─── Articles ──────────────────────────────────────────────

  // GET /admin/articles
  app.get('/articles', async (req, reply) => {
    const { page } = z.object({ page: z.coerce.number().default(1) }).parse(req.query)
    const skip = (page - 1) * 20
    const [items, total] = await Promise.all([
      prisma.article.findMany({
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        skip,
        take: 20,
        include: { author: { select: { profile: { select: { firstName: true } } } } },
      }),
      prisma.article.count(),
    ])
    return reply.send({ items, total, page })
  })

  // POST /admin/articles
  app.post('/articles', async (req, reply) => {
    const body = z.object({
      title: z.string().min(1).max(200),
      excerpt: z.string().min(1).max(500),
      content: z.string().min(1),
      imageUrl: z.string().url().optional(),
      category: z.string().default('salud'),
      isPinned: z.boolean().default(false),
      isPublished: z.boolean().default(true),
    }).parse(req.body)

    const article = await prisma.article.create({
      data: { ...body, authorId: req.currentUser.id },
    })
    return reply.status(201).send(article)
  })

  // PUT /admin/articles/:id
  app.put('/articles/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body = z.object({
      title: z.string().min(1).max(200).optional(),
      excerpt: z.string().min(1).max(500).optional(),
      content: z.string().min(1).optional(),
      imageUrl: z.string().url().nullable().optional(),
      category: z.string().optional(),
      isPinned: z.boolean().optional(),
      isPublished: z.boolean().optional(),
    }).parse(req.body)

    const article = await prisma.article.update({ where: { id }, data: body })
    return reply.send(article)
  })

  // DELETE /admin/articles/:id
  app.delete('/articles/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await prisma.article.delete({ where: { id } })
    return reply.status(204).send()
  })
}
