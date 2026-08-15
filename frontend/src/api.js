const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// FastAPI sends a string detail for our errors and a list for 422s.
function message(data) {
  if (!data) return null
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) return data.detail[0]?.msg
  return null
}

export async function api(path, { method = 'GET', body, token } = {}) {
  let res
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?')
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(message(data) || 'Something went wrong')
  return data
}
