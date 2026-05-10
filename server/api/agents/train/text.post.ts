import { serverSupabaseClient, serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { checkTrainingLimit, getUserSubscriptionLimits } from '~~/server/utils/subscription'
import { dispatchTrainingJob } from '~~/server/utils/training-dispatch'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const supabaseAdmin = serverSupabaseServiceRole(event)
  const user = await serverSupabaseUser(event)

  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const chatbotId = typeof body?.chatbotId === 'string' ? body.chatbotId : ''
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  const title = typeof body?.title === 'string' ? body.title.trim() : 'Manual Entry'

  if (!chatbotId || !content) {
    throw createError({ statusCode: 400, statusMessage: 'Missing chatbotId or content' })
  }

  const userId = (user as any)?.id || (user as any)?.sub
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized - Missing User ID' })

  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('id, user_id, current_embedding_mb')
    .eq('id', chatbotId)
    .maybeSingle()

  if (chatbotError) {
    console.error('[Text Training Queue] Chatbot lookup failed:', chatbotError)
    throw createError({ statusCode: 500, statusMessage: 'Database query failed' })
  }

  if (!chatbot) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found or access denied' })
  }

  const canTrain = await checkTrainingLimit(event, chatbotId, userId)
  if (!canTrain) {
    throw createError({ statusCode: 403, statusMessage: 'Monthly training limit reached for this agent.' })
  }

  const limits = await getUserSubscriptionLimits(event, userId)
  const currentSizeMB = Number(chatbot.current_embedding_mb || 0)
  if (currentSizeMB >= limits.max_embedding_mb) {
    throw createError({
      statusCode: 403,
      statusMessage: `Vector capacity reached (${limits.max_embedding_mb}MB). Please remove existing knowledge sources to add more.`
    })
  }

  const { data: source, error: sourceError } = await supabaseAdmin
    .from('data_sources')
    .insert({
      chatbot_id: chatbotId,
      user_id: userId,
      type: 'text',
      metadata: {
        title,
        origin: 'custom-text',
      },
      content_text: content,
      status: 'pending',
      data_size_bytes: new TextEncoder().encode(content).length,
    })
    .select('id')
    .single()

  if (sourceError || !source?.id) {
    console.error('[Text Training Queue] Failed to create source:', sourceError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to initialize text training source.' })
  }

  const { data: job, error: jobError } = await supabaseAdmin
    .from('training_jobs')
    .insert({
      chatbot_id: chatbotId,
      user_id: userId,
      data_source_id: source.id,
      status: 'queued',
      progress: 5,
      progress_label: 'Queued for text chunking',
      job_type: 'text',
      meta: {
        type: 'text',
        title,
        source_id: source.id,
      },
    })
    .select('id')
    .single()

  if (jobError || !job?.id) {
    await supabaseAdmin.from('data_sources').delete().eq('id', source.id)
    console.error('[Text Training Queue] Failed to create job:', jobError)
    throw createError({ statusCode: 500, statusMessage: 'Could not queue text training.' })
  }

  const dispatch = await dispatchTrainingJob(event, job.id)

  return {
    success: true,
    queued: true,
    dispatched: dispatch.dispatched,
    jobId: job.id,
    sourceId: source.id,
    message: dispatch.dispatched
      ? 'Text training queued. Processing will continue in the background.'
      : 'Text training queued. The worker endpoint is not configured yet, so the job remains queued.',
  }
})
