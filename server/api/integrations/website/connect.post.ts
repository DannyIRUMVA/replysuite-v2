import { readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { getAuthContext } from '~~/server/utils/auth'
import { isLocalHost, isPlatformHost, isUuid, normalizeHost } from '~~/server/utils/public-chatbot'

function sanitizeDomains(input: unknown) {
  if (!Array.isArray(input)) return [] as string[]

  const unique = new Set<string>()

  for (const value of input) {
    if (typeof value !== 'string') continue
    const normalized = normalizeHost(value)
    if (!normalized) continue
    if (isLocalHost(normalized)) continue
    unique.add(normalized)
  }

  return Array.from(unique)
}

export default defineEventHandler(async (event) => {
  const auth = await getAuthContext(event)
  const body = await readBody(event)

  const chatbotId = typeof body?.chatbotId === 'string' ? body.chatbotId.trim() : ''
  const requestedDomains = sanitizeDomains(body?.allowedDomains)
  const requestedLocalhostTesting = typeof body?.allowLocalhostTesting === 'boolean'
    ? body.allowLocalhostTesting
    : true

  if (!isUuid(chatbotId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid chatbot selected for website connection.' })
  }

  for (const domain of requestedDomains) {
    if (isPlatformHost(event, domain)) {
      throw createError({ statusCode: 400, statusMessage: 'ReplySuite platform domains cannot be added as approved customer domains.' })
    }
  }

  if (requestedDomains.length > auth!.limits.max_website_domains) {
    throw createError({
      statusCode: 403,
      statusMessage: `Your current plan allows up to ${auth!.limits.max_website_domains} website domain${auth!.limits.max_website_domains === 1 ? '' : 's'} per chatbot.`
    })
  }

  const supabase = serverSupabaseServiceRole(event)
  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('id, user_id, deleted_at, is_public, allowed_domains')
    .eq('id', chatbotId)
    .maybeSingle()

  if (chatbotError || !chatbot || chatbot.deleted_at || chatbot.user_id !== auth!.userId) {
    throw createError({ statusCode: 404, statusMessage: 'Chatbot not found for this account.' })
  }

  const updatePayload: Record<string, unknown> = {
    allowed_domains: requestedDomains,
    allow_localhost_testing: requestedDomains.length > 0 ? requestedLocalhostTesting : true,
    is_public: requestedDomains.length > 0,
  }

  let updated: any = null
  let updateError: any = null

  const primaryUpdate = await supabase
    .from('chatbots')
    .update(updatePayload)
    .eq('id', chatbotId)
    .eq('user_id', auth!.userId)
    .select('id, allowed_domains, is_public')
    .single()

  updated = primaryUpdate.data
  updateError = primaryUpdate.error

  if (updateError?.message?.includes('allow_localhost_testing')) {
    const fallbackUpdate = await supabase
      .from('chatbots')
      .update({
        allowed_domains: requestedDomains,
        is_public: requestedDomains.length > 0,
      })
      .eq('id', chatbotId)
      .eq('user_id', auth!.userId)
      .select('id, allowed_domains, is_public')
      .single()

    updated = fallbackUpdate.data
    updateError = fallbackUpdate.error
  }

  if (updateError || !updated) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to save website connection settings.' })
  }

  return {
    success: true,
    chatbotId: updated.id,
    allowedDomains: updated.allowed_domains || [],
    allowLocalhostTesting: requestedDomains.length > 0 ? requestedLocalhostTesting : true,
    isPublic: updated.is_public ?? false,
    message: requestedDomains.length > 0
      ? 'Website connection is active and synced.'
      : 'Website connection has been reset to draft mode.'
  }
})
