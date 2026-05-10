import { createClient } from '@supabase/supabase-js'
import pdf from 'pdf-parse-fork'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  GEMINI_API_KEY: string
  TRAINING_WORKER_SECRET: string
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

const MAX_TEXT_CONTENT = 600_000
const MAX_EMBED_INPUT = 8_000
const TARGET_CHUNK_SIZE = 1200
const CHUNK_OVERLAP = 180
const PAGE_FETCH_TIMEOUT_MS = 12_000
const EMBEDDING_TIMEOUT_MS = 30_000
const MAX_CRAWL_DURATION_MS = 90_000
const EMBEDDING_BATCH_SIZE = 8

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
        return Response.json({ accepted: true, jobId, started: true })
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
  await supabase.from('training_jobs').update(patch).eq('id', jobId)
}

async function updateSource(env: Env, sourceId: string, patch: Record<string, unknown>) {
  const supabase = getSupabase(env)
  await supabase.from('data_sources').update(patch).eq('id', sourceId)
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

  await updateJob(env, jobId, {
    status: 'processing',
    progress: 3,
    progress_label: 'Worker started',
    error_message: null,
    finished_at: null,
    started_at: new Date().toISOString(),
  })

  return { started: true as const, job }
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
  const maxPages = getMaxPagesForPlan(planSlug)

  await updateJob(env, job.id, {
    progress: 10,
    progress_label: `Crawling website (${maxPages} page max)`,
  })

  const pages = await crawlWebsite(startUrl, maxPages, async (count) => {
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
    .slice(0, MAX_TEXT_CONTENT)

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
  if (!storagePath) throw new Error('PDF source is missing storage_path.')

  await updateJob(env, job.id, {
    progress: 15,
    progress_label: 'Downloading PDF asset',
  })

  const { data: fileData, error: downloadError } = await supabase.storage.from('training-assets').download(storagePath)
  if (downloadError || !fileData) {
    throw new Error(downloadError?.message || 'Failed to download PDF asset.')
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer())

  await updateJob(env, job.id, {
    progress: 30,
    progress_label: 'Extracting PDF text',
  })

  const pdfData = await pdf(Buffer.from(bytes))
  const rawText = normalizeText(pdfData.text)
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

  await updateJob(env, job.id, {
    progress: 45,
    progress_label: `Embedding ${chunks.length} chunk${chunks.length === 1 ? '' : 's'}`,
  })

  await supabase.from('embeddings').delete().eq('source_id', source.id)

  const totalBytes = new TextEncoder().encode(rawText).length
  let processed = 0

  for (let index = 0; index < chunks.length; index += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(index, index + EMBEDDING_BATCH_SIZE)
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

    const { error: embedError } = await supabase.from('embeddings').insert(rows)
    if (embedError) {
      throw new Error(embedError.message || 'Failed to insert embedding chunk batch.')
    }

    processed += batch.length
    await updateJob(env, job.id, {
      progress: Math.min(92, 45 + Math.round((processed / chunks.length) * 45)),
      progress_label: `Embedded ${processed}/${chunks.length} chunks`,
    })
  }

  const contentSizeMB = totalBytes / (1024 * 1024)

  const { data: chatbot } = await supabase
    .from('chatbots')
    .select('current_embedding_mb')
    .eq('id', job.chatbot_id)
    .maybeSingle<{ current_embedding_mb: number | null }>()

  await supabase
    .from('chatbots')
    .update({
      current_embedding_mb: (Number(chatbot?.current_embedding_mb || 0) + contentSizeMB).toFixed(4),
    })
    .eq('id', job.chatbot_id)

  await recordTrainingUsage(supabase, job.chatbot_id, job.user_id, 1)

  await updateSource(env, source.id, {
    status: 'completed',
    content_text: rawText.slice(0, MAX_TEXT_CONTENT),
    data_size_bytes: totalBytes,
    metadata: {
      ...(source.metadata || {}),
      ...(options.sourceStatusMeta || {}),
      processed_at: new Date().toISOString(),
    },
  })

  await updateJob(env, job.id, {
    status: 'finished',
    progress: 100,
    progress_label: 'Training complete',
    error_message: null,
    meta: {
      ...(job.meta || {}),
      chunk_count: chunks.length,
      source_id: source.id,
      completed_at: new Date().toISOString(),
    },
    finished_at: new Date().toISOString(),
  })

  if (options.cleanupStoragePath) {
    await supabase.storage.from('training-assets').remove([options.cleanupStoragePath]).catch(() => null)
  }
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

function getMaxPagesForPlan(planSlug: string) {
  if (planSlug === 'enterprise-ready') return 40
  if (planSlug === 'gold') return 16
  if (planSlug === 'silver') return 8
  return 4
}

async function crawlWebsite(startUrl: string, maxPages: number, onProgress?: (count: number) => Promise<void>) {
  const queue: Array<{ url: string; depth: number }> = [{ url: normalizeUrl(startUrl), depth: 0 }]
  const visited = new Set<string>()
  const pages: CrawlPage[] = []
  const root = new URL(startUrl)
  const crawlDeadline = Date.now() + MAX_CRAWL_DURATION_MS

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
    .map((chunk) => chunk.slice(0, MAX_TEXT_CONTENT).trim())
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
      lastError = error?.message || describeError(error) || 'Embedding request failed'
    }
  }

  throw new Error(`Embedding generation failed: ${lastError}`)
}
