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

    // ── Step 0: Check Local DB for Existing Polar IDs ──
    const adminClient = serverSupabaseServiceRole(event)
    const { data: localMembership } = await adminClient
        .from('user_memberships')
        .select('polar_subscription_id, polar_customer_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()

    let activeSubscription: any = null
    let polarCustomerId: string | undefined = localMembership?.polar_customer_id

    // ── Step 1: Exhaustive Active Subscription Detection ──
    console.log(`[Polar Upgrade] Starting exhaustive sub search for user: ${userId} (${userEmail})`)

    // 1.0 Try local subscription ID first
    if (localMembership?.polar_subscription_id) {
        try {
            console.log(`[Polar Upgrade] Found local sub ID: ${localMembership.polar_subscription_id}. Verifying with Polar...`)
            const sub = await polar.subscriptions.get(localMembership.polar_subscription_id)
            if (sub && sub.status !== 'canceled') {
                activeSubscription = sub
                console.log(`[Polar Upgrade] Local sub ID is valid and active.`)
            }
        } catch (e) {
            console.warn('[Polar Upgrade] Local sub ID verification failed.')
        }
    }

    // 1.1 Try Customer Lookup via External ID if nothing found locally
    if (!activeSubscription) {
        try {
            const customers = await polar.customers.list({ query: userId })
            const customer = customers.result?.items?.[0]
            if (customer) {
                polarCustomerId = customer.id
                const subs = await polar.subscriptions.list({ customerId: customer.id })
                activeSubscription = subs.result?.items?.find(s => ['active', 'trialing', 'past_due'].includes(s.status))
                if (activeSubscription) {
                    console.log(`[Polar Upgrade] Found active sub via customer lookup: ${activeSubscription.id}`)
                }
            }
        } catch (e) {
            console.log('[Polar Upgrade] Customer lookup failed or not found.')
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

    // Ensure we have a Polar Customer ID before proceeding
    if (!polarCustomerId) {
        console.log(`[Polar Upgrade] No customer ID found. Forcing polar checkout with starter product.`)
        // Fetch the starter product ID to force them to onboard via Polar
        const { data: starterPlan } = await adminClient
            .from('plans')
            .select('polar_product_id')
            .eq('internal_slug', 'starter')
            .single()
            
        if (starterPlan?.polar_product_id) {
            console.log(`[Polar Upgrade] Diverting to starter product: ${starterPlan.polar_product_id}`)
            const checkoutPayload: any = {
                products: [starterPlan.polar_product_id],
                successUrl: `${siteUrl}/dashboard/settings/billing?success=true`,
                customerEmail: userEmail,
                customerMetadata: { 
                    supabase_user_id: userId,
                    source: 'upgrade_endpoint_forced_starter'
                },
            }
            const checkout = await polar.checkouts.create(checkoutPayload)
            return { url: checkout.url }
        } else {
            throw createError({ statusCode: 500, message: 'Free plan misconfigured. Cannot onboard.' })
        }
    }

    // 2.1 Direct Update (Existing Subscription)
    if (activeSubscription) {
      // Logic for syncing local DB if it was out of sync
      if (activeSubscription.productId === productId) {
        console.log(`[Polar Upgrade] User already has this product on Polar. Syncing local DB and returning early.`)
        await syncLocalMembership(adminClient, userId, activeSubscription.productId, activeSubscription.id, polarCustomerId)
        return { 
          upgraded: true, 
          message: 'Your plan is already active!',
          subscriptionId: activeSubscription.id 
        }
      }

      console.log(`[Polar Upgrade] Generating upgrade checkout for: ${activeSubscription.id} -> ${productId}`)
      try {
        const checkoutPayload: any = {
          products: [productId],
          successUrl: `${siteUrl}/dashboard/settings/billing?success=true`,
          customerId: polarCustomerId,
          customerMetadata: { 
            supabase_user_id: userId,
            subscription_id: activeSubscription.id,
            source: 'upgrade_endpoint_overlay'
          },
        }

        const checkout = await polar.checkouts.create(checkoutPayload)
        return { url: checkout.url }
      } catch (updateErr: any) {
          console.error('[Polar Upgrade] Upgrade checkout failed:', updateErr.message)
          // Fallback to fresh checkout below
      }
    }

    // 2.2 Create Fresh Checkout Session
    console.log(`[Polar Upgrade] No active sub found. Diverting to checkout for: ${productId}`)
    
    // Ensure we ALWAYS link to the Supabase ID during checkout
    const checkoutPayload: any = {
      products: [productId],
      successUrl: `${siteUrl}/dashboard/settings/billing?success=true`,
      customerExternalId: userId,
      customerMetadata: { 
          supabase_user_id: userId,
          source: 'upgrade_endpoint_v3'
      },
    }

    // Force linking to the existing Polar Customer ID created at registration/sync
    if (polarCustomerId) {
        checkoutPayload.customerId = polarCustomerId
    } else {
        // This should theoretically not happen anymore due to the sync check above
        checkoutPayload.customerEmail = userEmail
    }

    try {
        const checkout = await polar.checkouts.create(checkoutPayload)
        console.log(`[Polar Upgrade] Checkout generated: ${checkout.url}`)
        return { url: checkout.url }
    } catch (checkoutErr: any) {
        // Detailed check for Polar specific error
        const isAlreadyActive = 
            checkoutErr.error === 'AlreadyActiveSubscriptionError' || 
            checkoutErr.detail?.includes('AlreadyActiveSubscriptionError') ||
            JSON.stringify(checkoutErr).includes('AlreadyActiveSubscriptionError')

        if (isAlreadyActive) {
            console.log(`[Polar Upgrade] Polar reported AlreadyActiveSubscriptionError. performing emergency sync for ${userEmail}...`)
            
            // Try to find the culprit subscription
            const customers = await polar.customers.list({ email: userEmail })
            for (const customer of (customers.result?.items || [])) {
                const subs = await polar.subscriptions.list({ customerId: customer.id })
                const active = subs.result?.items?.find(s => s.status !== 'canceled')
                
                if (active) {
                    console.log(`[Polar Upgrade] Found conflicting sub ${active.id} for product ${active.productId}`)
                    await syncLocalMembership(adminClient, userId, active.productId, active.id, customer.id)
                    
                    return { 
                        upgraded: true, 
                        message: 'You already have an active subscription! We have synced your records.',
                        subscriptionId: active.id 
                    }
                }
            }
        }
        
        console.error('[Polar Upgrade] Checkout creation failed:', checkoutErr)
        throw checkoutErr
    }

  } catch (err: any) {
    const errorMessage = err.message || err.detail || 'Internal server error'
    console.error('[Polar Upgrade Error]', errorMessage)
    
    throw createError({ 
        statusCode: err.statusCode || 500, 
        statusMessage: errorMessage,
        message: 'Failed to process upgrade'
    })
  }
})

/**
 * Helper to sync local user_memberships with Polar product
 */
async function syncLocalMembership(supabase: any, userId: string, productId: string, subId?: string, custId?: string) {
    try {
        const { data: plan } = await supabase
          .from('plans')
          .select('id')
          .eq('polar_product_id', productId)
          .maybeSingle()

        if (plan) {
          await supabase
            .from('user_memberships')
            .upsert({ 
                user_id: userId,
                plan_id: plan.id, 
                is_active: true, 
                starts_at: new Date().toISOString(),
                polar_subscription_id: subId,
                polar_customer_id: custId
            }, { onConflict: 'user_id' })
          console.log(`[Polar Upgrade] Local membership synced for plan: ${plan.id}`)
        }
    } catch (e) {
        console.warn('[Polar Upgrade] syncLocalMembership failed:', e)
    }
}

