'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function ResetForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setMsg('Las contraseñas no coinciden'); return }
    if (password.length < 8) { setMsg('Mínimo 8 caracteres'); return }
    setStatus('loading')
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: password }),
    })
    if (res.ok) {
      setStatus('success')
      setMsg('Contraseña actualizada. Podés iniciar sesión en la app.')
      setTimeout(() => router.push('/login'), 3000)
    } else {
      const d = await res.json()
      setStatus('error')
      setMsg(d.message || 'Token inválido o expirado')
    }
  }

  if (!token) return (
    <p style={{ color: '#f87171' }}>Link inválido. Pedí un nuevo reset al administrador.</p>
  )

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ display: 'block', marginBottom: 6, color: '#c4b5fd' }}>Nueva contraseña</label>
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          required minLength={8}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #4c1d95', background: '#1e1b4b', color: '#fff', fontSize: 15 }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: 6, color: '#c4b5fd' }}>Confirmar contraseña</label>
        <input
          type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          required
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #4c1d95', background: '#1e1b4b', color: '#fff', fontSize: 15 }}
        />
      </div>
      {msg && (
        <p style={{ color: status === 'success' ? '#4ade80' : '#f87171', margin: 0 }}>{msg}</p>
      )}
      <button
        type="submit" disabled={status === 'loading' || status === 'success'}
        style={{ padding: '12px', borderRadius: 8, background: '#7c3aed', color: '#fff', border: 'none', fontSize: 15, cursor: 'pointer', fontWeight: 600 }}
      >
        {status === 'loading' ? 'Guardando...' : 'Cambiar contraseña'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0f0a1e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#1a1035', borderRadius: 16, padding: 40, width: '100%', maxWidth: 420, border: '1px solid #2d1b69' }}>
        <h1 style={{ color: '#fff', fontSize: 24, marginBottom: 8, textAlign: 'center' }}>🌙 Lunara</h1>
        <h2 style={{ color: '#c4b5fd', fontSize: 18, marginBottom: 28, textAlign: 'center', fontWeight: 400 }}>Restablecer contraseña</h2>
        <Suspense fallback={<p style={{ color: '#888' }}>Cargando...</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  )
}
