"use client"

import { useState, useEffect } from 'react'

// HU-27 — Configuración general del sistema
// Por ahora almacena en localStorage hasta que exista un microservicio de configuración

const DEFAULT_CONFIG = {
  system_name: 'Espacios Universitarios UFPS',
  contact_email: 'espacios@ufps.edu.co',
  max_reservation_days: 30,
  max_active_reservations: 3,
  reservation_notice_hours: 1,
  maintenance_mode: false,
  allow_student_registration: true,
  require_email_confirmation: false,
}

const STORAGE_KEY = 'su_admin_config'

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export default function AdminConfigPage() {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setConfig(loadConfig())
  }, [])

  const set = (key, value) => {
    setSaved(false)
    setConfig((c) => ({ ...c, [key]: value }))
  }

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const focusIn = (e) => {
    e.target.style.borderColor = '#C0392B'
    e.target.style.boxShadow = '0 0 0 3px rgba(192,57,43,0.1)'
  }
  const focusOut = (e) => {
    e.target.style.borderColor = '#E5E7EB'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración del sistema</h1>
        <p className="text-gray-500 text-sm mt-1">Parámetros generales de la plataforma</p>
      </div>

      {saved && (
        <div
          className="mb-6 px-4 py-3 rounded-xl text-sm"
          style={{ background: '#D5F5E3', color: '#1E8449', border: '1px solid #A9DFBF' }}
        >
          Configuración guardada correctamente.
        </div>
      )}

      {/* Información general */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-5">
          Información general
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre del sistema
            </label>
            <input
              type="text"
              value={config.system_name}
              onChange={(e) => set('system_name', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none transition-all"
              onFocus={focusIn}
              onBlur={focusOut}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Correo de contacto
            </label>
            <input
              type="email"
              value={config.contact_email}
              onChange={(e) => set('contact_email', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none transition-all"
              onFocus={focusIn}
              onBlur={focusOut}
            />
          </div>
        </div>
      </section>

      {/* Políticas de reserva */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-5">
          Políticas de reserva
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Anticipación máxima (días)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={config.max_reservation_days}
                onChange={(e) => set('max_reservation_days', parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none transition-all"
                onFocus={focusIn}
                onBlur={focusOut}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reservas activas por usuario
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={config.max_active_reservations}
                onChange={(e) => set('max_active_reservations', parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none transition-all"
                onFocus={focusIn}
                onBlur={focusOut}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Aviso previo mínimo (horas)
            </label>
            <input
              type="number"
              min={0}
              max={72}
              value={config.reservation_notice_hours}
              onChange={(e) => set('reservation_notice_hours', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none transition-all"
              onFocus={focusIn}
              onBlur={focusOut}
            />
          </div>
        </div>
      </section>

      {/* Opciones del sistema */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-5">
          Opciones del sistema
        </h2>
        <div className="space-y-4">
          {[
            {
              key: 'maintenance_mode',
              label: 'Modo mantenimiento',
              description: 'Bloquea el acceso a usuarios no administradores',
            },
            {
              key: 'allow_student_registration',
              label: 'Registro libre de estudiantes',
              description: 'Permite que los estudiantes se registren sin aprobación previa',
            },
            {
              key: 'require_email_confirmation',
              label: 'Confirmación por correo',
              description: 'Requiere verificación de correo al registrarse',
            },
          ].map((opt) => (
            <label
              key={opt.key}
              className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  checked={config[opt.key]}
                  onChange={(e) => set(opt.key, e.target.checked)}
                  className="accent-red-600 w-4 h-4"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm transition-all"
          style={{ background: '#C0392B' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#922B21')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#C0392B')}
        >
          Guardar configuración
        </button>
      </div>
    </div>
  )
}
