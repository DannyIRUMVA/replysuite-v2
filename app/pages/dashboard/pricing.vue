<script setup lang="ts">
import { Check, Zap, Rocket, Shield, ArrowRight, HelpCircle, Loader2 } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

useSeoMeta({
  title: 'Choose Your Plan',
  description: 'Unlock the full power of ReplySuite AI automation.',
})

const { isAuthenticated, refreshAuth, planSlug, polarCustomerId, syncWithPolar, isLoading: isAuthLoading } = useAuth()
const isProcessing = ref<string | null>(null)
const notify = useNotify()

const isMounted = ref(false)
const isLoading = computed(() => !isMounted.value || isAuthLoading.value)

// Automatically sync with Polar on mount if identity is missing or to verify deep status
onMounted(async () => {
  isMounted.value = true
  
  if (window.PolarEmbedCheckout) {
    window.PolarEmbedCheckout.init()
  }

  // Listen for successful checkout
  window.addEventListener("polar:checkout:confirmed", async (event) => {
    console.log("[Pricing] Checkout confirmed:", event)
    notify.success('Payment successful! Your plan is being updated.')
    await syncWithPolar()
  })

  if (!polarCustomerId.value) {
    console.log('[Pricing] Missing Polar identity. Syncing...')
    await syncWithPolar()
  }
})

const handleSelect = async (plan: any) => {
  // Allow re-selecting for troubleshooting or explicit upgrades
  isProcessing.value = plan.id
  
  try {
    if (plan.id === 'starter') {
      const res = await $fetch('/api/billing/onboard-free', { method: 'POST' })
      if (res.success) {
        await refreshAuth()
        notify.success('Starter plan activated')
        return navigateTo('/dashboard/analytics')
      }
    } else if (plan.id === 'enterprise-ready') {
      return navigateTo('/contact')
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
        if (window.PolarEmbedCheckout) {
          window.PolarEmbedCheckout.open(res.url)
        } else {
          window.location.href = res.url
        }
      } else if (res.updated) {
        notify.success('Plan updated successfully! Your new limits are active.')
        await syncWithPolar()
      }
    }
  } catch (err: any) {
    console.error('[Dashboard Pricing] Action failed:', err)
    notify.error('Failed to process request. Please try again.')
  } finally {
    isProcessing.value = null
  }
}

const plans = [
  {
    name: 'Free',
    id: 'starter',
    price: '0.00',
    desc: 'Best for launching one chatbot on one website domain.',
    features: ['1 website chatbot', '1 connected website domain', '100 AI replies / mo', '10 training sessions', 'Email support'],
    popular: false,
    accent: 'start'
  },
  {
    name: 'Silver',
    id: 'silver',
    productId: 'dc070937-6444-40a6-8a02-fd8b25df7aae',
    price: '17.88',
    desc: 'Best for growing teams that need more domains and more replies.',
    features: ['3 website chatbots', '5 connected domains / chatbot', '4,000 AI replies / mo', '30 training sessions', 'Priority support'],
    popular: true,
    accent: 'growth'
  },
  {
    name: 'Gold',
    id: 'gold',
    productId: 'd0493f6f-16bc-4d3c-97bb-7be920840f12',
    price: '26.88',
    desc: 'Built for higher volume web and WhatsApp deployments.',
    features: ['5 website chatbots', '10 connected domains / chatbot', '10,000 AI replies / mo', '100 training sessions', 'WhatsApp integration'],
    popular: false,
    accent: 'multichannel'
  },
  {
    name: 'Enterprise Ready',
    id: 'enterprise-ready',
    productId: '3e4e4e1a-e1da-4f3f-be5a-298e409c7c1e',
    price: '350.88',
    desc: 'For larger rollouts that need scale, control, and starter templates.',
    features: ['50 website chatbots', '100 connected domains / chatbot', '500,000 AI replies / mo', '1,000 training sessions', 'Custom-ready starter templates'],
    popular: false,
    accent: 'enterprise'
  }
]

const openPortal = async () => {
  try {
    const res = await $fetch('/api/billing/portal')
    if (res.url) {
      window.open(res.url, '_blank')
    }
  } catch (err) {
    notify.error('Failed to open billing portal')
  }
}
</script>

<template>
  <div class="px-2 md:px-4 py-8 w-full max-w-none">
    <div class="grid xl:grid-cols-4 md:grid-cols-2 gap-4 mb-12">
      <div class="rounded-3xl border border-foreground/10 bg-foreground/[0.02] p-5">
        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary mb-2">New here?</p>
        <h3 class="text-sm font-bold text-foreground mb-2">Start with Starter</h3>
        <p class="text-sm text-foreground/55 leading-relaxed">Best for launching your first website chatbot on one domain.</p>
      </div>
      <div class="rounded-3xl border border-foreground/10 bg-foreground/[0.02] p-5">
        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary mb-2">Need more websites?</p>
        <h3 class="text-sm font-bold text-foreground mb-2">Choose Silver</h3>
        <p class="text-sm text-foreground/55 leading-relaxed">A better fit for growing businesses managing more web traffic.</p>
      </div>
      <div class="rounded-3xl border border-foreground/10 bg-foreground/[0.02] p-5">
        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary mb-2">Need WhatsApp too?</p>
        <h3 class="text-sm font-bold text-foreground mb-2">Choose Gold</h3>
        <p class="text-sm text-foreground/55 leading-relaxed">Best for businesses that want website and WhatsApp automation together.</p>
      </div>
      <div class="rounded-3xl border border-foreground/10 bg-foreground/[0.02] p-5">
        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary mb-2">Running at scale?</p>
        <h3 class="text-sm font-bold text-foreground mb-2">Go Enterprise Ready</h3>
        <p class="text-sm text-foreground/55 leading-relaxed">For bigger deployments, higher volume, and template-led team rollout.</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-[40vh] py-20">
      <Loader2 class="w-12 h-12 text-primary animate-spin mb-6" />
      <p class="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">Loading plans...</p>
    </div>

    <!-- Pricing Grid -->
    <div v-else class="grid xl:grid-cols-4 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div 
        v-for="plan in plans" 
        :key="plan.name"
        class="glass-card p-10 flex flex-col relative transition-all duration-300 hover:border-primary/30 border-foreground/5"
        :class="[
          plan.popular ? 'border-primary/30 bg-primary/[0.03] shadow-xl shadow-primary/5 -translate-y-1' : '',
          plan.id === 'enterprise-ready' ? 'border-cyan-400/20 bg-cyan-400/[0.03]' : ''
        ]"
      >
        <div v-if="plan.popular" class="absolute -top-3 left-6 px-4 py-1 bg-primary text-black text-[9px] font-bold tracking-widest rounded-full uppercase">
          Most popular
        </div>
        <div v-else-if="plan.id === 'enterprise-ready'" class="absolute -top-3 left-6 px-4 py-1 bg-cyan-400 text-black text-[9px] font-bold tracking-widest rounded-full uppercase">
          Talk to sales
        </div>

        <div class="mb-8">
          <div class="flex items-center justify-between gap-3 mb-3">
            <h3 class="text-2xl font-bold text-foreground">{{ plan.name }}</h3>
            <span class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">
              {{ plan.id === 'starter' ? 'Start here' : plan.id === 'silver' ? 'Growth' : plan.id === 'gold' ? 'Website + WhatsApp' : 'Sales-assisted' }}
            </span>
          </div>
          <p class="text-sm text-foreground/55 font-medium leading-relaxed">{{ plan.desc }}</p>
        </div>

        <div class="mb-4 flex items-baseline gap-2">
          <span class="text-4xl font-extrabold text-foreground">${{ plan.price }}</span>
          <span class="text-[10px] text-foreground/50 font-bold tracking-widest">/mo</span>
        </div>

        <div class="mb-8 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45 mb-2">Best for</p>
          <p class="text-sm text-foreground/70 leading-relaxed">
            {{ plan.id === 'starter'
              ? 'Testing your first website chatbot.'
              : plan.id === 'silver'
                ? 'Growing businesses that need more web coverage.'
                : plan.id === 'gold'
                  ? 'Businesses ready for both website and WhatsApp conversations.'
                  : 'Teams that want onboarding help, larger rollout support, and scale.' }}
          </p>
        </div>

        <button 
          @click="handleSelect(plan)"
          :disabled="isProcessing === plan.id"
          class="w-full py-4 rounded-xl font-bold text-[11px] tracking-widest transition-all mb-10 flex items-center justify-center gap-2"
          :class="planSlug === plan.id ? 'bg-primary/20 text-primary border border-primary/30' : (plan.popular ? 'bg-primary text-black hover:bg-primary/90' : 'bg-foreground/5 hover:bg-foreground/10 text-foreground border border-foreground/10')"
        >
          <template v-if="isProcessing === plan.id">
            <Loader2 class="w-4 h-4 animate-spin" />
            processing...
          </template>
          <template v-else-if="planSlug === plan.id">
            current plan
          </template>
          <template v-else>
            {{ plan.id === 'starter' ? 'Start with Starter' : plan.id === 'silver' ? 'Choose Silver' : plan.id === 'gold' ? 'Choose Gold' : 'Contact Sales' }}
          </template>
        </button>

        <div class="space-y-4">
          <div v-for="feat in plan.features" :key="feat" class="flex items-center gap-3 text-[11px] font-medium text-foreground/50">
            <div class="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Check class="w-2.5 h-2.5 text-primary" />
            </div>
            {{ feat }}
          </div>
        </div>
      </div>
    </div>

    <div class="mt-12 rounded-[32px] border border-primary/15 bg-primary/[0.03] p-6 md:p-8">
      <div class="grid lg:grid-cols-3 gap-6">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary mb-2">What happens next?</p>
          <h3 class="text-lg font-bold text-foreground mb-2">You will not get lost after choosing a plan.</h3>
          <p class="text-sm text-foreground/60 leading-relaxed">Once you select a plan, you can create your chatbot, connect your website, train it on your content, and test it before going live.</p>
        </div>
        <div class="rounded-2xl border border-foreground/10 bg-background/60 p-5">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45 mb-2">Step 1</p>
          <p class="text-sm font-semibold text-foreground">Create your chatbot</p>
          <p class="text-sm text-foreground/55 mt-2">Start with one bot, set its tone, then prepare it for your website.</p>
        </div>
        <div class="rounded-2xl border border-foreground/10 bg-background/60 p-5">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45 mb-2">Step 2</p>
          <p class="text-sm font-semibold text-foreground">Connect, train, and test</p>
          <p class="text-sm text-foreground/55 mt-2">Add your domain, train your bot on real content, then test locally before launch.</p>
        </div>
      </div>
    </div>

    <!-- Sync and Manage Portal -->
    <div class="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-[32px] bg-foreground/[0.01] border border-foreground/5 relative overflow-hidden">
      <div class="flex items-center gap-4 relative z-10">
        <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <Shield class="w-6 h-6" />
        </div>
        <div>
          <p class="text-[12px] font-bold text-foreground tracking-widest mb-1">Billing Management</p>
          <p class="text-[11px] text-foreground/50 font-medium">Payments are managed via Polar. Update your card, review billing, or cancel from the portal.</p>
        </div>
      </div>
      
      <div class="flex items-center gap-4 relative z-10 w-full md:w-auto">
        <button 
          @click="syncWithPolar" 
          class="flex-1 md:flex-none px-6 py-3 rounded-xl border border-foreground/10 hover:bg-foreground/5 text-[10px] font-bold tracking-widest transition-all uppercase"
        >
          Sync Plan Status
        </button>
        <button 
          v-if="planSlug && planSlug !== 'starter'"
          @click="openPortal" 
          class="flex-1 md:flex-none px-6 py-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-[10px] font-bold tracking-widest transition-all uppercase"
        >
          Manage Subscription
        </button>
      </div>
    </div>
  </div>
</template>


<style scoped>
.text-gradient {
  @apply bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60;
}
</style>
