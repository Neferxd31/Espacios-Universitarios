"use client"

import { useState, useEffect } from 'react'
import { usersApi } from '@/lib/apiClient'
import { getUser, saveSession, getAccessToken, getRefreshToken } from '@/lib/authStorage'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // Cargar desde API para datos frescos
    usersApi.me()
      .then((data) => {
        setUser(data)
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
        })
      })
      .catch(() => {
        // Fallback a localStorage
        const local = getUser()
        if (local) {
          setUser(local)
          setForm({
            first_name: local.first_name || '',
            last_name: local.last_name || '',
            email: local.email || '',
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const updated = await usersApi.updateMe({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
      })
      setUser(updated)
      // Actualizar localStorage con datos nuevos
      saveSession({
        accessToken: getAccessToken(),
        refreshToken: getRefreshToken(),
        user: updated,
      })
      setSuccess('Perfil actualizado correctamente.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const focusIn = (e) => {
    e.target.style.borderColor = '#C0392B'
    e.target.style.boxShadow = '0 0 0 3px rgba(192,57,43,0.1)'
  }
  const focusOut = (e) => {
    e.target.style.borderColor = '#E5E7EB'
    e.target.style.boxShadow = 'none'
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-gray-400 text-sm">Cargando perfil...</div>
      </div>
    )
  }

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : 'U'

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-gray-500 text-sm mt-1">Actualiza tu información personal</p>
      </div>

      {/* Avatar y datos básicos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 flex items-center gap-5">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
          style={{ background: '#FDEDEC', color: '#C0392B' }}
        >
          {initials}
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span
            className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{ background: '#FDEDEC', color: '#C0392B' }}
          >
            {user?.role?.name || 'Sin rol'}
          </span>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-400">Código universitario</p>
          <p className="text-sm font-mono font-semibold text-gray-700">{user?.university_code}</p>
        </div>
      </div>

      {/* Formulario de edición */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-5 uppercase tracking-wide">
          Editar información
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {success && (
            <div
              className="px-4 py-3 rounded-xl text-sm"
              style={{ background: '#D5F5E3', color: '#1E8449', border: '1px solid #A9DFBF' }}
            >
              {success}
            </div>
          )}
          {error && (
            <div
              className="px-4 py-3 rounded-xl text-sm"
              style={{ background: '#FDEDEC', color: '#7B241C', border: '1px solid #F1948A' }}
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombres</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none transition-all"
                onFocus={focusIn}
                onBlur={focusOut}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Apellidos</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none transition-all"
                onFocus={focusIn}
                onBlur={focusOut}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Correo institucional
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none transition-all"
              onFocus={focusIn}
              onBlur={focusOut}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm transition-all"
              style={{ background: saving ? '#922B21' : '#C0392B', opacity: saving ? 0.7 : 1 }}
              onMouseEnter={(e) => !saving && (e.currentTarget.style.background = '#922B21')}
              onMouseLeave={(e) => !saving && (e.currentTarget.style.background = '#C0392B')}
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
