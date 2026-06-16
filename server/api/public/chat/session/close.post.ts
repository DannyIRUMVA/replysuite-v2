import { serverSupabaseServiceRole } from '#supabase/server'
import { getRequestOriginContext, isUuid, setPublicCors } from '~~/server/utils/public-chatbot'

export default defineEventHandler(async (event) => {
  const requestContext = getRequestOriginContext(event)
  setPublicCors(event, requestContext.requestOrigin)

  if (event.method === 'OPTIONS') return 'OK'

  const body = await readBody(event)
  const chatbotId = body?.chatbotId
  const sessionId = body?.sessionId
  const visitorId = typeof body?.visitorId === 'string' && /^[a-zA-Z0-9_-]{12,80}$/.test(body.visitorId)
    ? body.visitorId
    : ''

  if (!isUuid(chatbotId) || !isUuid(sessionId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid chatbotId/sessionId' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const { data: session, error } = await supabase
    .from('chat_sessions')
    .select('id, chatbot_id, metadata')
    .eq('id', sessionId)
    .eq('chatbot_id', chatbotId)
    .maybeSingle()

  if (error || !session) {
    throw createError({ statusCode: 404, statusMessage: 'Session not found' })
  }

  const metadata = session.metadata && typeof session.metadata === 'object' ? session.metadata : {}
  if (metadata.web_visitor_id && visitorId && metadata.web_visitor_id !== visitorId) {
    throw createError({ statusCode: 403, statusMessage: 'Session visitor mismatch' })
  }

  await supabase
    .from('chat_sessions')
    .update({
      metadata: {
        ...metadata,
        closed_at: new Date().toISOString(),
      },
    })
    .eq('id', sessionId)
    .eq('chatbot_id', chatbotId)

  return { success: true }
})
