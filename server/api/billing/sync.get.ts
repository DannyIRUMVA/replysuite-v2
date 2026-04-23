import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { syncUserToPolar, syncUserSubscriptions } from '~~/server/utils/polar'

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
  const result = await syncUserSubscriptions(event, userId, polarId)

  return {
    success: true,
    synced: true,
    hasActiveSubscription: result.hasActive,
    plan: result.plan,
    polarSubscription: result.subscription
  }
})
