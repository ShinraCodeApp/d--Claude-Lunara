/**
 * Crea o actualiza el usuario administrador de Lunara.
 * Uso: npx ts-node prisma/seed-admin.ts
 * En Railway:  railway run npx ts-node prisma/seed-admin.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_EMAIL    = 'yamilrueda88@gmail.com'
const ADMIN_PASSWORD = 'ShinraAdmin2026!'
const ADMIN_NAME     = 'Yamil'

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'ADMIN',
      emailVerified: true,
      profile: {
        create: { firstName: ADMIN_NAME, lastName: 'ShinraCode' },
      },
      subscription: { create: { tier: 'PREMIUM_ANNUAL', status: 'ACTIVE' } },
      notifSettings: { create: {} },
      streaks: { create: {} },
    },
    update: {
      role: 'ADMIN',
      passwordHash,
      emailVerified: true,
    },
    select: { id: true, email: true, role: true },
  })

  console.log('✅ Admin creado/actualizado:')
  console.log(`   Email:    ${user.email}`)
  console.log(`   Password: ${ADMIN_PASSWORD}`)
  console.log(`   Role:     ${user.role}`)
  console.log(`   ID:       ${user.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
