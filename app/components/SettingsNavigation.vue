<script setup lang="ts">
import { 
  User, 
  CreditCard, 
  Shield
} from 'lucide-vue-next'

const route = useRoute()

const tabs = [
  { id: 'profile', name: 'Profile', href: '/dashboard/settings', icon: User, description: 'Identity and contact details' },
  { id: 'billing', name: 'Billing', href: '/dashboard/settings/billing', icon: CreditCard, description: 'Plan and payment settings' },
  { id: 'account', name: 'Account', href: '/dashboard/settings/account', icon: Shield, description: 'Security and account access' }
]

const isActive = (href: string) => {
  if (href === '/dashboard/settings') {
    return route.path === '/dashboard/settings' || route.path === '/dashboard/settings/'
  }
  return route.path.startsWith(href)
}
</script>

<template>
  <aside class="rounded-[22px] border border-foreground/10 bg-foreground/[0.02] p-2 xl:sticky xl:top-24 xl:self-start">
    <nav class="grid gap-1 sm:grid-cols-3 xl:grid-cols-1" aria-label="Settings sections">
      <NuxtLink 
        v-for="tab in tabs" 
        :key="tab.id" 
        :to="tab.href"
        class="group relative flex items-center gap-3 rounded-2xl px-3 py-3 transition-all"
        :class="isActive(tab.href) ? 'border border-primary/15 bg-primary/10 text-primary shadow-sm shadow-primary/5' : 'border border-transparent text-foreground/55 hover:border-foreground/10 hover:bg-background/70 hover:text-foreground'"
      >
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all" :class="isActive(tab.href) ? 'border-primary/20 bg-primary/10' : 'border-foreground/10 bg-background/60 group-hover:border-foreground/15'">
          <component :is="tab.icon" class="h-4 w-4" />
        </div>
        <div class="min-w-0">
          <span class="block text-[11px] font-black uppercase tracking-widest">{{ tab.name }}</span>
          <span class="mt-0.5 hidden truncate text-[11px] text-foreground/40 xl:block">{{ tab.description }}</span>
        </div>
      </NuxtLink>
    </nav>
  </aside>
</template>
