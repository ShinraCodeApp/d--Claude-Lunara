import PDFDocument from 'pdfkit'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { prisma } from '@/config/database'
import { env } from '@/config/env'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

dayjs.locale('es')

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
  },
})

export class ReportsService {
  async listReports(userId: string) {
    return prisma.generatedReport.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  }

  async generateMonthlyReport(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    const periodLabel = `${year}-${String(month).padStart(2, '0')}`

    const [user, cycles, symptoms, moods, streak] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId } }),
      prisma.menstrualCycle.findMany({
        where: { userId, startDate: { gte: startDate, lte: endDate } },
        include: { bleedingDays: true },
      }),
      prisma.symptomLog.findMany({
        where: { userId, date: { gte: startDate, lte: endDate } },
        include: { symptom: true },
      }),
      prisma.moodLog.findMany({
        where: { userId, date: { gte: startDate, lte: endDate } },
      }),
      prisma.userStreak.findUnique({ where: { userId } }),
    ])

    const pdfBuffer = await this.buildPDF({
      title: `Informe Mensual — ${dayjs(startDate).format('MMMM YYYY')}`,
      user,
      cycles,
      symptoms,
      moods,
      streak,
      period: periodLabel,
    })

    return this.saveReport(userId, 'monthly', periodLabel, pdfBuffer)
  }

  async generateAnnualReport(userId: string, year: number) {
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)

    const [user, cycles, symptoms] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId } }),
      prisma.menstrualCycle.findMany({
        where: { userId, startDate: { gte: startDate, lte: endDate } },
        include: { bleedingDays: true },
      }),
      prisma.symptomLog.count({ where: { userId, date: { gte: startDate, lte: endDate } } }),
    ])

    const pdfBuffer = await this.buildPDF({
      title: `Informe Anual ${year}`,
      user,
      cycles,
      symptoms: [],
      moods: [],
      streak: null,
      period: String(year),
    })

    return this.saveReport(userId, 'annual', String(year), pdfBuffer)
  }

  async getDownloadUrl(userId: string, reportId: string) {
    const report = await prisma.generatedReport.findUnique({
      where: { id: reportId, userId },
    })
    if (!report) throw { statusCode: 404, message: 'Informe no encontrado' }

    const key = report.fileUrl.replace(`https://${env.AWS_S3_BUCKET}.s3.amazonaws.com/`, '')

    const command = new GetObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
    })

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 })
    return url
  }

  private async buildPDF(data: {
    title: string
    user: any
    cycles: any[]
    symptoms: any[]
    moods: any[]
    streak: any
    period: string
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 })
      const chunks: Buffer[] = []

      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // ─── Header ───────────────────────────────────────────
      doc
        .fontSize(24)
        .fillColor('#8b5cf6')
        .text('Lunara by ShinraCode', 50, 50)
        .fontSize(16)
        .fillColor('#333')
        .text(data.title, 50, 85)
        .fontSize(10)
        .fillColor('#666')
        .text(`Generado el ${dayjs().format('D [de] MMMM [de] YYYY')}`, 50, 110)

      doc.moveTo(50, 130).lineTo(545, 130).strokeColor('#8b5cf6').lineWidth(1).stroke()

      // ─── User info ────────────────────────────────────────
      doc
        .fontSize(14).fillColor('#8b5cf6').text('Datos del perfil', 50, 145)
        .fontSize(11).fillColor('#333')
        .text(`Nombre: ${data.user?.firstName || 'N/A'} ${data.user?.lastName || ''}`, 50, 168)

      // ─── Cycle Summary ────────────────────────────────────
      doc.fontSize(14).fillColor('#8b5cf6').text('Resumen de ciclos', 50, 210)

      if (data.cycles.length > 0) {
        data.cycles.forEach((cycle, i) => {
          const y = 235 + i * 35
          doc.fontSize(11).fillColor('#333')
            .text(`Ciclo ${i + 1}: ${dayjs(cycle.startDate).format('D MMM')} — ${cycle.endDate ? dayjs(cycle.endDate).format('D MMM') : 'En curso'}`, 50, y)
          if (cycle.periodLength) {
            doc.text(`Duración: ${cycle.periodLength} días`, 250, y)
          }
        })
      } else {
        doc.fontSize(11).fillColor('#666').text('Sin ciclos registrados en este período', 50, 235)
      }

      // ─── Disclaimer ───────────────────────────────────────
      const disclaimerY = doc.page.height - 80
      doc
        .fontSize(9)
        .fillColor('#999')
        .text(
          '⚕️ Este informe es de carácter informativo y educativo. No reemplaza la consulta con profesionales de la salud. Consulta siempre a tu médica o ginecóloga para interpretación y orientación médica profesional.',
          50, disclaimerY, { width: 495, align: 'center' }
        )

      doc.end()
    })
  }

  private async saveReport(userId: string, type: string, period: string, pdfBuffer: Buffer) {
    const key = `reports/${userId}/${type}_${period}_${Date.now()}.pdf`

    await s3.send(new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ServerSideEncryption: 'AES256',
    }))

    const fileUrl = `https://${env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    return prisma.generatedReport.create({
      data: {
        userId,
        type,
        period,
        fileUrl,
        fileSize: pdfBuffer.length,
        expiresAt,
      },
    })
  }
}
