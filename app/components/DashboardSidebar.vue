<script setup lang="ts">
import { 
  LayoutDashboard, 
  Instagram, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Zap,
  ChevronRight,
  TrendingUp
} from 'lucide-vue-next'

const { user, profile, membership, isVerified } = useAuth()
const supabase = useSupabaseClient()
const route = useRoute()

const daysLeft = computed(() => {
  if (!membership.value?.ends_at) return 0
  const end = new Date(membership.value.ends_at)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

const navLinks = computed(() => [
  { name: 'overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'instagram', href: '/dashboard/instagram', icon: Instagram },
  { name: 'ai agents', href: '/dashboard/agents', icon: MessageSquare },
  { name: 'analytics', href: '/dashboard/analytics', icon: TrendingUp },
  { name: 'settings', href: '/dashboard/settings', icon: Settings },
])

const handleLogout = async () => {
  await supabase.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <aside class="hidden md:flex w-72 border-r border-white/5 bg-[#0a0a0a] flex-col p-6 overflow-y-auto shrink-0">
    <!-- Brand -->
    <div class="flex items-center gap-3 mb-12 px-2">
      <div class="w-10 h-10 bg-gradient-to-tr from-primary to-primary-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
        <Zap class="text-black w-6 h-6 fill-current" />
      </div>
      <span class="text-xl font-bold tracking-tight">replysuite</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-1">
      <NuxtLink 
        v-for="link in navLinks" 
        :key="link.name" 
        :to="link.href"
        class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all group"
        :class="[
          route.path === link.href 
            ? 'bg-primary/10 text-primary font-bold' 
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        ]"
      >
        <component :is="link.icon" class="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span class="flex-1">{{ link.name }}</span>
        <ChevronRight v-if="route.path === link.href" class="w-4 h-4" />
      </NuxtLink>
    </nav>

    <!-- Subscription Card -->
    <div v-if="membership" class="mt-8 mb-4">
      <div class="glass-card p-5 border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent relative overflow-hidden group">
        <div class="absolute -right-10 -bottom-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"></div>
        
        <div class="relative z-10">
          <div class="flex items-center justify-between mb-3">
             <span class="text-[10px] font-bold tracking-widest text-primary">{{ membership.plans?.name?.toLowerCase() }} plan</span>
             <Zap class="w-3 h-3 text-primary fill-current" />
          </div>
          
          <h4 class="font-bold text-sm mb-1">
            {{ membership.plans?.name === 'Trial' ? 'free month trial' : membership.plans?.display_name?.toLowerCase() }}
          </h4>
          <p class="text-[11px] text-gray-500 mb-4">
            {{ daysLeft }} days remaining
          </p>

          <NuxtLink to="/pricing" class="block w-full py-2.5 bg-primary text-black text-[11px] font-bold rounded-lg text-center hover:bg-primary-accent transition-colors shadow-lg shadow-primary/10">
            upgrade now
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- User Menu -->
    <div class="pt-6 border-t border-white/5 mt-auto">
      <button @click="handleLogout" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all border border-transparent hover:border-red-400/20 text-sm font-medium">
        <LogOut class="w-5 h-5" />
        logout
      </button>
    </div>
  </aside>
</template>
