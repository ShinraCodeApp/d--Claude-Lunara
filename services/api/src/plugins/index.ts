import { FastifyInstance } from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifyMultipart from '@fastify/multipart'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { redis } from '@/config/redis'
import { env } from '@/config/env'

export async function registerPlugins(app: FastifyInstance) {
  // ─── Security headers ──────────────────────────────────────
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })

  // ─── CORS ──────────────────────────────────────────────────
  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      if (!origin || allowed.includes(origin)) {
        cb(null, true)
      } else {
        cb(new Error('Not allowed by CORS'), false)
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })

  // ─── Rate Limiting ─────────────────────────────────────────
  await app.register(fastifyRateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    redis,
    keyGenerator: (req) => {
      return req.headers['x-forwarded-for'] as string || req.ip
    },
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Has excedido el límite de solicitudes. Inténtalo de nuevo en un minuto.',
    }),
  })

  // ─── JWT ───────────────────────────────────────────────────
  await app.register(fastifyJwt, {
    secret: {
      private: env.JWT_ACCESS_SECRET,
      public: env.JWT_ACCESS_SECRET,
    },
    sign: { expiresIn: env.JWT_ACCESS_EXPIRES },
  })

  // ─── Cookies ───────────────────────────────────────────────
  await app.register(fastifyCookie, {
    secret: env.JWT_REFRESH_SECRET,
    hook: 'onRequest',
  })

  // ─── Multipart (file uploads) ──────────────────────────────
  await app.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  })

  // ─── OpenAPI / Swagger ─────────────────────────────────────
  if (env.NODE_ENV !== 'production') {
    await app.register(fastifySwagger, {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'Lunara API',
          description: 'Lunara by ShinraCode — Women Health Platform API',
          version: '1.0.0',
        },
        tags: [
          { name: 'auth', description: 'Authentication' },
          { name: 'cycles', description: 'Menstrual Cycle Tracking' },
          { name: 'predictions', description: 'AI Predictions' },
          { name: 'symptoms', description: 'Symptom Tracking' },
          { name: 'garden', description: 'Lunar Garden Gamification' },
          { name: 'ai', description: 'AI Health Assistant' },
          { name: 'wellness', description: 'Wellness Content' },
          { name: 'notifications', description: 'Push Notifications' },
          { name: 'subscriptions', description: 'Premium Subscriptions' },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
    })

    await app.register(fastifySwaggerUi, {
      routePrefix: '/docs',
      uiConfig: { docExpansion: 'list', deepLinking: false },
    })
  }

  // ─── Health check ──────────────────────────────────────────
  app.get('/health', { logLevel: 'silent' }, async () => ({
    status: 'ok',
    service: 'lunara-api',
    version: process.env.npm_package_version,
    timestamp: new Date().toISOString(),
  }))
}
