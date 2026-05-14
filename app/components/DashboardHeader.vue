<script setup lang="ts">
import { Zap, TrendingUp } from 'lucide-vue-next'
const { user, profile } = useAuth()
const route = useRoute()

// Dynamic Header Content
const pageContext = computed(() => {
  const path = route.path
  if (path === '/dashboard') return { title: 'Dashboard', subtitle: 'Track your assistants, replies, and recent activity.' }
  if (path.startsWith('/dashboard/settings')) return { title: 'Settings', subtitle: 'Manage your account, billing, and workspace preferences.' }
  if (path.includes('/dashboard/agents/skills/training')) return { title: 'Train Your AI', subtitle: 'Add website pages, documents, and business text to improve reply quality.' }
  if (path.includes('/dashboard/agents')) return { title: 'Assistants', subtitle: 'Create, configure, and manage your AI assistants.' }
  if (path.includes('/dashboard/analytics')) return { title: 'Analytics', subtitle: 'Review conversations, usage, and performance trends.' }
  if (path.includes('/dashboard/integrations/whatsapp')) return { title: 'WhatsApp', subtitle: 'Connect your business number and manage WhatsApp AI support.' }
  if (path.includes('/dashboard/integrations/website')) return { title: 'Website', subtitle: 'Connect your website chatbot to approved domains.' }
  if (path.includes('/dashboard/conversations')) return { title: 'Conversations', subtitle: 'Browse and review customer conversations.' }
  if (path.includes('/dashboard/pricing')) return { title: 'Pricing', subtitle: 'Choose the plan that fits your current stage.' }
  return { title: 'Dashboard', subtitle: 'Welcome back to ReplySuite.' }
})

const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

const greeting = computed(() => {
  if (!isMounted.value) return 'Welcome Back'
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
})
</script>

<template>
  <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
    <!-- Brand (Mobile Only) -->
    <div class="flex md:hidden items-center justify-between w-full mb-1">
      <div class="flex items-center gap-3">
        <div class="w-7 h-7 bg-gradient-to-tr from-primary to-primary-accent rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
          <Zap class="text-black w-3.5 h-3.5 fill-current" />
        </div>
        <span class="text-base font-bold">ReplySuite</span>
      </div>
      
      <!-- Upgrade Trigger (Mobile) -->
      <NuxtLink to="/dashboard/pricing" class="p-2.5 rounded-xl bg-primary text-black shadow-lg shadow-primary/20 transition-all active:scale-95">
        <TrendingUp class="w-4 h-4" />
      </NuxtLink>
    </div>

    <div class="animate-in fade-in slide-in-from-left-4 duration-500 pt-1">
      <div class="flex items-center gap-2 mb-0.5">
         <span class="text-[10px] font-bold tracking-widest text-primary capitalize">{{ greeting }}</span>
         <div class="h-[1px] w-4 bg-primary/30"></div>
      </div>
      <h1 class="text-xl md:text-2xl font-black text-foreground leading-tight">
        {{ pageContext.title }}
      </h1>
      <p class="text-foreground/50 text-xs md:text-sm font-medium mt-0.5">{{ pageContext.subtitle }}</p>
    </div>
    
    <div class="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-foreground/5 pt-4 md:pt-0">
      <div class="hidden sm:flex items-center gap-4">
        <NuxtLink to="/dashboard/pricing" class="relative flex items-center gap-3 py-2 px-5 rounded-2xl bg-primary text-black font-bold border border-primary/20 hover:scale-105 hover:shadow-xl hover:shadow-primary/30 transition-all group whitespace-nowrap shadow-lg shadow-primary/20">
            <span class="text-[10px] uppercase tracking-widest font-black">Upgrade Plan</span>
            <TrendingUp class="w-3.5 h-3.5" />
        </NuxtLink>
        <ThemeSwitcher />
      </div>

      <NuxtLink to="/dashboard/settings" class="flex items-center gap-3 glass-card !p-1.5 !rounded-full border-foreground/10 hover:border-primary/20 transition-all cursor-pointer group">
         <div class="w-9 h-9 rounded-full overflow-hidden bg-primary/20 border border-foreground/10 p-0.5">
            <img 
              :src="profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'expert'}`" 
              class="w-full h-full rounded-full object-cover group-hover:scale-110 transition-transform" 
            />
         </div>
         <div class="pr-4 hidden lg:block">
            <p class="text-[10px] font-bold tracking-widest text-foreground/50 leading-none mb-1">Logged In As</p>
            <p class="text-xs font-bold text-foreground leading-none">{{ profile?.full_name || user?.email?.split('@')[0] || 'Member' }}</p>
         </div>
      </NuxtLink>
    </div>
  </header>
</template>
