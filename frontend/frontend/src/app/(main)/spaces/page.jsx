"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { spacesApi } from '@/lib/apiClient'

const typeColors = {
  Aula: { bg: '#EBF5FB', color: '#1A5276', border: '#AED6F1' },
  Laboratorio: { bg: '#EAFAF1', color: '#1E8449', border: '#A9DFBF' },
  Auditorio: { bg: '#FEF9E7', color: '#9A7D0A', border: '#F9E79F' },
  Sala: { bg: '#F5EEF8', color: '#6C3483', border: '#D2B4DE' },
}

function SpaceIcon({ type }) {
  if (type === 'Laboratorio') {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#EAFAF1" />
        <path d="M11 8h10M13 8v6l-4 8h14l-4-8V8" stroke="#1E8449" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="22" r="1" fill="#1E8449" />
        <circle cx="18" cy="22" r="1" fill="#1E8449" />
      </svg>
    )
  }
  if (type === 'Auditorio') {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#FEF9E7" />
        <path d="M6 24h20M8 24V16l8-6 8 6v8" stroke="#9A7D0A" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="13" y="18" width="6" height="6" rx="1" stroke="#9A7D0A" strokeWidth="1.5" />
      </svg>
    )
  }
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#EBF5FB" />
      <rect x="7" y="10" width="18" height="14" rx="2" stroke="#1A5276" strokeWidth="1.5" />
      <path d="M7 14h18" stroke="#1A5276" strokeWidth="1.5" />
      <path d="M16 14v10" stroke="#1A5276" strokeWidth="1" strokeDasharray="2 2" />
    </svg>
  )
}

export default function SpacesPage() {
  const [spaces, setSpaces] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('Todos')
  const [statusFilter, setStatusFilter] = useState('Todos')

  const fetchSpaces = useCallback(async () => {
    setLoading(true)
    setApiError('')
    try {
      const params = {}
      if (search) params.search = search
      if (typeFilter !== 'Todos') params.type = typeFilter
      if (statusFilter === 'Mantenimiento') params.status = 'maintenance'
      const data = await spacesApi.list(params)
      setSpaces(data.results || data)
      setTotal(data.count ?? (data.results?.length ?? (Array.isArray(data) ? data.length : 0)))
    } catch (err) {
      setSpaces([])
      setApiError(err.message || 'No se pudo conectar con el servicio de espacios.')
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, statusFilter])

  useEffect(() => {
    const t = setTimeout(fetchSpaces, 300)
    return () => clearTimeout(t)
  }, [fetchSpaces])

  const types = ['Todos', 'Aula', 'Laboratorio', 'Auditorio', 'Sala']
  const statuses = ['Todos', 'Disponible', 'Mantenimiento']

  return (
    <div>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de Espacios</h1>
          <p className="text-gray-500 mt-1">
            Consulta la disponibilidad y reserva el espacio que necesitas
          </p>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                width="16" height="16" viewBox="0 0 16 16" fill="none"
              >
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {types.map((t) => (
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
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {statuses.map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={statusFilter === st ? { background: '#C0392B', color: 'white' } : { color: '#6B7280' }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {apiError && (
          <div
            className="mb-6 px-5 py-4 rounded-2xl text-sm flex items-start gap-3"
            style={{ background: '#FDEDEC', color: '#7B241C', border: '1px solid #F1948A' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0 mt-0.5">
              <circle cx="9" cy="9" r="8" stroke="#C0392B" strokeWidth="1.5" />
              <path d="M9 5v4M9 12h.01" stroke="#C0392B" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <div>
              <p className="font-semibold">No se pudo conectar con el servicio de espacios</p>
              <p className="mt-0.5 opacity-80">Verifica que el Spaces MS esté corriendo en el puerto 8082 con la base de datos configurada.</p>
              <code className="mt-1 block text-xs opacity-60">{apiError}</code>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando espacios...</div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {total} espacio{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {spaces.map((space) => {
                const tc = typeColors[space.space_type] || typeColors.Aula
                const isOp = space.status === 'operational'
                return (
                  <div
                    key={space.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5"
                  >
                    <div
                      className="h-24 flex items-center justify-center relative"
                      style={{ background: tc.bg }}
                    >
                      <SpaceIcon type={space.space_type} />
                      {space.floor != null && (
                        <span className="absolute top-3 left-3 text-xs font-medium text-gray-500 bg-white/80 px-2 py-0.5 rounded-full">
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
                          <p className="text-xs text-gray-400 mt-0.5">{space.code}</p>
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

            {spaces.length === 0 && (
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
