import { Redis } from 'ioredis'
import { env } from './env'

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy: (times) => {
    if (times > 5) return null
    return Math.min(times * 200, 2000)
  },
})

redis.on('connect', () => console.log('Redis connected'))
redis.on('error', (err) => console.error('Redis error:', err))

export const REDIS_KEYS = {
  refreshToken: (family: string) => `rt:${family}`,
  blacklistedToken: (jti: string) => `bl:${jti}`,
  userSession: (userId: string) => `sess:${userId}`,
  cyclePrediction: (userId: string) => `pred:${userId}`,
  calendarData: (userId: string, year: number, month: number) => `cal:${userId}:${year}:${month}`,
  rateLimitAi: (userId: string) => `ai:rl:${userId}`,
  otpCode: (email: string) => `otp:${email}`,
  passwordReset: (token: string) => `pwr:${token}`,
} as const
