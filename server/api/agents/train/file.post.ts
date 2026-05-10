import { serverSupabaseClient, serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { checkTrainingLimit, getUserSubscriptionLimits } from '~~/server/utils/subscription'
import { dispatchTrainingJob } from '~~/server/utils/training-dispatch'

const SUPPORTED_TEXT_MIME = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'text/html',
])

function getFileKind(file: { filename?: string; type?: string }) {
  const filename = (file.filename || '').toLowerCase()
  const type = (file.type || '').toLowerCase()

  if (type === 'application/pdf' || filename.endsWith('.pdf')) return 'pdf'
  if (SUPPORTED_TEXT_MIME.has(type) || /\.(txt|md|csv|json|html|htm)$/i.test(filename)) return 'text'
  return 'unsupported'
}

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const supabaseAdmin = serverSupabaseServiceRole(event)
  const user = await serverSupabaseUser(event)

  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const formData = await readMultipartFormData(event)
  if (!formData) throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })

  const file = formData.find((entry) => entry.name === 'file')
  const chatbotId = formData.find((entry) => entry.name === 'chatbotId')?.data.toString()

  if (!file || !chatbotId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing file or chatbotId' })
  }

  const fileKind = getFileKind(file)
  if (fileKind === 'unsupported') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unsupported file type. Please upload PDF, TXT, Markdown, CSV, JSON, or HTML files.'
    })
  }

  const userId = (user as any)?.id || (user as any)?.sub
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized - Missing User ID' })

  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('id, user_id, current_embedding_mb')
    .eq('id', chatbotId)
    .maybeSingle()

  if (chatbotError) {
    console.error('[File Training Queue] Chatbot lookup failed:', chatbotError)
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

  const fileName = file.filename || `${fileKind}-source`
  const storagePath = `${userId}/${chatbotId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '-')}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('training-assets')
    .upload(storagePath, file.data, {
      contentType: file.type || (fileKind === 'pdf' ? 'application/pdf' : 'text/plain'),
      upsert: false,
    })

  if (uploadError) {
    console.error('[File Training Queue] Storage upload failed:', uploadError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to upload training file.' })
  }

  const { data: source, error: sourceError } = await supabaseAdmin
    .from('data_sources')
    .insert({
      chatbot_id: chatbotId,
      user_id: userId,
      type: fileKind === 'pdf' ? 'file' : 'text',
      metadata: {
        filename: fileName,
        storage_path: storagePath,
        content_type: file.type || null,
        upload_kind: fileKind,
      },
      status: 'pending',
      data_size_bytes: file.data.length,
      content_text: null,
    })
    .select('id')
    .single()

  if (sourceError || !source?.id) {
    await supabaseAdmin.storage.from('training-assets').remove([storagePath]).catch(() => null)
    console.error('[File Training Queue] Failed to create source:', sourceError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to initialize file training source.' })
  }

  const { data: job, error: jobError } = await supabaseAdmin
    .from('training_jobs')
    .insert({
      chatbot_id: chatbotId,
      user_id: userId,
      data_source_id: source.id,
      status: 'queued',
      progress: 5,
      progress_label: 'Queued for document processing',
      job_type: fileKind,
      meta: {
        type: fileKind === 'pdf' ? 'file' : 'text',
        filename: fileName,
        source_id: source.id,
        storage_path: storagePath,
        upload_kind: fileKind,
      },
    })
    .select('id')
    .single()

  if (jobError || !job?.id) {
    await supabaseAdmin.from('data_sources').delete().eq('id', source.id)
    await supabaseAdmin.storage.from('training-assets').remove([storagePath]).catch(() => null)
    console.error('[File Training Queue] Failed to create job:', jobError)
    throw createError({ statusCode: 500, statusMessage: 'Could not queue file training.' })
  }

  const dispatch = await dispatchTrainingJob(event, job.id)

  return {
    success: true,
    queued: true,
    dispatched: dispatch.dispatched,
    jobId: job.id,
    sourceId: source.id,
    message: dispatch.dispatched
      ? 'Document training queued. Processing will continue in the background.'
      : 'Document training queued. The worker endpoint is not configured yet, so the job remains queued.',
  }
})
