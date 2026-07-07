<script setup lang="ts">
import {
  Bot,
  ChevronRight,
  BrainCircuit,
  Instagram,
  MessageCircle,
  MessageSquare,
  Smartphone,
  Trophy,
  Wrench,
  Zap,
} from 'lucide-vue-next'
import Skeleton from '~~/app/components/Skeleton.vue'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })

useHead({ title: 'Dashboard' })

const { isLoading, userId } = useAuth()
const supabase = useSupabaseClient()
const isMounted = ref(false)
const chartRange = ref<'7d' | '30d' | '90d'>('7d')
onMounted(() => { isMounted.value = true })

type DashboardBot = {
  id: string
  name: string | null
  default_language?: string | null
  allowed_domains?: string[] | null
  enabled_tools?: string[] | null
  tools_config?: Record<string, any> | null
  created_at?: string | null
}

const safeCount = (value: number | null | undefined) => Number(value || 0)

const { data: overview, pending: overviewLoading } = useAsyncData('dashboard-command-overview-v1', async () => {
  if (!userId.value) {
    return {
      bots: [] as DashboardBot[],
      conversationCount: 0,
      whatsappCount: 0,
      instagramCount: 0,
      toolsConnected: 0,
      skillsEnabled: 0,
      topBot: null as any,
      topPerformers: [] as any[],
      sessions: [] as any[],
    }
  }

  const { data: botsData } = await supabase
    .from('chatbots')
    .select('id, name, default_language, allowed_domains, enabled_tools, tools_config, created_at')
    .eq('user_id', userId.value)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const bots = (botsData || []) as DashboardBot[]
  const botIds = bots.map((bot) => bot.id).filter(Boolean)

  const [sessionsRes, whatsappRes, instagramRes] = await Promise.all([
    botIds.length
      ? supabase
        .from('chat_sessions')
        .select('id, chatbot_id, created_at')
        .in('chatbot_id', botIds)
        .order('created_at', { ascending: false })
        .limit(5000)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('whatsapp_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId.value),
    supabase
      .from('instagram_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId.value),
  ])

  const sessions = Array.isArray((sessionsRes as any).data) ? (sessionsRes as any).data : []
  const sessionCountsByBot = sessions.reduce((map: Record<string, number>, session: any) => {
    const id = String(session?.chatbot_id || '')
    if (!id) return map
    map[id] = (map[id] || 0) + 1
    return map
  }, {})

  const toolsConnected = bots.reduce((total, bot) => {
    const enabledTools = Array.isArray(bot.enabled_tools) ? bot.enabled_tools : []
    return total + enabledTools.length
  }, 0)

  const skillsEnabled = bots.reduce((total, bot) => {
    const assistantSkills = Array.isArray(bot.tools_config?.assistant_skills) ? bot.tools_config.assistant_skills : []
    return total + assistantSkills.length
  }, 0)

  const botPerformance = bots
    .map((bot) => {
      const enabledTools = Array.isArray(bot.enabled_tools) ? bot.enabled_tools : []
      const allowedDomains = Array.isArray(bot.allowed_domains) ? bot.allowed_domains : []
      const conversationCount = sessionCountsByBot[bot.id] || 0
      return {
        ...bot,
        conversationCount,
        percentage: sessions.length ? Math.round((conversationCount / sessions.length) * 100) : 0,
        toolsCount: enabledTools.length,
        domainsCount: allowedDomains.filter(Boolean).length,
      }
    })
    .sort((a, b) => {
      if (b.conversationCount !== a.conversationCount) return b.conversationCount - a.conversationCount
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })

  const topBot = botPerformance[0] || null
  const topPerformers = botPerformance.slice(0, 2)

  return {
    bots,
    conversationCount: sessions.length,
    whatsappCount: safeCount((whatsappRes as any).count),
    instagramCount: safeCount((instagramRes as any).count),
    toolsConnected,
    skillsEnabled,
    topBot,
    topPerformers,
    sessions,
  }
}, { watch: [userId] })

const loading = computed(() => !isMounted.value || isLoading.value || overviewLoading.value)

const metricRows = computed(() => [
  {
    label: 'Chatbots created',
    value: overview.value?.bots.length || 0,
    detail: 'Active assistants in this workspace',
    icon: Bot,
    tone: 'primary',
  },
  {
    label: 'Conversations',
    value: overview.value?.conversationCount || 0,
    detail: 'Customer chats captured',
    icon: MessageSquare,
    tone: 'blue',
  },
  {
    label: 'WhatsApp connected',
    value: overview.value?.whatsappCount || 0,
    detail: 'Business numbers connected',
    icon: Smartphone,
    tone: 'green',
  },
  {
    label: 'Instagram connected',
    value: overview.value?.instagramCount || 0,
    detail: 'Accounts ready for comments/DMs',
    icon: Instagram,
    tone: 'pink',
  },
  {
    label: 'Tools connected',
    value: overview.value?.toolsConnected || 0,
    detail: 'Assistant tools enabled',
    icon: Wrench,
    tone: 'amber',
  },
  {
    label: 'Skills enabled',
    value: overview.value?.skillsEnabled || 0,
    detail: 'Assistant behavior skills active',
    icon: BrainCircuit,
    tone: 'violet',
  },
])

const metricClass = (tone: string) => ({
  primary: 'bg-primary/10 text-primary ring-primary/15',
  blue: 'bg-sky-400/10 text-sky-400 ring-sky-400/15',
  green: 'bg-emerald-400/10 text-emerald-400 ring-emerald-400/15',
  pink: 'bg-pink-400/10 text-pink-400 ring-pink-400/15',
  amber: 'bg-amber-400/10 text-amber-400 ring-amber-400/15',
  violet: 'bg-violet-400/10 text-violet-400 ring-violet-400/15',
}[tone] || 'bg-foreground/5 text-foreground/60 ring-foreground/10')

const formatNumber = (value: number) => Number(value || 0).toLocaleString()
const formatPercent = (value: number) => `${Number(value || 0).toLocaleString()}%`

const topBotSubtitle = computed(() => {
  const bot = overview.value?.topBot
  if (!bot) return 'Create an assistant to start tracking performance.'
  if (bot.conversationCount > 0) return 'Best performer by conversation volume.'
  return 'Newest created assistant, waiting for its first conversation.'
})

const chartFilters = [
  { label: '7D', value: '7d', days: 7 },
  { label: '30D', value: '30d', days: 30 },
  { label: '90D', value: '90d', days: 90 },
] as const

const chartSeries = computed(() => {
  const selected = chartFilters.find((item) => item.value === chartRange.value) || chartFilters[0]
  const days = selected.days
  const now = new Date()
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() - (days - 1 - index))
    const key = date.toISOString().slice(0, 10)
    return { key, label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: 0 }
  })
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]))
  for (const session of overview.value?.sessions || []) {
    const key = String(session?.created_at || '').slice(0, 10)
    const bucket = bucketMap.get(key)
    if (bucket) bucket.value += 1
  }
  return buckets
})

const chartTotal = computed(() => chartSeries.value.reduce((sum, point) => sum + point.value, 0))
const chartMax = computed(() => Math.max(1, ...chartSeries.value.map((point) => point.value)))
const chartPath = computed(() => chartSeries.value.map((point, index) => {
  const x = chartSeries.value.length <= 1 ? 0 : (index / (chartSeries.value.length - 1)) * 100
  const y = 100 - ((point.value / chartMax.value) * 76 + 12)
  return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
}).join(' '))
const chartAreaPath = computed(() => chartPath.value ? `${chartPath.value} L 100 100 L 0 100 Z` : '')
const chartScaleLabels = computed(() => [
  { label: formatNumber(chartMax.value), position: 'top-4' },
  { label: formatNumber(Math.ceil(chartMax.value / 2)), position: 'top-1/2 -translate-y-1/2' },
  { label: '0', position: 'bottom-11' },
])

const buildSparklinePath = (values: number[]) => {
  const max = Math.max(1, ...values)
  return values.map((value, index) => {
    const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * 100
    const y = 28 - ((value / max) * 20 + 4)
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')
}

const buildBotTrendPath = (botId: string) => {
  const selected = chartFilters.find((item) => item.value === chartRange.value) || chartFilters[0]
  const now = new Date()
  const buckets = Array.from({ length: Math.min(selected.days, 14) }, (_, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() - (Math.min(selected.days, 14) - 1 - index))
    return { key: date.toISOString().slice(0, 10), value: 0 }
  })
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]))
  for (const session of overview.value?.sessions || []) {
    if (String(session?.chatbot_id || '') !== botId) continue
    const bucket = bucketMap.get(String(session?.created_at || '').slice(0, 10))
    if (bucket) bucket.value += 1
  }
  return buildSparklinePath(buckets.map((bucket) => bucket.value))
}

const formatRelativeTime = (value?: string | null) => {
  if (!value) return 'Recently'
  const diffMs = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.floor(diffMs / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const recentActivity = computed(() => {
  const bots = overview.value?.bots || []
  const sessions = overview.value?.sessions || []
  const total = Math.max(1, sessions.length)

  return bots
    .map((bot) => {
      const botSessions = sessions.filter((session: any) => String(session?.chatbot_id || '') === bot.id)
      const enabledTools = Array.isArray(bot.enabled_tools) ? bot.enabled_tools : []
      const assistantSkills = Array.isArray(bot.tools_config?.assistant_skills) ? bot.tools_config.assistant_skills : []
      const latestSession = botSessions[0]
      return {
        id: `bot-${bot.id}`,
        title: bot.name || 'Untitled assistant',
        detail: `${formatNumber(botSessions.length)} chats`,
        meta: `${formatPercent(Math.round((botSessions.length / total) * 100))} of activity · ${enabledTools.length} tools · ${assistantSkills.length} skills`,
        time: latestSession ? formatRelativeTime(latestSession.created_at) : formatRelativeTime(bot.created_at),
        count: botSessions.length,
        percentage: Math.round((botSessions.length / total) * 100),
        icon: Bot,
        tone: botSessions.length ? 'blue' : 'primary',
        trend: buildBotTrendPath(bot.id),
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
})
</script>

<template>
  <div class="min-h-[calc(100vh-4.5rem)] pt-[10vh] pb-20" style="zoom: 0.95">
    <div v-if="loading" class="space-y-5">
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <section class="rounded-[0.39rem] p-5 sm:p-6">
        <Skeleton width="9rem" height="0.8rem" class="mb-3" />
        <Skeleton width="15rem" height="1.6rem" class="mb-5" />
        <div class="grid gap-3 sm:grid-cols-2">
          <Skeleton v-for="item in 5" :key="item" height="5.25rem" />
        </div>
      </section>
      <section class="rounded-[0.39rem] bg-background-card/75 p-5 shadow-sm shadow-black/5 ring-1 ring-foreground/[0.06] sm:p-6">
        <Skeleton width="9rem" height="0.8rem" class="mb-3" />
        <Skeleton width="12rem" height="1.6rem" class="mb-6" />
        <Skeleton width="100%" height="12rem" />
      </section>
      </div>
      <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
        <Skeleton width="8rem" height="0.8rem" class="mb-3" />
        <Skeleton width="14rem" height="1.5rem" class="mb-5" />
        <Skeleton width="100%" height="12rem" />
      </section>
    </div>

    <div v-else class="space-y-5">
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <section class="rounded-[0.39rem] p-5 sm:p-6">
        <div class="mb-5 flex items-end justify-between gap-4">
          <div>
            <p class="dashboard-eyebrow text-primary/80">Command overview</p>
            <h2 class="dashboard-section-title mt-2">Your workspace at a glance</h2>
          </div>
          <div class="hidden h-10 w-10 items-center justify-center bg-primary/10 text-primary ring-1 ring-primary/15 sm:flex">
            <Zap class="h-[1.125rem] w-[1.125rem]" />
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="metric in metricRows"
            :key="metric.label"
            class="group flex items-center gap-2.5 rounded-[0.39rem] bg-background/45 py-3 pl-3 pr-2 transition hover:bg-foreground/[0.035]"
          >
            <div :class="['flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-[0.39rem] ring-1 transition group-hover:scale-105', metricClass(metric.tone)]">
              <component :is="metric.icon" class="h-7 w-7" />
            </div>
            <div class="min-w-0">
              <p class="dashboard-metric-number leading-none">{{ formatNumber(metric.value) }}</p>
              <p class="mt-1 truncate text-sm font-semibold text-foreground/75">{{ metric.label }}</p>
              <p class="mt-0.5 truncate text-[11px] font-semibold text-foreground/50">{{ metric.detail }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="relative overflow-hidden rounded-[0.39rem] bg-background-card/75 p-5 shadow-sm shadow-black/5 ring-1 ring-foreground/[0.06] sm:p-6">
        <div class="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl"></div>
        <div class="relative z-10">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <p class="dashboard-eyebrow text-primary/80">Best performers</p>
              <h2 class="dashboard-section-title mt-2">Top assistants</h2>
              <p class="dashboard-muted mt-1">{{ topBotSubtitle }}</p>
            </div>
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15">
              <Trophy class="h-5 w-5" />
            </div>
          </div>

          <div v-if="overview?.topPerformers?.length" class="space-y-3 rounded-[0.39rem] bg-background/45 p-4 ring-1 ring-foreground/[0.05]">
            <div
              v-for="(bot, index) in overview.topPerformers"
              :key="bot.id"
              class="flex items-center justify-between gap-3 rounded-[0.39rem] bg-foreground/[0.035] p-3 ring-1 ring-foreground/[0.05]"
            >
              <div class="flex min-w-0 items-center gap-3">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] bg-primary/10 text-xs font-black tabular-nums text-primary ring-1 ring-primary/15">{{ index + 1 }}</span>
                <p class="truncate text-sm font-bold text-foreground">{{ bot.name || 'Untitled assistant' }}</p>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-lg font-bold tabular-nums text-foreground">{{ formatNumber(bot.conversationCount) }}</p>
                <p class="text-[11px] font-semibold tabular-nums text-foreground/45">{{ formatPercent(bot.percentage) }}</p>
              </div>
            </div>

            <NuxtLink to="/dashboard/agents" class="dashboard-action-label inline-flex w-full items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-4 py-3 text-black transition hover:brightness-95">
              Manage assistants
              <ChevronRight class="h-4 w-4" />
            </NuxtLink>
          </div>

          <div v-else class="flex min-h-[13rem] flex-col items-center justify-center rounded-[0.39rem] border border-dashed border-foreground/[0.08] bg-background/35 p-6 text-center">
            <MessageCircle class="mb-4 h-10 w-10 text-foreground/20" />
            <h3 class="text-base font-bold text-foreground">No chatbot yet</h3>
            <p class="mt-2 max-w-xs text-xs leading-relaxed text-foreground/50">Create your first chatbot and it will appear here as your workspace performer.</p>
            <NuxtLink to="/dashboard/agents" class="dashboard-action-label mt-5 inline-flex items-center gap-2 rounded-[0.39rem] bg-primary px-5 py-3 text-black transition hover:brightness-95">
              Create chatbot
              <ChevronRight class="h-4 w-4" />
            </NuxtLink>
          </div>
        </div>
      </section>
      </div>

      <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
        <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="dashboard-eyebrow text-primary/80">Conversation trend</p>
            <h2 class="dashboard-section-title mt-2">Chat volume over time</h2>
            <p class="dashboard-muted mt-1"><span class="tabular-nums font-bold text-foreground/70">{{ formatNumber(chartTotal) }}</span> conversations in selected range</p>
          </div>
          <div class="flex w-fit rounded-[0.39rem] border border-foreground/10 bg-background/55 p-1">
            <button
              v-for="filter in chartFilters"
              :key="filter.value"
              type="button"
              :class="[
                'dashboard-action-label rounded-[0.3rem] px-3 py-1.5 transition',
                chartRange === filter.value ? 'bg-primary text-black shadow-sm shadow-primary/20' : 'text-foreground/45 hover:bg-foreground/5 hover:text-foreground'
              ]"
              @click="chartRange = filter.value"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>

        <div
          class="relative overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background/35 p-4 pl-11"
          style="background-image: linear-gradient(rgb(var(--surface-border) / 0.055) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--surface-border) / 0.055) 1px, transparent 1px); background-size: 2.25rem 2.25rem;"
        >
          <span
            v-for="scale in chartScaleLabels"
            :key="scale.label + scale.position"
            :class="['absolute left-3 z-20 text-[10px] font-bold tabular-nums text-foreground/40', scale.position]"
          >
            {{ scale.label }}
          </span>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="relative z-10 h-52 w-full overflow-visible">
            <path v-if="chartAreaPath" :d="chartAreaPath" fill="currentColor" class="text-primary/10" />
            <path v-if="chartPath" :d="chartPath" fill="none" vector-effect="non-scaling-stroke" class="stroke-primary" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <div class="mt-3 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/35">
            <span>{{ chartSeries[0]?.label }}</span>
            <span>Peak {{ formatNumber(chartMax) }}</span>
            <span>{{ chartSeries[chartSeries.length - 1]?.label }}</span>
          </div>
        </div>
      </section>

      <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
        <div class="mb-5 flex items-end justify-between gap-4">
          <div>
            <p class="dashboard-eyebrow text-primary/80">Recent activity</p>
            <h2 class="dashboard-section-title mt-2">What changed lately</h2>
          </div>
          <NuxtLink to="/dashboard/conversations" class="dashboard-action-label hidden text-foreground/45 transition hover:text-primary sm:inline-flex">
            View conversations
          </NuxtLink>
        </div>

        <div class="grid items-stretch gap-3 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div v-if="recentActivity.length" class="overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background/35">
            <table class="w-full table-fixed border-collapse">
              <thead class="max-lg:hidden">
                <tr class="border-b border-foreground/10 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/35">
                  <th class="w-12 px-4 py-2"></th>
                  <th class="px-2 py-2">Bot</th>
                  <th class="w-48 px-2 py-2">Share</th>
                  <th class="w-28 px-2 py-2">Trend</th>
                  <th class="w-16 px-4 py-2 text-right">Last</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in recentActivity"
                  :key="item.id"
                  class="border-b border-foreground/[0.06] last:border-b-0"
                >
                  <td class="px-4 py-2.5 align-middle">
                    <div :class="['flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.39rem] ring-1', metricClass(item.tone)]">
                      <component :is="item.icon" class="h-4 w-4" />
                    </div>
                  </td>
                  <td class="px-2 py-2.5 align-middle">
                    <p class="truncate text-sm font-bold text-foreground">{{ item.title }}</p>
                    <p class="mt-0.5 truncate text-xs font-medium text-foreground/50">{{ item.detail }}</p>
                  </td>
                  <td class="px-2 py-2.5 align-middle max-lg:hidden">
                    <p class="truncate text-xs font-semibold text-foreground/45">{{ item.meta }}</p>
                  </td>
                  <td class="px-2 py-2.5 align-middle max-lg:hidden">
                    <div class="h-8 overflow-hidden rounded-[0.3rem] bg-foreground/[0.025] px-2 py-1">
                      <svg viewBox="0 0 100 28" preserveAspectRatio="none" class="h-full w-full">
                        <path :d="item.trend" fill="none" vector-effect="non-scaling-stroke" class="stroke-primary/70" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </div>
                  </td>
                  <td class="px-4 py-2.5 text-right align-middle text-[10px] font-semibold text-foreground/40">{{ item.time }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="rounded-[0.39rem] border border-dashed border-foreground/[0.08] bg-background/35 p-6 text-center">
            <MessageCircle class="mx-auto mb-3 h-9 w-9 text-foreground/20" />
            <p class="text-sm font-bold text-foreground">No recent activity yet</p>
            <p class="mt-1 text-xs text-foreground/45">New conversations and assistant updates will appear here.</p>
          </div>

          <aside class="rounded-[0.39rem] border border-foreground/10 bg-background/35 p-4">
            <p class="dashboard-eyebrow text-primary/80">System activities</p>
            <div class="mt-4 divide-y divide-foreground/[0.06] overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background/35">
              <div class="flex items-center gap-3 px-3 py-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/15">
                  <Zap class="h-4 w-4" />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-xs font-bold text-foreground">Workspace online</p>
                  <p class="truncate text-[11px] font-medium text-foreground/45">Dashboard data is available</p>
                </div>
              </div>
              <div class="flex items-center gap-3 px-3 py-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/15">
                  <Wrench class="h-4 w-4" />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-xs font-bold text-foreground">{{ formatNumber(overview?.toolsConnected || 0) }} tools enabled</p>
                  <p class="truncate text-[11px] font-medium text-foreground/45">Assistant actions ready</p>
                </div>
              </div>
              <div class="flex items-center gap-3 px-3 py-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] bg-sky-400/10 text-sky-400 ring-1 ring-sky-400/15">
                  <MessageSquare class="h-4 w-4" />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-xs font-bold text-foreground">{{ formatNumber(chartTotal) }} chats in range</p>
                  <p class="truncate text-[11px] font-medium text-foreground/45">Conversation monitor active</p>
                </div>
              </div>
            </div>
            <NuxtLink to="/dashboard/agents/tools" class="dashboard-action-label mt-4 inline-flex w-full items-center justify-center rounded-[0.39rem] border border-foreground/10 px-3 py-2.5 text-foreground/55 transition hover:border-primary/20 hover:text-primary">
              Review tools
            </NuxtLink>
          </aside>
        </div>
      </section>
    </div>
  </div>
</template>
