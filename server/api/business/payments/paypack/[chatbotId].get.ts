import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { isUuid } from '~~/server/utils/public-chatbot'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const chatbotId = String(getRouterParam(event, 'chatbotId') || '')
  if (!isUuid(chatbotId)) throw createError({ statusCode: 400, statusMessage: 'Invalid chatbot id' })

  const supabase = await serverSupabaseClient(event) as any
  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('id')
    .eq('id', chatbotId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (chatbotError || !chatbot) throw createError({ statusCode: 404, statusMessage: 'Assistant not found' })

  const { data } = await supabase
    .from('chatbot_payment_providers')
    .select('client_id, is_active, updated_at')
    .eq('chatbot_id', chatbotId)
    .eq('provider', 'paypack')
    .maybeSingle()

  return {
    configured: Boolean(data?.client_id),
    clientId: data?.client_id || '',
    isActive: data?.is_active ?? false,
    updatedAt: data?.updated_at || null,
  }
})
