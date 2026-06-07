<script setup lang="ts">
import {
  Activity,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Gauge,
  Globe,
  Lock,
  MessageSquare,
  Zap,
} from 'lucide-vue-next'
import Skeleton from '~~/app/components/Skeleton.vue'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })

useHead({ title: 'Dashboard' })

const { isLoading, userId, limits, planSlug } = useAuth()
const supabase = useSupabaseClient()
const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

const currentMonth = new Date().toISOString().slice(0, 7)

const { data: overview, pending: overviewLoading } = useAsyncData('dashboard-overview-v6', async () => {
  if (!userId.value) {
    return { bots: [], botIds: [], sessionCount: 0, whatsappCount: 0, trainingCount: 0, websiteDomainCount: 0 }
  }

  const { data: bots } = await supabase
    .from('chatbots')
    .select('id, name, allowed_domains')
    .eq('user_id', userId.value)
    .is('deleted_at', null)

  const botIds = (bots || []).map((bot: any) => bot.id)

  const [sessionsRes, whatsappRes, trainingRes] = await Promise.all([
    botIds.length
      ? supabase.from('chat_sessions').select('id', { count: 'exact', head: true }).in('chatbot_id', botIds)
      : Promise.resolve({ count: 0 }),
    supabase.from('whatsapp_accounts').select('id', { count: 'exact', head: true }).eq('user_id', userId.value),
    supabase.from('training_usage').select('training_count').eq('user_id', userId.value).eq('month_year', currentMonth),
  ])

  const domains = new Set<string>()
  for (const bot of bots || []) {
    const allowed = Array.isArray((bot as any).allowed_domains) ? (bot as any).allowed_domains : []
    for (const domain of allowed) if (domain) domains.add(String(domain))
  }

  return {
    bots: bots || [],
    botIds,
    sessionCount: sessionsRes.count || 0,
    whatsappCount: whatsappRes.count || 0,
    trainingCount: (trainingRes.data || []).reduce((sum: number, row: any) => sum + Number(row.training_count || 0), 0),
    websiteDomainCount: domains.size,
  }
}, { watch: [userId] })

const { data: recentSessions, pending: sessionsLoading } = useAsyncData('dashboard-latest-conversations-v2', async () => {
  if (!userId.value) return []
  const botIds = overview.value?.botIds || []
  if (!botIds.length) return []

  const { data } = await supabase
    .from('chat_sessions')
    .select('id, created_at, metadata, chatbots(name), chat_messages(content, role, created_at)')
    .in('chatbot_id', botIds)
    .order('created_at', { ascending: false })
    .limit(3)

  return (data || []).map((session: any) => {
    const messages = Array.isArray(session.chat_messages) ? session.chat_messages : []
    const latestMessage = messages
      .slice()
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0]

    return {
      ...session,
      latestMessage,
      messageCount: messages.length,
    }
  })
}, { watch: [userId, overview] })

const { data: activities, pending: activitiesLoading } = useAsyncData('dashboard-activity', async () => {
  if (!userId.value) return []
  return await $fetch('/api/activity/list', { query: { limit: 5 } })
}, { watch: [userId] })

const stats = computed(() => [
  { id: 'messages', name: 'Conversations', value: (overview.value?.sessionCount || 0).toLocaleString(), change: 'Live', changeType: (overview.value?.sessionCount || 0) > 0 ? 'increase' : 'neutral' },
  { id: 'agents', name: 'AI Assistants', value: String(overview.value?.bots.length || 0), change: `${limits.value.maxAgents || 0} limit`, changeType: (overview.value?.bots.length || 0) > 0 ? 'increase' : 'neutral' },
  { id: 'training', name: 'Training Used', value: String(overview.value?.trainingCount || 0), change: `${limits.value.maxTrainings || 0}/mo`, changeType: 'neutral' },
  { id: 'channels', name: 'Channels', value: String((overview.value?.websiteDomainCount || 0) + (overview.value?.whatsappCount || 0)), change: planSlug.value === 'starter' ? 'Web only' : 'Web + WA', changeType: planSlug.value === 'starter' ? 'neutral' : 'increase' },
])

const limitRows = computed(() => {
  const agentsUsed = overview.value?.bots.length || 0
  const trainingUsed = overview.value?.trainingCount || 0
  const domainsUsed = overview.value?.websiteDomainCount || 0
  const whatsappUsed = overview.value?.whatsappCount || 0
  const paid = !!planSlug.value && planSlug.value !== 'starter'

  return [
    { label: 'AI assistants', used: agentsUsed, limit: limits.value.maxAgents || 1, locked: false },
    { label: 'Training sessions', used: trainingUsed, limit: limits.value.maxTrainings || 0, locked: false },
    { label: 'Website domains', used: domainsUsed, limit: limits.value.maxWebsiteDomains || 1, locked: false },
    { label: 'WhatsApp channel', used: whatsappUsed, limit: paid ? Math.max(1, whatsappUsed) : 0, locked: !paid },
  ]
})

const loading = computed(() => !isMounted.value || isLoading.value || overviewLoading.value || sessionsLoading.value || activitiesLoading.value)

const getIcon = (id: string) => {
  if (id === 'messages') return MessageSquare
  if (id === 'agents') return Bot
  if (id === 'training') return Zap
  if (id === 'channels') return Globe
  return Activity
}

const timeAgo = (dateValue?: string | Date | null) => {
  if (!dateValue) return 'just now'
  const date = new Date(dateValue)
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) return `${seconds || 1}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString()
}

const formatLimit = (limit: number) => limit <= 0 ? 'Locked' : limit >= 999999 ? 'Unlimited' : String(limit)
const limitPercent = (used: number, limit: number) => {
  if (limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}
</script>

<template>
  <div class="mt-4 space-y-5 pb-20">
    <div v-if="loading" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div v-for="i in 4" :key="i" class="rounded-[1.35rem] bg-background-card/75 p-5 shadow-sm shadow-black/5 ring-1 ring-foreground/[0.06]">
        <div class="mb-5 flex items-center justify-between">
          <Skeleton width="42px" height="42px" rounded="12px" />
          <Skeleton width="44px" height="12px" />
        </div>
        <Skeleton width="90px" height="10px" class="mb-3" />
        <Skeleton width="120px" height="28px" />
      </div>
    </div>

    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div v-for="stat in stats" :key="stat.name" class="group rounded-[1.35rem] bg-background-card/75 p-5 shadow-sm shadow-black/5 ring-1 ring-foreground/[0.06] transition hover:bg-foreground/[0.025]">
        <div class="mb-4 flex items-center justify-between">
          <div class="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-primary/10 text-primary/80 transition group-hover:bg-primary/15 group-hover:text-primary">
            <component :is="getIcon(stat.id)" class="h-5 w-5" />
          </div>
          <span class="text-[10px] font-black uppercase tracking-widest text-foreground/40">{{ stat.change }}</span>
        </div>
        <p class="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/45">{{ stat.name }}</p>
        <p class="mt-2 text-3xl font-black tracking-tight text-foreground">{{ stat.value }}</p>
      </div>
    </div>

    <div v-if="loading" class="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
      <div class="rounded-[1.5rem] bg-background-card/75 p-6 ring-1 ring-foreground/[0.06]">
        <Skeleton width="12rem" height="1.4rem" class="mb-6" />
        <div class="space-y-4">
          <Skeleton v-for="row in 5" :key="row" height="4rem" radius="1rem" />
        </div>
      </div>
      <div class="rounded-[1.5rem] bg-background-card/75 p-6 ring-1 ring-foreground/[0.06]">
        <Skeleton width="9rem" height="1.2rem" class="mb-6" />
        <Skeleton v-for="row in 4" :key="row" height="4.5rem" radius="1rem" class="mb-4" />
      </div>
    </div>

    <div v-else class="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
      <section class="rounded-[1.5rem] bg-background-card/75 p-5 shadow-sm shadow-black/5 ring-1 ring-foreground/[0.06] sm:p-6">
        <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Latest conversations</p>
            <h2 class="mt-2 text-xl font-black tracking-tight text-foreground">Recent customer chats</h2>
          </div>
          <NuxtLink to="/dashboard/conversations" class="inline-flex items-center gap-2 rounded-[0.95rem] bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary ring-1 ring-primary/15 transition hover:bg-primary/15">
            Open inbox
            <ArrowUpRight class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>

        <div v-if="recentSessions && recentSessions.length" class="space-y-3">
          <NuxtLink v-for="session in recentSessions" :key="session.id" to="/dashboard/conversations" class="group block rounded-[1.2rem] bg-background/45 p-4 ring-1 ring-foreground/[0.05] transition hover:bg-foreground/[0.035]">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(212,175,55,0.35)]"></span>
                  <p class="truncate text-sm font-black text-foreground">{{ session.chatbots?.name || 'Assistant conversation' }}</p>
                </div>
                <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/55">
                  {{ session.latestMessage?.content || 'Conversation opened. No message preview yet.' }}
                </p>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-[10px] font-black uppercase tracking-widest text-foreground/35">{{ timeAgo(session.latestMessage?.created_at || session.created_at) }}</p>
                <p class="mt-2 rounded-full bg-foreground/5 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-foreground/40">{{ session.messageCount }} msgs</p>
              </div>
            </div>
          </NuxtLink>
        </div>

        <div v-else class="flex min-h-[300px] flex-col items-center justify-center rounded-[1.4rem] border border-dashed border-foreground/[0.08] bg-background/35 p-8 text-center">
          <MessageSquare class="mb-4 h-12 w-12 text-foreground/20" />
          <h3 class="text-lg font-black text-foreground">No conversations yet</h3>
          <p class="mt-2 max-w-md text-sm leading-relaxed text-foreground/50">Train your assistant and connect a website widget. New customer conversations will appear here first.</p>
          <NuxtLink to="/dashboard/agents/skills" class="mt-5 inline-flex items-center gap-2 rounded-[0.95rem] bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black transition hover:brightness-95">
            Train assistant
            <ChevronRight class="h-4 w-4" />
          </NuxtLink>
        </div>
      </section>

      <aside class="space-y-6">
        <section class="rounded-[1.5rem] bg-background-card/75 p-5 shadow-sm shadow-black/5 ring-1 ring-foreground/[0.06] sm:p-6">
          <div class="mb-5 flex items-center justify-between gap-4">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Limits comparison</p>
              <h2 class="mt-2 text-xl font-black tracking-tight text-foreground">Plan usage</h2>
            </div>
            <div class="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
              <Gauge class="h-5 w-5" />
            </div>
          </div>

          <div class="space-y-4">
            <div v-for="row in limitRows" :key="row.label" class="rounded-[1.15rem] bg-background/45 p-4 ring-1 ring-foreground/[0.05]">
              <div class="mb-3 flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <Lock v-if="row.locked" class="h-3.5 w-3.5 text-foreground/35" />
                  <CheckCircle2 v-else class="h-3.5 w-3.5 text-primary" />
                  <p class="text-xs font-black uppercase tracking-widest text-foreground/60">{{ row.label }}</p>
                </div>
                <p class="text-xs font-black text-foreground">{{ row.used }} / {{ formatLimit(row.limit) }}</p>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-foreground/5">
                <div class="h-full rounded-full transition-all" :class="row.locked ? 'bg-foreground/[0.18]' : 'bg-primary'" :style="{ width: `${limitPercent(row.used, row.limit)}%` }"></div>
              </div>
            </div>
          </div>

          <NuxtLink to="/dashboard/pricing" class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[0.95rem] bg-primary/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-primary ring-1 ring-primary/15 transition hover:bg-primary/15">
            Compare plans
            <ChevronRight class="h-4 w-4" />
          </NuxtLink>
        </section>

        <section class="rounded-[1.5rem] bg-background-card/75 p-5 shadow-sm shadow-black/5 ring-1 ring-foreground/[0.06] sm:p-6">
          <div class="mb-5 flex items-center justify-between gap-4">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Activity</p>
              <h2 class="mt-2 text-lg font-black tracking-tight text-foreground">Recent updates</h2>
            </div>
            <Activity class="h-5 w-5 text-foreground/35" />
          </div>

          <div v-if="activities && activities.length" class="space-y-4">
            <div v-for="activity in activities" :key="activity.id" class="flex gap-3">
              <div class="flex flex-col items-center pt-1">
                <div class="h-2 w-2 rounded-full bg-primary"></div>
                <div class="my-2 w-px flex-1 bg-foreground/10"></div>
              </div>
              <div class="pb-2">
                <p class="text-xs font-black capitalize leading-tight text-foreground">{{ activity.type.replace('_', ' ') }}</p>
                <p class="mt-1 text-[9px] font-bold uppercase tracking-widest text-foreground/40">{{ timeAgo(activity.created_at) }} • {{ activity.source || 'System' }}</p>
              </div>
            </div>
          </div>

          <div v-else-if="activitiesLoading" class="flex items-center justify-center py-10">
            <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary"></div>
          </div>
          <div v-else class="py-10 text-center">
            <Activity class="mx-auto mb-3 h-10 w-10 text-foreground/15" />
            <p class="text-[10px] font-black uppercase tracking-widest text-foreground/40">No activity yet</p>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>
