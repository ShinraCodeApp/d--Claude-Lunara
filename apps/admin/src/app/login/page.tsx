'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminApiFns } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await adminApiFns.login(email, password)
      if (!['ADMIN', 'SUPER_ADMIN'].includes(data.user?.role)) {
        setError('No tenés permisos de administrador')
        setLoading(false)
        return
      }
      if (remember) {
        localStorage.setItem('admin_token', data.accessToken)
        if (data.refreshToken) localStorage.setItem('admin_refresh_token', data.refreshToken)
      } else {
        sessionStorage.setItem('admin_token', data.accessToken)
      }
      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🌙</div>
          <h1 className="text-3xl font-bold text-white">Lunara</h1>
          <p className="text-violet-400 text-sm mt-1">Panel de administración</p>
        </div>

        <form onSubmit={handleLogin} className="bg-surface border border-[#3d1a6b] rounded-2xl p-8 space-y-5">
          <h2 className="text-white font-semibold text-lg">Iniciar sesión</h2>

          <div className="space-y-2">
            <label className="text-violet-300 text-sm">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@lunara.app"
              className="w-full bg-card border border-[#3d1a6b] rounded-xl px-4 py-3 text-white placeholder-violet-600 focus:outline-none focus:border-violet-500"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-violet-300 text-sm">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-card border border-[#3d1a6b] rounded-xl px-4 py-3 text-white placeholder-violet-600 focus:outline-none focus:border-violet-500"
              required
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setRemember(!remember)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${remember ? 'bg-violet-600 border-violet-500' : 'bg-card border-[#3d1a6b]'}`}
            >
              {remember && <span className="text-white text-xs font-bold">✓</span>}
            </div>
            <span className="text-violet-300 text-sm">Recordarme en este dispositivo</span>
          </label>

          {error && (
            <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors"
          >
            {loading ? 'Ingresando...' : 'Entrar al panel'}
          </button>
        </form>

        <p className="text-center text-violet-600 text-xs mt-6">
          Solo administradores de ShinraCode tienen acceso
        </p>
      </div>
    </div>
  )
}
