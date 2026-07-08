<script setup lang="ts">
import {
  Bot,
  Code2,
  LayoutDashboard,
  MessageCircle,
  TrendingUp,
} from "lucide-vue-next";

const route = useRoute();

const iconMap: Record<string, any> = {
  LayoutDashboard,
  MessageCircle,
  Bot,
  Code2,
  TrendingUp,
};

const navLinks = computed(() => [
  { name: "Home", href: "/dashboard", icon: "LayoutDashboard", exact: true },
  { name: "Inbox", href: "/dashboard/conversations", icon: "MessageCircle" },
  { name: "Assistants", href: "/dashboard/agents", icon: "Bot" },
  { name: "Website", href: "/dashboard/integrations/website", icon: "Code2" },
  { name: "Reports", href: "/dashboard/analytics", icon: "TrendingUp" },
]);

const isActive = (link: any) => {
  if (link.exact) return route.path === link.href;
  return route.path === link.href || route.path.startsWith(`${link.href}/`);
};
</script>

<template>
  <nav
    class="fixed bottom-3 left-1/2 z-[100] w-[94%] max-w-lg -translate-x-1/2 md:hidden"
  >
    <div
      class="dashboard-mobile-dock flex items-center justify-around rounded-[0.75rem] border border-foreground/10 px-2 py-2 shadow-xl shadow-black/20"
    >
      <NuxtLink
        v-for="link in navLinks"
        :key="link.name"
        :to="link.href"
        class="group relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-[0.39rem] px-1 py-1 transition"
        :class="
          isActive(link)
            ? 'text-primary'
            : 'text-foreground/45 active:text-foreground'
        "
      >
        <div class="relative flex h-5 w-5 items-center justify-center">
          <component
            :is="iconMap[link.icon]"
            class="h-4 w-4 transition-transform duration-200"
            :class="isActive(link) ? 'scale-110' : 'group-active:scale-95'"
          />
          <div
            v-if="isActive(link)"
            class="absolute inset-0 rounded-full bg-primary/15 blur-md"
          />
        </div>
        <span
          class="max-w-full truncate text-[9px] font-semibold leading-none transition"
        >
          {{ link.name }}
        </span>
        <div
          v-if="isActive(link)"
          class="absolute -bottom-0.5 h-0.5 w-4 rounded-full bg-primary"
        />
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped>
.dashboard-mobile-dock {
  @apply bg-background/95 backdrop-blur-3xl;
}
</style>
