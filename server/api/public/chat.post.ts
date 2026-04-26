import { serverSupabaseServiceRole } from '#supabase/server'
import { searchKnowledge } from '~~/server/utils/ai'
import { runAgentCycle } from '~~/server/utils/agent/engine'

export default defineEventHandler(async (event) => {
  // Handle CORS
  appendResponseHeader(event, 'Access-Control-Allow-Origin', '*')
  appendResponseHeader(event, 'Access-Control-Allow-Methods', 'POST, OPTIONS')
  appendResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')

  if (event.method === 'OPTIONS') {
    return 'OK'
  }

  const supabase = serverSupabaseServiceRole(event) 
  
  const body = await readBody(event)
  const { chatbotId, message, sessionId: providedSessionId } = body

  if (!chatbotId || !message || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chatbotId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or missing chatbotId/message' })
  }

  // 1. Fetch Chatbot (Public Info)
  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('id, name, system_prompt, user_id, enabled_tools')
    .eq('id', chatbotId)
    .single()

  if (chatbotError || !chatbot) {
    throw createError({ statusCode: 404, statusMessage: 'Chatbot not found' })
  }

  // 2. Handle Session
  let sessionId = providedSessionId
  if (!sessionId) {
    const { data: newSession } = await supabase
      .from('chat_sessions')
      .insert({ chatbot_id: chatbotId })
      .select('id')
      .single()
    sessionId = newSession?.id
    if (!sessionId) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to initialize session' })
    }
  }

  try {
    // 3. Save User Message
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message
    })

    console.log(`[Public Chat] Starting request for chatbot: ${chatbot.name} (${chatbotId})`)

    // 4. Search Knowledge Base (RAG)
    const contextResults = await searchKnowledge(supabase, chatbotId, message, 3)
    const chunks = contextResults.map((r: any) => r.content)
    const contextText = chunks.join('\n\n---\n\n')

    if (process.dev) {
      console.log(`[Public Chat Debug] RAG Chunks retrieved: ${chunks.length} chunks`)
    }

    // 5. Construct Final System Prompt
    const baseInstructions = chatbot.system_prompt || `You are an AI assistant for ${chatbot.name}.`
    
    const systemPrompt = `
      ${baseInstructions}

      [ADDITIONAL CONTEXT FROM KNOWLEDGE BASE]
      ${contextText || 'No specific background knowledge found for this query.'}
      
      IMPORTANT INSTRUCTIONS:
      1. Keep your responses EXTREMELY BRIEF and CONCISE (Max 160 characters unless listing products).
      2. Sound like a real human. Be warm, natural, and conversational. Get straight to the point.
      3. Use PLAIN, CLEAN language. DO NOT use marketing buzzwords or corporate jargon.
      4. DO NOT provide long explanations. If you don't know something, just say so simply.
      5. Always format your responses using clean Markdown.
         - Use standard bullet points (-) for lists.
         - Use **bold text** sparingly to highlight key concepts.
      5. If the [ADDITIONAL CONTEXT] contradicts your base instructions, prioritize the [ADDITIONAL CONTEXT] for factual accuracy.
      6. DO NOT blindly recite lists of services or generic company descriptions unless explicitly asked.
    `

    // 6. Get AI Response (Agentic Loop)
    console.log('[Public Chat] Requesting Agent cycle...')
    
    // Fetch conversation history
    let messagesHistory: any[] = []
    if (sessionId) {
      const { data: history } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(20) // Give the AI the last 20 messages for context
        
      if (history && history.length > 0) {
        messagesHistory = history.map(msg => ({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content }))
      }
    }
    
    // If we couldn't fetch history, fallback to just the current message
    if (messagesHistory.length === 0) {
      messagesHistory = [{ role: 'user', content: message }]
    }

    const response = await runAgentCycle(messagesHistory, { 
      systemPrompt, 
      chatbotId: chatbot.id,
      enabledTools: chatbot.enabled_tools || [],
      event,
      context: { platform: 'web' }
    })

    // 7. Save Assistant Reply
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: response
    })

    console.log('[Public Chat] AI Response received and logged successfully')

    return { 
      success: true, 
      response,
      sessionId
    }
  } catch (err: any) {
    console.error('[Public Chat Error Handled]', err)
    
    const errorMessage = process.dev 
      ? `Error: ${err.message || 'Unknown processing error'}` 
      : 'I apologize, but I encountered an internal error.'

    throw createError({ 
      statusCode: 500, 
      statusMessage: errorMessage,
      data: { originalError: err.message }
    })
  }
})

