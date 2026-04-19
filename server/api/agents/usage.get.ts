import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { chatbotId } = getQuery(event)
  if (!chatbotId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing chatbotId' })
  }

  const supabase = await serverSupabaseClient(event)
  
  // Get current month start
  const now = new Date()
  now.setUTCDate(1)
  now.setUTCHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('instagram_message_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('chatbot_id', chatbotId)
    .neq('status', 'skipped')
    .gte('created_at', now.toISOString())

  if (error) {
    console.error('Error fetching usage:', error)
  }

  return {
    usage: count || 0
  }
})
