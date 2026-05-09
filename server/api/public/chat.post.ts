import { serverSupabaseServiceRole } from '#supabase/server'
import { searchKnowledge } from '~~/server/utils/ai'
import { runAgentCycle } from '~~/server/utils/agent/engine'
import {
  getRequestOriginContext,
  isAllowedDomainHost,
  isPlatformHost,
  isUuid,
  normalizeHost,
  setPublicCors,
  verifyWidgetAccessToken,
} from '~~/server/utils/public-chatbot'

export default defineEventHandler(async (event) => {
  const requestContext = getRequestOriginContext(event)
  setPublicCors(event, requestContext.requestOrigin)

  if (event.method === 'OPTIONS') {
    return 'OK'
  }

  const supabase = serverSupabaseServiceRole(event)
  const body = await readBody(event)
  const chatbotId = body?.chatbotId
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  const providedSessionId = body?.sessionId
  const embedToken = typeof body?.embedToken === 'string' ? body.embedToken : ''
  const embedHost = normalizeHost(typeof body?.embedHost === 'string' ? body.embedHost : '')

  if (!isUuid(chatbotId) || !message) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or missing chatbotId/message' })
  }

  if (message.length > 4000) {
    throw createError({ statusCode: 400, statusMessage: 'Message is too long' })
  }

  if (providedSessionId && !isUuid(providedSessionId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid sessionId' })
  }

  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('id, name, system_prompt, is_public, deleted_at, allowed_domains, enabled_tools')
    .eq('id', chatbotId)
    .single()

  if (chatbotError) {
    console.error('[Public Chat] Failed to load chatbot:', chatbotError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load chatbot' })
  }

  if (!chatbot || !chatbot.is_public || chatbot.deleted_at) {
    throw createError({ statusCode: 404, statusMessage: 'Chatbot not found' })
  }

  const allowedDomains = chatbot.allowed_domains || []
  const allowLocalhostTesting = (chatbot as any).allow_localhost_testing ?? true
  const isWidgetRequest = requestContext.refererPathname.startsWith('/widget/')

  if (!isWidgetRequest && allowedDomains.length > 0 && !requestContext.requestHost) {
    throw createError({ statusCode: 403, statusMessage: 'Missing request origin' })
  }

  if (isWidgetRequest) {
    if (!embedToken || !embedHost) {
      throw createError({ statusCode: 403, statusMessage: 'Missing widget access token' })
    }

    const claims = await verifyWidgetAccessToken(event, embedToken, {
      chatbotId,
      host: embedHost,
    })

    if (!claims || !isAllowedDomainHost(event, claims.host, allowedDomains, { allowLocalhostTesting })) {
      throw createError({ statusCode: 403, statusMessage: 'Unauthorized widget request' })
    }
  } else if (requestContext.requestHost && !isPlatformHost(event, requestContext.requestHost)) {
    if (!isAllowedDomainHost(event, requestContext.requestHost, allowedDomains, { allowLocalhostTesting })) {
      throw createError({ statusCode: 403, statusMessage: 'Unauthorized domain' })
    }
  }

  let sessionId = providedSessionId
  if (sessionId) {
    const { data: existingSession, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id, chatbot_id')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !existingSession || existingSession.chatbot_id !== chatbotId) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid session for chatbot' })
    }
  } else {
    const { data: newSession, error: sessionInsertError } = await supabase
      .from('chat_sessions')
      .insert({
        chatbot_id: chatbotId,
        metadata: {
          source: isWidgetRequest ? 'widget' : 'public-chat',
          host: isWidgetRequest ? embedHost : normalizeHost(requestContext.requestHost),
        },
      })
      .select('id')
      .single()

    if (sessionInsertError || !newSession?.id) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to initialize session' })
    }

    sessionId = newSession.id
  }

  try {
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message,
    })

    const contextResults = await searchKnowledge(supabase, chatbotId, message, 3)
    const chunks = contextResults.map((r: any) => r.content)
    const contextText = chunks.join('\n\n---\n\n')

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
      6. If the [ADDITIONAL CONTEXT] contradicts your base instructions, prioritize the [ADDITIONAL CONTEXT] for factual accuracy.
      7. DO NOT blindly recite lists of services or generic company descriptions unless explicitly asked.
    `

    let messagesHistory: any[] = []
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20)

    if (history && history.length > 0) {
      messagesHistory = history.map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      }))
    }

    if (messagesHistory.length === 0) {
      messagesHistory = [{ role: 'user', content: message }]
    }

    const response = await runAgentCycle(messagesHistory, {
      systemPrompt,
      chatbotId: chatbot.id,
      enabledTools: chatbot.enabled_tools || [],
      event,
      context: { platform: 'web' },
    })

    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: response,
    })

    return {
      success: true,
      response,
      sessionId,
    }
  } catch (err: any) {
    console.error('[Public Chat Error]', err)

    throw createError({
      statusCode: 500,
      statusMessage: process.dev
        ? `Error: ${err?.message || 'Unknown processing error'}`
        : 'I apologize, but I encountered an internal error.',
    })
  }
})

