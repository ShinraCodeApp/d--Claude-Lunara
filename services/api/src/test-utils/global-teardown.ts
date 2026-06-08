import { PrismaClient } from '@prisma/client'

export default async function globalTeardown() {
  const prisma = new PrismaClient()
  // Clean up all test data (emails contain @test.lunara)
  await prisma.user.deleteMany({ where: { email: { contains: '@test.lunara' } } })
  await prisma.$disconnect()
}
