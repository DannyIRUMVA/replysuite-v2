import { defineEventHandler, readBody, createError } from 'h3'
import { Polar } from '@polar-sh/sdk'
import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    const { userId } = await getAuthContext(event)
    const body = await readBody(event)
    const { productId } = body

    if (!productId) {
      throw createError({ statusCode: 400, message: 'Product ID is required' })
    }

    const config = useRuntimeConfig()
    const polarAccessToken = config.polarAccessToken
    const polarServer = config.polarServer
    const siteUrl = config.public.siteUrl

    if (!polarAccessToken) {
      throw createError({ statusCode: 500, message: 'Billing service misconfigured' })
    }

    // Get the authenticated user's email so we can pre-fill Polar's checkout.
    // When customerEmail is supplied for a known Polar customer, Polar skips
    // the "create account" step and goes straight to payment — fixing the
    // "user already has an account" error on upgrades/plan changes.
    const user = await serverSupabaseUser(event)
    const userEmail = user?.email

    const polar = new Polar({
      accessToken: polarAccessToken,
      server: (polarServer?.toLowerCase() as any) || 'sandbox',
    })

    const checkoutPayload: Record<string, any> = {
      products: [productId],
      successUrl: `${siteUrl}/dashboard/settings?success=true&activeTab=billing`,
      customerMetadata: {
        supabase_user_id: userId,
      },
    }

    // Pre-fill email → Polar recognises the existing customer and skips account creation
    if (userEmail) {
      checkoutPayload.customerEmail = userEmail
    }

    const checkout = await polar.checkouts.create(checkoutPayload)
    return { url: checkout.url }
  } catch (err: any) {
    console.error('[Polar Checkout Error]', err.message)
    if (err.response) {
      console.error('Polar response:', err.response.status, JSON.stringify(err.response.data))
    }
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, message: err.message || 'Failed to create checkout session' })
  }
})
