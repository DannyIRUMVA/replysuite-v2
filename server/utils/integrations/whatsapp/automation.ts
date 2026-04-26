import { searchKnowledge, getChatCompletion } from '../../ai'
import { runAgentCycle } from '../../agent/engine'

export const processWhatsappMessage = async (supabase: any, messageData: any) => {
  const { phone_number_id, from_number, text, customer_name, message_id } = messageData

  console.log(`\n🚀 [WhatsApp Automation] START: Processing message from ${customer_name} (${from_number})`)
  console.log(`   📝 Text: "${text}"`)

  // 1. Get WhatsApp Account
  const { data: waAccount } = await supabase
    .from('whatsapp_accounts')
    .select('*')
    .eq('phone_number_id', phone_number_id)
    .single()

  if (!waAccount) {
    console.error(`❌ [WhatsApp Auth] ERROR: Account not found for phone_number_id: ${phone_number_id}`)
    return 
  }
  
  if (!waAccount.chatbot_id) {
    console.error(`❌ [WhatsApp Auth] WARNING: No chatbot assigned to WA number ${waAccount.phone_number}`)
    return
  }

  // Ensure node is active/deployed
  if (waAccount.status !== 'active' && waAccount.status !== 'deployed') {
    console.warn(`⚠️ [WhatsApp Auth] SKIPPING: Account ${waAccount.phone_number} is currently ${waAccount.status}`)
    return
  }
  console.log(`   ✅ Account Found: ${waAccount.phone_number} (Status: ${waAccount.status})`)

  // 2. Check User Plan & Limits
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, user_memberships(plans(*))')
    .eq('id', waAccount.user_id)
    .single()

  const plan = profile?.user_memberships?.[0]?.plans || { 
    name: 'None', 
    max_replies_per_month: 0,
    has_auto_comment: false 
  }
  
  // Count current replies this month
  const startOfMonth = new Date()
  startOfMonth.setUTCDate(1)
  startOfMonth.setUTCHours(0, 0, 0, 0)

  const { count: replyCount } = await supabase
    .from('whatsapp_message_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('whatsapp_account_id', waAccount.id)
    .gte('created_at', startOfMonth.toISOString())

  if (plan.max_replies_per_month !== -1 && (replyCount || 0) >= (plan.max_replies_per_month || 0)) {
    console.warn(`⚠️ [WhatsApp Automation] LIMIT REACHED: ${replyCount}/${plan.max_replies_per_month} replies used this month.`)
    return
  }
  console.log(`   📊 Plan Check: ${plan.name} (${replyCount || 0}/${plan.max_replies_per_month === -1 ? '∞' : plan.max_replies_per_month})`)


  // 3. RAG / Data Retrieval Pipeline
  let contextText = ''
  let baseInstructions = ''

  console.log(`   🧠 Initiating AI Pipeline for chatbot: ${waAccount.chatbot_id}`)
  try {
    const { data: chatbot } = await supabase
      .from('chatbots')
      .select('*')
      .eq('id', waAccount.chatbot_id)
      .single()

    baseInstructions = chatbot?.system_prompt || `You are a helpful AI assistant connected over WhatsApp.`
    
    // RAG Search
    const contextResults = await searchKnowledge(supabase, waAccount.chatbot_id, text, 3)
    if (contextResults && contextResults.length > 0) {
       console.log(`   📚 Context Retrieved: ${contextResults.length} chunks`)
       contextText = contextResults.map((r: any) => r.content).join('\n\n---\n\n')
    }
  } catch (err) {
    console.error('❌ [WhatsApp AI Error] RAG Retrieval Failed:', err)
  }

  // 4. Generate AI Reply (Agentic Loop)
  const systemPrompt = `
    ${baseInstructions}

    [ADDITIONAL CONTEXT FROM KNOWLEDGE BASE]
    ${contextText || 'No specific background knowledge found for this query.'}
    
    IMPORTANT INSTRUCTIONS:
    1. Be extremely concise, direct, and conversational (Max 160 characters).
    2. Format specifically for WhatsApp. You can use standard formatting like *bold* or _italics_ natively.
    3. Do not include markdown headers (#) or markdown horizontal lines (---).
    4. DO NOT provide long explanations. Get straight to the point.
    5. Prioritize [ADDITIONAL CONTEXT] for factual accuracy over base instructions.
  `

  let replyText = ''
  try {
    const { data: chatbot } = await supabase
      .from('chatbots')
      .select('enabled_tools, tools_config')
      .eq('id', waAccount.chatbot_id)
      .single()

    // Find existing session to get history
    let session;
    let messagesHistory: any[] = []
    
    const { data: existingSessions } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('chatbot_id', waAccount.chatbot_id)
      .contains('metadata', { phone: from_number })
      .order('created_at', { ascending: false })
      .limit(1)

    if (existingSessions && existingSessions.length > 0) {
      session = existingSessions[0]
      
      const { data: history } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true })
        .limit(20)
        
      if (history && history.length > 0) {
        messagesHistory = history.map(msg => ({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content }))
      }
    }
    
    // Add current message
    messagesHistory.push({ role: 'user', content: text })

    replyText = await runAgentCycle(messagesHistory, { 
      systemPrompt, 
      chatbotId: waAccount.chatbot_id,
      enabledTools: chatbot?.enabled_tools || [],
      event: (messageData as any)._event,
      context: {
        platform: 'whatsapp',
        customerPhone: from_number,
        whatsappToken: waAccount.access_token,
        phoneId: phone_number_id
      }
    })

    console.log(`   🤖 AI Response Generated: "${replyText.substring(0, 50)}..."`)
  } catch (err) {
    console.error('❌ [WhatsApp AI Error] Agent cycle failed:', err)
    return
  }

  // 5. Save Conversation History for UI/Analytics
  if (replyText) {
    console.log(`\n[WhatsApp Debug] Saving chat into chat_sessions...`)
    try {
      if (!session) {
        const { data: newSession, error: sessErr } = await supabase.from('chat_sessions').insert({
          chatbot_id: waAccount.chatbot_id,
          metadata: { type: 'whatsapp', phone: from_number, username: customer_name }
        }).select('id').single()
        
        if (sessErr) {
           console.error('❌ Failed to insert new WhatsApp chat_sessions:', sessErr)
           throw sessErr
        }
        session = newSession
      }

      const { error: msgErr } = await supabase.from('chat_messages').insert([
        { session_id: session.id, role: 'user', content: text },
        { session_id: session.id, role: 'assistant', content: replyText }
      ])
      
      if (msgErr) {
          console.error('❌ Failed to insert WhatsApp chat_messages:', msgErr)
          throw msgErr
      }
      
      console.log(`   ✅ Chat history securely appended to Session: ${session.id}`)
    } catch (err) { 
        console.error('❌ [WhatsApp Debug] Database Insertion Error:', err)
    }
  }

  // 6. Push Message natively to WhatsApp Meta Graph API
  const isError = false;
  let apiResponse = null;
  console.log(`   📲 Transmitting payload back to Meta WhatsApp API...`)
  try {
    const fwReq = await fetch(`https://graph.facebook.com/v21.0/${phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waAccount.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: from_number,
        type: "text",
        text: { body: replyText }
      })
    })

    apiResponse = await fwReq.json()
    if (apiResponse.error) {
       console.error(`   ❌ [WhatsApp Send Error]:`, apiResponse.error)
       throw new Error(apiResponse.error.message)
    }
    console.log(`   ✅ Message successfully dispatched by WhatsApp. Message ID: ${apiResponse?.messages?.[0]?.id}`)
  } catch(err) {
     apiResponse = { error: err }
  }

  // 7. Log Analytic Usage Metric Job
  await supabase.from('whatsapp_message_jobs').insert({
    whatsapp_account_id: waAccount.id,
    from_number: from_number,
    chatbot_id: waAccount.chatbot_id,
    status: apiResponse?.error ? 'failed' : 'sent',
    payload: apiResponse
  })

  console.log(`🏁 [WhatsApp Automation] FINISHED: Successfully processed hook from ${from_number}\n`)
}
