'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit, Pin, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react'
import adminApi from '@/lib/api'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

dayjs.locale('es')

interface Article {
  id: string
  title: string
  excerpt: string
  content: string
  imageUrl: string | null
  category: string
  isPinned: boolean
  isPublished: boolean
  publishedAt: string
  author: { profile: { firstName: string } | null } | null
}

const EMPTY_FORM = {
  title: '',
  excerpt: '',
  content: '',
  imageUrl: '',
  category: 'salud',
  isPinned: false,
  isPublished: true,
}

const CATEGORIES = ['salud', 'ciclo', 'nutrición', 'ginecología', 'bienestar', 'embarazo', 'menopausia']

export default function ArticlesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'articles', page],
    queryFn: () => adminApi.get('/admin/articles', { params: { page } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const createMutation = useMutation({
    mutationFn: (body: typeof EMPTY_FORM) => adminApi.post('/admin/articles', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'articles'] }); closeForm() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<typeof EMPTY_FORM> }) =>
      adminApi.put(`/admin/articles/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'articles'] }); closeForm() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/admin/articles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'articles'] }),
  })

  const togglePin = (article: Article) =>
    updateMutation.mutate({ id: article.id, body: { isPinned: !article.isPinned } })

  const togglePublish = (article: Article) =>
    updateMutation.mutate({ id: article.id, body: { isPublished: !article.isPublished } })

  const openCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }

  const openEdit = (a: Article) => {
    setForm({
      title: a.title,
      excerpt: a.excerpt,
      content: a.content,
      imageUrl: a.imageUrl ?? '',
      category: a.category,
      isPinned: a.isPinned,
      isPublished: a.isPublished,
    })
    setEditingId(a.id)
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, imageUrl: form.imageUrl || undefined }
    if (editingId) {
      updateMutation.mutate({ id: editingId, body: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const articles: Article[] = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)
  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Artículos</h1>
          <p className="text-violet-300 text-sm mt-1">Contenido editorial para la sección Noticias de la app</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-violet-700 hover:bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Nuevo artículo
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a0533] border border-[#3d1a6b] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-white font-bold text-lg mb-5">
                {editingId ? 'Editar artículo' : 'Nuevo artículo'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-violet-300 text-sm font-medium block mb-1">Título</label>
                  <input
                    className="w-full bg-[#0d0118] border border-[#3d1a6b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    maxLength={200}
                    placeholder="Título del artículo"
                  />
                </div>
                <div>
                  <label className="text-violet-300 text-sm font-medium block mb-1">Resumen</label>
                  <textarea
                    className="w-full bg-[#0d0118] border border-[#3d1a6b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 resize-none"
                    value={form.excerpt}
                    onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                    required
                    maxLength={500}
                    rows={3}
                    placeholder="Breve descripción que aparece en la lista..."
                  />
                  <p className="text-violet-400 text-xs mt-1 text-right">{form.excerpt.length}/500</p>
                </div>
                <div>
                  <label className="text-violet-300 text-sm font-medium block mb-1">Contenido completo</label>
                  <textarea
                    className="w-full bg-[#0d0118] border border-[#3d1a6b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 resize-none"
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    required
                    rows={8}
                    placeholder="Texto completo del artículo..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-violet-300 text-sm font-medium block mb-1">Categoría</label>
                    <select
                      className="w-full bg-[#0d0118] border border-[#3d1a6b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-violet-300 text-sm font-medium block mb-1">URL de imagen (opcional)</label>
                    <input
                      className="w-full bg-[#0d0118] border border-[#3d1a6b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500"
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="https://..."
                      type="url"
                    />
                  </div>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isPinned}
                      onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                      className="accent-violet-500"
                    />
                    <span className="text-violet-300 text-sm">📌 Destacado</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                      className="accent-violet-500"
                    />
                    <span className="text-violet-300 text-sm">✅ Publicado</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
                  >
                    {isPending ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Publicar artículo'}
                  </button>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-6 bg-[#0d0118] border border-[#3d1a6b] text-violet-300 py-2.5 rounded-xl text-sm font-medium hover:border-violet-500 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Articles table */}
      <div className="bg-[#1a0533] border border-[#3d1a6b] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-violet-400">Cargando artículos...</div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📝</div>
            <p className="text-violet-300 font-medium">Sin artículos todavía</p>
            <p className="text-violet-400 text-sm mt-1">Creá el primer artículo para la sección Noticias</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#3d1a6b] text-violet-400 text-sm">
                <th className="text-left px-5 py-3 font-medium">Artículo</th>
                <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Categoría</th>
                <th className="text-left px-5 py-3 font-medium hidden lg:table-cell">Fecha</th>
                <th className="text-center px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3d1a6b]/40">
              {articles.map((a) => (
                <tr key={a.id} className="hover:bg-violet-950/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-2">
                      {a.isPinned && <span className="text-violet-400 text-xs mt-0.5">📌</span>}
                      <div>
                        <p className="text-white text-sm font-medium leading-snug max-w-xs truncate">{a.title}</p>
                        <p className="text-violet-400 text-xs mt-0.5 max-w-xs truncate">{a.excerpt}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="bg-violet-950 text-violet-300 text-xs px-2 py-0.5 rounded-lg capitalize">{a.category}</span>
                  </td>
                  <td className="px-5 py-4 text-violet-400 text-sm hidden lg:table-cell">
                    {dayjs(a.publishedAt).format('D MMM YYYY')}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${a.isPublished ? 'bg-green-900 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>
                      {a.isPublished ? 'Publicado' : 'Borrador'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => togglePin(a)}
                        title={a.isPinned ? 'Quitar destacado' : 'Destacar'}
                        className={`p-1.5 rounded-lg transition-colors ${a.isPinned ? 'text-violet-400 bg-violet-950' : 'text-violet-600 hover:text-violet-400 hover:bg-violet-950'}`}
                      >
                        <Pin size={14} />
                      </button>
                      <button
                        onClick={() => togglePublish(a)}
                        title={a.isPublished ? 'Despublicar' : 'Publicar'}
                        className="p-1.5 rounded-lg text-violet-600 hover:text-violet-400 hover:bg-violet-950 transition-colors"
                      >
                        {a.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 rounded-lg text-violet-600 hover:text-violet-400 hover:bg-violet-950 transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => { if (confirm('¿Eliminar este artículo?')) deleteMutation.mutate(a.id) }}
                        className="p-1.5 rounded-lg text-red-600 hover:text-red-400 hover:bg-red-950 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#3d1a6b]">
            <span className="text-violet-400 text-sm">{total} artículos</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-violet-400 disabled:opacity-30 hover:bg-violet-950 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-violet-300 text-sm">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-violet-400 disabled:opacity-30 hover:bg-violet-950 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
