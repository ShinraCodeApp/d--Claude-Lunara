import { FastifyRequest } from 'fastify'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { prisma } from '@/config/database'
import { redis, REDIS_KEYS } from '@/config/redis'
import { env } from '@/config/env'
import {
  hashPassword,
  comparePassword,
  generateSecureToken,
  generateOTP,
} from '@/utils/crypto'
import { GardenService } from '../garden/garden.service'

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID)
const gardenService = new GardenService()

type RegisterInput = {
  email: string
  password: string
  username?: string
  firstName?: string
  lastName?: string
  acceptTerms: true
}

type LoginInput = {
  email: string    // accepts email or username
  password: string
}

export class AuthService {
  async register(data: RegisterInput) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email.toLowerCase() },
          ...(data.username ? [{ username: data.username.toLowerCase() }] : []),
        ],
      },
    })
    if (existing) {
      if (existing.email === data.email.toLowerCase()) throw { statusCode: 409, message: 'El correo ya está registrado' }
      throw { statusCode: 409, message: 'El nombre de usuario ya está en uso' }
    }

    const passwordHash = await hashPassword(data.password)

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          username: data.username?.toLowerCase() || undefined,
          passwordHash,
          profile: {
            create: {
              firstName: data.firstName,
              lastName: data.lastName,
            },
          },
          subscription: { create: { tier: 'FREE', status: 'ACTIVE' } },
          notifSettings: { create: {} },
          streaks: { create: {} },
        },
        include: { profile: true, subscription: true },
      })

      // Initialize Lunar Garden
      await gardenService.initializeGarden(tx, newUser.id)

      return newUser
    })

    const tokens = await this.generateTokenPair(user.id)

    // Fire-and-forget welcome email
    import('@/utils/email').then(({ sendWelcomeEmail }) =>
      sendWelcomeEmail(user.email, data.firstName).catch(() => null)
    )

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user),
      isNewUser: true,
    }
  }

  async login(data: LoginInput, req: FastifyRequest) {
    const identifier = data.email.toLowerCase().trim()
    const isEmail = identifier.includes('@')
    const user = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        ...(isEmail ? { email: identifier } : { username: identifier }),
      },
      include: { subscription: true, profile: true },
    })

    if (!user || !user.passwordHash) {
      throw { statusCode: 401, message: 'Credenciales incorrectas' }
    }

    const isValid = await comparePassword(data.password, user.passwordHash)
    if (!isValid) {
      throw { statusCode: 401, message: 'Credenciales incorrectas' }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const tokens = await this.generateTokenPair(user.id, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    })

    return { ...tokens, user: this.sanitizeUser(user) }
  }

  async refreshToken(token: string) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { subscription: true } } },
    })

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      // Potential token reuse attack — revoke entire family
      if (stored) {
        await prisma.refreshToken.updateMany({
          where: { family: stored.family },
          data: { revokedAt: new Date() },
        })
      }
      throw { statusCode: 401, message: 'Refresh token inválido' }
    }

    // Rotate token
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    const tokens = await this.generateTokenPair(stored.userId, {}, stored.family)
    return tokens
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken, userId },
        data: { revokedAt: new Date() },
      })
    }
  }

  async googleSignIn(idToken: string, req: FastifyRequest) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()
    if (!payload?.email) {
      throw { statusCode: 400, message: 'Token de Google inválido' }
    }

    return this.findOrCreateOAuthUser('google', payload.sub, payload.email, {
      firstName: payload.given_name,
      lastName: payload.family_name,
      avatarUrl: payload.picture,
    }, req)
  }

  async appleSignIn(data: {
    identityToken: string
    fullName?: { givenName?: string; familyName?: string }
  }, req: FastifyRequest) {
    // Verify Apple JWT (simplified — use apple-signin-auth library in production)
    const decoded = JSON.parse(
      Buffer.from(data.identityToken.split('.')[1], 'base64url').toString()
    )

    if (!decoded.email || !decoded.sub) {
      throw { statusCode: 400, message: 'Token de Apple inválido' }
    }

    return this.findOrCreateOAuthUser('apple', decoded.sub, decoded.email, {
      firstName: data.fullName?.givenName,
      lastName: data.fullName?.familyName,
    }, req)
  }

  private async findOrCreateOAuthUser(
    provider: string,
    providerUserId: string,
    email: string,
    profile: { firstName?: string; lastName?: string; avatarUrl?: string },
    req: FastifyRequest
  ) {
    let isNewUser = false

    let oauthAccount = await prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      include: { user: { include: { subscription: true, profile: true } } },
    })

    if (!oauthAccount) {
      // Check if email already exists
      let user = await prisma.user.findUnique({
        where: { email: email.toLowerCase(), deletedAt: null },
        include: { subscription: true, profile: true },
      })

      if (!user) {
        isNewUser = true
        user = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email: email.toLowerCase(),
              emailVerified: true,
              profile: { create: { ...profile } },
              subscription: { create: { tier: 'FREE', status: 'ACTIVE' } },
              notifSettings: { create: {} },
              streaks: { create: {} },
            },
            include: { profile: true, subscription: true },
          })
          await gardenService.initializeGarden(tx, newUser.id)
          return newUser
        })
      }

      oauthAccount = await prisma.oAuthAccount.create({
        data: { userId: user.id, provider, providerUserId },
        include: { user: { include: { subscription: true, profile: true } } },
      })
    }

    const tokens = await this.generateTokenPair(oauthAccount.userId, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    })

    return { ...tokens, user: this.sanitizeUser(oauthAccount.user), isNewUser }
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase(), deletedAt: null },
    })
    if (!user) return // Silent fail

    const token = generateSecureToken(32)
    await redis.setex(REDIS_KEYS.passwordReset(token), 3600, user.id) // 1 hour

    const { sendPasswordResetEmail } = await import('@/utils/email')
    const adminUrl = process.env.ADMIN_URL || 'http://localhost:3001'
    const resetLink = `${adminUrl}/reset-password?token=${token}`
    await sendPasswordResetEmail(user.email, resetLink)
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await redis.get(REDIS_KEYS.passwordReset(token))
    if (!userId) {
      throw { statusCode: 400, message: 'Token inválido o expirado' }
    }

    const passwordHash = await hashPassword(newPassword)
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } })

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })

    await redis.del(REDIS_KEYS.passwordReset(token))
  }

  private async generateTokenPair(
    userId: string,
    meta: { userAgent?: string; ipAddress?: string } = {},
    existingFamily?: string
  ) {
    const family = existingFamily || generateSecureToken(16)
    const jti = generateSecureToken(16)

    // Access token (JWT)
    const accessToken = await this.signToken(userId, jti)

    // Refresh token (opaque)
    const refreshToken = generateSecureToken(40)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        family,
        expiresAt,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    })

    return { accessToken, refreshToken }
  }

  private signToken(userId: string, jti: string): string {
    return jwt.sign(
      { sub: userId, jti },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'] }
    )
  }

  sanitizeUser(user: {
    id: string
    email: string
    emailVerified: boolean
    role: string
    createdAt: Date
    profile?: { firstName?: string | null; lastName?: string | null; avatarUrl?: string | null; onboardingCompleted: boolean } | null
    subscription?: { tier: string; status: string; currentPeriodEnd?: Date | null } | null
  }) {
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      createdAt: user.createdAt,
      profile: user.profile ? {
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        avatarUrl: user.profile.avatarUrl,
        onboardingCompleted: user.profile.onboardingCompleted,
      } : null,
      subscription: user.subscription ? {
        tier: user.subscription.tier,
        status: user.subscription.status,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
        isPremium: ['PREMIUM_MONTHLY', 'PREMIUM_ANNUAL'].includes(user.subscription.tier),
      } : null,
    }
  }
}
