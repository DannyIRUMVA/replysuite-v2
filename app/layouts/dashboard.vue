<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next'

const user = useSupabaseUser()
const supabase = useSupabaseClient()

const { data: profile } = await useAsyncData('layout-profile', async () => {
  if (!user.value?.id) return null
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.value.id)
    .single()
  return data
}, { watch: [user], immediate: true })

const isVerified = computed(() => {
  if (!user.value) return false
  return profile.value?.is_verified || user.value.app_metadata.provider === 'google'
})

const resendLoading = ref(false)
const resendSuccess = ref(false)

const resendVerification = async () => {
  try {
    resendLoading.value = true
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.value?.email || '',
      options: {
        emailRedirectTo: `${window.location.origin}/confirm`,
      }
    })
    if (error) throw error
    resendSuccess.value = true
    setTimeout(() => { resendSuccess.value = false }, 5000)
  } catch (err: any) {
    console.error('Error resending verification:', err.message)
  } finally {
    resendLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#050505] text-white flex overflow-hidden">
    <!-- Sidebar -->
    <DashboardSidebar />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col h-screen overflow-hidden">
      <main class="flex-1 overflow-y-auto p-6 md:p-10 relative pb-32 md:pb-10">
        <DashboardHeader />

        <!-- Verification Wall (Global Dashboard Notice) -->
        <div v-if="!isVerified" class="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div class="glass-card !bg-primary/5 border-primary/20 p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
            <div class="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] border border-primary/50 group-hover:bg-primary/20 transition-all"></div>
            
            <div class="flex items-center gap-6 relative z-10 text-center md:text-left">
              <div class="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
                <AlertCircle class="w-8 h-8" />
              </div>
              <div>
                <h2 class="text-2xl font-bold mb-1">Verify your email address</h2>
                <p class="text-gray-400 max-w-md">To unlock Instagram automation and AI chatbots, please verify your email address. We've sent a link to <span class="text-white font-medium">{{ user?.email }}</span>.</p>
              </div>
            </div>
            
            <div class="flex items-center gap-4 relative z-10 w-full md:w-auto">
               <button @click="resendVerification" :disabled="resendLoading" class="w-full md:w-auto btn-gradient !py-3 !px-8 text-sm whitespace-nowrap disabled:opacity-50">
                  {{ resendLoading ? 'Sending...' : resendSuccess ? 'Link Sent!' : 'Resend Link' }}
               </button>
               <button @click="navigateTo('/support')" class="w-full md:w-auto px-8 py-3 rounded-full border border-white/10 hover:bg-white/5 text-sm transition-all whitespace-nowrap font-bold">I need help</button>
            </div>
          </div>
        </div>

        <slot />
        
        <!-- Mobile Bottom Navigation -->
        <DashboardMobileNav />
      </main>
    </div>
  </div>
</template>

<style>
/* Dashboard specific global overrides */
.glass-card {
  @apply bg-[#0a0a0a] border border-white/5 rounded-24 transition-all;
}
</style>
