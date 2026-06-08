import { build } from '../test-utils/server'
import { prisma } from '../config/database'

describe('Auth routes', () => {
  let app: Awaited<ReturnType<typeof build>>

  beforeAll(async () => {
    app = await build()
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  afterEach(async () => {
    await prisma.refreshToken.deleteMany()
    await prisma.user.deleteMany({ where: { email: { contains: '@test.lunara' } } })
  })

  describe('POST /api/v1/auth/register', () => {
    it('creates a new user and returns access token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `user_${Date.now()}@test.lunara`,
          password: 'TestPass123!',
          firstName: 'TestUser',
          acceptTerms: true,
        },
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.accessToken).toBeDefined()
      expect(body.user.email).toContain('@test.lunara')
      expect(body.isNewUser).toBe(true)
    })

    it('rejects duplicate email', async () => {
      const email = `dup_${Date.now()}@test.lunara`
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, password: 'TestPass123!', acceptTerms: true },
      })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, password: 'AnotherPass1!', acceptTerms: true },
      })

      expect(res.statusCode).toBe(409)
    })

    it('rejects weak password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: `weak_${Date.now()}@test.lunara`, password: '123', acceptTerms: true },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('POST /api/v1/auth/login', () => {
    it('returns access token for valid credentials', async () => {
      const email = `login_${Date.now()}@test.lunara`
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, password: 'TestPass123!', acceptTerms: true },
      })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'TestPass123!' },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.accessToken).toBeDefined()
      expect(body.user.email).toBe(email)
    })

    it('rejects wrong password', async () => {
      const email = `wrongpw_${Date.now()}@test.lunara`
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, password: 'TestPass123!', acceptTerms: true },
      })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'WrongPassword!' },
      })

      expect(res.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/auth/me', () => {
    it('returns current user when authenticated', async () => {
      const email = `me_${Date.now()}@test.lunara`
      const registerRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, password: 'TestPass123!', acceptTerms: true },
      })
      const { accessToken } = JSON.parse(registerRes.body)

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.email).toBe(email)
    })

    it('returns 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/auth/me' })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('POST /api/v1/auth/logout', () => {
    it('invalidates session', async () => {
      const email = `logout_${Date.now()}@test.lunara`
      const registerRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, password: 'TestPass123!', acceptTerms: true },
      })
      const { accessToken } = JSON.parse(registerRes.body)

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(res.statusCode).toBe(200)
    })
  })
})
