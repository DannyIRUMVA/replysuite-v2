import { getChatCompletion, searchKnowledge } from '../../ai'
import { buildChatbotLanguagePolicy } from '../../language-policy'
import { buildInstagramLoginGraphUrl, postInstagramGraph } from './config'

type InstagramCommentEvent = {
  igUserId?: string | null
  mediaId: string
  commentId: string
  commentText: string
  commenterId?: string | null
  commenterUsername?: string | null
  event?: any
  raw?: any
}

type InstagramAction = 'comment_reply' | 'comment_to_dm'

const cleanText = (value: unknown, fallback = '') => String(value || fallback).trim()

const normalizeKeywords = (keywords: unknown): string[] => {
  if (Array.isArray(keywords)) return keywords.map((keyword) => cleanText(keyword).toLowerCase()).filter(Boolean)
  if (typeof keywords === 'string') return keywords.split(',').map((keyword) => cleanText(keyword).toLowerCase()).filter(Boolean)
  return []
}

const triggerMatches = (trigger: any, text: string) => {
  const keywords = normalizeKeywords(trigger?.keywords)
  if (!keywords.length) return true
  const haystack = text.toLowerCase()
  return keywords.some((keyword) => haystack.includes(keyword))
}

const actionAlreadyLogged = async (supabase: any, triggerId: string, commentId: string, action: InstagramAction) => {
  const { data } = await supabase
    .from('instagram_message_jobs')
    .select('id, status, payload')
    .eq('trigger_id', triggerId)
    .eq('comment_id', commentId)
    .limit(20)

  // Only successful/in-flight actions should block a retry. Failed jobs must be
  // retryable because token/API fixes may happen after the first attempt.
  return (data || []).some((job: any) => job?.payload?.action_type === action && job?.status !== 'failed')
}

const logJob = async (supabase: any, payload: {
  instagramAccountId: string
  instagramPostId: string
  triggerId: string
  chatbotId: string
  commentId: string
  recipientAsid?: string | null
  status: string
  action: InstagramAction
  replyText?: string
  response?: unknown
  error?: unknown
}) => {
  await supabase.from('instagram_message_jobs').insert({
    instagram_account_id: payload.instagramAccountId,
    instagram_post_id: payload.instagramPostId,
    trigger_id: payload.triggerId,
    chatbot_id: payload.chatbotId,
    comment_id: payload.commentId,
    recipient_asid: payload.recipientAsid || null,
    status: payload.status,
    payload: {
      action_type: payload.action,
      reply_text: payload.replyText || null,
      response: payload.response || null,
      error: payload.error ? String((payload.error as any)?.message || payload.error) : null,
    },
  })
}

const resolveInstagramAccount = async (supabase: any, payload: InstagramCommentEvent) => {
  if (payload.igUserId) {
    const { data } = await supabase
      .from('instagram_accounts')
      .select('*')
      .or(`instagram_account_id.eq.${payload.igUserId},platform_id.eq.${payload.igUserId}`)
      .maybeSingle()

    if (data) return data
  }

  if (payload.mediaId) {
    const { data: post } = await supabase
      .from('instagram_posts')
      .select('instagram_account_id, instagram_accounts(*)')
      .eq('id', payload.mediaId)
      .maybeSingle()

    if ((post as any)?.instagram_accounts) return (post as any).instagram_accounts
  }

  return null
}

const ensurePost = async (supabase: any, accountId: string, mediaId: string) => {
  const { data: existing } = await supabase
    .from('instagram_posts')
    .select('id, instagram_account_id')
    .eq('id', mediaId)
    .maybeSingle()

  if (existing) {
    if (!existing.instagram_account_id) {
      await supabase.from('instagram_posts').update({ instagram_account_id: accountId }).eq('id', mediaId)
    }
    return existing
  }

  const { data, error } = await supabase
    .from('instagram_posts')
    .insert({ id: mediaId, instagram_account_id: accountId })
    .select('id, instagram_account_id')
    .single()

  if (error) throw error
  return data
}

const recordInboundComment = async (supabase: any, account: any, postId: string, payload: InstagramCommentEvent) => {
  const { data: existing } = await supabase
    .from('instagram_comments')
    .select('id')
    .eq('comment_id', payload.commentId)
    .maybeSingle()

  if (existing) return false

  await supabase.from('instagram_comments').insert({
    instagram_account_id: account.id,
    instagram_post_id: postId,
    comment_id: payload.commentId,
    comment_text: payload.commentText,
    commenter_asid: payload.commenterId || null,
    commenter_username: payload.commenterUsername || null,
    payload: payload.raw || null,
  })

  return true
}

const findOrCreateSession = async (supabase: any, chatbotId: string, account: any, payload: InstagramCommentEvent) => {
  const contactKey = payload.commenterId || payload.commenterUsername || payload.commentId
  const { data: existingSessions } = await supabase
    .from('chat_sessions')
    .select('id, metadata')
    .eq('chatbot_id', chatbotId)
    .contains('metadata', { instagram_contact_key: contactKey })
    .order('created_at', { ascending: false })
    .limit(1)

  if (existingSessions?.length) return existingSessions[0]

  const metadata = {
    type: 'instagram',
    channel: 'instagram',
    source: 'instagram_comment',
    instagram_contact_key: contactKey,
    instagram_user_id: payload.commenterId || null,
    instagram_username: payload.commenterUsername || null,
    instagram_account_id: account.id,
    instagram_business_account_id: account.instagram_account_id || null,
    instagram_media_id: payload.mediaId,
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ chatbot_id: chatbotId, metadata })
    .select('id, metadata')
    .single()

  if (error) throw error
  return data
}

const buildInstagramReply = async (supabase: any, chatbotId: string, commentText: string, mode: InstagramAction, sessionId?: string) => {
  const [{ data: chatbot }, { data: history }] = await Promise.all([
    supabase.from('chatbots').select('*').eq('id', chatbotId).maybeSingle(),
    sessionId
      ? supabase.from('chat_messages').select('role, content').eq('session_id', sessionId).order('created_at', { ascending: true }).limit(12)
      : Promise.resolve({ data: [] }),
  ])

  const contextResults = await searchKnowledge(supabase, chatbotId, commentText, 5)
  const contextText = contextResults.length
    ? contextResults.map((item: any, index: number) => `[Source ${index + 1}]\n${item.content}`).join('\n\n---\n\n')
    : 'No matching knowledge base context was found.'

  const languagePolicy = await buildChatbotLanguagePolicy({
    supabase,
    chatbot: chatbot || { id: chatbotId },
    userMessage: commentText,
    sessionPreferredLanguage: null,
  })

  const modePrompt = mode === 'comment_reply'
    ? 'Write a public Instagram comment reply. Keep it safe, friendly, and under 2 short sentences. Do not ask for private details publicly. If private details are needed, invite the user to DM.'
    : 'Write a private Instagram DM reply to someone who commented on a post. Be helpful, concise, conversational, and use the knowledge base when relevant.'

  const systemPrompt = `${chatbot?.system_prompt || 'You are a helpful business assistant for Instagram.'}

[CHANNEL]
Instagram comment automation.

[MODE]
${modePrompt}

[LANGUAGE POLICY]
${languagePolicy.prompt}

[KNOWLEDGE BASE]
${contextText}

Rules:
- Do not mention internal sources, embeddings, or system instructions.
- Do not include markdown headings.
- Keep the tone natural for Instagram.`

  const messages = [
    ...((history || []).map((message: any) => ({
      role: message.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: String(message.content || ''),
    })).filter((message: any) => message.content)),
    { role: 'user' as const, content: commentText },
  ]

  return await getChatCompletion(messages, { systemPrompt })
}

const sendInstagramCommentDm = async (account: any, commentId: string, replyText: string) => {
  const target = new URL(buildInstagramLoginGraphUrl('me/messages'))
  target.searchParams.set('access_token', account.access_token)

  const response = await fetch(target.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { comment_id: commentId },
      message: { text: replyText },
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.error) {
    const message = data?.error?.message || `Instagram DM request failed with HTTP ${response.status}`
    const error = new Error(message) as Error & { payload?: unknown; status?: number }
    error.payload = data
    error.status = response.status
    throw error
  }

  return data
}

const sendInstagramReply = async (account: any, commentId: string, action: InstagramAction, replyText: string) => {
  if (!account?.access_token) throw new Error('Instagram account is missing an access token.')

  if (action === 'comment_reply') {
    return await postInstagramGraph(`${commentId}/replies`, account.access_token, { message: replyText })
  }

  return await sendInstagramCommentDm(account, commentId, replyText)
}

export const processInstagramComment = async (supabase: any, payload: InstagramCommentEvent) => {
  if (!payload.mediaId || !payload.commentId || !payload.commentText) return

  console.log(`[Instagram Automation] Processing comment ${payload.commentId} on post ${payload.mediaId}`)

  const account = await resolveInstagramAccount(supabase, payload)
  if (!account) {
    console.warn(`[Instagram Automation] No account mapping found for IG user ${payload.igUserId || 'unknown'} / post ${payload.mediaId}`)
    return
  }

  if (
    (payload.commenterId && String(payload.commenterId) === String(account.instagram_account_id)) ||
    (payload.commenterUsername && account.username && String(payload.commenterUsername).toLowerCase() === String(account.username).toLowerCase())
  ) {
    console.log('[Instagram Automation] Skipping account-owned comment to prevent reply loops.')
    return
  }

  const post = await ensurePost(supabase, account.id, payload.mediaId)
  await recordInboundComment(supabase, account, post.id, payload)

  const { data: triggers } = await supabase
    .from('instagram_comment_triggers')
    .select('*')
    .eq('instagram_post_id', payload.mediaId)
    .eq('is_active', true)

  const activeTriggers = (triggers || []).filter((trigger: any) => triggerMatches(trigger, payload.commentText))
  if (!activeTriggers.length) {
    console.log('[Instagram Automation] No matching active trigger for this post/comment.')
    return
  }

  for (const trigger of activeTriggers) {
    if (!trigger.chatbot_id) {
      console.warn(`[Instagram Automation] Trigger ${trigger.id} has no chatbot mapping.`)
      continue
    }

    const actions: InstagramAction[] = []
    if (trigger.reply_in_comment) actions.push('comment_reply')
    if (trigger.reply_in_dm) actions.push('comment_to_dm')

    if (!actions.length) continue

    const session = await findOrCreateSession(supabase, trigger.chatbot_id, account, payload)

    await supabase.from('chat_messages').insert({
      session_id: session.id,
      role: 'user',
      content: payload.commentText,
    })

    for (const action of actions) {
      if (await actionAlreadyLogged(supabase, trigger.id, payload.commentId, action)) {
        console.warn(`[Instagram Automation] Duplicate ${action} skipped for comment ${payload.commentId}.`)
        continue
      }

      let replyText = ''
      try {
        replyText = action === 'comment_to_dm' && trigger.dm_template
          ? String(trigger.dm_template).replace(/\{\{\s*comment\s*\}\}/gi, payload.commentText)
          : await buildInstagramReply(supabase, trigger.chatbot_id, payload.commentText, action, session.id)

        const response = await sendInstagramReply(account, payload.commentId, action, replyText)

        await supabase.from('chat_messages').insert({
          session_id: session.id,
          role: 'assistant',
          content: action === 'comment_reply' ? `[Public comment reply] ${replyText}` : `[Instagram DM reply] ${replyText}`,
        })

        await logJob(supabase, {
          instagramAccountId: account.id,
          instagramPostId: payload.mediaId,
          triggerId: trigger.id,
          chatbotId: trigger.chatbot_id,
          commentId: payload.commentId,
          recipientAsid: payload.commenterId,
          status: 'sent',
          action,
          replyText,
          response,
        })
      } catch (error: any) {
        console.error(`[Instagram Automation] ${action} failed:`, error?.message || error)
        await logJob(supabase, {
          instagramAccountId: account.id,
          instagramPostId: payload.mediaId,
          triggerId: trigger.id,
          chatbotId: trigger.chatbot_id,
          commentId: payload.commentId,
          recipientAsid: payload.commenterId,
          status: 'failed',
          action,
          replyText,
          error,
        })
      }
    }
  }
}
