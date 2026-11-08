const BACKEND = import.meta.env.VITE_BACKEND_URL ?? ''
const RECOG   = import.meta.env.VITE_RECOG_URL   ?? 'http://localhost:8001'
const RECOG_KEY = import.meta.env.VITE_RECOG_API_KEY ?? 'change-me-in-production'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init.headers as Record<string, string> ?? {}),
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body.message ?? `HTTP ${res.status}`), { status: res.status, body })
  }

  return res.json() as Promise<T>
}

export async function recognitionFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${RECOG}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': RECOG_KEY,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.detail ?? `HTTP ${res.status}`), { status: res.status })
  }

  return res.json() as Promise<T>
}
