export interface ConversationSettings {
  tone: 'friendly' | 'professional' | 'warm' | 'direct'
  responseLength: 'short' | 'balanced' | 'detailed'
  greetOncePerSession: boolean
  avoidRepeatingQuestions: boolean
  askOneQuestionAtATime: boolean
  continueFromPreviousAnswer: boolean
  sessionMemoryEnabled: boolean
  contactMemoryEnabled: boolean
  websiteReplyStyle: 'guided' | 'balanced'
  whatsappReplyStyle: 'short' | 'balanced'
  leadCaptureMode: 'off' | 'when-needed' | 'always'
}

export interface ConversationState {
  greeted?: boolean
  currentIntent?: string | null
  openQuestion?: string | null
  preferredLanguage?: string | null
  lastUserMessage?: string | null
  lastAssistantMessage?: string | null
  collected?: {
    name?: string | null
    phone?: string | null
    email?: string | null
  }
}

export const DEFAULT_CONVERSATION_SETTINGS: ConversationSettings = {
  tone: 'friendly',
  responseLength: 'balanced',
  greetOncePerSession: true,
  avoidRepeatingQuestions: true,
  askOneQuestionAtATime: true,
  continueFromPreviousAnswer: true,
  sessionMemoryEnabled: true,
  contactMemoryEnabled: true,
  websiteReplyStyle: 'guided',
  whatsappReplyStyle: 'short',
  leadCaptureMode: 'when-needed',
}

export const normalizeConversationSettings = (raw: any): ConversationSettings => ({
  ...DEFAULT_CONVERSATION_SETTINGS,
  ...(raw || {}),
})

export const getConversationStateFromMetadata = (metadata: any): ConversationState => {
  if (!metadata || typeof metadata !== 'object') return {}
  const state = metadata.state
  if (!state || typeof state !== 'object') return {}
  return state as ConversationState
}

const PHONE_REGEX = /(?:\+?\d[\d\s().-]{6,}\d)/
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i

const inferIntent = (text: string) => {
  const value = text.toLowerCase()
  if (/(book|appointment|schedule|reserve)/.test(value)) return 'booking'
  if (/(price|pricing|cost|fee|how much)/.test(value)) return 'pricing'
  if (/(buy|order|purchase|menu)/.test(value)) return 'order'
  if (/(pay|payment|invoice|bill)/.test(value)) return 'payment'
  if (/(where|location|address|map)/.test(value)) return 'location'
  if (/(hour|time|open|close|working day)/.test(value)) return 'hours'
  if (/(support|help|issue|problem|error)/.test(value)) return 'support'
  return 'general'
}

export const updateConversationState = ({
  existingState,
  userMessage,
  assistantReply,
  customerName,
  customerPhone,
  defaultLanguage,
}: {
  existingState?: ConversationState
  userMessage: string
  assistantReply: string
  customerName?: string | null
  customerPhone?: string | null
  defaultLanguage?: string | null
}): ConversationState => {
  const nextState: ConversationState = {
    ...(existingState || {}),
    collected: {
      ...(existingState?.collected || {}),
    },
  }

  nextState.greeted = true
  nextState.currentIntent = inferIntent(userMessage)
  nextState.lastUserMessage = userMessage
  nextState.lastAssistantMessage = assistantReply
  nextState.preferredLanguage = nextState.preferredLanguage || defaultLanguage || null

  if (customerName && !nextState.collected?.name) {
    nextState.collected!.name = customerName
  }

  if (customerPhone && !nextState.collected?.phone) {
    nextState.collected!.phone = customerPhone
  }

  const phoneMatch = userMessage.match(PHONE_REGEX)?.[0]?.trim()
  if (phoneMatch) {
    nextState.collected!.phone = phoneMatch
  }

  const emailMatch = userMessage.match(EMAIL_REGEX)?.[0]?.trim()
  if (emailMatch) {
    nextState.collected!.email = emailMatch
  }

  nextState.openQuestion = assistantReply.trim().endsWith('?') ? assistantReply.trim() : null

  return nextState
}

export const mergeMetadataWithState = (metadata: any, state: ConversationState) => ({
  ...(metadata && typeof metadata === 'object' ? metadata : {}),
  state,
})

export const buildConversationSettingsPrompt = (settings: ConversationSettings, platform: 'web' | 'whatsapp') => {
  const lengthRule = settings.responseLength === 'short'
    ? 'Keep replies short and clear. Prefer 1-2 short sentences unless the user asks for more.'
    : settings.responseLength === 'detailed'
      ? 'You may give more detail when useful, but stay concise and practical.'
      : 'Prefer 1-3 short sentences unless more detail is clearly needed.'

  const toneRule = settings.tone === 'professional'
    ? 'Use a professional and helpful tone.'
    : settings.tone === 'warm'
      ? 'Use a warm, human, reassuring tone.'
      : settings.tone === 'direct'
        ? 'Use a direct, efficient, no-fluff tone.'
        : 'Use a friendly, human, helpful tone.'

  const channelRule = platform === 'whatsapp'
    ? settings.whatsappReplyStyle === 'short'
      ? 'For WhatsApp, keep replies compact and easy to read.'
      : 'For WhatsApp, stay conversational and easy to follow.'
    : settings.websiteReplyStyle === 'guided'
      ? 'For website chat, guide the visitor clearly toward the next useful step.'
      : 'For website chat, keep replies helpful and balanced.'

  return [
    toneRule,
    lengthRule,
    channelRule,
    settings.greetOncePerSession ? 'Greet only once per session. Do not re-introduce yourself after the conversation has started.' : null,
    settings.avoidRepeatingQuestions ? 'Do not ask for the same detail again if it was already provided earlier in the session, unless it is still unclear.' : null,
    settings.continueFromPreviousAnswer ? 'If the latest user message looks like a short answer to your previous question, treat it as that answer and move the conversation forward.' : null,
    settings.askOneQuestionAtATime ? 'Ask at most one clarifying question at a time.' : null,
    settings.leadCaptureMode === 'always'
      ? 'When appropriate, make sure you capture the key lead details before closing the conversation.'
      : settings.leadCaptureMode === 'when-needed'
        ? 'Capture lead details only when they are needed to help the user or continue the request.'
        : 'Do not push for lead details unless the user clearly needs a next step.'
  ].filter(Boolean).join('\n')
}

export const buildConversationStatePrompt = (state: ConversationState, contactMemory?: any) => {
  const lines: string[] = []

  if (state.greeted) lines.push('- This conversation has already started. Do not restart it.')
  if (state.currentIntent) lines.push(`- Current likely intent: ${state.currentIntent}`)
  if (state.openQuestion) lines.push(`- Last open follow-up from assistant: ${state.openQuestion}`)
  if (state.collected?.name) lines.push(`- Known customer name: ${state.collected.name}`)
  if (state.collected?.phone) lines.push(`- Known customer phone: ${state.collected.phone}`)
  if (state.collected?.email) lines.push(`- Known customer email: ${state.collected.email}`)
  if (state.preferredLanguage) lines.push(`- Preferred language: ${state.preferredLanguage}`)

  if (contactMemory?.memory && typeof contactMemory.memory === 'object') {
    const memory = contactMemory.memory
    if (memory.lastIntent) lines.push(`- Returning contact likely intent: ${memory.lastIntent}`)
    if (memory.notes) lines.push(`- Returning contact context: ${memory.notes}`)
    if (memory.preferredLanguage) lines.push(`- Returning contact preferred language: ${memory.preferredLanguage}`)
  }

  if (!lines.length) return 'No active conversation state stored yet.'
  return lines.join('\n')
}
