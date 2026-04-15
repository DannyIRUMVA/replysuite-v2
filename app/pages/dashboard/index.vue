<script setup lang="ts">
import { 
  Instagram, 
  MessageSquare, 
  Zap, 
  Target,
  ShieldAlert,
  Bot,
  Plus
} from 'lucide-vue-next'
import Skeleton from '~~/app/components/Skeleton.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { user, profile, isVerified, isLoading, userId } = useAuth()
const supabase = useSupabaseClient()
const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

// Async stats fetching with a fresh key to bypass any stale serialization cache
const { data: realStats, pending: statsLoading } = useAsyncData('dashboard-metrics-v2', async () => {
  if (!userId.value) return []
  
  const [messagesCount, activeRules, accountsCount] = await Promise.all([
    supabase.from('instagram_message_jobs').select('*', { count: 'exact', head: true }),
    supabase.from('instagram_comment_triggers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('instagram_accounts').select('*', { count: 'exact', head: true }).eq('user_id', userId.value)
  ])

  return [
    { id: 'messages', name: 'Total Messages', value: (messagesCount.count || 0).toString(), change: '+12%', changeType: 'increase' },
    { id: 'leads', name: 'Leads Captured', value: '0', change: '0%', changeType: 'neutral' },
    { id: 'rules', name: 'Active Rules', value: (activeRules.count || 0).toString(), change: '+2', changeType: 'increase' },
    { id: 'accounts', name: 'Connected Accounts', value: (accountsCount.count || 0).toString(), change: '0', changeType: 'neutral' },
  ]
}, { watch: [userId] })

// Helper to get icons without putting them in reactive objects
const getIcon = (id: string) => {
  switch (id) {
    case 'messages': return MessageSquare
    case 'leads': return Target
    case 'rules': return Zap
    case 'accounts': return Instagram
    default: return MessageSquare
  }
}

const stats = computed(() => {
  if (realStats.value && realStats.value.length > 0) return realStats.value
  return [
    { id: 'messages', name: 'Total Messages', value: '0', change: '0%', changeType: 'neutral' },
    { id: 'leads', name: 'Leads Captured', value: '0', change: '0%', changeType: 'neutral' },
    { id: 'rules', name: 'Active Rules', value: '0', change: '0', changeType: 'neutral' },
    { id: 'accounts', name: 'Connected Accounts', value: '0', change: '0', changeType: 'neutral' },
  ]
})

// Unified loading state
const loading = computed(() => isMounted.value ? (isLoading.value || statsLoading.value) : false)
</script>

<template>
  <div>
    <!-- Stats Grid (Loading or Locked if not verified) -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      <div v-for="i in 4" :key="i" class="glass-card p-8 border-white/5 bg-[#0a0a0a]">
        <div class="flex items-center justify-between mb-6">
          <Skeleton width="48px" height="48px" rounded="12px" />
          <Skeleton width="40px" height="14px" />
        </div>
        <Skeleton width="100px" height="12px" class="mb-3" />
        <Skeleton width="140px" height="32px" />
      </div>
    </div>

    <div v-else :class="{ 'opacity-20 pointer-events-none grayscale select-none': !isVerified }" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 transition-all duration-700">
      <div v-for="stat in stats" :key="stat.name" class="glass-card p-8 border-white/5 bg-[#0a0a0a] group hover:border-primary/30 transition-all relative overflow-hidden">
        <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all"></div>
        <div class="flex items-center justify-between mb-4">
          <div class="p-3 rounded-xl bg-white/5 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
            <component :is="getIcon(stat.id)" class="w-6 h-6" />
          </div>
          <span :class="stat.changeType === 'increase' ? 'text-green-500' : 'text-gray-500'" class="text-xs font-bold tracking-widest">{{ stat.change }}</span>
        </div>
        <p class="text-gray-500 text-xs mb-1 tracking-widest font-bold leading-none capitalize">{{ stat.name }}</p>
        <p class="text-3xl font-black mt-2 tracking-tighter">{{ stat.value }}</p>
      </div>
    </div>

    <!-- Feature Teasers for unverified (Secondary call to action) -->
     <div v-if="!isVerified && !loading" class="grid grid-cols-1 lg:grid-cols-2 gap-8 relative mt-20">
        <div class="absolute inset-x-0 -top-12 z-10 flex items-center justify-center">
           <div class="px-6 py-2 rounded-full bg-[#0a0a0a] border border-primary/30 text-[10px] font-bold text-primary tracking-[0.2em] shadow-2xl shadow-primary/20">
              unlock elite features
           </div>
        </div>
        <div class="glass-card p-12 border-white/5 opacity-10 flex flex-col items-center text-center">
           <Instagram class="w-20 h-20 text-gray-600 mb-8" />
           <h3 class="text-2xl font-black mb-4 tracking-widest">instagram elite</h3>
           <p class="text-gray-600 font-medium">Automate comments, DMs, and story mentions with AI.</p>
        </div>
        <div class="glass-card p-12 border-white/5 opacity-10 flex flex-col items-center text-center">
           <MessageSquare class="w-20 h-20 text-gray-600 mb-8" />
           <h3 class="text-2xl font-black mb-4 tracking-widest">kinyarwanda ai</h3>
           <p class="text-gray-600 font-medium">Build specialized AI agents that understand your local customers.</p>
        </div>
     </div>

     <!-- Main content area (Empty states or Skeletons) -->
     <div v-if="loading" class="grid lg:grid-cols-3 gap-10">
        <div class="lg:col-span-2 glass-card p-10 min-h-[400px]">
           <div class="flex flex-col items-center justify-center h-full space-y-8">
              <Skeleton width="6rem" height="6rem" circle />
              <div class="space-y-4 flex flex-col items-center w-full">
                <Skeleton width="40%" height="2rem" />
                <Skeleton width="60%" height="1rem" />
                <Skeleton width="8rem" height="3rem" radius="1rem" />
              </div>
           </div>
        </div>
        <div class="glass-card p-10 flex flex-col">
           <Skeleton width="40%" height="1.5rem" class="mb-8" />
           <div class="space-y-6">
              <div v-for="i in 5" :key="i" class="flex items-center gap-4">
                 <Skeleton width="2.5rem" height="2.5rem" circle />
                 <div class="flex-1 space-y-2">
                    <Skeleton width="70%" height="0.75rem" />
                    <Skeleton width="40%" height="0.5rem" />
                 </div>
              </div>
           </div>
        </div>
     </div>

     <div v-else-if="isVerified" class="grid lg:grid-cols-3 gap-10">
        <div class="lg:col-span-2 glass-card p-10 min-h-[400px] border-white/5 flex flex-col items-center justify-center text-center">
           <div class="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8">
              <Instagram class="w-12 h-12 text-primary opacity-30" />
           </div>
           <h2 class="text-3xl font-black mb-4 tracking-tighter">No accounts connected</h2>
           <p class="text-gray-500 max-w-sm font-medium mb-10">Connect your first Instagram account to start the gold standard of automation.</p>
           <button class="btn-gradient px-8 py-4 font-black tracking-widest text-sm">connect instagram</button>
        </div>
        
        <div class="glass-card p-10 border-white/5 text-center flex flex-col justify-center">
           <h3 class="text-lg font-bold mb-6 tracking-tight">recent activity</h3>
           <p class="text-gray-600">No activity yet. Let's get started!</p>
        </div>
     </div>
  </div>
</template>

<style scoped>
/* Scoped styles for the dashboard content */
</style>
