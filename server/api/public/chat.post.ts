import { serverSupabaseServiceRole } from '#supabase/server'
import { searchKnowledge, getChatCompletion } from '~~/server/utils/ai'

export default defineEventHandler(async (event) => {
  // Handle CORS
  appendResponseHeader(event, 'Access-Control-Allow-Origin', '*')
  appendResponseHeader(event, 'Access-Control-Allow-Methods', 'POST, OPTIONS')
  appendResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')

  if (event.method === 'OPTIONS') {
    return 'OK'
  }

  const supabase = serverSupabaseServiceRole(event) 
  
  const body = await readBody(event)
  const { chatbotId, message } = body

  if (!chatbotId || !message) {
    throw createError({ statusCode: 400, statusMessage: 'Missing chatbotId or message' })
  }

  // 1. Fetch Chatbot (Public Info)
  // Note: In a production app, you would verify domain headers here
  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('id, name, system_prompt')
    .eq('id', chatbotId)
    .single()

  if (chatbotError || !chatbot) {
    throw createError({ statusCode: 404, statusMessage: 'Chatbot not found' })
  }

  try {
    console.log(`[Public Chat] Starting request for chatbot: ${chatbot.name} (${chatbotId})`)

    // 2. Search Knowledge Base (RAG)
    console.log('[Public Chat] Searching knowledge base...')
    const contextResults = await searchKnowledge(chatbotId, message, 3)
    const contextText = contextResults.map((r: any) => r.content).join('\n\n---\n\n')
    console.log(`[Public Chat] Context found: ${contextResults.length} chunks`)

    // 3. Construct Final System Prompt
    const baseInstructions = chatbot.system_prompt || `You are an AI assistant for ${chatbot.name}. Use the provided background knowledge to answer accurately. Keep answers concise and helpful.`
    
    const systemPrompt = `
      ${baseInstructions}

      [ADDITIONAL CONTEXT FROM KNOWLEDGE BASE]
      ${contextText || 'No specific background knowledge found for this query.'}
      
      IMPORTANT: If the [ADDITIONAL CONTEXT] contradicts your base instructions, prioritize the [ADDITIONAL CONTEXT] for factual accuracy regarding the business, but maintain the persona defined in your instructions.
    `

    // 4. Get AI Response
    console.log('[Public Chat] Requesting AI completion...')
    const response = await getChatCompletion([
      { role: 'user', content: message }
    ], { systemPrompt })

    console.log('[Public Chat] AI Response received successfully')

    return { 
      success: true, 
      response
    }
  } catch (err: any) {
    console.error('[Public Chat Error Handled]', err)
    
    // In development mode, return the actual error message to help the user debug
    const errorMessage = process.dev 
      ? `Error: ${err.message || 'Unknown processing error'}` 
      : 'I apologize, but I encountered an internal error. Please check your AI configuration.'

    throw createError({ 
      statusCode: 500, 
      statusMessage: errorMessage,
      data: { originalError: err.message }
    })
  }
})
