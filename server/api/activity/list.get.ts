import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  const userId = (user as any)?.id || (user as any)?.sub

  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const limitQuery = Number(getQuery(event).limit || 5)
  const limit = Number.isFinite(limitQuery) ? Math.min(Math.max(limitQuery, 1), 20) : 5
  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('user_activity')
    .select('id, user_id, type, source, meta, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[ActivityList] Failed to load activity:', error)
    throw createError({ statusCode: 500, statusMessage: 'Unable to load activity' })
  }

  return data || []
})
