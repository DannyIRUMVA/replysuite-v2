import { serverSupabaseServiceRole } from '#supabase/server'
import { pollInstagramAutomations } from '~~/server/utils/integrations/instagram/polling'

const readBearerToken = (event: any) => {
  const authorization = getHeader(event, 'authorization') || ''
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]
  return bearer || getHeader(event, 'x-replysuite-cron-secret') || ''
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const cloudflareEnv = (event.context as any)?.cloudflare?.env || {}
  const expectedSecret = config.instagramPollSecret || config.trainingWorkerSecret || cloudflareEnv.INSTAGRAM_POLL_SECRET || cloudflareEnv.TRAINING_WORKER_SECRET

  if (!expectedSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Instagram polling secret is not configured.' })
  }

  const providedSecret = readBearerToken(event)
  if (!providedSecret || providedSecret !== expectedSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized Instagram poll request.' })
  }

  const body = await readBody(event).catch(() => ({}))
  const maxPosts = Number(body?.maxPosts || body?.max_posts || 50)
  const commentsPerPost = Number(body?.commentsPerPost || body?.comments_per_post || 25)
  const maxCommentsPerRun = Number(body?.maxCommentsPerRun || body?.max_comments_per_run || 5)
  const maxCommentAgeMinutes = Number(body?.maxCommentAgeMinutes || body?.max_comment_age_minutes || 90)

  console.log('[Instagram Poll] Started comment polling fallback.', { maxPosts, commentsPerPost, maxCommentsPerRun, maxCommentAgeMinutes })

  const supabase = serverSupabaseServiceRole(event)
  const startedAt = Date.now()
  const result = await pollInstagramAutomations(supabase, { maxPosts, commentsPerPost, maxCommentsPerRun, maxCommentAgeMinutes })

  console.log('[Instagram Poll] Finished comment polling fallback.', {
    checkedPosts: result.checkedPosts,
    fetchedComments: result.fetchedComments,
    processedComments: result.processedComments,
    skippedOldComments: result.skippedOldComments,
    skippedBudgetComments: result.skippedBudgetComments,
    failedPosts: result.failedPosts,
    durationMs: Date.now() - startedAt,
  })

  return {
    success: true,
    durationMs: Date.now() - startedAt,
    ...result,
  }
})
