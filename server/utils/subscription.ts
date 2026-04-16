import { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { z } from 'zod'

export const SubscriptionLimitSchema = z.object({
  max_instagram_accounts: z.number().default(1),
  max_triggers: z.number().default(1),
  max_auto_dms_per_month: z.number().default(50),
  max_training_units: z.number().default(10),
  max_embedding_mb: z.number().default(5.0),
})

export type SubscriptionLimits = z.infer<typeof SubscriptionLimitSchema>

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
      max_instagram_accounts: freePlan?.max_instagram_accounts || 1,
      max_triggers: freePlan?.max_triggers || 1,
      max_auto_dms_per_month: freePlan?.max_auto_dms_per_month || 50,
      max_training_units: freePlan?.max_training_units || 100,
      max_embedding_mb: freePlan?.max_embedding_mb || 1.0,
    })
  }

  // Get active membership and plan
  const { data: membership, error } = await client
    .from('user_memberships')
    .select('*, plans(*)')
    .eq('user_id', finalUserId)
    .eq('is_active', true)
    .maybeSingle()

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
      max_instagram_accounts: freePlan?.max_instagram_accounts || 1,
      max_triggers: freePlan?.max_triggers || 1,
      max_auto_dms_per_month: freePlan?.max_auto_dms_per_month || 50,
      max_training_units: freePlan?.max_training_units || 100,
      max_embedding_mb: freePlan?.max_embedding_mb || 1.0,
    })
  }

  return SubscriptionLimitSchema.parse({
    max_instagram_accounts: membership.plans.max_instagram_accounts,
    max_triggers: membership.plans.max_triggers,
    max_auto_dms_per_month: membership.plans.max_auto_dms_per_month,
    max_training_units: (membership.plans as any).max_training_units || 100,
    max_embedding_mb: (membership.plans as any).max_embedding_mb || 5.0,
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
      .update({ training_count: existing.training_count + count })
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

/**
 * Checks if the user can perform an action based on their limits.
 */
export async function checkLimit(event: H3Event, type: 'accounts' | 'triggers', userId?: string | null): Promise<boolean> {
  const client = await serverSupabaseClient(event)
  
  let finalUserId = userId
  if (!finalUserId || finalUserId === 'undefined') {
    const user = await serverSupabaseUser(event)
    finalUserId = user?.id
  }

  if (!finalUserId || finalUserId === 'undefined') return false

  const limits = await getUserSubscriptionLimits(event, finalUserId)

  if (type === 'accounts') {
    const { count } = await client
      .from('instagram_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', finalUserId)

    return (count || 0) < limits.max_instagram_accounts
  }

  if (type === 'triggers') {
    const { data: chatbots } = await client
      .from('chatbots')
      .select('id')
      .eq('user_id', finalUserId)

    if (!chatbots || chatbots.length === 0) return true

    const chatbotIds = chatbots.map(c => c.id)
    const { count } = await client
      .from('instagram_comment_triggers')
      .select('*', { count: 'exact', head: true })
      .in('chatbot_id', chatbotIds)

    return (count || 0) < limits.max_triggers
  }

  return false
}
