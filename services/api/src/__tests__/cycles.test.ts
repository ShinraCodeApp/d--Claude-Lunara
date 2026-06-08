import { build, createTestUser } from '../test-utils/server'
import { prisma } from '../config/database'

describe('Cycle routes', () => {
  let app: Awaited<ReturnType<typeof build>>
  let token: string
  let userId: string

  beforeAll(async () => {
    app = await build()
    const { accessToken, user } = await createTestUser(app, `cycle_${Date.now()}@test.lunara`)
    token = accessToken
    userId = user.id
  })

  afterAll(async () => {
    await prisma.menstrualCycle.deleteMany({ where: { userId } })
    await prisma.refreshToken.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
    await app.close()
    await prisma.$disconnect()
  })

  let cycleId: string

  describe('POST /api/v1/cycles', () => {
    it('starts a new cycle', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/cycles',
        headers: { Authorization: `Bearer ${token}` },
        payload: { startDate: new Date().toISOString(), cycleLength: 28, periodLength: 5 },
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.id).toBeDefined()
      expect(body.userId).toBe(userId)
      cycleId = body.id
    })
  })

  describe('GET /api/v1/cycles/current', () => {
    it('returns the current open cycle', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/cycles/current',
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.id).toBe(cycleId)
      expect(body.endDate).toBeNull()
    })
  })

  describe('GET /api/v1/cycles', () => {
    it('lists all cycles for user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/cycles',
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(Array.isArray(body.cycles)).toBe(true)
      expect(body.cycles.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('PUT /api/v1/cycles/:id/end', () => {
    it('ends a cycle and recalculates predictions', async () => {
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 5)

      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/cycles/${cycleId}/end`,
        headers: { Authorization: `Bearer ${token}` },
        payload: { endDate: endDate.toISOString() },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.endDate).toBeDefined()
    })
  })

  describe('GET /api/v1/cycles/stats', () => {
    it('returns cycle statistics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/cycles/stats',
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body).toHaveProperty('averageLength')
      expect(body).toHaveProperty('regularity')
      expect(body).toHaveProperty('totalCycles')
    })
  })
})
