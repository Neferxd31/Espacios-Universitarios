"use client"

import { useState, useEffect, useCallback } from 'react'
import { spacesApi } from '@/lib/apiClient'

const DAYS = [
  { value: 0, label: 'Lunes' },
  { value: 1, label: 'Martes' },
  { value: 2, label: 'Miércoles' },
  { value: 3, label: 'Jueves' },
  { value: 4, label: 'Viernes' },
  { value: 5, label: 'Sábado' },
  { value: 6, label: 'Domingo' },
]

const dayLabel = (v) => DAYS.find((d) => d.value === v)?.label || v

export default function AdminHorariosPage() {
  const [spaces, setSpaces] = useState([])
  const [selectedSpace, setSelectedSpace] = useState(null)
  const [horarios, setHorarios] = useState([])
  const [loadingSpaces, setLoadingSpaces] = useState(true)
  const [loadingHorarios, setLoadingHorarios] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  // Estado del editor — lista editable de horarios
  const [draft, setDraft] = useState([])

  useEffect(() => {
    spacesApi.list({ include_inactive: 'true' })
      .then((data) => setSpaces(data.results || data))
      .catch(() => setSpaces([]))
      .finally(() => setLoadingSpaces(false))
  }, [])

  const loadHorarios = useCallback(async (space) => {
    setLoadingHorarios(true)
    setError('')
    setSuccess('')
    try {
      const data = await spacesApi.getHorarios(space.id)
      setHorarios(data)
      setDraft(data.map((h) => ({ ...h })))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingHorarios(false)
    }
  }, [])

  const handleSelectSpace = (space) => {
    setSelectedSpace(space)
    loadHorarios(space)
  }

  const addHorario = () => {
    setDraft([...draft, { day_of_week: 0, opens_at: '07:00', closes_at: '17:00', _new: true }])
  }

  const removeHorario = (idx) => {
    setDraft(draft.filter((_, i) => i !== idx))
  }

  const updateHorario = (idx, field, value) => {
    setDraft(draft.map((h, i) => (i === idx ? { ...h, [field]: value } : h)))
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const payload = draft.map(({ day_of_week, opens_at, closes_at }) => ({
        day_of_week,
        opens_at,
        closes_at,
      }))
      const updated = await spacesApi.replaceHorarios(selectedSpace.id, payload)
      setHorarios(updated)
      setDraft(updated.map((h) => ({ ...h })))
      setSuccess('Horarios actualizados correctamente.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Horarios</h1>
        <p className="text-gray-500 text-sm mt-1">
          Define los horarios de operación de cada espacio universitario
        </p>
      </div>

      <div className="flex gap-6">
        {/* Panel izquierdo — lista de espacios */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Espacios</p>
            </div>
            {loadingSpaces ? (
              <div className="py-8 text-center text-gray-400 text-sm">Cargando...</div>
            ) : spaces.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">Sin espacios</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {spaces.map((space) => (
                  <button
                    key={space.id}
                    onClick={() => handleSelectSpace(space)}
                    className="w-full text-left px-4 py-3 transition-colors hover:bg-gray-50"
                    style={
                      selectedSpace?.id === space.id
                        ? { background: '#FDEDEC', borderLeft: '3px solid #C0392B' }
                        : {}
                    }
                  >
                    <p
                      className="text-sm font-semibold"
                      style={{ color: selectedSpace?.id === space.id ? '#C0392B' : '#111827' }}
                    >
                      {space.name}
                    </p>
                    <p className="text-xs text-gray-400">{space.code}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho — editor de horarios */}
        <div className="flex-1">
          {!selectedSpace ? (
            <div
              className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center"
              style={{ minHeight: 320 }}
            >
              <div className="text-center">
                <p className="text-4xl mb-3">🕐</p>
                <p className="text-gray-500 text-sm">Selecciona un espacio para ver sus horarios</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedSpace.name}</h2>
                  <p className="text-sm text-gray-400">{selectedSpace.code}</p>
                </div>
                <button
                  onClick={addHorario}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-white text-sm font-medium transition-all"
                  style={{ background: '#C0392B' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#922B21')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#C0392B')}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  Agregar horario
                </button>
              </div>

              {error && (
                <div
                  className="mb-4 px-4 py-3 rounded-xl text-sm"
                  style={{ background: '#FDEDEC', color: '#7B241C', border: '1px solid #F1948A' }}
                >
                  {error}
                </div>
              )}
              {success && (
                <div
                  className="mb-4 px-4 py-3 rounded-xl text-sm"
                  style={{ background: '#D5F5E3', color: '#1E8449', border: '1px solid #A9DFBF' }}
                >
                  {success}
                </div>
              )}

              {loadingHorarios ? (
                <div className="py-8 text-center text-gray-400 text-sm">Cargando horarios...</div>
              ) : (
                <>
                  {draft.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-sm">
                      No hay horarios definidos. Agrega uno con el botón de arriba.
                    </div>
                  ) : (
                    <div className="space-y-3 mb-6">
                      {draft.map((h, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50"
                        >
                          <div className="flex-1 grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Día</label>
                              <select
                                value={h.day_of_week}
                                onChange={(e) => updateHorario(idx, 'day_of_week', parseInt(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-red-400"
                              >
                                {DAYS.map((d) => (
                                  <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Apertura</label>
                              <input
                                type="time"
                                value={h.opens_at?.slice(0, 5) || ''}
                                onChange={(e) => updateHorario(idx, 'opens_at', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-red-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Cierre</label>
                              <input
                                type="time"
                                value={h.closes_at?.slice(0, 5) || ''}
                                onChange={(e) => updateHorario(idx, 'closes_at', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-red-400"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => removeHorario(idx)}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm transition-all"
                      style={{ background: saving ? '#922B21' : '#C0392B', opacity: saving ? 0.7 : 1 }}
                      onMouseEnter={(e) => !saving && (e.currentTarget.style.background = '#922B21')}
                      onMouseLeave={(e) => !saving && (e.currentTarget.style.background = '#C0392B')}
                    >
                      {saving ? 'Guardando...' : 'Guardar horarios'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
