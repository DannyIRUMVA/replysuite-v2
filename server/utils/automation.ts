import { createClient } from '@supabase/supabase-js'
import { searchKnowledge, getChatCompletion } from './ai'

export const processInstagramComment = async (commentData: any) => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { instagram_post_id, text, comment_id, from } = commentData
  const commenterUsername = from?.username

  console.log(`\n🚀 [Automation] START: Processing comment from @${commenterUsername}`)
  console.log(`   📝 Text: "${text}"`)
  console.log(`   📍 Post ID: ${instagram_post_id}`)
  console.log(`   🔑 Comment ID: ${comment_id}`)

  // 1. Get Instagram Account
  if (!igAccount) {
    console.error(`❌ [Automation] ERROR: IG Account not found for recipient_id: ${commentData.recipient_id}`)
    return 
  }
  console.log(`   ✅ Account Found: @${igAccount.username}`)

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
    console.warn(`⚠️ [Automation] LIMIT REACHED: ${replyCount}/${plan.max_replies_per_month} replies used this month.`)
    return
  }
  console.log(`   📊 Plan Check: ${plan.name} (${replyCount || 0}/${plan.max_replies_per_month === -1 ? '∞' : plan.max_replies_per_month})`)

  console.log(`   🔍 Searching for triggers on post ${instagram_post_id}...`)
  const { data: triggers } = await supabase
    .from('instagram_comment_triggers')
    .select('*')
    .eq('instagram_post_id', instagram_post_id)
    .eq('is_active', true)

  console.log(`   📑 Found ${triggers?.length || 0} active triggers.`)

  const matchingTrigger = triggers?.find(t => {
    // If no keywords defined, it's a "catch-all" trigger
    if (!t.keywords || t.keywords.length === 0) {
      console.log(`      ✨ Match Found: Catch-all trigger (no keywords)`)
      return true
    }
    
    console.log(`      🧐 Checking keywords: [${t.keywords.join(', ')}]`)
    // Check for any of the keywords using word boundaries for better accuracy
    const match = t.keywords.some((kw: string) => {
      const cleanKw = kw.trim().toLowerCase()
      if (!cleanKw) return false
      
      let isMatch = false
      if (cleanKw.length <= 3) {
        isMatch = text.toLowerCase().includes(cleanKw)
      } else {
        const regex = new RegExp(`\\b${cleanKw}\\b`, 'i')
        isMatch = regex.test(text)
      }
      
      if (isMatch) console.log(`      🎯 Keyword hit: "${cleanKw}"`)
      return isMatch
    })
    return match
  })

  if (!matchingTrigger) {
    console.log(`   ⏭️ [Automation] SKIPPED: No matching keywords found.`)
    // Log as skipped in the database for better observability
    await supabase.from('instagram_message_jobs').insert({
      instagram_account_id: igAccount.id,
      instagram_post_id: instagram_post_id,
      comment_id: comment_id,
      status: 'skipped',
      payload: { reason: 'No keyword match', text: text }
    })
    return
  }

  console.log(`   ⚡ [Automation] MATCH SUCCESS: Trigger ID ${matchingTrigger.id}`)

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
    const isError = !!res.error
    console.log(`   ${isError ? '❌' : '✅'} Action Completed: ${res.action_type || 'Unknown'} (Result: ${isError ? 'FAILED' : 'SUCCESS'})`)
    
    await supabase.from('instagram_message_jobs').insert({
      instagram_account_id: igAccount.id,
      instagram_post_id: instagram_post_id,
      comment_id: comment_id,
      trigger_id: matchingTrigger.id,
      chatbot_id: matchingTrigger.chatbot_id,
      status: isError ? 'failed' : 'sent',
      payload: res
    })
  }
  console.log(`🏁 [Automation] FINISHED: Successfully processed @${commenterUsername}\n`)
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
    const result = await response.json()
    return { ...result, action_type: 'Comment Reply' }
  } catch (err) {
    return { error: err, action_type: 'Comment Reply' }
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
    const result = await response.json()
    return { ...result, action_type: 'Direct DM' }
  } catch (err) {
    return { error: err, action_type: 'Direct DM' }
  }
}
