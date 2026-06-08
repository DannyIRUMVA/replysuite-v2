export interface Env {
  INSTAGRAM_POLL_SECRET: string
  POLL_ENDPOINT: string
  MAX_POSTS?: string
  COMMENTS_PER_POST?: string
  MAX_COMMENTS_PER_RUN?: string
  MAX_COMMENT_AGE_MINUTES?: string
}

const json = (data: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(data, null, 2), {
  ...init,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    ...(init.headers || {}),
  },
})

const numberVar = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const runInstagramPoll = async (env: Env) => {
  if (!env.POLL_ENDPOINT) throw new Error('POLL_ENDPOINT is not configured.')
  if (!env.INSTAGRAM_POLL_SECRET) throw new Error('INSTAGRAM_POLL_SECRET is not configured.')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('poll timeout'), 50_000)

  const body = {
    maxPosts: numberVar(env.MAX_POSTS, 10),
    commentsPerPost: numberVar(env.COMMENTS_PER_POST, 5),
    maxCommentsPerRun: numberVar(env.MAX_COMMENTS_PER_RUN, 2),
    maxCommentAgeMinutes: numberVar(env.MAX_COMMENT_AGE_MINUTES, 20),
  }

  try {
    const startedAt = Date.now()
    const response = await fetch(env.POLL_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.INSTAGRAM_POLL_SECRET}`,
        'content-type': 'application/json',
        'user-agent': 'ReplySuite-Instagram-Poll-Cron/1.0',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const text = await response.text()
    let payload: any = null
    try { payload = text ? JSON.parse(text) : null } catch { payload = { raw: text.slice(0, 500) } }

    const summary = {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      request: body,
      response: payload ? {
        success: payload.success,
        checkedPosts: payload.checkedPosts,
        fetchedComments: payload.fetchedComments,
        processedComments: payload.processedComments,
        skippedOldComments: payload.skippedOldComments,
        skippedBudgetComments: payload.skippedBudgetComments,
        failedPosts: payload.failedPosts,
        durationMs: payload.durationMs,
      } : null,
    }

    if (!response.ok) console.error('[Instagram Poll Worker] Poll failed.', summary)
    else console.log('[Instagram Poll Worker] Poll completed.', summary)

    return summary
  } finally {
    clearTimeout(timeout)
  }
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runInstagramPoll(env).catch((error) => {
      console.error('[Instagram Poll Worker] Scheduled run failed.', error?.message || error)
    }))
  },

  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return json({ ok: true, worker: 'replysuite-instagram-poll-worker' })
    }

    if (url.pathname === '/run' && request.method === 'POST') {
      const auth = request.headers.get('authorization') || ''
      const token = auth.match(/^Bearer\s+(.+)$/i)?.[1]
      if (!token || token !== env.INSTAGRAM_POLL_SECRET) {
        return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      }

      const result = await runInstagramPoll(env)
      return json(result, { status: result.ok ? 200 : 502 })
    }

    return json({ ok: true, endpoints: ['/health', 'POST /run'] })
  },
}
