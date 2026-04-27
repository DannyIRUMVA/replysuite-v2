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
    notify.success('Payment successful! Your empire class is being upgraded.')
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
        // Handle instant update (proration)
        notify.success('Plan updated successfully! Your new limits are active.')
        await syncWithPolar() // Deep sync to update local DB and refreshAuth
        // Optional: navigate to dashboard
        // return navigateTo('/dashboard/analytics')
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
    desc: 'Experience the gold standard risk-free.',
    features: ['1 website chatbot', '100 AI replies / mo', '10 training sessions', 'Trainable AI agent', 'Email support'],
    popular: false
  },
  {
    name: 'Silver',
    id: 'silver',
    productId: 'dc070937-6444-40a6-8a02-fd8b25df7aae',
    price: '17.88',
    desc: 'The best value for growing elite brands.',
    features: ['3 website chatbots', '4,000 AI replies / mo', '30 training sessions', 'Advanced bot training', 'Priority support'],
    popular: true
  },
  {
    name: 'Gold',
    id: 'gold',
    productId: 'd0493f6f-16bc-4d3c-97bb-7be920840f12',
    price: '26.88',
    desc: 'Elite power for high-volume experts.',
    features: ['5 website chatbots', '10,000 AI replies / mo', '100 training sessions', 'WhatsApp integration', 'Dedicated manager'],
    popular: false
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
  <div class="p-8 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="mb-12">
      <span class="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary mb-4 inline-block tracking-wider">
        Subscription required
      </span>
      <h1 class="text-4xl font-extrabold text-foreground tracking-tight mb-4 lowercase">
        Choose your <span class="text-gradient">empire class.</span>
      </h1>
      <p class="text-foreground/50 font-medium lowercase">please select a plan to unlock your ai dashboard and start automating.</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-[40vh] py-20">
      <Loader2 class="w-12 h-12 text-primary animate-spin mb-6" />
      <p class="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">Retrieving Empire Classes...</p>
    </div>

    <!-- Pricing Grid -->
    <div v-else class="grid lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div 
        v-for="plan in plans" 
        :key="plan.name"
        class="glass-card p-10 flex flex-col relative transition-all duration-300 hover:border-primary/30 border-foreground/5"
        :class="plan.popular ? 'border-primary/20 bg-primary/[0.02]' : ''"
      >
        <div v-if="plan.popular" class="absolute -top-3 left-6 px-4 py-1 bg-primary text-black text-[9px] font-bold tracking-widest rounded-full">
          best value
        </div>

        <div class="mb-8">
          <h3 class="text-2xl font-bold text-foreground mb-2">{{ plan.name }}</h3>
          <p class="text-xs text-foreground/50 font-medium">{{ plan.desc }}</p>
        </div>

        <div class="mb-10 flex items-baseline gap-2">
          <span class="text-4xl font-extrabold text-foreground">${{ plan.price }}</span>
          <span class="text-[10px] text-foreground/50 font-bold tracking-widest">/mo</span>
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
            {{ plan.id === 'starter' ? 'get started' : 'select plan' }}
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

    <!-- Sync and Manage Portal -->
    <div class="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-[32px] bg-foreground/[0.01] border border-foreground/5 relative overflow-hidden">
      <div class="flex items-center gap-4 relative z-10">
        <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <Shield class="w-6 h-6" />
        </div>
        <div>
          <p class="text-[12px] font-bold text-foreground tracking-widest mb-1">Billing Management</p>
          <p class="text-[11px] text-foreground/50 font-medium lowercase">payments are managed via polar.sh. need to update your card or cancel? use the portal.</p>
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
.glass-card {
  @apply rounded-[32px] backdrop-blur-sm border bg-foreground/[0.02] border-foreground/5;
}
.text-gradient {
  @apply bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60;
}
</style>
