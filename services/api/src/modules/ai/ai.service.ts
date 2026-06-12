import OpenAI from 'openai'
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
- No inventes estadísticas ni información médica - cita cuando sea apropiado

Cuando tengas contexto del ciclo de la usuaria, úsalo para personalizar y hacer más relevante tu respuesta.`

export class AiService {
  private openai: OpenAI | null = null

  constructor() {
    if (env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
    }
  }

  async chat(
    userId: string,
    messages: Array<{ role: string; content: string }>,
    cycleContext?: Record<string, unknown>,
    isPremium = false
  ) {
    if (!this.openai) {
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

    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      max_tokens: 600,
      temperature: 0.7,
    })

    const content =
      completion.choices[0]?.message?.content ??
      'Lo siento, no pude procesar tu mensaje. Por favor intenta de nuevo.'

    return {
      content,
      remainingToday: isPremium ? null : Math.max(0, limit - count),
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
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    })
  }

  async analyzePatterns(userId: string) {
    if (!this.openai) return { insights: [], available: false }

    const cycles = await prisma.menstrualCycle.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
      take: 12,
      include: { bleedingDays: true },
    })

    if (cycles.length < 2) return { insights: [], available: true }

    const avgLength =
      cycles.slice(0, -1).reduce((sum, c, i) => {
        const next = cycles[i + 1]
        const diff = Math.round(
          (new Date(c.startDate).getTime() - new Date(next.startDate).getTime()) / 86400000
        )
        return sum + diff
      }, 0) / (cycles.length - 1)

    const prompt = `Analiza estos datos del ciclo menstrual y proporciona 3 insights personalizados en español. Sé concisa y práctica.
Ciclos recientes: ${cycles.length} ciclos registrados.
Duración promedio del ciclo: ${Math.round(avgLength)} días.
Responde SOLO con un JSON array de strings, ejemplo: ["Insight 1", "Insight 2", "Insight 3"]`

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.5,
        response_format: { type: 'json_object' },
      })

      const raw = completion.choices[0]?.message?.content ?? '{}'
      const parsed = JSON.parse(raw)
      const insights: string[] = Array.isArray(parsed.insights) ? parsed.insights : []
      return { insights, available: true }
    } catch {
      return { insights: [], available: true }
    }
  }

  async generateMonthlyInsight(userId: string, year: number, month: number) {
    if (!this.openai) return { insight: null, available: false }

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const [cycles, symptoms, moods, streak] = await Promise.all([
      prisma.menstrualCycle.findMany({
        where: { userId, startDate: { gte: startDate, lte: endDate } },
      }),
      prisma.symptomLog.count({ where: { userId, date: { gte: startDate, lte: endDate } } }),
      prisma.moodLog.findMany({
        where: { userId, date: { gte: startDate, lte: endDate } },
        select: { mood: true },
      }),
      prisma.userStreak.findUnique({ where: { userId } }),
    ])

    const dominantMood = this.getDominantMood(moods.map((m) => m.mood))
    const prompt = `Genera un insight mensual de salud femenina en español para una usuaria con los siguientes datos:
- Mes: ${year}-${month}
- Ciclos registrados: ${cycles.length}
- Registros de síntomas: ${symptoms}
- Estado de ánimo predominante: ${dominantMood ?? 'no registrado'}
- Racha actual: ${streak?.currentStreak ?? 0} días
Sé alentadora, específica y útil. Máximo 3 oraciones.`

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      })
      const insight = completion.choices[0]?.message?.content ?? null
      return { insight, available: true }
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
