import { serverSupabaseServiceRole } from '#supabase/server'
import { getAuthenticatedUserId } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)
  const sessionId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const enabled = Boolean(body?.enabled)

  if (!sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing conversation session id' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: session, error: sessionError } = await supabase
    .from('chat_sessions')
    .select('id, metadata, chatbot:chatbots!inner(user_id)')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError) {
    console.error('[Conversation Takeover] Failed to load session:', sessionError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load conversation' })
  }

  const ownerId = Array.isArray((session as any)?.chatbot)
    ? (session as any).chatbot[0]?.user_id
    : (session as any)?.chatbot?.user_id

  if (!session || ownerId !== userId) {
    throw createError({ statusCode: 404, statusMessage: 'Conversation not found' })
  }

  const now = new Date().toISOString()
  const metadata = {
    ...(((session as any).metadata && typeof (session as any).metadata === 'object') ? (session as any).metadata : {}),
    human_takeover: {
      enabled,
      updated_at: now,
      operator_id: userId,
    },
  }

  const { data: updated, error: updateError } = await supabase
    .from('chat_sessions')
    .update({ metadata })
    .eq('id', sessionId)
    .select('id, metadata')
    .single()

  if (updateError) {
    console.error('[Conversation Takeover] Failed to update session:', updateError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to update takeover state' })
  }

  return {
    success: true,
    enabled,
    session: updated,
  }
})
