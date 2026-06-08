import { PrismaClient } from '@prisma/client'
import { env } from './env'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
    errorFormat: 'pretty',
  })

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

prisma.$connect().catch((err) => {
  console.error('Failed to connect to database:', err)
  process.exit(1)
})
