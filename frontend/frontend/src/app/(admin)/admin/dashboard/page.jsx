"use client"

import { useEffect, useState } from "react"
import { reportsApi } from "@/lib/apiClient"

// HU-23 — Dashboard admin con stats y gráficos simples
export default function AdminDashboardPage() {
  const [summary, setSummary] = useState(null)
  const [usage, setUsage] = useState(null)
  const [topSpaces, setTopSpaces] = useState([])
  const [heatmap, setHeatmap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    const monthAgo = new Date(Date.now() - 30 * 86400000)
      .toISOString()
      .split("T")[0]

    Promise.all([
      reportsApi.summary().catch(() => null),
      reportsApi.usage(monthAgo, today).catch(() => null),
      reportsApi.topSpaces(monthAgo, today, 5).catch(() => ({ top_spaces: [] })),
      reportsApi.heatmap(monthAgo, today).catch(() => ({ hour_distribution: {} })),
    ])
      .then(([s, u, t, h]) => {
        setSummary(s)
        setUsage(u)
        setTopSpaces(t?.top_spaces || [])
        setHeatmap(h?.hour_distribution || {})
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="p-8 text-gray-500">Cargando…</div>
  }

  const totals = summary?.last_30_days || {}
  const maxHour = Math.max(0, ...Object.values(heatmap).map(Number))

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Estadísticas de uso de los últimos 30 días</p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Tarjetas de números clave */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { k: "total", label: "Reservas", color: "#2C3E50" },
          { k: "approved", label: "Aprobadas", color: "#27AE60" },
          { k: "cancelled", label: "Canceladas", color: "#6B7280" },
          { k: "rejected", label: "Rechazadas", color: "#E74C3C" },
        ].map((s) => (
          <div
            key={s.k}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100"
          >
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {s.label}
            </div>
            <div
              className="text-3xl font-bold mt-2"
              style={{ color: s.color }}
            >
              {totals[s.k] ?? 0}
            </div>
          </div>
        ))}
      </section>

      {/* Top espacios */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">
          Top 5 espacios más reservados
        </h2>
        {topSpaces.length === 0 ? (
          <p className="text-sm text-gray-400">Sin datos aún.</p>
        ) : (
          <ul className="space-y-2">
            {topSpaces.map((s) => (
              <li
                key={s.space_id}
                className="flex items-center justify-between text-sm border-b last:border-0 py-2"
              >
                <span className="font-mono text-xs text-gray-500">
                  {s.space_id.slice(0, 8)}…
                </span>
                <span className="font-semibold">{s.total} reservas</span>
                <span className="text-gray-400">{s.hours} h</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Heatmap por hora */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">
          Demanda por hora del día
        </h2>
        <div className="grid grid-cols-12 gap-1">
          {Array.from({ length: 24 }, (_, h) => {
            const value = Number(heatmap[String(h)] || 0)
            const intensity = maxHour ? value / maxHour : 0
            return (
              <div key={h} className="flex flex-col items-center text-xs">
                <div
                  className="w-full h-12 rounded"
                  style={{
                    background: `rgba(146, 43, 33, ${0.1 + intensity * 0.9})`,
                  }}
                  title={`${h}:00 → ${value} reservas`}
                />
                <span className="mt-1 text-gray-400">{h}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Reservas por día (línea simple en SVG) */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">
          Reservas por día (últimos 30 días)
        </h2>
        {usage?.by_day?.length ? (
          <SimpleLineChart data={usage.by_day} />
        ) : (
          <p className="text-sm text-gray-400">Sin datos.</p>
        )}
      </section>
    </div>
  )
}

function SimpleLineChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.total))
  const w = 600
  const h = 160
  const points = data
    .map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * w
      const y = h - (d.total / max) * h
      return `${x},${y}`
    })
    .join(" ")
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-40"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke="#922B21"
        strokeWidth="2"
        points={points}
      />
    </svg>
  )
}
