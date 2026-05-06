import Link from 'next/link'
import UFPSLogo from '@/components/UFPSLogo'
import RouteGuard from '@/components/RouteGuard'

const NAV = [
  { href: '/admin/reservas', label: 'Reservas', icon: '📋' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: '👥' },
  { href: '/admin/espacios', label: 'Espacios', icon: '🏫' },
  { href: '/admin/horarios', label: 'Horarios', icon: '🕐' },
  { href: '/admin/configuracion', label: 'Configuración', icon: '⚙️' },
]

export default function AdminLayout({ children }) {
  return (
    <RouteGuard requireAdmin>
      <div className="min-h-screen flex flex-col">
        <header style={{ background: '#922B21' }} className="shadow-lg z-50">
          <div className="max-w-full px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <UFPSLogo size="sm" light />
              <span className="text-white/40 text-lg font-thin">|</span>
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
              >
                PANEL ADMINISTRATIVO
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                >
                  AD
                </div>
                <span className="text-white text-sm font-medium">Admin</span>
              </div>
              <Link
                href="/login"
                className="text-red-200 text-sm border border-white/20 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all"
              >
                Salir
              </Link>
            </div>
          </div>
        </header>

        <div className="flex flex-1">
          <aside
            className="w-56 flex-shrink-0 shadow-sm"
            style={{ background: '#1A1A2E', minHeight: 'calc(100vh - 56px)' }}
          >
            <nav className="p-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-3 mb-3 mt-2">
                Gestión
              </p>
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-gray-300 hover:bg-white/10 hover:text-white"
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}

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

          <main className="flex-1 bg-gray-50">{children}</main>
        </div>
      </div>
    </RouteGuard>
  )
}
