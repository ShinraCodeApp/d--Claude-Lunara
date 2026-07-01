'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Users, MessageSquare,
  LogOut, Moon, ChevronRight, Newspaper, Trophy, Bell,
  TrendingDown, CreditCard,
} from 'lucide-react'
import { adminApiFns } from '@/lib/api'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/users', label: 'Usuarias', icon: Users },
  { href: '/dashboard/subscriptions', label: 'Suscripciones', icon: CreditCard },
  { href: '/dashboard/retention', label: 'Retención', icon: TrendingDown },
  { href: '/dashboard/community', label: 'Comunidad', icon: MessageSquare },
  { href: '/dashboard/articles', label: 'Artículos', icon: Newspaper },
  { href: '/dashboard/achievements', label: 'Logros', icon: Trophy },
  { href: '/dashboard/notifications', label: 'Notificaciones', icon: Bell },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token')
    if (!token) {
      router.replace('/login')
    } else {
      setReady(true)
    }
  }, [router])

  const handleLogout = async () => {
    await adminApiFns.logout() // clears httpOnly refreshToken cookie on server
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_refresh_token')
    sessionStorage.removeItem('admin_token')
    window.location.replace('/login') // replace prevents back-button returning to dashboard
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-violet-400">Verificando acceso...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Sidebar */}
      <aside className="w-60 bg-surface border-r border-[#3d1a6b] flex flex-col fixed h-full">
        {/* Brand */}
        <div className="p-6 border-b border-[#3d1a6b]">
          <div className="flex items-center gap-3">
            <Moon size={24} className="text-violet-400" />
            <div>
              <div className="text-white font-bold">Lunara</div>
              <div className="text-violet-500 text-xs">Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  active
                    ? 'bg-violet-600 text-white font-medium'
                    : 'text-violet-300 hover:bg-card hover:text-white'
                }`}
              >
                <Icon size={18} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-[#3d1a6b]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-violet-400 hover:bg-red-950 hover:text-red-300 transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-60 p-8 min-h-screen">
        {children}
      </main>
    </div>
  )
}
