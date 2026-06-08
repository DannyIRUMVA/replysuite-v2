import { serverSupabaseServiceRole } from '#supabase/server'
import { getAuthenticatedUserId } from '~~/server/utils/auth'
import { processInstagramComment } from '~~/server/utils/integrations/instagram/automation'
import { fetchInstagramComments } from '~~/server/utils/integrations/instagram/polling'
import { isUuid } from '~~/server/utils/public-chatbot'

const readPostId = async (event: any) => {
  const body = await readBody(event).catch(() => ({}))
  const value = body?.postId || body?.post_id || body?.mediaId || body?.media_id
  return typeof value === 'string' ? value.trim() : ''
}

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Authentication required.' })
  const accountId = getRouterParam(event, 'id') || ''
  const postId = await readPostId(event)

  if (!isUuid(accountId)) throw createError({ statusCode: 400, statusMessage: 'Invalid Instagram account ID.' })
  if (!postId) throw createError({ statusCode: 400, statusMessage: 'Choose a post before checking comments.' })

  const supabase = serverSupabaseServiceRole(event)
  const { data: account, error: accountError } = await supabase
    .from('instagram_accounts')
    .select('id, user_id, username, instagram_account_id, access_token')
    .eq('id', accountId)
    .eq('user_id', userId)
    .maybeSingle()

  if (accountError) throw accountError
  if (!account) throw createError({ statusCode: 404, statusMessage: 'Instagram account not found.' })
  if (!account.access_token) throw createError({ statusCode: 400, statusMessage: 'Reconnect Instagram before checking comments.' })
  const accessToken = String(account.access_token)
  const instagramAccountId = String(account.instagram_account_id || '')

  const { data: post, error: postError } = await supabase
    .from('instagram_posts')
    .select('id, instagram_account_id')
    .eq('id', postId)
    .eq('instagram_account_id', account.id)
    .maybeSingle()

  if (postError) throw postError
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Selected post is not linked to this Instagram account.' })

  const { data: triggers, error: triggerError } = await supabase
    .from('instagram_comment_triggers')
    .select('id, keywords, reply_in_comment, reply_in_dm')
    .eq('instagram_post_id', postId)
    .eq('is_active', true)

  if (triggerError) throw triggerError
  if (!triggers?.length) throw createError({ statusCode: 400, statusMessage: 'Save an active rule for this post before checking comments.' })

  const comments = await fetchInstagramComments(postId, accessToken, 50)
  const commentIds: string[] = []
  let processed = 0

  for (const comment of comments) {
    const commentId = String(comment?.id || '').trim()
    const text = String(comment?.text || '').trim()
    if (!commentId || !text) continue
    commentIds.push(commentId)

    await processInstagramComment(supabase, {
      igUserId: instagramAccountId,
      mediaId: postId,
      commentId,
      commentText: text,
      commenterId: comment?.from?.id ? String(comment.from.id) : null,
      commenterUsername: comment?.from?.username || comment?.username || null,
      raw: comment,
    })
    processed += 1
  }

  const triggerIds = (triggers || []).map((trigger: any) => trigger.id)
  const { data: jobs } = triggerIds.length && commentIds.length
    ? await supabase
      .from('instagram_message_jobs')
      .select('id, trigger_id, comment_id, status, payload, created_at')
      .in('trigger_id', triggerIds)
      .in('comment_id', commentIds)
      .order('created_at', { ascending: false })
    : { data: [] }

  const deliveries = (jobs || []).map((job: any) => ({
    id: job.id,
    triggerId: job.trigger_id,
    commentId: job.comment_id,
    status: job.status,
    action: job.payload?.action_type || null,
    error: job.payload?.error || null,
    hasReplyText: Boolean(job.payload?.reply_text),
    createdAt: job.created_at || null,
  }))

  return {
    success: true,
    found: comments.length,
    processed,
    matchedDeliveries: deliveries.length,
    sent: deliveries.filter((delivery: any) => delivery.status === 'sent').length,
    failed: deliveries.filter((delivery: any) => delivery.status === 'failed').length,
    triggers: (triggers || []).map((trigger: any) => ({
      id: trigger.id,
      keywords: trigger.keywords,
      replyInComment: trigger.reply_in_comment,
      replyInDm: trigger.reply_in_dm,
    })),
    deliveries,
    comments: comments.map((comment) => ({
      id: comment?.id,
      text: comment?.text,
      username: comment?.from?.username || comment?.username || null,
      timestamp: comment?.timestamp || null,
    })),
  }
})
