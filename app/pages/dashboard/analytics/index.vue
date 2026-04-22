<script setup lang="ts">
import {
  Activity,
  TrendingUp,
  Zap,
  Target,
  RefreshCw,
  ArrowUpRight,
  Bot,
  MessageCircle,
  AlertCircle,
  Loader2
} from 'lucide-vue-next'
import Skeleton from '~~/app/components/Skeleton.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const supabase = useSupabaseClient()
const notify = useNotify()
const analytics = ref<any>(null)
const isLoading = ref(true)

const fetchAnalytics = async () => {
  isLoading.value = true
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('No active session found')
      notify.error('Intelligence session lost. Please re-authenticate.')
      return
    }

    const { data, error } = await supabase.functions.invoke('fetch-analytics', {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })

    if (error) {
      if (error.context && typeof error.context.json === 'function') {
        const errBody = await error.context.json()
        console.error('Edge Function Error Body:', errBody)
        notify.error(`Intelligence Engine: ${errBody.message || 'Processing failure'}`)
      }
      throw error
    }
    analytics.value = data
  } catch (err: any) {
    console.error('Failed to fetch analytics:', err)
    notify.error('Unable to synchronize with the intelligence engine.')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchAnalytics()
})

// Custom SVG Chart Logic
const chartData = computed(() => {
  if (!analytics.value?.timeline?.length) return []
  const max = Math.max(...analytics.value.timeline.map((d: any) => d.count), 1)
  return analytics.value.timeline.slice(-14).map((d: any, i: number) => ({
    x: (i / 13) * 100,
    y: 100 - (d.count / max) * 100,
    count: d.count,
    date: d.date
  }))
})

const linePath = computed(() => {
  if (chartData.value.length < 2) return ""
  return chartData.value.reduce((path: string, point: any, i: number) => {
    return i === 0 ? `M ${point.x} ${point.y}` : `${path} L ${point.x} ${point.y}`
  }, "")
})

const areaPath = computed(() => {
  if (chartData.value.length < 2) return ""
  const first = chartData.value[0]
  const last = chartData.value[chartData.value.length - 1]
  return `${linePath.value} L ${last.x} 100 L ${first.x} 100 Z`
})
</script>

<template>
  <div class="p-4 max-w-8xl mx-auto space-y-12">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <button @click="fetchAnalytics" :disabled="isLoading"
        class="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl px-6 py-4 flex items-center gap-3 transition-all group active:scale-95">
        <RefreshCw
          :class="['w-4 h-4 text-primary transition-transform duration-700', isLoading ? 'animate-spin' : 'group-hover:rotate-180']" />
        <span class="text-[10px] font-bold text-white uppercase tracking-widest">Refresh Stream</span>
      </button>
    </div>

    <div v-if="isLoading && !analytics" class="space-y-12 w-full">
      <!-- Quick Stats Skeleton -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div v-for="i in 4" :key="i" class="bg-white/5 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem]">
          <div class="flex items-center justify-between mb-6">
            <Skeleton width="48px" height="48px" rounded="16px" />
            <Skeleton width="40px" height="14px" />
          </div>
          <Skeleton width="100px" height="12px" class="mb-3" />
          <Skeleton width="140px" height="32px" />
        </div>
      </div>
      
      <!-- Layout Body Skeleton -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 min-h-[400px]">
           <Skeleton width="30%" height="2rem" class="mb-2" />
           <Skeleton width="50%" height="1rem" class="mb-10" />
           <Skeleton width="100%" height="16rem" rounded="1rem" />
        </div>
        <div class="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 flex flex-col">
           <Skeleton width="50%" height="2rem" class="mb-2" />
           <Skeleton width="60%" height="1rem" class="mb-10" />
           <div class="space-y-6">
              <div v-for="i in 5" :key="i" class="flex items-center gap-4">
                 <Skeleton width="2.5rem" height="2.5rem" rounded="1rem" />
                 <div class="flex-1 space-y-2">
                    <Skeleton width="50%" height="1rem" />
                    <Skeleton width="100%" height="0.5rem" />
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>

    <template v-else-if="analytics">
      <!-- Quick Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Stat Card 1 -->
        <div
          class="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 space-y-4 hover:border-primary/30 transition-all group overflow-hidden relative">
          <div
            class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
          <div class="flex items-center justify-between relative">
            <div class="bg-primary/10 text-primary p-3 rounded-2xl">
              <Activity class="w-5 h-5" />
            </div>
            <div class="text-[10px] font-bold text-green-500 flex items-center gap-1 uppercase tracking-tighter">
              <TrendingUp class="w-3 h-3" />
              Live
            </div>
          </div>
          <div class="space-y-1 relative">
            <p class="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Total Engagement</p>
            <h3 class="text-4xl font-black text-white italic tracking-tighter">{{ analytics.summary.total }}</h3>
          </div>
        </div>

        <!-- Stat Card 2 -->
        <div
          class="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 space-y-4 hover:border-secondary/30 transition-all group overflow-hidden relative">
          <div
            class="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-secondary/10 transition-colors" />
          <div class="flex items-center justify-between relative">
            <div class="bg-secondary/10 text-secondary p-3 rounded-2xl">
              <Zap class="w-5 h-5" />
            </div>
            <div class="text-[10px] font-bold text-secondary flex items-center gap-1 uppercase tracking-tighter">
              98% Goal
            </div>
          </div>
          <div class="space-y-1 relative">
            <p class="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Success Velocity</p>
            <h3 class="text-4xl font-black text-white italic tracking-tighter">{{ analytics.summary.successRate }}%</h3>
          </div>
        </div>

        <!-- Stat Card 3 -->
        <div
          class="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 space-y-4 hover:border-primary/30 transition-all group overflow-hidden relative">
          <div
            class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
          <div class="flex items-center justify-between relative">
            <div class="bg-primary/10 text-primary p-3 rounded-2xl">
              <Bot class="w-5 h-5" />
            </div>
            <div class="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-tighter italic">
              AI Optimized
            </div>
          </div>
          <div class="space-y-1 relative">
            <p class="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Sent Messages</p>
            <h3 class="text-4xl font-black text-white italic tracking-tighter">{{ analytics.summary.sent }}</h3>
          </div>
        </div>

        <!-- Stat Card 4 -->
        <div
          class="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 space-y-4 hover:border-red-500/30 transition-all group overflow-hidden relative">
          <div
            class="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-red-500/10 transition-colors" />
          <div class="flex items-center justify-between relative">
            <div class="bg-red-500/10 text-red-500 p-3 rounded-2xl">
              <AlertCircle class="w-5 h-5" />
            </div>
          </div>
          <div class="space-y-1 relative">
            <p class="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Failure Incidents</p>
            <h3 class="text-4xl font-black text-white italic tracking-tighter">{{ analytics.summary.failed }}</h3>
          </div>
        </div>
      </div>

      <!-- Main Visuals -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Chart Section -->
        <div
          class="lg:col-span-2 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 space-y-10 relative overflow-hidden group">
          <div class="absolute top-0 right-0 p-8">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-primary" />
              <span class="text-[9px] font-black text-gray-500 uppercase tracking-widest">Real-Time Engagement Flux</span>
            </div>
          </div>

          <div class="space-y-2">
            <h2 class="text-2xl font-black text-white tracking-tighter uppercase italic">Efficiency Horizon</h2>
            <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Automation Activity Over The Last 14 Days</p>
          </div>

          <div class="relative h-64 w-full">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full overflow-visible">
              <!-- Gradient Def -->
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.2" />
                  <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0" />
                </linearGradient>
              </defs>
              <!-- Area -->
              <path :d="areaPath" fill="url(#areaGrad)" />
              <!-- Line -->
              <path :d="linePath" fill="none" stroke="var(--color-primary)" stroke-width="0.5" stroke-linecap="round"
                stroke-linejoin="round" />
              <!-- Dots -->
              <circle v-for="point in chartData" :key="point.date" :cx="point.x" :cy="point.y" r="1" fill="black"
                stroke="var(--color-primary)" stroke-width="0.3"
                class="hover:scale-150 transition-transform cursor-pointer">
                <title>{{ point.date }}: {{ point.count }}</title>
              </circle>
            </svg>

            <!-- X-Axis Labels -->
            <div class="absolute bottom-[-24px] left-0 w-full flex justify-between px-1">
              <span v-for="point in chartData.filter((_, i) => i % 3 === 0)" :key="point.date"
                class="text-[8px] font-black text-gray-600 uppercase tracking-tighter">
                {{ point.date.split('-')[2] }}/{{ point.date.split('-')[1] }}
              </span>
            </div>
          </div>
        </div>

        <!-- Leaderboard -->
        <div class="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 space-y-10">
          <div class="space-y-2">
            <h2 class="text-2xl font-black text-white tracking-tighter uppercase italic">Rule Ranking</h2>
            <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Highest Performing Automation Triggers</p>
          </div>

          <div class="space-y-4">
            <div v-for="(trigger, idx) in analytics.topTriggers" :key="trigger.name"
              class="flex items-center gap-4 p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all group">
              <div
                class="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-[10px] font-black text-gray-500 group-hover:text-primary transition-colors">
                #{{ idx + 1 }}
              </div>
              <div class="flex-1">
                <p class="text-[10px] font-black text-white uppercase tracking-tight line-clamp-1">{{ trigger.name }}
                </p>
                <div class="flex items-center gap-2 mt-1">
                  <div class="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div class="h-full bg-primary"
                      :style="{ width: `${(trigger.count / analytics.topTriggers[0].count) * 100}%` }" />
                  </div>
                </div>
              </div>
              <div class="text-[10px] font-black text-white italic">
                {{ trigger.count }}
              </div>
            </div>

            <div v-if="analytics.topTriggers.length === 0"
              class="text-center py-20 grayscale opacity-20 border-2 border-dashed border-white/5 rounded-[2rem]">
              <Target class="w-8 h-8 mx-auto mb-4" />
              <p class="text-[9px] font-black tracking-[0.2em] text-gray-500 uppercase">Awaiting rule impact data...</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Error State -->
    <div v-else class="text-center py-40 bg-white/5 rounded-[4rem] border border-dashed border-white/10">
      <div class="bg-red-500/10 text-red-500 w-20 h-20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
        <AlertCircle class="w-10 h-10" />
      </div>
      <h2 class="text-3xl font-black text-white tracking-tighter uppercase italic">Stream Disconnected</h2>
      <p class="text-gray-500 text-xs font-bold tracking-widest uppercase mt-4">Unable to synchronize with the
        intelligence
        engine.</p>
      <button @click="fetchAnalytics"
        class="mt-8 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] px-10 py-5 rounded-full hover:scale-110 transition-transform">
        Reconnect
      </button>
    </div>
  </div>
</template>

<style scoped>
.italic-none {
  font-style: normal;
}

/* Custom Colors for the dashboard */
:root {
  --color-primary: #D4AF37;
  /* Premium Gold */
  --color-secondary: #C5A059;
  /* Soft Champagne */
}

/* Fallback for primary/secondary classes if they arent in tailwind config */
.text-primary {
  color: #D4AF37;
}

.bg-primary {
  background-color: #D4AF37;
}

.border-primary {
  border-color: #D4AF37;
}

.text-secondary {
  color: #C5A059;
}

.bg-secondary {
  background-color: #C5A059;
}

.border-secondary {
  border-color: #C5A059;
}
</style>
