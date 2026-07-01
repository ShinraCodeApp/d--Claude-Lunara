'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Users, TrendingDown, Clock, Send, AlertCircle } from 'lucide-react'
import adminApi from '@/lib/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)
dayjs.locale('es')

export default function RetentionPage() {
  const [notifTitle, setNotifTitle] = useState('¡Te extrañamos en Lunara! 🌙')
  const [notifMsg, setNotifMsg] = useState('Han pasado varios días. Volvé a registrar tu ciclo y recibí insights personalizados.')
  const [inactiveDays, setInactiveDays] = useState(7)
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'retention'],
    queryFn: () => adminApi.get('/admin/retention').then((r) => r.data),
    refetchInterval: 120000,
  })

  const notifMutation = useMutation({
    mutationFn: () =>
      adminApi.post('/admin/notifications/inactive', {
        title: notifTitle,
        message: notifMsg,
        inactiveDays,
      }).then((r) => r.data),
    onSuccess: (res) => setResult(res),
  })

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-violet-400">Cargando datos de retención...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Retención & Churn</h1>
        <p className="text-violet-400 text-sm mt-1">Análisis de usuarias inactivas y tasa de cancelación</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          icon={<Users size={20} />}
          label="Usuarias inactivas (+7 días)"
          value={data?.inactiveCount?.toLocaleString() ?? '0'}
          sub={`de ${data?.totalUsers?.toLocaleString()} totales`}
          color="yellow"
        />
        <KPICard
          icon={<TrendingDown size={20} />}
          label="Cancelaciones este mes"
          value={data?.churnedThisMonth?.toLocaleString() ?? '0'}
          sub="suscripciones canceladas"
          color="red"
        />
        <KPICard
          icon={<AlertCircle size={20} />}
          label="Churn rate"
          value={`${data?.churnRate ?? 0}%`}
          sub="del total de usuarias"
          color={data?.churnRate > 5 ? 'red' : 'green'}
        />
      </div>

      {/* Cohort table */}
      <div className="bg-[#1a0533] border border-[#3d1a6b] rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Cohortes semanales — retención 7 días</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-violet-400 border-b border-[#3d1a6b]">
                <th className="text-left pb-3 pr-4">Semana de registro</th>
                <th className="text-right pb-3 pr-4">Registradas</th>
                <th className="text-right pb-3 pr-4">Activas ahora</th>
                <th className="text-right pb-3">Retención</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3d1a6b]">
              {data?.cohorts?.map((c: any) => (
                <tr key={c.week}>
                  <td className="py-3 pr-4 text-violet-200">{c.week}</td>
                  <td className="py-3 pr-4 text-right text-white font-medium">{c.registered}</td>
                  <td className="py-3 pr-4 text-right text-violet-300">{c.active}</td>
                  <td className="py-3 text-right">
                    <span className={`font-bold ${c.retention >= 40 ? 'text-green-400' : c.retention >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {c.retention}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inactive users */}
      <div className="bg-[#1a0533] border border-[#3d1a6b] rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Usuarias más inactivas</h2>
        <div className="space-y-2">
          {data?.inactiveUsers?.length === 0 && (
            <p className="text-violet-500 text-sm text-center py-4">No hay usuarias inactivas</p>
          )}
          {data?.inactiveUsers?.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between bg-[#230742] rounded-xl px-4 py-3">
              <div>
                <div className="text-white text-sm font-medium">{u.profile?.firstName ?? u.email}</div>
                <div className="text-violet-500 text-xs">{u.email}</div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-yellow-400 text-xs">
                  <Clock size={12} />
                  {u.lastLoginAt ? dayjs(u.lastLoginAt).fromNow() : 'Nunca inició sesión'}
                </div>
                <div className="text-violet-600 text-xs">Registrada {dayjs(u.createdAt).fromNow()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Send re-engagement notification */}
      <div className="bg-[#1a0533] border border-[#3d1a6b] rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold">Notificación de re-engagement</h2>
        <p className="text-violet-400 text-sm">Enviá un push a todas las usuarias inactivas por N días</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-violet-400 text-xs mb-1">Días de inactividad</label>
            <input
              type="number"
              min={1}
              max={90}
              value={inactiveDays}
              onChange={(e) => setInactiveDays(Number(e.target.value))}
              className="w-full bg-[#230742] border border-[#3d1a6b] text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-violet-400 text-xs mb-1">Título</label>
            <input
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
              maxLength={100}
              className="w-full bg-[#230742] border border-[#3d1a6b] text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-violet-400 text-xs mb-1">Mensaje</label>
          <textarea
            value={notifMsg}
            onChange={(e) => setNotifMsg(e.target.value)}
            maxLength={300}
            rows={3}
            className="w-full bg-[#230742] border border-[#3d1a6b] text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500 resize-none"
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (confirm(`¿Enviar push a usuarias inactivas por más de ${inactiveDays} días?`)) {
                notifMutation.mutate()
              }
            }}
            disabled={notifMutation.isPending || !notifTitle || !notifMsg}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Send size={14} />
            {notifMutation.isPending ? 'Enviando...' : 'Enviar notificación'}
          </button>

          {result && (
            <div className="text-sm text-violet-300">
              ✅ Enviadas: <span className="text-green-400 font-bold">{result.sent}</span>
              {result.failed > 0 && <span className="text-red-400 ml-2">❌ Fallidas: {result.failed}</span>}
              <span className="text-violet-500 ml-2">/ {result.total} dispositivos</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KPICard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string
}) {
  const colors: Record<string, string> = {
    yellow: 'border-yellow-800 bg-yellow-950/40',
    red: 'border-red-800 bg-red-950/40',
    green: 'border-emerald-800 bg-emerald-950/40',
    violet: 'border-violet-800 bg-violet-950/40',
  }
  return (
    <div className={`border rounded-2xl p-5 ${colors[color] ?? colors.violet}`}>
      <div className="text-violet-400 mb-3">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-violet-300 text-sm mt-1">{label}</div>
      <div className="text-violet-500 text-xs mt-1">{sub}</div>
    </div>
  )
}
