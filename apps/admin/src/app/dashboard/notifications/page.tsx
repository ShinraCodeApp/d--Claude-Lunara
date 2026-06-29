'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import adminApi from '@/lib/api'
import { Send, Bell } from 'lucide-react'

const TEMPLATES = [
  { label: '🌙 Recordatorio ciclo', title: 'Tu ciclo te necesita', message: 'No olvides registrar cómo te sentís hoy. Lunara está aquí para acompañarte 💜' },
  { label: '✨ Nueva función', title: '¡Novedad en Lunara!', message: 'Tenemos algo nuevo para vos. Abrí la app y descubrilo 🌙' },
  { label: '💜 Motivación', title: 'Tu cuerpo, tu poder', message: 'Cada día que te registrás es un paso hacia conocerte mejor. ¡Seguí así! 💜' },
  { label: '🌿 Consejo de salud', title: 'Consejo de bienestar', message: 'Recordá hidratarte bien hoy. Tu ciclo hormonal agradece el agua 💧' },
]

export default function NotificationsPage() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null)

  const broadcastMutation = useMutation({
    mutationFn: () => adminApi.post('/admin/notifications/broadcast', { title, message }).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data)
      setTitle('')
      setMessage('')
    },
  })

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setTitle(t.title)
    setMessage(t.message)
    setResult(null)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Notificaciones</h1>
        <p className="text-violet-300 text-sm mt-1">Enviá push notifications a todas las usuarias con la app instalada</p>
      </div>

      {/* Templates */}
      <div>
        <p className="text-violet-400 text-xs font-semibold uppercase tracking-wider mb-3">Plantillas rápidas</p>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <button key={t.label} onClick={() => applyTemplate(t)}
              className="text-left px-4 py-3 bg-[#1a0533] border border-[#3d1a6b] hover:border-violet-500 rounded-xl text-sm text-violet-300 transition-colors">
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="bg-[#1a0533] border border-[#3d1a6b] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-violet-300 font-semibold mb-2">
          <Bell size={18} />
          Componer notificación
        </div>

        <div>
          <label className="text-violet-400 text-sm mb-1 block">Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100}
            placeholder="Título de la notificación"
            className="w-full bg-card border border-[#3d1a6b] rounded-xl px-4 py-3 text-white placeholder-violet-700 focus:outline-none focus:border-violet-500 text-sm" />
          <p className="text-violet-600 text-xs mt-1">{title.length}/100</p>
        </div>

        <div>
          <label className="text-violet-400 text-sm mb-1 block">Mensaje</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} rows={3}
            placeholder="Escribí el mensaje que van a recibir las usuarias..."
            className="w-full bg-card border border-[#3d1a6b] rounded-xl px-4 py-3 text-white placeholder-violet-700 focus:outline-none focus:border-violet-500 text-sm resize-none" />
          <p className="text-violet-600 text-xs mt-1">{message.length}/300</p>
        </div>

        {result && (
          <div className="bg-green-950 border border-green-800 rounded-xl px-4 py-3 text-sm">
            <p className="text-green-300 font-semibold">✅ Notificación enviada</p>
            <p className="text-green-400 mt-1">Enviadas: <strong>{result.sent}</strong> · Fallidas: <strong>{result.failed}</strong> · Total: <strong>{result.total}</strong></p>
          </div>
        )}

        <button
          onClick={() => { if (confirm(`¿Enviar a todas las usuarias?\n\n"${title}"\n${message}`)) broadcastMutation.mutate() }}
          disabled={!title.trim() || !message.trim() || broadcastMutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors"
        >
          <Send size={16} />
          {broadcastMutation.isPending ? 'Enviando...' : 'Enviar a todas las usuarias'}
        </button>
      </div>
    </div>
  )
}
