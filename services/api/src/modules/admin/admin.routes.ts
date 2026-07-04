import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate, requireAdmin } from '@/middleware/auth.middleware'
import { prisma } from '@/config/database'
import dayjs from 'dayjs'
import { NotificationService } from '@/modules/notifications/notification.service'

const notifService = new NotificationService()

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

  // PUT /admin/users/:id/profile — edit user profile
  app.put('/users/:id/profile', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const body = z.object({
      firstName: z.string().max(50).optional(),
      lastName: z.string().max(50).optional(),
      email: z.string().email().optional(),
      bio: z.string().max(300).optional(),
      dateOfBirth: z.string().optional().nullable(),
      averageCycleLength: z.coerce.number().min(15).max(60).optional(),
      averagePeriodLength: z.coerce.number().min(1).max(15).optional(),
    }).parse(req.body)

    const { email, ...profileFields } = body

    const [profile] = await Promise.all([
      prisma.userProfile.upsert({
        where: { userId: id },
        create: { userId: id, ...profileFields, dateOfBirth: profileFields.dateOfBirth ? new Date(profileFields.dateOfBirth) : undefined },
        update: { ...profileFields, dateOfBirth: profileFields.dateOfBirth ? new Date(profileFields.dateOfBirth) : profileFields.dateOfBirth === null ? null : undefined },
      }),
      ...(email ? [prisma.user.update({ where: { id }, data: { email } })] : []),
    ])

    return reply.send(profile)
  })

  // POST /admin/users/:id/reset-password — generate reset link for user
  app.post('/users/:id/reset-password', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return reply.status(404).send({ error: 'Usuario no encontrado' })

    const { generateSecureToken } = await import('@/utils/crypto')
    const { redis, REDIS_KEYS } = await import('@/config/redis')
    const token = generateSecureToken(32)
    await redis.setex(REDIS_KEYS.passwordReset(token), 3600, user.id)

    const adminUrl = process.env.ADMIN_URL || 'http://localhost:3001'
    const resetLink = `${adminUrl}/reset-password?token=${token}`

    const { sendPasswordResetEmail } = await import('@/utils/email')
    await sendPasswordResetEmail(user.email, resetLink).catch(() => null) // non-blocking

    return reply.send({ resetLink, email: user.email, expiresIn: '1 hora' })
  })

  // POST /admin/notifications/broadcast — send push to all users
  app.post('/notifications/broadcast', async (req, reply) => {
    const body = z.object({
      title: z.string().min(1).max(100),
      message: z.string().min(1).max(300),
      type: z.string().default('announcement'),
    }).parse(req.body)

    const devices = await prisma.userDevice.findMany({
      where: { isActive: true, fcmToken: { not: null } },
      select: { userId: true, fcmToken: true },
    })

    const { default: firebaseAdmin } = await import('@/config/firebase')
    const messaging = firebaseAdmin.messaging()

    const chunks = []
    for (let i = 0; i < devices.length; i += 500) chunks.push(devices.slice(i, i + 500))

    let sent = 0
    let failed = 0
    for (const chunk of chunks) {
      const tokens = chunk.map((d) => d.fcmToken!).filter(Boolean)
      if (!tokens.length) continue
      try {
        const result = await messaging.sendEachForMulticast({
          tokens,
          notification: { title: body.title, body: body.message },
          data: { type: body.type },
          android: { priority: 'high', notification: { channelId: 'lunara_notifications', color: '#8b5cf6' } },
        })
        sent += result.successCount
        failed += result.failureCount
      } catch { failed += chunk.length }
    }

    return reply.send({ sent, failed, total: devices.length })
  })

  // POST /admin/articles/:id/announce — post article as official community announcement
  app.post('/articles/:id/announce', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const article = await prisma.article.findUnique({ where: { id } })
    if (!article) return reply.status(404).send({ error: 'Artículo no encontrado' })

    const existing = await prisma.communityPost.findFirst({ where: { articleId: id } })
    if (existing) return reply.status(409).send({ error: 'Este artículo ya fue anunciado en comunidad' })

    const post = await prisma.communityPost.create({
      data: {
        userId: req.currentUser.id,
        content: `📣 **${article.title}**\n\n${article.excerpt}`,
        category: 'general',
        isAnonymous: false,
        isOfficial: true,
        isPinned: true,
        articleId: id,
      },
    })

    return reply.status(201).send(post)
  })

  // GET /admin/community — all posts for moderation (with filter/search)
  app.get('/community', async (req, reply) => {
    const query = z.object({
      page: z.coerce.number().default(1),
      limit: z.coerce.number().default(20),
      category: z.string().optional(),
      search: z.string().optional(),
    }).parse(req.query)

    const where: any = {}
    if (query.category) where.category = query.category
    if (query.search) where.content = { contains: query.search, mode: 'insensitive' }

    const [posts, total] = await Promise.all([
      prisma.communityPost.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        take: query.limit,
        skip: (query.page - 1) * query.limit,
        include: {
          author: { select: { id: true, email: true, profile: { select: { firstName: true } } } },
          _count: { select: { reactions: true } },
        },
      }),
      prisma.communityPost.count({ where }),
    ])
    return reply.send({ posts, total, page: query.page })
  })

  // DELETE /admin/community/:postId — delete community post
  app.delete('/community/:postId', async (req, reply) => {
    const { postId } = z.object({ postId: z.string().uuid() }).parse(req.params)
    await prisma.communityPost.delete({ where: { id: postId } })
    return reply.status(204).send()
  })

  // PATCH /admin/community/:postId/pin — toggle pin
  app.patch('/community/:postId/pin', async (req, reply) => {
    const { postId } = z.object({ postId: z.string().uuid() }).parse(req.params)
    const post = await prisma.communityPost.findUnique({ where: { id: postId } })
    if (!post) return reply.status(404).send({ error: 'Post no encontrado' })
    const updated = await prisma.communityPost.update({
      where: { id: postId },
      data: { isPinned: !post.isPinned },
    })
    return reply.send(updated)
  })

  // DELETE /admin/community/user/:userId — delete all posts from a user
  app.delete('/community/user/:userId', async (req, reply) => {
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.params)
    const { count } = await prisma.communityPost.deleteMany({ where: { userId } })
    return reply.send({ deleted: count })
  })

  // GET /admin/retention — cohort, churn, inactive users
  app.get('/retention', async (_req, reply) => {
    const now = new Date()
    const day7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [inactiveCount, churnedThisMonth, totalUsers, inactiveUsers] = await Promise.all([
      prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { lt: day7ago },
          OR: [{ lastLoginAt: { lt: day7ago } }, { lastLoginAt: null }],
        },
      }),
      prisma.subscription.count({ where: { cancelledAt: { gte: startOfMonth } } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.findMany({
        where: {
          deletedAt: null,
          createdAt: { lt: day7ago },
          OR: [{ lastLoginAt: { lt: day7ago } }, { lastLoginAt: null }],
        },
        select: { id: true, email: true, lastLoginAt: true, createdAt: true, profile: { select: { firstName: true } } },
        orderBy: { lastLoginAt: 'asc' },
        take: 10,
      }),
    ])

    const cohorts = await Promise.all(
      Array.from({ length: 4 }, async (_, i) => {
        const weekStart = dayjs().subtract(i + 1, 'week').startOf('week').toDate()
        const weekEnd = dayjs().subtract(i, 'week').startOf('week').toDate()
        const [registered, stillActive] = await Promise.all([
          prisma.user.count({ where: { createdAt: { gte: weekStart, lt: weekEnd }, deletedAt: null } }),
          prisma.user.count({
            where: { createdAt: { gte: weekStart, lt: weekEnd }, deletedAt: null, lastLoginAt: { gte: day7ago } },
          }),
        ])
        return {
          week: dayjs(weekStart).format('DD/MM'),
          registered,
          active: stillActive,
          retention: registered > 0 ? Math.round((stillActive / registered) * 100) : 0,
        }
      })
    )

    return reply.send({
      inactiveCount,
      churnedThisMonth,
      totalUsers,
      churnRate: totalUsers > 0 ? Math.round((churnedThisMonth / totalUsers) * 100 * 10) / 10 : 0,
      cohorts: cohorts.reverse(),
      inactiveUsers,
    })
  })

  // GET /admin/subscriptions/metrics — MRR, conversion, events
  app.get('/subscriptions/metrics', async (_req, reply) => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [monthly, annual, cancelled, free, recentChanges] = await Promise.all([
      prisma.subscription.count({ where: { tier: 'PREMIUM_MONTHLY', status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { tier: 'PREMIUM_ANNUAL', status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { cancelledAt: { gte: startOfMonth } } }),
      prisma.subscription.count({ where: { tier: 'FREE' } }),
      prisma.subscription.findMany({
        where: { updatedAt: { gte: last30 }, tier: { not: 'FREE' } },
        select: {
          tier: true, status: true, updatedAt: true, cancelledAt: true,
          user: { select: { email: true, profile: { select: { firstName: true } } } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
    ])

    const mrr = Math.round(monthly * 4.99 + annual * (34.99 / 12))
    const totalSubs = monthly + annual + free
    const conversionRate = totalSubs > 0 ? Math.round(((monthly + annual) / totalSubs) * 100 * 10) / 10 : 0

    const mrrTrend = await Promise.all(
      Array.from({ length: 6 }, async (_, i) => {
        const month = dayjs().subtract(5 - i, 'month')
        const [pm, pa] = await Promise.all([
          prisma.subscription.count({
            where: { tier: 'PREMIUM_MONTHLY', status: 'ACTIVE', createdAt: { lte: month.endOf('month').toDate() } },
          }),
          prisma.subscription.count({
            where: { tier: 'PREMIUM_ANNUAL', status: 'ACTIVE', createdAt: { lte: month.endOf('month').toDate() } },
          }),
        ])
        return { month: month.format('MMM'), mrr: Math.round(pm * 4.99 + pa * (34.99 / 12)) }
      })
    )

    return reply.send({ mrr, monthly, annual, free, cancelled, conversionRate, recentChanges, mrrTrend })
  })

  // POST /admin/notifications/inactive — send push to inactive users
  app.post('/notifications/inactive', async (req, reply) => {
    const body = z.object({
      title: z.string().min(1).max(100),
      message: z.string().min(1).max(300),
      inactiveDays: z.coerce.number().min(1).max(90).default(7),
    }).parse(req.body)

    const inactiveSince = new Date(Date.now() - body.inactiveDays * 24 * 60 * 60 * 1000)

    const devices = await prisma.userDevice.findMany({
      where: {
        isActive: true,
        fcmToken: { not: null },
        user: { deletedAt: null, OR: [{ lastLoginAt: { lt: inactiveSince } }, { lastLoginAt: null }] },
      },
      select: { fcmToken: true },
    })

    const { default: firebaseAdmin } = await import('@/config/firebase')
    const messaging = firebaseAdmin.messaging()
    const tokens = devices.map((d) => d.fcmToken!).filter(Boolean)
    if (!tokens.length) return reply.send({ sent: 0, failed: 0, total: 0 })

    const chunks: string[][] = []
    for (let i = 0; i < tokens.length; i += 500) chunks.push(tokens.slice(i, i + 500))

    let sent = 0; let failed = 0
    for (const chunk of chunks) {
      try {
        const result = await messaging.sendEachForMulticast({
          tokens: chunk,
          notification: { title: body.title, body: body.message },
          data: { type: 'reengagement' },
          android: { priority: 'high', notification: { channelId: 'lunara_notifications', color: '#8b5cf6' } },
        })
        sent += result.successCount; failed += result.failureCount
      } catch { failed += chunk.length }
    }

    return reply.send({ sent, failed, total: tokens.length })
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

    // Fire-and-forget push broadcast when publishing
    if (article.isPublished) {
      notifService.broadcastArticleNotification(article).catch((e) =>
        console.error('broadcast failed:', e)
      )
    }

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

    const before = await prisma.article.findUnique({ where: { id }, select: { isPublished: true } })
    const article = await prisma.article.update({ where: { id }, data: body })

    // Broadcast only when transitioning from draft → published
    if (!before?.isPublished && article.isPublished) {
      notifService.broadcastArticleNotification(article).catch((e) =>
        console.error('broadcast failed:', e)
      )
    }

    return reply.send(article)
  })

  // DELETE /admin/articles/:id
  app.delete('/articles/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await prisma.article.delete({ where: { id } })
    return reply.status(204).send()
  })
}
