import { Polar } from '@polar-sh/sdk'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { getPolarErrorMessage, isPolarAuthError } from '~~/server/utils/polar'

const toIsoString = (value: any) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const getTransactionDate = (transaction: any) => transaction?.createdAt || transaction?.modifiedAt || null

const mapLocalSubscriptionPayments = (payments: any[] = []) => payments.map((payment: any) => ({
  id: payment.reference || payment.id,
  source: 'mobile_payment',
  customerId: null,
  status: payment.status || 'unknown',
  paid: payment.status === 'completed',
  productId: payment.plan_id || null,
  productName: payment.plans?.display_name || payment.plans?.name || 'Mobile payment subscription',
  planSlug: payment.plans?.internal_slug || null,
  amount: payment.amount ?? null,
  netAmount: payment.amount ?? null,
  taxAmount: null,
  refundedAmount: null,
  currency: payment.currency || 'RWF',
  billingReason: 'MTN/Airtel mobile payment subscription',
  subscriptionId: `mobile:${payment.reference || payment.id}`,
  checkoutId: null,
  reference: payment.reference || null,
  createdAt: toIsoString(payment.created_at),
  modifiedAt: null,
}))

export default defineEventHandler(async (event) => {
  const auth = await getAuthContext(event)
  if (!auth) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const config = useRuntimeConfig()
  const polarAccessToken = config.polarAccessToken
  const polarServer = config.polarServer

  const user = await serverSupabaseUser(event)
  const adminClient = serverSupabaseServiceRole(event)

  const { data: localPayments } = await adminClient
    .from('payments')
    .select('id, user_id, plan_id, provider, status, amount, currency, reference, created_at, plans(internal_slug, display_name, name)')
    .eq('user_id', auth.userId)
    .in('provider', ['mobile_payment', 'paypack'])
    .order('created_at', { ascending: false })
    .limit(100)

  const localTransactions = mapLocalSubscriptionPayments(localPayments || [])

  if (!polarAccessToken) {
    return {
      success: true,
      billingProviderAvailable: false,
      message: 'Card billing transactions are temporarily unavailable.',
      customerCount: 0,
      transactions: localTransactions
    }
  }

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
    if (isPolarAuthError(err)) {
      console.warn(`[Billing Transactions] ${getPolarErrorMessage(err)} Returning local mobile payment transactions.`)
      return {
        success: true,
        billingProviderAvailable: false,
        message: 'Card billing transactions are temporarily unavailable.',
        customerCount: customerIds.size,
        transactions: localTransactions
      }
    }
    console.warn('[Billing Transactions] Polar external-id customer lookup failed:', getPolarErrorMessage(err))
  }

  if (user?.email) {
    try {
      const byEmail = await polar.customers.list({ email: user.email })
      for (const customer of byEmail.result?.items || []) {
        if (customer?.id) customerIds.add(customer.id)
      }
    } catch (err: any) {
      if (isPolarAuthError(err)) {
        console.warn(`[Billing Transactions] ${getPolarErrorMessage(err)} Returning local mobile payment transactions.`)
        return {
          success: true,
          billingProviderAvailable: false,
          message: 'Card billing transactions are temporarily unavailable.',
          customerCount: customerIds.size,
          transactions: localTransactions
        }
      }
      console.warn('[Billing Transactions] Polar email customer lookup failed:', getPolarErrorMessage(err))
    }
  }

  const { data: plans } = await adminClient
    .from('plans')
    .select('internal_slug, display_name, name, polar_product_id')
    .not('polar_product_id', 'is', null)

  const plansByProductId = new Map((plans || []).map((plan: any) => [plan.polar_product_id, plan]))
  const transactions: any[] = []

  const addOrders = (orders: any[], sourceCustomerId?: string) => {
    for (const order of orders || []) {
      const productId = order?.productId || order?.product?.id || null
      const plan = productId ? plansByProductId.get(productId) : null

      transactions.push({
        id: order?.id,
        customerId: order?.customerId || sourceCustomerId || null,
        status: order?.status || (order?.paid ? 'paid' : 'unknown'),
        paid: Boolean(order?.paid),
        productId,
        productName: plan?.display_name || plan?.name || order?.product?.name || order?.description || 'Polar transaction',
        planSlug: plan?.internal_slug || null,
        amount: order?.totalAmount ?? order?.netAmount ?? order?.subtotalAmount ?? null,
        netAmount: order?.netAmount ?? null,
        taxAmount: order?.taxAmount ?? null,
        refundedAmount: order?.refundedAmount ?? null,
        currency: order?.currency || 'usd',
        billingReason: order?.billingReason || null,
        subscriptionId: order?.subscriptionId || null,
        checkoutId: order?.checkoutId || null,
        createdAt: toIsoString(order?.createdAt),
        modifiedAt: toIsoString(order?.modifiedAt)
      })
    }
  }

  for (const customerId of customerIds) {
    try {
      const response = await polar.orders.list({ customerId, limit: 100, sorting: ['-created_at'] as any })
      addOrders(response.result?.items || [], customerId)
    } catch (err: any) {
      if (isPolarAuthError(err)) {
        console.warn(`[Billing Transactions] ${getPolarErrorMessage(err)} Returning local mobile payment transactions.`)
        return {
          success: true,
          billingProviderAvailable: false,
          message: 'Card billing transactions are temporarily unavailable.',
          customerCount: customerIds.size,
          transactions: localTransactions
        }
      }
      console.warn(`[Billing Transactions] Polar order lookup failed for ${customerId}:`, getPolarErrorMessage(err))
    }
  }

  try {
    const byExternalCustomer = await polar.orders.list({ externalCustomerId: auth.userId, limit: 100, sorting: ['-created_at'] as any })
    addOrders(byExternalCustomer.result?.items || [])
  } catch (err: any) {
    if (isPolarAuthError(err)) {
      console.warn(`[Billing Transactions] ${getPolarErrorMessage(err)} Returning local mobile payment transactions.`)
      return {
        success: true,
        billingProviderAvailable: false,
        message: 'Card billing transactions are temporarily unavailable.',
        customerCount: customerIds.size,
        transactions: localTransactions
      }
    }
    console.warn('[Billing Transactions] Polar external customer order lookup failed:', getPolarErrorMessage(err))
  }

  transactions.push(...localTransactions)

  const uniqueTransactions = Array.from(
    new Map(transactions.filter((transaction) => transaction.id).map((transaction) => [transaction.id, transaction])).values()
  ).sort((a: any, b: any) => new Date(getTransactionDate(b) || 0).getTime() - new Date(getTransactionDate(a) || 0).getTime())

  return {
    success: true,
    customerCount: customerIds.size,
    transactions: uniqueTransactions
  }
})
