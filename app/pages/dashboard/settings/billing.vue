<script setup lang="ts">
import {
  CreditCard,
  Zap,
  Check,
  Crown,
  Shield,
  ExternalLink,
  Loader2,
  TrendingUp
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { userId, membership, planSlug, isLoading: isSubLoading } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()

// Removed errorMsg ref in favor of notify system
const checkoutLoading = ref<string | null>(null)

const { data: payments } = useAsyncData('payment-history', async () => {
  const currentId = userId.value
  if (!currentId) return null

  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', currentId)
    .order('created_at', { ascending: false })
    .limit(5)
  return data
}, { watch: [userId], immediate: true, server: false })

const pricingPlans = [
  {
    name: 'Starter',
    id: 'starter',
    price: '0',
    features: ['1 Active AI Bot', 'Basic Knowledge Base', '50 AI Messages / month', 'Shared Infrastructure'],
    limitDesc: 'Perfect for initial training'
  },
  {
    name: 'Silver',
    id: 'silver',
    productId: 'dc070937-6444-40a6-8a02-fd8b25df7aae',
    price: '17.88',
    features: ['3 Active AI Bots', 'Advanced Knowledge Base', 'Unlimited AI Messages', 'Priority Processing'],
    limitDesc: 'For growing enterprises',
    popular: true
  },
  {
    name: 'Gold',
    id: 'gold',
    productId: 'd0493f6f-16bc-4d3c-97bb-7be920840f12',
    price: '26.88',
    features: ['Unlimited AI Bots', 'Enterprise Knowledge Base', 'Unlimited AI Messages', 'Dedicated Compute'],
    limitDesc: 'The ultimate agency ecosystem'
  }
]

const handleUpgrade = async (plan: any) => {
  if (plan.id === planSlug.value) return

  checkoutLoading.value = plan.id
  try {
    if (plan.id === 'starter') {
      const res = await $fetch('/api/billing/onboard-free', { method: 'POST' })
      if (res.success) {
        window.location.reload()
      }
      return
    }

    if (!plan.productId) {
      notify.error('Configuration sync error. Please contact support.')
      return
    }

    const response = await $fetch<{ url: string }>('/api/billing/checkout', {
      method: 'POST',
      body: { productId: plan.productId }
    })

    if (response?.url) {
      window.location.href = response.url
    }
  } catch (err: any) {
    console.error('Checkout error:', err)
    notify.error('Failed to process request. Please try again.')
  } finally {
    checkoutLoading.value = null
  }
}
</script>

<template>
  <div class="max-w-8xl mx-auto">
    <div class="flex flex-col lg:flex-row gap-12">
      <!-- Navigation Sidebar -->
      <SettingsNavigation />

      <!-- Main Section -->
      <main class="flex-1 glass-card p-10 border-white/5 bg-[#0a0a0a] min-h-[600px] relative overflow-hidden">
        <div class="absolute -right-20 -top-20 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -z-10"></div>

        <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 class="text-xl font-black tracking-wide text-primary mb-6">Billing Hub</h3>

          <!-- Active Plan Badge -->
          <div class="mb-12 flex items-center justify-between p-6 glass-card border-primary/20 bg-primary/5">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                <Crown v-if="planSlug === 'gold'" class="w-6 h-6" />
                <Shield v-else-if="planSlug === 'silver'" class="w-6 h-6" />
                <Zap v-else class="w-6 h-6" />
              </div>
              <div>
                <p class="text-[10px] font-black uppercase tracking-widest text-primary">Active Subscription</p>
                <h4 class="text-lg font-black uppercase tracking-tighter">{{ planSlug }}</h4>
              </div>
            </div>
            <div class="text-right">
              <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Next Billing Date</p>
              <p class="text-sm font-bold text-white">{{ membership?.ends_at ? new Date(membership.ends_at).toLocaleDateString() : 'N/A' }}</p>
            </div>
          </div>

          <!-- Pricing Tiers Grid -->
          <div class="grid md:grid-cols-3 gap-6 mb-16">
            <div v-for="p in pricingPlans" :key="p.id"
              class="glass-card p-8 border-white/5 bg-white/[0.02] flex flex-col relative overflow-hidden group hover:border-primary/20 transition-all"
              :class="{ 'border-primary/30 !bg-primary/[0.03]': planSlug === p.id }">
              <!-- Popular Badge -->
              <div v-if="p.popular"
                class="absolute top-4 right-4 px-3 py-1 bg-primary text-black text-[9px] font-black uppercase tracking-widest rounded-full">
                Popular
              </div>

              <h5 class="text-sm font-black uppercase tracking-widest text-gray-500 mb-1">{{ p.name }}</h5>
              <div class="flex items-baseline gap-1 mb-4">
                <span class="text-3xl font-black text-white">${{ p.price }}</span>
                <span class="text-xs text-gray-600">/mo</span>
              </div>

              <p class="text-[10px] text-primary/60 font-bold uppercase tracking-widest mb-8">{{ p.limitDesc }}</p>

              <ul class="space-y-4 mb-10 flex-grow">
                <li v-for="feat in p.features" :key="feat"
                  class="flex items-center gap-3 text-xs text-gray-400 font-medium">
                  <Check class="w-4 h-4 text-primary shrink-0" />
                  {{ feat }}
                </li>
              </ul>

              <button @click="handleUpgrade(p)"
                :disabled="planSlug === p.id || checkoutLoading === p.id"
                class="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                :class="planSlug === p.id ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/10' : 'bg-primary text-black hover:bg-primary-accent shadow-lg shadow-primary/10'">
                <span v-if="checkoutLoading === p.id" class="flex items-center justify-center gap-2">
                  <Loader2 class="w-3 h-3 animate-spin" /> processing
                </span>
                <span v-else-if="planSlug === p.id">Current Plan</span>
                <span v-else>Upgrade Now</span>
              </button>
            </div>
          </div>

          <!-- Billing History -->
          <h4 class="text-sm font-bold tracking-widest text-gray-500 mb-6 font-black uppercase">Payment History</h4>
          <div class="space-y-4">
            <div v-if="!payments?.length"
              class="text-gray-600 italic py-10 border border-white/5 rounded-[32px] text-center bg-white/[0.01]">
              No transactions found on this account yet.
            </div>
            <div v-else v-for="pay in payments" :key="pay.id"
              class="flex items-center justify-between p-6 rounded-[24px] border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-colors">
              <div class="flex items-center gap-5">
                <div class="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                  <CreditCard class="w-6 h-6" />
                </div>
                <div>
                  <p class="font-bold text-gray-200">${{ pay.amount }} · {{ pay.status }}</p>
                  <p class="text-xs text-gray-600">{{ pay.created_at ? new Date(pay.created_at).toLocaleDateString() : 'N/A' }}</p>
                </div>
              </div>
              <button class="text-gray-500 hover:text-white transition-colors">
                <ExternalLink class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[48px];
}
</style>
