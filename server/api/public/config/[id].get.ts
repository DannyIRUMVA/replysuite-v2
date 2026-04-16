import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const supabase = serverSupabaseServiceRole(event)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing chatbot ID' })
  }

  const { data, error } = await supabase
    .from('chatbots')
    .select('name, is_public')
    .eq('id', id)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Chatbot not found' })
  }

  return {
    success: true,
    name: data.name
  }
})
