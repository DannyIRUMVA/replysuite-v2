import { serverSupabaseServiceRole } from '#supabase/server'
import { getAuthenticatedUserId } from '~~/server/utils/auth'
import { isUuid } from '~~/server/utils/public-chatbot'

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)

  const accountId = getRouterParam(event, 'id') || ''
  if (!isUuid(accountId)) throw createError({ statusCode: 400, statusMessage: 'Invalid Instagram account ID.' })

  const supabase = serverSupabaseServiceRole(event)
  const { data: account } = await supabase
    .from('instagram_accounts')
    .select('id, user_id')
    .eq('id', accountId)
    .maybeSingle()

  if (!account || account.user_id !== userId) {
    throw createError({ statusCode: 404, statusMessage: 'Instagram account not found.' })
  }

  const { data: posts } = await supabase
    .from('instagram_posts')
    .select('id')
    .eq('instagram_account_id', accountId)

  const postIds = (posts || []).map((post: any) => post.id)

  if (postIds.length) {
    await supabase.from('instagram_comment_triggers').delete().in('instagram_post_id', postIds)
    await supabase.from('instagram_message_jobs').delete().eq('instagram_account_id', accountId)
    await supabase.from('instagram_comments').delete().eq('instagram_account_id', accountId)
    await supabase.from('instagram_posts').delete().in('id', postIds)
  }

  const { error } = await supabase.from('instagram_accounts').delete().eq('id', accountId)
  if (error) throw error

  return { success: true, message: 'Instagram account disconnected.' }
})
