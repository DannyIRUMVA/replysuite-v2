import { serverSupabaseClient, serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { syncUserToPolar } from '~~/server/utils/polar'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  const client = await serverSupabaseClient(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const userId = (user as any)?.id || (user as any)?.sub
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid user session structure'
    })
  }

  // 1. Sync to Polar (Monitoring requirement)
  let polarCustomerId: string | undefined
  try {
    const profile = await client
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()

    const customer = await syncUserToPolar(userId, user.email || 'unknown@user.com', profile.data?.full_name)
    if (customer) {
       polarCustomerId = customer.id
    }
  } catch (error) {
    console.error('[Onboard-Free] Polar Sync Error:', error)
    // We continue even if polar sync fails, to not block the user
  }

  // 2. Get the Starter plan ID
  const { data: plan, error: planError } = await client
    .from('plans')
    .select('id')
    .eq('internal_slug', 'starter')
    .single()

  if (planError || !plan) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Free plan configuration not found'
    })
  }

  // 3. Create membership (Service Role required to bypass RLS)
  const adminClient = serverSupabaseServiceRole(event)
  const upsertData: any = {
      user_id: userId,
      plan_id: plan.id,
      is_active: true
  }
  
  if (polarCustomerId) {
      upsertData.polar_customer_id = polarCustomerId
  }

  const { error: membershipError } = await adminClient
    .from('user_memberships')
    .upsert(upsertData)

  if (membershipError) {
     console.error('[Onboard-Free] Membership Error:', membershipError)
     throw createError({
      statusCode: 500,
      statusMessage: 'Failed to activate free plan'
    })
  }

  return { 
    success: true,
    message: 'Free plan activated successfully'
  }
})
