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

useHead({
  title: 'Billing'
})

const { userId, membership, planSlug, isLoading: isAuthLoading, refreshAuth, syncWithPolar, polarCustomerId } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()

const isMounted = ref(false)
const isLoading = computed(() => !isMounted.value || isAuthLoading.value)

// Removed errorMsg ref in favor of notify system
const checkoutLoading = ref<string | null>(null)

// Automatically sync with Polar on mount if identity exists but status might be stale
onMounted(async () => {
  isMounted.value = true

  if (window.PolarEmbedCheckout) {
    window.PolarEmbedCheckout.init()
  }

  // Listen for successful checkout
  window.addEventListener("polar:checkout:confirmed", async (event) => {
    console.log("[Billing] Checkout confirmed:", event)
    notify.success('Payment successful! Your subscription is being updated.')
    await syncWithPolar()
  })

  if (polarCustomerId.value) {
    console.log('[Billing] Verification check...')
    await syncWithPolar()
  }
})

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
    features: ['1 current AI bot', '1 connected domain / chatbot', '100 AI replies / month', '10 training sessions'],
    limitDesc: 'Perfect for your first website launch'
  },
  {
    name: 'Silver',
    id: 'silver',
    productId: 'dc070937-6444-40a6-8a02-fd8b25df7aae',
    price: '17.88',
    features: ['3 current AI bots', '5 connected domains / chatbot', '4,000 AI replies / month', 'Priority support'],
    limitDesc: 'For growing businesses',
    popular: true
  },
  {
    name: 'Gold',
    id: 'gold',
    productId: 'd0493f6f-16bc-4d3c-97bb-7be920840f12',
    price: '26.88',
    features: ['5 current AI bots', '10 connected domains / chatbot', '10,000 AI replies / month', 'WhatsApp integration'],
    limitDesc: 'For higher volume automation'
  },
  {
    name: 'Enterprise Ready',
    id: 'enterprise-ready',
    productId: '3e4e4e1a-e1da-4f3f-be5a-298e409c7c1e',
    price: '350.88',
    features: ['50 current AI bots', '100 connected domains / chatbot', '500,000 AI replies / month', 'Custom-ready starter templates'],
    limitDesc: 'For large-scale deployments'
  }
]

const isSyncing = ref(false)

const handleSync = async () => {
  isSyncing.value = true
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/billing/sync')
    if (res.success) {
      notify.success(res.message)
      await refreshAuth()
    } else {
      notify.error(res.message)
    }
  } catch (err: any) {
    notify.error('Failed to sync billing state.')
  } finally {
    isSyncing.value = false
  }
}

const handleUpgrade = async (plan: any) => {
  if (plan.id === planSlug.value) return

  checkoutLoading.value = plan.id
  try {
    // Downgrade to free plan — local only, no Polar involved
    if (plan.id === 'starter') {
      const res = await $fetch('/api/billing/onboard-free', { method: 'POST' })
      if ((res as any).success) {
        notify.success('You are now on the Starter plan.')
        await refreshAuth()
      }
      return
    }

    if (!plan.productId) {
      notify.error('Configuration sync error. Please contact support.')
      return
    }

    // Use the smart upgrade endpoint:
    // - If user already has a Polar subscription → updates it in-place (no "already subscribed" error)
    // - If fresh user → returns a checkout URL
    const response = await $fetch<{ url?: string; upgraded?: boolean; message?: string }>(
      '/api/billing/upgrade',
      { method: 'POST', body: { productId: plan.productId } }
    )

    if (response?.upgraded) {
      // Subscription was updated directly — no redirect needed
      notify.success(response.message || 'Plan upgraded successfully!')
      await refreshAuth()
      return
    }

    if (response?.url) {
      // New subscription — open Polar checkout overlay
      if (window.PolarEmbedCheckout) {
        window.PolarEmbedCheckout.open(response.url)
      } else {
        window.location.href = response.url
      }
    }
  } catch (err: any) {
    console.error('Upgrade error:', err)
    const msg = err?.data?.message || err?.message || 'Failed to process request. Please try again.'
    notify.error(msg)
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
      <main class="flex-1 glass-card p-10 border-foreground/10 bg-background min-h-[600px] relative overflow-hidden">
        <div class="absolute -right-20 -top-20 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -z-10"></div>

        <div v-if="isLoading" class="flex items-center justify-center h-[400px]">
          <div class="flex flex-col items-center gap-4">
            <Loader2 class="w-10 h-10 text-primary animate-spin" />
            <p class="text-xs font-bold tracking-widest text-foreground/50 uppercase">Synchronizing Billing...</p>
          </div>
        </div>

        <div v-else class="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 class="text-xl font-black tracking-wide text-primary mb-6">Billing & Plans</h3>

          <!-- Active Plan Badge -->
          <div class="mb-12 flex flex-col md:flex-row items-start md:items-center justify-between p-6 gap-6 glass-card border-primary/30 bg-primary/10">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                <Crown v-if="planSlug === 'gold' || planSlug === 'enterprise-ready'" class="w-6 h-6" />
                <Shield v-else-if="planSlug === 'silver'" class="w-6 h-6" />
                <Zap v-else class="w-6 h-6" />
              </div>
              <div>
                <p class="text-[10px] font-black uppercase tracking-widest text-primary">Current Plan</p>
                <h4 class="text-lg font-black uppercase tracking-tighter">{{ planSlug }}</h4>
              </div>
            </div>
            
            <div class="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
              <div class="text-right">
                <p class="text-[10px] font-bold text-foreground/50 uppercase tracking-widest">Next Billing Date</p>
                <p class="text-sm font-bold text-foreground">{{ membership?.ends_at ? new Date(membership.ends_at).toLocaleDateString() : 'N/A' }}</p>
              </div>
              <button @click="handleSync" 
                :disabled="isSyncing"
                class="px-4 py-2 rounded-xl bg-foreground/5 border border-foreground/10 text-[9px] font-black uppercase tracking-widest text-foreground/50 hover:text-foreground hover:bg-foreground/10 transition-all disabled:opacity-50">
                <span v-if="isSyncing" class="flex items-center gap-2 italic lowercase"><Loader2 class="w-3 h-3 animate-spin"/> syncing...</span>
                <span v-else class="flex items-center gap-2"><TrendingUp class="w-3 h-3"/> Sync Status</span>
              </button>
            </div>
          </div>

          <!-- Pricing Tiers Grid -->
          <div class="grid xl:grid-cols-4 md:grid-cols-2 gap-6 mb-16">
            <div v-for="p in pricingPlans" :key="p.id"
              class="glass-card p-8 border-foreground/10 bg-foreground/5 flex flex-col relative overflow-hidden group hover:border-primary/20 transition-all"
              :class="{ 'border-primary/30 !bg-primary/[0.03]': planSlug === p.id }">
              <!-- Popular Badge -->
              <div v-if="p.popular"
                class="absolute top-4 right-4 px-3 py-1 bg-primary text-black text-[9px] font-black uppercase tracking-widest rounded-full">
                Popular
              </div>

              <div class="flex items-center justify-between gap-3 mb-1">
                <h5 class="text-sm font-black uppercase tracking-widest text-foreground/50">{{ p.name }}</h5>
                <span class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/35">
                  {{ p.id === 'starter' ? 'Start here' : p.id === 'silver' ? 'Growth' : p.id === 'gold' ? 'Website + WhatsApp' : 'Scale' }}
                </span>
              </div>
              <div class="flex items-baseline gap-1 mb-4">
                <span class="text-3xl font-black text-foreground">${{ p.price }}</span>
                <span class="text-xs text-foreground/50">/mo</span>
              </div>

              <p class="text-[10px] text-primary/60 font-bold uppercase tracking-widest mb-8">{{ p.limitDesc }}</p>

              <ul class="space-y-4 mb-10 flex-grow">
                <li v-for="feat in p.features" :key="feat"
                  class="flex items-center gap-3 text-xs text-foreground/50 font-medium">
                  <Check class="w-4 h-4 text-primary shrink-0" />
                  {{ feat }}
                </li>
              </ul>

              <button @click="handleUpgrade(p)"
                :disabled="planSlug === p.id || checkoutLoading === p.id"
                class="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                :class="planSlug === p.id ? 'bg-foreground/5 text-foreground/50 cursor-not-allowed border border-foreground/10' : 'bg-primary text-black hover:bg-primary-accent shadow-lg shadow-primary/10'">
                <span v-if="checkoutLoading === p.id" class="flex items-center justify-center gap-2">
                  <Loader2 class="w-3 h-3 animate-spin" /> processing
                </span>
                <span v-else-if="planSlug === p.id">Current Plan</span>
                <span v-else>{{ p.id === 'starter' ? 'Choose Starter' : p.id === 'silver' ? 'Choose Silver' : p.id === 'gold' ? 'Choose Gold' : 'Choose Enterprise Ready' }}</span>
              </button>
            </div>
          </div>

          <!-- Billing History -->
          <h4 class="text-sm font-bold tracking-widest text-foreground/50 mb-6 font-black uppercase">Payment History</h4>
          <div class="space-y-4">
            <div v-if="!payments?.length"
              class="text-foreground/50 italic py-10 border border-foreground/10 rounded-[32px] text-center bg-foreground/[0.01]">
              No transactions found on this account yet.
            </div>
            <div v-else v-for="pay in payments" :key="pay.id"
              class="flex items-center justify-between p-6 rounded-[24px] border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition-colors">
              <div class="flex items-center gap-5">
                <div class="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                  <CreditCard class="w-6 h-6" />
                </div>
                <div>
                  <p class="font-bold text-foreground">${{ pay.amount }} · {{ pay.status }}</p>
                  <p class="text-xs text-foreground/50">{{ pay.created_at ? new Date(pay.created_at).toLocaleDateString() : 'N/A' }}</p>
                </div>
              </div>
              <button class="text-foreground/50 hover:text-foreground transition-colors">
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
