import { createClient } from '@supabase/supabase-js'
import { searchKnowledge, getChatCompletion } from './ai'

export const processInstagramComment = async (commentData: any) => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { instagram_post_id, text, comment_id, from } = commentData
  const commenterUsername = from?.username

  console.log(`[Automation] Processing comment from ${commenterUsername}: ${text}`)

  // 1. Get Instagram Account
  const { data: igAccount } = await supabase
    .from('instagram_accounts')
    .select('*, user_id')
    .eq('instagram_account_id', commentData.recipient_id)
    .single()

  if (!igAccount) return console.error('[Automation] IG Account not found')

  // 2. Check User Plan & Limits
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, user_memberships(plans(*))')
    .eq('id', igAccount.user_id)
    .single()

  const plan = profile?.user_memberships?.[0]?.plans || { 
    name: 'Starter', 
    max_replies_per_month: 50,
    has_auto_comment: true // Default true for basic testing
  }
  
  // Count current replies this month
  const startOfMonth = new Date()
  startOfMonth.setUTCDate(1)
  startOfMonth.setUTCHours(0, 0, 0, 0)

  const { count: replyCount } = await supabase
    .from('instagram_message_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('instagram_account_id', igAccount.id)
    .gte('created_at', startOfMonth.toISOString())

  if (plan.max_replies_per_month !== -1 && (replyCount || 0) >= (plan.max_replies_per_month || 50)) {
    console.log(`[Limit] Reply Limit reached (${replyCount}/${plan.max_replies_per_month})`)
    return
  }

  // 3. Find Matching Trigger
  const { data: triggers } = await supabase
    .from('instagram_comment_triggers')
    .select('*')
    .eq('instagram_post_id', instagram_post_id || commentData.media_id)
    .eq('is_active', true)

  const matchingTrigger = triggers?.find(t => {
    if (!t.keywords || t.keywords.length === 0) return true
    return t.keywords.some((kw: string) => text.toLowerCase().includes(kw.toLowerCase()))
  })

  if (!matchingTrigger) return

  console.log(`[Automation] Match found for rule: ${matchingTrigger.id}`)

  // 4. Generate AI Response if chatbot is linked
  let replyText = matchingTrigger.dm_template || 'Hello! How can I help?'
  
  if (matchingTrigger.chatbot_id) {
    try {
      // a. Search Knowledge Base (RAG)
      const contextDocs = await searchKnowledge(matchingTrigger.chatbot_id, text)
      const contextString = contextDocs.map(d => d.content).join('\n---\n')

      // b. Prepare Prompt
      const systemPrompt = `You are a helpful assistant for the Instagram account @${igAccount.username}. 
      Use the following context to answer the user's comment. 
      Keep your reply short and friendly (suitable for Instagram).
      Context: ${contextString}`

      // c. Get Completion
      replyText = await getChatCompletion(
        [{ role: 'user', content: text }],
        { 
          systemPrompt, 
          useAzure: plan.name === 'Gold' // Only Gold-tier uses Azure fallback if configured
        }
      )
    } catch (err) {
      console.error('[AI Error] RAG failed, using fallback template:', err)
    }
  }

  // 5. Execute Actions
  const jobs = []

  // Action: Reply in Comment
  if (matchingTrigger.reply_in_comment && plan.has_auto_comment) {
    jobs.push(sendCommentReply(comment_id, replyText, igAccount.access_token))
  }

  // Action: Send DM
  if (matchingTrigger.reply_in_dm) {
    jobs.push(sendDM(comment_id, replyText, igAccount.access_token))
  }

  // 6. Execute and Log
  const results = await Promise.all(jobs)
  
  for (const res of results) {
    await supabase.from('instagram_message_jobs').insert({
      instagram_account_id: igAccount.id,
      instagram_post_id: instagram_post_id || commentData.media_id,
      comment_id: comment_id,
      trigger_id: matchingTrigger.id,
      chatbot_id: matchingTrigger.chatbot_id,
      status: res.error ? 'failed' : 'sent',
      payload: res
    })
  }
}

async function sendCommentReply(commentId: string, message: string, accessToken: string) {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${commentId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        access_token: accessToken
      })
    })
    return await response.json()
  } catch (err) {
    return { error: err }
  }
}

async function sendDM(commentId: string, message: string, accessToken: string) {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: { text: message },
        access_token: accessToken
      })
    })
    return await response.json()
  } catch (err) {
    return { error: err }
  }
}
