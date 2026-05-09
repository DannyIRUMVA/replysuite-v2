import { serverSupabaseServiceRole } from '#supabase/server'
import {
  createWidgetAccessToken,
  getRequestOriginContext,
  isAllowedDomainHost,
  isUuid,
  normalizeHost,
  setPublicCors,
} from '~~/server/utils/public-chatbot'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const supabase = serverSupabaseServiceRole(event)

  if (!isUuid(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or missing chatbot ID' })
  }

  const { data, error } = await supabase
    .from('chatbots')
    .select('user_id, name, is_public, deleted_at, primary_color, secondary_color, chat_bubble_style, widget_position, welcome_message, allowed_domains, launcher_color, launcher_icon, launcher_style, ai_disclosure, chat_icon, launcher_icon_color, chat_icon_color')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[Public Config] Failed to load chatbot config:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load chatbot config' })
  }

  if (!data || !data.is_public || data.deleted_at) {
    throw createError({ statusCode: 404, statusMessage: 'Chatbot not found' })
  }

  const requestContext = getRequestOriginContext(event)
  const allowedDomains = data.allowed_domains || []
  const allowLocalhostTesting = (data as any).allow_localhost_testing ?? true
  const requestHost = normalizeHost(requestContext.requestHost)

  if (allowedDomains.length > 0 && !requestHost) {
    throw createError({ statusCode: 403, statusMessage: 'Missing request origin' })
  }

  if (requestHost && !isAllowedDomainHost(event, requestHost, allowedDomains, { allowLocalhostTesting })) {
    throw createError({ statusCode: 403, statusMessage: 'Unauthorized domain' })
  }

  setPublicCors(event, requestContext.requestOrigin)

  if (event.method === 'OPTIONS') {
    return 'OK'
  }

  const { data: membership } = await supabase
    .from('user_memberships')
    .select(`
      plans (
        internal_slug,
        remove_branding
      )
    `)
    .eq('user_id', data.user_id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  const plan = membership?.plans as any
  const planSlug = plan?.internal_slug || 'starter'
  const removeBranding = plan?.remove_branding || false
  const embedHost = requestHost || 'replysuite.app'
  const embedToken = await createWidgetAccessToken(event, {
    chatbotId: id,
    host: embedHost,
  })

  return {
    success: true,
    name: data.name,
    primaryColor: data.primary_color || '#D4AF37',
    secondaryColor: data.secondary_color || '#0a0a0a',
    bubbleStyle: data.chat_bubble_style || 'rounded',
    widgetPosition: data.widget_position || 'bottom-right',
    welcomeMessage: data.welcome_message || 'Hello! How can I help you today?',
    launcherColor: data.launcher_color || data.primary_color || '#D4AF37',
    launcherIcon: data.launcher_icon || 'MessageSquare',
    launcherStyle: data.launcher_style || 'circle',
    launcherIconColor: data.launcher_icon_color || null,
    chatIcon: data.chat_icon || 'Bot',
    chatIconColor: data.chat_icon_color || null,
    aiDisclosure: data.ai_disclosure ?? true,
    removeBranding,
    planSlug,
    embedHost,
    embedToken,
  }
})
