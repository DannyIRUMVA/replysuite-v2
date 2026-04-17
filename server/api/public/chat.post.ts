import { serverSupabaseServiceRole } from '#supabase/server'
import { searchKnowledge, getChatCompletion } from '~~/server/utils/ai'

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

  if (!chatbotId || !message) {
    throw createError({ statusCode: 400, statusMessage: 'Missing chatbotId or message' })
  }

  // 1. Fetch Chatbot (Public Info)
  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('id, name, system_prompt, user_id')
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
    console.log('[Public Chat] Searching knowledge base...')
    const contextResults = await searchKnowledge(supabase, chatbotId, message, 3)
    const contextText = contextResults.map((r: any) => r.content).join('\n\n---\n\n')
    console.log(`[Public Chat] Context found: ${contextResults.length} chunks`)

    // 5. Construct Final System Prompt
    const baseInstructions = chatbot.system_prompt || `You are an AI assistant for ${chatbot.name}.`
    
    const systemPrompt = `
      ${baseInstructions}

      [ADDITIONAL CONTEXT FROM KNOWLEDGE BASE]
      ${contextText || 'No specific background knowledge found for this query.'}
      
      IMPORTANT INSTRUCTIONS:
      1. Be EXTREMELY CONCISE. Provide short, direct answers.
      2. Use ONLY PLAIN TEXT. Do NOT use Markdown (no headers #, no bold **, no horizontal lines ---, no tables, no lists).
      3. If the [ADDITIONAL CONTEXT] contradicts your base instructions, prioritize the [ADDITIONAL CONTEXT] for factual accuracy.
    `

    // 6. Get AI Response
    console.log('[Public Chat] Requesting AI completion...')
    let response = await getChatCompletion([
      { role: 'user', content: message }
    ], { systemPrompt })

    // 7. Extract/Clean text (Remove Markdown characters #, *, -, _, |, >)
    // This handles cases where the AI might still include them despite instructions.
    response = response
      .replace(/[#*|_>~]/g, '') // Remove #, *, |, _, >, ~
      .replace(/^-{2,}/gm, '')  // Remove lines like -- or ---
      .replace(/(\r\n|\n|\r){3,}/g, '\n\n') // Remove excessive newlines
      .trim()

    // 8. Save Assistant Reply
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
    
    // In development mode, return the actual error message to help the user debug
    const errorMessage = process.dev 
      ? `Error: ${err.message || 'Unknown processing error'}` 
      : 'I apologize, but I encountered an internal error. Please check your AI configuration.'

    throw createError({ 
      statusCode: 500, 
      statusMessage: errorMessage,
      data: { originalError: err.message }
    })
  }
})
