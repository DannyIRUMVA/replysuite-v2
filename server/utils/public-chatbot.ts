import { useRuntimeConfig } from '#imports'
import { createError, getHeader, H3Event, setResponseHeader } from 'h3'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RequestOriginContext = {
  origin: string | null
  referer: string | null
  requestOrigin: string | null
  requestHost: string
  refererPathname: string
}

type WidgetAccessClaims = {
  chatbotId: string
  host: string
  exp: number
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

async function signValue(secret: string, value: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return Buffer.from(signature).toString('base64url')
}

function getWidgetAccessSecret(event: H3Event) {
  const config = useRuntimeConfig(event)
  const secret = config.widgetAccessSecret || config.supabaseServiceKey

  if (!secret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Widget access signing secret is not configured.'
    })
  }

  return secret
}

export function isUuid(value?: string | null) {
  return !!value && UUID_RE.test(value)
}

export function normalizeHost(value?: string | null) {
  if (!value) return ''

  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return ''

  const normalized = trimmed.replace(/^https?:\/\//, '').split('/')[0]
  return normalized.replace(/:\d+$/, '')
}

export function getPlatformHosts(event: H3Event) {
  const config = useRuntimeConfig(event)
  const hosts = new Set<string>(['replysuite.app'])

  const candidates = [config.public?.siteUrl, config.siteUrl]
  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      hosts.add(new URL(candidate).hostname.toLowerCase())
    } catch {
      // ignore malformed env value
    }
  }

  return hosts
}

export function isLocalHost(host?: string | null) {
  const normalized = normalizeHost(host)
  return normalized === 'localhost' || normalized === '127.0.0.1'
}

export function isPlatformHost(event: H3Event, host?: string | null) {
  const normalized = normalizeHost(host)
  if (!normalized) return false

  for (const platformHost of getPlatformHosts(event)) {
    if (normalized === platformHost || normalized.endsWith(`.${platformHost}`)) {
      return true
    }
  }

  return false
}

export function getRequestOriginContext(event: H3Event): RequestOriginContext {
  const origin = getHeader(event, 'origin') || null
  const referer = getHeader(event, 'referer') || null

  let requestOrigin: string | null = null
  let requestHost = ''
  let refererPathname = ''

  try {
    if (origin && origin !== 'null') {
      const parsedOrigin = new URL(origin)
      requestOrigin = parsedOrigin.origin
      requestHost = parsedOrigin.hostname.toLowerCase()
    }
  } catch {
    // ignore invalid origin
  }

  try {
    if (referer) {
      const parsedReferer = new URL(referer)
      refererPathname = parsedReferer.pathname || ''
      if (!requestOrigin) {
        requestOrigin = parsedReferer.origin
      }
      if (!requestHost) {
        requestHost = parsedReferer.hostname.toLowerCase()
      }
    }
  } catch {
    // ignore invalid referer
  }

  return {
    origin,
    referer,
    requestOrigin,
    requestHost,
    refererPathname,
  }
}

export function isAllowedDomainHost(
  event: H3Event,
  host: string,
  allowedDomains: string[] = [],
  options: { allowLocalhostTesting?: boolean } = {}
) {
  const normalizedHost = normalizeHost(host)
  if (!normalizedHost) return allowedDomains.length === 0
  if (isPlatformHost(event, normalizedHost)) return true
  if (isLocalHost(normalizedHost)) return options.allowLocalhostTesting ?? true
  if (allowedDomains.length === 0) return true

  return allowedDomains.some((domain) => {
    const normalizedDomain = normalizeHost(domain)
    return !!normalizedDomain && (normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`))
  })
}

export function setPublicCors(event: H3Event, allowedOrigin?: string | null) {
  setResponseHeader(event, 'Vary', 'Origin')
  if (allowedOrigin) {
    setResponseHeader(event, 'Access-Control-Allow-Origin', allowedOrigin)
  }
  setResponseHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  setResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export async function createWidgetAccessToken(
  event: H3Event,
  payload: { chatbotId: string; host: string; expiresInSeconds?: number }
) {
  const secret = getWidgetAccessSecret(event)
  const claims: WidgetAccessClaims = {
    chatbotId: payload.chatbotId,
    host: normalizeHost(payload.host) || 'replysuite.app',
    exp: Math.floor(Date.now() / 1000) + (payload.expiresInSeconds || 60 * 30),
  }

  const encodedClaims = base64UrlEncode(JSON.stringify(claims))
  const signature = await signValue(secret, encodedClaims)
  return `${encodedClaims}.${signature}`
}

export async function verifyWidgetAccessToken(
  event: H3Event,
  token: string,
  expected: { chatbotId: string; host: string }
): Promise<WidgetAccessClaims | null> {
  try {
    const [encodedClaims, signature] = token.split('.')
    if (!encodedClaims || !signature) return null

    const secret = getWidgetAccessSecret(event)
    const expectedSignature = await signValue(secret, encodedClaims)
    if (expectedSignature !== signature) return null

    const claims = JSON.parse(base64UrlDecode(encodedClaims)) as WidgetAccessClaims
    if (!claims?.chatbotId || !claims?.host || !claims?.exp) return null
    if (claims.exp < Math.floor(Date.now() / 1000)) return null
    if (claims.chatbotId !== expected.chatbotId) return null
    if (normalizeHost(claims.host) !== normalizeHost(expected.host)) return null

    return claims
  } catch {
    return null
  }
}
