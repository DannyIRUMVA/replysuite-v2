import { serverSupabaseClient, serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { dispatchTrainingJob } from '~~/server/utils/training-dispatch'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const supabaseAdmin = serverSupabaseServiceRole(event)
  const user = await serverSupabaseUser(event)

  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const jobId = typeof body?.jobId === 'string' ? body.jobId : ''

  if (!jobId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing jobId' })
  }

  const userId = (user as any)?.id || (user as any)?.sub
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized - Missing User ID' })

  const { data: job, error: jobError } = await supabase
    .from('training_jobs')
    .select('id, user_id, chatbot_id, data_source_id, status, job_type, meta, started_at')
    .eq('id', jobId)
    .eq('user_id', userId)
    .maybeSingle()

  if (jobError) {
    console.error('[Training Rerun] Job lookup failed:', jobError)
    throw createError({ statusCode: 500, statusMessage: 'Database query failed' })
  }

  if (!job) {
    throw createError({ statusCode: 404, statusMessage: 'Training job not found' })
  }

  const now = new Date().toISOString()
  const workerMeta = typeof (job.meta as any)?.worker === 'object' && (job.meta as any)?.worker ? (job.meta as any).worker : {}
  const heartbeat = workerMeta.lastHeartbeatAt || (job as any).started_at || null
  const heartbeatAgeMs = heartbeat ? Date.now() - Date.parse(heartbeat) : Number.POSITIVE_INFINITY
  const isStaleProcessing = job.status === 'processing' && (!Number.isFinite(heartbeatAgeMs) || heartbeatAgeMs > 15 * 60 * 1000)
  const canRerun = job.status === 'failed' || isStaleProcessing

  if (!canRerun) {
    throw createError({ statusCode: 409, statusMessage: 'Only failed or stalled training jobs can be rerun.' })
  }
  const meta = typeof job.meta === 'object' && job.meta !== null ? job.meta as Record<string, any> : {}
  const resetMeta = {
    ...meta,
    worker: {
      stage: 'prepare',
      nextChunkIndex: 0,
      totalChunks: 0,
      attempts: 0,
      lastHeartbeatAt: now,
      nextRunAfter: null,
      embeddingReset: false,
      usageRecorded: false,
      lastError: null,
    },
  }

  if (job.data_source_id) {
    const { error: sourceError } = await supabaseAdmin
      .from('data_sources')
      .update({ status: 'pending' })
      .eq('id', job.data_source_id)
      .eq('user_id', userId)

    if (sourceError) {
      console.error('[Training Rerun] Source reset failed:', sourceError)
      throw createError({ statusCode: 500, statusMessage: 'Could not reset the training source.' })
    }
  }

  const { data: updatedJob, error: updateError } = await supabaseAdmin
    .from('training_jobs')
    .update({
      status: 'queued',
      progress: 5,
      progress_label: isStaleProcessing ? 'Queued to resume stalled training' : 'Queued for rerun',
      error_message: null,
      started_at: null,
      finished_at: null,
      meta: resetMeta,
    })
    .eq('id', job.id)
    .eq('user_id', userId)
    .in('status', ['failed', 'processing'])
    .select('id')
    .maybeSingle()

  if (updateError || !updatedJob?.id) {
    console.error('[Training Rerun] Job reset failed:', updateError)
    throw createError({ statusCode: 500, statusMessage: 'Could not queue training job again.' })
  }

  const dispatch = await dispatchTrainingJob(event, updatedJob.id)

  return {
    success: true,
    queued: true,
    dispatched: dispatch.dispatched,
    jobId: updatedJob.id,
    message: dispatch.dispatched
      ? `${isStaleProcessing ? 'Stalled' : 'Failed'} training job queued again. Processing will continue in the background.`
      : `${isStaleProcessing ? 'Stalled' : 'Failed'} training job queued again. The worker endpoint is not configured yet, so it remains queued.`,
  }
})
