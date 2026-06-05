import { createClient } from '@supabase/supabase-js'
import pdf from 'pdf-parse-fork'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  GEMINI_API_KEY: string
  TRAINING_WORKER_SECRET: string
  TRAINING_RUNTIME_PROFILE?: string
  TRAINING_MAX_RUN_MS?: string
  TRAINING_EMBEDDING_BATCH_SIZE?: string
  TRAINING_MAX_TEXT_CHARS?: string
  TRAINING_MAX_CRAWL_PAGES?: string
  TRAINING_MAX_CRAWL_DURATION_MS?: string
  TRAINING_MAX_PDF_MB?: string
  TRAINING_CRON_BATCH_SIZE?: string
}

type TrainingJob = {
  id: string
  chatbot_id: string
  user_id: string
  status: string
  data_source_id: string | null
  job_type: string | null
  meta: any
}

type DataSource = {
  id: string
  chatbot_id: string
  user_id: string
  type: string | null
  metadata: any
  content_text: string | null
}

type CrawlPage = {
  url: string
  title: string
  text: string
}

const DEFAULT_FREE_MAX_RUN_MS = 18_000
const DEFAULT_SCALED_MAX_RUN_MS = 55_000
const MAX_EMBED_INPUT = 8_000
const TARGET_CHUNK_SIZE = 1200
const CHUNK_OVERLAP = 180
const PAGE_FETCH_TIMEOUT_MS = 8_000
const EMBEDDING_TIMEOUT_MS = 25_000
const DEFAULT_RETRY_DELAY_SECONDS = 180
const STALE_PROCESSING_MS = 12 * 60_000

type WorkerStage = 'prepare' | 'crawl' | 'chunk' | 'embed' | 'finalize'

type WorkerCheckpoint = {
  stage?: WorkerStage
  nextChunkIndex?: number
  totalChunks?: number
  attempts?: number
  lastHeartbeatAt?: string
  nextRunAfter?: string
  embeddingReset?: boolean
  usageRecorded?: boolean
  lastError?: string
}

class RetryLaterError extends Error {
  retryAfterSeconds: number

  constructor(message: string, retryAfterSeconds = DEFAULT_RETRY_DELAY_SECONDS) {
    super(message)
    this.name = 'RetryLaterError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

function cleanEnvValue(value?: string | null) {
  return String(value || '').trim().replace(/^(["'])(.*)\1$/, '$2')
}

function describeError(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function isFreeMode(env: Env) {
  return cleanEnvValue(env.TRAINING_RUNTIME_PROFILE || 'free') !== 'scaled'
}

function getNumericEnv(env: Env, key: keyof Env, fallback: number, min: number, max: number) {
  const raw = Number(cleanEnvValue(env[key]))
  if (!Number.isFinite(raw)) return fallback
  return Math.min(max, Math.max(min, raw))
}

function getMaxRunMs(env: Env) {
  const fallback = isFreeMode(env) ? DEFAULT_FREE_MAX_RUN_MS : DEFAULT_SCALED_MAX_RUN_MS
  return getNumericEnv(env, 'TRAINING_MAX_RUN_MS', fallback, 5_000, 55_000)
}

function getMaxTextContent(env: Env) {
  return getNumericEnv(env, 'TRAINING_MAX_TEXT_CHARS', isFreeMode(env) ? 120_000 : 600_000, 20_000, 600_000)
}

function getEmbeddingBatchSize(env: Env) {
  return getNumericEnv(env, 'TRAINING_EMBEDDING_BATCH_SIZE', isFreeMode(env) ? 1 : 8, 1, 8)
}

function getCrawlDurationMs(env: Env) {
  return getNumericEnv(env, 'TRAINING_MAX_CRAWL_DURATION_MS', isFreeMode(env) ? 14_000 : 90_000, 5_000, 90_000)
}

function getMaxPdfBytes(env: Env) {
  const mb = getNumericEnv(env, 'TRAINING_MAX_PDF_MB', isFreeMode(env) ? 2 : 20, 1, 20)
  return mb * 1024 * 1024
}

function getCronBatchSize(env: Env) {
  return getNumericEnv(env, 'TRAINING_CRON_BATCH_SIZE', isFreeMode(env) ? 1 : 3, 1, 5)
}

function getWorkerCheckpoint(job: Pick<TrainingJob, 'meta'>): WorkerCheckpoint {
  const checkpoint = job.meta?.worker || {}
  return typeof checkpoint === 'object' && checkpoint ? checkpoint : {}
}

function mergeWorkerCheckpoint(job: Pick<TrainingJob, 'meta'>, patch: WorkerCheckpoint) {
  return {
    ...(job.meta || {}),
    worker: {
      ...getWorkerCheckpoint(job),
      ...patch,
      lastHeartbeatAt: new Date().toISOString(),
    },
  }
}

function getRetryDelaySeconds(checkpoint: WorkerCheckpoint, fallback = DEFAULT_RETRY_DELAY_SECONDS) {
  const attempts = Number(checkpoint.attempts || 0)
  return Math.min(60 * 60, Math.max(fallback, fallback * Math.max(1, attempts)))
}

function isTransientEmbeddingError(message: string) {
  return /429|quota|rate|resource exhausted|timeout|timed out|temporar|503|502|500/i.test(message)
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 10_000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(`Request timed out after ${timeoutMs}ms`), timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

export default {
  async scheduled(_controller: any, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(resumePendingJobs(env))
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'GET' && url.pathname === '/health') {
      return Response.json({ ok: true, service: 'training-worker' })
    }

    if (request.method === 'POST' && url.pathname === '/process') {
      const secret = request.headers.get('x-training-secret')
      if (!secret || secret !== cleanEnvValue(env.TRAINING_WORKER_SECRET)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const body = await request.json().catch(() => null)
      const jobId = typeof body?.jobId === 'string' ? body.jobId : ''
      if (!jobId) {
        return Response.json({ error: 'Missing jobId' }, { status: 400 })
      }

      try {
        console.log('[Training Worker] /process received', { jobId })
        const bootstrap = await bootstrapJob(env, jobId)

        if (!bootstrap.started) {
          return Response.json({ accepted: true, jobId, skipped: true, reason: bootstrap.reason })
        }

        ctx.waitUntil(runJobSafely(env, bootstrap.job))
        return Response.json({ accepted: true, jobId, started: true, reason: 'claimed' })
      } catch (error: any) {
        const reason = describeError(error)
        console.error('[Training Worker] Failed to bootstrap job', { jobId, error: reason })
        await safeFailJob(env, jobId, reason)
        return Response.json({ error: 'Failed to start training job', reason }, { status: 500 })
      }
    }

    return new Response('Not found', { status: 404 })
  },
}

function validateEnv(env: Env) {
  if (!cleanEnvValue(env.SUPABASE_URL)) throw new Error('SUPABASE_URL is missing in worker environment.')
  if (!cleanEnvValue(env.SUPABASE_SERVICE_ROLE_KEY)) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing in worker environment.')
  if (!cleanEnvValue(env.GEMINI_API_KEY)) throw new Error('GEMINI_API_KEY is missing in worker environment.')
  if (!cleanEnvValue(env.TRAINING_WORKER_SECRET)) throw new Error('TRAINING_WORKER_SECRET is missing in worker environment.')
}

function getSupabase(env: Env) {
  validateEnv(env)
  return createClient(cleanEnvValue(env.SUPABASE_URL), cleanEnvValue(env.SUPABASE_SERVICE_ROLE_KEY), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function updateJob(env: Env, jobId: string, patch: Record<string, unknown>) {
  const supabase = getSupabase(env)
  const { error } = await supabase.from('training_jobs').update(patch).eq('id', jobId)
  if (error) throw new Error(error.message || 'Failed to update training job.')
}

async function updateSource(env: Env, sourceId: string, patch: Record<string, unknown>) {
  const supabase = getSupabase(env)
  const { error } = await supabase.from('data_sources').update(patch).eq('id', sourceId)
  if (error) throw new Error(error.message || 'Failed to update data source.')
}

async function safeFailJob(env: Env, jobId: string, message: string) {
  try {
    await updateJob(env, jobId, {
      status: 'failed',
      progress_label: 'Training failed',
      error_message: message,
      finished_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Training Worker] Failed to mark job as failed', { jobId, message, error: describeError(error) })
  }
}

async function bootstrapJob(env: Env, jobId: string) {
  console.log('[Training Worker] Bootstrapping job', { jobId })
  const supabase = getSupabase(env)
  const { data: job, error } = await supabase
    .from('training_jobs')
    .select('id, chatbot_id, user_id, status, data_source_id, job_type, meta')
    .eq('id', jobId)
    .maybeSingle<TrainingJob>()

  if (error || !job) {
    throw new Error(error?.message || 'Training job not found.')
  }

  if (job.status === 'finished') {
    return { started: false, reason: 'already_finished' as const, job }
  }

  const checkpoint = getWorkerCheckpoint(job)
  if (job.status === 'retry_wait' && checkpoint.nextRunAfter && Date.parse(checkpoint.nextRunAfter) > Date.now()) {
    return { started: false, reason: 'retry_wait' as const, job }
  }

  if (job.status === 'processing' && checkpoint.lastHeartbeatAt && Date.now() - Date.parse(checkpoint.lastHeartbeatAt) < STALE_PROCESSING_MS) {
    return { started: false, reason: 'already_processing' as const, job }
  }

  const attempts = Number(checkpoint.attempts || 0) + 1
  const { data: claimed, error: claimError } = await supabase
    .from('training_jobs')
    .update({
      status: 'processing',
      progress: Math.max(3, Number((job as any).progress || 0)),
      progress_label: attempts > 1 ? `Resuming training (attempt ${attempts})` : 'Worker started',
      error_message: null,
      finished_at: null,
      started_at: new Date().toISOString(),
      meta: mergeWorkerCheckpoint(job, {
        attempts,
        nextRunAfter: undefined,
        lastError: undefined,
        stage: checkpoint.stage || 'prepare',
      }),
    })
    .eq('id', jobId)
    .in('status', ['queued', 'retry_wait', 'processing'])
    .select('id, chatbot_id, user_id, status, data_source_id, job_type, meta')
    .maybeSingle<TrainingJob>()

  if (claimError) throw new Error(claimError.message)
  if (!claimed) return { started: false, reason: 'not_claimable' as const, job }

  return { started: true as const, job: claimed }
}

async function runJobSafely(env: Env, job: TrainingJob) {
  console.log('[Training Worker] Background execution started', { jobId: job.id })
  try {
    await processTrainingJob(env, job)
  } catch (error: any) {
    const reason = describeError(error)
    console.error('[Training Worker] Unhandled background failure', { jobId: job.id, error: reason })
    await safeFailJob(env, job.id, reason)
  }
}

async function resumePendingJobs(env: Env) {
  console.log('[Training Worker] Scheduled recovery started')
  const supabase = getSupabase(env)
  const { data: jobs, error } = await supabase
    .from('training_jobs')
    .select('id, chatbot_id, user_id, status, data_source_id, job_type, meta')
    .in('status', ['queued', 'retry_wait', 'processing'])
    .limit(15)
    .returns<TrainingJob[]>()

  if (error) {
    console.error('[Training Worker] Scheduled recovery lookup failed', { error: error.message })
    return
  }

  const runnable = (jobs || []).filter((job) => {
    const checkpoint = getWorkerCheckpoint(job)
    if (job.status === 'retry_wait' && checkpoint.nextRunAfter && Date.parse(checkpoint.nextRunAfter) > Date.now()) return false
    if (job.status === 'processing' && checkpoint.lastHeartbeatAt && Date.now() - Date.parse(checkpoint.lastHeartbeatAt) < STALE_PROCESSING_MS) return false
    return true
  }).slice(0, getCronBatchSize(env))

  for (const pending of runnable) {
    const bootstrap = await bootstrapJob(env, pending.id).catch((error) => {
      console.error('[Training Worker] Scheduled bootstrap failed', { jobId: pending.id, error: describeError(error) })
      return null
    })

    if (bootstrap?.started) {
      await runJobSafely(env, bootstrap.job)
    }
  }
}

async function processTrainingJob(env: Env, job: TrainingJob) {
  const supabase = getSupabase(env)
  const jobId = job.id

  if (!job.data_source_id) {
    await updateJob(env, jobId, {
      status: 'failed',
      progress_label: 'Missing source reference',
      error_message: 'Missing source reference',
      finished_at: new Date().toISOString(),
    })
    return
  }

  await updateJob(env, jobId, {
    status: 'processing',
    progress: 8,
    progress_label: 'Preparing source',
    error_message: null,
    finished_at: null,
  })

  const { data: source, error: sourceError } = await supabase
    .from('data_sources')
    .select('id, chatbot_id, user_id, type, metadata, content_text')
    .eq('id', job.data_source_id)
    .maybeSingle<DataSource>()

  if (sourceError || !source) {
    await updateJob(env, jobId, {
      status: 'failed',
      progress_label: 'Source missing',
      error_message: sourceError?.message || 'Source missing',
      finished_at: new Date().toISOString(),
    })
    return
  }

  await updateSource(env, source.id, { status: 'processing' })

  try {
    if (job.job_type === 'url') {
      await processUrlJob(env, supabase, job, source)
    } else if (job.job_type === 'pdf' || source.metadata?.upload_kind === 'pdf') {
      await processPdfJob(env, supabase, job, source)
    } else {
      await processTextLikeJob(env, supabase, job, source)
    }
  } catch (error: any) {
    const reason = describeError(error)
    console.error('[Training Worker] Job failed', { jobId, error: reason })

    if (error instanceof RetryLaterError || isTransientEmbeddingError(reason)) {
      const { data: latestJob } = await supabase
        .from('training_jobs')
        .select('id, chatbot_id, user_id, status, data_source_id, job_type, meta')
        .eq('id', jobId)
        .maybeSingle<TrainingJob>()
      const retryJob = latestJob || job
      const checkpoint = getWorkerCheckpoint(retryJob)
      const retryAfterSeconds = error instanceof RetryLaterError ? error.retryAfterSeconds : getRetryDelaySeconds(checkpoint)
      await updateJob(env, jobId, {
        status: 'retry_wait',
        progress_label: 'Training paused; retrying automatically',
        error_message: reason,
        meta: mergeWorkerCheckpoint(retryJob, {
          lastError: reason,
          nextRunAfter: new Date(Date.now() + retryAfterSeconds * 1000).toISOString(),
        }),
      })
      return
    }

    await safeFailJob(env, jobId, reason)
    await updateSource(env, source.id, { status: 'failed' }).catch((sourceError) => {
      console.error('[Training Worker] Failed to mark source as failed', { sourceId: source.id, error: describeError(sourceError) })
    })
  }
}

async function processUrlJob(env: Env, supabase: ReturnType<typeof getSupabase>, job: TrainingJob, source: DataSource) {
  const startUrl = source.metadata?.url
  console.log('[Training Worker] URL job started', { jobId: job.id, startUrl })
  if (!startUrl) throw new Error('URL source is missing its target url.')

  const planSlug = await getPlanSlug(supabase, job.user_id)
  const maxPages = getMaxPagesForPlan(env, planSlug)

  if (source.content_text) {
    const cachedText = normalizeText(source.content_text).slice(0, getMaxTextContent(env))
    const chunks = chunkText(cachedText).map((content, index) => ({
      content,
      metadata: {
        root_url: startUrl,
        type: 'url',
        cached: true,
      },
      chunkIndex: index,
    }))

    await writeEmbeddingsForSource(env, supabase, job, source, cachedText, chunks, {
      sourceStatusMeta: {
        ...(source.metadata || {}),
        chunk_count: chunks.length,
        mode: 'cached-crawl',
        url: startUrl,
      },
    })
    return
  }

  await updateJob(env, job.id, {
    progress: 10,
    progress_label: `Crawling website (${maxPages} page max)`,
  })

  const pages = await crawlWebsite(startUrl, maxPages, getCrawlDurationMs(env), async (count) => {
    if (count !== 1 && count !== maxPages && count % 5 !== 0) return

    await updateJob(env, job.id, {
      progress: Math.min(45, 10 + Math.round((count / Math.max(maxPages, 1)) * 35)),
      progress_label: `Crawled ${count} page${count === 1 ? '' : 's'}`,
    })
  })

  console.log('[Training Worker] Crawl finished', { jobId: job.id, pageCount: pages.length })

  if (!pages.length) {
    throw new Error('No crawlable website content was found.')
  }

  const combinedText = pages
    .map((page) => `# ${page.title}\nURL: ${page.url}\n\n${page.text}`)
    .join('\n\n---\n\n')
    .slice(0, getMaxTextContent(env))

  const chunks = pages.flatMap((page) =>
    chunkText(page.text).map((content, index) => ({
      content,
      metadata: {
        page_url: page.url,
        page_title: page.title,
        root_url: startUrl,
        type: 'url',
      },
      chunkIndex: index,
    }))
  )

  console.log('[Training Worker] Starting embedding write', { jobId: job.id, chunkCount: chunks.length })

  await updateSource(env, source.id, {
    status: 'processing',
    content_text: combinedText,
    data_size_bytes: new TextEncoder().encode(combinedText).length,
    metadata: {
      ...(source.metadata || {}),
      training_cached_at: new Date().toISOString(),
      cached_chunk_count: chunks.length,
    },
  })

  await writeEmbeddingsForSource(env, supabase, job, source, combinedText, chunks, {
    sourceStatusMeta: {
      title: pages[0]?.title || source.metadata?.title || new URL(startUrl).hostname,
      pages_crawled: pages.length,
      discovered_pages: pages.map((page) => page.url).slice(0, 100),
      chunk_count: chunks.length,
      mode: 'aggressive-crawl',
      url: startUrl,
    },
  })
}

async function processPdfJob(env: Env, supabase: ReturnType<typeof getSupabase>, job: TrainingJob, source: DataSource) {
  const storagePath = source.metadata?.storage_path
  if (!storagePath && !source.content_text) throw new Error('PDF source is missing storage_path.')

  if (source.content_text) {
    const cachedText = normalizeText(source.content_text).slice(0, getMaxTextContent(env))
    const chunks = chunkText(cachedText).map((content, index) => ({
      content,
      metadata: {
        filename: source.metadata?.filename || 'document.pdf',
        content_type: source.metadata?.content_type || 'application/pdf',
        pages: source.metadata?.pages || null,
        type: 'file',
        cached: true,
      },
      chunkIndex: index,
    }))

    await writeEmbeddingsForSource(env, supabase, job, source, cachedText, chunks, {
      sourceStatusMeta: {
        filename: source.metadata?.filename || 'document.pdf',
        pages: source.metadata?.pages || null,
        chunk_count: chunks.length,
        content_type: source.metadata?.content_type || 'application/pdf',
      },
      cleanupStoragePath: storagePath || null,
    })
    return
  }

  await updateJob(env, job.id, {
    progress: 15,
    progress_label: 'Downloading PDF asset',
  })

  const { data: fileData, error: downloadError } = await supabase.storage.from('training-assets').download(storagePath)
  if (downloadError || !fileData) {
    throw new Error(downloadError?.message || 'Failed to download PDF asset.')
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer())
  if (bytes.byteLength > getMaxPdfBytes(env)) {
    throw new Error(`PDF is too large for the current training mode. Maximum allowed is ${Math.round(getMaxPdfBytes(env) / (1024 * 1024))}MB.`)
  }

  await updateJob(env, job.id, {
    progress: 30,
    progress_label: 'Extracting PDF text',
  })

  const pdfData = await pdf(Buffer.from(bytes))
  const rawText = normalizeText(pdfData.text).slice(0, getMaxTextContent(env))
  if (!rawText) throw new Error('The PDF did not produce usable text.')

  const chunks = chunkText(rawText).map((content, index) => ({
    content,
    metadata: {
      filename: source.metadata?.filename || 'document.pdf',
      content_type: source.metadata?.content_type || 'application/pdf',
      pages: pdfData.numpages,
      type: 'file',
    },
    chunkIndex: index,
  }))

  await updateSource(env, source.id, {
    status: 'processing',
    content_text: rawText,
    data_size_bytes: new TextEncoder().encode(rawText).length,
    metadata: {
      ...(source.metadata || {}),
      pages: pdfData.numpages,
      training_cached_at: new Date().toISOString(),
      cached_chunk_count: chunks.length,
    },
  })

  await writeEmbeddingsForSource(env, supabase, job, source, rawText, chunks, {
    sourceStatusMeta: {
      filename: source.metadata?.filename || 'document.pdf',
      pages: pdfData.numpages,
      chunk_count: chunks.length,
      content_type: source.metadata?.content_type || 'application/pdf',
    },
    cleanupStoragePath: storagePath,
  })
}

async function processTextLikeJob(env: Env, supabase: ReturnType<typeof getSupabase>, job: TrainingJob, source: DataSource) {
  let rawText = normalizeText(source.content_text || '')
  let title = source.metadata?.title || source.metadata?.filename || 'Knowledge Source'
  let cleanupStoragePath: string | null = null

  if (!rawText && source.metadata?.storage_path) {
    cleanupStoragePath = source.metadata.storage_path

    await updateJob(env, job.id, {
      progress: 20,
      progress_label: 'Downloading text asset',
    })

    const { data: fileData, error: downloadError } = await supabase.storage.from('training-assets').download(source.metadata.storage_path)
    if (downloadError || !fileData) {
      throw new Error(downloadError?.message || 'Failed to download text asset.')
    }

    rawText = normalizeText(await fileData.text())
    title = source.metadata?.filename || title
  }

  if (!rawText) throw new Error('No usable text content was found for this source.')
  rawText = rawText.slice(0, getMaxTextContent(env))

  await updateJob(env, job.id, {
    progress: 35,
    progress_label: 'Chunking knowledge text',
  })

  const chunks = chunkText(rawText).map((content, index) => ({
    content,
    metadata: {
      title,
      filename: source.metadata?.filename || null,
      type: 'text',
      origin: source.metadata?.origin || source.metadata?.upload_kind || 'custom-text',
    },
    chunkIndex: index,
  }))

  if (!source.content_text) {
    await updateSource(env, source.id, {
      status: 'processing',
      content_text: rawText,
      data_size_bytes: new TextEncoder().encode(rawText).length,
      metadata: {
        ...(source.metadata || {}),
        training_cached_at: new Date().toISOString(),
        cached_chunk_count: chunks.length,
      },
    })
  }

  await writeEmbeddingsForSource(env, supabase, job, source, rawText, chunks, {
    sourceStatusMeta: {
      title,
      chunk_count: chunks.length,
      content_type: source.metadata?.content_type || 'text/plain',
    },
    cleanupStoragePath,
  })
}

async function writeEmbeddingsForSource(
  env: Env,
  supabase: ReturnType<typeof getSupabase>,
  job: TrainingJob,
  source: DataSource,
  rawText: string,
  chunks: Array<{ content: string; metadata: any; chunkIndex: number }>,
  options: { sourceStatusMeta?: Record<string, unknown>; cleanupStoragePath?: string | null }
) {
  if (!chunks.length) throw new Error('No chunks were produced from the source.')

  const deadline = Date.now() + getMaxRunMs(env)
  const totalBytes = new TextEncoder().encode(rawText).length
  const batchSize = getEmbeddingBatchSize(env)
  let checkpoint = getWorkerCheckpoint(job)
  let nextChunkIndex = Math.min(Math.max(Number(checkpoint.nextChunkIndex || 0), 0), chunks.length)

  if (!checkpoint.embeddingReset) {
    await updateJob(env, job.id, {
      progress: 43,
      progress_label: 'Preparing resumable embedding write',
      meta: mergeWorkerCheckpoint(job, {
        stage: 'embed',
        nextChunkIndex: 0,
        totalChunks: chunks.length,
        embeddingReset: false,
      }),
    })

    await supabase.from('embeddings').delete().eq('source_id', source.id)
    checkpoint = { ...checkpoint, embeddingReset: true, nextChunkIndex: 0, totalChunks: chunks.length, stage: 'embed' }
    nextChunkIndex = 0

    await updateJob(env, job.id, {
      progress: 45,
      progress_label: `Embedding ${chunks.length} chunk${chunks.length === 1 ? '' : 's'}`,
      meta: mergeWorkerCheckpoint(job, checkpoint),
    })
  }

  for (let index = nextChunkIndex; index < chunks.length; index += batchSize) {
    if (Date.now() + 3_000 > deadline) {
      await pauseJobForRetry(env, job, {
        progress: Math.min(92, 45 + Math.round((index / chunks.length) * 45)),
        label: `Paused after ${index}/${chunks.length} chunks`,
        checkpoint: {
          stage: 'embed',
          nextChunkIndex: index,
          totalChunks: chunks.length,
          embeddingReset: true,
        },
        retryAfterSeconds: isFreeMode(env) ? 45 : 10,
      })
      return
    }

    const batch = chunks.slice(index, index + batchSize)
    const vectors = await getEmbeddingsBatch(env, batch.map((chunk) => chunk.content))

    const rows = batch.map((chunk, batchIndex) => ({
      chatbot_id: job.chatbot_id,
      source_id: source.id,
      content: chunk.content,
      vec: vectors[batchIndex],
      token_count: Math.ceil(chunk.content.length / 4),
      chunk_index: chunk.chunkIndex,
      metadata: chunk.metadata,
    }))

    const { error: embedError } = await supabase
      .from('embeddings')
      .upsert(rows, { onConflict: 'source_id,chunk_index' })

    if (embedError) {
      throw new Error(embedError.message || 'Failed to upsert embedding chunk batch.')
    }

    const processed = Math.min(index + batch.length, chunks.length)
    await updateJob(env, job.id, {
      status: 'processing',
      progress: Math.min(92, 45 + Math.round((processed / chunks.length) * 45)),
      progress_label: `Embedded ${processed}/${chunks.length} chunks`,
      meta: mergeWorkerCheckpoint(job, {
        stage: 'embed',
        nextChunkIndex: processed,
        totalChunks: chunks.length,
        embeddingReset: true,
      }),
    })
  }

  await finalizeTrainingJob(env, supabase, job, source, rawText, totalBytes, chunks.length, options)
}

async function pauseJobForRetry(
  env: Env,
  job: TrainingJob,
  options: { progress: number; label: string; checkpoint: WorkerCheckpoint; retryAfterSeconds: number }
) {
  await updateJob(env, job.id, {
    status: 'retry_wait',
    progress: options.progress,
    progress_label: options.label,
    meta: mergeWorkerCheckpoint(job, {
      ...options.checkpoint,
      nextRunAfter: new Date(Date.now() + options.retryAfterSeconds * 1000).toISOString(),
    }),
  })
}

async function finalizeTrainingJob(
  env: Env,
  supabase: ReturnType<typeof getSupabase>,
  job: TrainingJob,
  source: DataSource,
  rawText: string,
  totalBytes: number,
  chunkCount: number,
  options: { sourceStatusMeta?: Record<string, unknown>; cleanupStoragePath?: string | null }
) {
  const checkpoint = getWorkerCheckpoint(job)

  await updateJob(env, job.id, {
    status: 'processing',
    progress: 94,
    progress_label: 'Finalizing training',
    meta: mergeWorkerCheckpoint(job, { stage: 'finalize', nextChunkIndex: chunkCount, totalChunks: chunkCount }),
  })

  await updateSource(env, source.id, {
    status: 'completed',
    content_text: rawText.slice(0, getMaxTextContent(env)),
    data_size_bytes: totalBytes,
    metadata: {
      ...(source.metadata || {}),
      ...(options.sourceStatusMeta || {}),
      processed_at: new Date().toISOString(),
    },
  })

  await refreshChatbotEmbeddingSize(supabase, job.chatbot_id)

  if (!checkpoint.usageRecorded) {
    await recordTrainingUsage(supabase, job.chatbot_id, job.user_id, 1)
    await updateJob(env, job.id, {
      progress: 97,
      progress_label: 'Usage recorded',
      meta: mergeWorkerCheckpoint(job, { stage: 'finalize', usageRecorded: true }),
    })
  }

  await updateJob(env, job.id, {
    status: 'finished',
    progress: 100,
    progress_label: 'Training complete',
    error_message: null,
    meta: {
      ...(job.meta || {}),
      chunk_count: chunkCount,
      source_id: source.id,
      completed_at: new Date().toISOString(),
      worker: {
        ...getWorkerCheckpoint(job),
        stage: 'finalize',
        nextChunkIndex: chunkCount,
        totalChunks: chunkCount,
        embeddingReset: true,
        usageRecorded: true,
        lastHeartbeatAt: new Date().toISOString(),
      },
    },
    finished_at: new Date().toISOString(),
  })

  if (options.cleanupStoragePath) {
    await supabase.storage.from('training-assets').remove([options.cleanupStoragePath]).catch(() => null)
  }
}

async function refreshChatbotEmbeddingSize(supabase: ReturnType<typeof getSupabase>, chatbotId: string) {
  const { data, error } = await supabase
    .from('data_sources')
    .select('data_size_bytes')
    .eq('chatbot_id', chatbotId)
    .eq('status', 'completed')

  if (error) {
    console.warn('[Training Worker] Failed to refresh chatbot embedding size', { chatbotId, error: error.message })
    return
  }

  const totalBytes = (data || []).reduce((sum: number, item: any) => sum + Number(item.data_size_bytes || 0), 0)
  await supabase
    .from('chatbots')
    .update({ current_embedding_mb: (totalBytes / (1024 * 1024)).toFixed(4) })
    .eq('id', chatbotId)
}

async function recordTrainingUsage(supabase: ReturnType<typeof getSupabase>, chatbotId: string, userId: string, count = 1) {
  const monthYear = new Date().toISOString().slice(0, 7)

  const { data: existing } = await supabase
    .from('training_usage')
    .select('id, training_count')
    .eq('chatbot_id', chatbotId)
    .eq('month_year', monthYear)
    .maybeSingle<{ id: string; training_count: number | null }>()

  if (existing?.id) {
    await supabase
      .from('training_usage')
      .update({ training_count: Number(existing.training_count || 0) + count })
      .eq('id', existing.id)
  } else {
    await supabase.from('training_usage').insert({
      chatbot_id: chatbotId,
      user_id: userId,
      month_year: monthYear,
      training_count: count,
    })
  }
}

async function getPlanSlug(supabase: ReturnType<typeof getSupabase>, userId: string) {
  const { data } = await supabase
    .from('user_memberships')
    .select('plans(internal_slug)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle<any>()

  return data?.plans?.internal_slug || 'starter'
}

function getMaxPagesForPlan(env: Env, planSlug: string) {
  const scaledLimit = planSlug === 'enterprise-ready' ? 40 : planSlug === 'gold' ? 16 : planSlug === 'silver' ? 8 : 4
  const freeLimit = planSlug === 'enterprise-ready' ? 10 : planSlug === 'gold' ? 8 : planSlug === 'silver' ? 5 : 3
  const defaultLimit = isFreeMode(env) ? freeLimit : scaledLimit
  return getNumericEnv(env, 'TRAINING_MAX_CRAWL_PAGES', defaultLimit, 1, scaledLimit)
}

async function crawlWebsite(startUrl: string, maxPages: number, maxDurationMs: number, onProgress?: (count: number) => Promise<void>) {
  const queue: Array<{ url: string; depth: number }> = [{ url: normalizeUrl(startUrl), depth: 0 }]
  const visited = new Set<string>()
  const pages: CrawlPage[] = []
  const root = new URL(startUrl)
  const crawlDeadline = Date.now() + maxDurationMs

  while (queue.length > 0 && pages.length < maxPages) {
    if (Date.now() > crawlDeadline) {
      console.warn('[Training Worker] Crawl deadline reached', { startUrl, pagesCollected: pages.length, queueRemaining: queue.length })
      break
    }
    const current = queue.shift()!
    const normalizedUrl = normalizeUrl(current.url)
    if (visited.has(normalizedUrl)) continue
    visited.add(normalizedUrl)

    let response: Response
    try {
      response = await fetchWithTimeout(normalizedUrl, {
        headers: {
          'User-Agent': 'ReplySuiteTrainingBot/1.0 (+https://replysuite.app)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      }, PAGE_FETCH_TIMEOUT_MS)
    } catch (error) {
      console.warn('[Training Worker] Timed out fetching crawl page', { normalizedUrl, error })
      continue
    }

    const contentType = response.headers.get('content-type') || ''
    if (!response.ok || !contentType.includes('text/html')) continue

    const html = await response.text()
    const text = extractReadableText(html)
    if (!text || text.length < 120) continue

    const title = extractTitle(html) || new URL(normalizedUrl).hostname
    pages.push({ url: normalizedUrl, title, text })
    if (onProgress) await onProgress(pages.length)

    if (current.depth >= 2) continue

    for (const link of extractLinks(html, normalizedUrl)) {
      if (pages.length + queue.length >= maxPages * 2) break
      if (!shouldVisitUrl(root, link)) continue
      const normalizedLink = normalizeUrl(link)
      if (!visited.has(normalizedLink)) {
        queue.push({ url: normalizedLink, depth: current.depth + 1 })
      }
    }
  }

  return dedupePages(pages)
}

function dedupePages(pages: CrawlPage[]) {
  const seenText = new Set<string>()
  return pages.filter((page) => {
    const fingerprint = page.text.slice(0, 600)
    if (seenText.has(fingerprint)) return false
    seenText.add(fingerprint)
    return true
  })
}

function normalizeUrl(value: string) {
  const url = new URL(value)
  url.hash = ''
  if (url.pathname.endsWith('/')) url.pathname = url.pathname.slice(0, -1) || '/'
  if (url.search.length > 200) url.search = ''
  return url.toString()
}

function shouldVisitUrl(root: URL, candidate: string) {
  try {
    const url = new URL(candidate)
    if (!['http:', 'https:'].includes(url.protocol)) return false
    if (url.hostname !== root.hostname) return false
    if (/\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|xml|zip|mp4|mp3|woff|woff2|ttf|eot|pdf)$/i.test(url.pathname)) return false
    if (/(\/wp-admin|\/login|\/signin|\/signup|\/cart|\/checkout|\/account|\/privacy|\/terms)/i.test(url.pathname)) return false
    return true
  } catch {
    return false
  }
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? cleanHtmlText(match[1]) : ''
}

function extractLinks(html: string, baseUrl: string) {
  const links = new Set<string>()
  const regex = /href=["']([^"'#]+)["']/gi
  let match: RegExpExecArray | null

  while ((match = regex.exec(html))) {
    try {
      const absolute = new URL(match[1], baseUrl).toString()
      links.add(absolute)
    } catch {
      // ignore invalid hrefs
    }
  }

  return Array.from(links)
}

function extractReadableText(html: string) {
  const mainMatch = html.match(/<(main|article)[^>]*>([\s\S]*?)<\/(main|article)>/i)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const raw = mainMatch?.[2] || bodyMatch?.[1] || html

  let cleaned = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<(nav|footer|header|aside|form)[\s\S]*?<\/(nav|footer|header|aside|form)>/gi, ' ')
    .replace(/<(h1|h2|h3|h4|h5|h6|p|li|section|article|div|br|tr|td|th)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

  cleaned = cleanHtmlText(cleaned)
  return normalizeText(cleaned)
}

function cleanHtmlText(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
}

function normalizeText(value: string) {
  return value
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function chunkText(text: string) {
  const normalized = normalizeText(text)
  if (!normalized) return [] as string[]

  const paragraphs = normalized.split(/\n\n+/).map((item) => item.trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph
      continue
    }

    if ((current + '\n\n' + paragraph).length <= TARGET_CHUNK_SIZE) {
      current += `\n\n${paragraph}`
      continue
    }

    chunks.push(current)
    const overlap = current.slice(Math.max(0, current.length - CHUNK_OVERLAP)).trim()
    current = overlap ? `${overlap}\n\n${paragraph}` : paragraph
  }

  if (current) chunks.push(current)

  return chunks
    .map((chunk) => chunk.slice(0, MAX_EMBED_INPUT).trim())
    .filter((chunk) => chunk.length > 40)
}

async function getEmbeddingsBatch(env: Env, texts: string[]) {
  const inputs = texts.map((text) => text.replace(/\n/g, ' ').slice(0, MAX_EMBED_INPUT))
  const models = ['text-embedding-004', 'embedding-001', 'gemini-embedding-2', 'gemini-embedding-001']
  let lastError = 'Unknown embedding error'

  for (const model of models) {
    try {
      const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${cleanEnvValue(env.GEMINI_API_KEY)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: inputs.map((input) => ({
            model: `models/${model}`,
            content: { parts: [{ text: input }] },
            outputDimensionality: 1536,
          })),
        }),
      }, EMBEDDING_TIMEOUT_MS)

      const data: any = await response.json()
      if (!response.ok || data?.error) {
        lastError = data?.error?.message || `HTTP ${response.status}`
        if (response.status === 429 || response.status >= 500 || isTransientEmbeddingError(lastError)) {
          throw new RetryLaterError(`Embedding provider temporarily unavailable: ${lastError}`)
        }
        continue
      }

      const embeddings = Array.isArray(data?.embeddings) ? data.embeddings : []
      if (embeddings.length !== inputs.length) {
        lastError = 'Batch embedding response length mismatch.'
        continue
      }

      return embeddings.map((item: any) => {
        const values = Array.isArray(item?.values) ? item.values : []
        if (!values.length) throw new Error('Embedding response had no values.')
        const magnitude = Math.sqrt(values.reduce((acc: number, val: number) => acc + val * val, 0)) || 1
        return values.map((val: number) => val / magnitude)
      })
    } catch (error: any) {
      if (error instanceof RetryLaterError) throw error
      lastError = error?.message || describeError(error) || 'Embedding request failed'
      if (isTransientEmbeddingError(lastError)) throw new RetryLaterError(`Embedding generation paused: ${lastError}`)
    }
  }

  throw new Error(`Embedding generation failed: ${lastError}`)
}
