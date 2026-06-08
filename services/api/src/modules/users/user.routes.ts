import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware'
import { prisma } from '@/config/database'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '@/config/env'

const s3 = new S3Client({ region: env.AWS_REGION })

export async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET /users/profile
  app.get('/profile', async (req, reply) => {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: req.currentUser.id },
    })
    return reply.send(profile)
  })

  // PUT /users/profile
  app.put('/profile', async (req, reply) => {
    const body = z.object({
      firstName: z.string().max(50).optional(),
      lastName: z.string().max(50).optional(),
      dateOfBirth: z.string().optional(),
      locale: z.string().max(5).optional(),
      timezone: z.string().max(50).optional(),
      theme: z.enum(['light', 'dark', 'auto']).optional(),
      useMascot: z.boolean().optional(),
      averageCycleLength: z.number().min(21).max(45).optional(),
      averagePeriodLength: z.number().min(1).max(10).optional(),
      contraceptive: z.string().optional(),
    }).parse(req.body)

    const updated = await prisma.userProfile.update({
      where: { userId: req.currentUser.id },
      data: {
        ...body,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      },
    })

    return reply.send(updated)
  })

  // POST /users/avatar-upload-url — get S3 presigned URL for avatar
  app.post('/avatar-upload-url', async (req, reply) => {
    const key = `avatars/${req.currentUser.id}/${Date.now()}.jpg`
    const command = new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      ContentType: 'image/jpeg',
    })
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
    const publicUrl = `https://${env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`

    return reply.send({ uploadUrl, publicUrl, key })
  })

  // POST /users/complete-onboarding
  app.post('/complete-onboarding', async (req, reply) => {
    const body = z.object({
      lastPeriodDate: z.string().optional(),
      averageCycleLength: z.number().min(21).max(45).optional(),
      averagePeriodLength: z.number().min(1).max(10).optional(),
    }).parse(req.body)

    await prisma.userProfile.update({
      where: { userId: req.currentUser.id },
      data: {
        onboardingCompleted: true,
        lastPeriodDate: body.lastPeriodDate ? new Date(body.lastPeriodDate) : undefined,
        averageCycleLength: body.averageCycleLength,
        averagePeriodLength: body.averagePeriodLength,
      },
    })

    return reply.send({ message: 'Onboarding completado' })
  })

  // DELETE /users/account — GDPR right to be forgotten
  app.delete('/account', async (req, reply) => {
    const body = z.object({
      confirmation: z.literal('ELIMINAR MI CUENTA'),
      reason: z.string().max(200).optional(),
    }).parse(req.body)

    // Soft delete — hard delete scheduled after 30 days
    await prisma.user.update({
      where: { id: req.currentUser.id },
      data: { deletedAt: new Date() },
    })

    // TODO: Queue hard delete job after 30 days

    return reply.send({
      message: 'Tu cuenta ha sido marcada para eliminación. Se borrará permanentemente en 30 días.',
    })
  })

  // GET /users/data-export — GDPR data portability
  app.get('/data-export', async (req, reply) => {
    const userId = req.currentUser.id
    const [profile, cycles, symptoms, moods] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId } }),
      prisma.menstrualCycle.findMany({ where: { userId } }),
      prisma.symptomLog.findMany({ where: { userId }, include: { symptom: true } }),
      prisma.moodLog.findMany({ where: { userId } }),
    ])

    return reply.send({
      exportDate: new Date().toISOString(),
      user: { email: req.currentUser.email, profile },
      cycles,
      symptoms,
      moods,
      disclaimer: 'Exportación de datos conforme al Artículo 20 GDPR',
    })
  })
}
