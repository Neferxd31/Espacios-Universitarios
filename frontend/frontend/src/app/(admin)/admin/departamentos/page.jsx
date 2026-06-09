"use client"

import { useState, useEffect, useCallback } from 'react'
import { areasApi, adminUsersApi } from '@/lib/apiClient'

const TIPO_OPTIONS = [
  { value: 'departamento', label: 'Departamento' },
  { value: 'unidad', label: 'Unidad' },
  { value: 'dependencia', label: 'Dependencia' },
]

const TIPO_COLORS = {
  departamento: { bg: '#EBF5FB', color: '#1A5276', border: '#AED6F1' },
  unidad:       { bg: '#EAFAF1', color: '#1E8449', border: '#A9DFBF' },
  dependencia:  { bg: '#FEF9E7', color: '#9A7D0A', border: '#F9E79F' },
}

const EMPTY_FORM = {
  code: '',
  name: '',
  description: '',
  area_type: 'departamento',
  responsible_user_id: '',
  sort_order: 0,
}

function TipoBadge({ tipo }) {
  const c = TIPO_COLORS[tipo] || TIPO_COLORS.departamento
  const label = TIPO_OPTIONS.find((o) => o.value === tipo)?.label || tipo
  return (
    <span
      className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
    >
      {label}
    </span>
  )
}

export default function DepartamentosPage() {
  const [areas, setAreas] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tipoFilter, setTipoFilter] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [editArea, setEditArea] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Cargar lista de usuarios para el selector de responsable
  useEffect(() => {
    adminUsersApi.list({ is_active: 'true' })
      .then((data) => setUsers(data.results || data))
      .catch(() => {})
  }, [])

  const fetchAreas = useCallback(async () => {
    setLoading(true)
    setActionError('')
    try {
      const params = {}
      if (tipoFilter !== 'Todos') params.type = tipoFilter
      const data = await areasApi.list(params)
      setAreas(Array.isArray(data) ? data : data.results || [])
    } catch (err) {
      setActionError('Error al cargar dependencias: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [tipoFilter])

  useEffect(() => {
    fetchAreas()
  }, [fetchAreas])

  const openCreate = () => {
    setEditArea(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (area) => {
    setEditArea(area)
    setForm({
      code: area.code,
      name: area.name,
      description: area.description || '',
      area_type: area.area_type || 'departamento',
      responsible_user_id: area.responsible_user_id || '',
      sort_order: area.sort_order ?? 0,
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
        responsible_user_id: form.responsible_user_id || null,
        sort_order: Number(form.sort_order) || 0,
      }
      if (editArea) {
        await areasApi.update(editArea.id, payload)
      } else {
        await areasApi.create(payload)
      }
      setShowModal(false)
      fetchAreas()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await areasApi.delete(deleteConfirm.id)
      setDeleteConfirm(null)
      fetchAreas()
    } catch (err) {
      setActionError(err.message)
      setDeleteConfirm(null)
    } finally {
      setDeleting(false)
    }
  }

  // Resolver nombre del responsable desde la lista de usuarios en memoria
  const getResponsibleName = (userId) => {
    if (!userId) return '—'
    const u = users.find((u) => u.id === userId)
    return u ? `${u.first_name} ${u.last_name}` : userId.substring(0, 8) + '...'
  }

  const stats = {
    total: areas.length,
    departamentos: areas.filter((a) => a.area_type === 'departamento').length,
    unidades: areas.filter((a) => a.area_type === 'unidad').length,
    dependencias: areas.filter((a) => a.area_type === 'dependencia').length,
  }

  return (
    <div className="p-4 sm:p-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestión de Dependencias</h1>
          <p className="text-gray-500 text-sm mt-1">
            Registra los departamentos, unidades y dependencias responsables de los espacios
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all w-full sm:w-auto"
          style={{ background: '#C0392B' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#922B21')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#C0392B')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Nueva dependencia
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

      {/* Estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: 'Total', value: stats.total, color: '#1A1A2E' },
          { label: 'Departamentos', value: stats.departamentos, color: '#1A5276' },
          { label: 'Unidades', value: stats.unidades, color: '#1E8449' },
          { label: 'Dependencias', value: stats.dependencias, color: '#9A7D0A' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
            <p className="text-xs sm:text-sm text-gray-500 leading-tight">{s.label}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros por tipo */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex gap-2 items-center overflow-x-auto">
          <span className="text-sm text-gray-500 mr-2 font-medium flex-shrink-0">Tipo:</span>
          {['Todos', 'Departamento', 'Unidad', 'Dependencia'].map((t) => (
            <button
              key={t}
              onClick={() => setTipoFilter(t === 'Todos' ? 'Todos' : t.toLowerCase())}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0"
              style={
                (t === 'Todos' ? tipoFilter === 'Todos' : tipoFilter === t.toLowerCase())
                  ? { background: '#C0392B', color: 'white' }
                  : { background: '#F3F4F6', color: '#6B7280' }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando dependencias...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          {areas.length === 0 ? (
            <div className="py-16 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: '#FDEDEC' }}
              >
                <span className="text-2xl">🏢</span>
              </div>
              <p className="text-gray-500 font-medium">No hay dependencias registradas</p>
              <button
                onClick={openCreate}
                className="mt-4 px-5 py-2 rounded-xl text-white text-sm font-semibold"
                style={{ background: '#C0392B' }}
              >
                Registrar primera dependencia
              </button>
            </div>
          ) : (
            <table className="w-full min-w-[700px]">
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Código', 'Nombre', 'Tipo', 'Responsable (Jefe)', 'Descripción', 'Acciones'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {areas.map((area, idx) => (
                  <tr key={area.id} style={{ background: idx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm font-semibold text-gray-700">
                        {area.code}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-900">{area.name}</p>
                    </td>
                    <td className="px-5 py-4">
                      <TipoBadge tipo={area.area_type} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {area.responsible_user_id ? (
                          <>
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: '#EBF5FB', color: '#1A5276' }}
                            >
                              {getResponsibleName(area.responsible_user_id).charAt(0)}
                            </div>
                            <span className="text-sm text-gray-700">
                              {getResponsibleName(area.responsible_user_id)}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Sin asignar</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {area.description || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(area)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-all"
                          style={{ borderColor: '#AED6F1', color: '#1A5276' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#EBF5FB')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(area)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-all"
                          style={{ borderColor: '#F1948A', color: '#C0392B' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#FDEDEC')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal Crear / Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editArea ? 'Editar dependencia' : 'Registrar dependencia'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div
                  className="px-4 py-3 rounded-xl text-sm"
                  style={{ background: '#FDEDEC', color: '#7B241C', border: '1px solid #F1948A' }}
                >
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Código <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="ej: ing-sistemas"
                    required
                    disabled={!!editArea}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.area_type}
                    onChange={(e) => setForm({ ...form, area_type: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-white"
                  >
                    {TIPO_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ej: Departamento de Ingeniería de Sistemas"
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Responsable / Jefe
                </label>
                <select
                  value={form.responsible_user_id}
                  onChange={(e) => setForm({ ...form, responsible_user_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-white"
                >
                  <option value="">— Sin asignar —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.university_code}) — {u.role?.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Solo usuarios activos del sistema. El jefe podrá gestionar los espacios de esta dependencia.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Descripción
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción o propósito de la dependencia..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
                  style={{ background: saving ? '#922B21' : '#C0392B', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Guardando...' : editArea ? 'Guardar cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal eliminar */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#FDEDEC' }}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M14 9v6M14 18v1" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" />
                <circle cx="14" cy="14" r="11" stroke="#C0392B" strokeWidth="1.5" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar dependencia?</h3>
            <p className="text-gray-500 text-sm mb-1">
              <strong>{deleteConfirm.name}</strong>
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Solo se puede eliminar si no tiene espacios activos asignados.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-all"
                style={{ background: deleting ? '#922B21' : '#C0392B', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
