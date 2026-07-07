import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

const sanitizeString = (value: unknown, maxLength = 500) => String(value || '').trim().slice(0, maxLength)
const normalizePhoneForMobilePayment = (phone: string) => sanitizeString(phone, 32).replace(/\s+/g, '').replace(/^\+250/, '0').replace(/^250/, '0')
const isValidRwandaPhone = (phone: string) => /^07[2389]\d{7}$/.test(phone)
const TEST_COMPLETED_PAYMENT_PHONE = '0786200502'

const SUBSCRIPTION_MOBILE_PLANS: Record<string, { name: string; amount: number; currency: 'RWF' }> = {
  silver: { name: 'Silver', amount: 25_000, currency: 'RWF' },
  gold: { name: 'Gold', amount: 38_000, currency: 'RWF' },
  'enterprise-ready': { name: 'Enterprise Ready', amount: 490_000, currency: 'RWF' },
}

const makeTransactionRef = (planId: string, userId: string) => {
  const userPart = String(userId || 'user').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'user'
  return `replysuite-sub-${planId}-${userPart}-${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120)
}

export default defineEventHandler(async (event) => {
  const { userId } = await getAuthContext(event)
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const planId = sanitizeString(body?.planId || body?.plan_id, 80).toLowerCase()
  const plan = SUBSCRIPTION_MOBILE_PLANS[planId]

  if (!plan) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a valid paid plan.' })
  }

  const phone = normalizePhoneForMobilePayment(body?.phone)
  if (!isValidRwandaPhone(phone)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid MTN or Airtel Rwanda phone number.' })
  }

  const config = useRuntimeConfig()
  const configuredUrl = sanitizeString(
    (config as any).replySuiteMobilePaymentWorkerUrl ||
    process.env.REPLYSUITE_MOBILE_PAYMENT_WORKER_URL ||
    process.env.REPLYSUITE_SUBSCRIPTION_PAYMENT_WORKER_URL,
    300,
  )

  const baseUrl = configuredUrl.replace(/\/+$/, '')
  const transactionRef = makeTransactionRef(planId, userId)

  if (phone === TEST_COMPLETED_PAYMENT_PHONE) {
    const adminClient = serverSupabaseServiceRole(event)
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setUTCDate(periodEnd.getUTCDate() + 30)

    const { data: dbPlan, error: planError } = await adminClient
      .from('plans')
      .select('id, name, internal_slug')
      .eq('internal_slug', planId)
      .maybeSingle()

    if (planError || !dbPlan?.id) {
      console.warn('[Subscription Mobile Payment Test] Plan lookup failed:', planError)
      throw createError({ statusCode: 500, statusMessage: 'Could not activate the selected test plan.' })
    }

    const { error: deactivateError } = await adminClient
      .from('user_memberships')
      .update({ is_active: false })
      .eq('user_id', userId)

    if (deactivateError) {
      console.warn('[Subscription Mobile Payment Test] Membership deactivation failed:', deactivateError)
      throw createError({ statusCode: 500, statusMessage: 'Could not complete the test payment.' })
    }

    const membershipPayload = {
      user_id: userId,
      plan_id: dbPlan.id,
      is_active: true,
      amount: plan.amount,
      starts_at: now.toISOString(),
      ends_at: periodEnd.toISOString(),
    }

    const membershipResult = await adminClient
      .from('user_memberships')
      .insert(membershipPayload)

    if (membershipResult.error) {
      console.warn('[Subscription Mobile Payment Test] Membership activation failed:', membershipResult.error)
      throw createError({ statusCode: 500, statusMessage: 'Could not complete the test payment.' })
    }

    const { error: paymentError } = await adminClient
      .from('payments')
      .insert({
        user_id: userId,
        plan_id: dbPlan.id,
        provider: 'mobile_payment',
        amount: plan.amount,
        currency: plan.currency,
        reference: transactionRef,
        status: 'completed',
      })

    if (paymentError) {
      console.warn('[Subscription Mobile Payment Test] Completed payment record insert failed:', paymentError)
    }

    return {
      success: true,
      paymentRequested: false,
      paymentCompleted: true,
      testMode: true,
      status: 'completed',
      planId,
      planName: plan.name,
      amount: plan.amount,
      currency: plan.currency,
      phone,
      transactionRef,
      periodEnd: periodEnd.toISOString(),
      message: 'Test payment completed. Your plan is active for testing.',
      providerResponse: {
        status: 'completed',
        reference: transactionRef,
        testPhone: true,
      },
    }
  }

  if (!baseUrl) {
    throw createError({
      statusCode: 503,
      statusMessage: 'MTN/Airtel mobile payment is not configured for subscriptions yet.',
    })
  }

  const adminClient = serverSupabaseServiceRole(event)
  const { data: dbPlan, error: planError } = await adminClient
    .from('plans')
    .select('id, name, internal_slug')
    .eq('internal_slug', planId)
    .maybeSingle()

  if (planError || !dbPlan?.id) {
    console.warn('[Subscription Mobile Payment] Plan lookup failed:', planError)
    throw createError({ statusCode: 500, statusMessage: 'Could not prepare the selected plan.' })
  }

  const { error: pendingPaymentError } = await adminClient
    .from('payments')
    .insert({
      user_id: userId,
      plan_id: dbPlan.id,
      provider: 'mobile_payment',
      amount: plan.amount,
      currency: plan.currency,
      reference: transactionRef,
      status: 'pending',
    })

  if (pendingPaymentError) {
    console.warn('[Subscription Mobile Payment] Pending payment record insert failed:', pendingPaymentError)
  }

  const response = await fetch(`${baseUrl}/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'ReplySuite Subscription Mobile Payment/1.0',
    },
    body: JSON.stringify({
      amount: plan.amount,
      phone,
      transactionRef,
    }),
  })

  const responseText = await response.text()
  let providerResponse: unknown = responseText
  try {
    providerResponse = JSON.parse(responseText)
  } catch {}

  if (!response.ok) {
    console.warn('[Subscription Mobile Payment] Worker rejected payment request:', response.status, providerResponse)
    await adminClient
      .from('payments')
      .update({ status: 'failed' })
      .eq('reference', transactionRef)
      .eq('user_id', userId)

    throw createError({
      statusCode: 502,
      statusMessage: 'MTN/Airtel mobile payment request failed. Please try again or use card payment.',
      data: { status: response.status },
    })
  }

  return {
    success: true,
    paymentRequested: true,
    planId,
    planName: plan.name,
    amount: plan.amount,
    currency: plan.currency,
    phone,
    transactionRef,
    message: 'Payment prompt sent. Complete it on your phone, then contact support or use plan sync after confirmation.',
    providerResponse,
  }
})
