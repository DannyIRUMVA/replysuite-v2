import { searchKnowledge, getChatCompletion } from '../../ai'
import { runAgentCycle } from '../../agent/engine'
import { buildChatbotLanguagePolicy } from '../../language-policy'
import {
  buildConversationSettingsPrompt,
  buildConversationStatePrompt,
  getConversationStateFromMetadata,
  mergeMetadataWithState,
  normalizeConversationSettings,
  updateConversationState,
} from '../../conversation-intelligence'
import { safeLoadContactMemory, safeUpsertContactMemory } from '../../contact-memory'

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
  
  // Count current assistant replies this month across the user's chatbots.
  // This keeps WhatsApp and website replies on one consistent usage source of truth.
  const startOfMonth = new Date()
  startOfMonth.setUTCDate(1)
  startOfMonth.setUTCHours(0, 0, 0, 0)

  const { data: userChatbots } = await supabase
    .from('chatbots')
    .select('id')
    .eq('user_id', waAccount.user_id)
    .is('deleted_at', null)

  const userChatbotIds = (userChatbots || []).map((bot: any) => bot.id)

  let replyCount = 0
  if (userChatbotIds.length > 0) {
    const { count } = await supabase
      .from('chat_messages')
      .select('id, chat_sessions!inner(chatbot_id)', { count: 'exact', head: true })
      .in('chat_sessions.chatbot_id', userChatbotIds)
      .eq('role', 'assistant')
      .gte('created_at', startOfMonth.toISOString())

    replyCount = count || 0
  }

  if (plan.max_replies_per_month !== -1 && replyCount >= (plan.max_replies_per_month || 0)) {
    console.warn(`⚠️ [WhatsApp Automation] LIMIT REACHED: ${replyCount}/${plan.max_replies_per_month} replies used this month.`)
    return
  }
  console.log(`   📊 Plan Check: ${plan.name} (${replyCount}/${plan.max_replies_per_month === -1 ? '∞' : plan.max_replies_per_month})`)


  // 3. RAG / Data Retrieval Pipeline
  let contextText = ''
  let baseInstructions = ''
  let conversationSettings = normalizeConversationSettings(null)
  let chatbotDefaultLanguage: string | null = null
  let chatbotIdentity: any = null
  let activeLanguageName: string | null = null

  console.log(`   🧠 Initiating AI Pipeline for chatbot: ${waAccount.chatbot_id}`)
  try {
    const { data: chatbot } = await supabase
      .from('chatbots')
      .select('*')
      .eq('id', waAccount.chatbot_id)
      .single()

    chatbotIdentity = chatbot
    baseInstructions = chatbot?.system_prompt || `You are a helpful AI assistant connected over WhatsApp.`
    conversationSettings = normalizeConversationSettings(chatbot?.tools_config?.conversation_settings)
    chatbotDefaultLanguage = chatbot?.default_language || null
    
    // RAG Search
    const contextResults = await searchKnowledge(supabase, waAccount.chatbot_id, text, 6)
    if (contextResults && contextResults.length > 0) {
       console.log(`   📚 Context Retrieved: ${contextResults.length} chunks`)
       contextText = contextResults.map((r: any, index: number) => {
         const sourceLabel = [r.title, r.url].filter(Boolean).join(' · ') || r.sourceType || 'Knowledge Source'
         return `[Source ${index + 1}: ${sourceLabel}]\n${r.content}`
       }).join('\n\n---\n\n')
    }
  } catch (err) {
    console.error('❌ [WhatsApp AI Error] RAG Retrieval Failed:', err)
  }

  // 4. Generate AI Reply (Agentic Loop)
  const conversationBehavior = buildConversationSettingsPrompt(conversationSettings, 'whatsapp')

  let sessionMetadata: any = null
  let contactMemory: any = null

  const systemPromptBase = `
    ${baseInstructions}

    [CONVERSATION BEHAVIOR]
    ${conversationBehavior}
  `

  let replyText = ''
  let chatSession: any = null
  try {
    const { data: chatbot } = await supabase
      .from('chatbots')
      .select('enabled_tools, tools_config')
      .eq('id', waAccount.chatbot_id)
      .single()

    // Find existing session to get history
    let messagesHistory: any[] = []
    
    const { data: existingSessions } = await supabase
      .from('chat_sessions')
      .select('id, metadata')
      .eq('chatbot_id', waAccount.chatbot_id)
      .contains('metadata', { phone: from_number })
      .order('created_at', { ascending: false })
      .limit(1)

    if (existingSessions && existingSessions.length > 0) {
      chatSession = existingSessions[0]
      sessionMetadata = chatSession.metadata || null
      
      const { data: history } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', chatSession.id)
        .order('created_at', { ascending: true })
        .limit(20)
        
      if (history && history.length > 0) {
        messagesHistory = history.map(msg => ({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content }))
      }
    }
    
    if (conversationSettings.contactMemoryEnabled) {
      contactMemory = await safeLoadContactMemory(supabase, waAccount.chatbot_id, 'whatsapp', from_number)
    }

    const sessionState = conversationSettings.sessionMemoryEnabled
      ? getConversationStateFromMetadata(sessionMetadata)
      : {}

    const languagePolicy = await buildChatbotLanguagePolicy({
      supabase,
      chatbot: chatbotIdentity || { id: waAccount.chatbot_id, default_language: chatbotDefaultLanguage },
      userMessage: text,
      sessionPreferredLanguage: sessionState.preferredLanguage || contactMemory?.memory?.preferredLanguage || null,
    })
    activeLanguageName = languagePolicy.activeLanguage.name

    const systemPrompt = `${systemPromptBase}

[LANGUAGE POLICY]
${languagePolicy.prompt}

[SESSION STATE]
${buildConversationStatePrompt(sessionState, contactMemory)}

[ADDITIONAL CONTEXT FROM KNOWLEDGE BASE]
${contextText || 'No specific background knowledge found for this query.'}

IMPORTANT INSTRUCTIONS:
1. Format specifically for WhatsApp. You can use standard formatting like *bold* or _italics_ natively.
2. Do not include markdown headers (#) or markdown horizontal lines (---).
3. Prioritize [ADDITIONAL CONTEXT] for factual accuracy over base instructions.`

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
      if (!chatSession) {
        const { data: newSession, error: sessErr } = await supabase.from('chat_sessions').insert({
          chatbot_id: waAccount.chatbot_id,
          metadata: { type: 'whatsapp', phone: from_number, username: customer_name }
        }).select('id, metadata').single()
        
        if (sessErr) {
           console.error('❌ Failed to insert new WhatsApp chat_sessions:', sessErr)
           throw sessErr
        }
        chatSession = newSession
        sessionMetadata = newSession?.metadata || null
      }

      const { error: msgErr } = await supabase.from('chat_messages').insert([
        { session_id: chatSession.id, role: 'user', content: text },
        { session_id: chatSession.id, role: 'assistant', content: replyText }
      ])
      
      if (msgErr) {
          console.error('❌ Failed to insert WhatsApp chat_messages:', msgErr)
          throw msgErr
      }
      
      if (conversationSettings.sessionMemoryEnabled) {
        const nextState = updateConversationState({
          existingState: getConversationStateFromMetadata(sessionMetadata),
          userMessage: text,
          assistantReply: replyText,
          customerName,
          customerPhone: from_number,
          defaultLanguage: activeLanguageName || chatbotDefaultLanguage,
        })

        sessionMetadata = mergeMetadataWithState(sessionMetadata, nextState)
        await supabase
          .from('chat_sessions')
          .update({ metadata: sessionMetadata })
          .eq('id', chatSession.id)

        if (conversationSettings.contactMemoryEnabled) {
          await safeUpsertContactMemory(supabase, {
            chatbot_id: waAccount.chatbot_id,
            channel: 'whatsapp',
            contact_key: from_number,
            display_name: customer_name,
            preferred_language: nextState.preferredLanguage || null,
            memory: {
              lastIntent: nextState.currentIntent || null,
              phone: nextState.collected?.phone || from_number,
              name: nextState.collected?.name || customer_name,
              preferredLanguage: nextState.preferredLanguage || null,
              notes: nextState.openQuestion || null,
            },
          })
        }
      }

      console.log(`   ✅ Chat history securely appended to Session: ${chatSession.id}`)
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
