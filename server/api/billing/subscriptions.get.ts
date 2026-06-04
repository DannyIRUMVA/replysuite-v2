import { Polar } from '@polar-sh/sdk'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

const getSubscriptionDate = (subscription: any) => {
  return subscription?.startedAt || subscription?.createdAt || subscription?.currentPeriodStart || null
}

export default defineEventHandler(async (event) => {
  const auth = await getAuthContext(event)
  if (!auth) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const config = useRuntimeConfig()
  const polarAccessToken = config.polarAccessToken
  const polarServer = config.polarServer

  if (!polarAccessToken) {
    throw createError({ statusCode: 500, statusMessage: 'Billing service misconfigured' })
  }

  const user = await serverSupabaseUser(event)
  const adminClient = serverSupabaseServiceRole(event)
  const polar = new Polar({
    accessToken: polarAccessToken,
    server: (polarServer?.toLowerCase() as any) || 'sandbox'
  })

  const { data: profile } = await adminClient
    .from('profiles')
    .select('polar_customer_id')
    .eq('id', auth.userId)
    .maybeSingle()

  const { data: memberships } = await adminClient
    .from('user_memberships')
    .select('polar_customer_id')
    .eq('user_id', auth.userId)
    .not('polar_customer_id', 'is', null)

  const customerIds = new Set<string>()
  if (profile?.polar_customer_id) customerIds.add(profile.polar_customer_id)
  for (const membership of memberships || []) {
    if (membership?.polar_customer_id) customerIds.add(membership.polar_customer_id)
  }

  try {
    const byExternalId = await polar.customers.list({ query: auth.userId })
    for (const customer of byExternalId.result?.items || []) {
      if (customer?.id) customerIds.add(customer.id)
    }
  } catch (err: any) {
    console.warn('[Billing Subscriptions] Polar external-id customer lookup failed:', err?.message)
  }

  if (user?.email) {
    try {
      const byEmail = await polar.customers.list({ email: user.email })
      for (const customer of byEmail.result?.items || []) {
        if (customer?.id) customerIds.add(customer.id)
      }
    } catch (err: any) {
      console.warn('[Billing Subscriptions] Polar email customer lookup failed:', err?.message)
    }
  }

  const { data: plans } = await adminClient
    .from('plans')
    .select('internal_slug, display_name, name, polar_product_id')
    .not('polar_product_id', 'is', null)

  const plansByProductId = new Map((plans || []).map((plan: any) => [plan.polar_product_id, plan]))
  const subscriptions: any[] = []

  for (const customerId of customerIds) {
    try {
      const response = await polar.subscriptions.list({ customerId })
      for (const subscription of response.result?.items || []) {
        const productId = (subscription as any).productId || (subscription as any).product?.id || null
        const plan = productId ? plansByProductId.get(productId) : null

        subscriptions.push({
          id: (subscription as any).id,
          customerId,
          status: (subscription as any).status || 'unknown',
          productId,
          productName: plan?.display_name || plan?.name || (subscription as any).product?.name || 'Polar subscription',
          planSlug: plan?.internal_slug || null,
          startedAt: (subscription as any).startedAt || null,
          createdAt: (subscription as any).createdAt || null,
          currentPeriodStart: (subscription as any).currentPeriodStart || null,
          currentPeriodEnd: (subscription as any).currentPeriodEnd || (subscription as any).endsAt || null,
          canceledAt: (subscription as any).canceledAt || null,
          endedAt: (subscription as any).endedAt || null,
          cancelAtPeriodEnd: Boolean((subscription as any).cancelAtPeriodEnd),
          amount: (subscription as any).amount || (subscription as any).priceAmount || null,
          currency: (subscription as any).currency || (subscription as any).priceCurrency || 'usd'
        })
      }
    } catch (err: any) {
      console.warn(`[Billing Subscriptions] Polar subscription lookup failed for ${customerId}:`, err?.message)
    }
  }

  const uniqueSubscriptions = Array.from(
    new Map(subscriptions.filter((subscription) => subscription.id).map((subscription) => [subscription.id, subscription])).values()
  ).sort((a: any, b: any) => new Date(getSubscriptionDate(b) || 0).getTime() - new Date(getSubscriptionDate(a) || 0).getTime())

  return {
    success: true,
    customerCount: customerIds.size,
    subscriptions: uniqueSubscriptions
  }
})
