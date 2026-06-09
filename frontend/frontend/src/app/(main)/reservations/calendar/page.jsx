"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { reservationsApi, spacesApi } from "@/lib/apiClient"
import { getUser } from "@/lib/authStorage"

// HU-9 — Vista de calendario semanal de disponibilidad por espacio
//        + click en slot libre → modal de reserva
export default function CalendarPage() {
  const [spaces, setSpaces] = useState([])
  const [spaceId, setSpaceId] = useState("")
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [slots, setSlots] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [modal, setModal] = useState(null) // { date, startHour }

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
  const refresh = useCallback(() => {
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

  useEffect(() => {
    refresh()
  }, [refresh])

  const days = useMemo(() => getWeekDays(weekStart), [weekStart])
  const hours = Array.from({ length: 14 }, (_, i) => i + 7)
  const currentSpace = spaces.find((s) => s.id === spaceId)

  const openSlot = (date, hour) => {
    setModal({ date, startHour: hour, endHour: hour + 1 })
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Calendario</h1>
          <p className="text-gray-500 text-sm">Click en una franja libre para reservar.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setWeekStart(shiftDays(weekStart, -7))} className="flex-1 sm:flex-none px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">← Anterior</button>
          <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="flex-1 sm:flex-none px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">Hoy</button>
          <button onClick={() => setWeekStart(shiftDays(weekStart, 7))} className="flex-1 sm:flex-none px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">Siguiente →</button>
        </div>
      </header>

      <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <label className="block text-xs font-medium text-gray-600 mb-1">Espacio</label>
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
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>
      )}

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[640px]">
          <thead>
            <tr>
              <th className="p-2 border-b border-r text-gray-500 w-16">Hora</th>
              {days.map((d) => (
                <th key={d} className="p-2 border-b text-gray-700">
                  <div className="font-semibold">
                    {new Date(d + 'T00:00:00').toLocaleDateString("es-CO", { weekday: "short" })}
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
                  const busy = (slots[d] || []).find((s) => s.start_hour <= h && s.end_hour > h)
                  const isPast = d + 'T' + String(h).padStart(2, '0') + ':00:00' < new Date().toISOString()
                  return (
                    <td
                      key={d + h}
                      onClick={!busy && !isPast ? () => openSlot(d, h) : undefined}
                      className={`border-b h-10 transition-colors ${!busy && !isPast ? 'cursor-pointer hover:opacity-70' : ''}`}
                      style={{
                        background: busy
                          ? busy.status === "pending"
                            ? "#FEF9E7"
                            : "#FDEDEC"
                          : isPast
                            ? "#F3F4F6"
                            : "#F0FFF4",
                      }}
                      title={
                        busy
                          ? `Ocupado (${busy.status})`
                          : isPast
                            ? 'Pasado'
                            : 'Libre — click para reservar'
                      }
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="p-3 text-xs text-gray-400 border-t">Cargando…</div>}
      </section>

      <p className="text-xs text-gray-400">
        Verde = libre · Amarillo = pendiente · Rojo = aprobada · Gris = pasado
      </p>

      {modal && (
        <ReserveModal
          space={currentSpace}
          date={modal.date}
          startHour={modal.startHour}
          endHour={modal.endHour}
          onClose={() => setModal(null)}
          onCreated={() => {
            setModal(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function ReserveModal({ space, date, startHour, endHour, onClose, onCreated }) {
  const [start, setStart] = useState(startHour)
  const [end, setEnd] = useState(endHour)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const user = getUser()

  const submit = async () => {
    setError("")
    setSubmitting(true)
    try {
      if (!user?.university_code) {
        throw new Error("Sesión sin código universitario. Vuelve a iniciar sesión.")
      }
      if (Number(end) <= Number(start)) {
        throw new Error("La hora fin debe ser mayor que la hora inicio.")
      }
      await reservationsApi.create({
        area_code: space.area.code,
        space_code: space.code,
        university_code: user.university_code,
        reservation_date: date,
        start_hour: Number(start),
        end_hour: Number(end),
      })
      onCreated()
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900">Reservar espacio</h2>
        <p className="text-sm text-gray-500 mt-1">
          {space?.area?.code?.toUpperCase()}-{space?.code} · {space?.name}
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              readOnly
              className="w-full px-3 py-2 rounded-lg border text-sm bg-gray-50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Desde (hora)</label>
              <input
                type="number"
                min={0} max={23}
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hasta (hora)</label>
              <input
                type="number"
                min={1} max={24}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
            style={{ background: "#C0392B" }}
          >
            {submitting ? "Reservando…" : "Confirmar reserva"}
          </button>
        </div>
      </div>
    </div>
  )
}

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
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
