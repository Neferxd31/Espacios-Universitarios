"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { areasApi } from '@/lib/apiClient'

// Colores por tipo de espacio
const typeColors = {
  Aula:        { bg: '#EBF5FB', color: '#1A5276', border: '#AED6F1' },
  Laboratorio: { bg: '#EAFAF1', color: '#1E8449', border: '#A9DFBF' },
  Auditorio:   { bg: '#FEF9E7', color: '#9A7D0A', border: '#F9E79F' },
  Sala:        { bg: '#F5EEF8', color: '#6C3483', border: '#D2B4DE' },
}

// Configuración de estados
const statusConfig = {
  operational: { label: 'Disponible',    bg: '#D5F5E3', color: '#1E8449' },
  maintenance:  { label: 'Mantenimiento', bg: '#FEF9E7', color: '#9A7D0A' },
  inactive:     { label: 'Inactivo',      bg: '#FDEDEC', color: '#C0392B' },
}

function SpaceCard({ space }) {
  const tc = typeColors[space.space_type] || typeColors.Aula
  const sc = statusConfig[space.status] || statusConfig.inactive
  const isOp = space.status === 'operational' && space.is_active

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5">
      {/* Cabecera coloreada */}
      <div className="h-20 flex items-center justify-between px-4 relative" style={{ background: tc.bg }}>
        <div>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}
          >
            {space.space_type}
          </span>
          {space.floor != null && (
            <span className="ml-2 text-xs text-gray-500 bg-white/70 px-2 py-0.5 rounded-full">
              Piso {space.floor}
            </span>
          )}
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: sc.bg, color: sc.color }}
        >
          {sc.label}
        </span>
      </div>

      {/* Contenido */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{space.name}</h3>
        <p className="text-xs text-gray-400 mt-0.5 mb-1">{space.code}</p>

        {space.description && (
          <p className="text-xs text-gray-500 mt-1 mb-2 line-clamp-2">{space.description}</p>
        )}

        {/* Capacidad */}
        {space.capacity != null && (
          <div className="flex items-center gap-1.5 mt-2 mb-3">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="5" r="2.5" stroke="#9CA3AF" strokeWidth="1.2" />
              <path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{space.capacity}</span> personas
            </span>
          </div>
        )}

        {/* Amenidades */}
        <div className="flex flex-wrap gap-1 mb-3">
          {space.has_air_conditioning && <AmenityBadge label="A/C" />}
          {space.has_computers && <AmenityBadge label="Computadores" />}
          {space.has_projector && <AmenityBadge label="Proyector" />}
          {space.has_internet && <AmenityBadge label="Internet" />}
        </div>

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
            {isOp ? 'Ver detalles' : 'No disponible'}
          </button>
        </Link>
      </div>
    </div>
  )
}

function AmenityBadge({ label }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
      {label}
    </span>
  )
}

export default function MisEspaciosPage() {
  const [areas, setAreas] = useState([])
  const [spaces, setSpaces] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  // Filtros
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('Todos')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [onlyAvailable, setOnlyAvailable] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setApiError('')
    try {
      const params = {}
      if (search) params.search = search
      if (onlyAvailable) {
        params.available = 'true'
      } else if (statusFilter !== 'Todos') {
        const map = {
          Disponible:    'operational',
          Mantenimiento: 'maintenance',
          Inactivo:      'inactive',
        }
        if (map[statusFilter]) params.status = map[statusFilter]
      }
      if (typeFilter !== 'Todos') params.type = typeFilter

      const data = await areasApi.misEspacios(params)
      setAreas(data.areas || [])
      setSpaces(data.results || [])
      setTotal(data.count ?? 0)
    } catch (err) {
      setApiError(err.message || 'No se pudo conectar con el servicio de espacios.')
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, statusFilter, onlyAvailable])

  useEffect(() => {
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  const types    = ['Todos', 'Aula', 'Laboratorio', 'Auditorio', 'Sala']
  const statuses = ['Todos', 'Disponible', 'Mantenimiento', 'Inactivo']

  return (
    <div>
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Cabecera */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Espacios de mi Dependencia</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Consulta el estado y disponibilidad de los espacios asignados a las dependencias que administras.
          </p>
        </div>

        {/* Resumen de dependencias */}
        {!loading && areas.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-6">
            {areas.map((area) => (
              <div
                key={area.id}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm"
              >
                <span className="text-lg">🏢</span>
                <div>
                  <p className="text-xs font-bold text-gray-800">{area.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{area.area_type_display || area.area_type}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Búsqueda */}
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {/* Filtro tipo */}
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

              {/* Filtro estado */}
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {statuses.map((st) => (
                  <button
                    key={st}
                    onClick={() => { setStatusFilter(st); setOnlyAvailable(false) }}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={!onlyAvailable && statusFilter === st ? { background: '#C0392B', color: 'white' } : { color: '#6B7280' }}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Toggle solo disponibles */}
              <button
                onClick={() => { setOnlyAvailable((v) => !v); setStatusFilter('Todos') }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all"
                style={
                  onlyAvailable
                    ? { background: '#D5F5E3', color: '#1E8449', borderColor: '#A9DFBF' }
                    : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }
                }
              >
                <span>{onlyAvailable ? '✓' : '○'}</span>
                Solo disponibles
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
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
              <p className="font-semibold">Error al cargar los espacios</p>
              <code className="mt-1 block text-xs opacity-60">{apiError}</code>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-gray-400 text-sm">Cargando espacios...</div>
        ) : areas.length === 0 ? (
          /* Sin dependencias asignadas */
          <div className="py-20 text-center">
            <div className="text-5xl mb-4">🏢</div>
            <p className="text-gray-600 text-lg font-semibold">No tienes dependencias asignadas</p>
            <p className="text-gray-400 text-sm mt-2">
              Comunícate con un administrador para que te asignen como responsable de una dependencia.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {total} espacio{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
            </p>

            {/* Grid de espacios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {spaces.map((space) => (
                <SpaceCard key={space.id} space={space} />
              ))}
            </div>

            {spaces.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-400 text-lg">No hay espacios con los filtros aplicados</p>
                <p className="text-gray-300 text-sm mt-1">Prueba cambiando el estado o el tipo</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
