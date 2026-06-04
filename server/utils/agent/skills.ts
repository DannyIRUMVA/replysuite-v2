const ASSISTANT_SKILL_PROMPTS: Record<string, { name: string; prompt: string }> = {
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
    prompt: 'Be extra careful to preserve the customer language. If the customer mixes languages, reply naturally in the dominant language and keep business terms clear.',
  },
  concise_follow_up: {
    name: 'Concise follow-up',
    prompt: 'Keep replies short and action-oriented. End with one useful next step or one focused question instead of multiple questions.',
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
