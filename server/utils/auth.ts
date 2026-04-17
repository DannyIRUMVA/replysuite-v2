import { H3Event, createError, getHeaders } from 'h3'
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { getUserSubscriptionLimits, SubscriptionLimits } from './subscription'

export interface AuthContext {
  userId: string
  membership: any | null
  limits: SubscriptionLimits
}

/**
 * Centralized server-side authentication and subscription context retrieval.
 * Handles 'undefined' ID filtering and fallback plan logic.
 * @param event - H3Event from the handler
 * @param required - If true, throws 401 if no valid user is found
 */
export async function getAuthContext(event: H3Event, required = true): Promise<AuthContext | null> {
  const headers = getHeaders(event)
  let user = await serverSupabaseUser(event)
  
  // Fallback: If no user from cookie, but auth header exists, the client might be using Bearer token
  if (!user && headers.authorization) {
    try {
      const client = await serverSupabaseClient(event)
      const { data } = await client.auth.getUser(headers.authorization)
      user = data.user
    } catch (e) {
      console.error('[getAuthContext] Auth header fallback failed', e)
    }
  }

  const userId = (user as any)?.id || (user as any)?.sub

  // 1. Validate User ID
  if (!userId || userId === 'undefined') {
    if (required) {
      console.error('[getAuthContext] Unauthorized: userId is missing/invalid', { 
        userId, 
        path: event.path,
        hasCookie: !!headers.cookie 
      })
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized: Session missing or invalid'
      })
    }
    return null
  }

  // 2. Fetch Membership & Limits
  // We reuse the existing logic in subscription.ts but ensure it's called with the sanitized ID
  const limits = await getUserSubscriptionLimits(event, userId)
  
  // To optimize, we could fetch membership here too if needed, 
  // but getUserSubscriptionLimits already handles fallback.
  // For extra context, we fetch the actual membership record.
  const client = await serverSupabaseClient(event)
  const { data: membership } = await client
    .from('user_memberships')
    .select('*, plans(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  return {
    userId,
    membership,
    limits
  }
}

/**
 * Lightweight helper to just get the validated User ID.
 */
export async function getAuthenticatedUserId(event: H3Event, required = true): Promise<string | null> {
  const context = await getAuthContext(event, required)
  return context?.userId || null
}
