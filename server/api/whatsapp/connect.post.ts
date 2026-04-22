import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { waba_id, phone_number_id, phone_number, accessToken } = body

  if (!waba_id || !phone_number_id || !phone_number || !accessToken) {
    throw createError({ statusCode: 400, statusMessage: 'Missing primary mapping attributes to bridge WhatsApp into ReplySuite.' })
  }

  // Authorize User
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized. Dashboard authentication required.' })
  }

  const supabase = serverSupabaseServiceRole(event)

  try {
    // We check if it exists or insert dynamically to prevent duplicate mapping
    const { data: existing, error: findError } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('phone_number_id', phone_number_id)
      .single()

    if (existing) {
       // Just update the Access Token and return
      const { error: updateError } = await supabase
        .from('whatsapp_accounts')
        .update({ access_token: accessToken })
        .eq('id', existing.id)

      if (updateError) throw updateError
      return { success: true, message: 'Existing number linked! Access scope refreshed successfully.' }
    }

    // Insert new Number globally for WABA Webhook receiving
    const { error: insertError } = await supabase
      .from('whatsapp_accounts')
      .insert({
        user_id: user.id,
        waba_id: waba_id,
        phone_number_id: phone_number_id,
        phone_number: phone_number,
        access_token: accessToken
      })

    if (insertError) throw insertError

    // Optionally: Post to Graph API to natively register the phone number?
    // Depending on embedded flow, the number might already be registered to cloud API natively.
    // We assume yes in this sequence.
    return { success: true, message: 'Number structurally routed to ReplySuite Automation Webhooks successfully.' }
  } catch (error: any) {
    console.error('[WhatsApp Mapping Error]', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Database execution failed whilst binding mapping tokens natively.'
    })
  }
})
