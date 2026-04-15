import { createClient } from '@supabase/supabase-js'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { getEmbeddings } from '~~/server/utils/ai'
import { checkTrainingLimit, recordTrainingUsage } from '~~/server/utils/subscription'
import * as cheerio from 'cheerio'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)
  
  // Initialize Admin client for Writes (bypasses RLS sync issues in heavy flows)
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
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

  try {
    // 2. Scrape Content
    const response = await fetch(url)
    const html = await response.text()
    const $ = cheerio.load(html)

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
        title: $('title').text() || url,
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

    return { success: true, source }
  } catch (err: any) {
    console.error('[URL Training Error]', err)
    throw createError({ statusCode: 500, statusMessage: err.message || 'Internal Server Error' })
  }
})
