import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { getChatCompletion } from '~~/server/utils/ai'
import { isUuid } from '~~/server/utils/public-chatbot'

type ConversationAnalysis = {
  summary: string
  topIntents: string[]
  painPoints: string[]
  agentStrengths: string[]
  missedOpportunities: string[]
  actionItems: string[]
}

function extractJsonObject(input: string) {
  const trimmed = input.trim()

  try {
    return JSON.parse(trimmed)
  } catch {}

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim())
    } catch {}
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1))
    } catch {}
  }

  throw new Error('Failed to parse analyzer response')
}

function sanitizeAnalysis(raw: any): ConversationAnalysis {
  const toList = (value: any) => Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
    : []

  return {
    summary: String(raw?.summary || '').trim() || 'No meaningful conversation pattern was detected yet.',
    topIntents: toList(raw?.topIntents),
    painPoints: toList(raw?.painPoints),
    agentStrengths: toList(raw?.agentStrengths),
    missedOpportunities: toList(raw?.missedOpportunities),
    actionItems: toList(raw?.actionItems)
  }
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const chatbotId = typeof body?.chatbotId === 'string' ? body.chatbotId : ''

  if (!isUuid(chatbotId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid chatbotId' })
  }

  const supabase = await serverSupabaseClient(event)
  const supabaseAdmin = serverSupabaseServiceRole(event)

  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('id, name, system_prompt')
    .eq('id', chatbotId)
    .maybeSingle()

  if (chatbotError || !chatbot) {
    throw createError({ statusCode: 404, statusMessage: 'Chatbot not found or access denied' })
  }

  const { data: sessions, error: sessionsError } = await supabaseAdmin
    .from('chat_sessions')
    .select(`
      id,
      created_at,
      metadata,
      chat_messages (
        role,
        content,
        created_at
      )
    `)
    .eq('chatbot_id', chatbotId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (sessionsError) {
    console.error('[Conversation Analyzer] Failed to load sessions', sessionsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load conversations for analysis' })
  }

  const normalizedSessions = (sessions || []).map((session: any) => ({
    id: session.id,
    created_at: session.created_at,
    metadata: session.metadata || {},
    messages: (session.chat_messages || [])
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-8)
      .map((message: any) => ({
        role: message.role,
        content: String(message.content || '').replace(/\s+/g, ' ').trim().slice(0, 400),
        created_at: message.created_at
      }))
  })).filter((session: any) => session.messages.length > 0)

  const totalSessions = normalizedSessions.length
  const totalMessages = normalizedSessions.reduce((sum: number, session: any) => sum + session.messages.length, 0)

  const channelCounts = normalizedSessions.reduce((acc: Record<string, number>, session: any) => {
    const type = String(session.metadata?.type || 'web').toLowerCase()
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  if (!normalizedSessions.length) {
    return {
      meta: {
        chatbotId,
        chatbotName: chatbot.name,
        sessionsAnalyzed: 0,
        messagesAnalyzed: 0,
        channels: channelCounts
      },
      analysis: {
        summary: 'No conversations found yet for this agent. Once conversations come in, the analyzer can summarize themes, customer pain points, and improvement opportunities.',
        topIntents: [],
        painPoints: [],
        agentStrengths: [],
        missedOpportunities: [],
        actionItems: []
      }
    }
  }

  const transcript = normalizedSessions.map((session: any, index: number) => {
    const contact = session.metadata?.username || session.metadata?.phone || 'Anonymous visitor'
    const channel = String(session.metadata?.type || 'web').toUpperCase()
    const startedAt = new Date(session.created_at).toISOString()
    const lines = session.messages.map((message: any) => `${message.role.toUpperCase()}: ${message.content}`).join('\n')

    return [
      `Conversation ${index + 1}`,
      `Channel: ${channel}`,
      `Contact: ${contact}`,
      `Started: ${startedAt}`,
      lines
    ].join('\n')
  }).join('\n\n---\n\n')

  const systemPrompt = `You are a customer support QA and conversation analyst for ReplySuite.
Return STRICT JSON only with this exact shape:
{
  "summary": "string",
  "topIntents": ["string"],
  "painPoints": ["string"],
  "agentStrengths": ["string"],
  "missedOpportunities": ["string"],
  "actionItems": ["string"]
}
Rules:
- No markdown
- No commentary outside JSON
- Keep summary under 90 words
- Each list should contain 3 to 5 concise items when possible
- Focus on business value, support quality, recurring intent, and next actions`

  const prompt = [
    `Analyze recent conversations for the agent "${chatbot.name}".`,
    `Sessions analyzed: ${totalSessions}`,
    `Messages analyzed: ${totalMessages}`,
    `Channel mix: ${JSON.stringify(channelCounts)}`,
    '',
    'Conversation transcripts:',
    transcript
  ].join('\n')

  try {
    const response = await getChatCompletion([{ role: 'user', content: prompt }], { systemPrompt })
    const parsed = sanitizeAnalysis(extractJsonObject(response))

    return {
      meta: {
        chatbotId,
        chatbotName: chatbot.name,
        sessionsAnalyzed: totalSessions,
        messagesAnalyzed: totalMessages,
        channels: channelCounts
      },
      analysis: parsed
    }
  } catch (error: any) {
    console.error('[Conversation Analyzer] AI analysis failed', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to analyze conversations' })
  }
})
