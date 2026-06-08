import { serverSupabaseServiceRole } from '#supabase/server'
import { getAuthenticatedUserId } from '~~/server/utils/auth'
import { isUuid } from '~~/server/utils/public-chatbot'

const readString = (body: any, ...keys: string[]) => {
  for (const key of keys) {
    if (typeof body?.[key] === 'string' && body[key].trim()) return body[key].trim()
  }
  return ''
}

const readKeywords = (value: unknown) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean)
  return []
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const userId = await getAuthenticatedUserId(event)

  const existingAccountId = readString(body, 'account_id', 'accountId', 'existingAccountId')
  let instagramAccountId = readString(body, 'instagram_account_id', 'instagramAccountId', 'ig_user_id', 'igUserId')
  const platformId = readString(body, 'platform_id', 'platformId', 'page_id', 'pageId')
  let username = readString(body, 'username')
  let accessToken = readString(body, 'accessToken', 'access_token')
  const chatbotId = readString(body, 'chatbot_id', 'chatbotId')
  const postId = readString(body, 'post_id', 'postId', 'media_id', 'mediaId')
  const caption = readString(body, 'caption', 'post_caption', 'postCaption')
  const permalink = readString(body, 'permalink', 'post_permalink', 'postPermalink')
  const keywords = readKeywords(body?.keywords)
  const replyInComment = Boolean(body?.reply_in_comment ?? body?.replyInComment)
  const replyInDm = Boolean(body?.reply_in_dm ?? body?.replyInDm)
  const dmTemplate = readString(body, 'dm_template', 'dmTemplate')

  if ((!existingAccountId && (!instagramAccountId || !username || !accessToken)) || !postId || !chatbotId) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a connected Instagram account or provide Instagram account ID, username, access token, post ID, and assistant.' })
  }

  if (existingAccountId && !isUuid(existingAccountId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid connected Instagram account selected.' })
  }

  if (!replyInComment && !replyInDm) {
    throw createError({ statusCode: 400, statusMessage: 'Enable at least one automation mode: comment reply or comment-to-DM.' })
  }

  if (!isUuid(chatbotId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid assistant ID supplied for Instagram mapping.' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('id, user_id, deleted_at')
    .eq('id', chatbotId)
    .maybeSingle()

  if (chatbotError || !chatbot || chatbot.deleted_at || chatbot.user_id !== userId) {
    throw createError({ statusCode: 403, statusMessage: 'You do not have permission to attach this Instagram post to that assistant.' })
  }

  const { data: membership } = await supabase
    .from('user_memberships')
    .select('plans(instagram_access, max_instagram_accounts, has_auto_comment)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  const plan = (membership as any)?.plans
  if (!plan?.instagram_access) {
    throw createError({ statusCode: 403, statusMessage: 'Instagram automation is not available on your current plan.' })
  }

  if (replyInComment && !plan?.has_auto_comment) {
    throw createError({ statusCode: 403, statusMessage: 'Public Instagram comment replies require a plan with auto-comment enabled.' })
  }

  let oauthAccount: any = null
  if (existingAccountId) {
    const { data, error } = await supabase
      .from('instagram_accounts')
      .select('id, user_id, instagram_account_id, platform_id, username, access_token')
      .eq('id', existingAccountId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!data) throw createError({ statusCode: 404, statusMessage: 'Connected Instagram account was not found.' })
    oauthAccount = data
    instagramAccountId = data.instagram_account_id
    username = data.username
    accessToken = data.access_token
  }

  const { data: existingAccounts } = await supabase
    .from('instagram_accounts')
    .select('id, user_id, instagram_account_id')
    .eq('user_id', userId)

  const existingAccount = oauthAccount || (existingAccounts || []).find((account: any) => account.instagram_account_id === instagramAccountId)
  const maxAccounts = Number(plan?.max_instagram_accounts || 0)
  if (!existingAccount && maxAccounts > 0 && (existingAccounts || []).length >= maxAccounts) {
    throw createError({ statusCode: 403, statusMessage: `Your plan allows ${maxAccounts} Instagram account${maxAccounts === 1 ? '' : 's'}.` })
  }

  const { data: accountOwnedByOther } = await supabase
    .from('instagram_accounts')
    .select('id, user_id')
    .eq('instagram_account_id', instagramAccountId)
    .neq('user_id', userId)
    .maybeSingle()

  if (accountOwnedByOther) {
    throw createError({ statusCode: 409, statusMessage: 'This Instagram account is already linked to another ReplySuite account.' })
  }

  let account = existingAccount
  if (account) {
    const { data, error } = await supabase
      .from('instagram_accounts')
      .update({
        access_token: accessToken,
        platform_id: platformId || oauthAccount?.platform_id || null,
        username,
        last_synced: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)
      .select('id, user_id, instagram_account_id')
      .single()
    if (error) throw error
    account = data
  } else {
    const { data, error } = await supabase
      .from('instagram_accounts')
      .insert({
        user_id: userId,
        instagram_account_id: instagramAccountId,
        platform_id: platformId || oauthAccount?.platform_id || null,
        username,
        access_token: accessToken,
        last_synced: new Date().toISOString(),
      })
      .select('id, user_id, instagram_account_id')
      .single()
    if (error) throw error
    account = data
  }

  const { data: existingPost } = await supabase
    .from('instagram_posts')
    .select('id')
    .eq('id', postId)
    .maybeSingle()

  if (existingPost) {
    const { error } = await supabase
      .from('instagram_posts')
      .update({
        instagram_account_id: account.id,
        caption: caption || null,
        permalink: permalink || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('instagram_posts')
      .insert({
        id: postId,
        instagram_account_id: account.id,
        caption: caption || null,
        permalink: permalink || null,
      })
    if (error) throw error
  }

  const { data: existingTrigger } = await supabase
    .from('instagram_comment_triggers')
    .select('id')
    .eq('instagram_post_id', postId)
    .eq('chatbot_id', chatbotId)
    .maybeSingle()

  const triggerPayload = {
    chatbot_id: chatbotId,
    instagram_post_id: postId,
    // Existing production schema has a restrictive trigger_type check. Keep this
    // nullable and store matching behavior in keywords/reply flags for compatibility.
    trigger_type: null,
    keywords,
    reply_in_comment: replyInComment,
    reply_in_dm: replyInDm,
    dm_template: dmTemplate || null,
    is_active: true,
  }

  let triggerId = existingTrigger?.id
  if (existingTrigger) {
    const { error } = await supabase
      .from('instagram_comment_triggers')
      .update(triggerPayload)
      .eq('id', existingTrigger.id)
    if (error) throw error
  } else {
    const { data, error } = await supabase
      .from('instagram_comment_triggers')
      .insert(triggerPayload)
      .select('id')
      .single()
    if (error) throw error
    triggerId = data.id
  }

  return {
    success: true,
    message: 'Instagram post automation connected successfully.',
    accountId: account.id,
    postId,
    triggerId,
  }
})
