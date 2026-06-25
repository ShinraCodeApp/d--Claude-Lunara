'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, ChevronLeft, ChevronRight, Pin } from 'lucide-react'
import adminApi from '@/lib/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)
dayjs.locale('es')

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-violet-900 text-violet-300',
  tip: 'bg-emerald-900 text-emerald-300',
  question: 'bg-blue-900 text-blue-300',
  support: 'bg-pink-900 text-pink-300',
}

const CATEGORY_ICON: Record<string, string> = {
  general: '💬', tip: '💡', question: '❓', support: '🤗',
}

export default function CommunityPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'community', page],
    queryFn: () => adminApi.get('/admin/community', { params: { page } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => adminApi.delete(`/admin/community/${postId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'community'] }),
  })

  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Moderación de comunidad</h1>
        <p className="text-violet-400 text-sm mt-1">{total.toLocaleString()} publicaciones en total</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-violet-400">Cargando publicaciones...</div>
      ) : (
        <div className="space-y-3">
          {data?.posts?.map((post: any) => (
            <div key={post.id} className="bg-surface border border-[#3d1a6b] rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Meta */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {post.isPinned && (
                      <span className="flex items-center gap-1 text-xs bg-yellow-950 text-yellow-400 px-2 py-0.5 rounded-full">
                        <Pin size={10} /> Destacado
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[post.category] ?? 'bg-gray-800 text-gray-300'}`}>
                      {CATEGORY_ICON[post.category]} {post.category}
                    </span>
                    <span className="text-violet-500 text-xs">
                      {post.isAnonymous ? '🌙 Anónima' : (post.author?.profile?.firstName ?? post.author?.email ?? '?')}
                    </span>
                    <span className="text-violet-600 text-xs">{dayjs(post.createdAt).fromNow()}</span>
                  </div>

                  {/* Content */}
                  <p className="text-violet-100 text-sm leading-relaxed line-clamp-3">{post.content}</p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-violet-500 text-xs">❤️ {post.likesCount ?? post._count?.reactions ?? 0}</span>
                    <span className="text-violet-500 text-xs">🤗 {post.hugsCount ?? 0}</span>
                    {post.phase && <span className="text-violet-500 text-xs">Fase: {post.phase}</span>}
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => {
                    if (confirm('¿Eliminar esta publicación?')) deleteMutation.mutate(post.id)
                  }}
                  disabled={deleteMutation.isPending}
                  className="shrink-0 p-2 bg-red-950 hover:bg-red-900 text-red-400 rounded-xl transition-colors"
                  title="Eliminar publicación"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {data?.posts?.length === 0 && (
            <div className="text-center py-12 text-violet-500">No hay publicaciones</div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-violet-400 text-sm">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 bg-surface border border-[#3d1a6b] rounded-lg text-violet-400 disabled:opacity-40 hover:bg-card transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 bg-surface border border-[#3d1a6b] rounded-lg text-violet-400 disabled:opacity-40 hover:bg-card transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
