type Env = {
  AVATAR_BUCKET: R2Bucket
  AVATAR_WORKER_SECRET?: string
  MAX_UPLOAD_BYTES?: string
  ALLOWED_MIME_TYPES?: string
  AVATAR_PUBLIC_BASE_URL?: string
}

type UploadResponse = {
  success: true
  key: string
  url: string
  mimeType: string
  size: number
  filename: string
}

const DEFAULT_ALLOWED_MIME_TYPES = 'image/jpeg,image/png,image/webp,image/gif'
const DEFAULT_MAX_UPLOAD_BYTES = 2 * 1024 * 1024

const json = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), {
  ...init,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    ...(init.headers || {}),
  },
})

const sanitizeSegment = (value: unknown, fallback = 'avatar') => {
  const safe = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
  return safe || fallback
}

const extensionForMime = (mimeType: string) => {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  return 'bin'
}

const constantTimeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

const requireBearer = (request: Request, env: Env) => {
  const configuredSecret = String(env.AVATAR_WORKER_SECRET || '').trim()
  if (!configuredSecret) return false
  const header = request.headers.get('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  return Boolean(token) && constantTimeEqual(token, configuredSecret)
}

const allowedMimeTypes = (env: Env) => new Set(
  String(env.ALLOWED_MIME_TYPES || DEFAULT_ALLOWED_MIME_TYPES)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
)

const buildAvatarUrl = (request: Request, env: Env, key: string) => {
  const base = String(env.AVATAR_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '')
  if (base) return `${base}/${key}`
  const url = new URL(request.url)
  return `${url.origin}/avatar/${key}`
}

const upload = async (request: Request, env: Env): Promise<Response> => {
  if (!requireBearer(request, env)) {
    return json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const contentType = request.headers.get('Content-Type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return json({ success: false, error: 'Use multipart/form-data with an avatar field.' }, { status: 415 })
  }

  const form = await request.formData()
  const file = form.get('avatar') || form.get('file')
  if (!(file instanceof File)) {
    return json({ success: false, error: 'Missing avatar file.' }, { status: 400 })
  }

  const maxBytes = Number(env.MAX_UPLOAD_BYTES || DEFAULT_MAX_UPLOAD_BYTES)
  if (file.size <= 0 || file.size > maxBytes) {
    return json({ success: false, error: `Avatar must be between 1 byte and ${maxBytes} bytes.` }, { status: 413 })
  }

  const mimeType = String(file.type || 'application/octet-stream').toLowerCase()
  if (!allowedMimeTypes(env).has(mimeType)) {
    return json({ success: false, error: 'Avatar must be a JPG, PNG, WebP, or GIF image.' }, { status: 415 })
  }

  const userSlug = sanitizeSegment(form.get('user_id') || form.get('userId') || form.get('user'), 'user')
  const originalName = String(file.name || `avatar.${extensionForMime(mimeType)}`).slice(0, 120)
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
  const key = `profiles/${userSlug}/avatar-${Date.now()}-${random}.${extensionForMime(mimeType)}`

  await env.AVATAR_BUCKET.put(key, file.stream(), {
    httpMetadata: {
      contentType: mimeType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
    customMetadata: {
      source: 'replysuite-profile-avatar',
      user: userSlug,
      originalFilename: originalName,
      uploadedAt: new Date().toISOString(),
    },
  })

  const response: UploadResponse = {
    success: true,
    key,
    url: buildAvatarUrl(request, env, key),
    mimeType,
    size: file.size,
    filename: originalName,
  }

  return json(response)
}

const serveAvatar = async (request: Request, env: Env, key: string): Promise<Response> => {
  const safeKey = key.replace(/^\/+/, '')
  if (!safeKey || safeKey.includes('..') || !safeKey.startsWith('profiles/')) {
    return new Response('Not found', { status: 404 })
  }

  const object = await env.AVATAR_BUCKET.get(safeKey)
  if (!object) return new Response('Not found', { status: 404 })

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', headers.get('cache-control') || 'public, max-age=31536000, immutable')
  headers.set('access-control-allow-origin', '*')
  headers.set('x-content-type-options', 'nosniff')

  if (request.method === 'HEAD') return new Response(null, { headers })
  return new Response(object.body, { headers })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization,Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    if (url.pathname === '/health') {
      return json({
        success: true,
        service: 'replysuite-avatar-worker',
        bucketConfigured: Boolean(env.AVATAR_BUCKET),
        allowedMimeTypes: Array.from(allowedMimeTypes(env)),
        maxUploadBytes: Number(env.MAX_UPLOAD_BYTES || DEFAULT_MAX_UPLOAD_BYTES),
      })
    }

    if (url.pathname === '/upload' && request.method === 'POST') {
      return upload(request, env)
    }

    if (url.pathname.startsWith('/avatar/') && ['GET', 'HEAD'].includes(request.method)) {
      const key = decodeURIComponent(url.pathname.slice('/avatar/'.length))
      return serveAvatar(request, env, key)
    }

    return json({ success: false, error: 'Not found' }, { status: 404 })
  },
}
