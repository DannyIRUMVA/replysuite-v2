import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const supabase = serverSupabaseServiceRole(event)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing chatbot ID' })
  }

  const { data, error } = await supabase
    .from('chatbots')
    .select('name, is_public, primary_color, secondary_color, chat_bubble_style, widget_position, welcome_message, allowed_domains')
    .eq('id', id)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Chatbot not found' })
  }

  // Domain Verification
  const origin = getHeader(event, 'origin') || ''
  const referer = getHeader(event, 'referer') || ''
  const allowedDomains = data.allowed_domains || []

  if (allowedDomains.length > 0) {
    const requestHost = origin ? new URL(origin).hostname : (referer ? new URL(referer).hostname : '')
    
    // Always allow localhost for development convenience
    const isLocal = requestHost === 'localhost' || requestHost === '127.0.0.1'
    const isAllowed = isLocal || allowedDomains.some(domain => {
      // Basic wildcard/contains check or exact match
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
  }
})
