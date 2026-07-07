<script setup lang="ts">
import { Check, ArrowRight, Loader2, Shield, Smartphone, X, Crown, Sparkles } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

useSeoMeta({
  title: 'Choose Your Plan',
  description: 'Unlock the full power of ReplySuite AI automation.',
})

const { refreshAuth, planSlug, syncWithPolar, isLoading: isAuthLoading } = useAuth()
const isProcessing = ref<string | null>(null)
const selectedMobilePlan = ref<any | null>(null)
const mobilePhone = ref('')
const mobilePaymentResult = ref<any | null>(null)
const notify = useNotify()

const isMounted = ref(false)
const isLoading = computed(() => !isMounted.value || isAuthLoading.value)

onMounted(() => {
  isMounted.value = true
})

const handleSelect = async (plan: any) => {
  if (planActionDisabled(plan)) return
  isProcessing.value = `${plan.id}:card`

  try {
    if (plan.id === 'starter') {
      const res = await $fetch('/api/billing/onboard-free', { method: 'POST' })
      if (res.success) {
        await refreshAuth()
        notify.success('Starter plan activated')
        return navigateTo('/dashboard/analytics')
      }
    } else {
      if (!plan.productId) {
        notify.warn('Plan configuration missing. Please contact support.')
        return
      }

      const res = await $fetch('/api/billing/checkout', {
        method: 'POST',
        body: { productId: plan.productId }
      })

      if (res.url) {
        window.location.href = res.url
      } else if (res.updated) {
        notify.success('Plan updated successfully. Your new limits are active.')
        await syncWithPolar()
      }
    }
  } catch (err: any) {
    console.error('[Dashboard Pricing] Action failed:', err)
    const message = err?.data?.message || err?.data?.statusMessage || err?.statusMessage || err?.message || 'Failed to process request. Please try again.'
    notify.error(message)
  } finally {
    isProcessing.value = null
  }
}

const openMobilePayment = (plan: any) => {
  if (planActionDisabled(plan)) return
  selectedMobilePlan.value = plan
  mobilePhone.value = ''
  mobilePaymentResult.value = null
}

const closeMobilePayment = () => {
  if (isProcessing.value?.includes(':mobile')) return
  selectedMobilePlan.value = null
  mobilePhone.value = ''
  mobilePaymentResult.value = null
}

const requestMobilePayment = async () => {
  if (!selectedMobilePlan.value) return
  isProcessing.value = `${selectedMobilePlan.value.id}:mobile`
  mobilePaymentResult.value = null

  try {
    const res = await $fetch('/api/billing/mobile-payment/checkout', {
      method: 'POST',
      body: {
        planId: selectedMobilePlan.value.id,
        phone: mobilePhone.value,
      },
    })

    mobilePaymentResult.value = res

    if ((res as any)?.paymentCompleted) {
      await refreshAuth()
    }

    notify.success((res as any)?.paymentCompleted ? 'Payment completed. Plan activated.' : 'MTN/Airtel mobile payment prompt sent.')
  } catch (err: any) {
    console.error('[Dashboard Pricing] Mobile payment failed:', err)
    const message = err?.data?.message || err?.data?.statusMessage || err?.statusMessage || err?.message || 'Mobile payment request failed. Please try again.'
    notify.error(message)
  } finally {
    isProcessing.value = null
  }
}

const formatRwf = (amount: number) => `${new Intl.NumberFormat('en-RW', {
  maximumFractionDigits: 0,
}).format(amount)} RWF`

const plans = [
  {
    id: 'starter',
    name: 'Free Starter',
    price: '0.00',
    desc: 'Launch one website chatbot.',
    features: ['1 website chatbot', '1 connected domain', '100 AI replies / mo', '10 training sessions', 'Email support'],
    popular: false
  },
  {
    id: 'silver',
    name: 'Silver',
    productId: 'dc070937-6444-40a6-8a02-fd8b25df7aae',
    price: '17.88',
    mobilePriceRwf: 25000,
    desc: 'Website and WhatsApp automation for growing teams.',
    features: ['3 chatbots', 'Website + WhatsApp', '5 domains / chatbot', '4,000 AI replies / mo', '30 training sessions'],
    popular: true
  },
  {
    id: 'gold',
    name: 'Gold',
    productId: 'd0493f6f-16bc-4d3c-97bb-7be920840f12',
    price: '26.88',
    mobilePriceRwf: 38000,
    desc: 'More volume with Instagram workflows included.',
    features: ['5 chatbots', 'Website + WhatsApp', 'Instagram workflows', '10,000 AI replies / mo', '100 training sessions'],
    popular: false
  },
  {
    id: 'enterprise-ready',
    name: 'Enterprise Ready',
    productId: '3e478611-c444-46e5-9827-7450a1c8d046',
    price: '350.00',
    mobilePriceRwf: 490000,
    desc: 'Scale channels, appointments, and AI business tools.',
    features: ['50 chatbots', 'All supported channels', '500,000 AI replies / mo', 'AI business tools', 'Bookings + Google Calendar'],
    popular: false
  }
]

const paidPlans = computed(() => plans.filter((plan) => plan.id !== 'starter'))
const freeStarterPlan = computed(() => plans.find((plan) => plan.id === 'starter'))
const currentPlanName = computed(() => plans.find((plan) => plan.id === planSlug.value)?.name || 'No active plan')

const planPriority = (slug?: string | null) => {
  if (['enterprise-ready', 'enterprise'].includes(String(slug || '').toLowerCase())) return 4
  if (slug === 'gold') return 3
  if (slug === 'silver') return 2
  if (slug === 'starter') return 1
  return 0
}
const currentPlanPriority = computed(() => planPriority(planSlug.value))
const planIsCurrent = (plan: any) => planSlug.value === plan.id
const planIsCoveredByCurrent = (plan: any) => currentPlanPriority.value > planPriority(plan.id)
const planActionDisabled = (plan: any) => Boolean(isProcessing.value) || planIsCurrent(plan) || planIsCoveredByCurrent(plan)

const getPlanIcon = (plan: any) => {
  if (plan.id === 'enterprise-ready') return Crown
  if (plan.popular) return Shield
  return Sparkles
}

const getCtaLabel = (plan: any) => {
  if (planIsCurrent(plan)) return 'Current plan'
  if (planIsCoveredByCurrent(plan)) return 'Included'
  if (plan.id === 'starter') return 'Activate free'
  return 'Continue with mobile money'
}
</script>

<template>
  <div class="space-y-4 pt-3 pb-24 md:pt-4 lg:pb-0">
    <section class="rounded-[0.39rem] border border-foreground/10 bg-background p-3 shadow-sm shadow-black/5 md:p-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.39rem] border border-primary/15 bg-primary/10 text-primary">
            <Shield class="h-4 w-4" />
          </div>
          <div class="min-w-0">
            <h1 class="dashboard-section-title truncate">Pricing</h1>
            <p class="dashboard-muted mt-0.5">Choose a plan. MTN/Airtel mobile checkout is the primary payment path.</p>
          </div>
        </div>

        <div class="flex items-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.02] px-3 py-2">
          <span class="text-[11px] font-bold text-foreground/45">Current</span>
          <span class="text-sm font-bold text-foreground">{{ currentPlanName }}</span>
        </div>
      </div>
    </section>

    <div v-if="isLoading" class="flex min-h-[240px] items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background shadow-sm shadow-black/5">
      <div class="flex flex-col items-center gap-3">
        <Loader2 class="h-7 w-7 animate-spin text-primary" />
        <p class="text-xs font-bold text-foreground/50">Loading plans...</p>
      </div>
    </div>

    <template v-else>
      <section class="grid gap-3 xl:grid-cols-3">
        <article
          v-for="plan in paidPlans"
          :key="plan.id"
          class="relative flex min-h-full flex-col rounded-[0.39rem] border bg-background p-3 shadow-sm shadow-black/5 transition hover:border-primary/25 md:p-4"
          :class="[
            plan.popular ? 'border-primary/35 bg-primary/[0.035]' : 'border-foreground/10',
            planSlug === plan.id ? 'ring-1 ring-primary/40' : '',
            planIsCoveredByCurrent(plan) ? 'opacity-70' : ''
          ]"
        >
          <div class="mb-3 flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2.5">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] border border-primary/15 bg-primary/10 text-primary">
                <component :is="getPlanIcon(plan)" class="h-4 w-4" />
              </div>
              <div class="min-w-0">
                <h2 class="truncate text-base font-bold text-foreground">{{ plan.name }}</h2>
                <p class="mt-0.5 text-xs leading-5 text-foreground/45">{{ plan.desc }}</p>
              </div>
            </div>
            <span v-if="plan.popular" class="shrink-0 rounded-[0.35rem] border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">Best value</span>
            <span v-else-if="planSlug === plan.id" class="shrink-0 rounded-[0.35rem] border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">Current</span>
            <span v-else-if="planIsCoveredByCurrent(plan)" class="shrink-0 rounded-[0.35rem] border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-400">Included</span>
          </div>

          <div class="mb-3 rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.015] p-3">
            <div class="flex items-end justify-between gap-3">
              <div>
                <p class="text-[11px] font-bold text-foreground/40">Mobile checkout</p>
                <p class="mt-0.5 text-xl font-bold text-foreground">{{ formatRwf(plan.mobilePriceRwf) }}</p>
              </div>
              <div class="text-right">
                <p class="text-[11px] font-bold text-foreground/40">Card payment</p>
                <p class="mt-0.5 text-sm font-bold text-foreground/65">${{ plan.price }}/mo</p>
              </div>
            </div>
          </div>

          <div class="mb-4 grid gap-2">
            <button
              type="button"
              @click="openMobilePayment(plan)"
              :disabled="planActionDisabled(plan)"
              class="dashboard-action-label inline-flex w-full items-center justify-center gap-1.5 rounded-[0.39rem] bg-primary px-3 py-2 text-black transition hover:bg-primary-accent disabled:cursor-default disabled:opacity-60"
            >
              <Smartphone class="h-3.5 w-3.5" />
              {{ getCtaLabel(plan) }}
              <ArrowRight v-if="!planActionDisabled(plan)" class="h-3.5 w-3.5" />
            </button>

            <button
              @click="handleSelect(plan)"
              :disabled="isProcessing === `${plan.id}:card` || planActionDisabled(plan)"
              class="dashboard-action-label inline-flex w-full items-center justify-center gap-1.5 rounded-[0.39rem] border border-foreground/10 bg-background/60 px-3 py-2 text-foreground/55 transition hover:border-foreground/20 hover:text-foreground disabled:cursor-default disabled:opacity-50"
            >
              <Loader2 v-if="isProcessing === `${plan.id}:card`" class="h-3.5 w-3.5 animate-spin" />
              {{ isProcessing === `${plan.id}:card` ? 'Processing...' : planIsCoveredByCurrent(plan) ? 'No payment needed' : 'Continue with card' }}
            </button>
          </div>

          <div class="mt-auto space-y-2 border-t border-foreground/10 pt-3">
            <div v-for="feat in plan.features" :key="feat" class="flex items-center gap-2 text-xs font-medium text-foreground/55">
              <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Check class="h-2.5 w-2.5 text-primary" />
              </span>
              <span>{{ feat }}</span>
            </div>
          </div>
        </article>
      </section>

      <section v-if="freeStarterPlan" class="rounded-[0.39rem] border border-foreground/10 bg-background p-3 shadow-sm shadow-black/5 md:p-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <Sparkles class="h-4 w-4 text-primary" />
              <h2 class="text-sm font-bold text-foreground">{{ freeStarterPlan.name }}</h2>
              <span v-if="planIsCurrent(freeStarterPlan)" class="rounded-[0.35rem] border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">Current</span>
            </div>
            <p class="mt-1 text-xs text-foreground/50">{{ freeStarterPlan.desc }}</p>
          </div>

          <div class="grid gap-2 sm:grid-cols-2 lg:flex lg:items-center">
            <span v-for="feat in freeStarterPlan.features.slice(0, 3)" :key="feat" class="rounded-[0.35rem] border border-foreground/10 bg-foreground/[0.02] px-2.5 py-1.5 text-[11px] font-medium text-foreground/55">
              {{ feat }}
            </span>
          </div>

          <button
            @click="handleSelect(freeStarterPlan)"
            :disabled="isProcessing === `${freeStarterPlan.id}:card` || planActionDisabled(freeStarterPlan)"
            class="dashboard-action-label inline-flex w-full items-center justify-center gap-1.5 rounded-[0.39rem] border border-foreground/10 px-3 py-2 text-foreground/60 transition hover:border-primary/20 hover:text-primary disabled:cursor-default disabled:opacity-50 lg:w-auto"
          >
            <Loader2 v-if="isProcessing === `${freeStarterPlan.id}:card`" class="h-3.5 w-3.5 animate-spin" />
            {{ isProcessing === `${freeStarterPlan.id}:card` ? 'Processing...' : planIsCurrent(freeStarterPlan) ? 'Current plan' : 'Activate free' }}
          </button>
        </div>
      </section>
    </template>

    <div v-if="selectedMobilePlan" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center">
      <div class="w-full max-w-md overflow-hidden rounded-[0.5rem] border border-foreground/10 bg-background shadow-2xl shadow-black/40">
        <div class="flex items-start justify-between gap-4 border-b border-foreground/10 p-4">
          <div>
            <p class="text-xs font-bold text-primary">MTN/Airtel mobile checkout</p>
            <h3 class="mt-1 text-lg font-bold text-foreground">{{ selectedMobilePlan.name }}</h3>
            <p class="mt-1 text-xs leading-5 text-foreground/50">
              {{ formatRwf(selectedMobilePlan.mobilePriceRwf) }}/month. Enter the phone number that should receive the payment prompt.
            </p>
          </div>
          <button type="button" class="rounded-[0.35rem] border border-foreground/10 p-2 text-foreground/50 transition hover:bg-foreground/5 hover:text-foreground" @click="closeMobilePayment">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="space-y-3 p-4">
          <label class="block space-y-1.5">
            <span class="text-[11px] font-bold text-foreground/50">Phone number</span>
            <input
              v-model="mobilePhone"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              placeholder="078xxxxxxx"
              class="w-full rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.03] px-3 py-2.5 text-sm font-bold text-foreground outline-none transition placeholder:text-foreground/25 focus:border-primary/50"
              @keyup.enter="requestMobilePayment"
            />
          </label>

          <div v-if="mobilePaymentResult" class="rounded-[0.39rem] border border-emerald-500/15 bg-emerald-500/5 p-3">
            <p class="text-sm font-bold text-emerald-500">
              {{ mobilePaymentResult.paymentCompleted ? 'Payment complete' : 'Payment prompt sent' }}
            </p>
            <p class="mt-1 text-xs leading-5 text-foreground/55">
              <template v-if="mobilePaymentResult.paymentCompleted">
                Your test payment was completed and the plan is active. Reference:
              </template>
              <template v-else>
                Complete the prompt on your phone. Reference:
              </template>
              <span class="font-mono text-foreground/70">{{ mobilePaymentResult.transactionRef }}</span>
            </p>
            <p class="mt-2 text-[11px] font-bold text-foreground/35">
              {{ mobilePaymentResult.paymentCompleted ? 'This test activation runs for 30 days.' : 'Plan activation is confirmed after payment verification.' }}
            </p>
          </div>

          <button
            type="button"
            class="dashboard-action-label inline-flex w-full items-center justify-center gap-1.5 rounded-[0.39rem] bg-primary px-3 py-2.5 text-black transition hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isProcessing === `${selectedMobilePlan.id}:mobile`"
            @click="requestMobilePayment"
          >
            <Loader2 v-if="isProcessing === `${selectedMobilePlan.id}:mobile`" class="h-3.5 w-3.5 animate-spin" />
            <Smartphone v-else class="h-3.5 w-3.5" />
            Send payment prompt
          </button>

          <p class="text-center text-[11px] leading-5 text-foreground/40">
            Mobile money is recommended. Card payment remains available as fallback.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
