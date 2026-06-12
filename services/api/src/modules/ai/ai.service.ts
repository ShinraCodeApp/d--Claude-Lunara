import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '@/config/database'
import { redis, REDIS_KEYS } from '@/config/redis'
import { env } from '@/config/env'

const RATE_LIMIT_FREE = 20
const RATE_LIMIT_PREMIUM = 200

const LUNA_SYSTEM_PROMPT = `Eres Luna 🌙, la asistente de salud femenina de Lunara. Eres empática, cálida y científicamente precisa.

Tu rol:
- Ayudar a las usuarias a entender su ciclo menstrual, síntomas, fertilidad y bienestar hormonal
- Responder preguntas sobre salud reproductiva, PMS, ovulación, anticoncepción, menopausia y más
- Personalizar tus respuestas según el contexto del ciclo cuando esté disponible
- Hablar siempre en español, con un tono cercano, profesional y libre de juicios
- Usar emojis con moderación para hacer la conversación más cálida

Restricciones importantes:
- Nunca diagnostiques enfermedades ni prescribas medicamentos específicos
- Recomienda consultar con un médico ante síntomas preocupantes o persistentes
- Sé honesta cuando no tengas certeza sobre algo
- Respuestas concisas y claras (2-4 párrafos máximo)
- No inventes estadísticas ni información médica`

export class AiService {
  private genAI: GoogleGenerativeAI | null = null

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)
    }
  }

  async chat(
    userId: string,
    messages: Array<{ role: string; content: string }>,
    cycleContext?: Record<string, unknown>,
    isPremium = false
  ) {
    if (!this.genAI) {
      return {
        content: 'El servicio de IA Luna no está disponible en este momento. Por favor intenta más tarde. 🌙',
        remainingToday: isPremium ? RATE_LIMIT_PREMIUM : RATE_LIMIT_FREE,
      }
    }

    // Rate limiting per user per day
    const today = new Date().toISOString().split('T')[0]
    const rateKey = `${REDIS_KEYS.rateLimitAi(userId)}:${today}`
    const count = await redis.incr(rateKey)
    if (count === 1) await redis.expire(rateKey, 86400)

    const limit = isPremium ? RATE_LIMIT_PREMIUM : RATE_LIMIT_FREE
    if (count > limit) {
      throw { statusCode: 429, message: 'Límite de mensajes diarios alcanzado' }
    }

    // System prompt with optional cycle context
    let systemPrompt = LUNA_SYSTEM_PROMPT
    if (cycleContext?.user_context) {
      systemPrompt += `\n\nContexto actual de la usuaria: ${cycleContext.user_context}`
    }

    const lastMessage = messages[messages.length - 1]?.content ?? ''

    // Gemini uses 'user'/'model' roles and history must start with 'user'
    const rawHistory = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
    const firstUserIdx = rawHistory.findIndex((m) => m.role === 'user')
    const history = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : []

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
    })

    try {
      const chat = model.startChat({
        history,
        generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
      })

      const result = await chat.sendMessage(lastMessage)
      const content = result.response.text() || 'Lo siento, no pude procesar tu mensaje. Intenta de nuevo.'

      return {
        content,
        remainingToday: isPremium ? null : Math.max(0, limit - count),
      }
    } catch (err: any) {
      console.error('Gemini error:', err?.message ?? err)
      return {
        content: 'Lo siento, hubo un problema al procesar tu mensaje. Por favor intenta de nuevo. 🌙',
        remainingToday: isPremium ? null : Math.max(0, limit - count),
      }
    }
  }

  async saveChatMessage(
    userId: string,
    messages: Array<{ role: string; content: string }>,
    assistantContent: string
  ) {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUserMessage) return

    const chat = await prisma.aiChat.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })

    const chatId = chat?.id ?? (
      await prisma.aiChat.create({
        data: { userId, title: lastUserMessage.content.slice(0, 50) },
      })
    ).id

    await prisma.$transaction([
      prisma.aiMessage.create({
        data: { chatId, role: 'user', content: lastUserMessage.content },
      }),
      prisma.aiMessage.create({
        data: { chatId, role: 'assistant', content: assistantContent },
      }),
      prisma.aiChat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      }),
    ])
  }

  async getChatHistory(userId: string) {
    return prisma.aiChat.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    })
  }

  async getChat(userId: string, chatId: string) {
    return prisma.aiChat.findUnique({
      where: { id: chatId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, take: 50 },
      },
    })
  }

  async analyzePatterns(userId: string) {
    if (!this.genAI) return { insights: [], available: false }

    const cycles = await prisma.menstrualCycle.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
      take: 12,
    })

    if (cycles.length < 2) return { insights: [], available: true }

    const avgLength =
      cycles.slice(0, -1).reduce((sum, c, i) => {
        const diff = Math.round(
          (new Date(c.startDate).getTime() - new Date(cycles[i + 1].startDate).getTime()) / 86400000
        )
        return sum + diff
      }, 0) / (cycles.length - 1)

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = `Analiza estos datos del ciclo menstrual y da 3 insights cortos en español (una oración cada uno). Responde SOLO como JSON: {"insights": ["...", "...", "..."]}
Datos: ${cycles.length} ciclos, duración promedio ${Math.round(avgLength)} días.`

    try {
      const result = await model.generateContent(prompt)
      const raw = result.response.text()
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        return { insights: parsed.insights ?? [], available: true }
      }
      return { insights: [], available: true }
    } catch {
      return { insights: [], available: true }
    }
  }

  async generateMonthlyInsight(userId: string, year: number, month: number) {
    if (!this.genAI) return { insight: null, available: false }

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const [cycles, symptoms, moods, streak] = await Promise.all([
      prisma.menstrualCycle.findMany({ where: { userId, startDate: { gte: startDate, lte: endDate } } }),
      prisma.symptomLog.count({ where: { userId, date: { gte: startDate, lte: endDate } } }),
      prisma.moodLog.findMany({ where: { userId, date: { gte: startDate, lte: endDate } }, select: { mood: true } }),
      prisma.userStreak.findUnique({ where: { userId } }),
    ])

    const dominantMood = this.getDominantMood(moods.map((m) => m.mood))
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = `Genera un insight mensual de salud femenina en español. Sé alentadora y específica. Máximo 3 oraciones.
Datos: ${year}-${month}, ${cycles.length} ciclos, ${symptoms} registros de síntomas, ánimo predominante: ${dominantMood ?? 'no registrado'}, racha: ${streak?.currentStreak ?? 0} días.`

    try {
      const result = await model.generateContent(prompt)
      return { insight: result.response.text(), available: true }
    } catch {
      return { insight: null, available: true }
    }
  }

  private getDominantMood(moods: string[]): string | null {
    if (!moods.length) return null
    const freq = moods.reduce((acc: Record<string, number>, m) => {
      acc[m] = (acc[m] || 0) + 1
      return acc
    }, {})
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  }
}
