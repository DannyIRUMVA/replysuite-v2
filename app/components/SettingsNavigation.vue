<script setup lang="ts">
import { 
  User, 
  CreditCard, 
  Shield
} from 'lucide-vue-next'

const route = useRoute()

const tabs = [
  { id: 'profile', name: 'Profile', href: '/dashboard/settings', icon: User },
  { id: 'billing', name: 'Billing', href: '/dashboard/settings/billing', icon: CreditCard },
  { id: 'account', name: 'Account', href: '/dashboard/settings/account', icon: Shield }
]

const isActive = (href: string) => {
  if (href === '/dashboard/settings') {
    return route.path === '/dashboard/settings' || route.path === '/dashboard/settings/'
  }
  return route.path.startsWith(href)
}
</script>

<template>
  <aside class="w-full lg:w-64 space-y-1">
    <NuxtLink 
      v-for="tab in tabs" 
      :key="tab.id" 
      :to="tab.href"
      class="w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group relative overflow-hidden"
      :class="isActive(tab.href) ? 'bg-primary/10 text-primary font-bold shadow-lg shadow-primary/5' : 'text-gray-400 hover:text-white hover:bg-white/5'"
    >
      <div v-if="isActive(tab.href)" class="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
      <component :is="tab.icon" class="w-5 h-5 group-hover:scale-110 transition-transform" />
      <span class="text-sm tracking-widest">{{ tab.name }}</span>
    </NuxtLink>
  </aside>
</template>
