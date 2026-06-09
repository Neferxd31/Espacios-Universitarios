"use client"

import { useEffect, useMemo, useState } from "react"
import { reportsApi, spacesApi } from "@/lib/apiClient"

// HU-22 / HU-24 / HU-25 — Reportes con exportación
export default function ReportesPage() {
  const today = new Date().toISOString().split("T")[0]
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]

  const [start, setStart] = useState(monthAgo)
  const [end, setEnd] = useState(today)
  const [usage, setUsage] = useState(null)
  const [topSpaces, setTopSpaces] = useState([])
  const [heatmap, setHeatmap] = useState({})
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Mapa UUID → "AREA-CODE · Nombre"
  const spaceById = useMemo(() => {
    const m = new Map()
    for (const s of spaces) {
      const label = `${(s.area?.code || "").toUpperCase()}-${s.code} · ${s.name}`
      m.set(s.id, label)
    }
    return m
  }, [spaces])

  // Cargar lista de espacios una vez para resolver nombres
  useEffect(() => {
    spacesApi
      .list({ page_size: 100, include_inactive: "true" })
      .then((data) => setSpaces(data.results || data || []))
      .catch(() => {})
  }, [])

  const generate = async () => {
    setLoading(true)
    setError("")
    try {
      const [u, t, h] = await Promise.all([
        reportsApi.usage(start, end),
        reportsApi.topSpaces(start, end, 10),
        reportsApi.heatmap(start, end),
      ])
      setUsage(u)
      setTopSpaces(t.top_spaces || [])
      setHeatmap(h.hour_distribution || {})
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const maxHour = Math.max(0, ...Object.values(heatmap).map(Number))

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Reportes de uso</h1>
        <p className="text-gray-500">Genera reportes filtrando por rango de fechas.</p>
      </header>

      {/* Filtros */}
      <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ background: "#922B21" }}
        >
          {loading ? "Generando…" : "Generar"}
        </button>
        <a
          href={reportsApi.exportCsvUrl(start, end)}
          className="px-4 py-2 rounded-lg border text-sm font-semibold text-gray-700 hover:bg-gray-50"
          target="_blank"
          rel="noopener noreferrer"
        >
          ⇩ CSV
        </a>
        <a
          href={reportsApi.exportPdfUrl(start, end)}
          className="px-4 py-2 rounded-lg border text-sm font-semibold text-gray-700 hover:bg-gray-50"
          target="_blank"
          rel="noopener noreferrer"
        >
          ⇩ PDF
        </a>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Totales */}
      {usage && (
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            ["Total", usage.totals.total],
            ["Aprobadas", usage.totals.approved],
            ["Canceladas", usage.totals.cancelled],
            ["Rechazadas", usage.totals.rejected],
            ["Horas", usage.totals.hours],
          ].map(([label, value]) => (
            <div
              key={label}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"
            >
              <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{value || 0}</div>
            </div>
          ))}
        </section>
      )}

      {/* Top espacios (HU-24) */}
      {topSpaces.length > 0 && (
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Top espacios</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 text-xs uppercase">
              <tr>
                <th className="py-2">Espacio</th>
                <th className="py-2">Reservas</th>
                <th className="py-2">Horas</th>
              </tr>
            </thead>
            <tbody>
              {topSpaces.map((s) => (
                <tr key={s.space_id} className="border-t">
                  <td className="py-2">
                    {spaceById.get(s.space_id) || (
                      <span className="font-mono text-xs text-gray-400">
                        {s.space_id}
                      </span>
                    )}
                  </td>
                  <td className="py-2 font-semibold">{s.total}</td>
                  <td className="py-2">{s.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Heatmap (HU-25) */}
      {Object.keys(heatmap).length > 0 && (
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Demanda por hora</h2>
          <div className="grid grid-cols-12 gap-1">
            {Array.from({ length: 24 }, (_, h) => {
              const value = Number(heatmap[String(h)] || 0)
              const intensity = maxHour ? value / maxHour : 0
              return (
                <div key={h} className="flex flex-col items-center text-xs">
                  <div
                    className="w-full h-10 rounded"
                    style={{
                      background: `rgba(146, 43, 33, ${0.1 + intensity * 0.9})`,
                    }}
                    title={`${h}:00 → ${value}`}
                  />
                  <span className="mt-1 text-gray-400">{h}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
