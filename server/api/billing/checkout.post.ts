import { defineEventHandler, readBody, createError } from 'h3'
import { Polar } from '@polar-sh/sdk'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { updatePolarSubscription, syncUserSubscriptions } from '~~/server/utils/polar'

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

    // 1. Detection: Check if the user already has an active Polar subscription
    // If they do, we should UPDATE it instead of creating a NEW checkout session.
    // This solves the "AlreadyActiveSubscriptionError" and handles proration.
    const adminClient = serverSupabaseServiceRole(event)
    const { data: membership } = await adminClient
      .from('user_memberships')
      .select('polar_subscription_id, plan_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .not('polar_subscription_id', 'is', null)
      .maybeSingle()

    if (membership?.polar_subscription_id) {
      console.log(`[Polar Checkout] User ${userId} has active sub ${membership.polar_subscription_id}. Performing update instead...`)
      
      try {
        await updatePolarSubscription(membership.polar_subscription_id, productId)
        
        // Instant Sync: Reconcile local DB immediately
        const config = useRuntimeConfig()
        let polarId = membership.polar_customer_id
        if (!polarId) {
          // Fetch from profile if missing in membership
          const { data: profile } = await adminClient
            .from('profiles')
            .select('polar_customer_id')
            .eq('id', userId)
            .single()
          polarId = profile?.polar_customer_id
        }

        if (polarId) {
          await syncUserSubscriptions(event, userId, polarId)
        }

        return { success: true, updated: true }
      } catch (updateErr: any) {
        console.error('[Polar Checkout] Update failed:', updateErr.message)
        // If update fails (e.g. payment issue), we throw but with a better message
        throw createError({ 
          statusCode: 400, 
          message: updateErr.message || 'Failed to update plan. Please check your payment method.' 
        })
      }
    }

    const polar = new Polar({
      accessToken: polarAccessToken,
      server: (polarServer?.toLowerCase() as any) || 'sandbox',
    })

    const checkoutPayload: Record<string, any> = {
      products: [productId],
      successUrl: `${siteUrl}/dashboard/billing/success`,
      cancelUrl: `${siteUrl}/dashboard/billing/cancel`,
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
    
    // Check for "Already have an active subscription" error
    if (err.message?.includes('AlreadyActiveSubscriptionError') || (err.response?.data?.error === 'AlreadyActiveSubscriptionError')) {
      throw createError({ 
        statusCode: 409, 
        message: 'You already have an active subscription. Please sync your dashboard to see your current plan.' 
      })
    }

    if (err.response) {
      console.error('Polar response:', err.response.status, JSON.stringify(err.response.data))
    }
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, message: err.message || 'Failed to create checkout session' })
  }
})
