import { prisma } from '@/config/database'
import admin from 'firebase-admin'
import { env } from '@/config/env'

// Initialize Firebase Admin
if (!admin.apps.length && env.FIREBASE_PROJECT_ID) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export class NotificationService {
  async registerDevice(userId: string, data: {
    fcmToken?: string
    apnsToken?: string
    platform: string
    appVersion?: string
  }) {
    await prisma.userDevice.upsert({
      where: { userId_platform: { userId, platform: data.platform } },
      update: {
        fcmToken: data.fcmToken,
        apnsToken: data.apnsToken,
        appVersion: data.appVersion,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        platform: data.platform,
        fcmToken: data.fcmToken,
        apnsToken: data.apnsToken,
        appVersion: data.appVersion,
        isActive: true,
      },
    })
  }

  async getSettings(userId: string) {
    return prisma.notificationSettings.findUnique({ where: { userId } })
  }

  async updateSettings(userId: string, data: Partial<{
    periodReminder: boolean
    periodReminderDays: number
    ovulationReminder: boolean
    dailyLogReminder: boolean
    dailyLogTime: string
    symptomReminder: boolean
    wellnessTips: boolean
    achievements: boolean
  }>) {
    return prisma.notificationSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    })
  }

  async getUserNotifications(userId: string, { unreadOnly, limit }: { unreadOnly: boolean; limit: number }) {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ])

    return { notifications, unreadCount }
  }

  async markAsRead(userId: string, notificationId: string) {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    })
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
  }

  async sendPushNotification(userId: string, notification: {
    title: string
    body: string
    data?: Record<string, string>
    type: string
  }) {
    const device = await prisma.userDevice.findFirst({
      where: { userId, isActive: true },
    })

    if (!device?.fcmToken) return

    try {
      await admin.messaging().send({
        token: device.fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data,
        android: {
          priority: 'high',
          notification: {
            channelId: 'lunara_notifications',
            color: '#8b5cf6',
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
      })

      // Save to DB
      await prisma.notification.create({
        data: {
          userId,
          type: notification.type as any,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sentAt: new Date(),
        },
      })
    } catch (err) {
      console.error('FCM send error:', err)
      // Mark token as inactive if invalid
      if ((err as any)?.code === 'messaging/invalid-registration-token') {
        await prisma.userDevice.update({
          where: { id: device.id },
          data: { isActive: false },
        })
      }
    }
  }

  async schedulePeriodReminders(userId: string) {
    const prediction = await prisma.cyclePrediction.findFirst({
      where: { userId, isActive: true },
    })
    if (!prediction) return

    const settings = await this.getSettings(userId)
    if (!settings?.periodReminder) return

    const reminderDate = new Date(prediction.predictedStartDate)
    reminderDate.setDate(reminderDate.getDate() - (settings.periodReminderDays || 2))

    await prisma.notification.create({
      data: {
        userId,
        type: 'PERIOD_REMINDER',
        title: 'Tu período se acerca 🌙',
        body: `Tu menstruación llega en ${settings.periodReminderDays || 2} días. ¡Prepárate!`,
        scheduledAt: reminderDate,
      },
    })
  }
}
