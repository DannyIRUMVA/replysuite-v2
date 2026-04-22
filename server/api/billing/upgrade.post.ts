import { Polar } from '@polar-sh/sdk'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

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

    const user = await serverSupabaseUser(event)
    const userEmail = user?.email

    const polar = new Polar({
      accessToken: polarAccessToken,
      server: (polarServer?.toLowerCase() as any) || 'sandbox',
    })

    // ── Step 1: Exhaustive Active Subscription Detection ──
    let activeSubscription: any = null
    let polarCustomerId: string | undefined

    console.log(`[Polar Upgrade] Starting exhaustive sub search for user: ${userId} (${userEmail})`)

    // 1.1 Try Customer State API (The Gold Standard)
    try {
      const state = await polar.customers.getExternalState({ externalId: userId })
      if (state) {
        polarCustomerId = state.customer.id
        activeSubscription = state.activeSubscriptions?.[0]
        if (activeSubscription) {
          console.log(`[Polar Upgrade] Found active sub via ExternalState: ${activeSubscription.id}`)
        }
      }
    } catch (e) {
      console.log('[Polar Upgrade] ExternalState lookup failed or not found.')
    }

    // 1.2 Try Email Fallback if nothing found yet
    if (!activeSubscription && userEmail) {
      try {
        const customers = await polar.customers.list({ email: userEmail })
        const customerItems = customers.result?.items || []
        
        for (const customer of customerItems) {
            if (!polarCustomerId) polarCustomerId = customer.id
            
            const subs = await polar.subscriptions.list({ customerId: customer.id })
            const activeSub = subs.result?.items?.find(s => s.status !== 'canceled')
            
            if (activeSub) {
                activeSubscription = activeSub
                polarCustomerId = customer.id
                console.log(`[Polar Upgrade] Found active sub via email search: ${activeSubscription.id} (Customer: ${polarCustomerId})`)
                break;
            }
        }
      } catch (e: any) {
        console.warn('[Polar Upgrade] Email search failed:', e.message)
      }
    }

    // 1.3 Safeguard: Check if they are already on THIS product
    if (activeSubscription && activeSubscription.productId === productId) {
        console.log(`[Polar Upgrade] User already has product ${productId}. Skipping...`)
        return { 
          upgraded: true, 
          message: 'You are already subscribed to this plan!',
          subscriptionId: activeSubscription.id 
        }
    }

    // ── Step 2: Transition Logic ──

    // 2.1 Direct Update (Existing Subscription)
    if (activeSubscription) {
      console.log(`[Polar Upgrade] Transitioning existing sub ${activeSubscription.id} to ${productId}`)
      try {
        const updated = await polar.subscriptions.update(activeSubscription.id, {
          productId,
        })
        
        // Sync local DB (Best effort)
        try {
            const adminClient = serverSupabaseServiceRole(event)
            const { data: plan } = await adminClient
              .from('plans')
              .select('id')
              .eq('polar_product_id', productId)
              .single()

            if (plan) {
              await adminClient
                .from('user_memberships')
                .upsert({ 
                    user_id: userId,
                    plan_id: plan.id, 
                    is_active: true, 
                    starts_at: new Date().toISOString(),
                    polar_subscription_id: updated.id,
                    polar_customer_id: polarCustomerId
                }, { onConflict: 'user_id' })
            }
        } catch (dbErr) {
            console.warn('[Polar Upgrade] Local DB sync failed (non-critical):', dbErr)
        }

        return { 
          upgraded: true, 
          message: 'Plan successfully updated!',
          subscriptionId: updated.id 
        }
      } catch (updateErr: any) {
          console.error('[Polar Upgrade] Direct update failed:', updateErr.message)
          // If direct update fails, we might need a checkout (some status transitions require it)
      }
    }

    // 2.2 Create Fresh Checkout Session
    console.log(`[Polar Upgrade] Creating checkout session for product: ${productId}`)
    
    // Ensure we ALWAYS link to the Supabase ID during checkout
    const checkoutPayload: any = {
      products: [productId],
      successUrl: `${siteUrl}/dashboard/settings/billing?success=true`,
      customerExternalId: userId,
      customerMetadata: { 
          supabase_user_id: userId,
          source: 'upgrade_endpoint'
      },
    }

    // If we found a Polar customer ID via email, reuse it to avoid duplicate customers
    if (polarCustomerId) {
        checkoutPayload.customerId = polarCustomerId
    } else if (userEmail) {
        checkoutPayload.customerEmail = userEmail
    }

    const checkout = await polar.checkouts.create(checkoutPayload)
    console.log(`[Polar Upgrade] Checkout created: ${checkout.url}`)
    
    return { url: checkout.url }

  } catch (err: any) {
    console.error('[Polar Upgrade Error]', err.message)
    throw createError({ statusCode: 500, message: 'Failed to process upgrade request.' })
  }
})

