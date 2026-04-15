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
  
  // Get current month
  const now = new Date()
  const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('training_usage')
    .select('training_count')
    .eq('chatbot_id', chatbotId)
    .eq('month_year', currentMonth)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
    console.error('Error fetching usage:', error)
  }

  return {
    usage: data?.training_count || 0
  }
})
