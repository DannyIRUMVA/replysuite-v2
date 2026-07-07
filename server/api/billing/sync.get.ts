import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { recoverPolarCustomerWithActiveSubscription, syncUserToPolar, syncUserSubscriptions } from '~~/server/utils/polar'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const client = await serverSupabaseClient(event)
  const userId = (user as any).id || (user as any).sub

  // 1. Get current profile to check for polar_customer_id
  let { data: profile } = await client
    .from('profiles')
    .select('polar_customer_id, full_name, contact_email')
    .eq('id', userId)
    .single()

  let polarId = profile?.polar_customer_id

  // 2. If no Polar ID, try to sync/create now
  if (!polarId) {
    const customer = await syncUserToPolar(event, userId, user.email!, profile?.full_name)
    if (customer) {
      polarId = customer.id
    }
  }

  if (!polarId) {
    return {
      success: false,
      message: 'Could not establish Polar identity.',
      subscription: null
    }
  }

  // 3. Use core utility to reconcile
  let result = await syncUserSubscriptions(event, userId, polarId)

  if ((result as any).unavailable) {
    return {
      success: true,
      synced: false,
      billingProviderAvailable: false,
      hasActiveSubscription: false,
      preservedLocalMembership: true,
      message: 'Card billing sync is temporarily unavailable. Local membership records were preserved.',
      plan: null,
      polarSubscription: null
    }
  }

  // If the stored customer has no active subscription, Polar checkout may have
  // created a newer customer for the same email. Recover that customer and run
  // reconciliation again so the dashboard shows the active plan immediately.
  if (!result.hasActive && user.email) {
    const recovered = await recoverPolarCustomerWithActiveSubscription(event, userId, user.email, polarId)
    if ((recovered as any)?.unavailable) {
      return {
        success: true,
        synced: false,
        billingProviderAvailable: false,
        hasActiveSubscription: false,
        preservedLocalMembership: true,
        message: 'Card billing sync is temporarily unavailable. Local membership records were preserved.',
        plan: null,
        polarSubscription: null
      }
    }

    if (recovered?.customer?.id) {
      polarId = recovered.customer.id
      result = await syncUserSubscriptions(event, userId, polarId)
    }
  }

  return {
    success: true,
    synced: true,
    hasActiveSubscription: result.hasActive,
    plan: result.plan,
    polarSubscription: result.subscription
  }
})
