import { serverSupabaseServiceRole } from '#supabase/server'

const normalizePlanSlug = (value: unknown) => String(value || '').trim().toLowerCase()

export const isEnterprisePlanSlug = (planSlug: unknown) => ['enterprise-ready', 'enterprise'].includes(normalizePlanSlug(planSlug))
export const isGoldOrEnterprisePlanSlug = (planSlug: unknown) => ['gold', 'enterprise-ready', 'enterprise'].includes(normalizePlanSlug(planSlug))
export const isSilverOrHigherPlanSlug = (planSlug: unknown) => ['silver', 'gold', 'enterprise-ready', 'enterprise'].includes(normalizePlanSlug(planSlug))

const getPlanPriority = (slug: unknown) => {
  const normalized = normalizePlanSlug(slug)
  if (['enterprise-ready', 'enterprise'].includes(normalized)) return 4
  if (normalized === 'gold') return 3
  if (normalized === 'silver') return 2
  if (normalized === 'starter') return 1
  return 0
}

const selectBestPlanSlug = (memberships: any[] = []) => memberships
  .map((membership) => normalizePlanSlug((membership?.plans as any)?.internal_slug))
  .sort((a, b) => getPlanPriority(b) - getPlanPriority(a))[0] || 'starter'

export const getChatbotOwnerPlanSlug = async (event: any, chatbotId: string): Promise<string> => {
  const supabase = serverSupabaseServiceRole(event)

  const { data: chatbot, error: chatbotError } = await supabase
    .from('chatbots')
    .select('user_id')
    .eq('id', chatbotId)
    .maybeSingle()

  if (chatbotError || !chatbot?.user_id) return 'starter'

  const { data: memberships } = await supabase
    .from('user_memberships')
    .select('plans(internal_slug)')
    .eq('user_id', chatbot.user_id)
    .eq('is_active', true)

  return selectBestPlanSlug(memberships || [])
}

export const filterAgentToolsForPlan = (enabledTools: string[] | undefined, planSlug: string): string[] | undefined => {
  if (!enabledTools) return undefined

  const deprecatedTools = new Set(['orders'])
  const enterpriseOnlyTools = new Set(['appointments', 'payments'])
  const cleanedTools = enabledTools.filter((tool) => !deprecatedTools.has(tool))

  if (isEnterprisePlanSlug(planSlug)) {
    return cleanedTools
  }

  return cleanedTools.filter((tool) => !enterpriseOnlyTools.has(tool))
}
