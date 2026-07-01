'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, ChevronLeft, ChevronRight, Pin, PinOff, Search, UserX } from 'lucide-react'
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

const CATEGORIES = ['Todas', 'general', 'tip', 'question', 'support']

export default function CommunityPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'community', page, category, search],
    queryFn: () =>
      adminApi.get('/admin/community', {
        params: { page, ...(category && { category }), ...(search && { search }) },
      }).then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => adminApi.delete(`/admin/community/${postId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'community'] }),
  })

  const pinMutation = useMutation({
    mutationFn: (postId: string) => adminApi.patch(`/admin/community/${postId}/pin`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'community'] }),
  })

  const banUserMutation = useMutation({
    mutationFn: (userId: string) => adminApi.delete(`/admin/community/user/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'community'] }),
  })

  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  const handleCategoryChange = (cat: string) => {
    setCategory(cat === 'Todas' ? '' : cat)
    setPage(1)
  }

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Moderación de comunidad</h1>
        <p className="text-violet-400 text-sm mt-1">{total.toLocaleString()} publicaciones</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Category filter */}
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                (cat === 'Todas' && !category) || category === cat
                  ? 'bg-violet-600 text-white'
                  : 'bg-[#1a0533] text-violet-400 border border-[#3d1a6b] hover:border-violet-500'
              }`}
            >
              {cat !== 'Todas' ? CATEGORY_ICON[cat] : ''} {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-2 ml-auto">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar en contenido..."
            className="bg-[#1a0533] border border-[#3d1a6b] text-white rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500 w-56"
          />
          <button
            onClick={handleSearch}
            className="p-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors"
          >
            <Search size={14} />
          </button>
          {search && (
            <button
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
              className="px-3 py-1.5 bg-[#1a0533] border border-[#3d1a6b] text-violet-400 rounded-xl text-xs hover:border-violet-500"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-violet-400">Cargando publicaciones...</div>
      ) : (
        <div className="space-y-3">
          {data?.posts?.map((post: any) => (
            <div
              key={post.id}
              className={`border rounded-2xl p-5 transition-colors ${
                post.isPinned
                  ? 'bg-yellow-950/20 border-yellow-800/50'
                  : 'bg-[#1a0533] border-[#3d1a6b]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Meta */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {post.isPinned && (
                      <span className="flex items-center gap-1 text-xs bg-yellow-950 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-800">
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
                <div className="flex flex-col gap-2 shrink-0">
                  {/* Pin/Unpin */}
                  <button
                    onClick={() => pinMutation.mutate(post.id)}
                    disabled={pinMutation.isPending}
                    className={`p-2 rounded-xl transition-colors ${
                      post.isPinned
                        ? 'bg-yellow-950 hover:bg-yellow-900 text-yellow-400'
                        : 'bg-[#230742] hover:bg-yellow-950/50 text-violet-400 hover:text-yellow-400'
                    }`}
                    title={post.isPinned ? 'Quitar destacado' : 'Destacar post'}
                  >
                    {post.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                  </button>

                  {/* Delete post */}
                  <button
                    onClick={() => {
                      if (confirm('¿Eliminar esta publicación?')) deleteMutation.mutate(post.id)
                    }}
                    disabled={deleteMutation.isPending}
                    className="p-2 bg-red-950 hover:bg-red-900 text-red-400 rounded-xl transition-colors"
                    title="Eliminar publicación"
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* Ban user (delete all their posts) */}
                  {post.author?.id && (
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar TODOS los posts de ${post.author?.email}? Esta acción no se puede deshacer.`)) {
                          banUserMutation.mutate(post.author.id)
                        }
                      }}
                      disabled={banUserMutation.isPending}
                      className="p-2 bg-orange-950 hover:bg-orange-900 text-orange-400 rounded-xl transition-colors"
                      title="Eliminar todos los posts de esta usuaria"
                    >
                      <UserX size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {data?.posts?.length === 0 && (
            <div className="text-center py-12 text-violet-500">
              {search ? `Sin resultados para "${search}"` : 'No hay publicaciones'}
            </div>
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
              className="p-2 bg-[#1a0533] border border-[#3d1a6b] rounded-lg text-violet-400 disabled:opacity-40 hover:bg-[#230742] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 bg-[#1a0533] border border-[#3d1a6b] rounded-lg text-violet-400 disabled:opacity-40 hover:bg-[#230742] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
