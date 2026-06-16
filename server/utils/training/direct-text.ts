import type { H3Event } from 'h3'
import { buildEmbeddingsRequest } from '~~/server/utils/ai-provider'
import { normalizeEmbedding } from '~~/server/utils/ai'

const MAX_EMBED_INPUT = 8_000
const TARGET_CHUNK_SIZE = 1200
const CHUNK_OVERLAP = 180
const INLINE_EMBEDDING_BATCH_SIZE = 16
const MAX_INLINE_TEXT_CHARS = 120_000

type SupabaseAdmin = any

const normalizeText = (value: string) => value
  .replace(/\r/g, '\n')
  .replace(/\t/g, ' ')
  .replace(/[ ]{2,}/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

const chunkText = (text: string) => {
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

const getEmbeddingsBatch = async (event: H3Event, texts: string[]) => {
  const config = useRuntimeConfig(event)
  const embeddingRequest = buildEmbeddingsRequest(config)
  const body: Record<string, any> = {
    input: texts.map((text) => text.replace(/\n/g, ' ').slice(0, MAX_EMBED_INPUT)),
    dimensions: embeddingRequest.dimensions,
  }

  if (embeddingRequest.usesV1Api) {
    body.model = embeddingRequest.model
  }

  const response = await fetch(embeddingRequest.url, {
    method: 'POST',
    headers: embeddingRequest.headers,
    body: JSON.stringify(body),
  })

  const data: any = await response.json().catch(() => ({}))
  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || `Embedding request failed with HTTP ${response.status}`)
  }

  const embeddings = data?.data
  if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
    throw new Error('Embedding response did not match requested chunk count.')
  }

  return embeddings
    .sort((a: any, b: any) => Number(a.index || 0) - Number(b.index || 0))
    .map((item: any) => {
      if (!Array.isArray(item.embedding) || !item.embedding.length) {
        throw new Error('Embedding response included an empty vector.')
      }
      return normalizeEmbedding(item.embedding)
    })
}

const updateJob = async (supabase: SupabaseAdmin, jobId: string, patch: Record<string, unknown>) => {
  const { error } = await supabase.from('training_jobs').update(patch).eq('id', jobId)
  if (error) throw new Error(error.message || 'Failed to update training job.')
}

const updateSource = async (supabase: SupabaseAdmin, sourceId: string, patch: Record<string, unknown>) => {
  const { error } = await supabase.from('data_sources').update(patch).eq('id', sourceId)
  if (error) throw new Error(error.message || 'Failed to update data source.')
}

const refreshChatbotEmbeddingSize = async (supabase: SupabaseAdmin, chatbotId: string) => {
  const { data, error } = await supabase
    .from('data_sources')
    .select('data_size_bytes')
    .eq('chatbot_id', chatbotId)
    .eq('status', 'completed')

  if (error) {
    console.warn('[Direct Text Training] Failed to refresh chatbot embedding size', { chatbotId, error: error.message })
    return
  }

  const totalBytes = (data || []).reduce((sum: number, item: any) => sum + Number(item.data_size_bytes || 0), 0)
  await supabase
    .from('chatbots')
    .update({ current_embedding_mb: (totalBytes / (1024 * 1024)).toFixed(4) })
    .eq('id', chatbotId)
}

const recordTrainingUsage = async (supabase: SupabaseAdmin, chatbotId: string, userId: string, count = 1) => {
  const monthYear = new Date().toISOString().slice(0, 7)
  const { data: existing } = await supabase
    .from('training_usage')
    .select('id, training_count')
    .eq('chatbot_id', chatbotId)
    .eq('month_year', monthYear)
    .maybeSingle()

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

export const processTextTrainingInline = async (
  event: H3Event,
  supabase: SupabaseAdmin,
  input: {
    jobId: string
    sourceId: string
    chatbotId: string
    userId: string
    content: string
    title?: string
  }
) => {
  const startedAt = new Date().toISOString()
  const rawText = normalizeText(input.content).slice(0, MAX_INLINE_TEXT_CHARS)
  const title = input.title?.trim() || 'Manual Entry'

  try {
    await updateJob(supabase, input.jobId, {
      status: 'processing',
      progress: 15,
      progress_label: 'Preparing custom text',
      error_message: null,
      started_at: startedAt,
      finished_at: null,
    })
    await updateSource(supabase, input.sourceId, { status: 'processing' })

    const chunks = chunkText(rawText).map((content, index) => ({
      content,
      chunkIndex: index,
      metadata: {
        title,
        type: 'text',
        origin: 'custom-text',
      },
    }))

    if (!chunks.length) throw new Error('No usable text chunks were produced.')

    await updateJob(supabase, input.jobId, {
      progress: 35,
      progress_label: `Embedding ${chunks.length} custom text chunk${chunks.length === 1 ? '' : 's'}`,
    })

    await supabase.from('embeddings').delete().eq('source_id', input.sourceId)

    for (let index = 0; index < chunks.length; index += INLINE_EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(index, index + INLINE_EMBEDDING_BATCH_SIZE)
      const vectors = await getEmbeddingsBatch(event, batch.map((chunk) => chunk.content))
      const rows = batch.map((chunk, batchIndex) => ({
        chatbot_id: input.chatbotId,
        source_id: input.sourceId,
        content: chunk.content,
        vec: vectors[batchIndex],
        token_count: Math.ceil(chunk.content.length / 4),
        chunk_index: chunk.chunkIndex,
        metadata: chunk.metadata,
      }))

      const { error: embedError } = await supabase
        .from('embeddings')
        .upsert(rows, { onConflict: 'source_id,chunk_index' })

      if (embedError) throw new Error(embedError.message || 'Failed to upsert custom text embeddings.')

      const processed = Math.min(index + batch.length, chunks.length)
      await updateJob(supabase, input.jobId, {
        status: 'processing',
        progress: Math.min(90, 35 + Math.round((processed / chunks.length) * 55)),
        progress_label: `Embedded ${processed}/${chunks.length} chunks`,
      })
    }

    const totalBytes = new TextEncoder().encode(rawText).length
    await updateSource(supabase, input.sourceId, {
      status: 'completed',
      content_text: rawText,
      data_size_bytes: totalBytes,
      metadata: {
        title,
        origin: 'custom-text',
        chunk_count: chunks.length,
        content_type: 'text/plain',
        processed_at: new Date().toISOString(),
      },
    })

    await refreshChatbotEmbeddingSize(supabase, input.chatbotId)
    await recordTrainingUsage(supabase, input.chatbotId, input.userId, 1)

    await updateJob(supabase, input.jobId, {
      status: 'finished',
      progress: 100,
      progress_label: 'Training complete',
      error_message: null,
      meta: {
        type: 'text',
        title,
        source_id: input.sourceId,
        chunk_count: chunks.length,
        completed_at: new Date().toISOString(),
        processor: 'replysuite-inline',
        embedding_provider: String(useRuntimeConfig(event).aiEmbeddingProvider || 'azure'),
        embedding_model: String(useRuntimeConfig(event).azureOpenAiEmbeddingDeploymentName || useRuntimeConfig(event).openAiEmbeddingModel || 'text-embedding-3-large'),
        embedding_dimensions: Number(useRuntimeConfig(event).azureOpenAiEmbeddingDimensions || useRuntimeConfig(event).openAiEmbeddingDimensions || 1536),
      },
      finished_at: new Date().toISOString(),
    })

    return { chunkCount: chunks.length }
  } catch (error: any) {
    const message = error?.message || 'Text training failed.'
    console.error('[Direct Text Training] Failed:', { jobId: input.jobId, sourceId: input.sourceId, error: message })
    await supabase.from('training_jobs').update({
      status: 'failed',
      progress_label: 'Training failed',
      error_message: message,
      finished_at: new Date().toISOString(),
    }).eq('id', input.jobId)
    await supabase.from('data_sources').update({ status: 'failed' }).eq('id', input.sourceId)
    throw error
  }
}
