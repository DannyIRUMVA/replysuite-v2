<script setup lang="ts">
import {
  LayoutDashboard,
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
  MessageCircle,
  Instagram,
  CalendarDays,
  CreditCard,
  GraduationCap,
  GitBranch,
} from "lucide-vue-next";

const { user, profile, membership, isLoading } = useAuth();
const { canUseWhatsApp, canUseInstagramWorkflow } = usePlanAccess();
const route = useRoute();
const supabase = useSupabaseClient();

// Map strings to components to avoid serialization of functions
const iconMap: Record<string, any> = {
  LayoutDashboard,
  TrendingUp,
  Megaphone,
  MessageSquare,
  Database,
  Code2,
  Settings,
  Lock,
  MessageCircle,
  Instagram,
  CalendarDays,
  CreditCard,
  GraduationCap,
  GitBranch,
};

const showLockedFeatureModal = ref(false);
const lockedFeatureName = ref("");
const lockedFeatureReason = ref<"upgrade" | "coming-soon">("coming-soon");
const isMembershipCardVisible = ref(true);
const isMembershipCardReady = ref(false);
const isSidebarHovered = ref(false);
const isSidebarCollapsed = useState<boolean>(
  "dashboard-sidebar-collapsed",
  () => false,
);
const isUserMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);

const membershipCardStorageKey = computed(
  () => `replysuite:membership-card-dismissed:${user.value?.id || "anonymous"}`,
);
const sidebarCollapsedStorageKey = "replysuite:dashboard-sidebar-collapsed";
const sidebarGroupsStorageKey = "replysuite:dashboard-sidebar-groups";
const isSidebarCompact = computed(
  () => isSidebarCollapsed.value && !isSidebarHovered.value,
);
const openSidebarGroups = ref<string[]>([]);

const syncMembershipCardVisibility = () => {
  if (!import.meta.client) return;
  if (!user.value?.id) {
    isMembershipCardVisible.value = true;
    isMembershipCardReady.value = true;
    return;
  }

  isMembershipCardVisible.value =
    sessionStorage.getItem(membershipCardStorageKey.value) !== "true";
  isMembershipCardReady.value = true;
};

const dismissMembershipCard = () => {
  isMembershipCardVisible.value = false;
  if (import.meta.client && user.value?.id) {
    sessionStorage.setItem(membershipCardStorageKey.value, "true");
  }
};

const syncSidebarCollapsedState = () => {
  if (!import.meta.client) return;
  isSidebarCollapsed.value =
    localStorage.getItem(sidebarCollapsedStorageKey) === "true";
};

const syncSidebarGroupState = () => {
  if (!import.meta.client) return;
  const stored = localStorage.getItem(sidebarGroupsStorageKey);
  if (!stored) return;

  try {
    const parsed = JSON.parse(stored);
    openSidebarGroups.value = Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string")
      : [];
  } catch {
    openSidebarGroups.value = [];
  }
};

const toggleSidebarCollapsed = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  if (import.meta.client) {
    localStorage.setItem(
      sidebarCollapsedStorageKey,
      String(isSidebarCollapsed.value),
    );
  }
};

const persistSidebarGroups = () => {
  if (import.meta.client) {
    localStorage.setItem(
      sidebarGroupsStorageKey,
      JSON.stringify(openSidebarGroups.value),
    );
  }
};

const toggleSidebarGroup = (title: string) => {
  const next = new Set(openSidebarGroups.value);
  if (next.has(title)) next.delete(title);
  else next.add(title);
  openSidebarGroups.value = Array.from(next);
  persistSidebarGroups();
};

const handleDocumentClick = (event: MouseEvent) => {
  if (!isUserMenuOpen.value) return;
  const target = event.target as Node | null;
  if (target && userMenuRef.value?.contains(target)) return;
  isUserMenuOpen.value = false;
};

onMounted(() => {
  syncMembershipCardVisibility();
  syncSidebarCollapsedState();
  syncSidebarGroupState();
  document.addEventListener("click", handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
});

watch(() => user.value?.id, syncMembershipCardVisibility);
watch(
  () => route.fullPath,
  () => {
    isUserMenuOpen.value = false;
  },
);

const daysLeft = computed(() => {
  if (!membership.value?.ends_at) return 0;
  const end = new Date(membership.value.ends_at);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

const mainLinks = computed(() => [
  { name: "Home", href: "/dashboard", icon: "LayoutDashboard", exact: true },
  { name: "Inbox", href: "/dashboard/conversations", icon: "MessageCircle" },
  { name: "Flows", href: "/dashboard/flows", icon: "GitBranch" },
  { name: "Reports", href: "/dashboard/analytics", icon: "TrendingUp" },
]);

const navigationGroups = computed(() => [
  {
    title: "Assistant",
    icon: "MessageSquare",
    links: [
      {
        name: "Assistants",
        href: "/dashboard/agents",
        icon: "MessageSquare",
        excludePrefixes: [
          "/dashboard/agents/skills",
          "/dashboard/agents/tools",
        ],
      },
      { name: "Skills", href: "/dashboard/agents/skills", icon: "Database" },
      { name: "Tools", href: "/dashboard/agents/tools", icon: "CalendarDays" },
    ],
  },
  {
    title: "Channels",
    icon: "Code2",
    links: [
      {
        name: "Website",
        href: "/dashboard/integrations/website",
        icon: "Code2",
      },
      {
        name: "WhatsApp",
        href: "/dashboard/integrations/whatsapp",
        icon: "MessageCircle",
        locked: !canUseWhatsApp.value,
      },
      {
        name: "Instagram",
        href: "/dashboard/integrations/instagram",
        icon: "Instagram",
        locked: !canUseInstagramWorkflow.value,
      },
    ],
  },
]);

const workspaceLinks = computed(() => [
  { name: "Business", href: "/dashboard/business", icon: "CalendarDays" },
  { name: "School", href: "/dashboard/school", icon: "GraduationCap" },
]);

const isLinkActive = (link: any) => {
  if (!link?.href) return false;
  if (
    Array.isArray(link.excludePrefixes) &&
    link.excludePrefixes.some(
      (prefix: string) =>
        route.path === prefix || route.path.startsWith(`${prefix}/`),
    )
  ) {
    return false;
  }
  if (link.exact) return route.path === link.href;
  if (
    Array.isArray(link.activePrefixes) &&
    link.activePrefixes.some(
      (prefix: string) =>
        route.path === prefix || route.path.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }
  return route.path === link.href || route.path.startsWith(`${link.href}/`);
};

const isGroupActive = (group: any) =>
  group.links?.some((link: any) => isLinkActive(link));

const isGroupOpen = (group: any) =>
  openSidebarGroups.value.includes(group.title) || isGroupActive(group);

const openLockedFeatureModal = (link: any) => {
  lockedFeatureName.value = link.name || "This feature";
  lockedFeatureReason.value = ["WhatsApp", "Instagram"].includes(link.name)
    ? "upgrade"
    : "coming-soon";
  showLockedFeatureModal.value = true;
};

const lockedFeatureMessage = computed(() => {
  if (lockedFeatureReason.value === "upgrade") {
    return lockedFeatureName.value === "Instagram"
      ? "Instagram workflows are available on Gold and Enterprise plans. Upgrade to automate comment replies and comment-to-DM flows."
      : "WhatsApp assistants are available on Silver, Gold, and Enterprise plans. Upgrade to connect your business number.";
  }

  const messages: Record<string, string> = {
    Selling:
      "Selling will help assistants qualify buyers, recommend the right next step, and collect MTN/Airtel mobile payment when a checkout is required.",
    "AI Tutor":
      "AI Tutor will connect a WhatsApp learning assistant that asks students revision questions and helps them practice at home.",
    "Revision Sessions":
      "Revision Sessions will organize guided question-and-answer practice for students across WhatsApp and assistant chat.",
    "Mobile Money":
      "Mobile Money will collect MTN/Airtel mobile payment for paid learning sessions after the session amount is confirmed.",
  };

  return (
    messages[lockedFeatureName.value] ||
    `${lockedFeatureName.value} is planned for a future ReplySuite workspace update.`
  );
});

const userDisplayName = computed(
  () =>
    profile.value?.full_name || user.value?.email?.split("@")[0] || "Member",
);
const userAvatarUrl = computed(
  () =>
    profile.value?.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.value?.id || "expert"}`,
);

const handleLogout = async () => {
  const isLoggingOut = useState<boolean>(
    "auth-logout-in-progress",
    () => false,
  );
  isLoggingOut.value = true;
  isUserMenuOpen.value = false;
  if (import.meta.client && user.value?.id) {
    sessionStorage.removeItem(membershipCardStorageKey.value);
  }
  await supabase.auth.signOut();
  await navigateTo({ path: "/login", query: {} }, { replace: true });
  isLoggingOut.value = false;
};
</script>

<template>
  <aside
    :class="[
      'dashboard-sidebar hidden md:flex h-screen max-h-screen border-r border-foreground/5 bg-background-accent dark:bg-[#050505] flex-col py-4 xl:py-5 shrink-0 relative transition-[width,padding] duration-300 ease-out',
      isSidebarCompact
        ? 'w-[4.35rem] px-1.5'
        : 'md:w-[14.5rem] xl:w-[16rem] px-2.5 xl:px-3',
    ]"
    @mouseenter="isSidebarHovered = true"
    @mouseleave="isSidebarHovered = false"
  >
    <!-- Brand -->
    <div
      :class="[
        'flex items-center shrink-0',
        isSidebarCompact
          ? 'mb-8 justify-center px-0'
          : 'mb-4 gap-2 px-2 xl:mb-5',
      ]"
    >
      <div
        class="w-8 h-8 bg-gradient-to-tr from-primary to-primary-accent rounded-[0.39rem] flex items-center justify-center shadow-lg shadow-primary/20 shrink-0"
      >
        <Zap class="text-black h-[1.125rem] w-[1.125rem] fill-current" />
      </div>
      <span v-if="!isSidebarCompact" class="text-base font-bold"
        >ReplySuite</span
      >
    </div>

    <button
      v-if="!isSidebarCompact"
      type="button"
      class="absolute right-2 top-4 z-10 hidden h-8 w-8 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background/80 text-foreground/50 shadow-sm backdrop-blur transition hover:border-primary/30 hover:text-primary md:flex"
      :aria-label="
        isSidebarCollapsed ? 'Keep sidebar open' : 'Collapse sidebar'
      "
      :title="isSidebarCollapsed ? 'Keep sidebar open' : 'Collapse sidebar'"
      @click="toggleSidebarCollapsed"
    >
      <ChevronRight
        :class="[
          'h-4 w-4 transition-transform',
          isSidebarCollapsed ? '' : 'rotate-180',
        ]"
      />
    </button>

    <!-- Navigation -->
    <nav
      :class="[
        'flex-1 min-h-0 overflow-y-auto sidebar-scroll',
        isSidebarCompact ? 'space-y-1.5 px-0' : 'pr-1 -mr-1 space-y-1.5',
      ]"
    >
      <div class="space-y-1.5">
        <NuxtLink
          v-for="link in mainLinks"
          :key="link.name"
          :to="link.href"
          :title="isSidebarCompact ? link.name : undefined"
          :class="[
            'flex items-center rounded-[0.39rem] transition-all group',
            isSidebarCompact ? 'h-9 justify-center px-0' : 'h-9 gap-2 px-2.5',
            isLinkActive(link)
              ? 'bg-primary/10 text-primary font-bold shadow-[0_0_20px_rgba(var(--primary),0.05)]'
              : 'text-foreground/55 hover:text-foreground hover:bg-foreground/5',
          ]"
        >
          <component
            :is="iconMap[link.icon]"
            class="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform"
          />
          <span v-if="!isSidebarCompact" class="flex-1 text-xs font-semibold">{{
            link.name
          }}</span>
          <ChevronRight
            v-if="!isSidebarCompact && isLinkActive(link)"
            class="w-3 h-3"
          />
        </NuxtLink>
      </div>

      <div
        v-if="!isSidebarCompact"
        class="my-2 h-px bg-foreground/5"
        aria-hidden="true"
      ></div>
      <div
        v-else
        class="mx-auto my-2 h-px w-8 bg-foreground/10"
        aria-hidden="true"
      ></div>

      <div
        v-for="group in navigationGroups"
        :key="group.title"
        class="space-y-1"
      >
        <button
          type="button"
          :title="isSidebarCompact ? group.title : undefined"
          :class="[
            'w-full flex items-center rounded-[0.39rem] transition-all group',
            isSidebarCompact
              ? 'h-9 justify-center px-0'
              : 'h-[2.125rem] gap-2 px-2.5',
            isGroupActive(group)
              ? 'bg-foreground/5 text-foreground font-bold'
              : 'text-foreground/55 hover:text-foreground hover:bg-foreground/5',
          ]"
          @click="!isSidebarCompact && toggleSidebarGroup(group.title)"
        >
          <component
            :is="iconMap[group.icon]"
            class="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform"
          />
          <span
            v-if="!isSidebarCompact"
            class="flex-1 text-left text-xs font-semibold"
            >{{ group.title }}</span
          >
          <ChevronRight
            v-if="!isSidebarCompact"
            :class="[
              'h-3.5 w-3.5 text-foreground/35 transition-transform',
              isGroupOpen(group) ? 'rotate-90' : '',
            ]"
          />
        </button>

        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="-translate-y-1 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="-translate-y-1 opacity-0"
        >
          <div
            v-if="!isSidebarCompact && isGroupOpen(group)"
            class="space-y-0.5 pb-1 pl-4"
          >
            <template v-for="link in group.links" :key="link.name">
              <NuxtLink
                v-if="link.href && !link.locked"
                :to="link.href"
                :class="[
                  'group flex h-[1.875rem] items-center gap-2 rounded-[0.39rem] px-2.5 transition-all',
                  isLinkActive(link)
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-foreground/45 hover:bg-foreground/5 hover:text-foreground',
                ]"
              >
                <component
                  :is="iconMap[link.icon]"
                  class="h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110"
                />
                <span class="flex-1 text-left text-xs font-semibold">{{
                  link.name
                }}</span>
                <ChevronRight v-if="isLinkActive(link)" class="h-3 w-3" />
              </NuxtLink>

              <button
                v-else-if="link.action"
                type="button"
                class="group flex h-[1.875rem] w-full items-center gap-2 rounded-[0.39rem] px-2.5 text-foreground/45 transition-all hover:bg-foreground/5 hover:text-foreground"
                @click="link.action()"
              >
                <component
                  :is="iconMap[link.icon]"
                  class="h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110"
                />
                <span class="flex-1 text-left text-xs font-semibold">{{
                  link.name
                }}</span>
              </button>

              <button
                v-else
                type="button"
                class="group flex h-[1.875rem] w-full items-center gap-2 rounded-[0.39rem] px-2.5 text-foreground/45 transition-all hover:bg-foreground/5 hover:text-foreground/80"
                @click="openLockedFeatureModal(link)"
              >
                <component
                  :is="iconMap[link.icon]"
                  class="h-3.5 w-3.5 shrink-0 grayscale opacity-60 transition-all group-hover:opacity-100"
                />
                <span class="flex-1 text-left text-xs font-semibold">{{
                  link.name
                }}</span>
                <Lock
                  class="h-3 w-3 opacity-50 transition-all group-hover:opacity-100"
                />
              </button>
            </template>
          </div>
        </Transition>
      </div>

      <div
        :class="[
          'pointer-events-none',
          isSidebarCompact
            ? 'mx-auto my-2 h-px w-8 bg-foreground/10'
            : 'my-2 h-px bg-foreground/8 mx-2',
        ]"
        aria-hidden="true"
      ></div>

      <div class="space-y-1.5">
        <NuxtLink
          v-for="link in workspaceLinks"
          :key="link.name"
          :to="link.href"
          :title="isSidebarCompact ? link.name : undefined"
          :class="[
            'flex items-center rounded-[0.39rem] transition-all group',
            isSidebarCompact ? 'h-9 justify-center px-0' : 'h-9 gap-2 px-2.5',
            isLinkActive(link)
              ? 'bg-primary/10 text-primary font-bold shadow-[0_0_20px_rgba(var(--primary),0.05)]'
              : 'text-foreground/55 hover:text-foreground hover:bg-foreground/5',
          ]"
        >
          <component
            :is="iconMap[link.icon]"
            class="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform"
          />
          <span v-if="!isSidebarCompact" class="flex-1 text-xs font-semibold">{{
            link.name
          }}</span>
          <ChevronRight
            v-if="!isSidebarCompact && isLinkActive(link)"
            class="w-3 h-3"
          />
        </NuxtLink>
      </div>
    </nav>

    <!-- Subscription Card (Skeleton while loading) -->
    <div
      v-if="
        !isSidebarCompact &&
        isMembershipCardReady &&
        isLoading &&
        isMembershipCardVisible
      "
      class="mt-4 mb-3 shrink-0"
    >
      <div
        class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-3 shadow-sm shadow-black/5"
      >
        <div class="flex items-center justify-between mb-2">
          <Skeleton width="52px" height="8px" />
          <Skeleton width="10px" height="10px" circle />
        </div>
        <Skeleton width="100px" height="12px" class="mb-2" />
        <Skeleton width="70px" height="8px" class="mb-3" />
        <Skeleton width="100%" height="28px" rounded="8px" />
      </div>
    </div>

    <!-- Subscription Card (Actual Data) -->
    <div
      v-else-if="
        !isSidebarCompact &&
        isMembershipCardReady &&
        membership &&
        isMembershipCardVisible
      "
      class="mt-4 mb-3 shrink-0"
    >
      <div
        class="group relative overflow-hidden rounded-[0.39rem] border border-primary/15 bg-background-card/45 p-3 shadow-sm shadow-black/5"
      >
        <div
          class="absolute -right-8 -bottom-8 w-20 h-20 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"
        ></div>

        <div class="relative z-10">
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="text-xs font-bold text-primary">Plan</span>
            <button
              type="button"
              class="rounded-[0.39rem] p-1 text-foreground/40 hover:bg-foreground/5 hover:text-foreground transition-colors"
              aria-label="Hide membership card until next login"
              @click="dismissMembershipCard"
            >
              <X class="w-3 h-3" />
            </button>
          </div>

          <div class="flex items-end justify-between gap-2 mb-3">
            <div class="min-w-0">
              <h4 class="font-bold text-xs capitalize truncate">
                {{ membership.plans?.display_name || membership.plans?.name }}
              </h4>
              <p class="text-xs text-foreground/50">{{ daysLeft }} days left</p>
            </div>
          </div>

          <NuxtLink
            to="/dashboard/pricing"
            class="block w-full rounded-[0.39rem] bg-primary py-2 text-center text-xs font-bold text-black shadow-sm shadow-primary/10 transition hover:bg-primary-accent"
          >
            Select plan
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- User Menu -->
    <div
      ref="userMenuRef"
      class="relative mt-auto shrink-0 border-t border-foreground/5 pt-3"
    >
      <button
        type="button"
        :title="isSidebarCompact ? userDisplayName : undefined"
        :class="[
          'group flex w-full items-center rounded-[0.39rem] border border-transparent transition-all hover:border-primary/20 hover:bg-foreground/5',
          isSidebarCompact ? 'h-11 justify-center px-0' : 'gap-2.5 px-2.5 py-2',
        ]"
        @click.stop="isUserMenuOpen = !isUserMenuOpen"
      >
        <div
          class="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-foreground/10 bg-primary/15 p-0.5"
        >
          <img
            :src="userAvatarUrl"
            :alt="userDisplayName"
            class="h-full w-full rounded-full object-cover transition-transform group-hover:scale-110"
          />
        </div>
        <div v-if="!isSidebarCompact" class="min-w-0 flex-1 text-left">
          <p class="truncate text-xs font-bold text-foreground">
            {{ userDisplayName }}
          </p>
          <p class="truncate text-xs font-semibold text-foreground/45">
            {{ user?.email || "Account menu" }}
          </p>
        </div>
        <ChevronRight
          v-if="!isSidebarCompact"
          :class="[
            'h-4 w-4 text-foreground/35 transition-transform',
            isUserMenuOpen ? '-rotate-90 text-primary' : '',
          ]"
        />
      </button>

      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="translate-y-2 opacity-0 scale-95"
        enter-to-class="translate-y-0 opacity-100 scale-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="translate-y-0 opacity-100 scale-100"
        leave-to-class="translate-y-2 opacity-0 scale-95"
      >
        <div
          v-if="isUserMenuOpen"
          class="absolute bottom-0 left-[calc(100%+0.75rem)] z-[120] w-64 origin-bottom-left overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background shadow-xl shadow-black/20 backdrop-blur-xl"
          @click.stop
        >
          <div class="border-b border-foreground/10 bg-foreground/[0.02] p-4">
            <div class="flex items-center gap-3">
              <div
                class="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-foreground/10 bg-primary/15 p-0.5"
              >
                <img
                  :src="userAvatarUrl"
                  :alt="userDisplayName"
                  class="h-full w-full rounded-full object-cover"
                />
              </div>
              <div class="min-w-0">
                <p class="truncate text-sm font-bold text-foreground">
                  {{ userDisplayName }}
                </p>
                <p class="truncate text-xs font-semibold text-foreground/45">
                  {{ user?.email }}
                </p>
              </div>
            </div>
          </div>

          <div class="p-2">
            <NuxtLink
              to="/dashboard/settings"
              class="flex items-center gap-2.5 rounded-[0.39rem] px-3 py-2.5 text-sm font-bold text-foreground/65 transition hover:bg-foreground/5 hover:text-foreground"
            >
              <Settings class="h-4 w-4" />
              Account settings
            </NuxtLink>
            <NuxtLink
              to="/dashboard/settings/billing"
              class="flex items-center gap-2.5 rounded-[0.39rem] px-3 py-2.5 text-sm font-bold text-foreground/65 transition hover:bg-foreground/5 hover:text-foreground"
            >
              <CreditCard class="h-4 w-4" />
              Billing
            </NuxtLink>
            <NuxtLink
              to="/dashboard/pricing"
              class="flex items-center gap-2.5 rounded-[0.39rem] px-3 py-2.5 text-sm font-bold text-foreground/65 transition hover:bg-foreground/5 hover:text-foreground"
            >
              <TrendingUp class="h-4 w-4" />
              Upgrade plan
            </NuxtLink>
          </div>

          <div class="border-t border-foreground/10 p-2">
            <button
              type="button"
              class="flex w-full items-center gap-2.5 rounded-[0.39rem] px-3 py-2.5 text-sm font-bold text-red-400 transition hover:bg-red-400/10"
              @click="handleLogout"
            >
              <LogOut class="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </Transition>
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
      <div
        v-if="showLockedFeatureModal"
        class="fixed inset-0 z-[200] flex items-center justify-center p-6"
      >
        <div
          class="absolute inset-0 bg-background/80 backdrop-blur-md"
          @click="showLockedFeatureModal = false"
        ></div>
        <div
          class="relative w-full max-w-sm rounded-[0.39rem] border border-foreground/10 bg-background p-6 text-center shadow-xl"
        >
          <button
            @click="showLockedFeatureModal = false"
            class="absolute right-4 top-4 rounded-[0.39rem] p-2 text-foreground/50 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <X class="w-5 h-5" />
          </button>
          <div
            class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[0.39rem] border border-primary/20 bg-primary/10"
          >
            <Lock class="h-7 w-7 text-primary" />
          </div>
          <h3 class="mb-3 text-lg font-bold text-foreground">
            {{
              lockedFeatureReason === "upgrade"
                ? `Upgrade to unlock ${lockedFeatureName}`
                : "Planned"
            }}
          </h3>
          <p class="mb-6 text-sm leading-relaxed text-foreground/55">
            {{ lockedFeatureMessage }}
          </p>
          <div class="space-y-3">
            <NuxtLink
              v-if="lockedFeatureReason === 'upgrade'"
              to="/dashboard/pricing"
              @click="showLockedFeatureModal = false"
              class="block w-full rounded-[0.39rem] bg-primary py-3 text-sm font-bold text-black shadow-sm shadow-primary/10 transition hover:bg-primary-accent"
            >
              Upgrade plan
            </NuxtLink>
            <button
              @click="showLockedFeatureModal = false"
              class="w-full rounded-[0.39rem] border border-foreground/10 py-3 text-sm font-bold text-foreground/70 transition hover:border-foreground/20 hover:text-foreground"
            >
              {{
                lockedFeatureReason === "upgrade" ? "Maybe later" : "Understood"
              }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </aside>
</template>

<style scoped>
.sidebar-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(212, 175, 55, 0.22) transparent;
}

.sidebar-scroll::-webkit-scrollbar {
  width: 8px;
}

.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-scroll::-webkit-scrollbar-thumb {
  background: rgba(212, 175, 55, 0.18);
  border-radius: 9999px;
}

.sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(212, 175, 55, 0.3);
}
</style>
