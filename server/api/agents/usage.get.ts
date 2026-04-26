import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { chatbotId } = getQuery(event)
  if (!chatbotId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing chatbotId' })
  }

  const supabase = serverSupabaseServiceRole(event)
  
  // Get current month start
  const now = new Date()
  now.setUTCDate(1)
  now.setUTCHours(0, 0, 0, 0)
  const monthStart = now.toISOString()

  // Parallel fetch counts from all sources of truth
  const [waRes, webRes] = await Promise.all([
    supabase.from('whatsapp_message_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('chatbot_id', chatbotId)
      .gte('created_at', monthStart),

    supabase.from('chat_messages')
      .select('id, chat_sessions!inner(chatbot_id)', { count: 'exact', head: true })
      .eq('chat_sessions.chatbot_id', chatbotId)
      .eq('role', 'assistant')
      .gte('created_at', monthStart)
  ])

  const totalUsage = (waRes.count || 0) + (webRes.count || 0)

  return {
    usage: totalUsage
  }
})
