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
  Instagram,
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

// ── Supabase client + auth ─────────────────────────────────
const supabase = useSupabaseClient()
const notify = useNotify()

// ── Chatbot filter ──────────────────────────────────────────
const selectedBotId = ref<string>('all')

const analytics = ref<any>(null)
const isLoading = ref(true)

const FUNCTIONS_URL = 'https://vycwuvynlqdpvjiwbjjv.supabase.co/functions/v1'

const fetchAnalytics = async () => {
  isLoading.value = true
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      notify.error('Session expired. Please re-authenticate.')
      return
    }

    const url = new URL(`${FUNCTIONS_URL}/fetch-analytics`)
    if (selectedBotId.value !== 'all') {
      url.searchParams.set('chatbotId', selectedBotId.value)
    }

    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(errBody.error || errBody.message || 'Edge function error')
    }

    analytics.value = await res.json()
  } catch (err: any) {
    console.error('[Analytics]', err)
    notify.error('Failed to load analytics data.')
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
  const max = Math.max(...analytics.value.timeline.map((d: any) => d.count), 1)
  return analytics.value.timeline.slice(-14).map((d: any, i: number) => ({
    x: (i / 13) * 100,
    y: 100 - (d.count / max) * 90,
    count: d.count,
    date: d.date,
  }))
})

const linePath = computed(() => {
  if (chartData.value.length < 2) return ''
  return chartData.value.reduce((path: string, point: any, i: number) =>
    i === 0 ? `M ${point.x} ${point.y}` : `${path} L ${point.x} ${point.y}`, '')
})

const areaPath = computed(() => {
  if (chartData.value.length < 2) return ''
  const first = chartData.value[0]
  const last = chartData.value[chartData.value.length - 1]
  return `${linePath.value} L ${last.x} 100 L ${first.x} 100 Z`
})

// ── Channel bars ─────────────────────────────────────────────
const channelBars = computed(() => {
  const c = analytics.value?.channels || { whatsapp: 0, instagram: 0, web: 0 }
  const total = Math.max(c.whatsapp + c.instagram + c.web, 1)
  return [
    { label: 'WhatsApp', count: c.whatsapp, pct: Math.round((c.whatsapp / total) * 100), color: '#22c55e', icon: Phone },
    { label: 'Instagram', count: c.instagram, pct: Math.round((c.instagram / total) * 100), color: '#ec4899', icon: Instagram },
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
        <h2 class="text-xl font-bold tracking-tight text-white uppercase">Intelligence Analytics</h2>
        <p class="text-gray-500 text-sm mt-1">Real-time data across all your AI channels and agents.</p>
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
          class="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-5 py-3 flex items-center gap-2 transition-all group active:scale-95"
        >
          <RefreshCw :class="['w-4 h-4 text-primary transition-transform duration-700', isLoading ? 'animate-spin' : 'group-hover:rotate-180']" />
          <span class="text-[10px] font-bold text-white uppercase tracking-widest">Refresh</span>
        </button>
      </div>
    </div>

    <!-- LOADING -->
    <template v-if="isLoading && !analytics">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div v-for="i in 4" :key="i" class="bg-white/5 border border-white/10 p-7 rounded-[2rem]">
          <Skeleton width="48px" height="48px" rounded="14px" class="mb-5" />
          <Skeleton width="100px" height="10px" class="mb-3" />
          <Skeleton width="130px" height="30px" />
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-white/5 border border-white/10 rounded-[2.5rem] p-10 min-h-[320px]">
          <Skeleton width="40%" height="2rem" class="mb-2" />
          <Skeleton width="60%" height="1rem" class="mb-10" />
          <Skeleton width="100%" height="12rem" rounded="1rem" />
        </div>
        <div class="bg-white/5 border border-white/10 rounded-[2.5rem] p-10">
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
          class="bg-white/[0.03] border border-white/[0.06] rounded-[2rem] p-7 space-y-4 hover:border-white/10 transition-all group relative overflow-hidden"
        >
          <div class="absolute -top-10 -right-10 w-28 h-28 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
          <div class="flex items-center justify-between relative">
            <div class="bg-white/[0.06] p-3 rounded-2xl border border-white/[0.06]">
              <component :is="card.icon" class="w-5 h-5 text-primary" />
            </div>
            <span class="text-[9px] font-black uppercase tracking-widest flex items-center gap-1" :style="{ color: card.trendColor }">
              <TrendingUp class="w-3 h-3" />{{ card.trend }}
            </span>
          </div>
          <div class="relative">
            <p class="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">{{ card.label }}</p>
            <h3 class="text-3xl font-black text-white tracking-tight tabular-nums">{{ card.value }}</h3>
            <p class="text-[10px] text-gray-600 mt-1 font-medium">{{ card.sub }}</p>
          </div>
        </div>
      </div>

      <!-- Main Row: Chart + Right Panel -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Timeline Chart -->
        <div class="lg:col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden">
          <div class="absolute top-8 right-8 flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span class="text-[9px] font-black text-gray-500 uppercase tracking-widest">Live Stream</span>
          </div>
          <div>
            <h2 class="text-xl font-black text-white tracking-tight uppercase">Engagement Timeline</h2>
            <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Chat Sessions — Last 14 Days</p>
          </div>

          <!-- SVG -->
          <div class="relative h-48 w-full">
            <!-- Empty state for chart -->
            <div v-if="chartData.every((d: any) => d.count === 0)" class="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Activity class="w-8 h-8 text-gray-700" />
              <p class="text-[10px] text-gray-600 uppercase tracking-widest font-black">No session data in the last 14 days</p>
            </div>
            <svg v-else viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#D4AF37" stop-opacity="0.25" />
                  <stop offset="100%" stop-color="#D4AF37" stop-opacity="0" />
                </linearGradient>
              </defs>
              <path :d="areaPath" fill="url(#areaGrad)" />
              <path :d="linePath" fill="none" stroke="#D4AF37" stroke-width="0.6" stroke-linecap="round" stroke-linejoin="round" />
              <g v-for="point in chartData" :key="point.date">
                <title>{{ point.date }}: {{ point.count }} sessions</title>
                <circle :cx="point.x" :cy="point.y" r="1.2" fill="#000" stroke="#D4AF37" stroke-width="0.4" class="cursor-pointer" />
              </g>
            </svg>
            <div class="absolute -bottom-5 left-0 w-full flex justify-between px-1">
              <span
                v-for="point in chartData.filter((_: any, i: number) => i % 3 === 0)"
                :key="point.date"
                class="text-[8px] font-black text-gray-600 uppercase"
              >
                {{ formatDate(point.date) }}
              </span>
            </div>
          </div>

          <!-- Chart Footer -->
          <div class="grid grid-cols-3 gap-4 pt-6 border-t border-white/[0.06]">
            <div class="text-center">
              <p class="text-[9px] text-gray-500 uppercase tracking-widest font-black mb-1">Peak Day</p>
              <p class="text-lg font-black text-white tabular-nums">{{ chartPeak }}</p>
            </div>
            <div class="text-center border-x border-white/[0.06]">
              <p class="text-[9px] text-gray-500 uppercase tracking-widest font-black mb-1">Total (14d)</p>
              <p class="text-lg font-black text-white tabular-nums">{{ chartTotal }}</p>
            </div>
            <div class="text-center">
              <p class="text-[9px] text-gray-500 uppercase tracking-widest font-black mb-1">Daily Avg</p>
              <p class="text-lg font-black text-white tabular-nums">{{ chartAvg }}</p>
            </div>
          </div>
        </div>

        <!-- Right: Channel Breakdown + Top Agents -->
        <div class="space-y-5">

          <!-- Channel Breakdown -->
          <div class="bg-white/[0.03] border border-white/[0.06] rounded-[2rem] p-7 space-y-5">
            <div>
              <h3 class="text-sm font-black text-white uppercase tracking-tight">Channel Breakdown</h3>
              <p class="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">Sessions by source</p>
            </div>
            <div class="space-y-4">
              <div v-for="ch in channelBars" :key="ch.label" class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <component :is="ch.icon" class="w-3.5 h-3.5" :style="{ color: ch.color }" />
                    <span class="text-[10px] font-black text-white uppercase tracking-wider">{{ ch.label }}</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-[11px] font-black text-white tabular-nums">{{ ch.count }}</span>
                    <span class="text-[9px] font-bold text-gray-600">{{ ch.pct }}%</span>
                  </div>
                </div>
                <div class="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700"
                    :style="{ width: `${ch.pct || 0}%`, backgroundColor: ch.color }"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Top Agents -->
          <div class="bg-white/[0.03] border border-white/[0.06] rounded-[2rem] p-7 space-y-5">
            <div>
              <h3 class="text-sm font-black text-white uppercase tracking-tight">Top Agents</h3>
              <p class="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">By conversation count</p>
            </div>
            <div v-if="!analytics.topAgents?.length" class="flex flex-col items-center py-6 text-gray-700">
              <Bot class="w-7 h-7 opacity-20 mb-2" />
              <p class="text-[9px] uppercase tracking-widest font-black">No agent data yet</p>
            </div>
            <div v-else class="space-y-2.5">
              <div
                v-for="(agent, idx) in analytics.topAgents"
                :key="agent.id"
                class="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-primary/20 transition-all group"
              >
                <div class="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-[10px] font-black text-gray-500 group-hover:text-primary transition-colors shrink-0">
                  #{{ idx + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-[11px] font-black text-white uppercase truncate">{{ agent.name }}</p>
                  <div class="w-full h-1 bg-white/[0.06] rounded-full mt-1.5 overflow-hidden">
                    <div
                      class="h-full bg-primary rounded-full"
                      :style="{ width: analytics.topAgents[0]?.count > 0 ? `${(agent.count / analytics.topAgents[0].count) * 100}%` : '0%' }"
                    />
                  </div>
                </div>
                <span class="text-[11px] font-black text-white shrink-0 tabular-nums">{{ agent.count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Stats Row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white/[0.03] border border-white/[0.06] rounded-[2rem] p-6 text-center hover:border-white/10 transition-all">
          <Database class="w-5 h-5 text-primary mx-auto mb-3" />
          <p class="text-2xl font-black text-white tabular-nums">{{ analytics.summary.totalDataSources }}</p>
          <p class="text-[9px] text-gray-500 uppercase tracking-widest mt-1 font-black">Data Sources</p>
        </div>
        <div class="bg-white/[0.03] border border-white/[0.06] rounded-[2rem] p-6 text-center hover:border-white/10 transition-all">
          <Instagram class="w-5 h-5 text-pink-500 mx-auto mb-3" />
          <p class="text-2xl font-black text-white tabular-nums">{{ analytics.summary.totalIgAccounts }}</p>
          <p class="text-[9px] text-gray-500 uppercase tracking-widest mt-1 font-black">IG Accounts</p>
        </div>
        <div class="bg-white/[0.03] border border-white/[0.06] rounded-[2rem] p-6 text-center hover:border-white/10 transition-all">
          <Phone class="w-5 h-5 text-green-500 mx-auto mb-3" />
          <p class="text-2xl font-black text-white tabular-nums">{{ analytics.summary.totalWhatsappAccounts }}</p>
          <p class="text-[9px] text-gray-500 uppercase tracking-widest mt-1 font-black">WhatsApp Lines</p>
        </div>
        <div class="bg-white/[0.03] border border-white/[0.06] rounded-[2rem] p-6 text-center hover:border-white/10 transition-all">
          <Zap class="w-5 h-5 text-yellow-400 mx-auto mb-3" />
          <p class="text-2xl font-black text-white tabular-nums">{{ analytics.summary.activeTriggers }}</p>
          <p class="text-[9px] text-gray-500 uppercase tracking-widest mt-1 font-black">Active Rules</p>
        </div>
      </div>

    </template>

    <!-- Error State -->
    <div v-else class="text-center py-36 bg-white/[0.03] rounded-[3rem] border border-dashed border-white/10">
      <div class="bg-red-500/10 text-red-500 w-16 h-16 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
        <AlertCircle class="w-8 h-8" />
      </div>
      <h2 class="text-xl font-black text-white tracking-tight uppercase">Failed to Load Analytics</h2>
      <p class="text-gray-500 text-xs font-bold tracking-widest uppercase mt-2">Unable to retrieve your intelligence data.</p>
      <button @click="refresh()" class="mt-6 bg-primary text-black text-[10px] font-black uppercase tracking-[0.2em] px-8 py-3.5 rounded-xl hover:opacity-90 transition-all">
        Retry
      </button>
    </div>

  </div>
</template>
