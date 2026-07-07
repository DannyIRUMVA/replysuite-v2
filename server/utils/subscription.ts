import { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { z } from 'zod'

export const SubscriptionLimitSchema = z.object({
  max_chatbots: z.number().default(1),
  max_replies_per_month: z.number().default(100),
  max_training_units: z.number().default(10),
  max_embedding_mb: z.number().default(5.0),
  max_website_domains: z.number().default(1),
})

export type SubscriptionLimits = z.infer<typeof SubscriptionLimitSchema>

const getPlanPriority = (slug?: string | null) => {
  const normalized = String(slug || '').toLowerCase()
  if (['enterprise-ready', 'enterprise'].includes(normalized)) return 4
  if (normalized === 'gold') return 3
  if (normalized === 'silver') return 2
  if (normalized === 'starter') return 1
  return 0
}

const selectBestMembership = (memberships: any[] = []) => memberships
  .filter((membership) => membership?.is_active !== false)
  .sort((a, b) => {
    const priorityDiff = getPlanPriority(b?.plans?.internal_slug) - getPlanPriority(a?.plans?.internal_slug)
    if (priorityDiff !== 0) return priorityDiff
    return new Date(b?.starts_at || b?.created_at || 0).getTime() - new Date(a?.starts_at || a?.created_at || 0).getTime()
  })[0] || null

/**
 * Retrieves the current user's subscription limits from the database.
 * @param event - H3Event
 * @param userId - Optional explicit userId. If not provided, it will try to get it from the session.
 */
export async function getUserSubscriptionLimits(event: H3Event, userId?: string | null): Promise<SubscriptionLimits> {
  const client = await serverSupabaseClient(event)
  
  // Resolve user: prioritize explicit userId, then session user
  let finalUserId = userId
  if (!finalUserId || finalUserId === 'undefined') {
    const user = await serverSupabaseUser(event)
    finalUserId = user?.id
  }

  // Strict check: if still no ID or it's 'undefined', we cannot query per-user.
  // Return Starter plan defaults.
  if (!finalUserId || finalUserId === 'undefined') {
    const { data: freePlan } = await client
      .from('plans')
      .select('*')
      .eq('internal_slug', 'starter')
      .single()

    return SubscriptionLimitSchema.parse({
      max_chatbots: freePlan?.max_chatbots || 1,
      max_replies_per_month: freePlan?.max_replies_per_month || 100,
      max_training_units: freePlan?.max_training_units || 10,
      max_embedding_mb: freePlan?.max_embedding_mb || 1.0,
      max_website_domains: (freePlan as any)?.max_website_domains || 1,
    })
  }

  // Get active memberships and choose the highest entitlement.
  // Enterprise/Enterprise Ready covers all lower plans, so it must win even if
  // an older Starter/Silver/Gold row is still active in the database.
  const { data: memberships, error } = await client
    .from('user_memberships')
    .select('*, plans(*)')
    .eq('user_id', finalUserId)
    .eq('is_active', true)

  const membership = selectBestMembership(memberships || [])

  if (error) {
    console.error('[SUBSCRIPTION] Error fetching membership for:', finalUserId, error)
  }

  // Fallback to Free/Starter plan if no membership found
  if (!membership || !membership.plans) {
    const { data: freePlan } = await client
      .from('plans')
      .select('*')
      .eq('internal_slug', 'starter')
      .single()

    return SubscriptionLimitSchema.parse({
      max_chatbots: freePlan?.max_chatbots || 1,
      max_replies_per_month: freePlan?.max_replies_per_month || 100,
      max_training_units: freePlan?.max_training_units || 10,
      max_embedding_mb: freePlan?.max_embedding_mb || 1.0,
      max_website_domains: (freePlan as any)?.max_website_domains || 1,
    })
  }

  return SubscriptionLimitSchema.parse({
    max_chatbots: membership.plans.max_chatbots || 1,
    max_replies_per_month: membership.plans.max_replies_per_month,
    max_training_units: (membership.plans as any).max_training_units || 10,
    max_embedding_mb: (membership.plans as any).max_embedding_mb || 5.0,
    max_website_domains: (membership.plans as any).max_website_domains || 1,
  })
}

/**
 * Checks Training usage for the current month.
 */
export async function checkTrainingLimit(event: H3Event, chatbotId: string, userId: string): Promise<boolean> {
  const client = await serverSupabaseClient(event)
  const limits = await getUserSubscriptionLimits(event, userId)
  
  const monthYear = new Date().toISOString().slice(0, 7) // YYYY-MM

  const { data: usage } = await client
    .from('training_usage')
    .select('training_count')
    .eq('chatbot_id', chatbotId)
    .eq('month_year', monthYear)
    .maybeSingle()

  const currentCount = usage?.training_count || 0
  return currentCount < limits.max_training_units
}

/**
 * Record training usage.
 */
export async function recordTrainingUsage(event: H3Event, chatbotId: string, userId: string, count: number = 1) {
  const client = await serverSupabaseClient(event)
  const monthYear = new Date().toISOString().slice(0, 7)

  // Use upsert or manual check
  const { data: existing } = await client
    .from('training_usage')
    .select('id, training_count')
    .eq('chatbot_id', chatbotId)
    .eq('month_year', monthYear)
    .maybeSingle()

  if (existing) {
    await client
      .from('training_usage')
      .update({ training_count: (existing.training_count || 0) + count })
      .eq('id', existing.id)
  } else {
    await client
      .from('training_usage')
      .insert({
        chatbot_id: chatbotId,
        user_id: userId,
        month_year: monthYear,
        training_count: count
      })
  }
}

