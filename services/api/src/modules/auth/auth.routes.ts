import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware'
import { AuthService } from './auth.service'

const authService = new AuthService()

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post('/register', {
    schema: {
      tags: ['auth'],
      summary: 'Registro de nueva usuaria',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          acceptTerms: { type: 'boolean' },
        },
      },
    },
  }, async (req, reply) => {
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(8).max(128),
      firstName: z.string().max(50).optional(),
      lastName: z.string().max(50).optional(),
      acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar los términos de servicio' }) }),
    }).parse(req.body)

    const result = await authService.register(body)
    return reply.status(201).send({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
      isNewUser: result.isNewUser,
    })
  })

  // POST /auth/login
  app.post('/login', {
    schema: {
      tags: ['auth'],
      summary: 'Iniciar sesión',
    },
    config: { rateLimit: { max: 10, timeWindow: '15m' } },
  }, async (req, reply) => {
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }).parse(req.body)

    const result = await authService.login(body, req)

    reply.setCookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 30 * 24 * 60 * 60,
    })

    return reply.send({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    })
  })

  // POST /auth/refresh
  app.post('/refresh', async (req, reply) => {
    const refreshToken = req.cookies.refreshToken || (req.body as { refreshToken?: string })?.refreshToken
    if (!refreshToken) {
      return reply.status(401).send({ error: 'Refresh token requerido' })
    }

    const result = await authService.refreshToken(refreshToken)

    reply.setCookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 30 * 24 * 60 * 60,
    })

    return reply.send({ accessToken: result.accessToken })
  })

  // POST /auth/logout
  app.post('/logout', { preHandler: [authenticate] }, async (req, reply) => {
    const refreshToken = req.cookies.refreshToken
    await authService.logout(req.currentUser.id, refreshToken)

    reply.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' })
    return reply.send({ message: 'Sesión cerrada correctamente' })
  })

  // POST /auth/google
  app.post('/google', {
    schema: { tags: ['auth'], summary: 'Autenticación con Google' },
  }, async (req, reply) => {
    const body = z.object({
      idToken: z.string(),
    }).parse(req.body)

    const result = await authService.googleSignIn(body.idToken, req)

    reply.setCookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 30 * 24 * 60 * 60,
    })

    return reply.send({ accessToken: result.accessToken, user: result.user, isNewUser: result.isNewUser })
  })

  // POST /auth/apple
  app.post('/apple', {
    schema: { tags: ['auth'], summary: 'Autenticación con Apple Sign-In' },
  }, async (req, reply) => {
    const body = z.object({
      identityToken: z.string(),
      authorizationCode: z.string(),
      fullName: z.object({
        givenName: z.string().optional(),
        familyName: z.string().optional(),
      }).optional(),
    }).parse(req.body)

    const result = await authService.appleSignIn(body, req)

    reply.setCookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 30 * 24 * 60 * 60,
    })

    return reply.send({ accessToken: result.accessToken, user: result.user, isNewUser: result.isNewUser })
  })

  // POST /auth/forgot-password
  app.post('/forgot-password', {
    config: { rateLimit: { max: 5, timeWindow: '15m' } },
  }, async (req, reply) => {
    const body = z.object({ email: z.string().email() }).parse(req.body)
    await authService.forgotPassword(body.email)
    // Always return 200 to prevent email enumeration
    return reply.send({ message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña' })
  })

  // POST /auth/reset-password
  app.post('/reset-password', async (req, reply) => {
    const body = z.object({
      token: z.string(),
      password: z.string().min(8).max(128),
    }).parse(req.body)

    await authService.resetPassword(body.token, body.password)
    return reply.send({ message: 'Contraseña restablecida correctamente' })
  })

  // GET /auth/me
  app.get('/me', { preHandler: [authenticate] }, async (req, reply) => {
    return reply.send({ user: authService.sanitizeUser(req.currentUser) })
  })
}
