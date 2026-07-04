import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { isUuid } from '~~/server/utils/public-chatbot'

const sanitizeString = (value: unknown, maxLength = 500) => String(value || '').trim().slice(0, maxLength)

const withTimeout = async (url: string, timeoutMs = 5000) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ReplySuite Hermes Status/1.0',
      },
      signal: controller.signal,
    })
    const text = await response.text()
    let data: unknown = text
    try {
      data = JSON.parse(text)
    } catch {}
    return { ok: response.ok, status: response.status, data }
  } finally {
    clearTimeout(timer)
  }
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const query = getQuery(event)
  const chatbotId = sanitizeString(query.chatbotId || query.chatbot_id, 80)
  if (!isUuid(chatbotId)) throw createError({ statusCode: 400, statusMessage: 'Invalid chatbot id.' })

  const supabase = await serverSupabaseClient(event) as any
  const { data: chatbot, error } = await supabase
    .from('chatbots')
    .select('id, name, tools_config')
    .eq('id', chatbotId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !chatbot) throw createError({ statusCode: 404, statusMessage: 'Assistant not found.' })

  const control = chatbot.tools_config?.website_builder_control || {}
  const healthUrl = sanitizeString(control.health_url, 1000)
  const jobsUrl = sanitizeString(control.jobs_url, 1000)
  const baseUrl = sanitizeString(control.base_url, 1000)
  const webhookUrl = sanitizeString(control.webhook_url, 1000)
  const worker = sanitizeString(control.worker || control.worker_name, 120)
  const capabilities = Array.isArray(control.capabilities)
    ? control.capabilities.map((item: unknown) => sanitizeString(item, 80)).filter(Boolean).slice(0, 12)
    : []

  const configured = Boolean(control.enabled && webhookUrl)
  let health: any = null
  if (healthUrl) {
    try {
      health = await withTimeout(healthUrl)
    } catch (err: any) {
      health = { ok: false, status: 0, error: err?.name === 'AbortError' ? 'Health check timed out.' : 'Health check failed.' }
    }
  }

  return {
    success: true,
    chatbot: {
      name: chatbot.name,
    },
    hermes: {
      configured,
      enabled: Boolean(control.enabled),
      connected: Boolean(configured && health?.ok),
      baseUrl: baseUrl || null,
      healthUrl: healthUrl || null,
      jobsUrl: jobsUrl || null,
      webhookConfigured: Boolean(webhookUrl),
      worker: worker || null,
      capabilities,
      health,
    },
  }
})
