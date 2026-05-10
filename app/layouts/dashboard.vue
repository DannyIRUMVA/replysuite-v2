<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next'

const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

const { user, userId, isAuthenticated, profile, polarCustomerId, isVerified, isLoading, planSlug } = useAuth()
const { showFeedback, feedbackSource, closeFeedback } = useFeedback()
const supabase = useSupabaseClient()
const route = useRoute()

// 1. Subscription & Polar Identity Gating
// If user has no Polar customer ID or no active plan, force them to pricing
watch([polarCustomerId, planSlug, isLoading, isMounted], ([polarId, slug, loading, mounted]) => {
  if (mounted && !loading) {
    const isPricingPage = route.path === '/dashboard/pricing'
    
    // Strict block: No Polar Identity or No Active Plan
    if ((!polarId || !slug) && !isPricingPage) {
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
  <div class="min-h-screen bg-background text-foreground flex overflow-hidden">
    <!-- Sidebar -->
    <DashboardSidebar />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col h-screen overflow-hidden">
      <main class="flex-1 overflow-y-auto px-6 md:px-8 pt-0 relative pb-32 md:pb-8">

        <div class="sticky top-0 z-40 -mx-6 px-6 md:-mx-8 md:px-8 pt-2 pb-2.5 mb-2 bg-background/80 backdrop-blur-xl border-b border-foreground/5">
          <DashboardHeader />
        </div>

        <slot />
        
        <!-- Mobile Bottom Navigation -->
        <DashboardMobileNav />
      </main>
    </div>
    
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
