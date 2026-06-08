<script setup lang="ts">
import {
  Activity,
  AlertCircle,
  Bot,
  Globe2,
  Instagram,
  MessageCircle,
  RefreshCw,
  TrendingUp
} from 'lucide-vue-next'
import CustomSelect from '~~/app/components/CustomSelect.vue'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })

useHead({ title: 'Analytics' })

const { userId } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()

const selectedBotId = ref('all')
const selectedChannel = ref<'all' | 'whatsapp' | 'web' | 'instagram'>('all')
const isRefreshing = ref(false)

type ChatbotOption = { id: string; name: string }
type ChatMessage = { id: string; role: string | null; content: string | null; created_at: string | null }
type RawSession = {
  id: string
  chatbot_id: string | null
  created_at: string | null
  metadata: any
  chat_messages?: ChatMessage[]
}

const channelOptions = [
  { label: 'All', value: 'all' as const },
  { label: 'WhatsApp', value: 'whatsapp' as const },
  { label: 'Website', value: 'web' as const },
  { label: 'Instagram', value: 'instagram' as const }
]

const { data: chatbots, pending: loadingChatbots, refresh: refreshChatbots } = await useAsyncData('analytics-chatbots', async () => {
  if (!userId.value) return []

  const { data, error } = await supabase
    .from('chatbots')
    .select('id, name')
    .eq('user_id', userId.value)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Analytics chatbots]', error)
    notify.error('Failed to load chatbots.')
    return []
  }

  return (data || []) as ChatbotOption[]
}, { watch: [userId] })

const botOptions = computed(() => [
  { label: 'All chatbots', value: 'all' },
  ...(chatbots.value || []).map((bot) => ({ label: bot.name, value: bot.id }))
])

const activeBotIds = computed(() => {
  const ids = (chatbots.value || []).map((bot) => bot.id)
  if (selectedBotId.value !== 'all' && ids.includes(selectedBotId.value)) return [selectedBotId.value]
  return ids
})

const selectedBotName = computed(() => {
  if (selectedBotId.value === 'all') return 'All chatbots'
  return (chatbots.value || []).find((bot) => bot.id === selectedBotId.value)?.name || 'Selected chatbot'
})

const { data: rawSessions, pending: loadingSessions, refresh: refreshSessions } = await useAsyncData('analytics-conversation-sessions', async () => {
  if (!userId.value || activeBotIds.value.length === 0) return []

  const { data, error } = await supabase
    .from('chat_sessions')
    .select(`
      id,
      chatbot_id,
      created_at,
      metadata,
      chat_messages (
        id,
        role,
        content,
        created_at
      )
    `)
    .in('chatbot_id', activeBotIds.value)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[Analytics sessions]', error)
    notify.error('Failed to load conversation analytics.')
    return []
  }

  return ((data || []) as RawSession[]).map((session) => ({
    ...session,
    chat_messages: (session.chat_messages || []).sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
  }))
}, { watch: [userId, selectedBotId, chatbots] })

const isLoading = computed(() => loadingChatbots.value || loadingSessions.value)

const refreshAnalytics = async () => {
  isRefreshing.value = true
  try {
    await refreshChatbots()
    await refreshSessions()
  } catch (err) {
    console.error('[Analytics refresh]', err)
    notify.error('Failed to refresh analytics.')
  } finally {
    isRefreshing.value = false
  }
}

const getSessionChannel = (session: RawSession): 'whatsapp' | 'web' | 'instagram' => {
  const type = String(session?.metadata?.channel || session?.metadata?.type || 'web').toLowerCase()
  if (type === 'whatsapp') return 'whatsapp'
  if (type === 'instagram') return 'instagram'
  return 'web'
}

const getChatbotName = (chatbotId: string | null) => {
  return (chatbots.value || []).find((bot) => bot.id === chatbotId)?.name || 'Unknown chatbot'
}

const allSessions = computed(() => rawSessions.value || [])

const channelFilteredSessions = computed(() => {
  if (selectedChannel.value === 'all') return allSessions.value
  return allSessions.value.filter((session) => getSessionChannel(session) === selectedChannel.value)
})

const conversations = computed(() => channelFilteredSessions.value
  .map((session) => {
    const messages = session.chat_messages || []
    const userMessages = messages.filter((message) => message.role === 'user').length
    const botMessages = messages.filter((message) => message.role === 'assistant').length
    const lastMessage = messages[messages.length - 1]
    const lastReply = [...messages].reverse().find((message) => message.role === 'assistant')

    return {
      id: session.id,
      chatbotId: session.chatbot_id,
      chatbotName: getChatbotName(session.chatbot_id),
      channel: getSessionChannel(session),
      createdAt: session.created_at,
      lastMessageAt: lastMessage?.created_at || session.created_at,
      lastReplyAt: lastReply?.created_at || null,
      messageCount: messages.length,
      userMessages,
      botMessages,
      preview: truncatePreview(lastMessage?.content || ''),
      lastReply: truncatePreview(lastReply?.content || '')
    }
  })
  .filter((conversation) => conversation.messageCount > 0)
  .sort((a, b) => new Date(b.lastMessageAt || b.createdAt || 0).getTime() - new Date(a.lastMessageAt || a.createdAt || 0).getTime())
)

const summary = computed(() => {
  const list = conversations.value
  const totalMessages = list.reduce((sum, conversation) => sum + conversation.messageCount, 0)
  const botReplies = list.reduce((sum, conversation) => sum + conversation.botMessages, 0)
  const userMessages = list.reduce((sum, conversation) => sum + conversation.userMessages, 0)
  const whatsapp = list.filter((conversation) => conversation.channel === 'whatsapp').length
  const instagram = list.filter((conversation) => conversation.channel === 'instagram').length
  const web = list.filter((conversation) => conversation.channel === 'web').length

  return {
    conversations: list.length,
    totalMessages,
    userMessages,
    botReplies,
    whatsapp,
    instagram,
    web
  }
})

const stats = computed(() => [
  { label: 'Conversations', value: summary.value.conversations, sub: `${summary.value.totalMessages.toLocaleString()} total messages`, icon: MessageCircle },
  { label: 'AI replies', value: summary.value.botReplies, sub: `${summary.value.userMessages.toLocaleString()} user messages`, icon: Bot },
  { label: 'Channels', value: summary.value.web + summary.value.whatsapp + summary.value.instagram, sub: `${summary.value.web} website · ${summary.value.whatsapp} WhatsApp · ${summary.value.instagram} Instagram`, icon: Globe2 }
])

const chatbotReports = computed(() => {
  return (chatbots.value || [])
    .filter((bot) => selectedBotId.value === 'all' || bot.id === selectedBotId.value)
    .map((bot) => {
      const list = conversations.value.filter((conversation) => conversation.chatbotId === bot.id)
      const totalMessages = list.reduce((sum, conversation) => sum + conversation.messageCount, 0)
      const userMessages = list.reduce((sum, conversation) => sum + conversation.userMessages, 0)
      const botReplies = list.reduce((sum, conversation) => sum + conversation.botMessages, 0)
      const lastActivity = list[0]?.lastMessageAt || null

      return {
        id: bot.id,
        name: bot.name,
        conversations: list.length,
        website: list.filter((conversation) => conversation.channel === 'web').length,
        whatsapp: list.filter((conversation) => conversation.channel === 'whatsapp').length,
        instagram: list.filter((conversation) => conversation.channel === 'instagram').length,
        totalMessages,
        userMessages,
        botReplies,
        lastActivity
      }
    })
    .sort((a, b) => b.conversations - a.conversations)
})

const chartData = computed(() => {
  const days = []
  for (let i = 13; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const list = conversations.value.filter((conversation) => conversation.createdAt?.startsWith(dateStr))
    const userMessages = list.reduce((sum, conversation) => sum + conversation.userMessages, 0)
    const botReplies = list.reduce((sum, conversation) => sum + conversation.botMessages, 0)
    const totalMessages = list.reduce((sum, conversation) => sum + conversation.messageCount, 0)

    days.push({
      date: dateStr,
      count: list.length,
      userMessages,
      botReplies,
      totalMessages,
      website: list.filter((conversation) => conversation.channel === 'web').length,
      whatsapp: list.filter((conversation) => conversation.channel === 'whatsapp').length,
      instagram: list.filter((conversation) => conversation.channel === 'instagram').length
    })
  }

  const maxConversations = Math.max(...days.map((point) => point.count), 1)
  const maxMessages = Math.max(...days.map((point) => point.totalMessages), 1)

  return days.map((point) => ({
    ...point,
    height: point.count > 0 ? Math.max((point.count / maxConversations) * 100, 10) : 2,
    messageHeight: point.totalMessages > 0 ? Math.max((point.totalMessages / maxMessages) * 100, 10) : 2,
    replyShare: point.totalMessages > 0 ? Math.round((point.botReplies / point.totalMessages) * 100) : 0
  }))
})

const hasChartActivity = computed(() => chartData.value.some((point) => point.count > 0 || point.totalMessages > 0))

const analysisCards = computed(() => {
  const avgMessages = summary.value.conversations > 0 ? summary.value.totalMessages / summary.value.conversations : 0
  const replyRate = summary.value.userMessages > 0 ? (summary.value.botReplies / summary.value.userMessages) * 100 : 0
  const peakDay = [...chartData.value].sort((a, b) => b.count - a.count)[0]

  return [
    {
      label: 'Avg. messages / conversation',
      value: avgMessages.toFixed(1),
      detail: `${formatNumber(summary.value.totalMessages)} total messages`,
      icon: Activity
    },
    {
      label: 'AI reply coverage',
      value: `${Math.round(replyRate)}%`,
      detail: `${formatNumber(summary.value.botReplies)} replies to ${formatNumber(summary.value.userMessages)} user messages`,
      icon: Bot
    },
    {
      label: 'Peak conversation day',
      value: peakDay?.count ? formatDate(peakDay.date) : '—',
      detail: peakDay?.count ? `${peakDay.count} conversations · ${peakDay.totalMessages} messages` : 'No activity yet',
      icon: TrendingUp
    }
  ]
})

const channelBreakdown = computed(() => {
  const total = Math.max(summary.value.web + summary.value.whatsapp + summary.value.instagram, 1)
  return [
    { label: 'Website', value: summary.value.web, percent: Math.round((summary.value.web / total) * 100), color: 'bg-blue-500' },
    { label: 'WhatsApp', value: summary.value.whatsapp, percent: Math.round((summary.value.whatsapp / total) * 100), color: 'bg-emerald-500' },
    { label: 'Instagram', value: summary.value.instagram, percent: Math.round((summary.value.instagram / total) * 100), color: 'bg-pink-500' }
  ]
})

const channelLabel = computed(() => {
  if (selectedChannel.value === 'whatsapp') return 'WhatsApp'
  if (selectedChannel.value === 'instagram') return 'Instagram'
  if (selectedChannel.value === 'web') return 'Website'
  return 'All channels'
})

const formatDate = (date: string | null) => {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(date))
}

const formatDateTime = (date: string | null) => {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}

const truncatePreview = (content: string) => {
  const clean = String(content || '').replace(/\s+/g, ' ').trim()
  return clean.length > 120 ? `${clean.slice(0, 120)}…` : clean
}

const formatNumber = (value: number) => value.toLocaleString()
</script>

<template>
  <div class="space-y-5 pb-24 lg:pb-0">
    <template v-if="isLoading && !rawSessions">
      <div class="grid gap-3 md:grid-cols-3">
        <div v-for="i in 3" :key="i" class="h-24 animate-pulse rounded-xl border border-foreground/10 bg-foreground/5" />
      </div>
      <div class="h-[320px] animate-pulse rounded-2xl border border-foreground/10 bg-foreground/5" />
      <div class="h-[380px] animate-pulse rounded-2xl border border-foreground/10 bg-foreground/5" />
    </template>

    <template v-else>
      <div class="grid gap-3 md:grid-cols-3">
        <article v-for="stat in stats" :key="stat.label" class="rounded-2xl border border-foreground/10 bg-background p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <component :is="stat.icon" class="h-5 w-5" />
            </div>
            <span class="text-[10px] font-black uppercase tracking-widest text-foreground/35">{{ selectedBotName }}</span>
          </div>
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">{{ stat.label }}</p>
          <p class="mt-1 text-3xl font-black tracking-tight text-foreground tabular-nums">{{ formatNumber(stat.value) }}</p>
          <p class="mt-1 text-xs text-foreground/45">{{ stat.sub }}</p>
        </article>
      </div>

      <section class="overflow-hidden rounded-2xl border border-foreground/10 bg-background">
        <div class="space-y-4 border-b border-foreground/10 p-4">
          <div class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Analytics</p>
              <h2 class="mt-1 text-xl font-black tracking-tight text-foreground">{{ selectedBotName }} · {{ channelLabel }}</h2>
              <p class="mt-1 text-sm text-foreground/45">Conversation, message, reply, and channel trends for the last 14 days.</p>
            </div>

            <div class="grid gap-3 md:grid-cols-[minmax(180px,240px)_minmax(280px,1fr)_auto] md:items-center">
              <CustomSelect v-model="selectedBotId" :options="botOptions" placeholder="Select chatbot" />

              <div class="grid grid-cols-3 gap-1 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-1">
                <button
                  v-for="option in channelOptions"
                  :key="option.value"
                  type="button"
                  @click="selectedChannel = option.value"
                  :class="[
                    'rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all',
                    selectedChannel === option.value ? 'bg-primary text-black shadow-sm' : 'text-foreground/50 hover:bg-foreground/5 hover:text-foreground'
                  ]"
                >
                  {{ option.label }}
                </button>
              </div>

              <button
                @click="refreshAnalytics"
                :disabled="isLoading || isRefreshing"
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-foreground/65 transition-all hover:bg-foreground/10 disabled:opacity-50"
              >
                <RefreshCw :class="['h-4 w-4 text-primary transition-transform duration-700', (isLoading || isRefreshing) ? 'animate-spin' : '']" />
                Refresh
              </button>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-3">
            <article v-for="item in analysisCards" :key="item.label" class="rounded-xl border border-foreground/10 bg-foreground/[0.025] p-3.5">
              <div class="flex items-center justify-between gap-3">
                <p class="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/40">{{ item.label }}</p>
                <component :is="item.icon" class="h-4 w-4 text-primary" />
              </div>
              <p class="mt-3 text-2xl font-black tracking-tight text-foreground">{{ item.value }}</p>
              <p class="mt-1 text-xs text-foreground/45">{{ item.detail }}</p>
            </article>
          </div>
        </div>

        <div class="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div class="relative min-h-[300px] rounded-xl border border-foreground/10 bg-gradient-to-b from-foreground/[0.035] to-transparent p-4">
            <div class="mb-4 flex items-center justify-between gap-3">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/40">Daily volume</p>
                <p class="text-sm font-bold text-foreground/70">Conversations with message intensity</p>
              </div>
              <p class="text-xs font-bold text-foreground/40">Last 14 days</p>
            </div>

            <div v-if="!hasChartActivity" class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <MessageCircle class="h-9 w-9 text-foreground/20" />
              <p class="text-[10px] font-black uppercase tracking-widest text-foreground/45">No activity recorded yet</p>
            </div>

            <div v-else class="absolute inset-x-4 bottom-4 top-20 flex items-end justify-between gap-1.5 sm:gap-2">
              <div v-for="(point, index) in chartData" :key="point.date" class="group relative flex h-full flex-1 items-end justify-center">
                <div
                  :class="[
                    'pointer-events-none absolute bottom-full z-30 mb-2 w-36 translate-y-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100',
                    index < 3 ? 'left-0' : index > chartData.length - 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                  ]"
                >
                  <div class="rounded-lg bg-foreground px-2.5 py-2 text-[9px] font-bold text-background shadow-xl ring-1 ring-background/10">
                    <div class="font-black uppercase tracking-tight">{{ formatDate(point.date) }}</div>
                    <div class="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 opacity-75">
                      <span>Conversations</span><span class="text-right">{{ point.count }}</span>
                      <span>Messages</span><span class="text-right">{{ point.totalMessages }}</span>
                      <span>User</span><span class="text-right">{{ point.userMessages }}</span>
                      <span>AI replies</span><span class="text-right">{{ point.botReplies }}</span>
                    </div>
                  </div>
                </div>
                <div class="relative flex h-full w-full max-w-9 items-end justify-center">
                  <div class="absolute bottom-0 w-full rounded-t-xl bg-primary/15" :style="{ height: `${point.messageHeight}%` }" />
                  <div class="relative z-[1] w-2/3 rounded-t-xl bg-gradient-to-t from-primary/90 via-primary/55 to-primary/20 shadow-sm shadow-primary/20 transition-all group-hover:from-primary" :style="{ height: `${point.height}%` }" />
                </div>
              </div>
            </div>
          </div>

          <aside class="space-y-3">
            <div class="rounded-xl border border-foreground/10 bg-foreground/[0.025] p-4">
              <p class="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Channel mix</p>
              <div class="mt-4 space-y-4">
                <div v-for="channel in channelBreakdown" :key="channel.label">
                  <div class="mb-2 flex items-center justify-between text-xs font-bold text-foreground/55">
                    <span>{{ channel.label }}</span>
                    <span>{{ channel.value }} · {{ channel.percent }}%</span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-foreground/10">
                    <div :class="['h-full rounded-full', channel.color]" :style="{ width: `${channel.percent}%` }" />
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-xl border border-foreground/10 bg-foreground/[0.025] p-4">
              <p class="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Message split</p>
              <div class="mt-4 grid grid-cols-2 gap-3">
                <div class="rounded-xl bg-background p-3">
                  <p class="text-[10px] font-black uppercase tracking-widest text-foreground/35">User</p>
                  <p class="mt-1 text-2xl font-black text-foreground">{{ formatNumber(summary.userMessages) }}</p>
                </div>
                <div class="rounded-xl bg-background p-3">
                  <p class="text-[10px] font-black uppercase tracking-widest text-foreground/35">AI replies</p>
                  <p class="mt-1 text-2xl font-black text-primary">{{ formatNumber(summary.botReplies) }}</p>
                </div>
              </div>
              <div class="mt-4 h-2 overflow-hidden rounded-full bg-foreground/10">
                <div class="h-full rounded-full bg-primary" :style="{ width: `${summary.totalMessages ? Math.round((summary.botReplies / summary.totalMessages) * 100) : 0}%` }" />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section class="overflow-hidden rounded-2xl border border-foreground/10 bg-background">
        <div class="border-b border-foreground/10 p-4">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Chatbot report</p>
          <h2 class="mt-1 text-xl font-black tracking-tight text-foreground">Replies and conversations by chatbot</h2>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[860px] text-left">
            <thead class="border-b border-foreground/10 bg-foreground/[0.02]">
              <tr>
                <th class="px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">Chatbot</th>
                <th class="px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">Conversations</th>
                <th class="px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">Website</th>
                <th class="px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">WhatsApp</th>
                <th class="px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">Instagram</th>
                <th class="px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">User messages</th>
                <th class="px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">AI replies</th>
                <th class="px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">Last activity</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-foreground/10">
              <tr v-for="report in chatbotReports" :key="report.id" class="transition-colors hover:bg-foreground/[0.02]">
                <td class="px-5 py-4">
                  <div class="flex items-center gap-2">
                    <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bot class="h-4 w-4" /></span>
                    <span class="max-w-56 truncate text-sm font-black text-foreground">{{ report.name }}</span>
                  </div>
                </td>
                <td class="px-5 py-4 text-sm font-black tabular-nums text-foreground">{{ report.conversations }}</td>
                <td class="px-5 py-4 text-sm font-bold tabular-nums text-foreground/60">{{ report.website }}</td>
                <td class="px-5 py-4 text-sm font-bold tabular-nums text-foreground/60">{{ report.whatsapp }}</td>
                <td class="px-5 py-4 text-sm font-bold tabular-nums text-foreground/60">{{ report.instagram }}</td>
                <td class="px-5 py-4 text-sm font-bold tabular-nums text-foreground/60">{{ report.userMessages }}</td>
                <td class="px-5 py-4 text-sm font-black tabular-nums text-primary">{{ report.botReplies }}</td>
                <td class="px-5 py-4 text-sm font-medium text-foreground/55">{{ formatDateTime(report.lastActivity) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="rounded-2xl border border-foreground/10 bg-background p-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Conversations</p>
            <h2 class="mt-1 text-xl font-black tracking-tight text-foreground">View full conversation history</h2>
            <p class="mt-1 text-sm text-foreground/50">Open the conversations page to search, inspect, export, and analyze individual customer threads.</p>
          </div>
          <NuxtLink
            to="/dashboard/conversations"
            class="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black transition-all hover:translate-y-[-1px] hover:shadow-lg hover:shadow-primary/20"
          >
            View conversations
          </NuxtLink>
        </div>
      </section>
    </template>

    <section v-if="!isLoading && !(chatbots || []).length" class="rounded-2xl border border-dashed border-foreground/10 bg-background p-6 text-center">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-foreground/5 text-foreground/25">
        <AlertCircle class="h-8 w-8" />
      </div>
      <h2 class="mt-5 text-xl font-black tracking-tight text-foreground">No chatbots found</h2>
      <p class="mt-2 text-sm text-foreground/50">Create a chatbot first, then analytics will appear here.</p>
    </section>
  </div>
</template>
