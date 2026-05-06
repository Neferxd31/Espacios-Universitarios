"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { spacesApi, reservationsApi } from "@/lib/apiClient"
import { getUser } from "@/lib/authStorage"

const DAYS_OF_WEEK = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

function getWeekDays(baseDate) {
  const days = []
  const dow = baseDate.getDay()
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() - dow + (dow === 0 ? -6 : 1))
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(d)
  }
  return days
}

function fmt(date) {
  return date.toISOString().split("T")[0]
}

function Amenity({ label, active, icon }) {
  return (
    <div
      className="flex items-center gap-2 p-3 rounded-xl"
      style={{ background: active ? "#EAFAF1" : "#F9FAFB", opacity: active ? 1 : 0.5 }}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium" style={{ color: active ? "#1E8449" : "#9CA3AF" }}>
        {label}
      </span>
      {active && (
        <svg className="ml-auto" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="7" fill="#1E8449" />
          <path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

export default function SpaceDetailPage() {
  const params = useParams()
  const spaceId = params.id
  const todayDate = new Date()

  const [space, setSpace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [baseDate, setBaseDate] = useState(todayDate)
  const [selectedDate, setSelectedDate] = useState(fmt(todayDate))
  const [selectedStart, setSelectedStart] = useState(null)
  const [selectedEnd, setSelectedEnd] = useState(null)
  const [reservedHours, setReservedHours] = useState([])
  const [reserving, setReserving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [reserveError, setReserveError] = useState("")

  // Fetch space data
  useEffect(() => {
    spacesApi.get(spaceId)
      .then(setSpace)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [spaceId])

  // Fetch reserved slots when space or date changes
  const fetchAvailability = useCallback(async () => {
    if (!spaceId || !selectedDate) return
    try {
      const data = await reservationsApi.bySpace(spaceId, selectedDate)
      // Build set of occupied hours from half-open slots [start, end)
      const occupied = []
      for (const slot of (data.reserved_slots || [])) {
        for (let h = slot.start_hour; h < slot.end_hour; h++) {
          occupied.push(h)
        }
      }
      setReservedHours(occupied)
    } catch {
      setReservedHours([])
    }
  }, [spaceId, selectedDate])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  // Get operating hours for the selected day
  const getHoursForDay = () => {
    if (!space?.operating_hours?.length) {
      // Fallback: all hours 7-19
      return [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
    }

    const dateObj = new Date(selectedDate + "T12:00:00")
    // JS: 0=Sun, model: 0=Mon → convert
    const jsDay = dateObj.getDay()
    const modelDay = jsDay === 0 ? 6 : jsDay - 1

    const daySchedule = space.operating_hours.find((h) => h.day_of_week === modelDay)
    if (!daySchedule) return [] // No opera este día

    const opensHour = parseInt(daySchedule.opens_at?.split(":")[0], 10)
    const closesHour = parseInt(daySchedule.closes_at?.split(":")[0], 10)

    const hours = []
    for (let h = opensHour; h < closesHour; h++) {
      hours.push(h)
    }
    return hours
  }

  const availableHours = space ? getHoursForDay() : []
  const weekDays = getWeekDays(baseDate)

  // Check if a day has operating hours
  const dayHasSchedule = (date) => {
    if (!space?.operating_hours?.length) return true
    const jsDay = date.getDay()
    const modelDay = jsDay === 0 ? 6 : jsDay - 1
    return space.operating_hours.some((h) => h.day_of_week === modelDay)
  }

  const prevWeek = () => {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - 7)
    setBaseDate(d)
  }

  const nextWeek = () => {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + 7)
    setBaseDate(d)
  }

  const handleHourClick = (hour) => {
    if (reservedHours.includes(hour)) return
    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(hour)
      setSelectedEnd(null)
    } else {
      if (hour > selectedStart) {
        // Check no reserved hour in between
        let blocked = false
        for (let h = selectedStart; h <= hour; h++) {
          if (reservedHours.includes(h)) { blocked = true; break }
        }
        if (blocked) {
          setSelectedStart(hour)
          setSelectedEnd(null)
        } else {
          setSelectedEnd(hour + 1)
        }
      } else {
        setSelectedStart(hour)
        setSelectedEnd(null)
      }
    }
  }

  const isSelected = (hour) => {
    if (!selectedStart) return false
    if (!selectedEnd) return hour === selectedStart
    return hour >= selectedStart && hour < selectedEnd
  }

  const handleReserve = async () => {
    setReserveError("")
    setReserving(true)

    const user = getUser()
    if (!user?.university_code) {
      setReserveError("No se encontró tu código universitario. Inicia sesión de nuevo.")
      setReserving(false)
      return
    }

    try {
      await reservationsApi.create({
        area_code: space.area?.code,
        space_code: space.code,
        university_code: user.university_code,
        reservation_date: selectedDate,
        start_hour: selectedStart,
        end_hour: selectedEnd,
      })
      setShowModal(true)
      // Refresh availability
      await fetchAvailability()
    } catch (err) {
      setReserveError(err.message)
    } finally {
      setReserving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-gray-400 text-sm">Cargando espacio...</div>
      </div>
    )
  }

  if (error || !space) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "#FDEDEC", color: "#7B241C" }}>
          {error || "Espacio no encontrado."}
        </div>
        <Link href="/spaces" className="text-sm mt-4 inline-block" style={{ color: "#C0392B" }}>
          ← Volver a espacios
        </Link>
      </div>
    )
  }

  // Map operating hours for sidebar display
  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
  const schedule = (space.operating_hours || [])
    .sort((a, b) => a.day_of_week - b.day_of_week)
    .map((h) => ({
      day: dayNames[h.day_of_week] || `D${h.day_of_week}`,
      opens: h.opens_at?.substring(0, 5),
      closes: h.closes_at?.substring(0, 5),
    }))

  const spaceType = space.space_type || "Aula"

  return (
    <div>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/spaces" className="hover:text-gray-700 transition-colors">Espacios</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{space.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — space info */}
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div
                className="h-36 flex flex-col items-center justify-center"
                style={{ background: "linear-gradient(135deg, #EAFAF1 0%, #D5F5E3 100%)" }}
              >
                <span className="text-4xl">
                  {spaceType === "Laboratorio" ? "🧪" : spaceType === "Auditorio" ? "🏛️" : "📚"}
                </span>
                <span
                  className="mt-2 text-xs font-semibold px-3 py-1 rounded-full"
                  style={{
                    background: space.status === "operational" ? "#D5F5E3" : "#FDEDEC",
                    color: space.status === "operational" ? "#1E8449" : "#C0392B",
                  }}
                >
                  {space.status === "operational" ? "Disponible" : "No disponible"}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">{space.name}</h1>
                    <p className="text-sm text-gray-400 mt-0.5">{space.code} · {space.area?.name}</p>
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-1 rounded-full"
                    style={{ background: "#EAFAF1", color: "#1E8449", border: "1px solid #A9DFBF" }}
                  >
                    {spaceType}
                  </span>
                </div>
                {space.description && (
                  <p className="text-sm text-gray-600 mt-3 leading-relaxed">{space.description}</p>
                )}
                <div className="flex items-center gap-3 mt-4 p-3 rounded-xl" style={{ background: "#F9FAFB" }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="7" r="3" stroke="#6B7280" strokeWidth="1.5" />
                    <path d="M3 18c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-400">Capacidad máxima</p>
                    <p className="text-sm font-bold text-gray-900">{space.capacity} personas</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Equipamiento</h3>
              <div className="space-y-2">
                <Amenity label="Aire acondicionado" active={space.has_air_conditioning} icon="❄️" />
                <Amenity label="Video proyector" active={space.has_projector} icon="📽️" />
                <Amenity label="Computadores" active={space.has_computers} icon="💻" />
                <Amenity label="Internet" active={space.has_internet} icon="🌐" />
              </div>
            </div>

            {/* Operating hours */}
            {schedule.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Horario de atención</h3>
                <div className="space-y-2">
                  {schedule.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-medium w-10">{s.day}</span>
                      <span className="text-gray-700">{s.opens} – {s.closes}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — availability */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-gray-900 text-lg">Disponibilidad</h2>
                <div className="flex items-center gap-2">
                  <button onClick={prevWeek} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M8 2L4 6l4 4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button onClick={nextWeek} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M4 2l4 4-4 4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Day selector */}
              <div className="grid grid-cols-7 gap-2 mb-6">
                {weekDays.map((d) => {
                  const key = fmt(d)
                  const isSel = selectedDate === key
                  const isToday = fmt(new Date()) === key
                  const hasSchedule = dayHasSchedule(d)
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedDate(key)
                        setSelectedStart(null)
                        setSelectedEnd(null)
                      }}
                      disabled={!hasSchedule}
                      className="flex flex-col items-center py-3 rounded-xl transition-all"
                      style={
                        !hasSchedule
                          ? { background: "#F3F4F6", color: "#D1D5DB", cursor: "not-allowed" }
                          : isSel
                            ? { background: "#C0392B", color: "white" }
                            : isToday
                              ? { background: "#FDEDEC", color: "#C0392B", border: "1px solid #F1948A" }
                              : { background: "#F9FAFB", color: "#6B7280" }
                      }
                    >
                      <span className="text-xs font-medium">{DAYS_OF_WEEK[d.getDay()]}</span>
                      <span className="text-lg font-bold mt-0.5">{d.getDate()}</span>
                      {!hasSchedule && <span className="text-[9px] mt-0.5">Cerrado</span>}
                    </button>
                  )
                })}
              </div>

              {/* Hours grid */}
              {availableHours.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 font-medium">Este espacio no opera el día seleccionado</p>
                  <p className="text-gray-300 text-sm mt-1">Selecciona otro día de la semana</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200 inline-block" />
                      Disponible
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-200 inline-block" />
                      Reservado
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#C0392B" }} />
                      Seleccionado
                    </span>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {availableHours.map((hour) => {
                      const isRes = reservedHours.includes(hour)
                      const isSel = isSelected(hour)
                      return (
                        <button
                          key={hour}
                          onClick={() => handleHourClick(hour)}
                          disabled={isRes}
                          className="flex flex-col items-center py-3 rounded-xl text-xs font-medium transition-all"
                          style={
                            isSel
                              ? { background: "#C0392B", color: "white" }
                              : isRes
                                ? { background: "#FDEDEC", color: "#F1948A", cursor: "not-allowed" }
                                : { background: "#F9FAFB", color: "#374151" }
                          }
                        >
                          <span className="font-bold">{hour}:00</span>
                          <span className="text-[10px] opacity-70 mt-0.5">
                            {isRes ? "Ocupado" : "Libre"}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {availableHours.length > 0 && !selectedStart && (
                <p className="text-xs text-gray-400 mt-4 text-center">
                  Haz clic en una hora para comenzar a seleccionar tu bloque de tiempo
                </p>
              )}
              {selectedStart && !selectedEnd && (
                <p className="text-xs mt-4 text-center font-medium" style={{ color: "#C0392B" }}>
                  Hora de inicio: {selectedStart}:00 — Ahora selecciona la hora de fin
                </p>
              )}
            </div>

            {/* Reservation summary */}
            {selectedStart && selectedEnd && (
              <div className="bg-white rounded-2xl shadow-sm border p-6" style={{ borderColor: "#F1948A" }}>
                <h3 className="font-bold text-gray-900 mb-4">Resumen de la reserva</h3>

                {reserveError && (
                  <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: "#FDEDEC", color: "#7B241C", border: "1px solid #F1948A" }}>
                    {reserveError}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400">Espacio</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{space.name}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400">Fecha</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedDate}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400">Horario</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {selectedStart}:00 – {selectedEnd}:00
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReserve}
                  disabled={reserving}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all"
                  style={{ background: reserving ? "#922B21" : "#C0392B", opacity: reserving ? 0.7 : 1 }}
                  onMouseEnter={(e) => !reserving && (e.currentTarget.style.background = "#922B21")}
                  onMouseLeave={(e) => !reserving && (e.currentTarget.style.background = "#C0392B")}
                >
                  {reserving ? "Reservando..." : "Confirmar reserva"}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Success modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#D5F5E3" }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M6 16l6 6 14-14" stroke="#1E8449" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">¡Reserva confirmada!</h3>
            <p className="text-gray-500 text-sm mb-1"><strong>{space.name}</strong></p>
            <p className="text-gray-500 text-sm mb-1">{selectedDate}</p>
            <p className="text-gray-500 text-sm mb-6">{selectedStart}:00 – {selectedEnd}:00</p>
            <Link href="/reservations">
              <button className="w-full py-2.5 rounded-xl text-white font-semibold text-sm" style={{ background: "#C0392B" }}>
                Ver mis reservas
              </button>
            </Link>
            <button
              onClick={() => { setShowModal(false); setSelectedStart(null); setSelectedEnd(null) }}
              className="w-full py-2.5 rounded-xl text-gray-500 font-medium text-sm mt-2 hover:bg-gray-50 transition-colors"
            >
              Seguir reservando
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
