import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { whatsappAccountId, name, category, language, bodyText } = body

  if (!whatsappAccountId || whatsappAccountId === 'undefined' || !name || !category || !language || !bodyText) {
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

  // 2. Get WABA ID and Token
  const { data: waAccount, error: fetchError } = await supabase
    .from('whatsapp_accounts')
    .select('*')
    .eq('id', whatsappAccountId)
    .eq('user_id', user.id)
    .single()

  if (fetchError) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: `Database fetch error for templates account: ${fetchError.message}` 
    })
  }

  if (!waAccount) {
    throw createError({ 
      statusCode: 404, 
      statusMessage: `WABA config not found for account ${whatsappAccountId}. Ensure you own this ID.` 
    })
  }

  if (!waAccount.waba_id) {
    throw createError({ 
        statusCode: 400, 
        statusMessage: 'WABA ID missing from account record. Manual mapping might be required.' 
    })
  }

  // 2. Meta Graph API: Create Template
  // Endpoint: POST /{waba-id}/message_templates
  try {
    const metaResponse = await fetch(`https://graph.facebook.com/v21.0/${waAccount.waba_id}/message_templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waAccount.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name.toLowerCase().replace(/\s+/g, '_'),
        category: category, // UTILITY, MARKETING, AUTHENTICATION
        language: language, // e.g. en_US
        components: [
          {
            type: "BODY",
            text: bodyText
          }
        ]
      })
    })

    const result = await metaResponse.json()

    if (!metaResponse.ok) {
      throw createError({ 
        statusCode: metaResponse.status, 
        statusMessage: `Meta API Error: ${result?.error?.message || metaResponse.statusText}` 
      })
    }

    return { 
      success: true, 
      templateId: result.id,
      status: result.status,
      metaResponse: result 
    }
  } catch (err: any) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: err.message || 'Meta API connection refused during template registration.' 
    })
  }
})
