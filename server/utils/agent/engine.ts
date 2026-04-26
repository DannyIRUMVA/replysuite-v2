import { TOOLS, TOOL_HANDLERS } from './registry'

export interface AgentOptions {
  systemPrompt: string
  enabledTools?: string[]
  chatbotId: string
  event: any
  context?: any
}

export const runAgentCycle = async (messages: any[], options: AgentOptions) => {
  const config = useRuntimeConfig()
  
  // Map UI feature flags to actual tool names
  const FEATURE_TOOL_MAP: Record<string, string[]> = {
    'orders': ['get_menu', 'place_order'],
    'appointments': ['book_appointment'],
    'payments': ['request_payment'],
    'invoices': ['generate_invoice']
  }

  // Expand the enabled tools
  const expandedEnabledTools = options.enabledTools 
    ? options.enabledTools.flatMap(feature => FEATURE_TOOL_MAP[feature] || [feature])
    : undefined
  
  const activeTools = TOOLS.map(t => ({
    function_declarations: t.function_declarations.filter(fd => 
      !expandedEnabledTools || expandedEnabledTools.includes(fd.name)
    )
  })).filter(t => t.function_declarations.length > 0)

  // 1. Try Gemini first
  try {
    return await runGeminiAgent(messages, options, activeTools, config)
  } catch (err: any) {
    console.warn('[Agent Fallback] Gemini cycle failed, trying Azure:', err.message)
    try {
      return await runAzureAgent(messages, options, activeTools, config)
    } catch (azureErr: any) {
      console.error('[Agent Error] Both Gemini and Azure failed:', azureErr.message)
      return 'I apologize, but I encountered an error while processing your request with our AI engines.'
    }
  }
}

async function runGeminiAgent(messages: any[], options: AgentOptions, activeTools: any[], config: any) {
  const apiKey = config.geminiApiKey
  if (!apiKey) throw new Error('Gemini API Key missing')

  let contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content || m.text || '' }]
  }))

  let iterations = 0
  const MAX_ITERATIONS = 5

  // Inject active tools into system prompt so the bot explicitly knows its capabilities
  let finalSystemPrompt = options.systemPrompt
  if (activeTools.length > 0) {
    const availableToolsList = activeTools.flatMap(t => t.function_declarations).map(fd => `- **${fd.name}**: ${fd.description}`).join('\n')
    finalSystemPrompt += `\n\n[ACTIVATED AGENT TOOLS]
You have access to the following tools:
${availableToolsList}

CRITICAL RULES FOR TOOLS:
1. Keep all responses EXTREMELY BRIEF and CONCISE (Preferably under 160 characters). Sound like a human, not a bot.
2. If a tool requires parameters (like phone number, quantity, date, etc.) that the user hasn't provided, you MUST ask the user for them FIRST before trying to call the tool.
3. For place_order: You need the exact 'product_id' (from get_menu), the 'qty' (quantity), and the 'customer_phone'. If the user says "I want to order X", reply by asking: "How many would you like, and what is your phone number for the order?"
4. For request_payment: Always ensure you have the order_id from place_order and the user's phone number.
5. DO NOT provide long explanations unless explicitly asked. Keep it snappy and natural.`
  }

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const payload: any = {
      system_instruction: { parts: [{ text: finalSystemPrompt }] },
      contents,
      tools: activeTools.length > 0 ? activeTools : undefined
    }

    // Using gemini-2.5-flash for the highest free tier limits, falling back to pro and 2.0.
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp']
    let response: any
    let data: any
    let success = false

    for (const model of models) {
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        data = await response.json()
        if (!data.error) {
          success = true
          break
        }
        console.warn(`[Gemini Agent] Model ${model} failed:`, data.error.message)
      } catch (err: any) {
        console.warn(`[Gemini Agent] Fetch failed for ${model}:`, err.message)
      }
    }

    if (!success) {
       throw new Error(`Gemini Error: ${data?.error?.message || 'All models failed'}`)
    }

    const candidate = data.candidates?.[0]
    const part = candidate?.content?.parts?.[0]

    if (part?.functionCall) {
      const { name, args } = part.functionCall
      console.log(`[Gemini Agent] Executing tool: ${name}`, args)
      
      const handler = TOOL_HANDLERS[name]
      if (handler) {
        const result = await handler(options.event, options.chatbotId, args, options.context)
        
        contents.push({ role: 'model', parts: [{ functionCall: part.functionCall }] })
        contents.push({ role: 'function', parts: [{ functionResponse: { name, response: { content: result } } }] })
        continue
      }
    }

    return part?.text || 'I am sorry, I encountered an error processing your request.'
  }
  return 'Processing limit reached.'
}

async function runAzureAgent(messages: any[], options: AgentOptions, activeTools: any[], config: any) {
  const apiKey = config.azureOpenAiKey
  const endpoint = config.azureOpenAiEndpoint
  const deployment = config.azureOpenAiDeploymentName
  if (!apiKey || !endpoint || !deployment) throw new Error('Azure credentials missing')

  const azureUrl = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`

function convertSchemaToLowercase(schema: any): any {
  if (Array.isArray(schema)) return schema.map(convertSchemaToLowercase)
  if (schema !== null && typeof schema === 'object') {
    const newObj: any = {}
    for (const key in schema) {
      if (key === 'type' && typeof schema[key] === 'string') {
        newObj[key] = schema[key].toLowerCase()
      } else {
        newObj[key] = convertSchemaToLowercase(schema[key])
      }
    }
    return newObj
  }
  return schema
}

// Convert Gemini tools to Azure/OpenAI format
const allFunctionDeclarations = activeTools.flatMap((t: any) => t.function_declarations || [])
const azureTools = allFunctionDeclarations.map((fd: any) => ({
  type: 'function',
  function: {
    name: fd.name,
    description: fd.description,
    parameters: fd.parameters ? convertSchemaToLowercase(fd.parameters) : undefined
  }
}))

  let finalSystemPrompt = options.systemPrompt
  if (azureTools.length > 0) {
    const availableToolsList = allFunctionDeclarations.map((fd: any) => `- **${fd.name}**: ${fd.description}`).join('\n')
    finalSystemPrompt += `\n\n[ACTIVATED AGENT TOOLS]
You have access to the following tools:
${availableToolsList}

CRITICAL RULES FOR TOOLS:
1. Keep all responses EXTREMELY BRIEF and CONCISE (Preferably under 160 characters). Sound like a human, not a bot.
2. If a tool requires parameters (like phone number, quantity, date, etc.) that the user hasn't provided, you MUST ask the user for them FIRST before trying to call the tool.
3. DO NOT provide long explanations unless explicitly asked. Keep it snappy and natural.`
  }

  let azureMessages = [
    { role: 'system', content: finalSystemPrompt },
    ...messages.map(m => ({
      role: m.role || 'user',
      content: m.content || m.text || ''
    }))
  ]

  let iterations = 0
  const MAX_ITERATIONS = 5

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: azureMessages,
        tools: azureTools?.length > 0 ? azureTools : undefined,
        tool_choice: azureTools?.length > 0 ? 'auto' : undefined
      })
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)

    const choice = data.choices?.[0]
    const message = choice?.message

    if (message?.tool_calls) {
      azureMessages.push(message)
      
      for (const toolCall of message.tool_calls) {
        const { name, arguments: argsString } = toolCall.function
        const args = JSON.parse(argsString)
        console.log(`[Azure Agent] Executing tool: ${name}`, args)

        const handler = TOOL_HANDLERS[name]
        const result = handler ? await handler(options.event, options.chatbotId, args, options.context) : { error: 'Tool not found' }

        azureMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        })
      }
      continue
    }

    return message?.content || 'I am sorry, I encountered an error processing your request.'
  }
  return 'Processing limit reached.'
}
