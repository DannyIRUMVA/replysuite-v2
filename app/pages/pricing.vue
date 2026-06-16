<script setup lang="ts">
import { Check, ArrowRight, HelpCircle, Loader2 } from 'lucide-vue-next'

useSeoMeta({
  title: 'AI Customer Support Pricing for Website, WhatsApp & Instagram | ReplySuite',
  description: 'Simple pricing for trained AI replies across website, WhatsApp, and Instagram workflows. Silver adds WhatsApp, Gold adds Instagram, and Enterprise unlocks AI business tools.',
  ogTitle: 'ReplySuite Pricing',
  ogDescription: 'Start free. Silver adds WhatsApp, Gold adds Instagram workflows, and Enterprise unlocks appointments, orders, and Paypack checkout.',
  ogUrl: 'https://replysuite.app/pricing',
  twitterCard: 'summary_large_image',
  twitterTitle: 'ReplySuite Pricing',
  twitterDescription: 'Simple pricing for business AI chatbots.',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://replysuite.app/pricing' }],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'ReplySuite',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: 'https://replysuite.app',
        description: 'AI chatbot software for website, WhatsApp, Instagram workflows, and Enterprise business tools.',
        offers: [
          {
            '@type': 'Offer',
            name: 'Free Plan',
            price: '0.00',
            priceCurrency: 'USD',
            description: '1 website chatbot, 100 AI replies per month, 10 training sessions, email support.',
            url: 'https://replysuite.app/pricing'
          },
          {
            '@type': 'Offer',
            name: 'Silver Plan',
            price: '17.88',
            priceCurrency: 'USD',
            description: '3 chatbots, website and WhatsApp support, 4,000 AI replies per month, 30 training sessions.',
            url: 'https://replysuite.app/pricing'
          },
          {
            '@type': 'Offer',
            name: 'Gold Plan',
            price: '26.88',
            priceCurrency: 'USD',
            description: '5 chatbots, 10,000 AI replies, 100 training sessions, WhatsApp support, and Instagram workflows.',
            url: 'https://replysuite.app/pricing'
          },
          {
            '@type': 'Offer',
            name: 'Enterprise Ready Plan',
            price: '350.00',
            priceCurrency: 'USD',
            description: '50 chatbots, 500,000 AI replies, 1,000 training sessions, Instagram workflows, and AI business tools.',
            url: 'https://replysuite.app/pricing'
          }
        ]
      })
    }
  ]
})

definePageMeta({
  layout: 'default'
})

const { isAuthenticated, refreshAuth, syncWithPolar } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()
const isProcessing = ref<string | null>(null)

const { data: dbPlans } = await useAsyncData('plans', async () => {
  const { data } = await supabase.from('plans').select('*').order('monthly_price_usd', { ascending: true })
  return data
})

const getPlanId = (slug: string) => {
  return dbPlans.value?.find(p => p.internal_slug === slug)?.polar_product_id
}

onMounted(() => {
  if (window.PolarEmbedCheckout) {
    window.PolarEmbedCheckout.init()
  }

  window.addEventListener('polar:checkout:confirmed', async (event) => {
    console.log('[Public Pricing] Checkout confirmed:', event)
    notify.success('Payment successful! Redirecting to your dashboard...')
    await syncWithPolar()
    setTimeout(() => {
      navigateTo('/dashboard/analytics')
    }, 1500)
  })
})

const handleSelect = async (plan: any) => {
  if (!isAuthenticated.value) {
    return navigateTo(`/register?plan=${plan.id}`)
  }

  isProcessing.value = plan.id

  try {
    if (plan.id === 'starter') {
      const res = await $fetch('/api/billing/onboard-free', { method: 'POST' })
      if (res.success) {
        await refreshAuth()
        return navigateTo('/dashboard/analytics')
      }
    } else {
      const productId = getPlanId(plan.id)
      if (!productId) {
        notify.error('Plan configuration missing. Please contact support.')
        return
      }

      const res = await $fetch('/api/billing/checkout', {
        method: 'POST',
        body: { productId }
      })

      if (res.url) {
        if (window.PolarEmbedCheckout) {
          window.PolarEmbedCheckout.open(res.url)
        } else {
          window.location.href = res.url
        }
      }
    }
  } catch (err: any) {
    console.error('[Pricing] Action failed:', err)
    notify.error('Failed to process request. Please try again.')
  } finally {
    isProcessing.value = null
  }
}

const plans = [
  {
    id: 'starter',
    name: 'Free Starter',
    price: '0.00',
    desc: 'Best for launching one trained assistant on one website domain.',
    features: ['1 website chatbot', '1 connected domain / chatbot', '100 AI replies / mo', '10 training sessions', 'Email support'], 
    popular: false
  },
  {
    id: 'silver',
    name: 'Silver',
    price: '17.88',
    desc: 'Best for growing businesses that need website and WhatsApp chatbots.',
    features: ['3 chatbots', 'Website + WhatsApp support', '5 connected domains / chatbot', '4,000 AI replies / mo', '30 training sessions'], 
    popular: true
  },
  {
    id: 'gold',
    name: 'Gold',
    price: '26.88',
    desc: 'Best for higher-volume conversations across website, WhatsApp, and Instagram workflows.',
    features: ['5 chatbots', 'Website + WhatsApp support', 'Instagram workflows', '10,000 AI replies / mo', '100 training sessions'], 
    popular: false
  },
  {
    id: 'enterprise-ready',
    name: 'Enterprise Ready',
    price: '350.00',
    desc: 'Self-serve Enterprise for larger rollouts that need every channel plus AI business tools.',
    features: ['50 chatbots', 'All supported channels', '500,000 AI replies / mo', 'AI business tools', 'Appointments, orders, Paypack checkout'], 
    popular: false
  }
]

const paidPlans = computed(() => plans.filter((plan) => plan.id !== 'starter'))
const freeStarterPlan = computed(() => plans.find((plan) => plan.id === 'starter'))

const planComparisonRows = [
  { label: 'Monthly price', starter: '$0.00', silver: '$17.88', gold: '$26.88', enterprise: '$350.00' },
  { label: 'AI chatbots', starter: '1', silver: '3', gold: '5', enterprise: '50' },
  { label: 'Connected domains / chatbot', starter: '1', silver: '5', gold: '10', enterprise: '100' },
  { label: 'AI replies / month', starter: '100', silver: '4,000', gold: '10,000', enterprise: '500,000' },
  { label: 'Training sessions / month', starter: '10', silver: '30', gold: '100', enterprise: '1,000' },
  { label: 'Trainable AI agent', starter: 'Included', silver: 'Included', gold: 'Included', enterprise: 'Included' },
  { label: 'Website chatbot', starter: 'Included', silver: 'Included', gold: 'Included', enterprise: 'Included' },
  { label: 'WhatsApp chatbot', starter: '—', silver: 'Included', gold: 'Included', enterprise: 'Included' },
  { label: 'Instagram workflows', starter: '—', silver: '—', gold: 'Included', enterprise: 'Included' },
  { label: 'AI business tools', starter: '—', silver: '—', gold: '—', enterprise: 'Included' },
  { label: 'Appointments', starter: '—', silver: '—', gold: '—', enterprise: 'Included' },
  { label: 'Catalog orders', starter: '—', silver: '—', gold: '—', enterprise: 'Included' },
  { label: 'Paypack checkout add-on', starter: '—', silver: '—', gold: '—', enterprise: 'Included' },
  { label: 'Advanced bot training', starter: '—', silver: 'Included', gold: 'Included', enterprise: 'Included' },
  { label: 'Custom-ready starter templates', starter: '—', silver: '—', gold: '—', enterprise: 'Included' },
  { label: 'Support', starter: 'Email', silver: 'Priority', gold: 'Priority', enterprise: 'Priority support' }
]

const faqs = [
  { q: 'Can I cancel any time?', a: 'Yes. You can cancel from your account settings.' },
  { q: 'Is there a free start?', a: 'Yes. You can start on Free Starter and upgrade later when your reply volume grows.' },
  { q: 'What happens if I hit my limit?', a: 'You can upgrade to a higher plan to continue with more AI replies, training sessions, or channels.' },
  { q: 'Which plan includes WhatsApp, Instagram, and Paypack checkout?', a: 'Silver includes website and WhatsApp chatbots. Gold adds Instagram workflows. Enterprise Ready unlocks AI business tools including appointments, catalog orders, and contextual Paypack checkout.' },
  { q: 'Can the assistant create invoices?', a: 'No. ReplySuite focuses on appointments, orders, and Paypack checkout attached to those records. It does not expose invoice automation in the customer assistant toolset.' },
  { q: 'Do all plans include website chatbot support?', a: 'Yes. Every plan includes website chatbot deployment, with higher plans adding more chatbots and connected domains.' },
  { q: 'Can I train the assistant with documents?', a: 'Yes. ReplySuite supports training with business content such as website pages, PDFs, FAQs, and custom text.' },
  { q: 'Which plan should I choose first?', a: 'Start with Free Starter if you are testing. Choose Silver for website plus WhatsApp, Gold for Instagram workflows, and Enterprise Ready for AI business tools and scale.' },
  { q: 'Do I need a credit card for Free Starter?', a: 'No. Free Starter is designed as a low-friction way to launch and test your first chatbot.' }
]
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden">
    <div class="max-w-7xl mx-auto px-6 py-20 md:py-24">
      <div class="text-center max-w-3xl mx-auto mb-16 border-b border-foreground/5 pb-12">
        <span class="badge-gradient mb-6">Pricing</span>
        <h1 class="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-[0.98] text-foreground">
          Simple pricing for supported customer channels.
          <span class="text-gradient">Clear upgrade path.</span>
        </h1>
        <p class="text-lg text-foreground/50 font-medium leading-relaxed">
          Start with one trained website assistant. Silver adds WhatsApp, Gold adds Instagram workflows, and Enterprise unlocks AI business tools for appointments, orders, and Paypack checkout.
        </p>
      </div>

      <div class="mb-24">
        <div class="grid lg:grid-cols-3 gap-8 mb-8">
          <div
            v-for="plan in paidPlans"
            :key="plan.name"
            class="glass-card p-8 md:p-10 flex flex-col relative transition-all duration-500 hover:-translate-y-3 border-foreground/10"
            :class="plan.popular ? 'border-primary/40 !bg-primary/[0.03]' : 'bg-foreground/[0.02]'"
          >
            <div v-if="plan.popular" class="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-primary text-black text-[11px] font-bold tracking-[0.2em] rounded-full shadow-2xl shadow-primary/30 uppercase">
              Best Value
            </div>

            <div class="mb-10">
              <h3 class="text-3xl font-bold mb-3 tracking-tight text-foreground">{{ plan.name }}</h3>
              <p class="text-sm text-foreground/50 font-medium">{{ plan.desc }}</p>
            </div>

            <div class="mb-10 flex items-baseline gap-2">
              <span class="text-5xl md:text-6xl font-extrabold tracking-tighter text-foreground">${{ plan.price }}</span>
              <span class="text-foreground/50 font-bold tracking-[0.1em] text-[10px] uppercase">/month</span>
            </div>

            <button
              @click="handleSelect(plan)"
              :disabled="isProcessing === plan.id"
              class="w-full py-5 rounded-full font-bold text-center mb-10 transition-all tracking-[0.1em] text-sm flex items-center justify-center gap-2"
              :class="plan.popular ? 'btn-gradient' : 'bg-foreground/5 hover:bg-foreground/10 text-foreground border border-foreground/10 hover:border-foreground/20'"
            >
              <template v-if="isProcessing === plan.id">
                <Loader2 class="w-4 h-4 animate-spin" />
                Processing...
              </template>
              <template v-else>
                {{ plan.id === 'enterprise-ready' ? 'Start Enterprise' : 'Select Plan' }}
              </template>
            </button>

            <div class="space-y-5 flex-grow">
              <div v-for="feat in plan.features" :key="feat" class="flex items-center gap-4 text-sm font-medium text-foreground/50">
                <div class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Check class="w-3 h-3 text-primary" />
                </div>
                {{ feat }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="freeStarterPlan" class="glass-card p-6 md:p-8 border border-foreground/10 bg-foreground/[0.02]">
          <div class="grid lg:grid-cols-[0.85fr_1.35fr_auto] gap-6 items-center">
            <div>
              <span class="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary mb-4">
                Free Starter subscription
              </span>
              <h3 class="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{{ freeStarterPlan.name }}</h3>
              <p class="mt-2 text-sm text-foreground/50 font-medium leading-relaxed">{{ freeStarterPlan.desc }}</p>
            </div>

            <div class="grid sm:grid-cols-2 gap-3">
              <div v-for="feat in freeStarterPlan.features" :key="feat" class="rounded-2xl border border-foreground/10 bg-background/40 px-4 py-3 flex items-center gap-3 text-xs font-medium text-foreground/55">
                <div class="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Check class="w-2.5 h-2.5 text-primary" />
                </div>
                {{ feat }}
              </div>
            </div>

            <div class="lg:text-right">
              <div class="mb-4 flex lg:justify-end items-baseline gap-2">
                <span class="text-4xl font-extrabold tracking-tighter text-foreground">${{ freeStarterPlan.price }}</span>
                <span class="text-foreground/50 font-bold tracking-[0.1em] text-[10px] uppercase">/month</span>
              </div>
              <button
                @click="handleSelect(freeStarterPlan)"
                :disabled="isProcessing === freeStarterPlan.id"
                class="w-full lg:w-auto px-8 py-4 rounded-full font-bold text-center transition-all tracking-[0.1em] text-sm flex items-center justify-center gap-2 bg-foreground/5 hover:bg-foreground/10 text-foreground border border-foreground/10 hover:border-foreground/20"
              >
                <template v-if="isProcessing === freeStarterPlan.id">
                  <Loader2 class="w-4 h-4 animate-spin" />
                  Processing...
                </template>
                <template v-else>
                  {{ isAuthenticated ? 'Activate Free' : 'Start Free' }}
                </template>
              </button>
            </div>
          </div>
        </div>
      </div>

      <section class="max-w-6xl mx-auto mb-24">
        <div class="text-center mb-10">
          <span class="badge-gradient mb-5">Compare price</span>
          <h2 class="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Compare <span class="text-gradient">plans in one table</span>
          </h2>
          <p class="mt-4 text-foreground/50 font-medium max-w-2xl mx-auto">
            See price, usage limits, website, WhatsApp, Instagram, AI business tools, training capacity, and support level side by side.
          </p>
        </div>

        <div class="relative overflow-hidden rounded-[36px] border border-foreground/10 bg-foreground/[0.025] p-3 md:p-4 shadow-2xl shadow-black/5">
          <div class="absolute -top-24 left-10 h-56 w-56 rounded-full bg-primary/20 blur-[90px]"></div>
          <div class="absolute -bottom-28 right-6 h-64 w-64 rounded-full bg-sky-400/10 blur-[100px]"></div>
          <div class="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-primary/[0.04]"></div>

          <div class="relative overflow-x-auto rounded-[28px] border border-foreground/10 bg-background/60 backdrop-blur-xl">
            <table class="w-full min-w-[800px] text-sm" aria-label="ReplySuite pricing plan comparison">
              <thead>
                <tr class="border-b border-foreground/10 bg-foreground/[0.03]">
                  <th class="px-5 py-5 text-left text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Feature</th>
                  <th class="px-5 py-5 text-center font-black text-foreground">Free Starter</th>
                  <th class="px-5 py-5 text-center font-black text-primary bg-primary/[0.07]">Silver</th>
                  <th class="px-5 py-5 text-center font-black text-foreground">Gold</th>
                  <th class="px-5 py-5 text-center font-black text-foreground">Enterprise Ready</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in planComparisonRows" :key="row.label"
                  :class="i % 2 === 0 ? 'bg-foreground/[0.015]' : ''"
                  class="border-b border-foreground/5 last:border-b-0 transition-colors hover:bg-foreground/[0.03]"
                >
                  <td class="px-5 py-4 font-bold text-foreground/65">{{ row.label }}</td>
                  <td class="px-5 py-4 text-center font-semibold text-foreground/65">{{ row.starter }}</td>
                  <td class="px-5 py-4 text-center font-black text-foreground bg-primary/[0.045]">{{ row.silver }}</td>
                  <td class="px-5 py-4 text-center font-semibold text-foreground/70">{{ row.gold }}</td>
                  <td class="px-5 py-4 text-center font-semibold text-foreground/70">{{ row.enterprise }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="max-w-6xl mx-auto py-20 md:py-24 border-t border-foreground/5">
        <div class="relative overflow-hidden rounded-[40px] border border-foreground/10 bg-foreground/[0.025] p-6 md:p-8 lg:p-10">
          <div class="absolute -top-24 -left-14 h-64 w-64 rounded-full bg-primary/15 blur-[100px]"></div>
          <div class="absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-sky-400/10 blur-[110px]"></div>
          <div class="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-primary/[0.035]"></div>

          <div class="relative grid lg:grid-cols-[0.85fr_1.25fr] gap-8 lg:gap-12 items-start">
            <div class="lg:sticky lg:top-28">
              <span class="badge-gradient mb-6">FAQ</span>
              <h2 class="text-3xl md:text-5xl font-extrabold mb-5 tracking-tight leading-tight text-foreground">
                Common questions about
                <span class="text-gradient">pricing.</span>
              </h2>
              <p class="text-foreground/55 font-medium leading-relaxed max-w-xl">
                Clear answers before you choose a plan. Start free, upgrade when your reply volume grows, and cancel when needed.
              </p>

              <div class="mt-8 grid sm:grid-cols-3 lg:grid-cols-1 gap-3">
                <div class="rounded-2xl border border-foreground/10 bg-background/50 px-4 py-3 backdrop-blur-xl">
                  <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">Start</p>
                  <p class="mt-1 text-sm font-bold text-foreground">Free Starter</p>
                </div>
                <div class="rounded-2xl border border-foreground/10 bg-background/50 px-4 py-3 backdrop-blur-xl">
                  <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">Upgrade</p>
                  <p class="mt-1 text-sm font-bold text-foreground">Any time</p>
                </div>
                <div class="rounded-2xl border border-foreground/10 bg-background/50 px-4 py-3 backdrop-blur-xl">
                  <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">Billing</p>
                  <p class="mt-1 text-sm font-bold text-foreground">Monthly</p>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <details v-for="(faq, index) in faqs" :key="faq.q" class="group rounded-3xl border border-foreground/10 bg-background/55 p-5 md:p-6 backdrop-blur-xl transition-all open:border-primary/25 open:bg-primary/[0.035]">
                <summary class="flex cursor-pointer list-none items-start justify-between gap-4 text-left">
                  <span class="flex items-start gap-4">
                    <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <HelpCircle class="h-4 w-4" />
                    </span>
                    <span class="text-base md:text-lg font-black tracking-tight text-foreground">{{ faq.q }}</span>
                  </span>
                  <span class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.03] text-foreground/60 transition-transform group-open:rotate-45 group-open:text-primary">
                    +
                  </span>
                </summary>
                <p class="mt-4 pl-0 md:pl-[52px] text-sm md:text-base text-foreground/55 leading-relaxed font-medium">
                  {{ faq.a }}
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>

      <section class="mt-24 bg-foreground/[0.02] p-16 rounded-[48px] border border-foreground/10 text-center relative overflow-hidden group">
        <div class="absolute inset-0 bg-primary/5 blur-[120px] group-hover:bg-primary/10 transition-all duration-1000"></div>
        <h2 class="text-3xl md:text-5xl font-extrabold mb-6 relative z-10 tracking-tight text-foreground">Need a custom business-action rollout?</h2>
        <p class="text-foreground/50 mb-9 max-w-xl mx-auto font-medium text-base md:text-lg relative z-10">Talk to us if you want help with onboarding, training, Instagram workflows, Enterprise AI business tools, Paypack setup, or a larger rollout.</p>
        <NuxtLink to="mailto:support@replysuite.com" class="btn-gradient px-8 py-4 text-base inline-flex items-center gap-4 group/btn relative z-10">
          Contact Us
          <ArrowRight class="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
        </NuxtLink>
      </section>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[40px];
}

@media (prefers-reduced-motion: reduce) {
  * {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
