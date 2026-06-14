import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { buildLowIntentTurnPrompt, getLowIntentDirectReply, isLowIntentChatMessage, searchKnowledge } from '~~/server/utils/ai'
import { runAgentCycle } from '~~/server/utils/agent/engine'
import { buildAssistantSkillsPrompt } from '~~/server/utils/agent/skills'
import { buildChatbotLanguagePolicy } from '~~/server/utils/language-policy'
import { isUuid } from '~~/server/utils/public-chatbot'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const supabaseAdmin = serverSupabaseServiceRole(event)
  const user = await serverSupabaseUser(event)

  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const chatbotId = body?.chatbotId
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  const providedSessionId = body?.sessionId

  if (!isUuid(chatbotId) || !message) {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid chatbotId/message' })
  }

  if (providedSessionId && !isUuid(providedSessionId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid sessionId' })
  }

  // 1. Verify ownership with the user-scoped client
  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('id, name, system_prompt, user_id, default_language, enabled_tools, tools_config')
    .eq('id', chatbotId)
    .maybeSingle()

  if (chatbotError || !chatbot) {
    throw createError({ statusCode: 404, statusMessage: 'Chatbot not found or access denied' })
  }

  // 2. Handle Session via service role after ownership is confirmed
  let sessionId = providedSessionId
  if (sessionId) {
    const { data: existingSession, error: sessionError } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, chatbot_id')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !existingSession || existingSession.chatbot_id !== chatbotId) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid session for chatbot' })
    }
  } else {
    const { data: newSession, error: sessionInsertError } = await supabaseAdmin
      .from('chat_sessions')
      .insert({ chatbot_id: chatbotId, metadata: { type: 'test' } })
      .select('id')
      .single()

    if (sessionInsertError || !newSession?.id) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to initialize test session' })
    }

    sessionId = newSession.id
  }

  try {
    // 3. Save User Message
    await supabaseAdmin.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message
    })

    const directLowIntentReply = getLowIntentDirectReply(message, false)

    if (directLowIntentReply) {
      await supabaseAdmin.from('chat_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: directLowIntentReply,
      })

      return {
        success: true,
        response: directLowIntentReply,
        sessionId,
        hasContext: false,
        contextCount: 0,
      }
    }

    // 4. Search Knowledge Base (RAG), but skip low-intent greetings/acks so test chat stays calm.
    const isLowIntentTurn = isLowIntentChatMessage(message)
    const contextResults = isLowIntentTurn ? [] : await searchKnowledge(supabaseAdmin, chatbotId, message, 6)
    const contextText = contextResults.map((r: any, index: number) => {
      const sourceLabel = [r.title, r.url].filter(Boolean).join(' · ') || r.sourceType || 'Knowledge Source'
      return `[Source ${index + 1}: ${sourceLabel}]\n${r.content}`
    }).join('\n\n---\n\n')

    // 5. Construct System Prompt with Knowledge
    const baseInstructions = chatbot.system_prompt || `You are an AI assistant for ${chatbot.name}.`
    const languagePolicy = await buildChatbotLanguagePolicy({
      supabase: supabaseAdmin,
      chatbot,
      userMessage: message,
      sessionPreferredLanguage: null,
    })

    const systemPrompt = `
      ${baseInstructions}

      [LANGUAGE POLICY]
      ${languagePolicy.prompt}

      [ASSIGNED ASSISTANT SKILLS]
      ${buildAssistantSkillsPrompt((chatbot as any)?.tools_config)}

      ${isLowIntentTurn ? `[LOW-INTENT TURN RULE]\n${buildLowIntentTurnPrompt(false)}` : ''}

      [ADDITIONAL CONTEXT FROM KNOWLEDGE BASE]
      ${contextText || 'No specific background knowledge found for this query.'}
      
      IMPORTANT INSTRUCTIONS:
      1. Be EXTREMELY CONCISE. Provide short, direct answers.
      2. Use ONLY PLAIN TEXT. Do NOT use Markdown (no headers #, no bold **, no horizontal lines ---, no tables, no lists).
      3. If the [ADDITIONAL CONTEXT] contradicts your base instructions, prioritize the [ADDITIONAL CONTEXT] for factual accuracy.
      4. For greetings, thanks, acknowledgements, or short replies like "ok", answer with one short sentence only.
    `

    const { data: history } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20)

    const messagesHistory = (history?.length ? history : [{ role: 'user', content: message }]).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }))

    // 6. Get AI Response through the same tool-aware agent loop used by public chat.
    let response = await runAgentCycle(messagesHistory, {
      systemPrompt,
      chatbotId: chatbot.id,
      enabledTools: (chatbot as any).enabled_tools || [],
      event,
      context: { platform: 'test', sessionId },
    })

    // 7. Keep test chat compact and plain, but preserve IDs returned by tools.
    response = response
      .replace(/[#*|_>~]/g, '')
      .replace(/^-{2,}/gm, '')
      .replace(/(\r\n|\n|\r){3,}/g, '\n\n')
      .trim()

    // 8. Save Assistant Reply
    await supabaseAdmin.from('chat_messages').insert({
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
