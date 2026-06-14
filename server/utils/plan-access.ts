import { serverSupabaseServiceRole } from '#supabase/server'

const normalizePlanSlug = (value: unknown) => String(value || '').trim().toLowerCase()

export const isEnterprisePlanSlug = (planSlug: unknown) => ['enterprise-ready', 'enterprise'].includes(normalizePlanSlug(planSlug))
export const isGoldOrEnterprisePlanSlug = (planSlug: unknown) => ['gold', 'enterprise-ready', 'enterprise'].includes(normalizePlanSlug(planSlug))
export const isSilverOrHigherPlanSlug = (planSlug: unknown) => ['silver', 'gold', 'enterprise-ready', 'enterprise'].includes(normalizePlanSlug(planSlug))

export const getChatbotOwnerPlanSlug = async (event: any, chatbotId: string): Promise<string> => {
  const supabase = serverSupabaseServiceRole(event)

  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('user_id')
    .eq('id', chatbotId)
    .maybeSingle()

  if (chatbotError || !chatbot?.user_id) return 'starter'

  const { data: membership } = await supabase
    .from('user_memberships')
    .select('plans(internal_slug)')
    .eq('user_id', chatbot.user_id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  return normalizePlanSlug((membership?.plans as any)?.internal_slug || 'starter')
}

export const filterAgentToolsForPlan = (enabledTools: string[] | undefined, planSlug: string): string[] | undefined => {
  if (!enabledTools) return undefined

  const enterpriseOnlyTools = new Set(['appointments', 'orders', 'payments'])

  if (isEnterprisePlanSlug(planSlug)) {
    return enabledTools
  }

  return enabledTools.filter((tool) => !enterpriseOnlyTools.has(tool))
}
