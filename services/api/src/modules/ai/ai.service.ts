import { prisma } from '@/config/database'
import { env } from '@/config/env'

export class AiService {
  async chat(
    userId: string,
    messages: Array<{ role: string; content: string }>,
    cycleContext?: Record<string, unknown>,
    isPremium = false
  ) {
    if (!env.AI_SERVICE_URL) {
      return {
        content: 'El servicio de IA no está configurado aún. Estará disponible próximamente.',
        remainingToday: isPremium ? null : 5,
      }
    }

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.AI_SERVICE_API_KEY || '',
        },
        body: JSON.stringify({ messages, userId, isPremium, cycleContext }),
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw { statusCode: response.status, message: err.detail || 'Error del servicio IA' }
      }

      return response.json()
    } catch (err: any) {
      if (err?.statusCode) throw err
      return {
        content: 'El servicio de IA no está disponible en este momento. Tu app seguirá funcionando con respuestas locales.',
        remainingToday: isPremium ? null : 5,
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
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    })
  }

  async analyzePatterns(userId: string) {
    const cycles = await prisma.menstrualCycle.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
      take: 12,
      include: { bleedingDays: true },
    })

    if (!env.AI_SERVICE_URL) return { insights: [], available: false }

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/chat/analyze-patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.AI_SERVICE_API_KEY || '',
        },
        body: JSON.stringify({ userId, cycles }),
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) throw { statusCode: 502, message: 'Error analizando patrones' }
      return response.json()
    } catch (err: any) {
      if (err?.statusCode) throw err
      return { insights: [], available: false }
    }
  }

  async generateMonthlyInsight(userId: string, year: number, month: number) {
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

    const monthlyData = {
      cycles,
      symptomLogs: symptoms,
      dominantMood: this.getDominantMood(moods.map((m) => m.mood)),
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      year,
      month,
    }

    if (!env.AI_SERVICE_URL) return { insight: null, available: false }

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/chat/monthly-insight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.AI_SERVICE_API_KEY || '',
        },
        body: JSON.stringify(monthlyData),
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) throw { statusCode: 502, message: 'Error generando insight' }
      return response.json()
    } catch (err: any) {
      if (err?.statusCode) throw err
      return { insight: null, available: false }
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
