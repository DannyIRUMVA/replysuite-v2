import { serverSupabaseServiceRole } from '#supabase/server'
import { selectBestPlanSlug } from '~~/server/utils/membership'

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
