import { FastifyInstance } from 'fastify'
import { authRoutes } from './auth/auth.routes'
import { cycleRoutes } from './cycles/cycle.routes'
import { symptomRoutes } from './symptoms/symptom.routes'
import { predictionRoutes } from './predictions/prediction.routes'
import { gardenRoutes } from './garden/garden.routes'
import { aiRoutes } from './ai/ai.routes'
import { wellnessRoutes } from './wellness/wellness.routes'
import { notificationRoutes } from './notifications/notification.routes'
import { subscriptionRoutes } from './subscriptions/subscription.routes'
import { adminRoutes } from './admin/admin.routes'
import { userRoutes } from './users/user.routes'
import { reportsRoutes } from './reports/reports.routes'
import { pregnancyRoutes } from './pregnancy/pregnancy.routes'
import { partnerRoutes } from './partner/partner.routes'

const API_PREFIX = '/api/v1'

export async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes, { prefix: `${API_PREFIX}/auth` })
  await app.register(userRoutes, { prefix: `${API_PREFIX}/users` })
  await app.register(cycleRoutes, { prefix: `${API_PREFIX}/cycles` })
  await app.register(symptomRoutes, { prefix: `${API_PREFIX}/symptoms` })
  await app.register(predictionRoutes, { prefix: `${API_PREFIX}/predictions` })
  await app.register(gardenRoutes, { prefix: `${API_PREFIX}/garden` })
  await app.register(aiRoutes, { prefix: `${API_PREFIX}/ai` })
  await app.register(wellnessRoutes, { prefix: `${API_PREFIX}/wellness` })
  await app.register(notificationRoutes, { prefix: `${API_PREFIX}/notifications` })
  await app.register(subscriptionRoutes, { prefix: `${API_PREFIX}/subscriptions` })
  await app.register(reportsRoutes, { prefix: `${API_PREFIX}/reports` })
  await app.register(pregnancyRoutes, { prefix: `${API_PREFIX}/pregnancy` })
  await app.register(partnerRoutes, { prefix: `${API_PREFIX}/partner` })
  await app.register(adminRoutes, { prefix: `${API_PREFIX}/admin` })
}
