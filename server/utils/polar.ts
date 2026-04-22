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

    // 1. Try to find the customer by externalId first
    const existingByExternal = await polar.customers.list({ externalId: safeUserId })
    if (existingByExternal.result?.items?.[0]) {
      console.log(`[Polar Sync] User ${safeUserId} already mapped in Polar: ${existingByExternal.result.items[0].id}`)
      return existingByExternal.result.items[0]
    }

    // 2. Try to find the customer by email (to avoid 409 and link existing)
    const existingByEmail = await polar.customers.list({ email })
    if (existingByEmail.result?.items?.[0]) {
      const customer = existingByEmail.result.items[0]
      console.log(`[Polar Sync] Found existing customer by email ${email}: ${customer.id}. Linking externalId...`)
      
      // Update them with our externalId
      const updated = await polar.customers.update(customer.id, {
        externalId: safeUserId,
        metadata: {
          ...customer.metadata,
          supabase_user_id: safeUserId
        }
      })
      return updated
    }

    // 3. Create fresh if not found
    const customer = await polar.customers.create({
      email,
      externalId: safeUserId,
      name: name || email.split('@')[0],
      metadata: {
        supabase_user_id: safeUserId,
        source: 'replysuite_v2_auto_sync'
      }
    })

    console.log(`[Polar Sync] Successfully created new customer: ${customer.id}`)
    return customer
  } catch (err: any) {
    console.error('[Polar Sync] Error syncing user to Polar:', err.message)
    return null
  }
}
