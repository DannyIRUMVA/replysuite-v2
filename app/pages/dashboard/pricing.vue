<script setup lang="ts">
import { Check, ArrowRight, Loader2, Shield, RefreshCcw, Smartphone, X } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

useSeoMeta({
  title: 'Choose Your Plan',
  description: 'Unlock the full power of ReplySuite AI automation.',
})

const { refreshAuth, planSlug, polarCustomerId, syncWithPolar, isLoading: isAuthLoading } = useAuth()
const isProcessing = ref<string | null>(null)
const selectedMobilePlan = ref<any | null>(null)
const mobilePhone = ref('')
const mobilePaymentResult = ref<any | null>(null)
const notify = useNotify()

const isMounted = ref(false)
const isLoading = computed(() => !isMounted.value || isAuthLoading.value)

onMounted(async () => {
  isMounted.value = true

  if (!polarCustomerId.value || !planSlug.value) {
    console.log('[Dashboard Pricing] Missing Polar identity or active plan. Syncing...')
    await syncWithPolar()
  }
})

const handleSelect = async (plan: any) => {
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
        // Full-page checkout avoids stale embedded iframe overlays after Polar redirects.
        window.location.href = res.url
      } else if (res.updated) {
        notify.success('Plan updated successfully! Your new limits are active.')
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
  if (planSlug.value === plan.id) return
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
    notify.success((res as any)?.paymentCompleted ? 'Test payment completed. Plan activated.' : 'MTN/Airtel mobile payment prompt sent.')
  } catch (err: any) {
    console.error('[Dashboard Pricing] Mobile payment failed:', err)
    const message = err?.data?.message || err?.data?.statusMessage || err?.statusMessage || err?.message || 'Mobile payment request failed. Please try again.'
    notify.error(message)
  } finally {
    isProcessing.value = null
  }
}

const formatRwf = (amount: number) => new Intl.NumberFormat('en-RW', {
  style: 'currency',
  currency: 'RWF',
  maximumFractionDigits: 0,
}).format(amount)

const plans = [
  {
    id: 'starter',
    name: 'Free Starter',
    price: '0.00',
    desc: 'Best for launching one chatbot on one website domain.',
    features: ['1 website chatbot', '1 connected domain / chatbot', '100 AI replies / mo', '10 training sessions', 'Email support'],
    popular: false
  },
  {
    id: 'silver',
    name: 'Silver',
    productId: 'dc070937-6444-40a6-8a02-fd8b25df7aae',
    price: '17.88',
    mobilePriceRwf: 25000,
    desc: 'Best for growing businesses that need website and WhatsApp chatbots.',
    features: ['3 chatbots', 'Website + WhatsApp support', '5 connected domains / chatbot', '4,000 AI replies / mo', '30 training sessions'],
    popular: true
  },
  {
    id: 'gold',
    name: 'Gold',
    productId: 'd0493f6f-16bc-4d3c-97bb-7be920840f12',
    price: '26.88',
    mobilePriceRwf: 38000,
    desc: 'Best for higher-volume conversations across website, WhatsApp, and Instagram workflows.',
    features: ['5 chatbots', 'Website + WhatsApp support', 'Instagram workflows', '10,000 AI replies / mo', '100 training sessions'],
    popular: false
  },
  {
    id: 'enterprise-ready',
    name: 'Enterprise Ready',
    productId: '3e478611-c444-46e5-9827-7450a1c8d046',
    price: '350.00',
    mobilePriceRwf: 490000,
    desc: 'Self-serve Enterprise for larger rollouts that need every channel plus AI business tools.',
    features: ['50 chatbots', 'All supported channels', '500,000 AI replies / mo', 'AI business tools', 'Appointments, bookings, Google Calendar, MTN/Airtel mobile checkout'],
    popular: false
  }
]

const paidPlans = computed(() => plans.filter((plan) => plan.id !== 'starter'))
const freeStarterPlan = computed(() => plans.find((plan) => plan.id === 'starter'))
const currentPlanName = computed(() => plans.find((plan) => plan.id === planSlug.value)?.name || 'No active plan')

const getCtaLabel = (plan: any) => {
  if (planSlug.value === plan.id) return 'Current Plan'
  if (plan.id === 'starter') return 'Activate Free'
  if (plan.id === 'enterprise-ready') return 'Start Enterprise'
  return 'Select Plan'
}
</script>

<template>
  <div class="relative space-y-8 overflow-hidden pb-24 lg:pb-8">
    <div class="pointer-events-none absolute -top-28 left-8 h-64 w-64 rounded-full bg-primary/10 blur-[100px]"></div>
    <div class="pointer-events-none absolute top-40 right-0 h-72 w-72 rounded-full bg-sky-400/10 blur-[110px]"></div>

    <section class="relative overflow-hidden rounded-[34px] border border-foreground/10 bg-foreground/[0.025] p-6 md:p-8 lg:p-10">
      <div class="absolute inset-0 bg-gradient-to-br from-white/[0.045] via-transparent to-primary/[0.035]"></div>
      <div class="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <span class="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
            Pricing subscription
          </span>
          <h1 class="mt-5 max-w-3xl text-2xl font-extrabold leading-tight tracking-tight text-foreground md:text-4xl">
            Choose the subscription that fits your business.
          </h1>
          <p class="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-foreground/55 md:text-base">
            Upgrade your ReplySuite limits when you need more assistants, more replies, more training, WhatsApp, Instagram workflows, or Enterprise AI business tools.
          </p>
        </div>

        <div class="rounded-[28px] border border-foreground/10 bg-background/60 p-5 backdrop-blur-xl">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">Active subscription</p>
          <div class="mt-3 flex items-center justify-between gap-4">
            <div>
              <p class="text-xl font-black tracking-tight text-foreground md:text-2xl">{{ currentPlanName }}</p>
              <p class="mt-1 text-xs font-medium text-foreground/50">Sync if your checkout just completed.</p>
            </div>
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Shield class="h-6 w-6" />
            </div>
          </div>
          <button
            @click="syncWithPolar"
            class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-foreground transition-all hover:bg-foreground/10"
          >
            <RefreshCcw class="h-3.5 w-3.5" />
            Sync plan status
          </button>
        </div>
      </div>
    </section>

    <div v-if="isLoading" class="glass-card flex min-h-[40vh] flex-col items-center justify-center py-20">
      <Loader2 class="mb-6 h-12 w-12 animate-spin text-primary" />
      <p class="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">Loading plans...</p>
    </div>

    <template v-else>
      <section class="relative">
        <div class="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <span class="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              Pricing subscriptions
            </span>
            <h2 class="mt-3 text-xl font-extrabold tracking-tight text-foreground md:text-2xl">Choose your growth plan.</h2>
          </div>
          <p class="max-w-md text-sm font-medium leading-relaxed text-foreground/50">Silver adds WhatsApp. Gold adds Instagram workflows. Enterprise Ready adds AI business tools, checkout, and scale.</p>
        </div>

        <div class="grid gap-5 xl:grid-cols-3">
          <div
            v-for="plan in paidPlans"
            :key="plan.id"
            class="glass-card relative flex flex-col border-foreground/10 bg-foreground/[0.02] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 md:p-7"
            :class="[
              plan.popular ? 'border-primary/40 !bg-primary/[0.035] shadow-xl shadow-primary/5' : '',
              planSlug === plan.id ? 'ring-1 ring-primary/40' : ''
            ]"
          >
            <div v-if="plan.popular" class="absolute -top-3 left-6 rounded-full bg-primary px-4 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-black shadow-xl shadow-primary/20">
              Best Value
            </div>
            <div v-if="planSlug === plan.id" class="absolute right-5 top-5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-primary">
              Current
            </div>

            <div class="mb-7">
              <h3 class="text-xl font-black tracking-tight text-foreground">{{ plan.name }}</h3>
              <p class="mt-3 min-h-[42px] text-sm font-medium leading-relaxed text-foreground/50">{{ plan.desc }}</p>
            </div>

            <div class="mb-7 flex items-baseline gap-2">
              <span class="text-4xl font-extrabold tracking-tighter text-foreground md:text-5xl">${{ plan.price }}</span>
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/50">/month</span>
            </div>

            <div class="mb-8 space-y-2">
              <button
                @click="handleSelect(plan)"
                :disabled="isProcessing === `${plan.id}:card` || planSlug === plan.id"
                class="flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-bold tracking-[0.1em] transition-all disabled:cursor-default disabled:opacity-80"
                :class="plan.popular ? 'btn-gradient' : 'border border-foreground/10 bg-foreground/5 text-foreground hover:bg-foreground/10 hover:border-foreground/20'"
              >
                <template v-if="isProcessing === `${plan.id}:card`">
                  <Loader2 class="h-4 w-4 animate-spin" />
                  Processing...
                </template>
                <template v-else>
                  {{ getCtaLabel(plan) }} by card
                  <ArrowRight v-if="planSlug !== plan.id" class="h-4 w-4" />
                </template>
              </button>

              <button
                type="button"
                @click="openMobilePayment(plan)"
                :disabled="Boolean(isProcessing) || planSlug === plan.id"
                class="flex w-full items-center justify-center gap-2 rounded-full border border-foreground/10 bg-background/50 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-foreground/70 transition-all hover:border-primary/25 hover:bg-primary/5 hover:text-foreground disabled:cursor-default disabled:opacity-60"
              >
                <Smartphone class="h-4 w-4" />
                MTN/Airtel mobile payment
              </button>
              <p v-if="plan.mobilePriceRwf" class="text-center text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/35">
                Mobile price: {{ formatRwf(plan.mobilePriceRwf) }}/month
              </p>
            </div>

            <div class="space-y-4">
              <div v-for="feat in plan.features" :key="feat" class="flex items-center gap-3 text-sm font-medium text-foreground/55">
                <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Check class="h-3 w-3 text-primary" />
                </div>
                {{ feat }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="freeStarterPlan" class="glass-card border border-foreground/10 bg-foreground/[0.02] p-6 md:p-8">
        <div class="grid gap-6 lg:grid-cols-[0.85fr_1.35fr_auto] lg:items-center">
          <div>
            <span class="mb-4 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              Free Starter subscription
            </span>
            <h3 class="text-xl font-black tracking-tight text-foreground md:text-2xl">{{ freeStarterPlan.name }}</h3>
            <p class="mt-2 text-sm font-medium leading-relaxed text-foreground/50">{{ freeStarterPlan.desc }}</p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div v-for="feat in freeStarterPlan.features" :key="feat" class="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-background/40 px-4 py-3 text-xs font-medium text-foreground/55">
              <div class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Check class="h-2.5 w-2.5 text-primary" />
              </div>
              {{ feat }}
            </div>
          </div>

          <div class="lg:text-right">
            <div class="mb-4 flex items-baseline gap-2 lg:justify-end">
              <span class="text-4xl font-extrabold tracking-tighter text-foreground">${{ freeStarterPlan.price }}</span>
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/50">/month</span>
            </div>
            <button
              @click="handleSelect(freeStarterPlan)"
              :disabled="isProcessing === `${freeStarterPlan.id}:card` || planSlug === freeStarterPlan.id"
              class="flex w-full items-center justify-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-8 py-4 text-sm font-bold tracking-[0.1em] text-foreground transition-all hover:border-foreground/20 hover:bg-foreground/10 disabled:cursor-default disabled:opacity-80 lg:w-auto"
            >
              <template v-if="isProcessing === `${freeStarterPlan.id}:card`">
                <Loader2 class="h-4 w-4 animate-spin" />
                Processing...
              </template>
              <template v-else>
                {{ getCtaLabel(freeStarterPlan) }}
              </template>
            </button>
          </div>
        </div>
      </section>
    </template>

    <div v-if="selectedMobilePlan" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div class="w-full max-w-lg overflow-hidden rounded-[28px] border border-foreground/10 bg-background shadow-2xl shadow-black/40">
        <div class="flex items-start justify-between gap-4 border-b border-foreground/10 p-5 sm:p-6">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">MTN/Airtel mobile payment</p>
            <h3 class="mt-2 text-xl font-black tracking-tight text-foreground">Pay for {{ selectedMobilePlan.name }}</h3>
            <p class="mt-1 text-sm font-medium text-foreground/50">
              {{ formatRwf(selectedMobilePlan.mobilePriceRwf) }}/month. Enter the phone number that should receive the payment prompt.
            </p>
          </div>
          <button type="button" class="rounded-full border border-foreground/10 p-2 text-foreground/50 transition hover:bg-foreground/5 hover:text-foreground" @click="closeMobilePayment">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="space-y-4 p-5 sm:p-6">
          <label class="block space-y-2">
            <span class="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/45">Phone number</span>
            <input
              v-model="mobilePhone"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              placeholder="078xxxxxxx"
              class="w-full rounded-2xl border border-foreground/10 bg-foreground/[0.03] px-4 py-4 text-sm font-bold text-foreground outline-none transition placeholder:text-foreground/25 focus:border-primary/50"
              @keyup.enter="requestMobilePayment"
            />
          </label>

          <div v-if="mobilePaymentResult" class="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
            <p class="text-sm font-black text-emerald-500">
              {{ mobilePaymentResult.paymentCompleted ? 'Payment complete' : 'Payment prompt sent' }}
            </p>
            <p class="mt-1 text-xs leading-relaxed text-foreground/55">
              <template v-if="mobilePaymentResult.paymentCompleted">
                Your test payment was completed and the plan is active. Reference:
              </template>
              <template v-else>
                Complete the prompt on your phone. Reference:
              </template>
              <span class="font-mono text-foreground/70">{{ mobilePaymentResult.transactionRef }}</span>
            </p>
            <p class="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/35">
              {{ mobilePaymentResult.paymentCompleted ? 'This test activation runs for 30 days.' : 'Plan activation is confirmed after the payment is verified.' }}
            </p>
          </div>

          <button
            type="button"
            class="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isProcessing === `${selectedMobilePlan.id}:mobile`"
            @click="requestMobilePayment"
          >
            <Loader2 v-if="isProcessing === `${selectedMobilePlan.id}:mobile`" class="h-4 w-4 animate-spin" />
            <Smartphone v-else class="h-4 w-4" />
            Send payment prompt
          </button>

          <p class="text-center text-[10px] leading-relaxed text-foreground/40">
            Prefer card payment? Close this window and choose the card option on your plan.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
