"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import UFPSLogo from './UFPSLogo'
import { getUser, getRefreshToken, clearSession } from '@/lib/authStorage'
import { authApi } from '@/lib/apiClient'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)

  // Detect active nav from current path
  const active = pathname.startsWith('/profile')
    ? 'profile'
    : pathname.startsWith('/reservations')
      ? 'reservations'
      : 'spaces'

  useEffect(() => {
    setUser(getUser())
  }, [])

  const handleLogout = async () => {
    try {
      const refreshToken = getRefreshToken()
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {
      // Si falla el logout remoto, igual limpiamos la sesión local
    }
    clearSession()
    router.replace('/login')
  }

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?'

  const displayName = user ? `${user.first_name} ${user.last_name}` : ''
  const roleName = user?.role?.name ?? ''

  const navLinks = [
    { href: '/spaces', label: 'Espacios', key: 'spaces' },
    { href: '/reservations', label: 'Mis Reservas', key: 'reservations' },
    { href: '/profile', label: 'Mi Perfil', key: 'profile' },
  ]

  const isAdmin =
    roleName.toLowerCase() === 'admin' || roleName.toLowerCase() === 'administrativo'

  return (
    <header style={{ background: '#C0392B' }} className="shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/spaces" className="flex-shrink-0">
          <UFPSLogo size="sm" light />
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              style={
                active === link.key
                  ? { background: 'rgba(255,255,255,0.18)', color: 'white' }
                  : {}
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active === link.key
                  ? 'text-white'
                  : 'text-red-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}

          {isAdmin && (
            <Link
              href="/admin/reservas"
              className="ml-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-white/15 text-white hover:bg-white/25 transition-all border border-white/20"
            >
              Panel Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
            >
              {initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-white text-sm font-semibold leading-none">{displayName}</p>
              <p className="text-red-200 text-xs leading-none mt-0.5">{roleName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-red-100 text-sm border border-white/25 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  )
}
