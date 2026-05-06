"use client"

import { useState, useEffect, useCallback } from 'react'
import { reservationsApi, adminUsersApi, spacesApi } from '@/lib/apiClient'

// Configuración visual por estado
const STATUS_CONFIG = {
  pending:   { label: 'Pendiente',   bg: '#FEF9E7', color: '#9A7D0A', dot: '#F0B429' },
  confirmed: { label: 'Confirmada',  bg: '#D5F5E3', color: '#1E8449', dot: '#27AE60' },
  approved:  { label: 'Aprobada',    bg: '#D5F5E3', color: '#1E8449', dot: '#27AE60' },
  rejected:  { label: 'Rechazada',   bg: '#FDEDEC', color: '#C0392B', dot: '#E74C3C' },
  cancelled: { label: 'Cancelada',   bg: '#F3F4F6', color: '#6B7280', dot: '#9CA3AF' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

// Modal de revisión (aprobar / rechazar)
function ReviewModal({ reservation, spaceName, userName, onClose, onDone }) {
  const [action, setAction] = useState('approve')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      await reservationsApi.review(reservation.id, action, notes)
      onDone()
    } catch (err) {
      setError(err.message || 'Error al procesar la revisión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Revisar Reserva</h2>
        <p className="text-sm text-gray-500 mb-1">
          <span className="font-medium text-gray-700">{userName || 'Usuario'}</span>
          {' solicita '}
          <span className="font-medium text-gray-700">{spaceName || 'Espacio'}</span>
        </p>
        <p className="text-xs text-gray-400 mb-4">
          {reservation.reservation_date} · {reservation.start_hour}:00–{reservation.end_hour}:00
        </p>

        {/* Acción */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setAction('approve')}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all"
            style={action === 'approve'
              ? { background: '#D5F5E3', color: '#1E8449', borderColor: '#1E8449' }
              : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }}
          >
            ✓ Aprobar
          </button>
          <button
            onClick={() => setAction('reject')}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all"
            style={action === 'reject'
              ? { background: '#FDEDEC', color: '#C0392B', borderColor: '#C0392B' }
              : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }}
          >
            ✕ Rechazar
          </button>
        </div>

        {/* Notas */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Notas (opcional)
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Motivo de la decisión..."
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 mb-3 font-medium">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: action === 'approve' ? '#1E8449' : '#C0392B', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Procesando...' : action === 'approve' ? 'Aprobar' : 'Rechazar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [dateFilter, setDateFilter] = useState('')
  const [reviewing, setReviewing] = useState(null) // reserva en revisión
  const [usersMap, setUsersMap]   = useState({})   // uuid → { nombre, codigo }
  const [spacesMap, setSpacesMap] = useState({})   // uuid → { nombre, codigo }

  const fetchReservations = useCallback(async () => {
    setLoading(true)
    setApiError('')
    try {
      const params = {}
      if (dateFilter) params.date = dateFilter
      const data = await reservationsApi.adminList(params)
      const list = Array.isArray(data) ? data : []
      setReservations(list)

      // Resolver nombres de usuarios y espacios únicos en paralelo
      const uniqueUserIds  = [...new Set(list.map((r) => r.requester_user_id).filter(Boolean))]
      const uniqueSpaceIds = [...new Set(list.map((r) => r.space_id).filter(Boolean))]

      const [userResults, spaceResults] = await Promise.all([
        Promise.allSettled(uniqueUserIds.map((id) => adminUsersApi.get(id).then((u) => ({ id, u })))),
        Promise.allSettled(uniqueSpaceIds.map((id) => spacesApi.get(id).then((s) => ({ id, s })))),
      ])

      const newUsersMap = {}
      userResults.forEach((r) => {
        if (r.status === 'fulfilled') {
          const { id, u } = r.value
          newUsersMap[id] = {
            name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.username || id,
            code: u.university_code || '',
          }
        }
      })

      const newSpacesMap = {}
      spaceResults.forEach((r) => {
        if (r.status === 'fulfilled') {
          const { id, s } = r.value
          newSpacesMap[id] = {
            name: s.name || id,
            code: s.code || '',
            type: s.space_type || '',
          }
        }
      })

      setUsersMap(newUsersMap)
      setSpacesMap(newSpacesMap)
    } catch (err) {
      setApiError(err.message || 'No se pudo cargar las reservas')
    } finally {
      setLoading(false)
    }
  }, [dateFilter])

  useEffect(() => {
    fetchReservations()
  }, [fetchReservations])

  // Filtrar localmente por búsqueda y estado
  const filtered = reservations.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch =
      !search ||
      r.space_id?.toLowerCase().includes(q) ||
      r.requester_user_id?.toLowerCase().includes(q) ||
      r.reservation_date?.includes(q)

    const statusMap = {
      Pendiente:  'pending',
      Aprobada:   'approved',
      Rechazada:  'rejected',
      Cancelada:  'cancelled',
      Confirmada: 'confirmed',
    }
    const matchStatus =
      statusFilter === 'Todos' || r.status === statusMap[statusFilter]

    return matchSearch && matchStatus
  })

  // Stats
  const pendingCount   = reservations.filter((r) => r.status === 'pending').length
  const approvedCount  = reservations.filter((r) => r.status === 'approved' || r.status === 'confirmed').length
  const rejectedCount  = reservations.filter((r) => r.status === 'rejected').length
  const cancelledCount = reservations.filter((r) => r.status === 'cancelled').length

  const statuses = ['Todos', 'Pendiente', 'Aprobada', 'Rechazada', 'Cancelada', 'Confirmada']

  return (
    <div className="p-8">
      {reviewing && (
        <ReviewModal
          reservation={reviewing}
          userName={usersMap[reviewing.requester_user_id]?.name}
          spaceName={spacesMap[reviewing.space_id]?.name}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); fetchReservations() }}
        />
      )}

      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Supervisión de Reservas</h1>
        <p className="text-gray-500 text-sm mt-1">
          Aprueba, rechaza y monitorea todas las reservas del sistema
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pendientes',  value: pendingCount,   color: '#9A7D0A', sub: 'requieren revisión' },
          { label: 'Aprobadas',   value: approvedCount,  color: '#1E8449', sub: 'confirmadas' },
          { label: 'Rechazadas',  value: rejectedCount,  color: '#C0392B', sub: 'denegadas' },
          { label: 'Canceladas',  value: cancelledCount, color: '#6B7280', sub: 'por el usuario' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Alerta de pendientes */}
      {pendingCount > 0 && (
        <div
          className="flex items-center gap-3 px-5 py-3.5 rounded-2xl mb-6 text-sm font-medium"
          style={{ background: '#FEF9E7', color: '#9A7D0A', border: '1px solid #F9E79F' }}
        >
          <span className="text-lg">⏳</span>
          <span>
            Hay <strong>{pendingCount}</strong> reserva{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de revisión.
          </span>
        </div>
      )}

      {/* Error API */}
      {apiError && (
        <div
          className="mb-6 px-5 py-4 rounded-2xl text-sm"
          style={{ background: '#FDEDEC', color: '#7B241C', border: '1px solid #F1948A' }}
        >
          <strong>Error:</strong> {apiError}
        </div>
      )}

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
              placeholder="Buscar por ID de espacio o usuario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={statusFilter === s ? { background: '#C0392B', color: 'white' } : { color: '#6B7280' }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando reservas...</div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                  {['Usuario', 'Espacio', 'Fecha', 'Horario', 'Estado', 'Notas', 'Solicitud', 'Acciones'].map((h) => (
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
                {filtered.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50 transition-colors"
                    style={{ borderTop: idx > 0 ? '1px solid #F9FAFB' : 'none' }}
                  >
                    <td className="px-5 py-4">
                      {usersMap[r.requester_user_id] ? (
                        <>
                          <p className="text-sm font-semibold text-gray-900 leading-tight">
                            {usersMap[r.requester_user_id].name}
                          </p>
                          {usersMap[r.requester_user_id].code && (
                            <p className="text-xs font-mono text-gray-400">
                              {usersMap[r.requester_user_id].code}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs font-mono text-gray-400 truncate max-w-32">
                          {r.requester_user_id?.substring(0, 8)}…
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {spacesMap[r.space_id] ? (
                        <>
                          <p className="text-sm text-gray-900 font-medium leading-tight">
                            {spacesMap[r.space_id].name}
                          </p>
                          <p className="text-xs font-mono text-gray-400">
                            {spacesMap[r.space_id].code}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs font-mono text-gray-400 truncate max-w-32">
                          {r.space_id?.substring(0, 8)}…
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-700">{r.reservation_date}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-gray-700">
                        {r.start_hour}:00 – {r.end_hour}:00
                      </span>
                      <p className="text-xs text-gray-400">{r.end_hour - r.start_hour}h</p>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-gray-400 line-clamp-1 max-w-28">
                        {r.review_notes || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-gray-400">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString('es-CO') : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {r.status === 'pending' && (
                          <button
                            onClick={() => setReviewing(r)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all text-white"
                            style={{ background: '#C0392B' }}
                          >
                            Revisar
                          </button>
                        )}
                        {r.status !== 'pending' && (
                          <span className="text-xs text-gray-400 italic">
                            {r.reviewed_at ? `Revisada ${new Date(r.reviewed_at).toLocaleDateString('es-CO')}` : ''}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && !loading && (
              <div className="py-16 text-center">
                <p className="text-gray-400">No se encontraron reservas con los filtros aplicados</p>
              </div>
            )}

            <div
              className="px-6 py-3 text-xs text-gray-400 flex items-center justify-between"
              style={{ borderTop: '1px solid #F9FAFB' }}
            >
              <span>Mostrando {filtered.length} de {reservations.length} reservas</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
