import { Polar } from '@polar-sh/sdk'
import { H3Event } from 'h3'

/**
 * Ensures a user is synced as a customer in Polar.sh.
 * Uses the Supabase User ID as the external_id for reliable mapping.
 */
export async function syncUserToPolar(userId: string, email: string, name?: string) {
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

    // We use external_id as the primary mapping key.
    const customer = await polar.customers.create({
      email,
      externalId: safeUserId,
      name: name || email.split('@')[0],
      metadata: {
        supabase_user_id: safeUserId,
        source: 'replysuite_v2_auto_sync'
      }
    })

    console.log(`[Polar Sync] Successfully synced/created customer: ${customer.id}`)
    return customer
  } catch (err: any) {
    // If customer already exists with this external_id, we might get a 409 or similar.
    // In that case, we can try to find and update, but for "monitoring" purposes, 
    // the initial creation is usually enough.
    if (err.status === 409 || (err.message && err.message.includes('exists'))) {
       console.log(`[Polar Sync] User ${userId} already exists in Polar.`)
       return null
    }

    console.error('[Polar Sync] Error syncing user to Polar:', err.message)
    return null
  }
}
