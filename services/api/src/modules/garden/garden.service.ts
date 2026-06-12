import { PrismaClient } from '@prisma/client'
import { prisma } from '@/config/database'

const XP_THRESHOLDS = {
  SEED: 0,
  SPROUT: 100,
  FLOWER: 300,
  LUNAR_GARDEN: 600,
}

export class GardenService {
  async initializeGarden(tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>, userId: string) {
    await tx.lunarGarden.create({
      data: {
        userId,
        stage: 'SEED',
        xp: 0,
        level: 1,
      },
    })

    await tx.crystalWallet.create({ data: { userId } })
  }

  async awardXP(userId: string, amount: number, reason: string): Promise<void> {
    const garden = await prisma.lunarGarden.findUnique({ where: { userId } })
    if (!garden) return

    const newXP = garden.xp + amount
    const newStage = this.calculateStage(newXP)
    const newLevel = Math.floor(newXP / 50) + 1
    const stageChanged = newStage !== garden.stage

    await prisma.lunarGarden.update({
      where: { userId },
      data: { xp: newXP, stage: newStage, level: newLevel },
    })

    if (stageChanged) {
      await this.unlockGardenStageAchievement(userId, newStage)
    }

    await this.checkAchievements(userId, reason)
  }

  private async unlockGardenStageAchievement(userId: string, stage: string): Promise<void> {
    const keyMap: Record<string, string> = {
      SPROUT: 'garden_sprout',
      FLOWER: 'garden_flower',
      LUNAR_GARDEN: 'garden_lunar',
    }
    const key = keyMap[stage]
    if (!key) return

    const achievement = await prisma.achievement.findUnique({ where: { key } })
    if (!achievement) return

    const already = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
    })
    if (already) return

    await prisma.userAchievement.create({ data: { userId, achievementId: achievement.id } })
    if (achievement.crystalReward > 0) {
      await this.awardCrystals(userId, achievement.crystalReward, 'ACHIEVEMENT', achievement.nameEs)
    }
    if (achievement.xpReward > 0) {
      await prisma.lunarGarden.update({
        where: { userId },
        data: { xp: { increment: achievement.xpReward } },
      })
    }
  }

  async awardCrystals(userId: string, amount: number, type: string, description: string): Promise<void> {
    const wallet = await prisma.crystalWallet.findUnique({ where: { userId } })
    if (!wallet) return

    await prisma.$transaction([
      prisma.crystalWallet.update({
        where: { userId },
        data: {
          balance: { increment: amount },
          totalEarned: { increment: amount },
        },
      }),
      prisma.crystalTransaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: type as any,
          description,
        },
      }),
    ])
  }

  async spendCrystals(userId: string, amount: number, description: string): Promise<boolean> {
    const wallet = await prisma.crystalWallet.findUnique({ where: { userId } })
    if (!wallet || wallet.balance < amount) return false

    await prisma.$transaction([
      prisma.crystalWallet.update({
        where: { userId },
        data: {
          balance: { decrement: amount },
          totalSpent: { increment: amount },
        },
      }),
      prisma.crystalTransaction.create({
        data: {
          walletId: wallet.id,
          amount: -amount,
          type: 'ACHIEVEMENT',
          description,
        },
      }),
    ])

    return true
  }

  async getGardenStatus(userId: string) {
    const [garden, wallet, streak, achievements] = await Promise.all([
      prisma.lunarGarden.findUnique({ where: { userId } }),
      prisma.crystalWallet.findUnique({ where: { userId } }),
      prisma.userStreak.findUnique({ where: { userId } }),
      prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true },
        orderBy: { unlockedAt: 'desc' },
        take: 10,
      }),
    ])

    const nextStageXP = this.getNextStageXP(garden?.xp ?? 0)

    return {
      garden,
      wallet: { balance: wallet?.balance ?? 0, totalEarned: wallet?.totalEarned ?? 0 },
      streak,
      recentAchievements: achievements,
      nextStageXP,
      progress: nextStageXP ? Math.round(((garden?.xp ?? 0) / nextStageXP) * 100) : 100,
    }
  }

  async updateDailyStreak(userId: string): Promise<{ isNewStreak: boolean; currentStreak: number }> {
    const streak = await prisma.userStreak.findUnique({ where: { userId } })
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (!streak) {
      await prisma.userStreak.create({
        data: { userId, currentStreak: 1, longestStreak: 1, lastLogDate: today },
      })
      return { isNewStreak: true, currentStreak: 1 }
    }

    const lastLog = streak.lastLogDate
    if (lastLog) {
      const lastLogDay = new Date(lastLog)
      lastLogDay.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((today.getTime() - lastLogDay.getTime()) / 86400000)

      if (diffDays === 0) return { isNewStreak: false, currentStreak: streak.currentStreak }

      if (diffDays === 1) {
        // Consecutive day
        const newStreak = streak.currentStreak + 1
        const longestStreak = Math.max(newStreak, streak.longestStreak)
        await prisma.userStreak.update({
          where: { userId },
          data: { currentStreak: newStreak, longestStreak, lastLogDate: today },
        })

        // Bonus XP for streaks
        if (newStreak % 7 === 0) {
          await this.awardXP(userId, 50, 'streak_7_days')
          await this.awardCrystals(userId, 10, 'STREAK_BONUS', `Racha de ${newStreak} días`)
        }

        return { isNewStreak: true, currentStreak: newStreak }
      } else {
        // Streak broken
        await prisma.userStreak.update({
          where: { userId },
          data: { currentStreak: 1, lastLogDate: today },
        })
        return { isNewStreak: true, currentStreak: 1 }
      }
    }

    await prisma.userStreak.update({
      where: { userId },
      data: { currentStreak: 1, longestStreak: 1, lastLogDate: today },
    })
    return { isNewStreak: true, currentStreak: 1 }
  }

  private calculateStage(xp: number): 'SEED' | 'SPROUT' | 'FLOWER' | 'LUNAR_GARDEN' {
    if (xp >= XP_THRESHOLDS.LUNAR_GARDEN) return 'LUNAR_GARDEN'
    if (xp >= XP_THRESHOLDS.FLOWER) return 'FLOWER'
    if (xp >= XP_THRESHOLDS.SPROUT) return 'SPROUT'
    return 'SEED'
  }

  private getNextStageXP(currentXP: number): number | null {
    if (currentXP < XP_THRESHOLDS.SPROUT) return XP_THRESHOLDS.SPROUT
    if (currentXP < XP_THRESHOLDS.FLOWER) return XP_THRESHOLDS.FLOWER
    if (currentXP < XP_THRESHOLDS.LUNAR_GARDEN) return XP_THRESHOLDS.LUNAR_GARDEN
    return null
  }

  private async checkAchievements(userId: string, reason: string): Promise<void> {
    // Achievement checking logic
    const achievements = await prisma.achievement.findMany({
      where: { isHidden: false },
    })

    for (const achievement of achievements) {
      const already = await prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId: achievement.id } },
      })
      if (already) continue

      const condition = achievement.condition as { type: string; threshold?: number }

      let unlocked = false
      if (condition.type === 'first_log' && reason === 'cycle_log') unlocked = true
      if (condition.type === 'streak_7' && reason === 'streak_7_days') unlocked = true

      if (unlocked) {
        await prisma.userAchievement.create({
          data: { userId, achievementId: achievement.id },
        })
        if (achievement.crystalReward > 0) {
          await this.awardCrystals(userId, achievement.crystalReward, 'ACHIEVEMENT', achievement.nameEs)
        }
      }
    }
  }
}
