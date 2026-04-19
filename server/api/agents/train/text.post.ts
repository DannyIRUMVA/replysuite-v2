import { createClient } from '@supabase/supabase-js'
import { serverSupabaseClient, serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { getEmbeddings } from '~~/server/utils/ai'
import { checkTrainingLimit, recordTrainingUsage, getUserSubscriptionLimits } from '~~/server/utils/subscription'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  const supabaseAdmin = serverSupabaseServiceRole(event)
  
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const { chatbotId, content, title } = body

  if (!chatbotId || !content) {
    throw createError({ statusCode: 400, statusMessage: 'Missing chatbotId or content' })
  }

  const userId = (user as any)?.id || (user as any)?.sub
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized - Missing User ID' })

  // 1. Verify ownership via USER client (respects RLS)
  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('*, user_id')
    .eq('id', chatbotId)
    .maybeSingle()

  if (chatbotError) {
    console.error('[Text Training Debug] Supabase error during chatbot lookup:', chatbotError)
    throw createError({ statusCode: 500, statusMessage: 'Database query failed' })
  }

  if (!chatbot) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found or access denied' })
  }

  // Check training limit
  const canTrain = await checkTrainingLimit(event, chatbotId, userId)
  if (!canTrain) {
    throw createError({ statusCode: 403, statusMessage: 'Monthly training limit reached for this agent.' })
  }

  // 1a. Check Capacity limit (Vector Capacity)
  const limits = await getUserSubscriptionLimits(event, userId)
  const currentSizeMB = Number(chatbot.current_embedding_mb || 0)
  if (currentSizeMB >= limits.max_embedding_mb) {
    throw createError({ 
      statusCode: 403, 
      statusMessage: `Vector capacity reached (${limits.max_embedding_mb}MB). Please remove existing knowledge sources to add more.` 
    })
  }

  // 1b. Create Training Job record
  const { data: job, error: jobError } = await supabaseAdmin
    .from('training_jobs')
    .insert({
      chatbot_id: chatbotId,
      user_id: userId,
      status: 'processing',
      meta: { type: 'text', title: title || 'Manual Entry' }
    })
    .select()
    .single()

  if (jobError) {
    console.error('[Text Training] Failed to insert job:', jobError)
    throw createError({ statusCode: 500, statusMessage: 'Internal DB Error: Missing tables or columns' })
  }

  try {
    // 2. Process Embedding
    const vector = await getEmbeddings(content)

    // 3. Create Data Source record using ADMIN client
    const sourceData = {
      chatbot_id: chatbotId,
      user_id: user.id,
      type: 'text',
      metadata: { title: title || 'Manual Entry' },
      content_text: content,
      status: 'completed'
    }

    const { data: source, error: sourceError } = await supabaseAdmin
      .from('data_sources')
      .insert(sourceData)
      .select()
      .single()

    if (sourceError) throw sourceError

    // 4. Store Embedding using ADMIN client
    const { error: embedError } = await supabaseAdmin
      .from('embeddings')
      .insert({
        chatbot_id: chatbotId,
        content: content,
        vec: vector,
        token_count: Math.ceil(content.length / 4) // Rough estimate
      })

    if (embedError) throw embedError

    // 5. Update Chatbot tracking using ADMIN client
    const contentSizeMB = (new TextEncoder().encode(content).length) / (1024 * 1024)
    await supabaseAdmin
      .from('chatbots')
      .update({ 
        current_embedding_mb: (Number(chatbot.current_embedding_mb || 0) + contentSizeMB).toFixed(4)
      })
      .eq('id', chatbotId)

    // 6. Record usage
    await recordTrainingUsage(event, chatbotId, user.id, 1)

    // 7. Finalize Job
    if (job) {
      await supabaseAdmin
        .from('training_jobs')
        .update({ 
          status: 'finished', 
          finished_at: new Date().toISOString(),
          meta: { ...job.meta as any, content_length: content.length }
        })
        .eq('id', job.id)
    }

    return { success: true, source }
  } catch (err: any) {
    console.error('[Training Error]', err)
    
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

    throw createError({ statusCode: 500, statusMessage: err.message || 'Internal Server Error' })
  }
})
