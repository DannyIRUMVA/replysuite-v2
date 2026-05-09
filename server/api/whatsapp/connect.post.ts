import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { isUuid } from '~~/server/utils/public-chatbot'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const wabaId = typeof body?.waba_id === 'string' ? body.waba_id.trim() : ''
  const phoneNumberId = typeof body?.phone_number_id === 'string' ? body.phone_number_id.trim() : ''
  const phoneNumber = typeof body?.phone_number === 'string' ? body.phone_number.trim() : ''
  const accessToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : ''
  const chatbotId = typeof body?.chatbot_id === 'string'
    ? body.chatbot_id.trim()
    : typeof body?.chatbotId === 'string'
      ? body.chatbotId.trim()
      : ''

  if (!wabaId || !phoneNumberId || !phoneNumber || !accessToken) {
    throw createError({ statusCode: 400, statusMessage: 'Missing primary mapping attributes to bridge WhatsApp into ReplySuite.' })
  }

  if (chatbotId && !isUuid(chatbotId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid chatbot ID supplied for WhatsApp mapping.' })
  }

  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized. Dashboard authentication required.' })
  }

  const supabase = serverSupabaseServiceRole(event)

  try {
    if (chatbotId) {
      const { data: chatbot, error: chatbotError } = await supabase
        .from('chatbots')
        .select('id, user_id, deleted_at')
        .eq('id', chatbotId)
        .maybeSingle()

      if (chatbotError || !chatbot || chatbot.deleted_at || chatbot.user_id !== user.id) {
        throw createError({ statusCode: 403, statusMessage: 'You do not have permission to attach this WhatsApp account to that chatbot.' })
      }
    }

    const { data: existing, error: findError } = await supabase
      .from('whatsapp_accounts')
      .select('id, user_id, chatbot_id')
      .eq('phone_number_id', phoneNumberId)
      .maybeSingle()

    if (findError) throw findError

    if (existing) {
      if (existing.user_id && existing.user_id !== user.id) {
        throw createError({
          statusCode: 409,
          statusMessage: 'This WhatsApp phone number is already linked to another ReplySuite account.'
        })
      }

      const updatePayload: Record<string, unknown> = {
        access_token: accessToken,
        waba_id: wabaId,
        phone_number: phoneNumber,
        updated_at: new Date().toISOString(),
      }

      if (!existing.user_id) {
        updatePayload.user_id = user.id
      }

      if (chatbotId) {
        updatePayload.chatbot_id = chatbotId
      }

      const { error: updateError } = await supabase
        .from('whatsapp_accounts')
        .update(updatePayload)
        .eq('id', existing.id)

      if (updateError) throw updateError
      return { success: true, message: 'Existing number linked! Access scope refreshed successfully.' }
    }

    const { error: insertError } = await supabase
      .from('whatsapp_accounts')
      .insert({
        user_id: user.id,
        chatbot_id: chatbotId || null,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        phone_number: phoneNumber,
        access_token: accessToken,
      })

    if (insertError) throw insertError

    return { success: true, message: 'Number structurally routed to ReplySuite Automation Webhooks successfully.' }
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    console.error('[WhatsApp Mapping Error]', error?.message || error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Database execution failed whilst binding mapping tokens natively.'
    })
  }
})
