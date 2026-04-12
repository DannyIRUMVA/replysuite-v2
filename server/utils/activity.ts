import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'

/**
 * Tracks user activity by logging to the user_activity table.
 * Uses Service Role to bypass RLS, ensuring critical logs are always saved.
 */
export async function trackActivity(
  event: H3Event,
  {
    userId,
    type,
    source,
    meta = {}
  }: {
    userId?: string | null
    type: string
    source?: string
    meta?: any
  }
) {
  try {
    const client = serverSupabaseServiceRole(event)
    
    // Auto-detect userId from session if not provided
    let finalUserId = userId
    if (!finalUserId) {
        const user = event.context.user
        finalUserId = user?.id
    }

    const { error } = await client
      .from('user_activity')
      .insert({
        user_id: finalUserId,
        type,
        source: source || event.path,
        meta: {
          ...meta,
          ip: event.node.req.headers['x-forwarded-for'] || event.node.req.socket.remoteAddress,
          ua: event.node.req.headers['user-agent']
        }
      })

    if (error) {
      console.error('[ActivityTracker] Error:', error)
    }

    return { success: !error }
  } catch (err) {
    console.error('[ActivityTracker] Critical Failure:', err)
    return { success: false }
  }
}
