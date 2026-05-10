<script setup lang="ts">
import { 
  LayoutDashboard, 
  MessageSquare, 
  Settings, 
  TrendingUp,
  Zap,
  Bot,
  MessageCircle
} from 'lucide-vue-next'

const route = useRoute()

// Map strings to components to avoid serialization of functions
const iconMap: Record<string, any> = {
  LayoutDashboard,
  Bot,
  TrendingUp,
  Zap,
  MessageCircle
}

const navLinks = [
  { name: 'Hub', href: '/dashboard', icon: 'LayoutDashboard' },
  { name: 'Web', href: '/dashboard/integrations/website', icon: 'Zap' },
  { name: 'Forge', href: '/dashboard/agents', icon: 'Bot' },
  { name: 'Stats', href: '/dashboard/analytics', icon: 'TrendingUp' },
  { name: 'Chat', href: '/dashboard/conversations', icon: 'MessageCircle' },
]
</script>

<template>
  <nav class="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-[100] w-[94%] max-w-lg">
    <div class="glass-dock flex items-center justify-around py-2 px-3 rounded-[1.5rem] border border-foreground/10 shadow-2xl shadow-foreground/20">
      <NuxtLink 
        v-for="link in navLinks" 
        :key="link.name" 
        :to="link.href"
        class="relative flex flex-col items-center gap-0.5 py-0.5 transition-all duration-300 group"
        :class="[route.path === link.href ? 'text-primary' : 'text-foreground/40']"
      >
        <div class="relative flex items-center justify-center">
           <component 
            :is="iconMap[link.icon]" 
            class="w-4.5 h-4.5 transition-all duration-300" 
            :class="[route.path === link.href ? 'scale-110' : 'group-active:scale-90']"
           />
           
           <!-- Active Aura -->
           <div 
            v-if="route.path === link.href" 
            class="absolute inset-0 bg-primary/20 blur-md rounded-full animate-pulse"
           ></div>
        </div>
        <span class="text-[8px] font-bold tracking-widest uppercase transition-all duration-300">
          {{ link.name }}
        </span>
        
        <!-- Indicator Dot -->
        <div 
          v-if="route.path === link.href" 
          class="absolute -bottom-0.5 w-1 h-1 bg-primary rounded-full"
        ></div>
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped>
.glass-dock {
  @apply bg-background/95 backdrop-blur-3xl border border-foreground/5 shadow-[0_20px_50px_rgba(0,0,0,0.3)];
}

.router-link-active span {
  @apply text-primary;
}
</style>

