"use client"

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import UFPSLogo from '@/components/UFPSLogo'
import { authApi } from '@/lib/apiClient'
import { saveSession } from '@/lib/authStorage'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ code: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.login(form.code, form.password)
      saveSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: data.user,
      })
      router.replace('/spaces')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputBase = {
    outline: 'none',
  }
  const focusIn = (e) => {
    e.target.style.borderColor = '#C0392B'
    e.target.style.boxShadow = '0 0 0 3px rgba(192,57,43,0.1)'
  }
  const focusOut = (e) => {
    e.target.style.borderColor = '#E5E7EB'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — branding UFPS */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #C0392B 0%, #7B241C 100%)' }}
      >
        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          viewBox="0 0 400 600"
          preserveAspectRatio="xMidYMid slice"
        >
          {[0, 1, 2, 3, 4, 5].map((row) =>
            [0, 1, 2, 3].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={col * 110 - 20}
                y={row * 110 - 20}
                width="80"
                height="80"
                rx="8"
                fill="white"
              />
            ))
          )}
        </svg>

        <div className="relative z-10">
          <UFPSLogo size="md" light />
        </div>

        <div className="relative z-10">
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            Espacios
            <br />
            Universitarios
          </h1>
          <p className="text-red-200 text-lg leading-relaxed">
            Reserva aulas, laboratorios y auditorios de manera fácil y rápida.
          </p>
          <div className="mt-8 space-y-3">
            {[
              'Consulta disponibilidad en tiempo real',
              'Gestiona tus reservas desde cualquier lugar',
              'Recibe confirmaciones por correo electrónico',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-red-100 text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-red-300 text-xs">
            © 2025 Universidad Francisco de Paula Santander
          </p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <UFPSLogo size="md" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Bienvenido de vuelta</h2>
            <p className="text-gray-500 mt-1">Ingresa con tu código universitario</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm"
                style={{ background: '#FDEDEC', color: '#7B241C', border: '1px solid #F1948A' }}
              >
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Código universitario o correo
              </label>
              <input
                type="text"
                placeholder="Ej: 1234567"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-sm transition-all"
                style={inputBase}
                onFocus={focusIn}
                onBlur={focusOut}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                <Link href="/forgot-password" className="text-sm font-medium" style={{ color: '#C0392B' }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-sm transition-all"
                style={inputBase}
                onFocus={focusIn}
                onBlur={focusOut}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all mt-2"
              style={{ background: loading ? '#922B21' : '#C0392B', opacity: loading ? 0.7 : 1 }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#922B21')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#C0392B')}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-400">o</span>
            </div>
          </div>

          <p className="text-center text-sm text-gray-600">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="font-semibold" style={{ color: '#C0392B' }}>
              Regístrate aquí
            </Link>
          </p>

          <div
            className="mt-8 p-4 rounded-xl text-xs text-center"
            style={{ background: '#FDEDEC', color: '#7B241C', border: '1px solid #F1948A' }}
          >
            Acceso exclusivo para la comunidad UFPS.
            <br />
            Estudiantes, docentes y personal administrativo.
          </div>
        </div>
      </div>
    </div>
  )
}
