import { defineEventHandler, readBody, createError } from 'h3'
import { Polar } from '@polar-sh/sdk'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { recoverPolarCustomerWithActiveSubscription, syncUserToPolar } from '~~/server/utils/polar'

const getSafeBillingErrorMessage = (err: any) => {
  const raw = [
    err?.message,
    err?.statusMessage,
    err?.response?.data?.error,
    err?.response?.data?.error_description,
    err?.response?.data?.detail,
  ].filter(Boolean).join(' ')

  if (/invalid_token|expired|revoked|malformed|401/i.test(raw)) {
    return 'Billing provider token is invalid or expired. Please update POLAR_ACCESS_TOKEN in Cloudflare Pages.'
  }

  if (/not found|404|product/i.test(raw)) {
    return 'Billing plan is not available in the configured billing environment. Please verify the product IDs and POLAR_SERVER.'
  }

  if (/AlreadyActiveSubscriptionError/i.test(raw)) {
    return 'You already have an active subscription. Please sync your dashboard to see your current plan.'
  }

  return 'Failed to create checkout session. Please contact support.'
}

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

    // 1. Detection: Check if the user already has an active Polar subscription
    // If they do, we should UPDATE it instead of creating a NEW checkout session.
    // This solves the "AlreadyActiveSubscriptionError" and handles proration.
    const adminClient = serverSupabaseServiceRole(event)
    const { data: membership } = await adminClient
      .from('user_memberships')
      .select('polar_subscription_id, polar_customer_id, plan_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .not('polar_subscription_id', 'is', null)
      .maybeSingle()

    const { data: profile } = await adminClient
      .from('profiles')
      .select('polar_customer_id, full_name')
      .eq('id', userId)
      .maybeSingle()

    let stablePolarCustomerId = membership?.polar_customer_id || profile?.polar_customer_id || null

    // If local state is stale, recover an active customer for this email first.
    // This prevents Polar from creating a fresh customer every time checkout runs.
    if (userEmail) {
      const recovered = await recoverPolarCustomerWithActiveSubscription(event, userId, userEmail, stablePolarCustomerId)
      if (recovered?.customer?.id) stablePolarCustomerId = recovered.customer.id
    }

    // Ensure every authenticated checkout has a stable customerId. Passing only
    // customerEmail lets Polar create duplicate customer records.
    if (!stablePolarCustomerId && userEmail) {
      const customer = await syncUserToPolar(event, userId, userEmail, profile?.full_name)
      stablePolarCustomerId = customer?.id || null
    }

    if (membership?.polar_subscription_id) {
      console.log(`[Polar Checkout] User ${userId} has active sub ${membership.polar_subscription_id}. Generating upgrade checkout for overlay...`)
      
      try {
        const checkoutPayload: any = {
          products: [productId],
          successUrl: `${config.public.siteUrl}/dashboard/settings/billing?success=true`,
          customerId: stablePolarCustomerId || membership.polar_customer_id,
          customerMetadata: { 
            supabase_user_id: userId,
            subscription_id: membership.polar_subscription_id,
            source: 'checkout_endpoint_overlay'
          },
        }

        const checkout = await polar.checkouts.create(checkoutPayload)
        return { url: checkout.url }
      } catch (updateErr: any) {
        console.error('[Polar Checkout] Upgrade checkout failed:', updateErr.message)
        // Fallback to fresh checkout below if upgrade checkout fails
      }
    }

    const checkoutPayload: Record<string, any> = {
      products: [productId],
      successUrl: `${siteUrl}/dashboard/billing/success`,
      cancelUrl: `${siteUrl}/dashboard/billing/cancel`,
      customerMetadata: {
        supabase_user_id: userId,
      },
    }

    if (stablePolarCustomerId) {
      checkoutPayload.customerId = stablePolarCustomerId
    } else if (userEmail) {
      // Fallback only. Normal authenticated checkouts should use customerId.
      checkoutPayload.customerEmail = userEmail
    }

    const checkout = await polar.checkouts.create(checkoutPayload)
    return { url: checkout.url }
  } catch (err: any) {
    const safeMessage = getSafeBillingErrorMessage(err)
    console.error('[Polar Checkout Error]', err?.message || err)
    if (err.response) {
      console.error('Polar response:', err.response.status, JSON.stringify(err.response.data))
    }

    if (err.message?.includes('AlreadyActiveSubscriptionError') || (err.response?.data?.error === 'AlreadyActiveSubscriptionError')) {
      throw createError({ statusCode: 409, statusMessage: safeMessage, message: safeMessage })
    }

    if (err.statusCode && err.statusCode < 500) throw err
    throw createError({ statusCode: 500, statusMessage: safeMessage, message: safeMessage })
  }
})
