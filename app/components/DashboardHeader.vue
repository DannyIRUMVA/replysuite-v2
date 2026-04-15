<script setup lang="ts">
import { Zap, TrendingUp } from 'lucide-vue-next'
const { user, profile } = useAuth()
const route = useRoute()

// Dynamic Header Content
const pageContext = computed(() => {
  const path = route.path
  if (path === '/dashboard') return { title: 'executive hub', subtitle: "checking your ai workforce's pulse." }
  if (path === '/dashboard/settings') return { title: 'elite settings', subtitle: 'refining your identity and operations.' }
  if (path.includes('/instagram')) return { title: 'social pulse', subtitle: 'managing instagram automation flow.' }
  if (path.includes('/agents')) return { title: 'agent forge', subtitle: 'crafting intelligent conversation rules.' }
  if (path.includes('/analytics')) return { title: 'insight engine', subtitle: 'visualizing your data performance.' }
  return { title: 'dashboard', subtitle: 'welcome back to replysuite.' }
})

const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

const greeting = computed(() => {
  if (!isMounted.value) return 'welcome back'
  const hour = new Date().getHours()
  if (hour < 12) return 'good morning'
  if (hour < 17) return 'good afternoon'
  return 'good evening'
})
</script>

<template>
  <header class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
    <!-- Brand (Mobile Only) -->
    <div class="flex md:hidden items-center justify-between w-full mb-2">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-tr from-primary to-primary-accent rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
          <Zap class="text-black w-4 h-4 fill-current" />
        </div>
        <span class="text-lg font-bold tracking-tight">replysuite</span>
      </div>
      
      <!-- Upgrade Trigger (Mobile) -->
      <NuxtLink to="/pricing" class="p-2 rounded-xl bg-primary/10 text-primary">
        <TrendingUp class="w-4 h-4" />
      </NuxtLink>
    </div>

    <div class="animate-in fade-in slide-in-from-left-4 duration-500">
      <div class="flex items-center gap-2 mb-1">
         <span class="text-[10px] font-bold tracking-widest text-primary capitalize">{{ greeting }}</span>
         <div class="h-[1px] w-4 bg-primary/30"></div>
      </div>
      <h1 class="text-2xl md:text-3xl font-black tracking-tighter text-white leading-tight">
        {{ pageContext.title }}
      </h1>
      <p class="text-gray-500 text-sm font-medium mt-1">{{ pageContext.subtitle }}</p>
    </div>
    
    <div class="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-white/5 pt-6 md:pt-0">
      <div class="relative hidden sm:block">
         <NuxtLink to="/pricing" class="relative flex items-center gap-4 py-2.5 px-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/30 transition-all group">
            <span class="text-[10px] font-bold tracking-widest text-gray-500 group-hover:text-primary transition-colors">upgrade</span>
            <div class="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover:bg-primary transition-all"></div>
         </NuxtLink>
      </div>

      <NuxtLink to="/dashboard/settings" class="flex items-center gap-3 glass-card !p-1.5 !rounded-full border-white/10 hover:border-primary/20 transition-all cursor-pointer group">
         <div class="w-10 h-10 rounded-full overflow-hidden bg-primary/20 border border-white/10 p-0.5">
            <img 
              :src="profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'expert'}`" 
              class="w-full h-full rounded-full object-cover group-hover:scale-110 transition-transform" 
            />
         </div>
         <div class="pr-5 hidden lg:block">
            <p class="text-[10px] font-bold tracking-widest text-gray-500 leading-none mb-1">logged in as</p>
            <p class="text-xs font-bold text-white leading-none">{{ (profile?.full_name || user?.email?.split('@')[0] || 'member').toLowerCase() }}</p>
         </div>
      </NuxtLink>
    </div>
  </header>
</template>
