import { Polar } from '@polar-sh/sdk'
import { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * Ensures a user is synced as a customer in Polar.sh.
 * Uses the Supabase User ID as the external_id for reliable mapping.
 */
export async function syncUserToPolar(event: H3Event, userId: string, email: string, name?: string) {
  const config = useRuntimeConfig()
  const polarAccessToken = config.polarAccessToken
  const polarServer = config.polarServer

  if (!polarAccessToken) {
    console.error('[Polar Sync] Missing POLAR_ACCESS_TOKEN. Skipping sync.')
    return null
  }

  const polar = new Polar({
    accessToken: polarAccessToken,
    server: (polarServer?.toLowerCase() as any) || 'sandbox'
  })

  try {
    // Validation guard: Polar metadata and external_id MUST be strings.
    if (!userId || userId === 'undefined') {
       console.warn(`[Polar Sync] Aborting sync: userId is invalid (${userId}) for ${email}`)
       return null
    }

    const safeUserId = String(userId)
    
    console.log(`[Polar Sync] Syncing user ${safeUserId} (${email})...`)

    let customer: any

    // 1. Try to find the customer by externalId first
    const existingByExternal = await polar.customers.list({ externalId: safeUserId })
    if (existingByExternal.result?.items?.[0]) {
      console.log(`[Polar Sync] User ${safeUserId} already mapped in Polar: ${existingByExternal.result.items[0].id}`)
      customer = existingByExternal.result.items[0]
    } else {
      // 2. Try to find the customer by email (to avoid 409 and link existing)
      const existingByEmail = await polar.customers.list({ email })
      if (existingByEmail.result?.items?.[0]) {
        customer = existingByEmail.result.items[0]
        console.log(`[Polar Sync] Found existing customer by email ${email}: ${customer.id}. Linking externalId...`)
        
        // Update them with our externalId
        customer = await polar.customers.update(customer.id, {
          externalId: safeUserId,
          metadata: {
            ...customer.metadata,
            supabase_user_id: safeUserId
          }
        })
      } else {
        // 3. Create fresh if not found
        customer = await polar.customers.create({
          email,
          externalId: safeUserId,
          name: name || email.split('@')[0],
          metadata: {
            supabase_user_id: safeUserId,
            source: 'replysuite_v2_auto_sync'
          }
        })
        console.log(`[Polar Sync] Successfully created new customer: ${customer.id}`)
      }
    }

    // 4. Critically: Persist the ID to our local DB
    // We update both Profiles and User Memberships for maximum reach
    const serviceClient = serverSupabaseServiceRole(event)
    
    await Promise.all([
      serviceClient.from('profiles').update({ polar_customer_id: customer.id }).eq('id', safeUserId),
      serviceClient.from('user_memberships').update({ polar_customer_id: customer.id }).eq('user_id', safeUserId)
    ])
    
    console.log(`[Polar Sync] Persisted ${customer.id} to local DB for user ${safeUserId}`)

    return customer
  } catch (err: any) {
    console.error('[Polar Sync] Error syncing user to Polar:', err.message)
    return null
  }
}

/**
 * Fetches the raw subscription data from Polar for a specific user.
 * This is the ultimate source of truth.
 */
export async function getPolarSubscriptionStatus(polarCustomerId: string) {
  const config = useRuntimeConfig()
  const polarAccessToken = config.polarAccessToken
  const polarServer = config.polarServer

  if (!polarAccessToken || !polarCustomerId) return null

  const polar = new Polar({
    accessToken: polarAccessToken,
    server: (polarServer?.toLowerCase() as any) || 'sandbox'
  })

  try {
    console.log(`[Polar API] Listing subscriptions for customer ${polarCustomerId}...`)
    const subscriptions = await polar.subscriptions.list({
      customerId: polarCustomerId,
      // We don't filter by 'active: true' here so we can see all states
    })

    const items = subscriptions.result?.items || []
    console.log(`[Polar API] Found ${items.length} total subscriptions for customer.`)
    
    if (items.length === 0) return null

    // Filter for "good enough" states: active, trialing, past_due
    const validSubs = items.filter((s: any) => 
      ['active', 'trialing', 'past_due'].includes(s.status)
    )

    console.log(`[Polar API] Found ${validSubs.length} valid (active/trialing/past_due) subscriptions.`)

    if (validSubs.length === 0) return null

    // Sort by startedAt descending to get the most recent one
    const sorted = [...validSubs].sort((a: any, b: any) => 
      new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime()
    )
    
    return sorted[0]
  } catch (err) {
    console.error('[Polar API] Error fetching subscription status:', err)
    return null
  }
}

/**
 * Creates a Customer Portal session for the user to manage their subscription.
 */
export async function createCustomerPortalSession(polarCustomerId: string) {
  const config = useRuntimeConfig()
  const polarAccessToken = config.polarAccessToken
  const polarServer = config.polarServer

  if (!polarAccessToken || !polarCustomerId) return null

  const polar = new Polar({
    accessToken: polarAccessToken,
    server: (polarServer?.toLowerCase() as any) || 'sandbox'
  })

  try {
    const session = await polar.customerSessions.create({
      customerId: polarCustomerId,
    })
    return (session as any).customerPortalUrl
  } catch (err) {
    console.error('[Polar API] Error creating portal session:', err)
    return null
  }
}

/**
 * Reconciles a user's Polar subscriptions with the local database.
 * This is the source of truth for "Active" vs "Current" plans.
 */
export async function syncUserSubscriptions(event: any, userId: string, polarId: string) {
  const { serverSupabaseServiceRole } = await import('#supabase/server')
  const adminClient = serverSupabaseServiceRole(event)

  console.log(`[Polar Sync] Reconciling subscriptions for user ${userId} (Polar: ${polarId})...`)
  
  // 1. Fetch status directly from Polar
  const polarSub = await getPolarSubscriptionStatus(polarId)
  
  if (!polarSub) {
    console.log(`[Polar Sync] No active subscription found for ${polarId}. Deactivating local records...`)
    await adminClient
      .from('user_memberships')
      .update({ is_active: false })
      .eq('user_id', userId)
    return { hasActive: false }
  }

  // 2. Map Polar product to our local plans
  const { data: plan } = await adminClient
    .from('plans')
    .select('id, internal_slug')
    .or(`polar_product_id.eq.${polarSub.productId},polar_price_id.eq.${polarSub.priceId}`)
    .maybeSingle()

  if (plan) {
    // 3. Update local DB
    // Deactivate old
    await adminClient
      .from('user_memberships')
      .update({ is_active: false })
      .eq('user_id', userId)

    // Insert new active
    // polarSub.currentPeriodEnd is the most reliable for 'ends_at'
    const endsAt = polarSub.currentPeriodEnd || polarSub.endsAt || null

    await adminClient
      .from('user_memberships')
      .insert({
        user_id: userId,
        plan_id: plan.id,
        polar_customer_id: polarId,
        polar_subscription_id: polarSub.id,
        is_active: true,
        starts_at: polarSub.startedAt || new Date().toISOString(),
        ends_at: endsAt
      })
    
    console.log(`[Polar Sync] Successfully mapped user ${userId} to plan ${plan.internal_slug}. Expiry: ${endsAt}`)
    return { 
      hasActive: true, 
      plan: plan.internal_slug, 
      planName: plan.display_name || plan.name,
      subscription: polarSub 
    }
  } else {
    console.warn(`[Polar Sync] Polar product ${polarSub.productId} not found in local plans table.`)
    return { hasActive: true, plan: 'custom', subscription: polarSub }
  }
}

/**
 * Updates an existing subscription to a new product.
 * Triggers immediate proration invoicing.
 */
export async function updatePolarSubscription(subscriptionId: string, productId: string) {
  const config = useRuntimeConfig()
  const polarAccessToken = config.polarAccessToken
  const polarServer = config.polarServer

  if (!polarAccessToken || !subscriptionId) return null

  const polar = new Polar({
    accessToken: polarAccessToken,
    server: (polarServer?.toLowerCase() as any) || 'sandbox'
  })

  try {
    console.log(`[Polar API] Updating subscription ${subscriptionId} to product ${productId}...`)
    const result = await polar.subscriptions.update(subscriptionId, {
      productId: productId,
      prorationBehavior: 'invoice' // Invoice the difference immediately
    })
    return result
  } catch (err: any) {
    console.error('[Polar API] Error updating subscription:', err.message)
    throw err
  }
}
