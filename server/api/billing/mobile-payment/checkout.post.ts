import { serverSupabaseUser } from '#supabase/server'

const sanitizeString = (value: unknown, maxLength = 500) => String(value || '').trim().slice(0, maxLength)
const normalizePhoneForMobilePayment = (phone: string) => sanitizeString(phone, 32).replace(/\s+/g, '').replace(/^\+250/, '0').replace(/^250/, '0')
const isValidRwandaPhone = (phone: string) => /^07[2389]\d{7}$/.test(phone)

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
  if (!baseUrl) {
    throw createError({
      statusCode: 503,
      statusMessage: 'MTN/Airtel mobile payment is not configured for subscriptions yet.',
    })
  }

  const transactionRef = makeTransactionRef(planId, userId)

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
