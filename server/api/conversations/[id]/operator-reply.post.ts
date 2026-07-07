import { serverSupabaseServiceRole } from '#supabase/server'
import { getAuthenticatedUserId } from '~~/server/utils/auth'

const normalizeWhatsappRecipient = (value: string) => value.replace(/[^0-9]/g, '')

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)
  const sessionId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const message = String(body?.message || '').trim()

  if (!sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing conversation session id' })
  }

  if (!message) {
    throw createError({ statusCode: 400, statusMessage: 'Message is required' })
  }

  if (message.length > 4000) {
    throw createError({ statusCode: 400, statusMessage: 'Message is too long' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: session, error: sessionError } = await supabase
    .from('chat_sessions')
    .select('id, chatbot_id, metadata, chatbot:chatbots!inner(user_id)')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError) {
    console.error('[Conversation Operator Reply] Failed to load session:', sessionError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load conversation' })
  }

  const ownerId = Array.isArray((session as any)?.chatbot)
    ? (session as any).chatbot[0]?.user_id
    : (session as any)?.chatbot?.user_id

  if (!session || ownerId !== userId) {
    throw createError({ statusCode: 404, statusMessage: 'Conversation not found' })
  }

  const metadata = ((session as any).metadata && typeof (session as any).metadata === 'object') ? (session as any).metadata : {}
  const channel = String(metadata.channel || metadata.type || '').toLowerCase()

  if (channel !== 'whatsapp') {
    throw createError({ statusCode: 400, statusMessage: 'Direct operator sending is currently available for WhatsApp conversations only' })
  }

  const recipient = normalizeWhatsappRecipient(String(metadata.phone || metadata.from_number || ''))
  const phoneNumberId = String(metadata.whatsapp_phone_number_id || '')

  if (!recipient || !phoneNumberId) {
    throw createError({ statusCode: 400, statusMessage: 'This WhatsApp conversation is missing recipient details' })
  }

  const { data: waAccount, error: waError } = await supabase
    .from('whatsapp_accounts')
    .select('id, access_token, phone_number_id, user_id, chatbot_id, status')
    .eq('phone_number_id', phoneNumberId)
    .eq('user_id', userId)
    .eq('chatbot_id', (session as any).chatbot_id)
    .maybeSingle()

  if (waError) {
    console.error('[Conversation Operator Reply] WhatsApp account lookup failed:', waError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load WhatsApp account' })
  }

  if (!waAccount?.access_token) {
    throw createError({ statusCode: 404, statusMessage: 'Connected WhatsApp account was not found' })
  }

  if (waAccount.status !== 'active' && waAccount.status !== 'deployed') {
    throw createError({ statusCode: 400, statusMessage: 'WhatsApp account is not active' })
  }

  const metaResponse = await fetch(`https://graph.facebook.com/v21.0/${waAccount.phone_number_id}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${waAccount.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'text',
      text: { body: message },
    }),
  })

  const result: any = await metaResponse.json().catch(() => ({}))

  if (!metaResponse.ok || result?.error) {
    console.error('[Conversation Operator Reply] Meta send failed:', result)
    throw createError({
      statusCode: 502,
      statusMessage: result?.error?.message || 'Failed to send WhatsApp reply',
    })
  }

  const now = new Date().toISOString()
  const sentMessageId = result?.messages?.[0]?.id || null

  const { data: savedMessage, error: messageError } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role: 'assistant',
      content: message,
    })
    .select('id, role, content, created_at')
    .single()

  if (messageError) {
    console.error('[Conversation Operator Reply] Message sent but DB insert failed:', messageError)
  }

  await supabase
    .from('chat_sessions')
    .update({
      metadata: {
        ...metadata,
        human_takeover: {
          ...(metadata.human_takeover || {}),
          enabled: true,
          updated_at: now,
          last_operator_at: now,
          operator_id: userId,
        },
        last_operator_at: now,
        last_operator_message_id: sentMessageId,
      },
    })
    .eq('id', sessionId)

  return {
    success: true,
    messageId: sentMessageId,
    message: savedMessage,
  }
})
