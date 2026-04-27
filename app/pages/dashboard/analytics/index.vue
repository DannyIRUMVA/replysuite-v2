<script setup lang="ts">
import {
  Activity,
  TrendingUp,
  Zap,
  Bot,
  MessageCircle,
  AlertCircle,
  RefreshCw,
  Phone,
  Globe,
  Database,
  CheckCircle2
} from 'lucide-vue-next'
import Skeleton from '~~/app/components/Skeleton.vue'
import CustomSelect from '~~/app/components/CustomSelect.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

useHead({
  title: 'Intelligence Analytics'
})

// ── Supabase client + auth ─────────────────────────────────
const supabase = useSupabaseClient()
const notify = useNotify()

// ── Chatbot filter ──────────────────────────────────────────
const selectedBotId = ref<string>('all')

const analytics = ref<any>(null)
const isLoading = ref(true)

const fetchAnalytics = async () => {
  isLoading.value = true
  try {
    const { data, error } = await supabase.functions.invoke('fetch-analytics', {
      method: 'GET',
      queryParams: selectedBotId.value !== 'all' ? { chatbotId: selectedBotId.value } : {}
    })

    if (error) throw error
    analytics.value = data
  } catch (err: any) {
    console.error('[Analytics Error]', err)
    notify.error('Failed to load analytics data. Please try again.')
    analytics.value = null
  } finally {
    isLoading.value = false
  }
}

// Re-fetch when bot filter changes
watch(selectedBotId, () => fetchAnalytics())
onMounted(() => fetchAnalytics())

const refresh = () => fetchAnalytics()


// Chatbot selector options
const botOptions = computed(() => {
  const bots = analytics.value?.chatbots || []
  return [
    { label: 'All Agents', value: 'all' },
    ...bots.map((b: any) => ({ label: b.name, value: b.id })),
  ]
})

// ── Chart ───────────────────────────────────────────────────
const chartData = computed(() => {
  if (!analytics.value?.timeline?.length) return []
  // Show last 14 days
  const rawData = analytics.value.timeline.slice(-14)
  const max = Math.max(...rawData.map((d: any) => d.count), 1)
  
  return rawData.map((d: any, i: number) => ({
    x: rawData.length > 1 ? (i / (rawData.length - 1)) * 100 : 50,
    y: 100 - (d.count / max) * 85, // 85 to leave room at top
    height: (d.count / max) * 100,
    count: d.count,
    date: d.date,
    active: false
  }))
})

// Spline calculation for a smooth line
const splinePath = computed(() => {
  if (chartData.value.length < 2) return ''
  const points = chartData.value
  let path = `M ${points[0].x} ${points[0].y}`
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2 === points.length ? i + 1 : i + 2]
    
    // Smooth control points
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return path
})

// ── Channel bars ─────────────────────────────────────────────
const channelBars = computed(() => {
  const c = analytics.value?.channels || { whatsapp: 0, web: 0 }
  const total = Math.max(c.whatsapp + c.web, 1)
  return [
    { label: 'WhatsApp', count: c.whatsapp, pct: Math.round((c.whatsapp / total) * 100), color: '#22c55e', icon: Phone },
    { label: 'Web Chat', count: c.web, pct: Math.round((c.web / total) * 100), color: '#3b82f6', icon: Globe },
  ]
})

// ── Stat cards ───────────────────────────────────────────────
const statCards = computed(() => {
  const s = analytics.value?.summary
  if (!s) return []
  return [
    {
      label: 'Total Conversations',
      value: s.totalSessions.toLocaleString(),
      sub: `${s.totalMessages.toLocaleString()} messages exchanged`,
      icon: MessageCircle,
      trend: 'Live',
      trendColor: '#22c55e',
    },
    {
      label: 'AI Responses',
      value: s.botMessages.toLocaleString(),
      sub: `${s.userMessages.toLocaleString()} from users`,
      icon: Bot,
      trend: 'AI Optimized',
      trendColor: '#D4AF37',
    },
    {
      label: 'Success Rate',
      value: `${s.successRate}%`,
      sub: `${s.failedJobs} failures / ${s.sentJobs} sent`,
      icon: CheckCircle2,
      trend: `${s.sentJobs} sent`,
      trendColor: '#22c55e',
    },
    {
      label: 'Active Automations',
      value: s.activeTriggers.toString(),
      sub: `${s.totalAgents} agents deployed`,
      icon: Zap,
      trend: `${s.totalAgents} agents`,
      trendColor: '#D4AF37',
    },
  ]
})

const chartTotal = computed(() => chartData.value.reduce((a: number, d: any) => a + d.count, 0))
const chartPeak = computed(() => chartData.value.length ? Math.max(...chartData.value.map((d: any) => d.count)) : 0)
const chartAvg = computed(() => chartData.value.length ? (chartTotal.value / chartData.value.length).toFixed(1) : '0.0')

const formatDate = (d: string) => {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}
</script>

<template>
  <div class="space-y-8 pb-24">

    <!-- Header + Filters -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold tracking-tight text-foreground uppercase">Intelligence Analytics</h2>
        <p class="text-foreground/50 text-sm mt-1">Real-time data across all your AI channels and agents.</p>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <!-- Chatbot selector -->
        <div class="w-52">
          <CustomSelect
            v-model="selectedBotId"
            :options="botOptions"
            placeholder="Filter by Agent"
          />
        </div>
        <!-- Refresh -->
        <button
          @click="refresh()"
          :disabled="isLoading"
          class="bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 rounded-xl px-5 py-3 flex items-center gap-2 transition-all group active:scale-95"
        >
          <RefreshCw :class="['w-4 h-4 text-primary transition-transform duration-700', isLoading ? 'animate-spin' : 'group-hover:rotate-180']" />
          <span class="text-[10px] font-bold text-foreground uppercase tracking-widest">Refresh</span>
        </button>
      </div>
    </div>

    <!-- LOADING -->
    <template v-if="isLoading && !analytics">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div v-for="i in 4" :key="i" class="bg-foreground/5 border border-foreground/10 p-7 rounded-[2rem]">
          <Skeleton width="48px" height="48px" rounded="14px" class="mb-5" />
          <Skeleton width="100px" height="10px" class="mb-3" />
          <Skeleton width="130px" height="30px" />
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-foreground/5 border border-foreground/10 rounded-[2.5rem] p-10 min-h-[320px]">
          <Skeleton width="40%" height="2rem" class="mb-2" />
          <Skeleton width="60%" height="1rem" class="mb-10" />
          <Skeleton width="100%" height="12rem" rounded="1rem" />
        </div>
        <div class="bg-foreground/5 border border-foreground/10 rounded-[2.5rem] p-10">
          <Skeleton width="50%" height="2rem" class="mb-8" />
          <div class="space-y-5">
            <div v-for="i in 3" :key="i" class="flex gap-4 items-center">
              <Skeleton width="2.5rem" height="2.5rem" rounded="1rem" />
              <div class="flex-1 space-y-2">
                <Skeleton width="50%" height="0.75rem" />
                <Skeleton width="100%" height="0.4rem" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- DATA -->
    <template v-else-if="analytics">

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div
          v-for="card in statCards"
          :key="card.label"
          class="bg-foreground/[0.02] border border-foreground/5 rounded-[2rem] p-7 space-y-4 hover:border-foreground/10 transition-all group relative overflow-hidden"
        >
          <div class="absolute -top-10 -right-10 w-28 h-28 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
          <div class="flex items-center justify-between relative">
            <div class="bg-foreground/5 p-3 rounded-2xl border border-foreground/5">
              <component :is="card.icon" class="w-5 h-5 text-primary" />
            </div>
            <span class="text-[9px] font-black uppercase tracking-widest flex items-center gap-1" :style="{ color: card.trendColor }">
              <TrendingUp class="w-3 h-3" />{{ card.trend }}
            </span>
          </div>
          <div class="relative">
            <p class="text-[9px] font-black text-foreground/50 uppercase tracking-[0.2em] mb-1">{{ card.label }}</p>
            <h3 class="text-3xl font-black text-foreground tracking-tight tabular-nums">{{ card.value }}</h3>
            <p class="text-[10px] text-foreground/50 mt-1 font-medium">{{ card.sub }}</p>
          </div>
        </div>
      </div>

      <!-- Main Row: Chart + Right Panel -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Timeline Chart -->
        <div class="lg:col-span-2 bg-foreground/[0.02] border border-foreground/5 rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden flex flex-col">
          <div class="absolute top-8 right-8 flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span class="text-[9px] font-black text-foreground/50 uppercase tracking-widest">Active Monitoring</span>
          </div>
          <div>
            <h2 class="text-xl font-black text-foreground tracking-tight uppercase">AI Reply Activity</h2>
            <p class="text-[10px] font-bold text-foreground/50 uppercase tracking-widest mt-1">
              {{ selectedBotId === 'all' ? 'Aggregate Replies' : 'Selected Agent Activity' }} — Last 14 Days
            </p>
          </div>

          <!-- Modern Bar + Line Chart -->
          <div class="relative flex-1 min-h-[220px] w-full mt-4">
            <!-- Empty state -->
            <div v-if="chartData.every((d: any) => d.count === 0)" class="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Activity class="w-8 h-8 text-foreground/20" />
              <p class="text-[10px] text-foreground/50 uppercase tracking-widest font-black">No activity recorded yet</p>
            </div>

            <div v-else class="absolute inset-0 flex flex-col">
              <!-- Bars Layer -->
              <div class="flex-1 flex items-end justify-between gap-1 sm:gap-2 px-1">
                <div 
                  v-for="point in chartData" 
                  :key="point.date"
                  class="flex-1 group relative flex flex-col items-center"
                >
                  <!-- Tooltip -->
                  <div class="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 z-10 pointer-events-none">
                    <div class="bg-foreground text-background text-[10px] font-black px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl border border-foreground/10 uppercase tracking-tighter">
                      {{ point.count }} Replies
                      <div class="text-[8px] opacity-50">{{ point.date }}</div>
                    </div>
                    <div class="w-2 h-2 bg-foreground rotate-45 mx-auto -mt-1" />
                  </div>

                  <!-- Bar -->
                  <div 
                    class="w-full bg-foreground/5 rounded-t-lg group-hover:bg-primary/20 transition-all duration-500 relative overflow-hidden"
                    :style="{ height: `${point.height}%` }"
                  >
                    <!-- Highlight Fill -->
                    <div class="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>

              <!-- Line Layer (Overlay) -->
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="absolute inset-0 w-full h-full pointer-events-none overflow-visible pt-2">
                <path 
                  :d="splinePath" 
                  fill="none" 
                  stroke="var(--primary)" 
                  stroke-width="1.2" 
                  stroke-linecap="round" 
                  class="drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                />
              </svg>

              <!-- X-Axis Labels -->
              <div class="flex justify-between px-1 mt-6 border-t border-foreground/5 pt-4">
                <span
                  v-for="(point, i) in chartData"
                  :key="point.date"
                  v-show="i === 0 || i === chartData.length - 1 || i === Math.floor(chartData.length / 2)"
                  class="text-[8px] font-black text-foreground/40 uppercase tracking-widest"
                >
                  {{ formatDate(point.date) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Chart Footer -->
          <div class="grid grid-cols-3 gap-4 pt-6 border-t border-foreground/5">
            <div class="text-center">
              <p class="text-[9px] text-foreground/50 uppercase tracking-widest font-black mb-1">Peak Day</p>
              <p class="text-lg font-black text-foreground tabular-nums">{{ chartPeak }}</p>
            </div>
            <div class="text-center border-x border-foreground/5">
              <p class="text-[9px] text-foreground/50 uppercase tracking-widest font-black mb-1">Total (14d)</p>
              <p class="text-lg font-black text-foreground tabular-nums">{{ chartTotal }}</p>
            </div>
            <div class="text-center">
              <p class="text-[9px] text-foreground/50 uppercase tracking-widest font-black mb-1">Daily Avg</p>
              <p class="text-lg font-black text-foreground tabular-nums">{{ chartAvg }}</p>
            </div>
          </div>
        </div>

        <!-- Right: Channel Breakdown + Top Agents -->
        <div class="space-y-5">

          <!-- Channel Breakdown -->
          <div class="bg-foreground/[0.02] border border-foreground/5 rounded-[2rem] p-7 space-y-5">
            <div>
              <h3 class="text-sm font-black text-foreground uppercase tracking-tight">Channel Breakdown</h3>
              <p class="text-[9px] text-foreground/50 uppercase tracking-widest mt-0.5">Sessions by source</p>
            </div>
            <div class="space-y-4">
              <div v-for="ch in channelBars" :key="ch.label" class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <component :is="ch.icon" class="w-3.5 h-3.5" :style="{ color: ch.color }" />
                    <span class="text-[10px] font-black text-foreground uppercase tracking-wider">{{ ch.label }}</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-[11px] font-black text-foreground tabular-nums">{{ ch.count }}</span>
                    <span class="text-[9px] font-bold text-foreground/50">{{ ch.pct }}%</span>
                  </div>
                </div>
                <div class="w-full h-1.5 bg-foreground/5 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-transparent"
                    :style="{ width: `${ch.pct || 0}%`, backgroundColor: ch.color }"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Top Agents -->
          <div class="bg-foreground/[0.02] border border-foreground/5 rounded-[2rem] p-7 space-y-5">
            <div>
              <h3 class="text-sm font-black text-foreground uppercase tracking-tight">Top Performance</h3>
              <p class="text-[9px] text-foreground/50 uppercase tracking-widest mt-0.5">Agents by output volume</p>
            </div>
            <div v-if="!analytics.topAgents?.length" class="flex flex-col items-center py-6 text-foreground/30">
              <Bot class="w-7 h-7 opacity-20 mb-2" />
              <p class="text-[9px] uppercase tracking-widest font-black">No agent data yet</p>
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="(agent, idx) in analytics.topAgents"
                :key="agent.id"
                class="flex items-center gap-3 p-4 rounded-2xl bg-foreground/[0.01] border border-foreground/[0.03] hover:border-primary/20 transition-all group cursor-default"
              >
                <div class="w-8 h-8 rounded-xl bg-foreground/5 flex items-center justify-center text-[10px] font-black text-foreground/40 group-hover:bg-primary/10 group-hover:text-primary transition-all shrink-0">
                  {{ idx + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex justify-between items-center mb-1.5">
                    <p class="text-[10px] font-black text-foreground uppercase truncate">{{ agent.name }}</p>
                    <span class="text-[10px] font-black text-foreground tabular-nums">{{ agent.count }}</span>
                  </div>
                  <div class="w-full h-1 bg-foreground/5 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-gradient-to-r from-primary/50 to-primary rounded-full transition-all duration-1000"
                      :style="{ width: analytics.topAgents[0]?.count > 0 ? `${(agent.count / analytics.topAgents[0].count) * 100}%` : '0%' }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Stats Row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-foreground/[0.02] border border-foreground/5 rounded-[2rem] p-6 text-center hover:border-foreground/10 transition-all">
          <Database class="w-5 h-5 text-primary mx-auto mb-3" />
          <p class="text-2xl font-black text-foreground tabular-nums">{{ analytics.summary.totalDataSources }}</p>
          <p class="text-[9px] text-foreground/50 uppercase tracking-widest mt-1 font-black">Data Sources</p>
        </div>

        <div class="bg-foreground/[0.02] border border-foreground/5 rounded-[2rem] p-6 text-center hover:border-foreground/10 transition-all">
          <Phone class="w-5 h-5 text-green-500 mx-auto mb-3" />
          <p class="text-2xl font-black text-foreground tabular-nums">{{ analytics.summary.totalWhatsappAccounts }}</p>
          <p class="text-[9px] text-foreground/50 uppercase tracking-widest mt-1 font-black">WhatsApp Lines</p>
        </div>
        <div class="bg-foreground/[0.02] border border-foreground/5 rounded-[2rem] p-6 text-center hover:border-foreground/10 transition-all">
          <Zap class="w-5 h-5 text-yellow-400 mx-auto mb-3" />
          <p class="text-2xl font-black text-foreground tabular-nums">{{ analytics.summary.activeTriggers }}</p>
          <p class="text-[9px] text-foreground/50 uppercase tracking-widest mt-1 font-black">Active Rules</p>
        </div>
      </div>

    </template>

    <!-- Error State -->
    <div v-else class="text-center py-36 bg-foreground/[0.02] rounded-[3rem] border border-dashed border-foreground/10">
      <div class="bg-red-500/10 text-red-500 w-16 h-16 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
        <AlertCircle class="w-8 h-8" />
      </div>
      <h2 class="text-xl font-black text-foreground tracking-tight uppercase">Failed to Load Analytics</h2>
      <p class="text-foreground/50 text-xs font-bold tracking-widest uppercase mt-2">Unable to retrieve your intelligence data.</p>
      <button @click="refresh()" class="mt-6 bg-primary text-black text-[10px] font-black uppercase tracking-[0.2em] px-8 py-3.5 rounded-xl hover:opacity-90 transition-all">
        Retry
      </button>
    </div>

  </div>
</template>
