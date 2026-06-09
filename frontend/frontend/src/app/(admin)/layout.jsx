"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import UFPSLogo from '@/components/UFPSLogo'
import RouteGuard from '@/components/RouteGuard'
import { getUser, getRefreshToken, clearSession } from '@/lib/authStorage'
import { authApi } from '@/lib/apiClient'

const NAV = [
  { href: '/admin/dashboard',     label: 'Dashboard',     icon: '📊' },
  { href: '/admin/reservas',      label: 'Reservas',      icon: '📋' },
  { href: '/admin/usuarios',      label: 'Usuarios',      icon: '👥' },
  { href: '/admin/departamentos', label: 'Dependencias',  icon: '🏢' },
  { href: '/admin/espacios',      label: 'Espacios',      icon: '🏫' },
  { href: '/admin/horarios',      label: 'Horarios',      icon: '🕐' },
  { href: '/admin/reportes',      label: 'Reportes',      icon: '📈' },
  { href: '/admin/logs',          label: 'Logs',          icon: '🪵' },
  { href: '/admin/configuracion', label: 'Configuración', icon: '⚙️' },
]

export default function AdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => { setUser(getUser()) }, [])
  // Cierra el sidebar al cambiar de ruta en móvil
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : 'AD'

  const handleLogout = async () => {
    try {
      const refreshToken = getRefreshToken()
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {}
    clearSession()
    router.replace('/login')
  }

  return (
    <RouteGuard requireAdmin>
      <div className="min-h-screen flex flex-col">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header style={{ background: '#922B21' }} className="shadow-lg z-40 sticky top-0">
          <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              {/* Toggle sidebar (solo móvil) */}
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="lg:hidden p-2 -ml-2 text-white rounded hover:bg-white/10"
                aria-label="Abrir menú"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <UFPSLogo size="sm" light />
              <span className="hidden sm:inline text-white/40 text-lg font-thin">|</span>
              <span
                className="hidden sm:inline text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
              >
                PANEL ADMINISTRATIVO
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                >
                  {initials}
                </div>
                <span className="hidden sm:inline text-white text-sm font-medium">
                  {user ? `${user.first_name}` : 'Admin'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-red-200 text-xs sm:text-sm border border-white/20 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all"
              >
                Salir
              </button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 relative">
          {/* ── Backdrop móvil ───────────────────────────────────────── */}
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/40 z-30"
              style={{ top: '56px' }}
            />
          )}

          {/* ── Sidebar ──────────────────────────────────────────────── */}
          <aside
            className={`fixed lg:static z-40 lg:z-auto w-64 lg:w-56 flex-shrink-0 shadow-lg lg:shadow-sm transition-transform duration-200 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
            style={{
              background: '#1A1A2E',
              top: '56px',
              bottom: 0,
              minHeight: 'calc(100vh - 56px)',
            }}
          >
            <nav className="p-4 space-y-1 overflow-y-auto h-full">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-3 mb-3 mt-2">
                Gestión
              </p>
              {NAV.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={isActive
                      ? { background: 'rgba(255,255,255,0.12)', color: 'white' }
                      : { color: '#d1d5db' }
                    }
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}

              <div className="my-4 border-t border-white/10" />

              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-3 mb-3">
                Sistema
              </p>
              <Link
                href="/spaces"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/10 hover:text-white transition-all"
              >
                <span>🌐</span>
                Vista de usuario
              </Link>
            </nav>
          </aside>

          {/* ── Contenido ────────────────────────────────────────────── */}
          <main className="flex-1 bg-gray-50 min-w-0">{children}</main>
        </div>
      </div>
    </RouteGuard>
  )
}
