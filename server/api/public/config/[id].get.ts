import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const supabase = serverSupabaseServiceRole(event)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing chatbot ID' })
  }

  const { data, error } = await supabase
    .from('chatbots')
    .select('name, is_public, primary_color, secondary_color, chat_bubble_style, widget_position, welcome_message')
    .eq('id', id)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Chatbot not found' })
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
