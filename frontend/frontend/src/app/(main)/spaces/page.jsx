"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { reservationsApi, spacesApi } from '@/lib/apiClient'

const typeColors = {
  Aula:        { bg: '#EBF5FB', color: '#1A5276', border: '#AED6F1' },
  Laboratorio: { bg: '#EAFAF1', color: '#1E8449', border: '#A9DFBF' },
  Auditorio:   { bg: '#FEF9E7', color: '#9A7D0A', border: '#F9E79F' },
  Sala:        { bg: '#F5EEF8', color: '#6C3483', border: '#D2B4DE' },
}

function FallbackIcon({ type }) {
  const base = "absolute inset-0 flex items-center justify-center"
  if (type === 'Laboratorio') {
    return (
      <div className={base}>
        <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
          <path d="M11 8h10M13 8v6l-4 8h14l-4-8V8" stroke="#1E8449" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )
  }
  if (type === 'Auditorio') {
    return (
      <div className={base}>
        <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
          <path d="M6 24h20M8 24V16l8-6 8 6v8" stroke="#9A7D0A" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    )
  }
  return (
    <div className={base}>
      <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
        <rect x="7" y="10" width="18" height="14" rx="2" stroke="#1A5276" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

export default function SpacesPage() {
  const [spaces, setSpaces] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  // Filtros básicos
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('Todos')
  const [statusFilter, setStatusFilter] = useState('Todos')

  // HU-8 — filtros avanzados
  const [showAdv, setShowAdv] = useState(false)
  const [minCapacity, setMinCapacity] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [startHour, setStartHour] = useState('')
  const [endHour, setEndHour] = useState('')
  const [busyIds, setBusyIds] = useState(new Set())

  const fetchSpaces = useCallback(async () => {
    setLoading(true)
    setApiError('')
    try {
      const params = { page_size: 100 }
      if (search) params.search = search
      if (typeFilter !== 'Todos') params.type = typeFilter
      if (statusFilter === 'Mantenimiento') params.status = 'maintenance'
      if (minCapacity) params.min_capacity = minCapacity

      const data = await spacesApi.list(params)
      setSpaces(data.results || data)
      setTotal(data.count ?? (data.results?.length ?? (Array.isArray(data) ? data.length : 0)))
    } catch (err) {
      setSpaces([])
      setApiError(err.message || 'No se pudo conectar con el servicio de espacios.')
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, statusFilter, minCapacity])

  useEffect(() => {
    const t = setTimeout(fetchSpaces, 300)
    return () => clearTimeout(t)
  }, [fetchSpaces])

  // HU-8: si hay fecha + rango horas, cruzar con reservations.busy-spaces
  useEffect(() => {
    if (!dateFilter || !startHour || !endHour) {
      setBusyIds(new Set())
      return
    }
    reservationsApi
      .busySpaces(dateFilter, Number(startHour), Number(endHour))
      .then((data) => setBusyIds(new Set(data.busy_space_ids || [])))
      .catch(() => setBusyIds(new Set()))
  }, [dateFilter, startHour, endHour])

  const visible = useMemo(() => {
    if (busyIds.size === 0) return spaces
    return spaces.filter((s) => !busyIds.has(s.id))
  }, [spaces, busyIds])

  const types = ['Todos', 'Aula', 'Laboratorio', 'Auditorio', 'Sala']
  const statuses = ['Todos', 'Disponible', 'Mantenimiento']
  const hasAdvFilters = dateFilter || startHour || endHour || minCapacity

  return (
    <div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Catálogo de Espacios</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Consulta la disponibilidad y reserva el espacio que necesitas
            </p>
          </div>
          <button
            onClick={() => setShowAdv((v) => !v)}
            className="px-4 py-2 rounded-xl text-sm font-medium border hover:bg-gray-50 w-full sm:w-auto"
            style={hasAdvFilters ? { background: '#C0392B', color: 'white', border: 'none' } : {}}
          >
            {showAdv ? '✕ Cerrar filtros' : hasAdvFilters ? `✓ Filtros activos` : '⚙ Filtros avanzados'}
          </button>
        </div>

        {/* Barra principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div className="flex gap-2 flex-wrap overflow-x-auto -mx-1 px-1">
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-shrink-0">
                {types.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap"
                    style={typeFilter === t ? { background: '#C0392B', color: 'white' } : { color: '#6B7280' }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-shrink-0">
                {statuses.map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap"
                    style={statusFilter === st ? { background: '#C0392B', color: 'white' } : { color: '#6B7280' }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* HU-8 — Panel de filtros avanzados */}
        {showAdv && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Disponibilidad en una franja específica
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Labeled label="Fecha">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                />
              </Labeled>
              <Labeled label="Desde (hora)">
                <input
                  type="number"
                  min={0} max={23}
                  placeholder="08"
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                />
              </Labeled>
              <Labeled label="Hasta (hora)">
                <input
                  type="number"
                  min={1} max={24}
                  placeholder="10"
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                />
              </Labeled>
              <Labeled label="Capacidad mínima">
                <input
                  type="number"
                  min={1}
                  placeholder="ej: 30"
                  value={minCapacity}
                  onChange={(e) => setMinCapacity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                />
              </Labeled>
            </div>
            {dateFilter && startHour && endHour && (
              <p className="text-xs text-gray-500 mt-3">
                Mostrando espacios libres el <b>{dateFilter}</b> entre las <b>{startHour}:00</b> y las <b>{endHour}:00</b>.
              </p>
            )}
            <button
              onClick={() => {
                setDateFilter(''); setStartHour(''); setEndHour(''); setMinCapacity('')
              }}
              className="mt-3 text-xs text-gray-500 underline"
            >
              Limpiar filtros avanzados
            </button>
          </div>
        )}

        {apiError && (
          <div className="mb-6 px-5 py-4 rounded-2xl text-sm bg-red-50 border border-red-200 text-red-700">
            <p className="font-semibold">No se pudo cargar el catálogo.</p>
            <code className="block text-xs mt-1 opacity-70">{apiError}</code>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando espacios...</div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {visible.length} de {total} espacios mostrados
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {visible.map((space) => {
                const tc = typeColors[space.space_type] || typeColors.Aula
                const isOp = space.status === 'operational'
                return (
                  <div
                    key={space.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5"
                  >
                    {/* HU-6: imagen del espacio */}
                    <div className="relative h-40 bg-gray-100 overflow-hidden" style={{ background: tc.bg }}>
                      {space.image_url ? (
                        <img
                          src={space.image_url}
                          alt={space.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <FallbackIcon type={space.space_type} />
                      )}
                      {space.floor != null && (
                        <span className="absolute top-3 left-3 text-xs font-medium text-gray-700 bg-white/90 px-2 py-0.5 rounded-full">
                          Piso {space.floor}
                        </span>
                      )}
                      <span
                        className="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={isOp ? { background: '#D5F5E3', color: '#1E8449' } : { background: '#FDEDEC', color: '#C0392B' }}
                      >
                        {isOp ? 'Disponible' : 'Mantenimiento'}
                      </span>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{space.name}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {space.area?.code?.toUpperCase()}-{space.code}
                          </p>
                        </div>
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                          style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}
                        >
                          {space.space_type}
                        </span>
                      </div>

                      {space.description && (
                        <p className="text-xs text-gray-400 mt-1 mb-2 line-clamp-2">{space.description}</p>
                      )}

                      <div className="flex items-center gap-1.5 mt-3 mb-3">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="5" r="2.5" stroke="#9CA3AF" strokeWidth="1.2" />
                          <path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        <span className="text-xs text-gray-500">
                          Capacidad: <span className="font-semibold text-gray-700">{space.capacity} personas</span>
                        </span>
                      </div>

                      {space.area?.name && (
                        <p className="text-xs text-gray-400 mb-3">{space.area.name}</p>
                      )}

                      <Link href={`/spaces/${space.id}`}>
                        <button
                          className="w-full py-2 rounded-xl text-sm font-semibold transition-all"
                          style={
                            isOp
                              ? { background: '#C0392B', color: 'white' }
                              : { background: '#F3F4F6', color: '#9CA3AF', cursor: 'not-allowed' }
                          }
                          disabled={!isOp}
                        >
                          {isOp ? 'Ver disponibilidad' : 'No disponible'}
                        </button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>

            {visible.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-400 text-lg">No se encontraron espacios</p>
                <p className="text-gray-300 text-sm mt-1">Intenta con otros filtros</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function Labeled({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
