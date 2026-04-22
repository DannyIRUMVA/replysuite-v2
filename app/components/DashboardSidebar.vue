<script setup lang="ts">
import { 
  LayoutDashboard, 
  Instagram, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Zap,
  ChevronRight,
  TrendingUp,
  Database,
  Code2,
  Megaphone,
  Lock,
  X,
  MessageCircle
} from 'lucide-vue-next'

// Map strings to components to avoid serialization of functions
const iconMap: Record<string, any> = {
  LayoutDashboard,
  TrendingUp,
  Instagram,
  Megaphone,
  MessageSquare,
  Database,
  Code2,
  Settings,
  Lock,
  MessageCircle
}

const { user, profile, membership, isVerified } = useAuth()
const supabase = useSupabaseClient()
const route = useRoute()

const showComingSoon = ref(false)

const daysLeft = computed(() => {
  if (!membership.value?.ends_at) return 0
  const end = new Date(membership.value.ends_at)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

const sections = [
  {
    title: 'Main',
    links: [
      { name: 'Overview', href: '/dashboard', icon: 'LayoutDashboard' },
      { name: 'Analytics', href: '/dashboard/analytics', icon: 'TrendingUp' },
    ]
  },
  {
    title: 'Channels',
    links: [
      { name: 'Website', href: '/dashboard/integrations/website', icon: 'Code2' },
      { name: 'Instagram', href: '/dashboard/instagram', icon: 'Instagram', locked: true },
      { name: 'WhatsApp', href: '/dashboard/integrations/whatsapp', icon: 'MessageCircle' },
      { name: 'Automations', href: '/dashboard/automation', icon: 'Megaphone', locked: true },
    ]
  },
  {
    title: 'AI Agents',
    links: [
      { name: 'My Agents', href: '/dashboard/agents', icon: 'MessageSquare' },
      { name: 'Training', href: '/dashboard/agents/training', icon: 'Database' },
    ]
  },
  {
    title: 'Account',
    links: [
      { name: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
    ]
  }
]

const handleLogout = async () => {
  await supabase.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <aside class="hidden md:flex w-72 border-r border-white/5 bg-[#0a0a0a] flex-col p-6 overflow-y-auto shrink-0 relative">
    <!-- Brand -->
    <div class="flex items-center gap-3 mb-12 px-2">
      <div class="w-10 h-10 bg-gradient-to-tr from-primary to-primary-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
        <Zap class="text-black w-6 h-6 fill-current" />
      </div>
      <span class="text-xl font-bold tracking-tight">ReplySuite</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-8">
      <div v-for="section in sections" :key="section.title" class="space-y-3">
        <h5 class="px-4 text-[10px] font-bold tracking-[0.2em] text-gray-600 uppercase">{{ section.title }}</h5>
        <div class="space-y-1">
          <template v-for="link in section.links" :key="link.name">
            <!-- Normal Link -->
            <NuxtLink 
              v-if="!link.locked"
              :to="link.href"
              class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group"
              :class="[
                route.path === link.href 
                  ? 'bg-primary/10 text-primary font-bold shadow-[0_0_20px_rgba(var(--primary),0.05)]' 
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              ]"
            >
              <component :is="iconMap[link.icon]" class="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span class="flex-1 text-sm tracking-tight capitalize">{{ link.name }}</span>
              <ChevronRight v-if="route.path === link.href" class="w-3 h-3" />
            </NuxtLink>

            <!-- Locked Link -->
            <button 
              v-else
              @click="showComingSoon = true"
              class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-gray-700/50 hover:text-gray-400 group cursor-pointer"
            >
              <component :is="iconMap[link.icon]" class="w-4 h-4 grayscale opacity-30 group-hover:opacity-100 transition-all" />
              <span class="flex-1 text-sm tracking-tight text-left">{{ link.name }}</span>
              <Lock class="w-3 h-3 opacity-30 group-hover:opacity-100 transition-all" />
            </button>
          </template>
        </div>
      </div>
    </nav>

    <!-- Subscription Card -->
    <div v-if="membership" class="mt-8 mb-4">
      <div class="glass-card p-5 border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent relative overflow-hidden group">
        <div class="absolute -right-10 -bottom-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"></div>
        
        <div class="relative z-10">
          <div class="flex items-center justify-between mb-3">
             <span class="text-[10px] font-bold tracking-widest text-primary capitalize">{{ membership.plans?.name }} Plan</span>
             <Zap class="w-3 h-3 text-primary fill-current" />
          </div>
          
          <h4 class="font-bold text-sm mb-1 capitalize">
            {{ membership.plans?.name === 'Trial' ? 'Free Month Trial' : membership.plans?.display_name }}
          </h4>
          <p class="text-[11px] text-gray-500 mb-4">
            {{ daysLeft }} Days Remaining
          </p>

          <NuxtLink to="/pricing" class="block w-full py-2.5 bg-primary text-black text-[11px] font-bold rounded-lg text-center hover:bg-primary-accent transition-colors shadow-lg shadow-primary/10">
            Upgrade Now
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- User Menu -->
    <div class="pt-6 border-t border-white/5 mt-auto">
      <button @click="handleLogout" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all border border-transparent hover:border-red-400/20 text-sm font-medium">
        <LogOut class="w-5 h-5" />
        Logout
      </button>
    </div>

    <!-- Coming Soon Modal -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div v-if="showComingSoon" class="fixed inset-0 z-[200] flex items-center justify-center p-6">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-md" @click="showComingSoon = false"></div>
        <div class="relative w-full max-w-sm bg-[#0d0d0e] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl text-center">
            <button @click="showComingSoon = false" class="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors">
                <X class="w-5 h-5" />
            </button>
            <div class="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-primary/20">
                <Lock class="w-10 h-10 text-primary" />
            </div>
            <h3 class="text-2xl font-bold text-white mb-4 tracking-tight">Coming Soon</h3>
            <p class="text-gray-500 text-sm leading-relaxed mb-8">
                We're currently perfecting this channel to ensure it meets our elite performance standards. Stay tuned!
            </p>
            <button 
                @click="showComingSoon = false"
                class="w-full py-4 bg-primary text-black font-bold rounded-2xl hover:bg-primary-accent transition-all shadow-lg shadow-primary/10"
            >
                Understood
            </button>
        </div>
      </div>
    </Transition>
  </aside>
</template>

<style scoped>
.glass-card {
  @apply bg-[#111111]/40 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem];
}
</style>
