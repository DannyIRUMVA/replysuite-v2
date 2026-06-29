import { createError, defineEventHandler, getRequestIP, readBody } from 'h3'
import { getFreeTool, type FreeToolLength, type FreeToolTone } from '~~/shared/free-tools'

const windowMs = 10 * 60 * 1000
const maxRequestsPerWindow = 8
const requestBuckets = new Map<string, { count: number, resetAt: number }>()

const normalizeString = (value: unknown, maxLength: number) => String(value || '').trim().slice(0, maxLength)

const enforceSoftRateLimit = (key: string) => {
  const now = Date.now()
  const current = requestBuckets.get(key)

  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  current.count += 1
  if (current.count > maxRequestsPerWindow) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many free tool requests. Please wait a few minutes and try again.',
    })
  }
}

const buildSystemPrompt = (tool: NonNullable<ReturnType<typeof getFreeTool>>) => [
  'You are ReplySuite Free Tools, a practical AI reply generator for businesses.',
  'Generate one ready-to-send customer-facing response for the selected tool.',
  tool.systemFocus,
  '',
  'Global safety rules:',
  '- Do not invent facts, policies, prices, dates, availability, staff names, order details, payment details, or private actions.',
  '- Do not expose internal IDs, database references, event IDs, payment IDs, booking IDs, UUIDs, or implementation details.',
  '- Do not provide legal, medical, financial, or compliance advice.',
  '- If critical details are missing, ask for them naturally instead of pretending to know them.',
  '- Output only the generated reply. Do not include analysis, labels, markdown headings, or quotation marks around the reply.',
  '',
  'Tool-specific rules:',
  ...tool.rules.map((rule) => `- ${rule}`),
].join('\n')

const lengthInstruction: Record<FreeToolLength, string> = {
  short: 'Keep the reply short: 1 short paragraph or 2 brief chat lines.',
  medium: 'Keep the reply medium length: 1–2 concise paragraphs.',
  detailed: 'Make the reply detailed but still concise: 2–3 short paragraphs with a clear next step.',
}

const toneInstruction: Record<FreeToolTone, string> = {
  professional: 'Use a professional, polished tone.',
  friendly: 'Use a warm, friendly business tone.',
  empathetic: 'Use an empathetic, de-escalating tone.',
  concise: 'Use a concise, direct tone with no fluff.',
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const slug = normalizeString(body?.slug, 120)
  const tool = getFreeTool(slug)

  if (!tool) {
    throw createError({ statusCode: 404, statusMessage: 'Free tool not found' })
  }

  const input = normalizeString(body?.input, 2500)
  if (input.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Please enter a customer message with at least 8 characters.' })
  }

  const tone = tool.tones.some((item) => item.value === body?.tone) ? body.tone as FreeToolTone : 'professional'
  const length = tool.lengths.some((item) => item.value === body?.length) ? body.length as FreeToolLength : 'medium'
  const businessType = tool.businessTypes.includes(body?.businessType) ? String(body.businessType) : tool.businessTypes[0]
  const businessName = normalizeString(body?.businessName, 80)
  const extraContext = normalizeString(body?.extraContext, 600)

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'anonymous'
  enforceSoftRateLimit(`${ip}:${slug}`)

  const config = useRuntimeConfig()
  const apiKey = String(config.openRouterApiKey || '').trim()
  const baseUrl = String(config.openRouterBaseUrl || 'https://openrouter.ai/api').trim().replace(/\/+$/, '')
  const model = String(config.freeToolsOpenRouterModel || 'openai/gpt-oss-20b:free').trim()
  const siteUrl = String(config.public?.siteUrl || 'https://replysuite.app').trim()

  if (!apiKey) {
    throw createError({ statusCode: 503, statusMessage: 'Free AI tools are not configured yet.' })
  }

  const userPrompt = [
    `Tool: ${tool.title}`,
    `Target keyword: ${tool.keyword}`,
    `Business type: ${businessType}`,
    businessName ? `Business name: ${businessName}` : 'Business name: Not provided',
    `Tone: ${toneInstruction[tone]}`,
    `Length: ${lengthInstruction[length]}`,
    extraContext ? `Extra business context: ${extraContext}` : 'Extra business context: Not provided',
    '',
    'Customer message/review/request:',
    input,
    '',
    'Generate the final reply now.',
  ].join('\n')

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': siteUrl,
      'X-Title': 'ReplySuite Free Tools',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(tool) },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  const data: any = await response.json().catch(() => ({}))
  if (!response.ok || data?.error) {
    const message = data?.error?.message || `OpenRouter request failed with HTTP ${response.status}`
    console.warn('[Free Tools] GPT-OSS generation failed:', message)
    throw createError({ statusCode: 502, statusMessage: 'The free generator is busy. Please try again.' })
  }

  const reply = String(data?.choices?.[0]?.message?.content || '').trim()
  if (!reply) {
    throw createError({ statusCode: 502, statusMessage: 'The model returned an empty reply. Please try again.' })
  }

  return {
    success: true,
    model,
    tool: tool.slug,
    reply,
  }
})
