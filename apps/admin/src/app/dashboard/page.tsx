'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Users, TrendingUp, CreditCard, Activity,
  Moon, MessageSquare, Star, AlertCircle, RefreshCw,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import adminApi from '@/lib/api'

const COLORS = ['#8b5cf6', '#a855f7', '#c084fc', '#e879f9', '#f0abfc']

export default function DashboardPage() {
  const { data: stats, isLoading, refetch: refetchStats, isFetching } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.get('/admin/stats').then((r) => r.data),
    refetchInterval: 60000,
  })

  const { data: growth } = useQuery({
    queryKey: ['admin', 'growth'],
    queryFn: () => adminApi.get('/admin/growth').then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-violet-400 text-lg">Cargando estadísticas...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-violet-300 text-sm mt-1">Bienvenida al panel de Lunara by ShinraCode</p>
        </div>
        <button
          onClick={() => refetchStats()}
          disabled={isFetching}
          className="flex items-center gap-2 text-violet-400 hover:text-white border border-[#3d1a6b] hover:border-violet-500 px-3 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* ─── KPI Cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<Users size={20} />}
          title="Usuarias totales"
          value={stats?.totalUsers?.toLocaleString() ?? '0'}
          change={stats?.userGrowth ?? 0}
          color="violet"
        />
        <KPICard
          icon={<CreditCard size={20} />}
          title="Suscriptoras Premium"
          value={stats?.premiumUsers?.toLocaleString() ?? '0'}
          change={stats?.premiumGrowth ?? 0}
          color="purple"
        />
        <KPICard
          icon={<TrendingUp size={20} />}
          title="Ingresos mes"
          value={`$${stats?.monthlyRevenue?.toLocaleString() ?? '0'}`}
          change={stats?.revenueGrowth ?? 0}
          color="pink"
        />
        <KPICard
          icon={<Activity size={20} />}
          title="DAU"
          value={stats?.dau?.toLocaleString() ?? '0'}
          change={stats?.dauChange ?? 0}
          color="gold"
        />
      </div>

      {/* ─── Charts Row ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Growth Chart */}
        <div className="lg:col-span-2 bg-[#1a0533] border border-[#3d1a6b] rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Crecimiento de usuarias</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growth?.users ?? []}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3d1a6b" />
              <XAxis dataKey="date" stroke="#a78bfa" fontSize={11} />
              <YAxis stroke="#a78bfa" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#230742', border: '1px solid #3d1a6b', borderRadius: 8 }}
                labelStyle={{ color: '#e9d5ff' }}
                itemStyle={{ color: '#a78bfa' }}
              />
              <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="url(#colorUsers)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Subscription breakdown */}
        <div className="bg-[#1a0533] border border-[#3d1a6b] rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Suscripciones</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Free', value: stats?.freeUsers ?? 0 },
                  { name: 'Premium Mensual', value: stats?.monthlyPremium ?? 0 },
                  { name: 'Premium Anual', value: stats?.annualPremium ?? 0 },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                dataKey="value"
              >
                {COLORS.map((color, i) => <Cell key={i} fill={color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#230742', border: '1px solid #3d1a6b', borderRadius: 8 }}
                itemStyle={{ color: '#a78bfa' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {[
              { label: 'Free', color: COLORS[0] },
              { label: 'Premium Mensual', color: COLORS[1] },
              { label: 'Premium Anual', color: COLORS[2] },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-violet-300 text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Feature Activity ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard icon={<Moon size={18} />} title="Ciclos registrados hoy" value={stats?.cyclesLoggedToday ?? 0} />
        <FeatureCard icon={<MessageSquare size={18} />} title="Mensajes IA hoy" value={stats?.aiMessagesToday ?? 0} />
        <FeatureCard icon={<Star size={18} />} title="Logros desbloqueados" value={stats?.achievementsToday ?? 0} />
      </div>

      {/* ─── Alerts ─────────────────────────────────── */}
      {stats?.alerts?.length > 0 && (
        <div className="bg-red-950 border border-red-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-red-400 font-semibold mb-3">
            <AlertCircle size={18} />
            Alertas del sistema
          </div>
          {stats.alerts.map((alert: string, i: number) => (
            <p key={i} className="text-red-300 text-sm">{alert}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function KPICard({ icon, title, value, change, color }: {
  icon: React.ReactNode; title: string; value: string; change: number; color: string
}) {
  const colors = {
    violet: 'border-violet-800 bg-violet-950/50',
    purple: 'border-purple-800 bg-purple-950/50',
    pink: 'border-pink-800 bg-pink-950/50',
    gold: 'border-yellow-800 bg-yellow-950/50',
  }

  return (
    <div className={`border rounded-2xl p-5 ${colors[color as keyof typeof colors]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-violet-400">{icon}</div>
        <span className={`text-xs font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? '+' : ''}{change}%
        </span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-violet-400 text-sm mt-1">{title}</div>
    </div>
  )
}

function FeatureCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: number }) {
  return (
    <div className="bg-[#1a0533] border border-[#3d1a6b] rounded-2xl p-5 flex items-center gap-4">
      <div className="text-violet-400 bg-violet-950 p-3 rounded-xl">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
        <div className="text-violet-400 text-sm">{title}</div>
      </div>
    </div>
  )
}
