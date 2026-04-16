import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { searchKnowledge, getChatCompletion } from '~~/server/utils/ai'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)
  
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const { chatbotId, message, sessionId: providedSessionId } = body

  if (!chatbotId || !message) {
    throw createError({ statusCode: 400, statusMessage: 'Missing chatbotId or message' })
  }

  // 1. Verify ownership (respects RLS)
  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('*, user_id')
    .eq('id', chatbotId)
    .maybeSingle()

  if (chatbotError || !chatbot) {
    throw createError({ statusCode: 404, statusMessage: 'Chatbot not found or access denied' })
  }

  // 2. Handle Session
  let sessionId = providedSessionId
  if (!sessionId) {
    const { data: newSession } = await supabase
      .from('chat_sessions')
      .insert({ chatbot_id: chatbotId, metadata: { type: 'test' } })
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

    // 4. Search Knowledge Base (RAG)
    const contextResults = await searchKnowledge(chatbotId, message, 3)
    const contextText = contextResults.map((r: any) => r.content).join('\n\n---\n\n')

    // 5. Construct System Prompt with Knowledge
    const baseInstructions = chatbot.system_prompt || `You are an AI assistant for ${chatbot.name}. Use the provided background knowledge to answer accurately. Keep answers concise and helpful.`

    const systemPrompt = `
      ${baseInstructions}

      [ADDITIONAL CONTEXT FROM KNOWLEDGE BASE]
      ${contextText || 'No specific background knowledge found for this query.'}
      
      IMPORTANT: If the [ADDITIONAL CONTEXT] contradicts your base instructions, prioritize the [ADDITIONAL CONTEXT] for factual accuracy regarding the business, but maintain the persona defined in your instructions.
    `

    // 6. Get AI Response
    const response = await getChatCompletion([
      { role: 'user', content: message }
    ], { systemPrompt })

    // 7. Save Assistant Reply
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: response
    })

    return { 
      success: true, 
      response,
      sessionId,
      hasContext: contextResults.length > 0,
      contextCount: contextResults.length
    }
  } catch (err: any) {
    console.error('[Chat Test Error]', err)
    throw createError({ statusCode: 500, statusMessage: err.message || 'AI processing failed' })
  }
})
