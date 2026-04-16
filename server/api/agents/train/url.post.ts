import { createClient } from '@supabase/supabase-js'
import { serverSupabaseClient, serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { getEmbeddings } from '~~/server/utils/ai'
import { checkTrainingLimit, recordTrainingUsage, getUserSubscriptionLimits } from '~~/server/utils/subscription'
import * as cheerio from 'cheerio'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)
  
  const supabaseAdmin = serverSupabaseServiceRole(event)
  
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const { chatbotId, url } = body

  if (!chatbotId || !url) {
    throw createError({ statusCode: 400, statusMessage: 'Missing chatbotId or url' })
  }

  // 1. Verify ownership via USER client (respects RLS)
  // This ensures the current user actually owns the agent.
  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('*, user_id')
    .eq('id', chatbotId)
    .maybeSingle()

  if (chatbotError) {
    console.error('[URL Training Debug] Supabase error during chatbot lookup:', chatbotError)
    throw createError({ statusCode: 500, statusMessage: 'Database query failed' })
  }

  if (!chatbot) {
    console.error('[URL Training Debug] Chatbot not found or RLS denied access:', { 
      queriedId: chatbotId,
      queriedUserId: user.id
    })
    throw createError({ statusCode: 404, statusMessage: 'Agent not found or access denied' })
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
      meta: { type: 'url', url }
    })
    .select()
    .single()

  try {
    // 2. Scrape Content
    const response = await fetch(url)
    const html = await response.text()
    const $ = cheerio.load(html)
    const title = $('title').text() || url

    // Remove scripts, styles and nav elements
    $('script, style, nav, footer, header').remove()
    
    // Extract main text content
    const rawText = $('body').text().replace(/\s+/g, ' ').trim()
    
    // Chunking: Simple chunking into 4000 character blocks
    const chunks = []
    for (let i = 0; i < rawText.length; i += 4000) {
      chunks.push(rawText.substring(i, i + 4000))
    }

    const sourceData = {
      chatbot_id: chatbotId,
      user_id: user.id,
      type: 'url',
      metadata: { 
        url, 
        title,
        chunk_count: chunks.length 
      },
      content_text: rawText,
      status: 'completed'
    }

    // 3. Create Data Source record using ADMIN client
    const { data: source, error: sourceError } = await supabaseAdmin
      .from('data_sources')
      .insert(sourceData)
      .select()
      .single()

    if (sourceError) throw sourceError

    // 4. Process Embeddings for each chunk sequentially (to avoid rate limits)
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

    // 5. Update Chatbot tracking using ADMIN client
    const contentSizeMB = totalSize / (1024 * 1024)
    await supabaseAdmin
      .from('chatbots')
      .update({ 
        current_embedding_mb: (Number(chatbot.current_embedding_mb || 0) + contentSizeMB).toFixed(4)
      })
      .eq('id', chatbotId)

    // 6. Record usage (count of embeddings created)
    await recordTrainingUsage(event, chatbotId, user.id, chunks.length)

    // 7. Finalize Job
    if (job) {
      await supabaseAdmin
        .from('training_jobs')
        .update({ 
          status: 'finished', 
          finished_at: new Date().toISOString(),
          meta: { ...job.meta as any, title, chunk_count: chunks.length }
        })
        .eq('id', job.id)
    }

    return { success: true, source }
  } catch (err: any) {
    console.error('[URL Training Error]', err)
    
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
