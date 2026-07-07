export default defineNuxtPlugin(() => {
  const route = useRoute()
  const user = useSupabaseUser()

  const getSessionId = () => {
    const key = 'replysuite:journey-session-id'
    const existing = sessionStorage.getItem(key)
    if (existing) return existing
    const next = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem(key, next)
    return next
  }

  const sessionId = getSessionId()
  let enteredAt = Date.now()
  let enteredRoute = route.fullPath
  let stuckTrackedForRoute = ''
  let lastHeartbeatAt = 0
  let initialPageViewTracked = false

  const trackJourney = async (type: string, meta: Record<string, any> = {}) => {
    if (!user.value) return

    try {
      await $fetch('/api/activity/log', {
        method: 'POST',
        body: {
          type,
          source: route.path,
          meta: {
            ...meta,
            route: route.fullPath,
            session_id: sessionId,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        },
      })
    } catch (error) {
      if (import.meta.dev) console.warn('[JourneyTracker] Failed to track journey event:', error)
    }
  }

  const flushRouteDwell = (reason: string) => {
    const durationMs = Date.now() - enteredAt
    if (durationMs < 3000) return

    void trackJourney('journey_route_dwell', {
      reason,
      entered_route: enteredRoute,
      duration_ms: durationMs,
    })
  }

  const markPageView = (from?: string) => {
    enteredAt = Date.now()
    enteredRoute = route.fullPath
    stuckTrackedForRoute = ''
    lastHeartbeatAt = 0
    initialPageViewTracked = true

    void trackJourney('journey_page_view', {
      from: from || document.referrer || null,
      title: document.title,
    })
  }

  onNuxtReady(() => {
    if (user.value) markPageView()
  })

  watch(user, (currentUser) => {
    if (!currentUser || initialPageViewTracked) return
    markPageView()
  }, { immediate: true })

  const router = useRouter()
  router.afterEach((to, from) => {
    flushRouteDwell('route_change')
    window.setTimeout(() => markPageView(from.fullPath), 0)
  })

  const heartbeat = window.setInterval(() => {
    if (!user.value || document.visibilityState !== 'visible') return
    const durationMs = Date.now() - enteredAt

    if (durationMs > 120_000 && stuckTrackedForRoute !== enteredRoute) {
      stuckTrackedForRoute = enteredRoute
      void trackJourney('journey_possible_stuck', {
        entered_route: enteredRoute,
        duration_ms: durationMs,
        threshold_ms: 120_000,
      })
      return
    }

    if (durationMs > 60_000 && Date.now() - lastHeartbeatAt > 60_000) {
      lastHeartbeatAt = Date.now()
      void trackJourney('journey_still_here', {
        entered_route: enteredRoute,
        duration_ms: durationMs,
      })
    }
  }, 30_000)

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushRouteDwell('visibility_hidden')
    if (document.visibilityState === 'visible') {
      enteredAt = Date.now()
      enteredRoute = route.fullPath
      stuckTrackedForRoute = ''
    }
  })

  window.addEventListener('beforeunload', () => {
    flushRouteDwell('before_unload')
    window.clearInterval(heartbeat)
  })
})
