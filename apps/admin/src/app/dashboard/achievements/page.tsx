'use client'

import { useQuery } from '@tanstack/react-query'
import adminApi from '@/lib/api'
import { Trophy } from 'lucide-react'

export default function AchievementsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'achievements'],
    queryFn: () => adminApi.get('/admin/achievements').then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Logros</h1>
        <p className="text-violet-300 text-sm mt-1">{data?.length ?? 0} logros configurados</p>
      </div>

      {isLoading ? (
        <div className="text-violet-400 text-center py-16">Cargando logros...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data?.map((a: any) => (
            <div key={a.id} className="bg-[#1a0533] border border-[#3d1a6b] rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="text-3xl">{a.icon ?? '🏆'}</div>
                <span className="text-xs bg-violet-900 text-violet-300 px-2 py-1 rounded-full font-medium">
                  +{a.xpReward} XP
                </span>
              </div>
              <h3 className="text-white font-semibold text-sm">{a.titleEs ?? a.title}</h3>
              <p className="text-violet-400 text-xs mt-1 line-clamp-2">{a.descriptionEs ?? a.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-violet-500 capitalize">{a.category ?? '—'}</span>
                <div className="flex items-center gap-1 text-xs text-violet-400">
                  <Trophy size={11} />
                  <span>{a._count?.userAchievements ?? 0} usuarias</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
