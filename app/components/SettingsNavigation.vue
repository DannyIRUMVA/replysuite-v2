<script setup lang="ts">
import {
  User,
  CreditCard,
  Shield
} from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  alignOnLg?: boolean
}>(), {
  alignOnLg: false
})

const route = useRoute()

const tabs = [
  { id: 'profile', name: 'Profile', href: '/dashboard/settings', icon: User, description: 'Identity and contact' },
  { id: 'billing', name: 'Billing', href: '/dashboard/settings/billing', icon: CreditCard, description: 'Plan and payments' },
  { id: 'account', name: 'Account', href: '/dashboard/settings/account', icon: Shield, description: 'Security access' }
]

const isActive = (href: string) => {
  if (href === '/dashboard/settings') {
    return route.path === '/dashboard/settings' || route.path === '/dashboard/settings/'
  }
  return route.path.startsWith(href)
}
</script>

<template>
  <aside
    class="rounded-[0.39rem] border border-foreground/10 bg-background-accent p-1.5 shadow-sm shadow-black/5 dark:bg-[#050505]"
    :class="props.alignOnLg ? 'lg:sticky lg:top-20 lg:self-start' : 'xl:sticky xl:top-20 xl:self-start'"
  >
    <nav
      class="grid gap-1 sm:grid-cols-3"
      :class="props.alignOnLg ? 'lg:grid-cols-1' : 'xl:grid-cols-1'"
      aria-label="Settings sections"
    >
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.id"
        :to="tab.href"
        class="group flex items-center gap-2.5 rounded-[0.39rem] border px-2.5 py-2 transition"
        :class="isActive(tab.href) ? 'border-primary/25 bg-primary/10 text-primary' : 'border-transparent text-foreground/55 hover:border-foreground/10 hover:bg-background hover:text-foreground'"
      >
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.35rem] border transition" :class="isActive(tab.href) ? 'border-primary/20 bg-primary/10' : 'border-foreground/10 bg-background/60 group-hover:border-foreground/15'">
          <component :is="tab.icon" class="h-3.5 w-3.5" />
        </span>
        <span class="min-w-0">
          <span class="block truncate text-xs font-bold leading-4">{{ tab.name }}</span>
          <span class="hidden truncate text-[11px] leading-4 text-foreground/40 sm:block xl:block">{{ tab.description }}</span>
        </span>
      </NuxtLink>
    </nav>
  </aside>
</template>
