import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { isUuid } from '~~/server/utils/public-chatbot'

type WebsiteJobPayload = {
  business_name?: string
  language?: string
  pages?: unknown
  features?: unknown
  style?: unknown
  database?: unknown
  change_request?: unknown
  assets?: unknown
}

const ALLOWED_JOB_TYPES = new Set([
  'website.create',
  'website.update',
  'website.deploy',
  'website.preview',
  'website.logs',
])

const FORBIDDEN_KEY_PATTERNS = [
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /password/i,
  /database[_-]?url/i,
  /connection[_-]?string/i,
  /paypack/i,
  /payment[_-]?id/i,
  /provider[_-]?ref/i,
  /cloudflare/i,
  /neon/i,
]

const sanitizeString = (value: unknown, maxLength = 500) => String(value || '').trim().slice(0, maxLength)

const hasForbiddenKeys = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some(hasForbiddenKeys)

  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
    if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))) return true
    return hasForbiddenKeys(nested)
  })
}

const sanitizeStringArray = (value: unknown, maxItems = 20) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => sanitizeString(item, 80))
    .filter(Boolean)
    .slice(0, maxItems)
}

const sanitizeStyle = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const style = value as Record<string, unknown>
  return {
    tone: sanitizeString(style.tone, 80) || 'simple',
    colors: sanitizeStringArray(style.colors, 8),
  }
}

const sanitizeDatabase = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const database = value as Record<string, unknown>
  return {
    required: Boolean(database.required),
    purpose: sanitizeString(database.purpose, 160),
  }
}

const sanitizeAssets = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value
    .map((asset) => {
      if (!asset || typeof asset !== 'object' || Array.isArray(asset)) return null
      const item = asset as Record<string, unknown>
      const url = sanitizeString(item.url, 1000)
      let parsed: URL
      try {
        parsed = new URL(url)
      } catch {
        return null
      }
      if (!['https:'].includes(parsed.protocol)) return null
      return {
        type: sanitizeString(item.type, 40) || 'image',
        url: parsed.toString(),
        mime_type: sanitizeString(item.mime_type || item.mimeType, 80),
        caption: sanitizeString(item.caption, 240),
        usage_hint: sanitizeString(item.usage_hint || item.usageHint, 240) || 'Use this customer-provided image in the website when relevant.',
      }
    })
    .filter(Boolean)
    .slice(0, 12)
}

const sanitizePayload = (payload: WebsiteJobPayload, type = 'website.create') => {
  if (hasForbiddenKeys(payload)) {
    throw createError({ statusCode: 400, statusMessage: 'Job payload contains forbidden sensitive fields.' })
  }

  const sanitized: Record<string, unknown> = {
    business_name: sanitizeString(payload.business_name, 120),
    language: sanitizeString(payload.language, 12) || 'rw',
    pages: sanitizeStringArray(payload.pages, 30),
    features: sanitizeStringArray(payload.features, 30),
    change_request: sanitizeString(payload.change_request, 2000),
  }

  const assets = sanitizeAssets(payload.assets)
  if (assets.length) sanitized.assets = assets

  const style = sanitizeStyle(payload.style)
  if (style) sanitized.style = style

  const database = sanitizeDatabase(payload.database)
  if (database?.required || database?.purpose) sanitized.database = database

  if (!sanitized.business_name) {
    throw createError({ statusCode: 400, statusMessage: 'Business name is required.' })
  }

  if (type === 'website.create' && !(sanitized.pages as string[]).length) {
    throw createError({ statusCode: 400, statusMessage: 'At least one website page is required.' })
  }

  if (type === 'website.update' && !sanitized.change_request && !assets.length && !(sanitized.features as string[]).length) {
    throw createError({ statusCode: 400, statusMessage: 'Change request, feature list, or asset is required for website updates.' })
  }

  return sanitized
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const chatbotId = sanitizeString(body?.chatbot_id || body?.chatbotId, 80)
  if (!isUuid(chatbotId)) throw createError({ statusCode: 400, statusMessage: 'Invalid chatbot id.' })

  const type = sanitizeString(body?.type, 40) || 'website.create'
  if (!ALLOWED_JOB_TYPES.has(type)) throw createError({ statusCode: 400, statusMessage: 'Unsupported website job type.' })

  const supabase = await serverSupabaseClient(event) as any
  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('id, name, tools_config')
    .eq('id', chatbotId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (chatbotError || !chatbot) throw createError({ statusCode: 404, statusMessage: 'Assistant not found.' })

  const control = chatbot.tools_config?.website_builder_control
  if (!control?.enabled || !control?.webhook_url) {
    throw createError({ statusCode: 409, statusMessage: 'Website builder control endpoint is not configured for this assistant.' })
  }

  const config = useRuntimeConfig()
  const secret = String(config.replySuiteHermesWebhookSecret || '').trim()
  if (!secret) {
    throw createError({ statusCode: 503, statusMessage: 'Website builder webhook secret is not configured server-side.' })
  }

  const payload = sanitizePayload(body?.payload || {}, type)
  const safeProjectBase = sanitizeString(body?.project_ref || payload.business_name, 80)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'website-project'
  const suffix = crypto.randomUUID().slice(0, 8)
  const projectRef = `${safeProjectBase}-${suffix}`
  const jobId = `job_${suffix}_${Date.now()}`

  const outbound = {
    event: 'job.created',
    job_id: jobId,
    project_ref: projectRef,
    type,
    payload,
  }

  const response = await fetch(control.webhook_url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'ReplySuite Hermes Control/1.0',
    },
    body: JSON.stringify(outbound),
  })

  const responseText = await response.text()
  let responseData: unknown = responseText
  try {
    responseData = JSON.parse(responseText)
  } catch {}

  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Website builder endpoint rejected the job.',
      data: { status: response.status, response: responseData },
    })
  }

  return {
    success: true,
    sent: true,
    job: {
      jobId,
      projectRef,
      type,
      status: 'sent',
    },
    endpointResponse: responseData,
  }
})
