import { Polar } from '@polar-sh/sdk'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

/**
 * Exhaustive sync endpoint to align local DB with Polar state.
 * Useful when users report 'Already Subscribed' errors during upgrade.
 */
export default defineEventHandler(async (event) => {
  try {
    const { userId } = await getAuthContext(event)
    const user = await serverSupabaseUser(event)
    const userEmail = user?.email

    const config = useRuntimeConfig()
    const polarAccessToken = config.polarAccessToken
    const polarServer = config.polarServer

    const polar = new Polar({
      accessToken: polarAccessToken,
      server: (polarServer?.toLowerCase() as any) || 'sandbox',
    })

    console.log(`[Polar Sync] Manual sync triggered for ${userId} (${userEmail})`)

    let foundSubscription: any = null
    let polarCustomerId: string | undefined

    // 1. Search by External ID
    try {
      const state = await polar.customers.getExternalState({ externalId: userId })
      if (state) {
        polarCustomerId = state.customer.id
        foundSubscription = state.activeSubscriptions?.[0]
      }
    } catch (e) {}

    // 2. Search by Email Fallback
    if (!foundSubscription && userEmail) {
      const customers = await polar.customers.list({ email: userEmail })
      for (const customer of (customers.result?.items || [])) {
        if (!polarCustomerId) polarCustomerId = customer.id
        const subs = await polar.subscriptions.list({ customerId: customer.id })
        const active = subs.result?.items?.find(s => s.status !== 'canceled')
        if (active) {
          foundSubscription = active
          polarCustomerId = customer.id
          break
        }
      }
    }

    if (!foundSubscription) {
      return { success: true, message: 'No active Polar subscription found. Internal plan remains unchanged.' }
    }

    // 3. Update local DB
    const adminClient = serverSupabaseServiceRole(event)
    const { data: plan } = await adminClient
      .from('plans')
      .select('id, name')
      .eq('polar_product_id', foundSubscription.productId)
      .maybeSingle()

    if (plan) {
      await adminClient
        .from('user_memberships')
        .upsert({
          user_id: userId,
          plan_id: plan.id,
          is_active: true,
          polar_subscription_id: foundSubscription.id,
          polar_customer_id: polarCustomerId,
          starts_at: foundSubscription.startedAt || new Date().toISOString()
        }, { onConflict: 'user_id' })

      return { success: true, message: `Synced! You are currently on the ${plan.name} plan.` }
    }

    return { success: false, message: 'Polar subscription found but no matching local plan configuration exists.' }

  } catch (err: any) {
    console.error('[Polar Sync Error]', err.message)
    throw createError({ statusCode: 500, message: 'Failed to sync. Please try again later.' })
  }
})
