<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next'

const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

const { user, userId, isAuthenticated, profile, polarCustomerId, isVerified, isLoading, planSlug } = useAuth()
const { showFeedback, feedbackSource, closeFeedback } = useFeedback()
const supabase = useSupabaseClient()
const route = useRoute()
const forceOnboarding = useState<boolean>('dashboard-force-onboarding', () => false)
const onboardingDismissed = useState<boolean>('dashboard-onboarding-dismissed', () => false)
const onboardingNavigationLocked = useState<boolean>('dashboard-onboarding-navigation-locked', () => false)

const continueOnboarding = () => {
  onboardingDismissed.value = false
  forceOnboarding.value = true
  onboardingNavigationLocked.value = false
}

// 1. Subscription & Polar Identity Gating
// If user has no Polar customer ID or no active plan, force them to pricing
watch([polarCustomerId, planSlug, isLoading, isMounted, () => route.fullPath], ([polarId, slug, loading, mounted]) => {
  if (mounted && !loading) {
    const isPricingPage = route.path === '/dashboard/pricing'
    const isCheckoutSyncPage = route.path === '/dashboard/billing/success'
      || (route.path === '/dashboard/settings/billing' && route.query.success === 'true')
    
    // Strict block: No Polar Identity or No Active Plan.
    // Let checkout return pages finish their server-side Polar sync first;
    // otherwise the dashboard can redirect mid-sync and leave users feeling stuck.
    if ((!polarId || !slug) && !isPricingPage && !isCheckoutSyncPage) {
      console.warn('[Dashboard Gate] Missing Polar ID or Plan. Redirecting...')
      navigateTo('/dashboard/pricing')
    }
  }
}, { immediate: true })

// 2. Global Font Scaling (10% Increase)
useHead({
  htmlAttrs: {
    style: 'font-size: 17.6px' // 16px * 1.1 = 17.6px
  }
})

</script>

<template>
  <div class="dashboard-shell min-h-screen bg-background text-foreground flex overflow-hidden">
    <!-- Sidebar -->
    <DashboardSidebar />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col h-screen overflow-hidden">
      <main class="flex-1 overflow-y-auto px-6 md:px-8 pt-0 relative pb-32 md:pb-8">

        <div class="dashboard-header-bar sticky top-0 z-40 -mx-6 px-6 md:-mx-8 md:px-8 pt-1.5 pb-1.5 mb-2 bg-background/80 backdrop-blur-xl border-b border-foreground/5">
          <DashboardHeader />
        </div>

        <slot />
        
        <!-- Mobile Bottom Navigation -->
        <DashboardMobileNav />
      </main>
    </div>

    <DashboardOnboardingModal />

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="onboardingNavigationLocked" class="fixed inset-0 z-[450] flex items-end justify-center bg-background/30 p-4 backdrop-blur-[2px] sm:items-center" aria-live="polite">
        <div class="w-full max-w-md rounded-3xl border border-primary/20 bg-background-card p-5 text-center shadow-2xl shadow-black/30">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Setup paused</p>
          <h2 class="mt-2 text-lg font-black tracking-tight text-foreground">Continue onboarding to use dashboard navigation</h2>
          <p class="mt-2 text-sm leading-relaxed text-foreground/60">Your draft was saved locally. Finish the required setup before moving around the dashboard.</p>
          <button type="button" class="mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-sm font-black text-black transition hover:brightness-95" @click="continueOnboarding">
            Continue setup
          </button>
        </div>
      </div>
    </Transition>
    
    <!-- Global Feedback Modal -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showFeedback" class="fixed inset-0 z-[300] flex items-center justify-center p-6">
        <div class="absolute inset-0 bg-background/80 backdrop-blur-md" @click="closeFeedback"></div>
        <FeedbackForm :source="feedbackSource" @close="closeFeedback" class="relative z-10" />
      </div>
    </Transition>
  </div>
</template>

<style>
/* Dashboard specific global overrides if any */
</style>
