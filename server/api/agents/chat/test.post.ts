import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { searchKnowledge, getChatCompletion } from '~~/server/utils/ai'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)
  
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const { chatbotId, message } = body

  if (!chatbotId || !message) {
    throw createError({ statusCode: 400, statusMessage: 'Missing chatbotId or message' })
  }

  // 1. Verify ownership (respects RLS)
  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('*, user_id')
    .eq('id', chatbotId)
    .maybeSingle()

  if (chatbotError || !chatbot) {
    throw createError({ statusCode: 404, statusMessage: 'Chatbot not found or access denied' })
  }

  try {
    // 2. Search Knowledge Base (RAG)
    const contextResults = await searchKnowledge(chatbotId, message, 3)
    const contextText = contextResults.map((r: any) => r.content).join('\n\n---\n\n')

    // 3. Construct System Prompt with Knowledge
    const systemPrompt = `
      You are an AI assistant for ${chatbot.name}. 
      Use the provided background knowledge to answer accurately.
      If you don't know the answer, say you're not sure but I can help with other things.
      Keep answers concise and helpful.

      [BACKGROUND KNOWLEDGE]
      ${contextText || 'No specific background knowledge found for this query.'}
    `

    // 4. Get AI Response
    const response = await getChatCompletion([
      { role: 'user', content: message }
    ], { systemPrompt })

    return { 
      success: true, 
      response,
      hasContext: contextResults.length > 0,
      contextCount: contextResults.length
    }
  } catch (err: any) {
    console.error('[Chat Test Error]', err)
    throw createError({ statusCode: 500, statusMessage: err.message || 'AI processing failed' })
  }
})
