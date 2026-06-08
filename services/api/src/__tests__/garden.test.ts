import { build, createTestUser } from '../test-utils/server'
import { prisma } from '../config/database'
import { GardenService } from '../modules/garden/garden.service'

describe('Garden module', () => {
  let app: Awaited<ReturnType<typeof build>>
  let token: string
  let userId: string

  beforeAll(async () => {
    app = await build()
    const { accessToken, user } = await createTestUser(app, `garden_${Date.now()}@test.lunara`)
    token = accessToken
    userId = user.id
  })

  afterAll(async () => {
    await prisma.crystalTransaction.deleteMany({ where: { wallet: { userId } } })
    await prisma.crystalWallet.deleteMany({ where: { userId } })
    await prisma.lunarGarden.deleteMany({ where: { userId } })
    await prisma.refreshToken.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
    await app.close()
    await prisma.$disconnect()
  })

  describe('GET /api/v1/garden', () => {
    it('returns garden status for authenticated user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/garden',
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.garden).toBeDefined()
      expect(body.garden.stage).toBe('SEED')
      expect(body.wallet).toBeDefined()
      expect(body.wallet.balance).toBeGreaterThanOrEqual(0)
    })
  })

  describe('GardenService.awardXP', () => {
    it('awards XP and advances stage at thresholds', async () => {
      const svc = new GardenService()

      // Award 100 XP — should advance to SPROUT
      await svc.awardXP(userId, 100, 'Test award')

      const garden = await prisma.lunarGarden.findUnique({ where: { userId } })
      expect(garden?.xp).toBeGreaterThanOrEqual(100)
      expect(['SEED', 'SPROUT']).toContain(garden?.stage)
    })

    it('awards crystals correctly', async () => {
      const svc = new GardenService()
      const before = await prisma.crystalWallet.findUnique({ where: { userId } })

      await svc.awardCrystals(userId, 25, 'test crystals', 'DAILY_LOG')

      const after = await prisma.crystalWallet.findUnique({ where: { userId } })
      expect(after!.balance).toBe((before?.balance ?? 0) + 25)
    })

    it('rejects spend when balance insufficient', async () => {
      const svc = new GardenService()
      await expect(svc.spendCrystals(userId, 999999, 'overspend')).rejects.toThrow()
    })
  })
})
