import { createClient } from '@supabase/supabase-js'
import { serverSupabaseClient, serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { getEmbeddings } from '~~/server/utils/ai'
import { checkTrainingLimit, recordTrainingUsage, getUserSubscriptionLimits } from '~~/server/utils/subscription'
import pdf from 'pdf-parse-fork'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  const supabaseAdmin = serverSupabaseServiceRole(event)
  
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const formData = await readMultipartFormData(event)
  if (!formData) throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })

  const file = formData.find(f => f.name === 'file')
  const chatbotId = formData.find(f => f.name === 'chatbotId')?.data.toString()

  if (!file || !chatbotId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing file or chatbotId' })
  }

  // 1. Verify ownership via USER client (respects RLS)
  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('*, user_id')
    .eq('id', chatbotId)
    .maybeSingle()

  if (chatbotError || !chatbot) {
    throw createError({ statusCode: 404, statusMessage: 'Chatbot not found or access denied' })
  }

  // Check training limit
  const canTrain = await checkTrainingLimit(event, chatbotId, user.id)
  if (!canTrain) {
    throw createError({ statusCode: 403, statusMessage: 'Monthly training limit reached for this agent.' })
  }

  // 1a. Check Capacity limit (Vector Capacity)
  const limits = await getUserSubscriptionLimits(event, user.id)
  const currentSizeMB = Number(chatbot.current_embedding_mb || 0)
  if (currentSizeMB >= limits.max_embedding_mb) {
    throw createError({ 
      statusCode: 403, 
      statusMessage: `Vector capacity reached (${limits.max_embedding_mb}MB). Please remove existing knowledge sources to add more.` 
    })
  }

  // 1b. Create Training Job record
  const { data: job } = await supabaseAdmin
    .from('training_jobs')
    .insert({
      chatbot_id: chatbotId,
      user_id: user.id,
      status: 'processing',
      meta: { type: 'file', filename: file.filename }
    })
    .select()
    .single()

  try {
    // 2. Extract Text from PDF
    const pdfData = await pdf(file.data)
    const rawText = pdfData.text.replace(/\s+/g, ' ').trim()

    // 3. Chunking (4000 chars per chunk)
    const chunks = []
    for (let i = 0; i < rawText.length; i += 4000) {
      chunks.push(rawText.substring(i, i + 4000))
    }

    const sourceData = {
      chatbot_id: chatbotId,
      user_id: user.id,
      type: 'file',
      metadata: { 
        filename: file.filename,
        content_type: file.type,
        pages: pdfData.numpages,
        chunk_count: chunks.length 
      },
      content_text: rawText,
      status: 'completed',
      data_size_bytes: file.data.length
    }

    // 4. Create Data Source record using ADMIN client
    const { data: source, error: sourceError } = await supabaseAdmin
      .from('data_sources')
      .insert(sourceData)
      .select()
      .single()

    if (sourceError) throw sourceError

    // 5. Process Embeddings sequentially (to avoid rate limits)
    let totalSize = 0
    for (const chunk of chunks) {
      const vector = await getEmbeddings(chunk)
      totalSize += new TextEncoder().encode(chunk).length
      
      const { error: insertError } = await supabaseAdmin
        .from('embeddings')
        .insert({
          chatbot_id: chatbotId,
          content: chunk,
          vec: vector,
          token_count: Math.ceil(chunk.length / 4)
        })

      if (insertError) throw insertError
    }

    // 6. Update Chatbot tracking using ADMIN client
    const contentSizeMB = totalSize / (1024 * 1024)
    await supabaseAdmin
      .from('chatbots')
      .update({ 
        current_embedding_mb: (Number(chatbot.current_embedding_mb || 0) + contentSizeMB).toFixed(4)
      })
      .eq('id', chatbotId)

    // 7. Record usage
    await recordTrainingUsage(event, chatbotId, user.id, chunks.length)

    // 8. Finalize Job
    if (job) {
      await supabaseAdmin
        .from('training_jobs')
        .update({ 
          status: 'finished', 
          finished_at: new Date().toISOString(),
          meta: { ...job.meta as any, pages: pdfData.numpages, chunk_count: chunks.length }
        })
        .eq('id', job.id)
    }

    return { success: true, source }

  } catch (err: any) {
    console.error('[File Training Error]', err)
    
    // Update job to failed
    if (job) {
      await supabaseAdmin
        .from('training_jobs')
        .update({ 
          status: 'failed', 
          meta: { ...job.meta as any, error: err.message } 
        })
        .eq('id', job.id)
    }

    throw createError({ statusCode: 500, statusMessage: err.message || 'Error processing PDF' })
  }
})
