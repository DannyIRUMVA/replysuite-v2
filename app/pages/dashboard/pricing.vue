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

const { isAuthenticated, refreshAuth, planSlug } = useAuth()
const isProcessing = ref<string | null>(null)

const handleSelect = async (plan: any) => {
  if (planSlug.value === plan.id) return

  isProcessing.value = plan.id
  
  try {
    if (plan.id === 'starter') {
      const res = await $fetch('/api/billing/onboard-free', { method: 'POST' })
      if (res.success) {
        await refreshAuth()
        return navigateTo('/dashboard/analytics')
      }
    } else {
      if (!plan.productId) {
        alert('Plan configuration missing. Please contact support.')
        return
      }

      const res = await $fetch('/api/billing/checkout', {
        method: 'POST',
        body: { productId: plan.productId }
      })

      if (res.url) {
        window.location.href = res.url
      }
    }
  } catch (err: any) {
    console.error('[Dashboard Pricing] Action failed:', err)
    alert('Failed to process request. Please try again.')
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
    features: ['1 website chatbot', '100 conversations / mo', 'Trainable AI agent', 'Email support'],
    popular: false
  },
  {
    name: 'Silver',
    id: 'silver',
    productId: 'dc070937-6444-40a6-8a02-fd8b25df7aae',
    price: '17.88',
    desc: 'The best value for growing elite brands.',
    features: ['3 website chatbots', '2,500 conversations / mo', 'Advanced bot training', 'Priority support'],
    popular: true
  },
  {
    name: 'Gold',
    id: 'gold',
    productId: 'd0493f6f-16bc-4d3c-97bb-7be920840f12',
    price: '26.88',
    desc: 'Unlimited power for high-volume experts.',
    features: ['Unlimited chatbots', 'Unlimited conversations', 'Proprietary bot training', 'Dedicated manager'],
    popular: false
  }
]
</script>

<template>
  <div class="p-8 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="mb-12">
      <span class="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-widest mb-4 inline-block">
        Subscription Required
      </span>
      <h1 class="text-4xl font-extrabold text-white tracking-tight mb-4">
        Choose your <span class="text-gradient">Empire Class.</span>
      </h1>
      <p class="text-gray-500 font-medium">Please select a plan to unlock your AI dashboard and start automating.</p>
    </div>

    <!-- Pricing Grid -->
    <div class="grid lg:grid-cols-3 gap-8">
      <div 
        v-for="plan in plans" 
        :key="plan.name"
        class="glass-card p-10 flex flex-col relative transition-all duration-300 hover:border-primary/30 border-white/5"
        :class="plan.popular ? 'border-primary/20 bg-primary/[0.02]' : ''"
      >
        <div v-if="plan.popular" class="absolute -top-3 left-6 px-4 py-1 bg-primary text-black text-[9px] font-bold tracking-widest rounded-full uppercase">
          Best Value
        </div>

        <div class="mb-8">
          <h3 class="text-2xl font-bold text-white mb-2">{{ plan.name }}</h3>
          <p class="text-xs text-gray-500 font-medium">{{ plan.desc }}</p>
        </div>

        <div class="mb-10 flex items-baseline gap-2">
          <span class="text-4xl font-extrabold text-white">${{ plan.price }}</span>
          <span class="text-[10px] text-gray-600 font-bold uppercase tracking-widest">/mo</span>
        </div>

        <button 
          @click="handleSelect(plan)"
          :disabled="isProcessing === plan.id || planSlug === plan.id"
          class="w-full py-4 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all mb-10 flex items-center justify-center gap-2"
          :class="planSlug === plan.id ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/10' : (plan.popular ? 'bg-primary text-black hover:bg-primary/90' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10')"
        >
          <template v-if="isProcessing === plan.id">
            <Loader2 class="w-4 h-4 animate-spin" />
            Processing...
          </template>
          <template v-else-if="planSlug === plan.id">
            Current Plan
          </template>
          <template v-else>
            {{ plan.id === 'starter' ? 'Activate Starter' : 'Upgrade Plan' }}
          </template>
        </button>

        <div class="space-y-4">
          <div v-for="feat in plan.features" :key="feat" class="flex items-center gap-3 text-[11px] font-medium text-gray-400">
            <div class="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Check class="w-2.5 h-2.5 text-primary" />
            </div>
            {{ feat }}
          </div>
        </div>
      </div>
    </div>

    <!-- Help Note -->
    <div class="mt-12 p-6 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center gap-4">
      <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
        <Shield class="w-5 h-5 text-gray-500" />
      </div>
      <div>
        <p class="text-[11px] font-bold text-white uppercase tracking-widest mb-1">Secure Transaction</p>
        <p class="text-[11px] text-gray-500 font-medium italic-none">Payments are managed via Polar.sh. Standard 30-day free month applies to all plans.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[32px] backdrop-blur-sm border bg-white/[0.01];
}
.text-gradient {
  @apply bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60;
}
</style>
