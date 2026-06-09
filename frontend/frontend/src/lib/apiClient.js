import { getAccessToken, clearSession } from './authStorage'

// Un solo punto de entrada — el API Gateway enruta internamente a cada MS
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ---------------------------------------------------------------------------
// Cache en memoria + dedup de requests en vuelo
//   - Cachea respuestas GET por TTL configurable.
//   - Si dos componentes piden la misma URL al mismo tiempo, solo dispara
//     un fetch (in-flight dedup).
//   - Las mutaciones (POST/PATCH/DELETE) limpian el cache afectado.
// ---------------------------------------------------------------------------
const DEFAULT_TTL_MS = 30_000
const cache = new Map() // key → { data, expiresAt }
const inFlight = new Map() // key → Promise

function cacheKey(path, auth) {
  return `${auth ? 'A' : 'P'}:${path}`
}

function invalidatePrefix(prefix) {
  for (const key of cache.keys()) {
    if (key.includes(prefix)) cache.delete(key)
  }
}

async function request(
  path,
  { method = 'GET', body, auth = false, cacheTtl, skipCache = false } = {},
) {
  const isGet = method === 'GET'
  const key = cacheKey(path, auth)

  if (isGet && !skipCache) {
    // Cache hit
    const cached = cache.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }
    // Request ya en vuelo → reusar
    if (inFlight.has(key)) {
      return inFlight.get(key)
    }
  }

  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getAccessToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const promise = (async () => {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (res.status === 401) clearSession()

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        data?.detail ||
        data?.error ||
        Object.values(data).flat().join(' ') ||
        `Error ${res.status}`
      throw new Error(message)
    }
    return data
  })()

  if (isGet && !skipCache) {
    inFlight.set(key, promise)
    try {
      const data = await promise
      cache.set(key, {
        data,
        expiresAt: Date.now() + (cacheTtl ?? DEFAULT_TTL_MS),
      })
      return data
    } finally {
      inFlight.delete(key)
    }
  }

  const data = await promise

  // Las mutaciones invalidan cache relacionado al recurso modificado
  if (!isGet) {
    const segments = path.split('/').filter(Boolean)
    if (segments.length >= 3) {
      // ej: /api/v1/reservations/abc/ → invalida cualquier GET de /reservations/
      invalidatePrefix(`/${segments[0]}/${segments[1]}/${segments[2]}`)
    }
  }

  return data
}

// Expuesto para casos puntuales (logout, refresh manual, etc)
export function clearApiCache() {
  cache.clear()
  inFlight.clear()
}

// ---------------------------------------------------------------------------
// Auth — HU-01, 02, 03, 04
// ---------------------------------------------------------------------------
export const authApi = {
  login: (login, password) =>
    request('/api/v1/auth/login/', { method: 'POST', body: { login, password } }),

  register: (payload) =>
    request('/api/v1/auth/register/', { method: 'POST', body: payload }),

  logout: (refreshToken) =>
    request('/api/v1/auth/logout/', {
      method: 'POST',
      body: { refresh_token: refreshToken },
      auth: true,
    }),

  // HU-04
  forgotPassword: (email) =>
    request('/api/v1/auth/password-recovery/', { method: 'POST', body: { email } }),

  resetPassword: (token, newPassword) =>
    request('/api/v1/auth/reset-password/', {
      method: 'POST',
      body: { token, new_password: newPassword },
    }),
}

// ---------------------------------------------------------------------------
// Perfil — HU-05
// ---------------------------------------------------------------------------
export const usersApi = {
  me: () => request('/api/v1/users/me/', { auth: true }),

  updateMe: (payload) =>
    request('/api/v1/users/me/', { method: 'PATCH', body: payload, auth: true }),
}

// ---------------------------------------------------------------------------
// Admin — usuarios (HU-16, 17, 18, 19)
// ---------------------------------------------------------------------------
export const adminUsersApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/v1/admin/users/${qs ? `?${qs}` : ''}`, { auth: true })
  },

  create: (payload) =>
    request('/api/v1/admin/users/', { method: 'POST', body: payload, auth: true }),

  get: (id) => request(`/api/v1/admin/users/${id}/`, { auth: true }),

  update: (id, payload) =>
    request(`/api/v1/admin/users/${id}/`, {
      method: 'PATCH',
      body: payload,
      auth: true,
    }),

  deactivate: (id) =>
    request(`/api/v1/admin/users/${id}/`, { method: 'DELETE', auth: true }),
}

// ---------------------------------------------------------------------------
// Admin — dependencias / áreas (HU-1 proyecto)
// ---------------------------------------------------------------------------
export const areasApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/v1/areas/${qs ? `?${qs}` : ''}`, { auth: true })
  },

  get: (id) => request(`/api/v1/areas/${id}/`, { auth: true }),

  create: (payload) =>
    request('/api/v1/areas/', { method: 'POST', body: payload, auth: true }),

  update: (id, payload) =>
    request(`/api/v1/areas/${id}/`, { method: 'PATCH', body: payload, auth: true }),

  delete: (id) =>
    request(`/api/v1/areas/${id}/`, { method: 'DELETE', auth: true }),

  // HU-2 — Espacios de las dependencias donde el usuario es responsable
  misEspacios: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/v1/areas/mis-espacios/${qs ? `?${qs}` : ''}`, { auth: true })
  },
}

// ---------------------------------------------------------------------------
// Admin — espacios (HU-20, 21, 22, 23)
// ---------------------------------------------------------------------------
export const spacesApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/v1/spaces/${qs ? `?${qs}` : ''}`, { auth: true })
  },

  create: (payload) =>
    request('/api/v1/spaces/', { method: 'POST', body: payload, auth: true }),

  get: (id) => request(`/api/v1/spaces/${id}/`, { auth: true }),

  update: (id, payload) =>
    request(`/api/v1/spaces/${id}/`, {
      method: 'PATCH',
      body: payload,
      auth: true,
    }),

  delete: (id) =>
    request(`/api/v1/spaces/${id}/`, { method: 'DELETE', auth: true }),

  // Compatibilidad — usa areasApi internamente
  listAreas: (params = {}) => areasApi.list(params),
  createArea: (payload) => areasApi.create(payload),

  // HU-25 — Horarios
  getHorarios: (spaceId) =>
    request(`/api/v1/spaces/${spaceId}/horarios/`, { auth: true }),

  replaceHorarios: (spaceId, horarios) =>
    request(`/api/v1/spaces/${spaceId}/horarios/`, {
      method: 'PUT',
      body: horarios,
      auth: true,
    }),

  updateHorario: (spaceId, horarioId, payload) =>
    request(`/api/v1/spaces/${spaceId}/horarios/${horarioId}/`, {
      method: 'PATCH',
      body: payload,
      auth: true,
    }),

  deleteHorario: (spaceId, horarioId) =>
    request(`/api/v1/spaces/${spaceId}/horarios/${horarioId}/`, {
      method: 'DELETE',
      auth: true,
    }),
}

// ---------------------------------------------------------------------------
// Reservations (HU-06, 07, 08, HU-3)
// ---------------------------------------------------------------------------
export const reservationsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/v1/reservations/${qs ? `?${qs}` : ''}`, { auth: true })
  },

  // HU-3 — Admin: listar todas las reservas
  adminList: (params = {}) => {
    const qs = new URLSearchParams({ ...params, all: 'true' }).toString()
    return request(`/api/v1/reservations/?${qs}`, { auth: true })
  },

  get: (id) => request(`/api/v1/reservations/${id}/`, { auth: true }),

  create: (payload) =>
    request('/api/v1/reservations/', { method: 'POST', body: payload, auth: true }),

  cancel: (id) =>
    request(`/api/v1/reservations/${id}/`, {
      method: 'PATCH',
      body: { status: 'cancelled' },
      auth: true,
    }),

  // HU-3 — Admin: aprobar o rechazar una reserva pendiente
  review: (id, action, notes = '') =>
    request(`/api/v1/reservations/${id}/review/`, {
      method: 'PATCH',
      body: { action, notes },
      auth: true,
    }),

  // Consultar horas ocupadas de un espacio en una fecha
  bySpace: (spaceId, date) =>
    request(`/api/v1/reservations/by-space/${spaceId}/?date=${date}`),

  // HU-8 — Espacios ocupados en una franja
  busySpaces: (date, startHour, endHour) =>
    request(
      `/api/v1/reservations/busy-spaces/?date=${date}&start_hour=${startHour}&end_hour=${endHour}`,
    ),
}

// ---------------------------------------------------------------------------
// HU-26 — Reservation Rules (admin)
// ---------------------------------------------------------------------------
export const rulesApi = {
  get: () => request('/api/v1/admin/rules/', { auth: true }),
  update: (payload) =>
    request('/api/v1/admin/rules/', { method: 'PATCH', body: payload, auth: true }),
}

// ---------------------------------------------------------------------------
// HU-19 — Días bloqueados (festivos)
// ---------------------------------------------------------------------------
export const holidaysApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/v1/holidays/${qs ? `?${qs}` : ''}`)
  },
  check: (date, spaceId) => {
    const params = new URLSearchParams({ date })
    if (spaceId) params.set('space_id', spaceId)
    return request(`/api/v1/holidays/check/?${params.toString()}`)
  },
  create: (payload) =>
    request('/api/v1/holidays/', { method: 'POST', body: payload, auth: true }),
  delete: (id) => request(`/api/v1/holidays/${id}/`, { method: 'DELETE', auth: true }),
}

// ---------------------------------------------------------------------------
// HU-14 — Notificaciones del usuario
// ---------------------------------------------------------------------------
export const notificationsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/v1/notifications/${qs ? `?${qs}` : ''}`, { auth: true })
  },
}

// ---------------------------------------------------------------------------
// HU-22, 23, 24, 25 — Reportes (admin)
// ---------------------------------------------------------------------------
export const reportsApi = {
  summary: () => request('/api/v1/reports/summary/', { auth: true }),
  usage: (start, end) =>
    request(`/api/v1/reports/usage/?start_date=${start}&end_date=${end}`, { auth: true }),
  topSpaces: (start, end, limit = 10) =>
    request(
      `/api/v1/reports/top-spaces/?start_date=${start}&end_date=${end}&limit=${limit}`,
      { auth: true },
    ),
  heatmap: (start, end) =>
    request(`/api/v1/reports/heatmap/?start_date=${start}&end_date=${end}`, { auth: true }),

  // Descargas autenticadas: hace fetch con Bearer, arma blob y dispara descarga
  downloadCsv: (start, end) =>
    downloadAuthed(
      `/api/v1/reports/export/csv/?start_date=${start}&end_date=${end}`,
      `reporte_${start}_${end}.csv`,
    ),
  downloadPdf: (start, end) =>
    downloadAuthed(
      `/api/v1/reports/export/pdf/?start_date=${start}&end_date=${end}`,
      `reporte_${start}_${end}.pdf`,
    ),
}

// ---------------------------------------------------------------------------
// Helper: descarga autenticada → fetch con Bearer + blob + click trigger
// ---------------------------------------------------------------------------
async function downloadAuthed(path, filename) {
  const token = getAccessToken()
  if (!token) throw new Error('Sesión expirada.')

  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    clearSession()
    throw new Error('Sesión expirada.')
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Error ${res.status}`)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---------------------------------------------------------------------------
// HU-27 — Audit log (admin)
// ---------------------------------------------------------------------------
export const auditApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/v1/audit/${qs ? `?${qs}` : ''}`, { auth: true })
  },
}
