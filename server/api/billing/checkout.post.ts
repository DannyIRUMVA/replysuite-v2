import { defineEventHandler, readBody, createError } from 'h3'
import { Polar } from '@polar-sh/sdk'
import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    const { userId } = await getAuthContext(event)
    const body = await readBody(event)
    const { productId } = body

    if (!productId) {
      throw createError({
        statusCode: 400,
        message: 'Product ID is required'
      })
    }

    const config = useRuntimeConfig()
    const polarAccessToken = config.polarAccessToken
    const polarServer = config.polarServer
    const siteUrl = config.public.siteUrl

    console.log('[DEBUG] Polar Config Check:', { 
      hasToken: !!polarAccessToken, 
      tokenPrefix: polarAccessToken ? polarAccessToken.substring(0, 10) : 'none',
      server: polarServer,
      siteUrl
    })

    if (!polarAccessToken) {
      console.error('[Polar] Missing POLAR_ACCESS_TOKEN in runtime config')
      throw createError({
        statusCode: 500,
        message: 'Billing service misconfigured'
      })
    }

    const polar = new Polar({
      accessToken: polarAccessToken,
      server: (polarServer?.toLowerCase() as any) || 'sandbox'
    })

    console.log('[DEBUG] Polar Checkout: Creating session for', { productId, userId })

    const checkoutPayload = {
      products: [productId],
      successUrl: `${siteUrl}/dashboard/settings?success=true&activeTab=billing`,
      customerMetadata: {
        supabase_user_id: userId
      }
    }

    console.log('[DEBUG] Polar Payload:', JSON.stringify(checkoutPayload, null, 2))

    const checkout = await polar.checkouts.create(checkoutPayload)

    console.log('[DEBUG] Polar Checkout Success URL:', checkout.url)
    return { url: checkout.url }
  } catch (err: any) {
    console.error('[Polar Checkout Error Detail]')
    console.error('Error Name:', err.name)
    console.error('Error Message:', err.message)
    if (err.response) {
      console.error('Response Status:', err.response.status)
      console.error('Response Data:', JSON.stringify(err.response.data, null, 2))
    } else if (err.data) {
      console.error('Error Data:', JSON.stringify(err.data, null, 2))
    }
    
    // Pass through H3 errors
    if (err.statusCode) throw err

    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to create checkout session'
    })
  }
})

