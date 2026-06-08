import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware'
import { prisma } from '@/config/database'

export async function wellnessRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET /wellness/content — wellness tips, meditations, etc.
  app.get('/content', async (req, reply) => {
    const query = z.object({
      type: z.enum(['tip', 'meditation', 'recipe', 'exercise']).optional(),
      isPremium: z.coerce.boolean().optional(),
    }).parse(req.query)

    const isPremium = req.currentUser.subscription?.tier !== 'FREE'

    const content = await prisma.wellnessContent.findMany({
      where: {
        isActive: true,
        ...(query.type && { type: query.type }),
        ...(!isPremium && { isPremium: false }),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 20,
    })

    return reply.send(content)
  })

  // POST /wellness/log — log wellness activity
  app.post('/log', async (req, reply) => {
    const body = z.object({
      contentId: z.string().uuid(),
      durationSec: z.number().optional(),
    }).parse(req.body)

    const log = await prisma.wellnessLog.create({
      data: {
        userId: req.currentUser.id,
        contentId: body.contentId,
        durationSec: body.durationSec,
      },
    })

    return reply.status(201).send(log)
  })

  // GET /wellness/energy-map — cycle energy map for current cycle
  app.get('/energy-map', async (req, reply) => {
    const prediction = await prisma.cyclePrediction.findFirst({
      where: { userId: req.currentUser.id, isActive: true },
    })

    if (!prediction) return reply.send({ message: 'Registra al menos un ciclo para ver el mapa de energía' })

    // Return phase-based energy/mood/concentration recommendations
    const energyMap = {
      menstrual: {
        energy: 2, mood: 2, concentration: 3, social: 2,
        tip: 'Descansa y sé compasiva contigo misma',
        activities: ['Yoga suave', 'Meditación', 'Lectura'],
        foods: ['Jengibre', 'Chocolate negro', 'Hierro'],
      },
      follicular: {
        energy: 4, mood: 4, concentration: 4, social: 4,
        tip: 'Gran momento para iniciar proyectos',
        activities: ['HIIT', 'Running', 'Socializar'],
        foods: ['Proteínas magras', 'Vegetales fermentados', 'Nueces'],
      },
      ovulatory: {
        energy: 5, mood: 5, concentration: 4, social: 5,
        tip: 'Tu pico de energía y carisma. ¡Aprovéchalo!',
        activities: ['Ejercicio intenso', 'Reuniones importantes', 'Presentaciones'],
        foods: ['Antioxidantes', 'Frutas rojas', 'Zinc'],
      },
      luteal: {
        energy: 3, mood: 2, concentration: 3, social: 2,
        tip: 'Prioriza el autocuidado y la higiene del sueño',
        activities: ['Pilates', 'Natación', 'Journaling'],
        foods: ['Magnesio', 'Calcio', 'Carbohidratos complejos'],
      },
    }

    return reply.send({ energyMap, prediction })
  })
}
