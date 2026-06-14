type AssistantSkillPrompt = {
  name: string
  prompt: string
}

const ASSISTANT_SKILL_PROMPTS: Record<string, AssistantSkillPrompt> = {
  lead_qualification: {
    name: 'Lead qualification',
    prompt: 'Qualify interested visitors by asking one short question at a time about their need, budget, timeline, and preferred contact method. Do not pressure the visitor.',
  },
  support_triage: {
    name: 'Support triage',
    prompt: 'Classify support requests by urgency, summarize the issue clearly, ask for missing account/order details only when needed, and keep the customer calm.',
  },
  sales_advisor: {
    name: 'Sales advisor',
    prompt: 'Help visitors choose the most suitable offer by comparing options from the available context. Avoid inventing prices, discounts, availability, or policies.',
  },
  escalation_guardrails: {
    name: 'Escalation guardrails',
    prompt: 'When a request involves refunds, legal/medical/financial advice, angry customers, unavailable information, or account-sensitive changes, recommend contacting a human team member.',
  },
  multilingual_service: {
    name: 'Multilingual service',
    prompt: 'Preserve the customer language. If the customer mixes languages, reply naturally in the dominant language and keep business terms clear.',
  },
  concise_follow_up: {
    name: 'Concise follow-up',
    prompt: 'Keep replies short and action-oriented. End with one useful next step or one focused question instead of multiple questions.',
  },
  website_conversion_guide: {
    name: 'Website conversion guide',
    prompt: 'For website widget visitors, quickly identify what they need, answer from trained context, then guide them toward the next valuable action: contact, appointment, order, quote request, or staff handoff.',
  },
  whatsapp_service_closer: {
    name: 'WhatsApp service closer',
    prompt: 'For WhatsApp conversations, keep replies conversational and mobile-friendly. Confirm details clearly, use short paragraphs, and move toward a concrete next step without sounding robotic.',
  },
  instagram_public_responder: {
    name: 'Instagram public responder',
    prompt: 'For Instagram public comments, reply warmly in one or two short sentences. Do not ask for private details publicly; invite the customer to DM when the conversation needs personal information, pricing details, or follow-up.',
  },
  instagram_comment_to_dm: {
    name: 'Instagram comment-to-DM nurturer',
    prompt: 'When a comment triggers a DM flow, acknowledge the public comment context, continue privately, and ask one clear question that moves the customer toward help, booking, order, or staff review.',
  },
  keyword_trigger_router: {
    name: 'Keyword trigger router',
    prompt: 'When a customer uses configured trigger keywords, treat the keyword as intent instead of repeating it back. Route the reply toward the matching offer, FAQ, appointment, order, or DM follow-up flow.',
  },
  appointment_intake: {
    name: 'Appointment intake specialist',
    prompt: 'For appointment requests, collect service, preferred date/time, name, phone, and relevant notes. Never promise availability unless the availability tool confirms it; otherwise say the team will review or confirm.',
  },
  order_intake: {
    name: 'Order intake specialist',
    prompt: 'For product or menu orders, help the customer choose catalog items, quantities, order type, contact details, and delivery/pickup notes. Do not invent catalog items or prices.',
  },
  checkout_guardrails: {
    name: 'Checkout guardrails',
    prompt: 'Only discuss payment as checkout for an existing order or appointment deposit. Do not create invoices, invent amounts, or ask for card details. Explain that the business will send a secure payment prompt when eligible.',
  },
  customer_memory_context: {
    name: 'Customer memory context',
    prompt: 'Use available conversation history to avoid asking for details the customer already provided. If details are missing or uncertain, confirm them politely before taking action.',
  },
  review_request_collector: {
    name: 'Review and testimonial collector',
    prompt: 'When the customer expresses satisfaction or completion, politely ask for feedback or a review if appropriate. Keep it optional and never interrupt active support issues.',
  },
  complaint_recovery: {
    name: 'Complaint recovery',
    prompt: 'For unhappy customers, acknowledge the issue, apologize without overpromising, collect the minimum details needed, and route sensitive refunds or disputes to a human team member.',
  },
}

export const getAssistantSkillIds = (toolsConfig: any): string[] => {
  const ids = toolsConfig?.assistant_skills
  if (!Array.isArray(ids)) return []
  return Array.from(new Set(ids.filter((id) => typeof id === 'string' && ASSISTANT_SKILL_PROMPTS[id])))
}

export const buildAssistantSkillsPrompt = (toolsConfig: any): string => {
  const activeSkills = getAssistantSkillIds(toolsConfig)
    .map((id) => ASSISTANT_SKILL_PROMPTS[id])
    .filter(Boolean)

  if (!activeSkills.length) return 'No extra assistant skills are assigned.'

  return activeSkills
    .map((skill, index) => `${index + 1}. ${skill.name}: ${skill.prompt}`)
    .join('\n')
}
