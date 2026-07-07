import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

const getMetaRoute = (meta: any, fallback?: string | null) => String(meta?.entered_route || meta?.route || fallback || 'unknown')
const getMetaDuration = (meta: any) => {
  const duration = Number(meta?.duration_ms || 0)
  return Number.isFinite(duration) && duration > 0 ? duration : 0
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  const userId = (user as any)?.id || (user as any)?.sub

  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const query = getQuery(event)
  const limitQuery = Number(query.limit || 200)
  const limit = Number.isFinite(limitQuery) ? Math.min(Math.max(limitQuery, 25), 500) : 200
  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('user_activity')
    .select('id, type, source, meta, created_at')
    .eq('user_id', userId)
    .in('type', ['journey_possible_stuck', 'journey_route_dwell', 'journey_still_here', 'onboarding_error', 'onboarding_step_view'])
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[ActivityStuck] Failed to load journey activity:', error)
    throw createError({ statusCode: 500, statusMessage: 'Unable to load journey activity' })
  }

  const routes = new Map<string, any>()
  const onboarding = new Map<string, any>()

  for (const row of data || []) {
    const meta = (row as any).meta || {}
    const route = getMetaRoute(meta, (row as any).source)
    const duration = getMetaDuration(meta)

    if (!routes.has(route)) {
      routes.set(route, {
        route,
        stuck_events: 0,
        dwell_events: 0,
        heartbeat_events: 0,
        total_duration_ms: 0,
        max_duration_ms: 0,
        last_seen_at: (row as any).created_at,
      })
    }

    const bucket = routes.get(route)
    if ((row as any).type === 'journey_possible_stuck') bucket.stuck_events += 1
    if ((row as any).type === 'journey_route_dwell') bucket.dwell_events += 1
    if ((row as any).type === 'journey_still_here') bucket.heartbeat_events += 1
    bucket.total_duration_ms += duration
    bucket.max_duration_ms = Math.max(bucket.max_duration_ms, duration)

    if (String((row as any).type).startsWith('onboarding_')) {
      const step = String(meta?.viewed_step || meta?.step || meta?.completed_step || 'unknown')
      if (!onboarding.has(step)) {
        onboarding.set(step, { step, views: 0, errors: 0, last_seen_at: (row as any).created_at })
      }
      const stepBucket = onboarding.get(step)
      if ((row as any).type === 'onboarding_error') stepBucket.errors += 1
      if ((row as any).type === 'onboarding_step_view') stepBucket.views += 1
    }
  }

  return {
    routes: [...routes.values()]
      .map((route) => ({
        ...route,
        average_duration_ms: route.dwell_events || route.heartbeat_events || route.stuck_events
          ? Math.round(route.total_duration_ms / Math.max(route.dwell_events + route.heartbeat_events + route.stuck_events, 1))
          : 0,
      }))
      .sort((a, b) => (b.stuck_events - a.stuck_events) || (b.max_duration_ms - a.max_duration_ms))
      .slice(0, 25),
    onboarding: [...onboarding.values()].sort((a, b) => (b.errors - a.errors) || (b.views - a.views)),
  }
})
