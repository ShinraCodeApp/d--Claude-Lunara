import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate, requirePremium } from '@/middleware/auth.middleware'
import { AiService } from './ai.service'

const aiService = new AiService()

export async function aiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // POST /ai/chat — send message to Luna AI
  app.post('/chat', async (req, reply) => {
    const body = z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      })).max(20),
      cycleContext: z.record(z.any()).optional().nullable(),
    }).parse(req.body)

    const isPremium = req.currentUser.subscription?.tier !== 'FREE'
    const result = await aiService.chat(req.currentUser.id, body.messages, body.cycleContext, isPremium)

    // Save to chat history (non-blocking — don't fail the response if DB write fails)
    aiService.saveChatMessage(req.currentUser.id, body.messages, result.content).catch(() => {})

    return reply.send(result)
  })

  // GET /ai/chats — chat history
  app.get('/chats', async (req, reply) => {
    const result = await aiService.getChatHistory(req.currentUser.id)
    return reply.send(result)
  })

  // GET /ai/chats/:id — specific chat
  app.get('/chats/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const chat = await aiService.getChat(req.currentUser.id, id)
    if (!chat) return reply.status(404).send({ error: 'Chat no encontrado' })
    return reply.send(chat)
  })

  // POST /ai/analyze — cycle pattern analysis (PREMIUM)
  app.post('/analyze', { preHandler: [requirePremium] }, async (req, reply) => {
    const result = await aiService.analyzePatterns(req.currentUser.id)
    return reply.send(result)
  })

  // POST /ai/monthly-insight — monthly AI insight (PREMIUM)
  app.post('/monthly-insight', { preHandler: [requirePremium] }, async (req, reply) => {
    const body = z.object({
      year: z.number(),
      month: z.number().min(1).max(12),
    }).parse(req.body)

    const result = await aiService.generateMonthlyInsight(req.currentUser.id, body.year, body.month)
    return reply.send(result)
  })
}
