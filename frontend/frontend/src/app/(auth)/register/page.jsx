"use client"

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import UFPSLogo from '@/components/UFPSLogo'
import { authApi } from '@/lib/apiClient'
import { saveSession } from '@/lib/authStorage'

const roles = [
  { value: 'Estudiante', label: 'Estudiante' },
  { value: 'Docente', label: 'Docente' },
  { value: 'Administrativo', label: 'Administrativo' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    code: '',
    email: '',
    role: 'Estudiante',
    password: '',
    confirm: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setLoading(true)
    try {
      const data = await authApi.register({
        first_name: form.firstName,
        last_name: form.lastName,
        university_code: form.code,
        email: form.email,
        password: form.password,
        role_name: form.role,
      })
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

  const inputStyle = {
    width: '100%',
    padding: '10px 16px',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    fontSize: '14px',
    color: '#111827',
    outline: 'none',
    transition: 'all 0.15s',
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
      {/* Panel izquierdo */}
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
            Únete a la
            <br />
            comunidad UFPS
          </h1>
          <p className="text-red-200 text-lg leading-relaxed">
            Crea tu cuenta y empieza a reservar los espacios que necesitas para tus actividades académicas.
          </p>
          <div className="mt-8 space-y-4">
            {[
              { icon: '🎓', text: 'Para estudiantes de todos los programas' },
              { icon: '📚', text: 'Docentes y personal administrativo' },
              { icon: '🔒', text: 'Acceso seguro con autenticación JWT' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-red-100 text-sm">{item.text}</span>
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
      <div className="flex-1 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md py-4">
          <div className="lg:hidden mb-8 flex justify-center">
            <UFPSLogo size="md" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Crear cuenta</h2>
            <p className="text-gray-500 mt-1">Completa tus datos para registrarte</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm"
                style={{ background: '#FDEDEC', color: '#7B241C', border: '1px solid #F1948A' }}
              >
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombres</label>
                <input
                  type="text"
                  placeholder="Juan"
                  value={form.firstName}
                  onChange={update('firstName')}
                  required
                  style={inputStyle}
                  onFocus={focusIn}
                  onBlur={focusOut}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Apellidos</label>
                <input
                  type="text"
                  placeholder="Díaz"
                  value={form.lastName}
                  onChange={update('lastName')}
                  required
                  style={inputStyle}
                  onFocus={focusIn}
                  onBlur={focusOut}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Código universitario
                </label>
                <input
                  type="text"
                  placeholder="1234567"
                  value={form.code}
                  onChange={update('code')}
                  required
                  style={inputStyle}
                  onFocus={focusIn}
                  onBlur={focusOut}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rol</label>
                <select
                  value={form.role}
                  onChange={update('role')}
                  style={{ ...inputStyle, background: 'white', cursor: 'pointer' }}
                  onFocus={focusIn}
                  onBlur={focusOut}
                >
                  {roles.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo institucional
              </label>
              <input
                type="email"
                placeholder="jdiaz@ufps.edu.co"
                value={form.email}
                onChange={update('email')}
                required
                style={inputStyle}
                onFocus={focusIn}
                onBlur={focusOut}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
              <input
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={update('password')}
                required
                style={inputStyle}
                onFocus={focusIn}
                onBlur={focusOut}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirmar contraseña
              </label>
              <input
                type="password"
                placeholder="Repite tu contraseña"
                value={form.confirm}
                onChange={update('confirm')}
                required
                style={inputStyle}
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
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-semibold" style={{ color: '#C0392B' }}>
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
