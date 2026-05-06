import { getAccessToken, clearSession } from './authStorage'

// Un solo punto de entrada — el API Gateway enruta internamente a cada MS
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }

  if (auth) {
    const token = getAccessToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  // Si el token expiró, limpiar sesión
  if (res.status === 401) {
    clearSession()
  }

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

  // Áreas
  listAreas: () => request('/api/v1/areas/', { auth: true }),
  createArea: (payload) =>
    request('/api/v1/areas/', { method: 'POST', body: payload, auth: true }),

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
// Reservations (HU-06, 07, 08)
// ---------------------------------------------------------------------------
export const reservationsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/v1/reservations/${qs ? `?${qs}` : ''}`, { auth: true })
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

  // Consultar horas ocupadas de un espacio en una fecha
  bySpace: (spaceId, date) =>
    request(`/api/v1/reservations/by-space/${spaceId}/?date=${date}`),
}
