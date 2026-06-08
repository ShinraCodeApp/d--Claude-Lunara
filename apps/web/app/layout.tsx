import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Lunara — Conoce tu ciclo, conecta con tu bienestar',
  description: 'La app de salud femenina más completa. Seguimiento del ciclo menstrual, predicciones de ovulación, asistente IA Luna y más. Disponible en iOS y Android.',
  keywords: 'ciclo menstrual, app salud femenina, seguimiento periodo, ovulación, fertilidad, IA salud',
  openGraph: {
    title: 'Lunara — Conoce tu ciclo',
    description: 'App de salud femenina con IA, seguimiento del ciclo y Jardín Lunar gamificado.',
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lunara by ShinraCode',
    description: 'Tu compañera de bienestar femenino',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-[#0d0118] text-white antialiased">{children}</body>
    </html>
  )
}
