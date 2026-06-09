"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import UFPSLogo from './UFPSLogo'
import { getUser, getRefreshToken, clearSession } from '@/lib/authStorage'
import { authApi, areasApi } from '@/lib/apiClient'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [hasAreas, setHasAreas] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const active = pathname.startsWith('/profile')
    ? 'profile'
    : pathname.startsWith('/reservations')
      ? 'reservations'
      : pathname.startsWith('/mis-espacios')
        ? 'mis-espacios'
        : 'spaces'

  useEffect(() => {
    const u = getUser()
    setUser(u)
    areasApi.misEspacios().then((data) => {
      setHasAreas((data.areas?.length ?? 0) > 0)
    }).catch(() => setHasAreas(false))
  }, [])

  // Cierra el menú al cambiar de ruta
  useEffect(() => { setMenuOpen(false) }, [pathname])

  const handleLogout = async () => {
    try {
      const refreshToken = getRefreshToken()
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {}
    clearSession()
    router.replace('/login')
  }

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?'

  const displayName = user ? `${user.first_name} ${user.last_name}` : ''
  const roleName = user?.role?.name ?? ''

  const navLinks = [
    { href: '/spaces',        label: 'Espacios',       key: 'spaces' },
    ...(hasAreas ? [{ href: '/mis-espacios', label: 'Mi Dependencia', key: 'mis-espacios' }] : []),
    { href: '/reservations',  label: 'Mis Reservas',   key: 'reservations' },
    { href: '/profile',       label: 'Mi Perfil',      key: 'profile' },
  ]

  const isAdmin =
    roleName.toLowerCase() === 'admin' || roleName.toLowerCase() === 'administrativo'

  return (
    <header style={{ background: '#C0392B' }} className="shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        <Link href="/spaces" className="flex-shrink-0">
          <UFPSLogo size="sm" light />
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              style={active === link.key ? { background: 'rgba(255,255,255,0.18)', color: 'white' } : {}}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active === link.key ? 'text-white' : 'text-red-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              className="ml-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-white/15 text-white hover:bg-white/25 transition-all border border-white/20"
            >
              Panel Admin
            </Link>
          )}
        </nav>

        {/* Avatar + logout — siempre visible */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
            >
              {initials}
            </div>
            <div className="hidden lg:block">
              <p className="text-white text-sm font-semibold leading-none">{displayName}</p>
              <p className="text-red-200 text-xs leading-none mt-0.5">{roleName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="hidden sm:inline-block text-red-100 text-sm border border-white/25 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all"
          >
            Salir
          </button>
          {/* Hamburger móvil */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden p-2 -mr-1 text-white rounded hover:bg-white/10"
            aria-label="Abrir menú"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              {menuOpen ? (
                <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Menú móvil */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/15" style={{ background: '#922B21' }}>
          <nav className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white hover:bg-white/10"
                style={active === link.key ? { background: 'rgba(255,255,255,0.15)' } : {}}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/20"
              >
                Panel Admin
              </Link>
            )}
            <div className="border-t border-white/15 pt-2 mt-2">
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-100 hover:bg-white/10"
              >
                Cerrar sesión
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
