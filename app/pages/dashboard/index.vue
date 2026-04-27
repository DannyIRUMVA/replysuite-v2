<script setup lang="ts">
import { 
  MessageSquare, 
  Zap, 
  Target,
  ShieldAlert,
  Bot,
  Plus,
  TrendingUp,
  Activity,
  ChevronRight,
  BarChart3
} from 'lucide-vue-next'
import Skeleton from '~~/app/components/Skeleton.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

useHead({
  title: 'Dashboard'
})

const { user, profile, isVerified, isLoading, userId } = useAuth()
const supabase = useSupabaseClient()
const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

const sparkData = [45, 70, 55, 90, 65, 80, 50, 95, 75, 60, 85, 40]

// Async stats fetching with real data from multiple tables
const { data: realStats, pending: statsLoading } = useAsyncData('dashboard-metrics-v4', async () => {
  if (!userId.value) return []
  
  // Get user's chatbot IDs first for scoped queries
  const { data: bots } = await supabase.from('chatbots').select('id').eq('user_id', userId.value).is('deleted_at', null)
  const botIds = (bots || []).map((b: any) => b.id)

  const [sessionsRes, agentsRes, whatsappRes] = await Promise.all([
    botIds.length > 0
      ? supabase.from('chat_sessions').select('*', { count: 'exact', head: true }).in('chatbot_id', botIds)
      : Promise.resolve({ count: 0 }),
    supabase.from('chatbots').select('*', { count: 'exact', head: true }).eq('user_id', userId.value).is('deleted_at', null),
    supabase.from('whatsapp_accounts').select('*', { count: 'exact', head: true }).eq('user_id', userId.value),
  ])

  const totalChannels = whatsappRes.count || 0

  return [
    { id: 'messages', name: 'Total Conversations', value: (sessionsRes.count || 0).toLocaleString(), change: 'Live', changeType: 'increase' },
    { id: 'leads', name: 'Connected Channels', value: totalChannels.toString(), change: `${whatsappRes.count || 0} WA`, changeType: totalChannels > 0 ? 'increase' : 'neutral' },
    { id: 'agents', name: 'Forged Agents', value: (agentsRes.count || 0).toString(), change: `${botIds.length} Active`, changeType: botIds.length > 0 ? 'increase' : 'neutral' },
    { id: 'activity', name: 'System Status', value: 'Optimal', change: '100%', changeType: 'neutral' },
  ]
}, { watch: [userId] })

// Fetch Recent Sessions
const { data: recentSessions, pending: sessionsLoading } = useAsyncData('dashboard-sessions', async () => {
  if (!userId.value) return []
  const { data: bots } = await supabase.from('chatbots').select('id, name').eq('user_id', userId.value).is('deleted_at', null)
  const botIds = (bots || []).map((b: any) => b.id)
  
  if (botIds.length === 0) return []

  const { data } = await supabase
    .from('chat_sessions')
    .select('*, chatbots(name)')
    .in('chatbot_id', botIds)
    .order('created_at', { ascending: false })
    .limit(10)
  
  return data || []
}, { watch: [userId] })

// Fetch Recent Activity
const { data: activities, pending: activitiesLoading } = useAsyncData('dashboard-activity', async () => {
  if (!userId.value) return []
  const { data } = await supabase
    .from('user_activity')
    .select('*')
    .eq('user_id', userId.value)
    .order('created_at', { ascending: false })
    .limit(10)
  
  return data || []
}, { watch: [userId] })

// Helper to get icons without putting them in reactive objects
const getIcon = (id: string) => {
  switch (id) {
    case 'messages': return MessageSquare
    case 'leads': return Target
    case 'agents': return Bot
    case 'activity': return Activity
    default: return MessageSquare
  }
}

const stats = computed(() => {
  if (realStats.value && realStats.value.length > 0) return realStats.value
  return [
    { id: 'messages', name: 'Total Conversations', value: '0', change: '0%', changeType: 'neutral' },
    { id: 'leads', name: 'Connected Channels', value: '0', change: '0%', changeType: 'neutral' },
    { id: 'agents', name: 'Forged Agents', value: '0', change: '0', changeType: 'neutral' },
    { id: 'activity', name: 'System Status', value: 'Idle', change: '0', changeType: 'neutral' },
  ]
})

// Local timeAgo helper
const timeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + ' years ago'
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + ' months ago'
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + ' days ago'
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + ' hours ago'
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + ' minutes ago'
  return Math.floor(seconds) + ' seconds ago'
}

// Unified loading state
const loading = computed(() => !isMounted.value || isLoading.value || statsLoading.value || sessionsLoading.value || activitiesLoading.value)
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div class="max-w-xl">
        <h2 class="text-xl font-bold tracking-tight text-foreground mb-2 italic-none uppercase">Conversations Analytics</h2>
        <p class="text-foreground/50 text-sm italic-none">Your comprehensive intelligence overlook across all digital channels.</p>
    </div>

    <!-- Stats Grid (Loading or Locked if not verified) -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      <div v-for="i in 4" :key="i" class="glass-card p-8 border-foreground/5 bg-foreground/[0.02]">
        <div class="flex items-center justify-between mb-6">
          <Skeleton width="48px" height="48px" rounded="12px" />
          <Skeleton width="40px" height="14px" />
        </div>
        <Skeleton width="100px" height="12px" class="mb-3" />
        <Skeleton width="140px" height="32px" />
      </div>
    </div>

    <div v-else :class="{ 'opacity-20 pointer-events-none grayscale select-none': !isVerified }" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 transition-all duration-700">
      <div v-for="stat in stats" :key="stat.name" class="glass-card p-8 border-foreground/5 bg-foreground/[0.02] group hover:border-primary/30 transition-all relative overflow-hidden">
        <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all"></div>
        <div class="flex items-center justify-between mb-4">
          <div class="p-3 rounded-xl bg-foreground/5 text-foreground/40 group-hover:bg-primary/10 group-hover:text-primary transition-all">
            <component :is="getIcon(stat.id)" class="w-6 h-6" />
          </div>
          <span :class="stat.changeType === 'increase' ? 'text-green-500' : 'text-foreground/50'" class="text-xs font-bold tracking-widest">{{ stat.change }}</span>
        </div>
        <p class="text-foreground/50 text-xs mb-1 tracking-widest font-bold leading-none capitalize">{{ stat.name }}</p>
        <p class="text-3xl font-bold mt-2 tracking-tighter">{{ stat.value }}</p>
      </div>
    </div>

    <!-- Feature Teasers for unverified (Secondary call to action) -->
     <div v-if="!isVerified && !loading" class="grid grid-cols-1 lg:grid-cols-2 gap-8 relative mt-20">
        <div class="absolute inset-x-0 -top-12 z-10 flex items-center justify-center">
           <div class="px-6 py-2 rounded-full bg-background border border-primary/30 text-[10px] font-bold text-primary tracking-[0.2em] shadow-2xl shadow-primary/20 uppercase">
              Unlock Elite Features
           </div>
        </div>
        <div class="glass-card p-12 border-foreground/5 opacity-10 flex flex-col items-center text-center">
           <Bot class="w-20 h-20 text-foreground/40 mb-8" />
           <h3 class="text-2xl font-bold mb-4 tracking-widest uppercase">Autonomous Agents</h3>
           <p class="text-foreground/50 font-medium">Scale your conversations with high-performance AI engines.</p>
        </div>
        <div class="glass-card p-12 border-foreground/5 opacity-10 flex flex-col items-center text-center">
           <Target class="w-20 h-20 text-foreground/50 mb-8" />
           <h3 class="text-2xl font-bold mb-4 tracking-widest uppercase">Lead Intelligence</h3>
           <p class="text-foreground/50 font-medium">Identify and nurture high-value prospects automatically.</p>
        </div>
     </div>

     <!-- Global Monitoring Status -->
     <div v-if="isVerified" class="mb-8 p-4 rounded-2xl bg-foreground/[0.02] border border-foreground/5 flex items-center justify-between">
        <div class="flex items-center gap-4">
           <div class="flex -space-x-2">
              <div v-for="flag in ['🇮🇳', '🇧🇷', '🇮🇩', '🇪🇺', '🇷🇼']" :key="flag" class="w-6 h-6 rounded-full bg-foreground/5 border border-foreground/10 flex items-center justify-center text-xs shadow-xl">
                 {{ flag }}
              </div>
           </div>
           <div class="text-[10px] font-bold text-foreground/50 uppercase tracking-widest">
              Global Edge Presence: <span class="text-foreground">Active</span>
           </div>
        </div>
        <div class="flex items-center gap-2">
           <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
           <span class="text-[9px] font-black text-foreground/50 uppercase tracking-tighter">EU AI Act Compliant</span>
        </div>
     </div>

     <!-- Main content area -->
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
        <div class="lg:col-span-2 glass-card p-10 min-h-[400px] border-foreground/5 flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <!-- Background Glow -->
            <div class="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700"></div>
            
            <div class="relative flex flex-col items-center">
                <div class="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-8 shadow-2xl shadow-primary/5">
                    <MessageSquare class="w-10 h-10 text-primary" />
                </div>
                
                <h3 class="text-2xl font-black tracking-tighter text-foreground uppercase mb-2">Conversations Hub</h3>
                <p class="text-foreground/50 font-bold uppercase tracking-[0.2em] text-[10px] mb-8 max-w-[200px] leading-relaxed">
                    Real-time monitoring and management of all active AI sessions
                </p>

                <div class="flex items-center gap-12 mb-10">
                    <div class="flex flex-col">
                        <span class="text-3xl font-black tracking-tighter text-foreground">{{ stats.find(s => s.id === 'messages')?.value || '0' }}</span>
                        <span class="text-[9px] font-black text-foreground/50 uppercase tracking-widest">Total Threads</span>
                    </div>
                    <div class="w-px h-10 bg-foreground/5"></div>
                    <div class="flex flex-col">
                        <span class="text-3xl font-black tracking-tighter text-primary">{{ recentSessions?.length || 0 }}</span>
                        <span class="text-[9px] font-black text-foreground/50 uppercase tracking-widest">Recent Activity</span>
                    </div>
                </div>

                <NuxtLink to="/dashboard/conversations" class="group/btn relative px-10 py-4 rounded-xl bg-primary text-black font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-[0_0_50px_rgba(var(--primary),0.2)] flex items-center gap-3">
                    View more
                    <ChevronRight class="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </NuxtLink>
            </div>

            <!-- Cloudflare-Compatible CSS Bar Chart -->
            <div class="absolute bottom-0 left-0 right-0 h-24 flex items-end justify-around px-10 opacity-[0.03] pointer-events-none">
                <div v-for="(val, idx) in sparkData" :key="idx" 
                     class="w-full mx-1 bg-primary rounded-t-sm transition-all duration-1000"
                     :style="{ height: `${val}%` }">
                </div>
            </div>
        </div>
        
        <!-- Recent Activity Feed -->
        <div class="glass-card p-10 border-foreground/5 flex flex-col">
           <h3 class="text-lg font-bold mb-8 tracking-tight uppercase italic-none text-center">Protocol Logs</h3>
           
           <div v-if="activities && activities.length > 0" class="space-y-8 flex-1">
              <div v-for="activity in activities" :key="activity.id" class="flex gap-4 relative">
                 <div class="flex flex-col items-center">
                    <div class="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(212,175,55,0.5)]"></div>
                    <div class="w-px flex-1 bg-foreground/10 my-2"></div>
                 </div>
                 <div class="pb-2">
                    <p class="text-xs font-bold text-foreground leading-tight tracking-tight capitalize">{{ activity.type.replace('_', ' ') }}</p>
                    <p class="text-[9px] font-medium text-foreground/50 mt-1 uppercase tracking-widest">{{ timeAgo(new Date(activity.created_at)) }} • {{ activity.source || 'System' }}</p>
                 </div>
              </div>
           </div>

            <div v-else-if="activitiesLoading" class="flex-1 flex flex-col items-center justify-center py-12">
               <div class="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
            <div v-else class="flex-1 flex flex-col items-center justify-center text-center py-12">
               <Activity class="w-12 h-12 text-foreground/20 mb-4 opacity-20" />
               <p class="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Protocol Logs Empty</p>
               <p class="text-foreground/20 text-[9px] mt-2 tracking-tighter italic">System standby: awaiting events</p>
            </div>

           <button class="mt-8 py-3 w-full border border-foreground/5 rounded-xl text-[10px] font-bold text-foreground/50 tracking-[0.2em] uppercase hover:border-primary/30 hover:text-primary transition-all">
              View more
           </button>
        </div>
     </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply bg-foreground/[0.02] backdrop-blur-xl border border-foreground/5 p-8 rounded-[20px];
}
.italic-none {
  font-style: normal !important;
}
</style>
