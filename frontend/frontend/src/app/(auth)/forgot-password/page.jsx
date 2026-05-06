"use client"

import Link from 'next/link'
import { useState } from 'react'
import UFPSLogo from '@/components/UFPSLogo'
import { authApi } from '@/lib/apiClient'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    setLoading(true)
    try {
      await authApi.forgotPassword(email.trim().toLowerCase())
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-10">
        <div className="flex justify-center mb-8">
          <UFPSLogo size="md" />
        </div>

        {sent ? (
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#D5F5E3' }}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M5 14l6 6L23 8" stroke="#1E8449" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Revisa tu correo</h2>
            <p className="text-gray-500 text-sm mb-6">
              Si <strong>{email}</strong> está registrado, recibirás un enlace para restablecer tu contraseña.
            </p>
            <Link
              href="/login"
              className="text-sm font-semibold"
              style={{ color: '#C0392B' }}
            >
              ← Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">¿Olvidaste tu contraseña?</h2>
              <p className="text-gray-500 text-sm mt-1">
                Ingresa tu correo institucional y te enviaremos un enlace de recuperación.
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
                  Correo institucional
                </label>
                <input
                  type="email"
                  placeholder="usuario@ufps.edu.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-6">
              <Link href="/login" className="font-semibold" style={{ color: '#C0392B' }}>
                ← Volver al inicio de sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
