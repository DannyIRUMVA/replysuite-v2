export const INSTAGRAM_GRAPH_API_VERSION = 'v21.0'
export const INSTAGRAM_GRAPH_API_BASE = `https://graph.facebook.com/${INSTAGRAM_GRAPH_API_VERSION}`
export const INSTAGRAM_LOGIN_API_BASE = `https://graph.instagram.com/${INSTAGRAM_GRAPH_API_VERSION}`

export const buildInstagramGraphUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${INSTAGRAM_GRAPH_API_BASE}/${cleanPath}`
}

export const buildInstagramLoginGraphUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${INSTAGRAM_LOGIN_API_BASE}/${cleanPath}`
}

export const postInstagramGraph = async (path: string, accessToken: string, body: Record<string, unknown>) => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  const candidates = [
    buildInstagramLoginGraphUrl(cleanPath),
    buildInstagramGraphUrl(cleanPath),
  ]
  let lastError: (Error & { payload?: unknown; status?: number }) | null = null

  for (const url of candidates) {
    const form = new URLSearchParams()
    form.set('access_token', accessToken)
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) form.set(key, String(value))
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })

    const data = await response.json().catch(() => ({}))
    if (response.ok && !data?.error) return data

    const message = data?.error?.message || `Instagram Graph request failed with HTTP ${response.status}`
    const error = new Error(message) as Error & { payload?: unknown; status?: number }
    error.payload = data
    error.status = response.status
    lastError = error
    console.warn('[Instagram Graph] POST candidate failed.', { url, status: response.status, message })
  }

  throw lastError || new Error('Instagram Graph request failed.')
}
