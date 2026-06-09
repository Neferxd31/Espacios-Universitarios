"use client"

import { useEffect, useMemo, useState } from "react"
import { reservationsApi, spacesApi } from "@/lib/apiClient"

// HU-9 — Vista de calendario semanal de disponibilidad por espacio
export default function CalendarPage() {
  const [spaces, setSpaces] = useState([])
  const [spaceId, setSpaceId] = useState("")
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [slots, setSlots] = useState({}) // { 'YYYY-MM-DD': [{start_hour,end_hour,status}] }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Cargar espacios al inicio
  useEffect(() => {
    spacesApi
      .list({ page_size: 100 })
      .then((data) => {
        const list = data.results || data || []
        setSpaces(list)
        if (list.length > 0) setSpaceId(list[0].id)
      })
      .catch((e) => setError(e.message))
  }, [])

  // Cargar disponibilidad de la semana
  useEffect(() => {
    if (!spaceId) return
    setLoading(true)
    const days = getWeekDays(weekStart)
    Promise.all(
      days.map((d) =>
        reservationsApi
          .bySpace(spaceId, d)
          .then((data) => [d, data.reserved_slots || []])
          .catch(() => [d, []]),
      ),
    )
      .then((entries) => setSlots(Object.fromEntries(entries)))
      .finally(() => setLoading(false))
  }, [spaceId, weekStart])

  const days = useMemo(() => getWeekDays(weekStart), [weekStart])
  const hours = Array.from({ length: 14 }, (_, i) => i + 7) // 7:00 a 20:00

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
          <p className="text-gray-500">Disponibilidad por espacio.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setWeekStart(shiftDays(weekStart, -7))}
            className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            ← Anterior
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            Hoy
          </button>
          <button
            onClick={() => setWeekStart(shiftDays(weekStart, 7))}
            className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            Siguiente →
          </button>
        </div>
      </header>

      <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Espacio
        </label>
        <select
          value={spaceId}
          onChange={(e) => setSpaceId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-full max-w-md"
        >
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.area?.code?.toUpperCase()}-{s.code} · {s.name}
            </option>
          ))}
        </select>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-2 border-b border-r text-gray-500 w-16">Hora</th>
              {days.map((d) => (
                <th key={d} className="p-2 border-b text-gray-700">
                  <div className="font-semibold">
                    {new Date(d).toLocaleDateString("es-CO", { weekday: "short" })}
                  </div>
                  <div className="text-gray-400">{d.slice(5)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h}>
                <td className="border-r border-b p-2 text-gray-400 text-right">
                  {String(h).padStart(2, "0")}:00
                </td>
                {days.map((d) => {
                  const busy = (slots[d] || []).find(
                    (s) => s.start_hour <= h && s.end_hour > h,
                  )
                  return (
                    <td
                      key={d + h}
                      className="border-b h-10"
                      style={{
                        background: busy
                          ? busy.status === "pending"
                            ? "#FEF9E7"
                            : "#FDEDEC"
                          : "#F0FFF4",
                      }}
                      title={busy ? `Ocupado (${busy.status})` : "Libre"}
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div className="p-3 text-xs text-gray-400 border-t">Cargando…</div>
        )}
      </section>

      <p className="text-xs text-gray-400">
        Verde = libre · Amarillo = pendiente · Rojo = aprobada
      </p>
    </div>
  )
}

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1) // lunes
  return d.toISOString().split("T")[0]
}

function shiftDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

function getWeekDays(start) {
  return Array.from({ length: 7 }, (_, i) => shiftDays(start, i))
}
