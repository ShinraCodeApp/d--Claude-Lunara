import { prisma } from '@/config/database'
import { generateSecureToken } from '@/utils/crypto'
import { redis, REDIS_KEYS } from '@/config/redis'
import dayjs from 'dayjs'

export class PartnerService {
  async createInvite(userId: string, partnerEmail: string) {
    const inviteCode = await generateSecureToken(16)
    const expiresAt = dayjs().add(48, 'hour').toDate()

    const link = await prisma.partnerLink.upsert({
      where: { userId },
      create: { userId, inviteCode, partnerEmail, expiresAt },
      update: { inviteCode, partnerEmail, expiresAt, partnerId: null, status: 'PENDING' },
    })

    // Cache invite code → userId for fast lookup on accept
    await redis.set(`partner:invite:${inviteCode}`, userId, 'EX', 48 * 3600)

    return link
  }

  async acceptInvite(acceptorId: string, inviteCode: string) {
    const inviterId = await redis.get(`partner:invite:${inviteCode}`)
    if (!inviterId) throw new Error('Código de invitación inválido o expirado')

    const inviterLink = await prisma.partnerLink.findFirst({
      where: { userId: inviterId, inviteCode, status: 'PENDING' },
    })
    if (!inviterLink) throw new Error('Invitación no encontrada')

    const acceptor = await prisma.user.findUniqueOrThrow({
      where: { id: acceptorId },
      select: { id: true, firstName: true, email: true },
    })

    await prisma.$transaction([
      prisma.partnerLink.update({
        where: { id: inviterLink.id },
        data: { partnerId: acceptorId, status: 'ACTIVE' },
      }),
      prisma.partnerLink.upsert({
        where: { userId: acceptorId },
        create: { userId: acceptorId, partnerId: inviterId, status: 'ACTIVE', inviteCode: '', partnerEmail: '' },
        update: { partnerId: inviterId, status: 'ACTIVE' },
      }),
    ])

    await redis.del(`partner:invite:${inviteCode}`)

    return { partnerId: inviterId, partnerName: acceptor.firstName ?? acceptor.email }
  }

  async getPartnerDashboard(userId: string) {
    const myLink = await prisma.partnerLink.findFirst({
      where: { userId, status: 'ACTIVE' },
    })
    if (!myLink?.partnerId) return null

    const partner = await prisma.user.findUnique({
      where: { id: myLink.partnerId },
      select: { id: true, firstName: true, email: true },
    })

    const currentCycle = await prisma.menstrualCycle.findFirst({
      where: { userId: myLink.partnerId, endDate: null },
      select: {
        id: true, startDate: true, predictedLength: true,
        predictions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    const prediction = currentCycle?.predictions[0]
    const dayOfCycle = currentCycle
      ? dayjs().diff(dayjs(currentCycle.startDate), 'day') + 1
      : null

    return {
      partner: { id: partner?.id, name: partner?.firstName ?? partner?.email },
      cycle: currentCycle
        ? {
            dayOfCycle,
            phase: this.getPhase(dayOfCycle ?? 1, prediction?.predictedLength ?? 28),
            nextPeriodDate: prediction?.nextPeriodDate,
            fertileWindowStart: prediction?.fertileWindowStart,
            fertileWindowEnd: prediction?.fertileWindowEnd,
          }
        : null,
    }
  }

  async getLinkStatus(userId: string) {
    const link = await prisma.partnerLink.findFirst({ where: { userId } })
    if (!link) return { status: 'NONE', inviteCode: null, partnerEmail: null }

    if (link.status === 'PENDING') {
      return { status: 'PENDING', inviteCode: link.inviteCode, partnerEmail: link.partnerEmail, expiresAt: link.expiresAt }
    }

    const partner = link.partnerId
      ? await prisma.user.findUnique({
          where: { id: link.partnerId },
          select: { firstName: true, email: true },
        })
      : null

    return {
      status: 'ACTIVE',
      partner: partner ? { name: partner.firstName ?? partner.email } : null,
    }
  }

  async unlink(userId: string) {
    const myLink = await prisma.partnerLink.findFirst({ where: { userId } })
    if (myLink?.partnerId) {
      await prisma.partnerLink.deleteMany({ where: { userId: myLink.partnerId } })
    }
    await prisma.partnerLink.deleteMany({ where: { userId } })
  }

  private getPhase(day: number, cycleLength: number): string {
    const ovulationDay = cycleLength - 14
    if (day <= 5) return 'MENSTRUAL'
    if (day <= ovulationDay - 3) return 'FOLLICULAR'
    if (day <= ovulationDay + 2) return 'OVULATORY'
    return 'LUTEAL'
  }
}
