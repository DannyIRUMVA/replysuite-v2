export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { accessToken } = body

  if (!accessToken) {
    throw createError({ statusCode: 400, statusMessage: 'Access Token required to interact with Meta Graph API.' })
  }

  try {
    // 1. Fetch Meta Business Managers linked to the System User Auth
    const businessResponse = await $fetch<any>(`https://graph.facebook.com/v21.0/me/businesses`, {
      params: { access_token: accessToken }
    })

    if (!businessResponse.data || businessResponse.data.length === 0) {
      return { numbers: [] }
    }

    const allNumbers = []

    // 2. Transversally map Business ID -> WABA ID -> Phone Number Identity
    for (const business of businessResponse.data) {
      const wabaResponse = await $fetch<any>(`https://graph.facebook.com/v21.0/${business.id}/owned_whatsapp_business_accounts`, {
        params: { access_token: accessToken }
      })

      for (const waba of wabaResponse.data || []) {
        const phoneResponse = await $fetch<any>(`https://graph.facebook.com/v21.0/${waba.id}/phone_numbers`, {
          params: { access_token: accessToken }
        })

        for (const phone of phoneResponse.data || []) {
          allNumbers.push({
            business_id: business.id,
            waba_id: waba.id,
            waba_name: waba.name,
            phone_number_id: phone.id,
            display_phone_number: phone.display_phone_number,
            verified_name: phone.verified_name,
            quality_rating: phone.quality_rating
          })
        }
      }
    }

    return { numbers: allNumbers }
  } catch (error: any) {
    console.error('[Meta Graph Error]', error.data || error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to map authorized WhatsApp Business Accounts via the Meta Graph API.'
    })
  }
})
