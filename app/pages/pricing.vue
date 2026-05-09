<script setup lang="ts">
import { Check, ArrowRight, HelpCircle, Loader2 } from 'lucide-vue-next'

useSeoMeta({
  title: 'Pricing | ReplySuite',
  description: 'Simple pricing for website and WhatsApp AI chatbots. Start free, then upgrade as your volume grows.',
  ogTitle: 'ReplySuite Pricing',
  ogDescription: 'Start free. Train your chatbot on your own content. Upgrade when you need more replies, training, or WhatsApp.',
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
        description: 'AI chatbot software for websites and WhatsApp.',
        offers: [
          {
            '@type': 'Offer',
            name: 'Free Plan',
            price: '0.00',
            priceCurrency: 'USD',
            description: '1 chatbot, 100 AI replies per month, 10 training sessions, email support.',
            url: 'https://replysuite.app/pricing'
          },
          {
            '@type': 'Offer',
            name: 'Silver Plan',
            price: '17.88',
            priceCurrency: 'USD',
            description: '3 chatbots, 4,000 AI replies per month, 30 training sessions.',
            url: 'https://replysuite.app/pricing'
          },
          {
            '@type': 'Offer',
            name: 'Gold Plan',
            price: '26.88',
            priceCurrency: 'USD',
            description: '5 chatbots, 10,000 AI replies, 100 training sessions, WhatsApp integration.',
            url: 'https://replysuite.app/pricing'
          },
          {
            '@type': 'Offer',
            name: 'Enterprise Ready Plan',
            price: '350.88',
            priceCurrency: 'USD',
            description: '50 chatbots, 500,000 AI replies, 1,000 training sessions, 100 connected domains, and custom-ready starter templates.',
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
    return navigateTo(plan.id === 'enterprise-ready' ? '/contact' : `/register?plan=${plan.id}`)
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
    name: 'Free',
    price: '0.00',
    desc: 'Best for launching one chatbot on one website domain.',
    features: ['1 website chatbot', '1 connected domain / chatbot', '100 AI replies / mo', '10 training sessions', 'Email support'],
    popular: false
  },
  {
    id: 'silver',
    name: 'Silver',
    price: '17.88',
    desc: 'Best for growing businesses that need more domains and more replies.',
    features: ['3 website chatbots', '5 connected domains / chatbot', '4,000 AI replies / mo', '30 training sessions', 'Priority support'],
    popular: true
  },
  {
    id: 'gold',
    name: 'Gold',
    price: '26.88',
    desc: 'Best for higher volume web and WhatsApp automation.',
    features: ['5 website chatbots', '10 connected domains / chatbot', '10,000 AI replies / mo', '100 training sessions', 'Official WhatsApp API'],
    popular: false
  },
  {
    id: 'enterprise-ready',
    name: 'Enterprise Ready',
    price: '350.88',
    desc: 'Best for larger rollouts that need scale, control, and ready-start templates.',
    features: ['50 website chatbots', '100 connected domains / chatbot', '500,000 AI replies / mo', '1,000 training sessions', 'Custom-ready starter templates'],
    popular: false
  }
]

const faqs = [
  { q: 'Can I cancel any time?', a: 'Yes. You can cancel from your account settings.' },
  { q: 'Is there a free start?', a: 'Yes. You can start on the free plan and upgrade later.' },
  { q: 'What happens if I hit my limit?', a: 'You can upgrade to continue without interruption.' }
]
</script>

<template>
  <div class="relative min-h-screen">
    <div class="max-w-7xl mx-auto px-6 py-32">
      <div class="text-center max-w-3xl mx-auto mb-24 border-b border-foreground/5 pb-16">
        <span class="badge-gradient mb-8">Pricing</span>
        <h1 class="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight leading-[0.95] text-foreground">
          Simple pricing.
          <span class="text-gradient">Clear upgrade path.</span>
        </h1>
        <p class="text-lg text-foreground/50 font-medium leading-relaxed">
          Start with one chatbot. Upgrade when you need more domains, more training, more replies, or a larger rollout.
        </p>
      </div>

      <div class="grid xl:grid-cols-4 md:grid-cols-2 gap-10 mb-32">
        <div
          v-for="plan in plans"
          :key="plan.name"
          class="glass-card p-12 flex flex-col relative transition-all duration-500 hover:-translate-y-4 border-foreground/10"
          :class="plan.popular ? 'border-primary/40 !bg-primary/[0.03]' : 'bg-foreground/[0.02]'"
        >
          <div v-if="plan.popular" class="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-primary text-black text-[11px] font-bold tracking-[0.2em] rounded-full shadow-2xl shadow-primary/30 uppercase">
            Best Value
          </div>

          <div class="mb-10">
            <h3 class="text-3xl font-bold mb-3 tracking-tight text-foreground">{{ plan.name }}</h3>
            <p class="text-sm text-foreground/50 font-medium">{{ plan.desc }}</p>
          </div>

          <div class="mb-12 flex items-baseline gap-2">
            <span class="text-6xl font-extrabold tracking-tighter text-foreground">${{ plan.price }}</span>
            <span class="text-foreground/50 font-bold tracking-[0.1em] text-[10px] uppercase">/month</span>
          </div>

          <button
            @click="handleSelect(plan)"
            :disabled="isProcessing === plan.id"
            class="w-full py-5 rounded-full font-bold text-center mb-12 transition-all tracking-[0.1em] text-sm flex items-center justify-center gap-2"
            :class="plan.popular ? 'btn-gradient' : 'bg-foreground/5 hover:bg-foreground/10 text-foreground border border-foreground/10 hover:border-foreground/20'"
          >
            <template v-if="isProcessing === plan.id">
              <Loader2 class="w-4 h-4 animate-spin" />
              Processing...
            </template>
            <template v-else>
              {{ isAuthenticated ? (plan.id === 'starter' ? 'Activate Free' : 'Select Plan') : (plan.id === 'enterprise-ready' ? 'Talk to Sales' : 'Start Free') }}
            </template>
          </button>

          <div class="space-y-6 flex-grow">
            <div v-for="feat in plan.features" :key="feat" class="flex items-center gap-4 text-sm font-medium text-foreground/50">
              <div class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Check class="w-3 h-3 text-primary" />
              </div>
              {{ feat }}
            </div>
          </div>
        </div>
      </div>

      <section class="max-w-5xl mx-auto mb-24 overflow-x-auto">
        <h2 class="text-3xl font-extrabold tracking-tight text-foreground text-center mb-12">
          Compare <span class="text-gradient">plans</span>
        </h2>
        <table class="w-full text-sm border-collapse" aria-label="ReplySuite pricing plan comparison">
          <thead>
            <tr class="border-b border-foreground/10">
              <th class="text-left py-4 px-6 text-foreground/40 font-bold uppercase tracking-widest text-[10px]">Feature</th>
              <th class="py-4 px-6 text-center font-bold text-foreground">Free</th>
              <th class="py-4 px-6 text-center font-bold text-foreground bg-primary/5 rounded-t-2xl">Silver</th>
              <th class="py-4 px-6 text-center font-bold text-foreground">Gold</th>
              <th class="py-4 px-6 text-center font-bold text-foreground">Enterprise Ready</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in [
              { label: 'AI Chatbots', free: '1', silver: '3', gold: '5', enterprise: '50' },
              { label: 'Connected domains / chatbot', free: '1', silver: '5', gold: '10', enterprise: '100' },
              { label: 'AI Replies / month', free: '100', silver: '4,000', gold: '10,000', enterprise: '500,000' },
              { label: 'Training Sessions / mo', free: '10', silver: '30', gold: '100', enterprise: '1,000' },
              { label: 'Trainable AI agent', free: '✓', silver: '✓', gold: '✓', enterprise: '✓' },
              { label: 'Advanced bot training', free: '—', silver: '✓', gold: '✓', enterprise: '✓' },
              { label: 'WhatsApp Official API', free: '—', silver: '—', gold: '✓', enterprise: '✓' },
              { label: 'Custom-ready starter templates', free: '—', silver: '—', gold: '—', enterprise: '✓' },
              { label: 'Priority support', free: '—', silver: '✓', gold: '✓', enterprise: '✓' }
            ]" :key="row.label"
              :class="i % 2 === 0 ? 'bg-foreground/[0.01]' : ''"
              class="border-b border-foreground/5 transition-colors hover:bg-foreground/[0.03]"
            >
              <td class="py-4 px-6 text-foreground/50 font-medium">{{ row.label }}</td>
              <td class="py-4 px-6 text-center text-foreground/70">{{ row.free }}</td>
              <td class="py-4 px-6 text-center text-foreground font-semibold bg-primary/[0.03]">{{ row.silver }}</td>
              <td class="py-4 px-6 text-center text-foreground/70">{{ row.gold }}</td>
              <td class="py-4 px-6 text-center text-foreground/70">{{ row.enterprise }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="max-w-4xl mx-auto py-24 border-t border-foreground/5">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-extrabold mb-6 tracking-tight text-foreground">Common questions</h2>
        </div>
        <div class="grid md:grid-cols-3 gap-8">
          <div v-for="faq in faqs" :key="faq.q" class="glass-card p-8 border-foreground/10 bg-foreground/[0.01] hover:border-primary/20 transition-all">
            <h4 class="text-lg font-bold mb-4 flex items-start gap-3 tracking-tight text-foreground">
              <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <HelpCircle class="w-5 h-5 text-primary" />
              </div>
              {{ faq.q }}
            </h4>
            <p class="text-foreground/50 font-medium leading-relaxed">{{ faq.a }}</p>
          </div>
        </div>
      </section>

      <section class="mt-24 bg-foreground/[0.02] p-16 rounded-[48px] border border-foreground/10 text-center relative overflow-hidden group">
        <div class="absolute inset-0 bg-primary/5 blur-[120px] group-hover:bg-primary/10 transition-all duration-1000"></div>
        <h2 class="text-4xl md:text-6xl font-extrabold mb-8 relative z-10 tracking-tight text-foreground">Need a custom setup?</h2>
        <p class="text-foreground/50 mb-12 max-w-xl mx-auto font-medium text-lg relative z-10">Talk to us if you want help with onboarding, training, or a larger rollout.</p>
        <NuxtLink to="mailto:support@replysuite.com" class="btn-gradient px-12 py-6 text-xl inline-flex items-center gap-4 group/btn relative z-10">
          Contact Us
          <ArrowRight class="w-6 h-6 group-hover/btn:translate-x-2 transition-transform" />
        </NuxtLink>
      </section>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[40px];
}
</style>
