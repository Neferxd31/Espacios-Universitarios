"use client"

import { useEffect, useState } from "react"
import { rulesApi } from "@/lib/apiClient"

// HU-26 — Configuración global del sistema.
// Reglas vienen del MS reservations (ReservationRules singleton).
// El bloque "Información general" se mantiene en localStorage como preferencia local.

const DEFAULT_LOCAL = {
  system_name: "Espacios Universitarios UFPS",
  contact_email: "espacios@ufps.edu.co",
  maintenance_mode: false,
  allow_student_registration: true,
  require_email_confirmation: false,
}
const STORAGE_KEY = "su_admin_local_config"

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_LOCAL, ...JSON.parse(raw) } : { ...DEFAULT_LOCAL }
  } catch {
    return { ...DEFAULT_LOCAL }
  }
}

export default function AdminConfigPage() {
  const [rules, setRules] = useState(null)
  const [local, setLocal] = useState(DEFAULT_LOCAL)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    setLocal(loadLocal())
    rulesApi
      .get()
      .then((data) => setRules(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const setRule = (k, v) => {
    setSavedMsg("")
    setRules((r) => ({ ...r, [k]: v }))
  }
  const setL = (k, v) => {
    setSavedMsg("")
    setLocal((c) => ({ ...c, [k]: v }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")
    try {
      // Guarda reglas (backend) y preferencias locales
      await rulesApi.update({
        max_hours_per_day: Number(rules.max_hours_per_day),
        min_anticipation_hours: Number(rules.min_anticipation_hours),
        max_anticipation_days: Number(rules.max_anticipation_days),
        cancel_anticipation_hours: Number(rules.cancel_anticipation_hours),
        max_simultaneous_per_user: Number(rules.max_simultaneous_per_user),
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(local))
      setSavedMsg("Configuración guardada correctamente.")
      setTimeout(() => setSavedMsg(""), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-gray-500 text-sm">Cargando configuración…</div>
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración del sistema</h1>
        <p className="text-gray-500 text-sm mt-1">
          Parámetros generales y reglas de reserva
        </p>
      </div>

      {savedMsg && (
        <div
          className="mb-6 px-4 py-3 rounded-xl text-sm"
          style={{ background: "#D5F5E3", color: "#1E8449", border: "1px solid #A9DFBF" }}
        >
          {savedMsg}
        </div>
      )}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl text-sm bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

      {/* ─────────────────── Reglas de reserva (backend) ────────────────── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
          Reglas de reserva (HU-26)
        </h2>
        <p className="text-xs text-gray-400 mb-5">
          Estos límites se aplican al crear y cancelar reservas en todo el sistema.
        </p>

        {rules && (
          <div className="grid grid-cols-2 gap-4">
            <RuleInput
              label="Horas máximas por día (por usuario)"
              hint="Tope diario de horas reservadas por un mismo usuario."
              value={rules.max_hours_per_day}
              onChange={(v) => setRule("max_hours_per_day", v)}
              min={1}
              max={12}
            />
            <RuleInput
              label="Reservas activas simultáneas"
              hint="Número máximo de reservas vigentes al tiempo."
              value={rules.max_simultaneous_per_user}
              onChange={(v) => setRule("max_simultaneous_per_user", v)}
              min={1}
              max={20}
            />
            <RuleInput
              label="Anticipación mínima (horas)"
              hint="Tiempo mínimo entre la solicitud y el inicio de la reserva."
              value={rules.min_anticipation_hours}
              onChange={(v) => setRule("min_anticipation_hours", v)}
              min={0}
              max={72}
            />
            <RuleInput
              label="Anticipación máxima (días)"
              hint="Máximo de días que se puede reservar a futuro."
              value={rules.max_anticipation_days}
              onChange={(v) => setRule("max_anticipation_days", v)}
              min={1}
              max={365}
            />
            <RuleInput
              label="Anticipación para cancelar (horas)"
              hint="Horas mínimas antes del inicio para permitir cancelar."
              value={rules.cancel_anticipation_hours}
              onChange={(v) => setRule("cancel_anticipation_hours", v)}
              min={0}
              max={72}
              colSpan={2}
            />
          </div>
        )}
      </section>

      {/* ─────────────────── Información general (local) ───────────────── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
          Información general
        </h2>
        <p className="text-xs text-gray-400 mb-5">
          Preferencias locales del panel — se guardan en este dispositivo.
        </p>
        <div className="space-y-4">
          <Field label="Nombre del sistema">
            <input
              type="text"
              value={local.system_name}
              onChange={(e) => setL("system_name", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </Field>
          <Field label="Correo de contacto">
            <input
              type="email"
              value={local.contact_email}
              onChange={(e) => setL("contact_email", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </Field>
        </div>
      </section>

      {/* ─────────────────── Opciones del sistema (local) ───────────────── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-5">
          Opciones del sistema
        </h2>
        <div className="space-y-3">
          {[
            ["maintenance_mode", "Modo mantenimiento", "Bloquea el acceso a usuarios no administradores"],
            ["allow_student_registration", "Registro libre de estudiantes", "Permite que los estudiantes se registren sin aprobación previa"],
            ["require_email_confirmation", "Confirmación por correo", "Requiere verificación de correo al registrarse"],
          ].map(([key, label, desc]) => (
            <label
              key={key}
              className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={local[key]}
                onChange={(e) => setL(key, e.target.checked)}
                className="accent-red-600 w-4 h-4 mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
          style={{ background: "#C0392B" }}
        >
          {saving ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function RuleInput({ label, hint, value, onChange, min, max, colSpan = 1 }) {
  return (
    <div className={colSpan === 2 ? "col-span-2" : ""}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
      />
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </div>
  )
}
