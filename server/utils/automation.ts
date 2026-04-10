import { createClient } from '@supabase/supabase-js'

export const processInstagramComment = async (commentData: any) => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { instagram_post_id, text, comment_id, from } = commentData
  const commenterUsername = from?.username

  console.log(`Processing comment from ${commenterUsername}: ${text}`)

  // 1. Find the Instagram account associated with this post/notification
  // In a real webhook, entry[0].id is the IG Business Account ID
  const { data: igAccount } = await supabase
    .from('instagram_accounts')
    .select('*, user_id')
    .eq('instagram_account_id', commentData.recipient_id) // recipient_id is the IG Page ID
    .single()

  if (!igAccount) return console.error('IG Account not found')

  // 2. Check User Plan & Limits
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, user_memberships(plans(*))')
    .eq('id', igAccount.user_id)
    .single()

  const plan = profile?.user_memberships?.[0]?.plans || { name: 'Trial', max_triggers: 1, max_auto_dms: 50 }
  
  // Count current DMs for this user (simple count from jobs table)
  const { count: dmCount } = await supabase
    .from('instagram_message_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('instagram_account_id', igAccount.id)

  if (plan.max_auto_dms && dmCount >= plan.max_auto_dms) {
    console.log('DM Limit reached for this plan')
    return
  }

  // 3. Find Triggers
  const { data: triggers } = await supabase
    .from('instagram_comment_triggers')
    .select('*')
    .eq('instagram_post_id', instagram_post_id)
    .eq('is_active', true)

  const matchingTrigger = triggers?.find(t => {
    if (t.trigger_type === 'any') return true
    if (t.trigger_type === 'keyword' && t.keywords) {
      return t.keywords.some((kw: string) => text.toLowerCase().includes(kw.toLowerCase()))
    }
    return false
  })

  if (matchingTrigger) {
    console.log(`Match found! Triggering DM: ${matchingTrigger.dm_template}`)
    
    // 4. Send DM via Instagram Graph API
    // POST /v12.0/me/messages
    // recipient = { comment_id: comment_id }
    // message = { text: matchingTrigger.dm_template }
    
    try {
      const response = await fetch(`https://graph.facebook.com/v12.0/me/messages?access_token=${igAccount.access_token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { comment_id: comment_id },
          message: { text: matchingTrigger.dm_template }
        })
      })
      
      const result = await response.json()
      
      // 5. Log the job
      await supabase.from('instagram_message_jobs').insert({
        instagram_account_id: igAccount.id,
        instagram_post_id: instagram_post_id,
        comment_id: comment_id,
        trigger_id: matchingTrigger.id,
        status: result.error ? 'failed' : 'sent',
        payload: result
      })

    } catch (err) {
      console.error('Failed to send DM:', err)
    }
  }
}
