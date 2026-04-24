import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const supabase = serverSupabaseServiceRole(event)

  // Handle CORS
  setResponseHeader(event, 'Access-Control-Allow-Origin', '*')
  setResponseHeader(event, 'Access-Control-Allow-Methods', 'GET, OPTIONS')
  setResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (event.method === 'OPTIONS') {
    return 'OK'
  }

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing chatbot ID' })
  }

  const { data, error } = await supabase
    .from('chatbots')
    .select('user_id, name, is_public, primary_color, secondary_color, chat_bubble_style, widget_position, welcome_message, allowed_domains, launcher_color, launcher_icon, launcher_style, ai_disclosure, chat_icon, launcher_icon_color, chat_icon_color')
    .eq('id', id)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Chatbot not found' })
  }

  // Get owner's plan details for feature gating
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

  // Domain Verification
  const origin = getHeader(event, 'origin') || ''
  const referer = getHeader(event, 'referer') || ''
  const allowedDomains = data.allowed_domains || []

  if (allowedDomains.length > 0) {
    let requestHost = ''
    
    try {
      if (origin && origin !== 'null') {
        requestHost = new URL(origin).hostname
      } else if (referer) {
        requestHost = new URL(referer).hostname
      }
    } catch (e) {
      console.warn(`[Security] Failed to parse origin/referer for chatbot ${id}:`, { origin, referer })
    }
    
    // Always allow localhost for development convenience
    const isLocal = requestHost === 'localhost' || requestHost === '127.0.0.1' || !requestHost
    const isAllowed = isLocal || allowedDomains.some(domain => {
      const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0]
      return requestHost === cleanDomain || requestHost.endsWith(`.${cleanDomain}`)
    })

    if (!isAllowed && requestHost) {
      console.warn(`[Security] Unauthorized widget access from: ${requestHost} for chatbot: ${id}`)
      throw createError({ statusCode: 403, statusMessage: 'Unauthorized domain' })
    }
  }

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
    planSlug
  }
})
