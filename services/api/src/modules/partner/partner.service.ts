import { prisma } from '@/config/database'
import { generateSecureToken } from '@/utils/crypto'
import { redis } from '@/config/redis'
import dayjs from 'dayjs'

export class PartnerService {
  async createInvite(userId: string) {
    const inviteCode = await generateSecureToken(16)
    const expiresAt = dayjs().add(48, 'hour').toDate()

    // Deactivate any existing links owned by this user, then create new one
    await prisma.partnerLink.deleteMany({ where: { ownerId: userId } })

    const link = await prisma.partnerLink.create({
      data: { ownerId: userId, inviteCode, expiresAt },
    })

    await redis.set(`partner:invite:${inviteCode}`, userId, 'EX', 48 * 3600)

    return link
  }

  async acceptInvite(acceptorId: string, inviteCode: string) {
    const inviterId = await redis.get(`partner:invite:${inviteCode}`)
    if (!inviterId) throw new Error('Código de invitación inválido o expirado')

    const inviterLink = await prisma.partnerLink.findFirst({
      where: { ownerId: inviterId, inviteCode, isActive: false, expiresAt: { gte: new Date() } },
    })
    if (!inviterLink) throw new Error('Invitación no encontrada o expirada')

    const acceptor = await prisma.user.findUniqueOrThrow({
      where: { id: acceptorId },
      include: { profile: { select: { firstName: true } } },
    })

    // Activate the owner's link with the guest
    await prisma.partnerLink.update({
      where: { id: inviterLink.id },
      data: { guestId: acceptorId, isActive: true },
    })

    await redis.del(`partner:invite:${inviteCode}`)

    return {
      partnerId: inviterId,
      partnerName: acceptor.profile?.firstName ?? acceptor.email,
    }
  }

  async getPartnerDashboard(userId: string) {
    // Find active link where user is either owner or guest
    const myLink = await prisma.partnerLink.findFirst({
      where: {
        isActive: true,
        OR: [{ ownerId: userId }, { guestId: userId }],
      },
    })
    if (!myLink) return null

    const partnerId = myLink.ownerId === userId ? myLink.guestId : myLink.ownerId
    if (!partnerId) return null

    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      include: { profile: { select: { firstName: true } } },
    })

    const currentCycle = await prisma.menstrualCycle.findFirst({
      where: { userId: partnerId, endDate: null },
      orderBy: { startDate: 'desc' },
    })

    const prediction = await prisma.cyclePrediction.findFirst({
      where: { userId: partnerId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    const dayOfCycle = currentCycle
      ? dayjs().diff(dayjs(currentCycle.startDate), 'day') + 1
      : null

    return {
      partner: { id: partner?.id, name: partner?.profile?.firstName ?? partner?.email },
      cycle: currentCycle
        ? {
            dayOfCycle,
            phase: this.getPhase(dayOfCycle ?? 1, currentCycle.cycleLength ?? 28),
            nextPeriodDate: prediction?.predictedStartDate,
            fertileWindowStart: prediction?.fertilityWindowStart,
            fertileWindowEnd: prediction?.fertilityWindowEnd,
          }
        : null,
    }
  }

  async getLinkStatus(userId: string) {
    const link = await prisma.partnerLink.findFirst({
      where: { OR: [{ ownerId: userId }, { guestId: userId }] },
      orderBy: { createdAt: 'desc' },
    })
    if (!link) return { status: 'NONE', inviteCode: null }

    if (!link.isActive) {
      const expired = link.expiresAt < new Date()
      if (expired) return { status: 'EXPIRED', inviteCode: null }
      return { status: 'PENDING', inviteCode: link.inviteCode, expiresAt: link.expiresAt }
    }

    const partnerId = link.ownerId === userId ? link.guestId : link.ownerId
    const partner = partnerId
      ? await prisma.user.findUnique({
          where: { id: partnerId },
          include: { profile: { select: { firstName: true } } },
        })
      : null

    return {
      status: 'ACTIVE',
      partner: partner ? { name: partner.profile?.firstName ?? partner.email } : null,
    }
  }

  async unlink(userId: string) {
    // Find all links involving this user and delete them
    await prisma.partnerLink.deleteMany({
      where: { OR: [{ ownerId: userId }, { guestId: userId }] },
    })
  }

  private getPhase(day: number, cycleLength: number): string {
    const ovulationDay = cycleLength - 14
    if (day <= 5) return 'MENSTRUAL'
    if (day <= ovulationDay - 3) return 'FOLLICULAR'
    if (day <= ovulationDay + 2) return 'OVULATORY'
    return 'LUTEAL'
  }
}
