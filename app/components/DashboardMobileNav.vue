<script setup lang="ts">
import { 
  LayoutDashboard, 
  Instagram, 
  MessageSquare, 
  Settings, 
  TrendingUp 
} from 'lucide-vue-next'

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const route = useRoute()

// Verification state for mobile navigation
const { data: profile } = await useAsyncData('mobile-nav-profile', async () => {
  if (!user.value?.id) return null
  const { data } = await supabase
    .from('profiles')
    .select('is_verified')
    .eq('id', user.value.id)
    .single()
  return data
}, {
  watch: [user],
  immediate: true
})

const isVerified = computed(() => {
  if (!user.value) return false
  return profile.value?.is_verified || user.value.app_metadata.provider === 'google'
})

const navLinks = computed(() => [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Insta', href: '/dashboard/instagram', icon: Instagram, disabled: !isVerified.value },
  { name: 'AI', href: '/dashboard/chatbots', icon: MessageSquare, disabled: !isVerified.value },
  { name: 'Stats', href: '/dashboard/analytics', icon: TrendingUp, disabled: !isVerified.value },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
])
</script>

<template>
  <nav class="md:hidden fixed bottom-6 left-6 right-6 z-[100]">
    <div class="glass-nav flex items-center justify-around p-3 relative overflow-hidden">
      <!-- Background Glow Effect (Active State) -->
      <div class="absolute inset-0 bg-primary/5 -z-10 pointer-events-none"></div>
      
      <NuxtLink 
        v-for="link in navLinks" 
        :key="link.name" 
        :to="link.disabled ? '#' : link.href"
        class="flex flex-col items-center gap-1.5 py-1 px-3 transition-all duration-300 group"
        :class="[
          route.path === link.href ? 'text-primary scale-110' : 'text-gray-500',
          link.disabled ? 'opacity-30 grayscale' : 'active:scale-90'
        ]"
      >
        <div class="relative">
           <component :is="link.icon" class="w-6 h-6" :class="{ 'fill-current opacity-20': route.path === link.href }" />
           <!-- Active Dot -->
           <div v-if="route.path === link.href" class="absolute -top-1 -right-1 w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.8)]"></div>
        </div>
        <span class="text-[9px] font-bold tracking-[0.1em] leading-none">{{ link.name.toLowerCase() }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped>
.glass-nav {
  @apply bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.5)];
}
</style>
