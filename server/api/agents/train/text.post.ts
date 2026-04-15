import { createClient } from '@supabase/supabase-js'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { getEmbeddings } from '~~/server/utils/ai'
import { checkTrainingLimit, recordTrainingUsage } from '~~/server/utils/subscription'

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
  const { chatbotId, content, title } = body

  if (!chatbotId || !content) {
    throw createError({ statusCode: 400, statusMessage: 'Missing chatbotId or content' })
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

    return { success: true, source }
  } catch (err: any) {
    console.error('[Training Error]', err)
    throw createError({ statusCode: 500, statusMessage: err.message || 'Internal Server Error' })
  }
})
