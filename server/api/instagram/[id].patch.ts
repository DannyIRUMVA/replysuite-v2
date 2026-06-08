import { serverSupabaseServiceRole } from '#supabase/server'
import { getAuthenticatedUserId } from '~~/server/utils/auth'
import { isUuid } from '~~/server/utils/public-chatbot'

const readKeywords = (value: unknown) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean)
  return []
}

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)

  const accountId = getRouterParam(event, 'id') || ''
  if (!isUuid(accountId)) throw createError({ statusCode: 400, statusMessage: 'Invalid Instagram account ID.' })

  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole(event)

  const { data: account, error: accountError } = await supabase
    .from('instagram_accounts')
    .select('id, user_id')
    .eq('id', accountId)
    .maybeSingle()

  if (accountError || !account || account.user_id !== userId) {
    throw createError({ statusCode: 404, statusMessage: 'Instagram account not found.' })
  }

  const triggerId = typeof body?.trigger_id === 'string' ? body.trigger_id : typeof body?.triggerId === 'string' ? body.triggerId : ''
  const chatbotId = typeof body?.chatbot_id === 'string' ? body.chatbot_id : typeof body?.chatbotId === 'string' ? body.chatbotId : ''
  const postId = typeof body?.post_id === 'string' ? body.post_id : typeof body?.postId === 'string' ? body.postId : ''

  if (!triggerId || !postId || !chatbotId || !isUuid(triggerId) || !isUuid(chatbotId)) {
    throw createError({ statusCode: 400, statusMessage: 'Trigger, post, and assistant are required.' })
  }

  const { data: chatbot } = await supabase
    .from('chatbots')
    .select('id, user_id, deleted_at')
    .eq('id', chatbotId)
    .maybeSingle()

  if (!chatbot || chatbot.user_id !== userId || chatbot.deleted_at) {
    throw createError({ statusCode: 403, statusMessage: 'You cannot attach this trigger to that assistant.' })
  }

  const { data: post } = await supabase
    .from('instagram_posts')
    .select('id, instagram_account_id')
    .eq('id', postId)
    .eq('instagram_account_id', accountId)
    .maybeSingle()

  if (!post) throw createError({ statusCode: 404, statusMessage: 'Instagram post not found for this account.' })

  const keywords = readKeywords(body?.keywords)
  const replyInComment = Boolean(body?.reply_in_comment ?? body?.replyInComment)
  const replyInDm = Boolean(body?.reply_in_dm ?? body?.replyInDm)

  if (!replyInComment && !replyInDm) {
    throw createError({ statusCode: 400, statusMessage: 'Enable comment reply, comment-to-DM, or both.' })
  }

  const { error } = await supabase
    .from('instagram_comment_triggers')
    .update({
      chatbot_id: chatbotId,
      // Keep nullable for compatibility with the existing production check constraint.
      trigger_type: null,
      keywords,
      reply_in_comment: replyInComment,
      reply_in_dm: replyInDm,
      dm_template: typeof body?.dm_template === 'string' ? body.dm_template : typeof body?.dmTemplate === 'string' ? body.dmTemplate : null,
      is_active: Boolean(body?.is_active ?? body?.isActive ?? true),
    })
    .eq('id', triggerId)
    .eq('instagram_post_id', postId)

  if (error) throw error

  return { success: true, message: 'Instagram post automation updated.' }
})
