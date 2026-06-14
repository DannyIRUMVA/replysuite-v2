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
  HelpCircle,
  Instagram
} from 'lucide-vue-next'

const { openFeedback } = useFeedback()
const { user, membership, isLoading } = useAuth()
const { canUseWhatsApp, canUseInstagramWorkflow } = usePlanAccess()
const route = useRoute()
const supabase = useSupabaseClient()

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
  HelpCircle,
  Instagram
}


const showLockedFeatureModal = ref(false)
const lockedFeatureName = ref('')
const lockedFeatureReason = ref<'upgrade' | 'coming-soon'>('coming-soon')
const isMembershipCardVisible = ref(true)
const isMembershipCardReady = ref(false)

const membershipCardStorageKey = computed(() => `replysuite:membership-card-dismissed:${user.value?.id || 'anonymous'}`)

const syncMembershipCardVisibility = () => {
  if (!import.meta.client) return
  if (!user.value?.id) {
    isMembershipCardVisible.value = true
    isMembershipCardReady.value = true
    return
  }

  isMembershipCardVisible.value = sessionStorage.getItem(membershipCardStorageKey.value) !== 'true'
  isMembershipCardReady.value = true
}

const dismissMembershipCard = () => {
  isMembershipCardVisible.value = false
  if (import.meta.client && user.value?.id) {
    sessionStorage.setItem(membershipCardStorageKey.value, 'true')
  }
}

onMounted(syncMembershipCardVisibility)
watch(() => user.value?.id, syncMembershipCardVisibility)

const daysLeft = computed(() => {
  if (!membership.value?.ends_at) return 0
  const end = new Date(membership.value.ends_at)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

const sections = computed(() => [
  {
    title: 'Main',
    links: [
      { name: 'Overview', href: '/dashboard', icon: 'LayoutDashboard' },
      { name: 'Analytics', href: '/dashboard/analytics', icon: 'TrendingUp' },
    ]
  },
  {
    title: 'Channels',
    links: [
      { name: 'Website', href: '/dashboard/integrations/website', icon: 'Code2' },
      { name: 'WhatsApp', href: '/dashboard/integrations/whatsapp', icon: 'MessageCircle', locked: !canUseWhatsApp.value },
      { name: 'Instagram', href: '/dashboard/integrations/instagram', icon: 'Instagram', locked: !canUseInstagramWorkflow.value },
    ]
  },
  {
    title: 'AI Agents',
    links: [
      { name: 'My Assistant', href: '/dashboard/agents', icon: 'MessageSquare' },
      { name: 'Tools & Skills', href: '/dashboard/agents/skills', icon: 'Database' },
      { name: 'Conversations', href: '/dashboard/conversations', icon: 'MessageCircle' },
    ]
  },
  {
    title: 'Account',
    links: [
      { name: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
    ]
  },
  {
    title: 'Support',
    links: [
      { name: 'Share Feedback', action: () => openFeedback('Dashboard Sidebar'), icon: 'HelpCircle' },
    ]
  }
])

const openLockedFeatureModal = (link: any) => {
  lockedFeatureName.value = link.name || 'This feature'
  lockedFeatureReason.value = ['WhatsApp', 'Instagram'].includes(link.name)
    ? 'upgrade'
    : 'coming-soon'
  showLockedFeatureModal.value = true
}

const handleLogout = async () => {
  if (import.meta.client && user.value?.id) {
    sessionStorage.removeItem(membershipCardStorageKey.value)
  }
  await supabase.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <aside class="dashboard-sidebar hidden md:flex md:w-[15.5rem] xl:w-[17.5rem] h-screen max-h-screen border-r border-foreground/5 bg-background-accent dark:bg-[#050505] flex-col px-3 py-4 xl:px-4 xl:py-5 overflow-hidden shrink-0 relative">
    <!-- Brand -->
    <div class="flex items-center gap-2.5 mb-5 xl:mb-6 px-2 shrink-0">
      <div class="w-9 h-9 bg-gradient-to-tr from-primary to-primary-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
        <Zap class="text-black w-5 h-5 fill-current" />
      </div>
      <span class="text-lg font-bold">ReplySuite</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 space-y-5 sidebar-scroll">
      <div v-for="section in sections" :key="section.title" class="space-y-2">
        <h5 class="px-3 text-[9px] font-bold tracking-[0.18em] text-foreground/50 uppercase">{{ section.title }}</h5>
        <div class="space-y-0.5">
          <template v-for="link in section.links" :key="link.name">
            <!-- Normal Link -->
            <NuxtLink 
              v-if="link.href && !link.locked"
              :to="link.href"
              class="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all group"
              :class="[
                route.path === link.href 
                  ? 'bg-primary/10 text-primary font-bold shadow-[0_0_20px_rgba(var(--primary),0.05)]' 
                  : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5'
              ]"
            >
              <component :is="iconMap[link.icon]" class="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span class="flex-1 text-sm capitalize">{{ link.name }}</span>
              <ChevronRight v-if="route.path === link.href" class="w-3 h-3" />
            </NuxtLink>

            <!-- Action Button -->
            <button 
              v-else-if="link.action"
              @click="link.action()"
              class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-foreground/50 hover:text-foreground hover:bg-foreground/5 group cursor-pointer"
            >
              <component :is="iconMap[link.icon]" class="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span class="flex-1 text-sm text-left capitalize">{{ link.name }}</span>
            </button>

            <!-- Locked Link -->
            <button 
              v-else
              @click="openLockedFeatureModal(link)"
              class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-foreground/50 hover:text-foreground/80 group cursor-pointer"
            >
              <component :is="iconMap[link.icon]" class="w-4 h-4 grayscale opacity-50 group-hover:opacity-100 transition-all" />
              <span class="flex-1 text-sm text-left">{{ link.name }}</span>
              <Lock class="w-3 h-3 opacity-50 group-hover:opacity-100 transition-all" />
            </button>
          </template>
        </div>
      </div>
    </nav>

    <!-- Subscription Card (Skeleton while loading) -->
    <div v-if="isMembershipCardReady && isLoading && isMembershipCardVisible" class="mt-4 mb-3 shrink-0">
      <div class="glass-card !rounded-lg p-3 border border-foreground/5 bg-foreground/[0.02]">
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
    <div v-else-if="isMembershipCardReady && membership && isMembershipCardVisible" class="mt-4 mb-3 shrink-0">
      <div class="glass-card !rounded-lg p-3 border border-primary/15 bg-gradient-to-b from-primary/5 to-transparent relative overflow-hidden group">
        <div class="absolute -right-8 -bottom-8 w-20 h-20 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"></div>
        
        <div class="relative z-10">
          <div class="flex items-center justify-between gap-2 mb-2">
             <span class="text-[9px] font-bold tracking-[0.16em] text-primary uppercase">Plan</span>
             <button
               type="button"
               class="rounded-md p-1 text-foreground/40 hover:bg-foreground/5 hover:text-foreground transition-colors"
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
              <p class="text-[10px] text-foreground/50 lowercase">
                {{ daysLeft }} days left
              </p>
            </div>
          </div>

          <NuxtLink to="/dashboard/pricing" class="block w-full py-2 bg-primary text-black text-[10px] font-bold rounded-lg text-center hover:bg-primary-accent transition-colors shadow-lg shadow-primary/10 uppercase">
            Select Plan
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- User Menu -->
    <div class="pt-3 border-t border-foreground/5 mt-auto shrink-0">
      <button @click="handleLogout" class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-400/10 transition-all border border-transparent hover:border-red-400/20 text-sm font-medium">
        <LogOut class="w-4 h-4" />
        Logout
      </button>
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
      <div v-if="showLockedFeatureModal" class="fixed inset-0 z-[200] flex items-center justify-center p-6">
        <div class="absolute inset-0 bg-background/80 backdrop-blur-md" @click="showLockedFeatureModal = false"></div>
        <div class="relative w-full max-w-sm bg-background border border-foreground/10 rounded-[24px] p-10 shadow-2xl text-center">
            <button @click="showLockedFeatureModal = false" class="absolute top-6 right-6 p-2 text-foreground/50 hover:text-foreground transition-colors">
                <X class="w-5 h-5" />
            </button>
            <div class="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-primary/20">
                <Lock class="w-10 h-10 text-primary" />
            </div>
            <h3 class="text-2xl font-bold text-foreground mb-4">
              {{ lockedFeatureReason === 'upgrade' ? `Upgrade to unlock ${lockedFeatureName}` : 'Coming Soon' }}
            </h3>
            <p class="text-foreground/50 text-sm leading-relaxed mb-8">
              {{ lockedFeatureReason === 'upgrade'
                ? (lockedFeatureName === 'Instagram'
                  ? 'Instagram workflows are available on Gold and Enterprise plans. Upgrade to automate comment replies and comment-to-DM flows.'
                  : 'WhatsApp chatbots are available on Silver, Gold, and Enterprise plans. Upgrade to connect your business number.')
                : `We're currently perfecting ${lockedFeatureName} to ensure it meets our elite performance standards. Stay tuned!` }}
            </p>
            <div class="space-y-3">
              <NuxtLink
                v-if="lockedFeatureReason === 'upgrade'"
                to="/dashboard/pricing"
                @click="showLockedFeatureModal = false"
                class="block w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary-accent transition-all shadow-lg shadow-primary/10"
              >
                Upgrade Plan
              </NuxtLink>
              <button 
                  @click="showLockedFeatureModal = false"
                  class="w-full py-4 border border-foreground/10 text-foreground/70 font-bold rounded-xl hover:border-foreground/20 hover:text-foreground transition-all"
              >
                  {{ lockedFeatureReason === 'upgrade' ? 'Maybe later' : 'Understood' }}
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
