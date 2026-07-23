import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('30d'),

  // External Services
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  REVENUECAT_API_KEY: z.string().optional(),
  REVENUECAT_WEBHOOK_SECRET: z.string().optional(),

  // MercadoPago
  MP_ACCESS_TOKEN: z.string().optional(),
  MP_MONTHLY_PRICE: z.string().optional(),
  MP_ANNUAL_PRICE: z.string().optional(),
  MP_CURRENCY: z.string().default('ARS'),
  API_URL: z.string().optional(),

  // AWS
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().default('lunara-assets-dev'),

  // AI Service
  AI_SERVICE_URL: z.string().default('http://localhost:8000'),
  AI_SERVICE_API_KEY: z.string().optional(),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Security
  ENCRYPTION_KEY: z.string().min(32).optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),

  // Recovery
  SETUP_SECRET: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().optional(),

  // CORS
  FRONTEND_URL: z.string().default('http://localhost:3001'),
  ADMIN_URL: z.string().default('http://localhost:3001'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3001'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
