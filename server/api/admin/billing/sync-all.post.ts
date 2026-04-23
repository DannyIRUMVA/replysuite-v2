import { serverSupabaseServiceRole } from '#supabase/server'
import { syncUserToPolar } from '~~/server/utils/polar'

export default defineEventHandler(async (event) => {
  const adminClient = serverSupabaseServiceRole(event)

  // 1. Fetch all profiles that don't have a polar_customer_id
  const { data: profiles, error } = await adminClient
    .from('profiles')
    .select('id, contact_email')
    .is('polar_customer_id', null)

  if (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch profiles: ' + error.message
    })
  }

  console.log(`[Admin Sync] Found ${profiles?.length || 0} users to sync to Polar.`)

  const results = {
    total: profiles?.length || 0,
    synced: 0,
    failed: 0,
    errors: [] as string[]
  }

  if (!profiles || profiles.length === 0) {
    return { success: true, ...results }
  }

  // 2. Sync each user
  for (const profile of profiles) {
    try {
      // If we have contact_email in profile, use it. 
      // Otherwise fallback to Supabase Auth (but profile should have it)
      let email = profile.contact_email
      
      if (!email) {
        const { data: authUser } = await adminClient.auth.admin.getUserById(profile.id)
        email = authUser.user?.email
      }

      if (email) {
        const customer = await syncUserToPolar(event, profile.id, email)
        if (customer) {
          results.synced++
        } else {
          results.failed++
          results.errors.push(`Failed to sync user ${profile.id}: Polar returned null`)
        }
      } else {
        results.failed++
        results.errors.push(`No email found for user ${profile.id}`)
      }
    } catch (err: any) {
      console.error(`[Admin Sync] Error syncing user ${profile.id}:`, err.message)
      results.failed++
      results.errors.push(`${profile.id}: ${err.message}`)
    }
  }

  return {
    success: results.failed === 0,
    ...results
  }
})
