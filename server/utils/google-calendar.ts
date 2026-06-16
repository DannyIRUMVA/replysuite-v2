import { createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { decryptSecret, encryptSecret } from './crypto/secrets'

const textEncoder = new TextEncoder()

export const GOOGLE_CALENDAR_SCOPES = [
  // Booking-only scopes. Supabase Google login is separate and is not part of this flow.
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.readonly',
]

export const isMissingGoogleCalendarSchemaError = (error: any) => {
  const message = String(error?.message || error?.statusMessage || '')
  const code = String(error?.code || '')
  return code === 'PGRST205'
    || message.includes("Could not find the table 'public.google_connections'")
    || message.includes("Could not find the table 'public.chatbot_google_calendars'")
    || message.includes('schema cache')
    || message.includes('relation "public.google_connections" does not exist')
    || message.includes('relation "public.chatbot_google_calendars" does not exist')
}

export const assertGoogleCalendarConfig = (config: any) => {
  if (!config.googleClientId || !config.googleClientSecret || !config.googleRedirectUri) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Google Calendar is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.',
    })
  }
  if (!config.googleTokenEncryptionKey || String(config.googleTokenEncryptionKey).length < 24) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Google token encryption key is missing or too short. Set GOOGLE_TOKEN_ENCRYPTION_KEY to a strong 32+ character value.',
    })
  }
}

const toBase64Url = (value: string) => btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
const bytesToBase64Url = (bytes: Uint8Array) => toBase64Url(String.fromCharCode(...bytes))
const fromBase64Url = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)
  return atob(padded)
}

const getGoogleStateSigningKey = async (secret: string) => {
  if (!secret || secret.length < 24) throw createError({ statusCode: 500, statusMessage: 'Google token encryption key is missing or too short.' })
  return crypto.subtle.importKey('raw', textEncoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export const encodeGoogleOAuthState = async (payload: Record<string, any>, secret: string) => {
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const key = await getGoogleStateSigningKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(encodedPayload))
  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`
}

export const decodeGoogleOAuthState = async (state: string, secret: string) => {
  try {
    const [encodedPayload, encodedSignature] = state.split('.')
    if (!encodedPayload || !encodedSignature) throw new Error('Malformed state')

    const key = await getGoogleStateSigningKey(secret)
    const signature = new Uint8Array(fromBase64Url(encodedSignature).split('').map((char) => char.charCodeAt(0)))
    const verified = await crypto.subtle.verify('HMAC', key, signature, textEncoder.encode(encodedPayload))
    if (!verified) throw new Error('Invalid signature')

    return JSON.parse(fromBase64Url(encodedPayload))
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Google OAuth state.' })
  }
}

export const exchangeGoogleCodeForTokens = async (config: any, code: string) => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: config.googleRedirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const json = await response.json<any>().catch(() => ({}))
  if (!response.ok) {
    throw createError({ statusCode: 502, statusMessage: json?.error_description || json?.error || 'Google token exchange failed.' })
  }
  return json
}

export const fetchGoogleUserInfo = async (accessToken: string) => {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) return null
  return response.json<any>()
}

export const fetchGoogleCalendarList = async (accessToken: string) => {
  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer', {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const json = await response.json<any>().catch(() => ({}))
  if (!response.ok) {
    throw createError({ statusCode: 502, statusMessage: json?.error?.message || 'Could not load Google calendars.' })
  }
  return Array.isArray(json.items) ? json.items : []
}

export const encryptGoogleTokenPayload = async (config: any, value?: string | null) => {
  if (!value) return null
  return encryptSecret(value, config.googleTokenEncryptionKey)
}

export const decryptGoogleTokenPayload = async (config: any, value?: string | null) => {
  if (!value) return ''
  return decryptSecret(value, config.googleTokenEncryptionKey)
}

export const getGoogleCalendarBookingConnection = async (event: any, chatbotId: string) => {
  const supabase = serverSupabaseServiceRole(event) as any
  const { data: mapping, error: mappingError } = await supabase
    .from('chatbot_google_calendars')
    .select('id, user_id, chatbot_id, google_connection_id, calendar_id, calendar_summary, calendar_timezone, sync_status, connection:google_connections(id, encrypted_access_token, encrypted_refresh_token, expires_at, status)')
    .eq('chatbot_id', chatbotId)
    .eq('sync_status', 'connected')
    .maybeSingle()

  if (mappingError) return { error: mappingError.message, mapping: null, accessToken: '' }
  if (!mapping?.connection || mapping.connection.status !== 'connected') return { error: 'Google Calendar is not connected for this assistant.', mapping: null, accessToken: '' }

  const config = useRuntimeConfig(event)
  let accessToken = await decryptGoogleTokenPayload(config, mapping.connection.encrypted_access_token)
  const refreshToken = await decryptGoogleTokenPayload(config, mapping.connection.encrypted_refresh_token)
  const expiresAt = mapping.connection.expires_at ? new Date(mapping.connection.expires_at).getTime() : 0

  if ((!accessToken || expiresAt < Date.now() + 60_000) && refreshToken) {
    const refreshed = await refreshGoogleAccessToken(config, refreshToken)
    accessToken = refreshed.access_token || accessToken
    const encryptedAccessToken = accessToken ? await encryptGoogleTokenPayload(config, accessToken) : mapping.connection.encrypted_access_token
    const nextExpiresAt = refreshed.expires_in ? new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString() : mapping.connection.expires_at
    await supabase
      .from('google_connections')
      .update({ encrypted_access_token: encryptedAccessToken, expires_at: nextExpiresAt, updated_at: new Date().toISOString() })
      .eq('id', mapping.google_connection_id)
  }

  if (!accessToken) return { error: 'Google Calendar access token is unavailable. Reconnect Google Calendar.', mapping, accessToken: '' }
  return { error: null, mapping, accessToken }
}

export const refreshGoogleAccessToken = async (config: any, refreshToken: string) => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const json = await response.json<any>().catch(() => ({}))
  if (!response.ok) {
    throw createError({ statusCode: 502, statusMessage: json?.error_description || json?.error || 'Google token refresh failed.' })
  }
  return json
}

export const checkGoogleCalendarFreeBusy = async (accessToken: string, calendarId: string, timeMin: string, timeMax: string, timeZone = 'Africa/Kigali') => {
  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ timeMin, timeMax, timeZone, items: [{ id: calendarId }] }),
  })
  const json = await response.json<any>().catch(() => ({}))
  if (!response.ok) {
    throw createError({ statusCode: 502, statusMessage: json?.error?.message || 'Google Calendar free/busy check failed.' })
  }
  const busy = json?.calendars?.[calendarId]?.busy || []
  return { available: busy.length === 0, busy }
}

export const createGoogleCalendarEvent = async (accessToken: string, calendarId: string, eventPayload: any) => {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(eventPayload),
  })
  const json = await response.json<any>().catch(() => ({}))
  if (!response.ok) {
    throw createError({ statusCode: 502, statusMessage: json?.error?.message || 'Google Calendar event creation failed.' })
  }
  return json
}
