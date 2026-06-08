import { execSync } from 'child_process'

export default async function globalSetup() {
  // Run Prisma migrations on test database
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
  execSync('npx prisma migrate deploy', { stdio: 'inherit' })
}
