import Fastify from 'fastify'
import { registerPlugins } from '../plugins'
import { registerRoutes } from '../modules'

export async function build() {
  const app = Fastify({ logger: false })
  await registerPlugins(app)
  await registerRoutes(app)
  await app.ready()
  return app
}

export async function createTestUser(
  app: Awaited<ReturnType<typeof build>>,
  email: string,
  password = 'TestPass123!'
): Promise<{ accessToken: string; user: { id: string; email: string } }> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password, firstName: 'TestUser', acceptTerms: true },
  })

  if (res.statusCode !== 201) {
    throw new Error(`Failed to create test user: ${res.body}`)
  }

  return JSON.parse(res.body)
}
