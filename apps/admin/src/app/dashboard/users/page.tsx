'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Crown, User, Trash2, ChevronLeft, ChevronRight, KeyRound, Copy, Check } from 'lucide-react'
import { adminApiFns } from '@/lib/api'
import adminApi from '@/lib/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)
dayjs.locale('es')

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  FREE: { label: 'Free', color: 'text-gray-400 bg-gray-900' },
  PREMIUM_MONTHLY: { label: 'Premium Mensual', color: 'text-violet-300 bg-violet-950' },
  PREMIUM_ANNUAL: { label: 'Premium Anual', color: 'text-yellow-300 bg-yellow-950' },
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [resetLink, setResetLink] = useState<{ email: string; link: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: () => adminApiFns.getUsers({ page, search: search || undefined }),
    placeholderData: (prev) => prev,
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApiFns.updateUserRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const subMutation = useMutation({
    mutationFn: ({ id, tier }: { id: string; tier: string }) =>
      adminApi.put(`/admin/users/${id}/subscription`, { tier }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      setSelectedUser(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApiFns.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const resetMutation = useMutation({
    mutationFn: (id: string) => adminApi.post(`/admin/users/${id}/reset-password`).then((r) => r.data),
    onSuccess: (data) => {
      setResetLink({ email: data.email, link: data.resetLink })
    },
  })

  const copyLink = () => {
    if (!resetLink) return
    navigator.clipboard.writeText(resetLink.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuarias</h1>
          <p className="text-violet-400 text-sm mt-1">{total.toLocaleString()} registradas</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-500" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar por email..."
          className="w-full bg-surface border border-[#3d1a6b] rounded-xl pl-10 pr-4 py-3 text-white placeholder-violet-600 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Table */}
      <div className="bg-surface border border-[#3d1a6b] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#3d1a6b]">
            <tr className="text-violet-400 text-sm">
              <th className="text-left px-6 py-4">Usuaria</th>
              <th className="text-left px-6 py-4">Plan</th>
              <th className="text-left px-6 py-4">Registro</th>
              <th className="text-left px-6 py-4">Último acceso</th>
              <th className="text-left px-6 py-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-12 text-violet-400">Cargando...</td></tr>
            ) : data?.users?.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-violet-500">No se encontraron usuarias</td></tr>
            ) : data?.users?.map((user: any) => {
              const tier = user.subscription?.tier ?? 'FREE'
              const tierInfo = TIER_LABELS[tier] ?? TIER_LABELS.FREE
              return (
                <tr key={user.id} className="border-b border-[#3d1a6b]/50 hover:bg-card/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-violet-900 flex items-center justify-center text-sm font-bold text-violet-200">
                        {user.profile?.firstName?.[0] ?? user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">
                          {user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName ?? ''}`.trim() : '—'}
                        </div>
                        <div className="text-violet-400 text-xs">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${tierInfo.color}`}>
                      {tier !== 'FREE' && <Crown size={10} className="inline mr-1" />}
                      {tierInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-violet-400 text-sm">
                    {dayjs(user.createdAt).format('D MMM YYYY')}
                  </td>
                  <td className="px-6 py-4 text-violet-400 text-sm">
                    {user.lastLoginAt ? dayjs(user.lastLoginAt).fromNow() : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-xs bg-violet-900 hover:bg-violet-700 text-violet-200 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Gestionar
                      </button>
                      <button
                        onClick={() => resetMutation.mutate(user.id)}
                        title="Resetear contraseña"
                        className="text-xs bg-amber-950 hover:bg-amber-900 text-amber-300 px-2 py-1.5 rounded-lg transition-colors"
                      >
                        <KeyRound size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar la cuenta de ${user.email}?`)) deleteMutation.mutate(user.id)
                        }}
                        className="text-xs bg-red-950 hover:bg-red-900 text-red-400 px-2 py-1.5 rounded-lg transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-violet-400 text-sm">
            Página {page} de {totalPages}
          </span>
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

      {/* Reset Password Modal */}
      {resetLink && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setResetLink(null)}>
          <div className="bg-surface border border-amber-900/50 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-amber-300 mb-1">Link de reset generado</h3>
            <p className="text-sm text-violet-300 mb-4">Enviáselo a <strong>{resetLink.email}</strong> — expira en 1 hora.</p>
            <div className="bg-black/40 rounded-lg p-3 text-xs text-violet-200 break-all mb-4 font-mono">{resetLink.link}</div>
            <div className="flex gap-3">
              <button onClick={copyLink} className="flex-1 flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar link</>}
              </button>
              <button onClick={() => setResetLink(null)} className="px-4 py-2.5 rounded-xl border border-violet-700 text-violet-300 text-sm hover:bg-violet-900/30 transition-colors">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-surface border border-[#3d1a6b] rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-violet-900 flex items-center justify-center text-xl font-bold text-violet-200">
                {selectedUser.profile?.firstName?.[0] ?? selectedUser.email[0].toUpperCase()}
              </div>
              <div>
                <div className="text-white font-semibold">
                  {selectedUser.profile?.firstName ?? 'Sin nombre'}
                </div>
                <div className="text-violet-400 text-sm">{selectedUser.email}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-violet-400 text-sm mb-2">Cambiar plan</p>
                <div className="grid grid-cols-3 gap-2">
                  {['FREE', 'PREMIUM_MONTHLY', 'PREMIUM_ANNUAL'].map((tier) => (
                    <button
                      key={tier}
                      onClick={() => subMutation.mutate({ id: selectedUser.id, tier })}
                      disabled={subMutation.isPending}
                      className={`py-2 px-2 rounded-xl text-xs font-medium border transition-colors ${
                        selectedUser.subscription?.tier === tier
                          ? 'bg-violet-600 border-violet-500 text-white'
                          : 'bg-card border-[#3d1a6b] text-violet-300 hover:border-violet-500'
                      }`}
                    >
                      {tier === 'FREE' ? 'Free' : tier === 'PREMIUM_MONTHLY' ? 'Mensual' : 'Anual'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-violet-400 text-sm mb-2">Cambiar rol</p>
                <div className="grid grid-cols-2 gap-2">
                  {['USER', 'ADMIN'].map((role) => (
                    <button
                      key={role}
                      onClick={() => roleMutation.mutate({ id: selectedUser.id, role })}
                      disabled={roleMutation.isPending}
                      className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                        selectedUser.role === role
                          ? 'bg-violet-600 border-violet-500 text-white'
                          : 'bg-card border-[#3d1a6b] text-violet-300 hover:border-violet-500'
                      }`}
                    >
                      {role === 'USER' ? <><User size={13} className="inline mr-1" />Usuario</> : <><Crown size={13} className="inline mr-1" />Admin</>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedUser(null)}
              className="mt-6 w-full py-2 bg-card border border-[#3d1a6b] rounded-xl text-violet-400 text-sm hover:bg-[#3d1a6b] transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
