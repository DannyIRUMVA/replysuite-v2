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

const { membership, planSlug, isLoading: isAuthLoading, syncWithPolar, polarCustomerId } = useAuth()

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

onMounted(async () => {
  isMounted.value = true

  if (polarCustomerId.value) {
    await syncWithPolar()
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

const formatDate = (value?: string | null) => {
  if (!value) return 'N/A'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

const formatMoney = (amount?: number | null, currency = 'usd') => {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100)
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
  <div class="space-y-6 pb-24 lg:pb-0">
    <div class="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <SettingsNavigation align-on-lg />

      <main class="space-y-6 overflow-hidden">
        <div v-if="isLoading" class="flex min-h-[320px] items-center justify-center rounded-[24px] border border-foreground/10 bg-background">
          <div class="flex flex-col items-center gap-4">
            <Loader2 class="h-10 w-10 animate-spin text-primary" />
            <p class="text-xs font-bold uppercase tracking-widest text-foreground/50">Synchronizing billing...</p>
          </div>
        </div>

        <template v-else>
          <section class="rounded-[24px] border border-primary/20 bg-primary/10 p-5 md:p-6">
            <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-background/70 text-primary">
                  <component :is="getPlanIcon(planSlug)" class="h-6 w-6" />
                </div>
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Active subscription</p>
                  <h2 class="mt-1 text-xl font-black tracking-tight text-foreground md:text-2xl">{{ currentPlanName }}</h2>
                  <p class="mt-1 text-sm text-foreground/55">Manage plan changes from the dashboard pricing page.</p>
                </div>
              </div>

              <div class="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
                <div class="rounded-2xl border border-foreground/10 bg-background/60 px-4 py-3 sm:text-right">
                  <p class="text-[10px] font-black uppercase tracking-widest text-foreground/40">Next billing date</p>
                  <p class="mt-1 text-sm font-bold text-foreground">{{ membership?.ends_at ? formatDate(membership.ends_at) : 'N/A' }}</p>
                </div>
                <NuxtLink
                  to="/dashboard/pricing"
                  class="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-primary-accent"
                >
                  View dashboard pricing
                </NuxtLink>
              </div>
            </div>
          </section>

          <section class="overflow-hidden rounded-[24px] border border-foreground/10 bg-background">
            <div class="flex flex-col gap-3 border-b border-foreground/10 bg-foreground/[0.015] p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Polar subscriptions</p>
                <h2 class="mt-1 text-lg font-black tracking-tight text-foreground">Subscription billing from Polar</h2>
                <p class="mt-1 text-sm text-foreground/50">Only subscription orders and renewals connected to your Polar customer profile.</p>
              </div>
              <button
                @click="refreshPolarTransactions"
                :disabled="loadingTransactions"
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-foreground/60 transition-all hover:bg-foreground/10 disabled:opacity-50"
              >
                <Loader2 v-if="loadingTransactions" class="h-3.5 w-3.5 animate-spin" />
                <RefreshCcw v-else class="h-3.5 w-3.5" />
                Refresh list
              </button>
            </div>

            <div v-if="loadingTransactions" class="space-y-3 p-5">
              <div v-for="i in 4" :key="i" class="h-16 animate-pulse rounded-2xl bg-foreground/5"></div>
            </div>

            <div v-else-if="!polarTransactions.length" class="p-8 text-center">
              <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/5 text-foreground/40">
                <CreditCard class="h-7 w-7" />
              </div>
              <h3 class="mt-4 text-base font-black text-foreground">No Polar subscriptions found</h3>
              <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-foreground/50">
                Subscription checkout orders and renewals from Polar will appear here after they are associated with your customer profile.
              </p>
            </div>

            <div v-else>
              <div class="overflow-x-auto">
                <table class="w-full min-w-[920px] text-left">
                <thead class="border-b border-foreground/10 bg-foreground/[0.02] text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">
                  <tr>
                    <th class="px-5 py-4">Subscription</th>
                    <th class="px-5 py-4">Status</th>
                    <th class="px-5 py-4">Amount</th>
                    <th class="px-5 py-4">Date</th>
                    <th class="px-5 py-4">Invoice</th>
                    <th class="px-5 py-4">Order ID</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-foreground/10">
                  <tr v-for="transaction in paginatedPolarTransactions" :key="transaction.id" class="transition-colors hover:bg-foreground/[0.02]">
                    <td class="px-5 py-4">
                      <div class="flex items-center gap-3">
                        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <component :is="getPlanIcon(transaction.planSlug)" class="h-5 w-5" />
                        </div>
                        <div>
                          <p class="text-sm font-black text-foreground">{{ transaction.productName }}</p>
                          <p class="text-xs text-foreground/40">{{ transaction.billingReason || transaction.planSlug || 'Polar order' }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-5 py-4">
                      <span class="inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest" :class="getStatusClass(transaction.status)">
                        {{ transaction.status }}
                      </span>
                    </td>
                    <td class="px-5 py-4">
                      <div class="space-y-1">
                        <p class="text-sm font-bold text-foreground/70">{{ formatMoney(transaction.amount, transaction.currency) }}</p>
                        <p v-if="transaction.refundedAmount" class="text-[10px] font-black uppercase tracking-widest text-rose-400">
                          Refunded {{ formatMoney(transaction.refundedAmount, transaction.currency) }}
                        </p>
                      </div>
                    </td>
                    <td class="px-5 py-4 text-sm text-foreground/55">{{ formatDate(transaction.createdAt) }}</td>
                    <td class="px-5 py-4 text-sm font-bold text-foreground/60">{{ transaction.invoiceNumber || 'N/A' }}</td>
                    <td class="px-5 py-4">
                      <code class="rounded-lg bg-foreground/5 px-2 py-1 text-[11px] text-foreground/45">{{ transaction.id }}</code>
                    </td>
                  </tr>
                </tbody>
                </table>
              </div>

              <div class="flex flex-col gap-3 border-t border-foreground/10 bg-foreground/[0.015] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p class="text-xs font-bold text-foreground/45">
                  Showing {{ ((transactionPage - 1) * transactionsPerPage) + 1 }}-{{ Math.min(transactionPage * transactionsPerPage, polarTransactions.length) }} of {{ polarTransactions.length }} subscriptions
                </p>
                <div class="flex items-center gap-2">
                  <button
                    @click="transactionPage = Math.max(1, transactionPage - 1)"
                    :disabled="transactionPage === 1"
                    class="rounded-xl border border-foreground/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/50 transition-all hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <span class="rounded-xl border border-foreground/10 bg-background px-3 py-2 text-xs font-black text-foreground/60">
                    {{ transactionPage }} / {{ totalTransactionPages }}
                  </span>
                  <button
                    @click="transactionPage = Math.min(totalTransactionPages, transactionPage + 1)"
                    :disabled="transactionPage === totalTransactionPages"
                    class="rounded-xl border border-foreground/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/50 transition-all hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
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
