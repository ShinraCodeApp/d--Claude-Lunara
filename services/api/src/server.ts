import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import * as Sentry from '@sentry/node'
import { env } from '@/config/env'
import { registerPlugins } from '@/plugins'
import { registerRoutes } from '@/modules'
import { logger } from '@/config/logger'

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
})

const app = Fastify({
  logger: env.NODE_ENV === 'development' ? {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  } : logger,
  trustProxy: true,
  requestIdLogLabel: 'requestId',
  genReqId: () => crypto.randomUUID(),
}).withTypeProvider<TypeBoxTypeProvider>()

async function bootstrap() {
  try {
    await registerPlugins(app)
    await registerRoutes(app)

    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    app.log.info(`Lunara API running on port ${env.PORT} [${env.NODE_ENV}]`)
  } catch (err) {
    app.log.error(err)
    Sentry.captureException(err)
    process.exit(1)
  }
}

const signals = ['SIGTERM', 'SIGINT'] as const
signals.forEach((signal) => {
  process.on(signal, async () => {
    app.log.info(`Received ${signal}, shutting down gracefully...`)
    await app.close()
    process.exit(0)
  })
})

bootstrap()
