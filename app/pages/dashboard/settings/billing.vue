<script setup lang="ts">
import {
  Crown,
  Shield,
  Loader2,
  RefreshCcw,
  CreditCard,
  Sparkles
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

useHead({
  title: 'Billing'
})

const route = useRoute()
const router = useRouter()
const { membership, planSlug, isLoading: isAuthLoading, syncWithPolar } = useAuth()

const isMounted = ref(false)
const isLoading = computed(() => !isMounted.value || isAuthLoading.value)

const { data: polarTransactionData, pending: loadingTransactions, refresh: refreshPolarTransactions } = useAsyncData(
  'polar-transactions',
  () => $fetch<{ success: boolean; customerCount: number; transactions: any[] }>('/api/billing/transactions'),
  { server: false, immediate: false }
)

const polarTransactions = computed(() => {
  return (polarTransactionData.value?.transactions || []).filter((transaction: any) => {
    const billingReason = String(transaction?.billingReason || '').toLowerCase()
    return Boolean(transaction?.subscriptionId) || billingReason.includes('subscription')
  })
})
const transactionPage = ref(1)
const transactionsPerPage = 5

const totalTransactionPages = computed(() => Math.max(1, Math.ceil(polarTransactions.value.length / transactionsPerPage)))

const paginatedPolarTransactions = computed(() => {
  const start = (transactionPage.value - 1) * transactionsPerPage
  return polarTransactions.value.slice(start, start + transactionsPerPage)
})

watch(() => polarTransactions.value.length, () => {
  transactionPage.value = 1
})

watch(totalTransactionPages, (pages) => {
  if (transactionPage.value > pages) {
    transactionPage.value = pages
  }
})

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const reconcileBilling = async (withRetry = false) => {
  const maxAttempts = withRetry ? 5 : 1
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await syncWithPolar()
    if (!withRetry || result?.hasActiveSubscription) return result
    if (attempt < maxAttempts) await wait(1500)
  }
  return null
}

onMounted(async () => {
  isMounted.value = true

  if (route.query.success === 'true') {
    await reconcileBilling(true)
    const nextQuery = { ...route.query }
    delete nextQuery.success
    await router.replace({ path: route.path, query: nextQuery })
  }

  await refreshPolarTransactions()
})

const planNames: Record<string, string> = {
  starter: 'Free Starter',
  silver: 'Silver',
  gold: 'Gold',
  'enterprise-ready': 'Enterprise Ready'
}

const currentPlanName = computed(() => planSlug.value ? planNames[planSlug.value] || planSlug.value : 'No active plan')
const isFreePlan = computed(() => planSlug.value === 'starter')
const planStatusLabel = computed(() => isFreePlan.value ? 'Current plan' : 'Active subscription')
const planStatusDescription = computed(() => {
  if (isFreePlan.value) return 'Free access is active. Upgrade anytime when you need more channels or usage.'
  if (!planSlug.value) return 'Choose a plan from dashboard pricing to activate your workspace.'
  return 'This is your current access level. Payment history below does not change it.'
})
const billingDateLabel = computed(() => isFreePlan.value ? 'Renewal' : 'Next billing date')
const billingDateValue = computed(() => {
  if (isFreePlan.value) return 'No renewal needed'
  return membership.value?.ends_at ? formatDate(membership.value.ends_at) : 'Not scheduled'
})

const formatDate = (value?: string | null) => {
  if (!value) return 'N/A'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

const formatMoney = (amount?: number | null, currency = 'usd') => {
  if (amount === null || amount === undefined) return '—'
  const normalizedCurrency = currency.toUpperCase()
  const divisor = normalizedCurrency === 'RWF' ? 1 : 100
  const value = amount / divisor

  if (normalizedCurrency === 'RWF') {
    return `${new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(value)} RWF`
  }

  return new Intl.NumberFormat('en', { style: 'currency', currency: normalizedCurrency, maximumFractionDigits: 2 }).format(value)
}

const getPaymentSourceLabel = (transaction: any) => {
  if (transaction?.source === 'mobile_payment') return 'MTN/Airtel mobile payment'
  return 'Card payment'
}

const isCurrentPlanTransaction = (transaction: any) => Boolean(transaction?.planSlug && transaction.planSlug === planSlug.value)

const getPlanRecordLabel = (transaction: any) => {
  if (!transaction?.planSlug) return 'Payment record'
  return isCurrentPlanTransaction(transaction) ? 'Current plan payment' : 'Previous plan payment'
}

const getPlanRecordClass = (transaction: any) => {
  if (isCurrentPlanTransaction(transaction)) return 'border-primary/20 bg-primary/10 text-primary'
  return 'border-foreground/10 bg-foreground/5 text-foreground/45'
}

const getStatusClass = (status: string) => {
  if (status === 'paid' || status === 'succeeded' || status === 'active') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
  if (status === 'pending' || status === 'open') return 'border-amber-500/20 bg-amber-500/10 text-amber-400'
  if (status === 'refunded' || status === 'voided' || status === 'failed') return 'border-rose-500/20 bg-rose-500/10 text-rose-400'
  return 'border-foreground/10 bg-foreground/5 text-foreground/50'
}

const getPlanIcon = (slug?: string | null) => {
  if (slug === 'gold' || slug === 'enterprise-ready') return Crown
  if (slug === 'silver') return Shield
  return Sparkles
}
</script>

<template>
  <div class="space-y-4 pt-3 pb-24 md:pt-4 lg:pb-0">
    <section class="rounded-[0.39rem] border border-foreground/10 bg-background p-3 shadow-sm shadow-black/5 md:p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.39rem] border border-primary/15 bg-primary/10 text-primary">
            <CreditCard class="h-4 w-4" />
          </div>
          <div class="min-w-0">
            <h1 class="dashboard-section-title truncate">Billing</h1>
            <p class="dashboard-muted mt-0.5">Plan status, mobile payments, and card subscription history.</p>
          </div>
        </div>

        <NuxtLink
          to="/dashboard/pricing"
          class="dashboard-action-label inline-flex w-fit items-center justify-center rounded-[0.39rem] bg-primary px-3 py-2 text-black transition hover:bg-primary-accent"
        >
          View pricing
        </NuxtLink>
      </div>
    </section>

    <div class="grid items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <SettingsNavigation align-on-lg />

      <main class="space-y-4 overflow-hidden">
        <div v-if="isLoading" class="flex min-h-[240px] items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <div class="flex flex-col items-center gap-3">
            <Loader2 class="h-7 w-7 animate-spin text-primary" />
            <p class="text-xs font-bold text-foreground/50">Synchronizing billing...</p>
          </div>
        </div>

        <template v-else>
          <section class="overflow-hidden rounded-[0.39rem] border border-primary/20 bg-primary/10 shadow-sm shadow-black/5">
            <div class="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between md:p-4">
              <div class="flex min-w-0 items-center gap-3">
                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.39rem] border border-primary/15 bg-background/70 text-primary">
                  <component :is="getPlanIcon(planSlug)" class="h-4 w-4" />
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-primary">{{ planStatusLabel }}</p>
                  <h2 class="mt-0.5 truncate text-lg font-bold text-foreground">{{ currentPlanName }}</h2>
                  <p class="mt-0.5 text-xs text-foreground/55">{{ planStatusDescription }}</p>
                </div>
              </div>

              <div class="grid gap-2 sm:grid-cols-[auto_auto] sm:items-center">
                <div class="rounded-[0.39rem] border border-foreground/10 bg-background/60 px-3 py-2 sm:text-right">
                  <p class="text-[11px] font-bold text-foreground/40">{{ billingDateLabel }}</p>
                  <p class="mt-0.5 text-sm font-bold text-foreground">{{ billingDateValue }}</p>
                </div>
                <button
                  @click="refreshPolarTransactions"
                  :disabled="loadingTransactions"
                  class="dashboard-action-label inline-flex items-center justify-center gap-1.5 rounded-[0.39rem] border border-foreground/10 bg-background/60 px-3 py-2 text-foreground/60 transition hover:border-primary/20 hover:text-primary disabled:opacity-50"
                >
                  <Loader2 v-if="loadingTransactions" class="h-3.5 w-3.5 animate-spin" />
                  <RefreshCcw v-else class="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>
            </div>
          </section>

          <section class="overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background shadow-sm shadow-black/5">
            <div class="flex flex-col gap-3 border-b border-foreground/10 bg-foreground/[0.015] p-3 md:flex-row md:items-center md:justify-between md:p-4">
              <div class="flex items-center gap-2.5">
                <div class="flex h-8 w-8 items-center justify-center rounded-[0.35rem] border border-primary/15 bg-primary/10">
                  <CreditCard class="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 class="text-sm font-bold text-foreground">Payment history</h2>
                  <p class="mt-0.5 text-xs text-foreground/45">Historical mobile money and card records. Your active plan is shown above.</p>
                </div>
              </div>
              <span class="inline-flex w-fit items-center rounded-[0.35rem] border border-foreground/10 bg-background/70 px-2.5 py-1 text-[11px] font-bold text-foreground/45">
                {{ polarTransactions.length }} records
              </span>
            </div>

            <div v-if="loadingTransactions" class="space-y-2 p-3 md:p-4">
              <div v-for="i in 4" :key="i" class="h-12 animate-pulse rounded-[0.39rem] bg-foreground/5"></div>
            </div>

            <div v-else-if="!polarTransactions.length" class="p-6 text-center">
              <div class="mx-auto flex h-11 w-11 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-foreground/5 text-foreground/40">
                <CreditCard class="h-5 w-5" />
              </div>
              <h3 class="mt-3 text-sm font-bold text-foreground">No payment history found</h3>
              <p class="mx-auto mt-1.5 max-w-md text-xs leading-5 text-foreground/50">
                Mobile money and card records will appear here after checkout starts.
              </p>
            </div>

            <div v-else>
              <div class="overflow-x-auto">
                <table class="w-full min-w-[840px] text-left">
                  <thead class="border-b border-foreground/10 bg-foreground/[0.02] text-[11px] font-bold text-foreground/45">
                    <tr>
                      <th class="px-3 py-2.5 md:px-4">Subscription</th>
                      <th class="px-3 py-2.5 md:px-4">Status</th>
                      <th class="px-3 py-2.5 md:px-4">Amount</th>
                      <th class="px-3 py-2.5 md:px-4">Date</th>
                      <th class="px-3 py-2.5 md:px-4">Source</th>
                      <th class="px-3 py-2.5 md:px-4">Reference</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-foreground/10">
                    <tr v-for="transaction in paginatedPolarTransactions" :key="transaction.id" class="transition-colors hover:bg-foreground/[0.02]">
                      <td class="px-3 py-3 md:px-4">
                        <div class="flex items-center gap-2.5">
                          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] border border-primary/15 bg-primary/10 text-primary">
                            <component :is="getPlanIcon(transaction.planSlug)" class="h-4 w-4" />
                          </div>
                          <div class="min-w-0">
                            <p class="truncate text-sm font-bold text-foreground">{{ transaction.productName }}</p>
                            <div class="mt-1 flex flex-wrap items-center gap-1.5">
                              <span class="inline-flex rounded-[0.3rem] border px-1.5 py-0.5 text-[10px] font-bold" :class="getPlanRecordClass(transaction)">
                                {{ getPlanRecordLabel(transaction) }}
                              </span>
                              <span class="truncate text-xs text-foreground/40">{{ transaction.billingReason || transaction.planSlug || 'Payment record' }}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td class="px-3 py-3 md:px-4">
                        <span class="inline-flex rounded-[0.35rem] border px-2 py-1 text-[11px] font-bold" :class="getStatusClass(transaction.status)">
                          {{ transaction.status }}
                        </span>
                      </td>
                      <td class="px-3 py-3 md:px-4">
                        <div class="space-y-1">
                          <p class="text-sm font-bold text-foreground/70">{{ formatMoney(transaction.amount, transaction.currency) }}</p>
                          <p v-if="transaction.refundedAmount" class="text-[11px] font-bold text-rose-400">
                            Refunded {{ formatMoney(transaction.refundedAmount, transaction.currency) }}
                          </p>
                        </div>
                      </td>
                      <td class="px-3 py-3 text-sm text-foreground/55 md:px-4">{{ formatDate(transaction.createdAt) }}</td>
                      <td class="px-3 py-3 text-sm font-bold text-foreground/60 md:px-4">{{ getPaymentSourceLabel(transaction) }}</td>
                      <td class="px-3 py-3 md:px-4">
                        <code class="rounded-[0.35rem] bg-foreground/5 px-2 py-1 text-[11px] text-foreground/45">{{ transaction.reference || transaction.id }}</code>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="flex flex-col gap-3 border-t border-foreground/10 bg-foreground/[0.015] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between md:px-4">
                <p class="text-xs font-bold text-foreground/45">
                  Showing {{ ((transactionPage - 1) * transactionsPerPage) + 1 }}-{{ Math.min(transactionPage * transactionsPerPage, polarTransactions.length) }} of {{ polarTransactions.length }} payment records
                </p>
                <div class="flex items-center gap-2">
                  <button
                    @click="transactionPage = Math.max(1, transactionPage - 1)"
                    :disabled="transactionPage === 1"
                    class="dashboard-action-label rounded-[0.39rem] border border-foreground/10 px-3 py-2 text-foreground/50 transition hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <span class="rounded-[0.39rem] border border-foreground/10 bg-background px-3 py-2 text-xs font-bold text-foreground/60">
                    {{ transactionPage }} / {{ totalTransactionPages }}
                  </span>
                  <button
                    @click="transactionPage = Math.min(totalTransactionPages, transactionPage + 1)"
                    :disabled="transactionPage === totalTransactionPages"
                    class="dashboard-action-label rounded-[0.39rem] border border-foreground/10 px-3 py-2 text-foreground/50 transition hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </section>
        </template>
      </main>
    </div>
  </div>
</template>
