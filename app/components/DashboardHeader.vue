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
  if (path === '/dashboard/agents/skills') return { title: 'Tools & Skills', subtitle: 'Assign action tools and behavior skills to each assistant.' }
  if (path.includes('/dashboard/agents')) return { title: 'Assistants', subtitle: 'Create, configure, and manage your AI assistants.' }
  if (path.includes('/dashboard/analytics')) return { title: 'Analytics', subtitle: 'Review conversations, usage, and performance trends.' }
  if (path.includes('/dashboard/integrations/whatsapp')) return { title: 'WhatsApp', subtitle: 'Connect your business number and manage WhatsApp AI support.' }
  if (path.includes('/dashboard/integrations/website')) return { title: 'Website', subtitle: 'Connect your website chatbot to approved domains.' }
  if (path.includes('/dashboard/conversations')) return { title: 'Conversations', subtitle: 'Browse and review customer conversations.' }
  if (path.includes('/dashboard/pricing')) return { title: 'Pricing', subtitle: 'Choose the plan that fits your current stage.' }
  return { title: 'Dashboard', subtitle: 'Welcome back to ReplySuite.' }
})

</script>

<template>
  <header class="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-0">
    <!-- Brand (Mobile Only) -->
    <div class="flex md:hidden items-center justify-between w-full mb-1">
      <div class="flex items-center gap-3">
        <div class="w-7 h-7 bg-gradient-to-tr from-primary to-primary-accent rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
          <Zap class="text-black w-3.5 h-3.5 fill-current" />
        </div>
        <span class="text-base font-bold">ReplySuite</span>
      </div>
      
      <!-- Upgrade Trigger (Mobile) -->
      <NuxtLink to="/dashboard/pricing" class="dashboard-header-action-btn !p-2.5">
        <TrendingUp class="w-4 h-4" />
      </NuxtLink>
    </div>

    <div class="animate-in fade-in slide-in-from-left-4 duration-500">
      <h1 class="text-lg md:text-xl font-black text-foreground leading-tight">
        {{ pageContext.title }}
      </h1>
      <p class="text-foreground/50 text-[11px] md:text-xs font-medium mt-0.5">{{ pageContext.subtitle }}</p>
    </div>
    
    <div class="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 border-foreground/5 pt-2 md:pt-0">
      <div class="hidden sm:flex items-center gap-3">
        <NuxtLink to="/dashboard/pricing" class="dashboard-header-action-btn whitespace-nowrap">
            <span>Upgrade Plan</span>
            <TrendingUp class="w-3 h-3" />
        </NuxtLink>
        <ThemeSwitcher />
      </div>

      <NuxtLink to="/dashboard/settings" class="flex items-center gap-2.5 glass-card !p-1 !rounded-full border-foreground/10 hover:border-primary/20 transition-all cursor-pointer group">
         <div class="w-8 h-8 rounded-full overflow-hidden bg-primary/20 border border-foreground/10 p-0.5">
            <img 
              :src="profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'expert'}`" 
              class="w-full h-full rounded-full object-cover group-hover:scale-110 transition-transform" 
            />
         </div>
         <div class="pr-3 hidden lg:block">
            <p class="text-[9px] font-bold tracking-widest text-foreground/50 leading-none mb-1">Logged In As</p>
            <p class="text-xs font-bold text-foreground leading-none">{{ profile?.full_name || user?.email?.split('@')[0] || 'Member' }}</p>
         </div>
      </NuxtLink>
    </div>
  </header>
</template>
