<script setup lang="ts">
const router = useRouter()
const { syncWithPolar } = useAuth() // Assuming useAuth has the sync logic from previous edits
const isSyncing = ref(true)

definePageMeta({
  layout: 'dashboard'
})

useHead({
  title: 'Payment Successful'
})

onMounted(async () => {
  // Automatically trigger a deep sync when arriving on this page
  try {
    await $fetch('/api/billing/sync')
  } catch (err) {
    console.error('Initial sync failed:', err)
  } finally {
    isSyncing.value = false
  }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center relative overflow-hidden">
    <!-- Background Glow -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10"></div>

    <!-- Success Icon Container -->
    <div class="relative mb-12">
      <div class="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-2xl animate-pulse"></div>
      <div class="relative bg-[#0a0a0a] border border-primary/20 w-32 h-32 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary/10">
        <Icon name="ph:check-circle-fill" class="text-primary text-6xl" />
      </div>
    </div>

    <h1 class="text-5xl font-black text-white mb-6 tracking-tighter uppercase italic-none">
      Upgrade <span class="text-primary">Confirmed.</span>
    </h1>
    
    <p class="text-lg text-gray-500 max-w-md mb-12 font-medium lowercase">
      your account has been elevated to the elite class. all premium features and boosted limits are now available.
    </p>

    <!-- Status Card -->
    <div class="glass-card p-8 border-primary/10 bg-primary/[0.02] w-full max-w-sm mb-12 transition-all hover:border-primary/30">
      <div class="flex items-center gap-5 text-left">
        <div v-if="isSyncing" class="w-12 h-12 border-4 border-white/5 border-t-primary rounded-full animate-spin"></div>
        <div v-else class="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Zap class="text-primary w-6 h-6 fill-current" />
        </div>
        <div>
          <p class="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Benefit Sync</p>
          <p class="text-white font-bold tracking-tight">
            {{ isSyncing ? 'Synchronizing benefits...' : 'All features active' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-col sm:flex-row gap-4 w-full max-w-md">
      <NuxtLink 
        to="/dashboard"
        class="flex-1 px-8 py-5 bg-primary text-black rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-primary-accent transition-all transform hover:-translate-y-1 shadow-xl shadow-primary/20 text-center"
      >
        Go to Dashboard
      </NuxtLink>
      <NuxtLink 
        to="/dashboard/settings/billing"
        class="flex-1 px-8 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs tracking-widest uppercase transition-all hover:bg-white/10 text-center"
      >
        View Billing
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
</style>
