import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { whatsappAccountId, to, message } = body

  if (!whatsappAccountId || whatsappAccountId === 'undefined' || !to || !message) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: 'Missing or invalid parameters. Ensure a WhatsApp account is selected and all fields are filled.' 
    })
  }

  const supabase = serverSupabaseServiceRole(event)
  
  // 1. Get current user session more robustly
  const client = await serverSupabaseClient(event)
  const { data: { user }, error: authError } = await client.auth.getUser()

  if (!user || !user.id) {
    throw createError({ 
      statusCode: 401, 
      statusMessage: `Unauthorized: ${authError?.message || 'User ID missing from session.'}` 
    })
  }

  // 2. Get WhatsApp Account Details
  const { data: waAccount, error: fetchError } = await supabase
    .from('whatsapp_accounts')
    .select('*')
    .eq('id', whatsappAccountId)
    .eq('user_id', user.id)
    .single()

  if (fetchError) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: `Database error during account fetch: ${fetchError.message}` 
    })
  }

  if (!waAccount) {
    throw createError({ 
      statusCode: 404, 
      statusMessage: `Account ${whatsappAccountId} not found for user ${user.id}. Access denied or record missing.` 
    })
  }

  // 2. Transmit to Meta Graph API
  try {
    console.log(`[WhatsApp Test] Sending to Meta: ${waAccount.phone_number_id} using token ${waAccount.access_token?.slice(0, 5)}...`)
    const metaResponse = await fetch(`https://graph.facebook.com/v21.0/${waAccount.phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waAccount.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { body: message }
      })
    })

    const result: any = await metaResponse.json()
    console.log('[WhatsApp Test] Meta Response:', JSON.stringify(result))

    if (result.error) {
      throw createError({ 
        statusCode: 500, 
        statusMessage: `Meta API Error: ${result.error.message} (Code: ${result.error.code})` 
      })
    }

    return { 
      success: true, 
      messageId: result.messages?.[0]?.id,
      metaResponse: result 
    }
  } catch (err: any) {
    console.error('[WhatsApp Test] Execution Error:', err)
    throw createError({ 
      statusCode: 500, 
      statusMessage: err.message || 'Internal connection failure to Meta servers.' 
    })
  }
})
