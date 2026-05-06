"use client"

import { useState, useEffect, useCallback } from 'react'
import { spacesApi } from '@/lib/apiClient'

const TYPES = ['Todos', 'Aula', 'Laboratorio', 'Auditorio', 'Sala']

const typeColors = {
  Aula: { bg: '#EBF5FB', color: '#1A5276', border: '#AED6F1' },
  Laboratorio: { bg: '#EAFAF1', color: '#1E8449', border: '#A9DFBF' },
  Auditorio: { bg: '#FEF9E7', color: '#9A7D0A', border: '#F9E79F' },
  Sala: { bg: '#F5EEF8', color: '#6C3483', border: '#D2B4DE' },
}

const statusLabels = {
  operational: { label: 'Operacional', bg: '#D5F5E3', color: '#1E8449' },
  maintenance: { label: 'Mantenimiento', bg: '#FDEDEC', color: '#C0392B' },
  inactive: { label: 'Inactivo', bg: '#F3F4F6', color: '#9CA3AF' },
}

const ROLES_OPTIONS = ['Estudiante', 'Docente', 'Administrativo', 'Admin']

const EMPTY_FORM = {
  name: '',
  code: '',
  description: '',
  space_type: 'Aula',
  capacity: '',
  floor: '',
  area_id: '',
  status: 'operational',
  allowed_roles: [],
}

export default function AdminSpacesPage() {
  const [spaces, setSpaces] = useState([])
  const [total, setTotal] = useState(0)
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [editSpace, setEditSpace] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  // Cargar áreas una vez
  useEffect(() => {
    spacesApi.listAreas().then((data) => setAreas(Array.isArray(data) ? data : data.results || [])).catch(() => {})
  }, [])

  const fetchSpaces = useCallback(async () => {
    setLoading(true)
    try {
      const params = { include_inactive: 'true' }
      if (search) params.search = search
      if (typeFilter !== 'Todos') params.type = typeFilter
      const data = await spacesApi.list(params)
      setSpaces(data.results || data)
      setTotal(data.count ?? (data.results?.length ?? (Array.isArray(data) ? data.length : 0)))
    } catch {
      setSpaces([])
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter])

  useEffect(() => {
    const t = setTimeout(fetchSpaces, 300)
    return () => clearTimeout(t)
  }, [fetchSpaces])

  const openCreate = () => {
    setEditSpace(null)
    setForm({ ...EMPTY_FORM, area_id: areas[0]?.id || '' })
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (space) => {
    setEditSpace(space)
    setForm({
      name: space.name,
      code: space.code,
      description: space.description || '',
      space_type: space.space_type || 'Aula',
      capacity: space.capacity,
      floor: space.floor || '',
      area_id: space.area?.id || '',
      status: space.status,
      allowed_roles: space.allowed_roles || [],
    })
    setFormError('')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const payload = {
        ...form,
        capacity: parseInt(form.capacity) || 0,
        floor: form.floor ? parseInt(form.floor) : null,
      }
      if (editSpace) {
        await spacesApi.update(editSpace.id, payload)
      } else {
        await spacesApi.create(payload)
      }
      setShowModal(false)
      fetchSpaces()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (space) => {
    setActionError('')
    if (!confirm(`¿Desactivar "${space.name}"?`)) return
    try {
      await spacesApi.delete(space.id)
      fetchSpaces()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const toggleRole = (role) => {
    setForm((f) => ({
      ...f,
      allowed_roles: f.allowed_roles.includes(role)
        ? f.allowed_roles.filter((r) => r !== role)
        : [...f.allowed_roles, role],
    }))
  }

  const stats = {
    total,
    aulas: spaces.filter((s) => s.space_type === 'Aula').length,
    laboratorios: spaces.filter((s) => s.space_type === 'Laboratorio').length,
    mantenimiento: spaces.filter((s) => s.status === 'maintenance').length,
  }

  return (
    <div className="p-8">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Espacios</h1>
          <p className="text-gray-500 text-sm mt-1">Administra el inventario de espacios universitarios</p>
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
          Agregar espacio
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
          { label: 'Total espacios', value: stats.total, color: '#1A1A2E' },
          { label: 'Aulas', value: stats.aulas, color: '#1A5276' },
          { label: 'Laboratorios', value: stats.laboratorios, color: '#1E8449' },
          { label: 'En mantenimiento', value: stats.mantenimiento, color: '#C0392B' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={typeFilter === t ? { background: '#C0392B', color: 'white' } : { color: '#6B7280' }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
              {['Espacio', 'Código', 'Área', 'Tipo', 'Capacidad', 'Estado', 'Acciones'].map((h) => (
                <th
                  key={h}
                  className={`text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-4 ${h === 'Acciones' ? 'text-right' : ''}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-400 text-sm">Cargando...</td>
              </tr>
            ) : spaces.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-400 text-sm">No se encontraron espacios</td>
              </tr>
            ) : (
              spaces.map((space, idx) => {
                const tc = typeColors[space.space_type] || typeColors.Aula
                const st = statusLabels[space.status] || statusLabels.inactive
                return (
                  <tr
                    key={space.id}
                    className="hover:bg-gray-50 transition-colors"
                    style={{ borderTop: idx > 0 ? '1px solid #F9FAFB' : 'none' }}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-900">{space.name}</p>
                      {space.description && (
                        <p className="text-xs text-gray-400 max-w-xs truncate">{space.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-mono text-gray-600">{space.code}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600">{space.area?.name || '—'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}
                      >
                        {space.space_type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600">{space.capacity} personas</span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: st.bg, color: st.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: st.color }} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(space)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Editar
                        </button>
                        {space.is_active !== false && (
                          <button
                            onClick={() => handleDelete(space)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
                            style={{ borderColor: '#F1948A', color: '#C0392B' }}
                          >
                            Desactivar
                          </button>
                        )}
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
          Mostrando {spaces.length} de {total} espacios
        </div>
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              {editSpace ? 'Editar espacio' : 'Agregar espacio'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Aula 101"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Código</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                    placeholder="SB-101"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Descripción opcional del espacio"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
                  <select
                    value={form.space_type}
                    onChange={(e) => setForm({ ...form, space_type: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  >
                    {['Aula', 'Laboratorio', 'Auditorio', 'Sala'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Capacidad</label>
                  <input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    required
                    placeholder="40"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Piso</label>
                  <input
                    type="number"
                    min={0}
                    value={form.floor}
                    onChange={(e) => setForm({ ...form, floor: e.target.value })}
                    placeholder="1"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  >
                    <option value="operational">Operacional</option>
                    <option value="maintenance">Mantenimiento</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Área</label>
                <select
                  value={form.area_id}
                  onChange={(e) => setForm({ ...form, area_id: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                >
                  <option value="">Seleccionar área...</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                  ))}
                </select>
              </div>

              {/* Roles permitidos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roles con acceso{' '}
                  <span className="text-gray-400 font-normal">(dejar vacío = todos)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROLES_OPTIONS.map((role) => {
                    const selected = form.allowed_roles.includes(role)
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        className="text-xs font-medium px-3 py-1.5 rounded-full border transition-all"
                        style={
                          selected
                            ? { background: '#C0392B', color: 'white', borderColor: '#C0392B' }
                            : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }
                        }
                      >
                        {role}
                      </button>
                    )
                  })}
                </div>
              </div>

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
                  {saving ? 'Guardando...' : editSpace ? 'Guardar cambios' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
