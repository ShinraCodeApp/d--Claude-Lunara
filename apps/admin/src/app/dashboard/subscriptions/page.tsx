'use client'

import { useQuery } from '@tanstack/react-query'
import { CreditCard, TrendingUp, Users, XCircle, ArrowUpRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import adminApi from '@/lib/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)
dayjs.locale('es')

const TIER_LABEL: Record<string, string> = {
  PREMIUM_MONTHLY: '💜 Mensual',
  PREMIUM_ANNUAL: '⭐ Anual',
  FREE: '🔓 Free',
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'text-green-400 bg-green-950',
  CANCELLED: 'text-red-400 bg-red-950',
  EXPIRED: 'text-yellow-400 bg-yellow-950',
  GRACE_PERIOD: 'text-orange-400 bg-orange-950',
}

export default function SubscriptionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'subscriptions', 'metrics'],
    queryFn: () => adminApi.get('/admin/subscriptions/metrics').then((r) => r.data),
    refetchInterval: 60000,
  })

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-violet-400">Cargando métricas...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Suscripciones</h1>
        <p className="text-violet-400 text-sm mt-1">MRR, conversión y eventos recientes</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-violet-800 bg-violet-950/40 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <CreditCard size={20} className="text-violet-400" />
            <span className="text-xs text-violet-400">mes actual</span>
          </div>
          <div className="text-3xl font-bold text-white">${data?.mrr?.toLocaleString() ?? '0'}</div>
          <div className="text-violet-300 text-sm mt-1">MRR estimado</div>
        </div>

        <div className="border border-purple-800 bg-purple-950/40 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp size={20} className="text-purple-400" />
            <ArrowUpRight size={14} className="text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white">{data?.conversionRate ?? 0}%</div>
          <div className="text-purple-300 text-sm mt-1">Conversión Free → Premium</div>
        </div>

        <div className="border border-pink-800 bg-pink-950/40 rounded-2xl p-5">
          <div className="text-pink-400 mb-3"><Users size={20} /></div>
          <div className="text-3xl font-bold text-white">
            {((data?.monthly ?? 0) + (data?.annual ?? 0)).toLocaleString()}
          </div>
          <div className="text-pink-300 text-sm mt-1">Usuarias premium</div>
          <div className="text-pink-600 text-xs mt-1">
            {data?.monthly ?? 0} mensuales · {data?.annual ?? 0} anuales
          </div>
        </div>

        <div className="border border-red-800 bg-red-950/40 rounded-2xl p-5">
          <div className="text-red-400 mb-3"><XCircle size={20} /></div>
          <div className="text-3xl font-bold text-white">{data?.cancelled ?? 0}</div>
          <div className="text-red-300 text-sm mt-1">Cancelaciones este mes</div>
        </div>
      </div>

      {/* MRR trend chart */}
      <div className="bg-[#1a0533] border border-[#3d1a6b] rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Tendencia de MRR — últimos 6 meses</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data?.mrrTrend ?? []}>
            <defs>
              <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3d1a6b" />
            <XAxis dataKey="month" stroke="#a78bfa" fontSize={12} />
            <YAxis stroke="#a78bfa" fontSize={12} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#230742', border: '1px solid #3d1a6b', borderRadius: 8 }}
              labelStyle={{ color: '#e9d5ff' }}
              itemStyle={{ color: '#a78bfa' }}
              formatter={(v: number) => [`$${v}`, 'MRR']}
            />
            <Area type="monotone" dataKey="mrr" stroke="#8b5cf6" fill="url(#mrrGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Free', count: data?.free ?? 0, color: 'bg-gray-800', text: 'text-gray-300' },
          { label: 'Premium Mensual', count: data?.monthly ?? 0, color: 'bg-violet-900', text: 'text-violet-300' },
          { label: 'Premium Anual', count: data?.annual ?? 0, color: 'bg-yellow-900', text: 'text-yellow-300' },
        ].map((tier) => {
          const total = (data?.free ?? 0) + (data?.monthly ?? 0) + (data?.annual ?? 0)
          const pct = total > 0 ? Math.round((tier.count / total) * 100) : 0
          return (
            <div key={tier.label} className="bg-[#1a0533] border border-[#3d1a6b] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium ${tier.text}`}>{tier.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${tier.color} ${tier.text}`}>{pct}%</span>
              </div>
              <div className="text-2xl font-bold text-white">{tier.count.toLocaleString()}</div>
              <div className="mt-3 h-1.5 bg-[#3d1a6b] rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent events */}
      <div className="bg-[#1a0533] border border-[#3d1a6b] rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Eventos recientes (últimos 30 días)</h2>
        {data?.recentChanges?.length === 0 ? (
          <p className="text-violet-500 text-sm text-center py-6">Sin eventos recientes</p>
        ) : (
          <div className="space-y-2">
            {data?.recentChanges?.map((ev: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-[#230742] rounded-xl px-4 py-3">
                <div>
                  <div className="text-white text-sm font-medium">
                    {ev.user?.profile?.firstName ?? ev.user?.email}
                  </div>
                  <div className="text-violet-500 text-xs">{ev.user?.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-violet-300 text-sm">{TIER_LABEL[ev.tier] ?? ev.tier}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[ev.status] ?? 'text-gray-400 bg-gray-900'}`}>
                    {ev.status}
                  </span>
                  <span className="text-violet-600 text-xs">{dayjs(ev.updatedAt).fromNow()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
