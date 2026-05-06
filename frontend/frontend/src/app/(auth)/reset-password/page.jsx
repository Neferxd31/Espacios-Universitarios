"use client"

import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import UFPSLogo from '@/components/UFPSLogo'
import { authApi } from '@/lib/apiClient'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const focusIn = (e) => {
    e.target.style.borderColor = '#C0392B'
    e.target.style.boxShadow = '0 0 0 3px rgba(192,57,43,0.1)'
  }
  const focusOut = (e) => {
    e.target.style.borderColor = '#E5E7EB'
    e.target.style.boxShadow = 'none'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword(token, form.password)
      setDone(true)
      setTimeout(() => router.replace('/login'), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-red-600 text-sm mb-4">Enlace inválido o expirado.</p>
        <Link href="/forgot-password" className="font-semibold text-sm" style={{ color: '#C0392B' }}>
          Solicitar nuevo enlace
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: '#D5F5E3' }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M5 14l6 6L23 8" stroke="#1E8449" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Contraseña actualizada</h2>
        <p className="text-gray-500 text-sm">Redirigiendo al inicio de sesión...</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Nueva contraseña</h2>
        <p className="text-gray-500 text-sm mt-1">
          Elige una contraseña segura de al menos 8 caracteres.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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
            Nueva contraseña
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-sm transition-all outline-none"
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
            placeholder="••••••••"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-sm transition-all outline-none"
            onFocus={focusIn}
            onBlur={focusOut}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all"
          style={{ background: loading ? '#922B21' : '#C0392B', opacity: loading ? 0.7 : 1 }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#922B21')}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#C0392B')}
        >
          {loading ? 'Guardando...' : 'Restablecer contraseña'}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-10">
        <div className="flex justify-center mb-8">
          <UFPSLogo size="md" />
        </div>
        <Suspense fallback={<p className="text-center text-gray-400 text-sm">Cargando...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
