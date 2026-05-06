"use client"

import { useState, useEffect, useCallback } from 'react'
import { adminUsersApi } from '@/lib/apiClient'

const ROLES = ['Todos', 'Estudiante', 'Docente', 'Administrativo', 'Admin']

const roleColors = {
  Estudiante: { bg: '#EBF5FB', color: '#1A5276' },
  Docente: { bg: '#EAFAF1', color: '#1E8449' },
  Administrativo: { bg: '#FEF9E7', color: '#9A7D0A' },
  Admin: { bg: '#FDEDEC', color: '#C0392B' },
}

function Avatar({ name }) {
  const initials = (name || 'U U').split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{ background: '#FDEDEC', color: '#C0392B' }}
    >
      {initials}
    </div>
  )
}

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  university_code: '',
  password: '',
  role_name: 'Estudiante',
  is_active: true,
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('Todos')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (roleFilter !== 'Todos') params.role = roleFilter
      if (statusFilter === 'Activo') params.is_active = 'true'
      if (statusFilter === 'Inactivo') params.is_active = 'false'
      const data = await adminUsersApi.list(params)
      setUsers(data.results || data)
      setTotal(data.count ?? (data.results?.length ?? (Array.isArray(data) ? data.length : 0)))
    } catch (err) {
      setUsers([])
      setActionError('Error al cargar usuarios: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, statusFilter])

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300)
    return () => clearTimeout(t)
  }, [fetchUsers])

  const openCreate = () => {
    setEditUser(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (user) => {
    setEditUser(user)
    setForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      university_code: user.university_code,
      password: '',
      role_name: user.role?.name || 'Estudiante',
      is_active: user.is_active,
    })
    setFormError('')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      if (editUser) {
        const payload = {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          role_name: form.role_name,
          is_active: form.is_active,
        }
        await adminUsersApi.update(editUser.id, payload)
      } else {
        await adminUsersApi.create(form)
      }
      setShowModal(false)
      fetchUsers()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (user) => {
    setActionError('')
    try {
      if (user.is_active) {
        await adminUsersApi.deactivate(user.id)
      } else {
        await adminUsersApi.update(user.id, { is_active: true })
      }
      fetchUsers()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const stats = {
    total,
    estudiantes: users.filter((u) => u.role?.name === 'Estudiante').length,
    docentes: users.filter((u) => u.role?.name === 'Docente').length,
    inactivos: users.filter((u) => !u.is_active).length,
  }

  return (
    <div className="p-8">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">Administra los usuarios registrados en el sistema</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
          style={{ background: '#C0392B' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#922B21')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#C0392B')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      {actionError && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: '#FDEDEC', color: '#7B241C', border: '1px solid #F1948A' }}
        >
          {actionError}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total usuarios', value: stats.total, color: '#1A1A2E' },
          { label: 'Estudiantes', value: stats.estudiantes, color: '#1A5276' },
          { label: 'Docentes', value: stats.docentes, color: '#1E8449' },
          { label: 'Inactivos', value: stats.inactivos, color: '#C0392B' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, código o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={roleFilter === r ? { background: '#C0392B', color: 'white' } : { color: '#6B7280' }}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {['Todos', 'Activo', 'Inactivo'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={statusFilter === s ? { background: '#C0392B', color: 'white' } : { color: '#6B7280' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Usuario</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Código</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Rol</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Estado</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Registro</th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-gray-400 text-sm">Cargando...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-gray-400 text-sm">No se encontraron usuarios</td>
              </tr>
            ) : (
              users.map((user, idx) => {
                const roleName = user.role?.name || 'Estudiante'
                const rc = roleColors[roleName] || { bg: '#F3F4F6', color: '#374151' }
                return (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-gray-50"
                    style={{ borderTop: idx > 0 ? '1px solid #F9FAFB' : 'none' }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${user.first_name} ${user.last_name}`} />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-600">{user.university_code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: rc.bg, color: rc.color }}
                      >
                        {roleName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={
                          user.is_active
                            ? { background: '#D5F5E3', color: '#1E8449' }
                            : { background: '#F3F4F6', color: '#9CA3AF' }
                        }
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ background: user.is_active ? '#1E8449' : '#9CA3AF' }}
                        />
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('es-CO') : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
                          style={
                            user.is_active
                              ? { borderColor: '#F1948A', color: '#C0392B' }
                              : { borderColor: '#A9DFBF', color: '#1E8449' }
                          }
                        >
                          {user.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <div
          className="px-6 py-3 text-xs text-gray-400"
          style={{ borderTop: '1px solid #F9FAFB' }}
        >
          Mostrando {users.length} de {total} usuarios
        </div>
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              {editUser ? 'Editar usuario' : 'Nuevo usuario'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              {formError && (
                <div
                  className="px-4 py-3 rounded-xl text-sm"
                  style={{ background: '#FDEDEC', color: '#7B241C', border: '1px solid #F1948A' }}
                >
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombres</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Apellidos</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo institucional</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </div>

              {!editUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Código universitario</label>
                  <input
                    type="text"
                    value={form.university_code}
                    onChange={(e) => setForm({ ...form, university_code: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                </div>
              )}

              {!editUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rol</label>
                <select
                  value={form.role_name}
                  onChange={(e) => setForm({ ...form, role_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                >
                  {['Estudiante', 'Docente', 'Administrativo', 'Admin'].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {editUser && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="accent-red-600 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Usuario activo</span>
                </label>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-all"
                  style={{ background: saving ? '#922B21' : '#C0392B', opacity: saving ? 0.7 : 1 }}
                  onMouseEnter={(e) => !saving && (e.currentTarget.style.background = '#922B21')}
                  onMouseLeave={(e) => !saving && (e.currentTarget.style.background = '#C0392B')}
                >
                  {saving ? 'Guardando...' : editUser ? 'Guardar cambios' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
