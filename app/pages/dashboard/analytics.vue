<script setup lang="ts">
import { 
  BarChart3, 
  TrendingUp, 
  MessageSquare, 
  Zap,
  MousePointer2,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Settings2,
  Info
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const user = useSupabaseUser()
const supabase = useSupabaseClient()

// State
const isLoading = ref(true)
const stats = ref({
  total_activity: 0,
  integrations: 0,
  automation_runs: 0,
  engagement_rate: 0
})

const activityLogs = ref<any[]>([])

// Fetch Data
const fetchData = async () => {
  if (!user.value?.id) return
  
  isLoading.value = true
  try {
    // 1. Fetch Activity Count
    const { count: activityCount } = await supabase
      .from('user_activity')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.value.id)

    // 2. Fetch Integrations Count
    const { count: accountCount } = await supabase
      .from('instagram_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.value.id)

    // 3. Recent Logs
    const { data: logs } = await supabase
      .from('user_activity')
      .select('*')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })
      .limit(10)

    stats.value = {
      total_activity: activityCount || 0,
      integrations: accountCount || 0,
      automation_runs: 0, // Mocked for now until triggers table is populated
      engagement_rate: 8.4 // Mocked
    }

    if (logs) activityLogs.value = logs
  } catch (err) {
    console.error('Error fetching analytics:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchData()
})

const getTimeAgo = (date: string) => {
  const now = new Date()
  const past = new Date(date)
  const diff = Math.floor((now.getTime() - past.getTime()) / 1000)
  
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return past.toLocaleDateString()
}
</script>

<template>
  <div class="space-y-10 pb-24 lg:pb-0">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="max-w-xl">
        <h2 class="text-2xl font-bold tracking-tight text-white mb-2 italic-none">Platform Analytics</h2>
        <p class="text-gray-500 text-sm italic-none">Real-time performance metrics and engagement tracking.</p>
      </div>
      
      <div class="flex items-center gap-3">
        <div class="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
          <Calendar class="w-4 h-4 text-gray-500" />
          <span class="text-[11px] font-bold tracking-widest text-gray-300">LAST 30 DAYS</span>
        </div>
        <button class="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
          <Settings2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Activity -->
      <div class="glass-card p-6 border border-white/5 relative overflow-hidden group">
        <TrendingUp class="w-12 h-12 text-blue-500/10 absolute -top-2 -right-2 rotate-12 transition-transform group-hover:scale-125" />
        <div class="flex flex-col">
          <span class="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-4">Total Interactions</span>
          <div class="flex items-end gap-3">
            <span class="text-3xl font-black text-white italic-none">{{ stats.total_activity }}</span>
            <div class="flex items-center gap-1 text-green-500 pb-1.5">
              <ArrowUpRight class="w-3 h-3" />
              <span class="text-[10px] font-bold">+12%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Accounts -->
      <div class="glass-card p-6 border border-white/5 relative overflow-hidden group">
        <Users class="w-12 h-12 text-primary/10 absolute -top-2 -right-2 rotate-12 transition-transform group-hover:scale-125" />
        <div class="flex flex-col">
          <span class="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-4">Connected Accounts</span>
          <div class="flex items-end gap-3">
            <span class="text-3xl font-black text-white italic-none">{{ stats.integrations }}</span>
            <div class="flex items-center gap-1 text-primary pb-1.5">
              <span class="text-[10px] font-bold">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Automation -->
      <div class="glass-card p-6 border border-white/5 relative overflow-hidden group">
        <Zap class="w-12 h-12 text-yellow-500/10 absolute -top-2 -right-2 rotate-12 transition-transform group-hover:scale-125" />
        <div class="flex flex-col">
          <span class="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-4">Automation Runs</span>
          <div class="flex items-end gap-3">
            <span class="text-3xl font-black text-white italic-none">{{ stats.automation_runs }}</span>
            <div class="flex items-center gap-1 text-gray-600 pb-1.5">
              <span class="text-[10px] font-bold italic-none">STABLE</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Engagement -->
      <div class="glass-card p-6 border border-white/5 relative overflow-hidden group">
        <BarChart3 class="w-12 h-12 text-purple-500/10 absolute -top-2 -right-2 rotate-12 transition-transform group-hover:scale-125" />
        <div class="flex flex-col">
          <span class="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-4">Engagement Rate</span>
          <div class="flex items-end gap-3">
            <span class="text-3xl font-black text-white italic-none">{{ stats.engagement_rate }}%</span>
            <div class="flex items-center gap-1 text-red-500 pb-1.5">
              <ArrowDownRight class="w-3 h-3" />
              <span class="text-[10px] font-bold">-0.2%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts/Logs Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
      <!-- Live Traffic -->
      <div class="lg:col-span-2 glass-card p-8 border border-white/5 bg-white/[0.01]">
        <div class="flex items-center justify-between mb-10">
          <h3 class="text-lg font-bold text-white tracking-tight italic-none">Live Event Stream</h3>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span class="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Live monitoring</span>
          </div>
        </div>

        <div v-if="isLoading" class="flex justify-center py-20">
          <Loader2 class="w-8 h-8 text-primary animate-spin" />
        </div>

        <div v-else-if="activityLogs.length > 0" class="space-y-6">
          <div 
            v-for="log in activityLogs" 
            :key="log.id"
            class="flex items-center justify-between pb-6 border-b border-white/5 last:border-0 last:pb-0"
          >
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                <MousePointer2 v-if="log.type.includes('DASHBOARD')" class="w-4 h-4 text-blue-400" />
                <Zap v-else-if="log.type.includes('AUTOMA')" class="w-4 h-4 text-primary" />
                <Users v-else class="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p class="text-[11px] font-bold text-white tracking-tight">{{ log.type }}</p>
                <p class="text-[10px] text-gray-500 italic-none">{{ log.source || 'Direct Access' }}</p>
              </div>
            </div>
            <div class="text-right">
              <span class="text-[10px] font-bold text-gray-600">{{ getTimeAgo(log.created_at) }}</span>
            </div>
          </div>
        </div>

        <div v-else class="py-20 text-center">
          <p class="text-xs text-gray-600 italic-none">No activity recorded yet.</p>
        </div>
      </div>

      <!-- Quick Tips -->
      <div class="space-y-6">
        <div class="glass-card p-8 border border-primary/20 bg-primary/5 relative overflow-hidden group">
          <div class="relative z-10">
            <div class="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
              <Info class="w-5 h-5 text-primary" />
            </div>
            <h4 class="text-sm font-bold text-white mb-3 italic-none">Optimization Tip</h4>
            <p class="text-xs text-gray-400 leading-relaxed italic-none">
              Your engagement rate is higher on posts with "keyword" triggers. Consider adding more variation to your AI responses to maintain high DM deliverability.
            </p>
          </div>
        </div>

        <div class="glass-card p-8 border border-white/5 group">
          <h4 class="text-xs font-bold tracking-widest text-gray-600 uppercase mb-6">Device Breakdown</h4>
          <div class="space-y-4">
            <div class="space-y-2">
              <div class="flex justify-between text-[10px]">
                <span class="text-gray-400 font-bold">Desktop</span>
                <span class="text-white">64%</span>
              </div>
              <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-blue-500 rounded-full" style="width: 64%"></div>
              </div>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between text-[10px]">
                <span class="text-gray-400 font-bold">Mobile</span>
                <span class="text-white">32%</span>
              </div>
              <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-primary rounded-full" style="width: 32%"></div>
              </div>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between text-[10px]">
                <span class="text-gray-400 font-bold">Others</span>
                <span class="text-white">4%</span>
              </div>
              <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-gray-500 rounded-full" style="width: 4%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  background: rgba(255, 255, 255, 0.01);
  backdrop-filter: blur(10px);
  border-radius: 2rem;
}

.italic-none {
  font-style: normal !important;
}
</style>
