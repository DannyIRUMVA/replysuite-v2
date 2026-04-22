import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const adminClient = serverSupabaseServiceRole(event)
  const { data: plans } = await adminClient.from('plans').select('*')
  return { plans }
})
