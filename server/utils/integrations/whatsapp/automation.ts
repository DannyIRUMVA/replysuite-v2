import { searchKnowledge, getLowIntentDirectReply } from '../../ai'
import { runAgentCycle } from '../../agent/engine'
import { buildAssistantSkillsPrompt } from '../../agent/skills'
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
import { storeWhatsappImageWithMediaWorker, toCustomerSafeMediaContext } from './media'

const normalizeWhatsappMessageIds = (metadata: any) => {
  const ids = metadata?.whatsapp_message_ids
  return Array.isArray(ids) ? ids.filter(Boolean).map(String) : []
}

const mergeWhatsappSessionMetadata = (metadata: any, updates: Record<string, any>) => ({
  ...(metadata || {}),
  type: 'whatsapp',
  channel: 'whatsapp',
  ...updates,
})

export const processWhatsappMessage = async (supabase: any, messageData: any) => {
  const { phone_number_id, from_number, text, customer_name, message_id, media } = messageData
  let chatSession: any = null
  let sessionMetadata: any = null
  let inboundAlreadyRecorded = false
  let inboundRecorded = false
  let storedMediaAsset: any = null

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

  // Persist inbound WhatsApp messages before AI generation so conversations are not lost
  // when plan limits, provider errors, or Meta retries interrupt the reply path.
  try {
    const { data: existingSessions } = await supabase
      .from('chat_sessions')
      .select('id, metadata')
      .eq('chatbot_id', waAccount.chatbot_id)
      .contains('metadata', { phone: from_number })
      .order('created_at', { ascending: false })
      .limit(1)

    if (existingSessions && existingSessions.length > 0) {
      chatSession = existingSessions[0]
      sessionMetadata = chatSession.metadata || {}
    } else {
      const initialMetadata = mergeWhatsappSessionMetadata(null, {
        phone: from_number,
        username: customer_name,
        whatsapp_phone_number_id: phone_number_id,
        whatsapp_message_ids: [],
      })

      const { data: newSession, error: sessErr } = await supabase
        .from('chat_sessions')
        .insert({ chatbot_id: waAccount.chatbot_id, metadata: initialMetadata })
        .select('id, metadata')
        .single()

      if (sessErr) throw sessErr
      chatSession = newSession
      sessionMetadata = newSession?.metadata || initialMetadata
    }

    const recordedMessageIds = normalizeWhatsappMessageIds(sessionMetadata)
    inboundAlreadyRecorded = !!message_id && recordedMessageIds.includes(String(message_id))

    if (inboundAlreadyRecorded) {
      console.warn(`⚠️ [WhatsApp Automation] Duplicate inbound message skipped: ${message_id}`)
      return
    }

    const { error: inboundErr } = await supabase
      .from('chat_messages')
      .insert({ session_id: chatSession.id, role: 'user', content: text })

    if (inboundErr) throw inboundErr
    inboundRecorded = true

    const nextMessageIds = message_id
      ? [...recordedMessageIds, String(message_id)].slice(-50)
      : recordedMessageIds

    sessionMetadata = mergeWhatsappSessionMetadata(sessionMetadata, {
      phone: from_number,
      username: customer_name,
      whatsapp_phone_number_id: phone_number_id,
      last_inbound_at: new Date().toISOString(),
      last_inbound_text: text,
      whatsapp_message_ids: nextMessageIds,
    })

    if (media?.id && waAccount?.access_token) {
      try {
        storedMediaAsset = await storeWhatsappImageWithMediaWorker({
          event: (messageData as any)._event,
          accessToken: waAccount.access_token,
          chatbotId: waAccount.chatbot_id,
          sessionId: chatSession.id,
          messageId: message_id,
          media,
        })
      } catch (mediaErr: any) {
        console.warn('[WhatsApp Media] Failed to store inbound media:', mediaErr?.message || mediaErr)
      }
    }

    if (storedMediaAsset) {
      const mediaAssets = Array.isArray(sessionMetadata.media_assets) ? sessionMetadata.media_assets : []
      sessionMetadata = mergeWhatsappSessionMetadata(sessionMetadata, {
        media_assets: [
          ...mediaAssets,
          {
            type: storedMediaAsset.type,
            url: storedMediaAsset.url,
            mime_type: storedMediaAsset.mimeType,
            caption: storedMediaAsset.caption,
            size: storedMediaAsset.size,
            usage_hint: storedMediaAsset.usageHint,
            created_at: new Date().toISOString(),
          },
        ].slice(-20),
        last_media_asset: {
          type: storedMediaAsset.type,
          url: storedMediaAsset.url,
          mime_type: storedMediaAsset.mimeType,
          caption: storedMediaAsset.caption,
          usage_hint: storedMediaAsset.usageHint,
        },
      })
    }

    await supabase
      .from('chat_sessions')
      .update({ metadata: sessionMetadata })
      .eq('id', chatSession.id)

    console.log(`   ✅ Inbound WhatsApp message recorded in Session: ${chatSession.id}`)
  } catch (err) {
    console.error('❌ [WhatsApp Debug] Failed to record inbound message:', err)
  }

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

  let contactMemory: any = null

  const systemPromptBase = `
    ${baseInstructions}

    [CONVERSATION BEHAVIOR]
    ${conversationBehavior}
  `

  let replyText = ''
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

[ASSIGNED ASSISTANT SKILLS]
${buildAssistantSkillsPrompt((chatbot as any)?.tools_config)}

[ADDITIONAL CONTEXT FROM KNOWLEDGE BASE]
${contextText || 'No specific background knowledge found for this query.'}

[WHATSAPP MEDIA CONTEXT]
${storedMediaAsset ? toCustomerSafeMediaContext(storedMediaAsset) : 'No stored customer image is attached to this turn.'}

IMPORTANT INSTRUCTIONS:
1. Format specifically for WhatsApp. You can use standard formatting like *bold* or _italics_ natively.
2. Do not include markdown headers (#) or markdown horizontal lines (---).
3. Prioritize [ADDITIONAL CONTEXT] for factual accuracy over base instructions.`

    // Use the persisted inbound message for context. If recording failed, still include
    // the current text so the assistant can answer.
    const latestUserMessage = [...messagesHistory].reverse().find((msg: any) => msg.role === 'user')
    if (!latestUserMessage || latestUserMessage.content !== text) {
      messagesHistory.push({ role: 'user', content: text })
    }

    const normalizedLowIntentText = String(text || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const isKinyarwandaFirst = String(activeLanguageName || chatbotDefaultLanguage || '')
      .toLowerCase()
      .includes('kinyarwanda')
    const englishLowIntentReply = getLowIntentDirectReply(text, Boolean(sessionState.greeted))
    const kinyarwandaLowIntentReply = isKinyarwandaFirst && (/^(muraho|amakuru|amakuru yanyu|bite|mwaramutse|mwiriwe|hi|hello|hey|good morning|good afternoon|good evening)$/.test(normalizedLowIntentText) || englishLowIntentReply)
      ? (/^(thanks|thank you|thx)$/.test(normalizedLowIntentText)
        ? 'Murakoze — hari ikindi nabafasha?'
        : /^(ok|okay|okey|k|cool|great|nice|yes|yeah|yep|sure)$/.test(normalizedLowIntentText)
          ? 'Yego — ni iki kindi nabafasha?'
          : (sessionState.greeted ? 'Nafasha nte uyu munsi?' : 'Muraho! Nafasha nte uyu munsi?'))
      : null
    const directLowIntentReply = kinyarwandaLowIntentReply || englishLowIntentReply

    if (directLowIntentReply) {
      replyText = directLowIntentReply
    } else {
      replyText = await runAgentCycle(messagesHistory, { 
        systemPrompt, 
        chatbotId: waAccount.chatbot_id,
        enabledTools: chatbot?.enabled_tools || [],
        event: (messageData as any)._event,
        context: {
          platform: 'whatsapp',
          customerPhone: from_number,
          whatsappToken: waAccount.access_token,
          phoneId: phone_number_id,
          mediaAssets: storedMediaAsset ? [storedMediaAsset] : []
        }
      })
    }

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
        const fallbackMetadata = mergeWhatsappSessionMetadata(null, {
          phone: from_number,
          username: customer_name,
          whatsapp_phone_number_id: phone_number_id,
          whatsapp_message_ids: message_id ? [String(message_id)] : [],
        })

        const { data: newSession, error: sessErr } = await supabase.from('chat_sessions').insert({
          chatbot_id: waAccount.chatbot_id,
          metadata: fallbackMetadata
        }).select('id, metadata').single()
        
        if (sessErr) {
           console.error('❌ Failed to insert new WhatsApp chat_sessions:', sessErr)
           throw sessErr
        }
        chatSession = newSession
        sessionMetadata = newSession?.metadata || fallbackMetadata
      }

      const messagesToInsert = [
        ...(!inboundRecorded ? [{ session_id: chatSession.id, role: 'user', content: text }] : []),
        { session_id: chatSession.id, role: 'assistant', content: replyText }
      ]

      const { error: msgErr } = await supabase.from('chat_messages').insert(messagesToInsert)
      
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
