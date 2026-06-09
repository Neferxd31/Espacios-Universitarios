"use client"

import { useEffect, useState } from "react"
import { auditApi } from "@/lib/apiClient"

// HU-27 — Visualización de logs de actividad
export default function LogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filterAction, setFilterAction] = useState("")

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

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-4 py-2 text-gray-600">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {log.user_label || log.user_id || "—"}
                  </td>
                  <td className="px-4 py-2 font-semibold">{log.action}</td>
                  <td className="px-4 py-2">
                    {log.resource}
                    {log.resource_id && (
                      <span className="text-gray-400 text-xs"> · {log.resource_id.slice(0, 8)}…</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{log.ip_address || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
