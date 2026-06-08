import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@/config/database'
import { redis, REDIS_KEYS } from '@/config/redis'

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
    const payload = req.user as { sub: string; jti: string }

    // Check token blacklist
    if (payload.jti) {
      const isBlacklisted = await redis.get(REDIS_KEYS.blacklistedToken(payload.jti))
      if (isBlacklisted) {
        return reply.status(401).send({ error: 'Token revocado' })
      }
    }

    // Load user
    const user = await prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      include: { subscription: true },
    })

    if (!user) {
      return reply.status(401).send({ error: 'Usuario no encontrado' })
    }

    req.currentUser = user
  } catch {
    return reply.status(401).send({ error: 'No autorizado' })
  }
}

export async function requirePremium(req: FastifyRequest, reply: FastifyReply) {
  const user = req.currentUser
  if (!user) {
    return reply.status(401).send({ error: 'No autorizado' })
  }

  const sub = user.subscription
  const isPremium =
    sub &&
    ['PREMIUM_MONTHLY', 'PREMIUM_ANNUAL'].includes(sub.tier) &&
    sub.status === 'ACTIVE'

  if (!isPremium) {
    return reply.status(403).send({
      error: 'Función premium requerida',
      code: 'PREMIUM_REQUIRED',
      upgradeUrl: '/premium',
    })
  }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const user = req.currentUser
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return reply.status(403).send({ error: 'Acceso denegado' })
  }
}

// Augment Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    currentUser: import('@prisma/client').User & {
      subscription: import('@prisma/client').Subscription | null
    }
  }
}
