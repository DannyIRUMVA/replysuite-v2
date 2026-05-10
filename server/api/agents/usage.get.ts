import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { isUuid } from '~~/server/utils/public-chatbot'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const chatbotId = getQuery(event).chatbotId as string | undefined
  if (!isUuid(chatbotId)) {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid chatbotId' })
  }

  const userClient = await serverSupabaseClient(event)
  const { data: chatbot, error: chatbotError } = await userClient
    .from('chatbots')
    .select('id')
    .eq('id', chatbotId)
    .maybeSingle()

  if (chatbotError || !chatbot) {
    throw createError({ statusCode: 404, statusMessage: 'Chatbot not found or access denied' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const now = new Date()
  now.setUTCDate(1)
  now.setUTCHours(0, 0, 0, 0)
  const monthStart = now.toISOString()

  const { count: assistantReplyCount } = await supabase.from('chat_messages')
    .select('id, chat_sessions!inner(chatbot_id)', { count: 'exact', head: true })
    .eq('chat_sessions.chatbot_id', chatbotId)
    .eq('role', 'assistant')
    .gte('created_at', monthStart)

  const totalUsage = assistantReplyCount || 0

  return {
    usage: totalUsage
  }
})
