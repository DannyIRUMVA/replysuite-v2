<script setup lang="ts">
import { 
  LayoutDashboard, 
  Instagram, 
  MessageSquare, 
  Settings, 
  TrendingUp 
} from 'lucide-vue-next'

const { isVerified } = useAuth()
const route = useRoute()

const navLinks = computed(() => [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Insta', href: '/dashboard/instagram', icon: Instagram },
  { name: 'AI', href: '/dashboard/agents', icon: MessageSquare },
  { name: 'Stats', href: '/dashboard/analytics', icon: TrendingUp },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
])
</script>

<template>
  <nav class="md:hidden fixed bottom-0 left-0 right-0 z-[100] safe-area-bottom">
    <div class="glass-nav-footer flex items-center justify-around py-3 px-2 relative overflow-hidden h-20 border-t border-white/10">
      <!-- Background Glow Effect (Active State) -->
      <div class="absolute inset-0 bg-primary/5 -z-10 pointer-events-none"></div>
      
      <NuxtLink 
        v-for="link in navLinks" 
        :key="link.name" 
        :to="link.href"
        class="flex flex-col items-center gap-1.5 py-1 px-3 transition-all duration-300 group min-w-[64px]"
        :class="[
          route.path === link.href ? 'text-primary' : 'text-gray-500',
          'active:scale-95'
        ]"
      >
        <div class="relative">
           <component :is="link.icon" class="w-6 h-6" :class="{ 'fill-current opacity-10': route.path === link.href }" />
           <!-- Active Indicator -->
           <div v-if="route.path === link.href" class="absolute -top-1 -right-1 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(212,175,55,0.8)]"></div>
        </div>
        <span class="text-[10px] font-medium tracking-tight whitespace-nowrap">{{ link.name }}</span>
        
        <!-- Bottom Active Bar -->
        <div 
          v-if="route.path === link.href" 
          class="absolute bottom-0 w-8 h-1 bg-primary rounded-t-full shadow-[0_-2px_6px_rgba(212,175,55,0.4)]"
        ></div>
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped>
.glass-nav-footer {
  @apply bg-[#0a0a0a]/90 backdrop-blur-3xl;
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>

