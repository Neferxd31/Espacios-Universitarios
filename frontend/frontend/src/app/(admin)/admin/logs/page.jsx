"use client"

import { useEffect, useMemo, useState } from "react"
import { adminUsersApi, auditApi, spacesApi } from "@/lib/apiClient"

// HU-27 — Visualización de logs de actividad
export default function LogsPage() {
  const [logs, setLogs] = useState([])
  const [users, setUsers] = useState([])
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filterAction, setFilterAction] = useState("")

  // Mapa UUID → "Nombre Apellido (1234567)"
  const userById = useMemo(() => {
    const m = new Map()
    for (const u of users) {
      const name = `${u.first_name || ""} ${u.last_name || ""}`.trim()
      const label = name
        ? `${name} (${u.university_code})`
        : u.university_code || u.email || u.id
      m.set(u.id, label)
    }
    return m
  }, [users])

  // Mapa UUID → "AREA-CODE · Nombre" (para columna recurso)
  const spaceById = useMemo(() => {
    const m = new Map()
    for (const s of spaces) {
      const label = `${(s.area?.code || "").toUpperCase()}-${s.code} · ${s.name}`
      m.set(s.id, label)
    }
    return m
  }, [spaces])

  const fetchLogs = async () => {
    setLoading(true)
    setError("")
    try {
      const params = {}
      if (filterAction) params.action = filterAction
      const data = await auditApi.list(params)
      setLogs(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Carga inicial paralela: logs + usuarios + espacios
  useEffect(() => {
    Promise.all([
      auditApi.list().catch(() => []),
      adminUsersApi.list({ page_size: 200 }).catch(() => ({ results: [] })),
      spacesApi
        .list({ page_size: 100, include_inactive: "true" })
        .catch(() => ({ results: [] })),
    ])
      .then(([logsData, usersData, spacesData]) => {
        setLogs(Array.isArray(logsData) ? logsData : [])
        setUsers(usersData?.results || usersData || [])
        setSpaces(spacesData?.results || spacesData || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Resuelve resource_id según el tipo de recurso
  const renderResource = (log) => {
    if (!log.resource_id) return log.resource
    let extra = null
    if (log.resource === "reservation") {
      extra = (
        <span className="text-gray-400 text-xs">
          {" "}· #{log.resource_id.slice(0, 8)}
        </span>
      )
    } else if (log.resource === "space") {
      const label = spaceById.get(log.resource_id)
      extra = (
        <span className="text-gray-500 text-xs">
          {" "}· {label || `#${log.resource_id.slice(0, 8)}`}
        </span>
      )
    } else if (log.resource === "user") {
      const label = userById.get(log.resource_id)
      extra = (
        <span className="text-gray-500 text-xs">
          {" "}· {label || `#${log.resource_id.slice(0, 8)}`}
        </span>
      )
    } else {
      extra = (
        <span className="text-gray-400 text-xs">
          {" "}· {log.resource_id.slice(0, 12)}…
        </span>
      )
    }
    return (
      <>
        {log.resource}
        {extra}
      </>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Logs de actividad</h1>
        <p className="text-gray-500">Auditoría de acciones críticas del sistema.</p>
      </header>

      {/* Filtro */}
      <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Filtrar por acción
          </label>
          <input
            type="text"
            placeholder="ej: ReservationApproved"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-64"
          />
        </div>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ background: "#922B21" }}
        >
          Buscar
        </button>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-gray-400 text-sm">Cargando…</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-gray-400 text-sm">Sin registros.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Recurso</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const resolvedUser = userById.get(log.user_id)
                const displayUser =
                  resolvedUser ||
                  log.user_label ||
                  (log.user_id ? (
                    <span className="font-mono text-xs text-gray-400">
                      {log.user_id.slice(0, 8)}…
                    </span>
                  ) : (
                    "—"
                  ))
                return (
                  <tr key={log.id} className="border-t">
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{displayUser}</td>
                    <td className="px-4 py-2 font-semibold">{log.action}</td>
                    <td className="px-4 py-2">{renderResource(log)}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {log.ip_address || "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
