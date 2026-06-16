import { createError } from 'h3'
import { encryptSecret } from './crypto/secrets'

const textEncoder = new TextEncoder()

export const GOOGLE_CALENDAR_SCOPES = [
  // Booking-only scopes. Supabase Google login is separate and is not part of this flow.
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.readonly',
]

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
