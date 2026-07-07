<script setup lang="ts">
import {
  Activity,
  AlertCircle,
  Bot,
  BrainCircuit,
  CreditCard,
  Database,
  Globe2,
  Instagram,
  MessageCircle,
  MessageSquare,
  TrendingUp,
  Wrench
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })

useHead({ title: 'Analytics' })

const { userId } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()

const selectedBotId = useState<string>('dashboard-analytics-selected-bot-id', () => 'all')
const selectedChannel = useState<'all' | 'whatsapp' | 'web' | 'instagram'>('dashboard-analytics-selected-channel', () => 'all')
selectedChannel.value = 'all'
const analyticsBotOptions = useState<Array<{ label: string; value: string }>>('dashboard-analytics-bot-options', () => [{ label: 'All chatbots', value: 'all' }])
const chartRange = ref<'24h' | '7d' | '30d' | '90d' | '180d'>('30d')
const chartChannel = ref<'all' | 'web' | 'whatsapp' | 'instagram'>('all')

type ChatbotOption = { id: string; name: string; enabled_tools?: string[] | null; tools_config?: Record<string, any> | null }
type ChatMessage = { id: string; role: string | null; content: string | null; created_at: string | null }
type RawSession = {
  id: string
  chatbot_id: string | null
  created_at: string | null
  metadata: any
  chat_messages?: ChatMessage[]
}

const chartFilters = [
  { label: '24H', value: '24h', days: 1 },
  { label: 'WK', value: '7d', days: 7 },
  { label: 'Month', value: '30d', days: 30 },
  { label: '3M', value: '90d', days: 90 },
  { label: '6M', value: '180d', days: 180 },
] as const

const channelFilters = [
  { label: 'All', value: 'all', icon: Activity, activeClass: 'border-primary/45 bg-primary/18 text-primary shadow-sm shadow-primary/10', inactiveClass: 'border-foreground/10 bg-background/60 text-foreground/60 hover:border-primary/35 hover:bg-primary/10 hover:text-primary' },
  { label: 'Web', value: 'web', icon: Globe2, activeClass: 'border-sky-400/45 bg-sky-400/15 text-sky-300 shadow-sm shadow-sky-400/10', inactiveClass: 'border-foreground/10 bg-background/60 text-foreground/60 hover:border-sky-400/35 hover:bg-sky-400/10 hover:text-sky-300' },
  { label: 'WhatsApp', value: 'whatsapp', icon: MessageCircle, activeClass: 'border-emerald-400/45 bg-emerald-400/15 text-emerald-300 shadow-sm shadow-emerald-400/10', inactiveClass: 'border-foreground/10 bg-background/60 text-foreground/60 hover:border-emerald-400/35 hover:bg-emerald-400/10 hover:text-emerald-300' },
  { label: 'Instagram', value: 'instagram', icon: Instagram, activeClass: 'border-pink-400/45 bg-pink-400/15 text-pink-300 shadow-sm shadow-pink-400/10', inactiveClass: 'border-foreground/10 bg-background/60 text-foreground/60 hover:border-pink-400/35 hover:bg-pink-400/10 hover:text-pink-300' },
] as const

const { data: chatbots, pending: loadingChatbots } = await useAsyncData('analytics-chatbots', async () => {
  if (!userId.value) return []

  const { data, error } = await supabase
    .from('chatbots')
    .select('id, name, enabled_tools, tools_config')
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

watchEffect(() => {
  analyticsBotOptions.value = botOptions.value
})

const activeBotIds = computed(() => {
  const ids = (chatbots.value || []).map((bot) => bot.id)
  if (selectedBotId.value !== 'all' && ids.includes(selectedBotId.value)) return [selectedBotId.value]
  return ids
})

const selectedBot = computed(() => {
  if (selectedBotId.value === 'all') return null
  return (chatbots.value || []).find((bot) => bot.id === selectedBotId.value) || null
})

const selectedBotName = computed(() => selectedBot.value?.name || (selectedBotId.value === 'all' ? 'All chatbots' : 'Selected chatbot'))

const { data: rawSessions, pending: loadingSessions } = await useAsyncData('analytics-conversation-sessions', async () => {
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

const { data: trainingJobs, pending: loadingTraining } = await useAsyncData('analytics-training-jobs', async () => {
  if (!userId.value || activeBotIds.value.length === 0) return []

  const { data, error } = await supabase
    .from('training_jobs')
    .select('id, chatbot_id, status, started_at')
    .in('chatbot_id', activeBotIds.value)
    .order('started_at', { ascending: false, nullsFirst: false })
    .limit(1000)

  if (error) {
    console.error('[Analytics training jobs]', error)
    return []
  }

  return data || []
}, { watch: [userId, selectedBotId, chatbots] })

const isLoading = computed(() => loadingChatbots.value || loadingSessions.value || loadingTraining.value)

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

const formatConfigLabel = (value: string) => String(value || '')
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase())

const trainingCountByBot = computed(() => (trainingJobs.value || []).reduce((map: Record<string, number>, job: any) => {
  const id = String(job?.chatbot_id || '')
  if (!id) return map
  map[id] = (map[id] || 0) + 1
  return map
}, {}))

const selectedAssistantTools = computed(() => Array.isArray(selectedBot.value?.enabled_tools) ? selectedBot.value.enabled_tools.filter(Boolean) : [])
const selectedAssistantSkills = computed(() => {
  const skills = selectedBot.value?.tools_config?.assistant_skills
  return Array.isArray(skills) ? skills.filter(Boolean) : []
})
const selectedAssistantTrainingCount = computed(() => selectedBot.value ? trainingCountByBot.value[selectedBot.value.id] || 0 : 0)
const selectedAssistantConversations = computed(() => selectedBot.value ? conversations.value.filter((conversation) => conversation.chatbotId === selectedBot.value?.id).length : summary.value.conversations)

const allAssistantToolsCount = computed(() => (chatbots.value || []).reduce((total, bot) => total + (Array.isArray(bot.enabled_tools) ? bot.enabled_tools.length : 0), 0))
const allAssistantSkillsCount = computed(() => (chatbots.value || []).reduce((total, bot) => {
  const skills = bot.tools_config?.assistant_skills
  return total + (Array.isArray(skills) ? skills.length : 0)
}, 0))
const totalTrainingSessions = computed(() => (trainingJobs.value || []).length)
const selectedPaymentEnabled = computed(() => selectedAssistantTools.value.includes('payments'))
const paymentEnabledCount = computed(() => (chatbots.value || []).filter((bot) => Array.isArray(bot.enabled_tools) && bot.enabled_tools.includes('payments')).length)

const statusCards = computed(() => selectedBot.value ? [
  { label: 'Tools', value: selectedAssistantTools.value.length, detail: selectedAssistantTools.value.length ? 'Can take actions' : 'No tools added', icon: Wrench, tone: 'amber' },
  { label: 'Skills', value: selectedAssistantSkills.value.length, detail: selectedAssistantSkills.value.length ? 'Reply rules active' : 'No skills added', icon: BrainCircuit, tone: 'violet' },
  { label: 'Payments', value: selectedPaymentEnabled.value ? 'On' : 'Off', detail: selectedPaymentEnabled.value ? 'Mobile checkout ready' : 'Checkout disabled', icon: CreditCard, tone: selectedPaymentEnabled.value ? 'green' : 'primary' },
] : [
  { label: 'Tools', value: allAssistantToolsCount.value, detail: 'Total tools added', icon: Wrench, tone: 'amber' },
  { label: 'Skills', value: allAssistantSkillsCount.value, detail: 'Total skills added', icon: BrainCircuit, tone: 'violet' },
  { label: 'Payments', value: paymentEnabledCount.value, detail: 'Bots with checkout', icon: CreditCard, tone: paymentEnabledCount.value ? 'green' : 'primary' },
])

const insightCards = computed(() => selectedBot.value ? [
  { label: 'Chats', value: selectedAssistantConversations.value, detail: 'Customer conversations', icon: MessageSquare, tone: 'blue' },
  { label: 'Training', value: selectedAssistantTrainingCount.value, detail: 'Knowledge updates', icon: Database, tone: 'green' },
  { label: 'Channels', value: summary.value.conversations, detail: `Web ${summary.value.web} · WA ${summary.value.whatsapp} · IG ${summary.value.instagram}`, icon: Globe2, tone: 'pink' },
  { label: 'Messages', value: summary.value.totalMessages, detail: `User ${summary.value.userMessages} · AI ${summary.value.botReplies}`, icon: MessageCircle, tone: 'primary' },
] : [
  { label: 'Chats', value: summary.value.conversations, detail: `${formatNumber(summary.value.totalMessages)} messages`, icon: MessageSquare, tone: 'blue' },
  { label: 'AI replies', value: summary.value.botReplies, detail: `${formatNumber(summary.value.userMessages)} user messages`, icon: Bot, tone: 'primary' },
  { label: 'Tools', value: allAssistantToolsCount.value, detail: 'Total tools added', icon: Wrench, tone: 'amber' },
  { label: 'Training', value: totalTrainingSessions.value, detail: 'Knowledge updates', icon: Database, tone: 'green' },
  { label: 'Channels', value: summary.value.conversations, detail: `Web ${summary.value.web} · WA ${summary.value.whatsapp} · IG ${summary.value.instagram}`, icon: Globe2, tone: 'pink' },
  { label: 'Messages', value: summary.value.totalMessages, detail: `User ${summary.value.userMessages} · AI ${summary.value.botReplies}`, icon: MessageCircle, tone: 'primary' },
])

const insightToneClass = (tone: string) => ({
  primary: 'bg-primary/10 text-primary ring-primary/15',
  blue: 'bg-sky-400/10 text-sky-400 ring-sky-400/15',
  green: 'bg-emerald-400/10 text-emerald-400 ring-emerald-400/15',
  amber: 'bg-amber-400/10 text-amber-400 ring-amber-400/15',
  pink: 'bg-pink-400/10 text-pink-400 ring-pink-400/15',
  violet: 'bg-violet-400/10 text-violet-400 ring-violet-400/15',
}[tone] || 'bg-foreground/5 text-foreground/60 ring-foreground/10')

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
  const selected = chartFilters.find((item) => item.value === chartRange.value) || chartFilters[2]
  const isHourly = selected.value === '24h'
  const now = new Date()

  if (isHourly) {
    return Array.from({ length: 24 }, (_, index) => {
      const hour = new Date(now)
      hour.setHours(now.getHours() - (23 - index), 0, 0, 0)
      const nextHour = new Date(hour)
      nextHour.setHours(hour.getHours() + 1)
      const list = conversations.value.filter((conversation) => {
        const created = new Date(conversation.createdAt || 0)
        return created >= hour && created < nextHour
      })
      const userMessages = list.reduce((sum, conversation) => sum + conversation.userMessages, 0)
      const botReplies = list.reduce((sum, conversation) => sum + conversation.botMessages, 0)
      const totalMessages = list.reduce((sum, conversation) => sum + conversation.messageCount, 0)
      return {
        date: hour.toISOString(),
        label: hour.toLocaleTimeString(undefined, { hour: '2-digit' }),
        count: list.length,
        userMessages,
        botReplies,
        totalMessages,
        website: list.filter((conversation) => conversation.channel === 'web').length,
        whatsapp: list.filter((conversation) => conversation.channel === 'whatsapp').length,
        instagram: list.filter((conversation) => conversation.channel === 'instagram').length,
        replyShare: totalMessages > 0 ? Math.round((botReplies / totalMessages) * 100) : 0
      }
    })
  }

  const days = []
  for (let i = selected.days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const list = conversations.value.filter((conversation) => conversation.createdAt?.startsWith(dateStr))
    const userMessages = list.reduce((sum, conversation) => sum + conversation.userMessages, 0)
    const botReplies = list.reduce((sum, conversation) => sum + conversation.botMessages, 0)
    const totalMessages = list.reduce((sum, conversation) => sum + conversation.messageCount, 0)

    days.push({
      date: dateStr,
      label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: list.length,
      userMessages,
      botReplies,
      totalMessages,
      website: list.filter((conversation) => conversation.channel === 'web').length,
      whatsapp: list.filter((conversation) => conversation.channel === 'whatsapp').length,
      instagram: list.filter((conversation) => conversation.channel === 'instagram').length,
      replyShare: totalMessages > 0 ? Math.round((botReplies / totalMessages) * 100) : 0
    })
  }

  return days
})

const chartTotal = computed(() => chartData.value.reduce((sum, point) => sum + point.count, 0))
const chartMax = computed(() => Math.max(1, ...chartData.value.flatMap((point) => [point.count, point.website, point.whatsapp, point.instagram])))
const buildChartPath = (field: 'count' | 'website' | 'whatsapp' | 'instagram') => chartData.value.map((point, index) => {
  const x = chartData.value.length <= 1 ? 0 : (index / (chartData.value.length - 1)) * 100
  const y = 100 - (((point[field] || 0) / chartMax.value) * 76 + 12)
  return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
}).join(' ')
const chartPath = computed(() => buildChartPath('count'))
const websiteChartPath = computed(() => buildChartPath('website'))
const whatsappChartPath = computed(() => buildChartPath('whatsapp'))
const instagramChartPath = computed(() => buildChartPath('instagram'))
const chartAreaPath = computed(() => chartPath.value ? `${chartPath.value} L 100 100 L 0 100 Z` : '')
const chartScaleLabels = computed(() => [
  { label: formatNumber(chartMax.value), position: 'top-4' },
  { label: formatNumber(Math.ceil(chartMax.value / 2)), position: 'top-1/2 -translate-y-1/2' },
  { label: '0', position: 'bottom-11' },
])
const hasChartActivity = computed(() => chartData.value.some((point) => point.count > 0 || point.totalMessages > 0))

const analysisCards = computed(() => {
  const avgMessages = summary.value.conversations > 0 ? summary.value.totalMessages / summary.value.conversations : 0
  const replyRate = summary.value.userMessages > 0 ? (summary.value.botReplies / summary.value.userMessages) * 100 : 0
  const peakDay = [...chartData.value].sort((a, b) => b.count - a.count)[0]

  return [
    {
      label: 'Avg. messages',
      value: avgMessages.toFixed(1),
      detail: `${formatNumber(summary.value.totalMessages)} total messages`,
      icon: Activity
    },
    {
      label: 'AI coverage',
      value: `${Math.round(replyRate)}%`,
      detail: `${formatNumber(summary.value.botReplies)} replies to ${formatNumber(summary.value.userMessages)} user messages`,
      icon: Bot
    },
    {
      label: 'Busiest day',
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

const openSelectedBotConversations = () => {
  if (!selectedBot.value) return
  const conversationBotId = useState<string>('selected-chatbot-id', () => '')
  conversationBotId.value = selectedBot.value.id
  navigateTo('/dashboard/conversations')
}
</script>

<template>
  <div class="min-h-[calc(100vh-4.5rem)] space-y-5 pt-[5vh] pb-24 lg:pb-0" style="zoom: 0.95">
    <template v-if="isLoading && !rawSessions">
      <div class="h-[360px] animate-pulse rounded-[0.39rem] border border-foreground/10 bg-foreground/5" />
      <div class="h-[360px] animate-pulse rounded-[0.39rem] border border-foreground/10 bg-foreground/5" />
    </template>

    <template v-else>
      <section class="rounded-[0.39rem] p-5 sm:p-6">
        <div class="mb-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_18rem_22rem]">
          <div class="rounded-[0.39rem] bg-background/25 p-3">
            <p class="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground"><Activity class="h-4 w-4 text-primary" />Overview</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <div
                v-for="card in insightCards"
                :key="card.label"
                class="group flex items-center gap-2 rounded-[0.39rem] bg-background/45 py-3 pl-3 pr-1 transition hover:bg-foreground/[0.035]"
              >
                <div :class="['flex h-[2.65rem] w-[2.65rem] shrink-0 items-center justify-center rounded-[0.39rem] ring-1 transition group-hover:scale-105', insightToneClass(card.tone)]">
                  <component :is="card.icon" class="h-[1.15rem] w-[1.15rem]" />
                </div>
                <div class="min-w-0">
                  <p class="text-lg font-bold leading-none tracking-tight tabular-nums text-foreground">{{ formatNumber(card.value) }}</p>
                  <p class="mt-1 truncate text-sm font-semibold text-foreground/75">{{ card.label }}</p>
                  <p class="mt-0.5 truncate text-[11px] font-semibold text-foreground/50">{{ card.detail }}</p>
                </div>
              </div>
            </div>

          </div>

          <div class="space-y-2 rounded-[0.39rem] bg-background/20 p-3">
            <div
              v-for="card in statusCards"
              :key="card.label"
              class="flex items-center gap-2 rounded-[0.39rem] bg-background/45 px-3 py-2.5"
            >
              <div :class="['flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.35rem] ring-1', insightToneClass(card.tone)]">
                <component :is="card.icon" class="h-4 w-4" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-xs font-bold text-foreground">{{ card.label }}</p>
                <p class="truncate text-[11px] font-medium text-foreground/45">{{ card.detail }}</p>
              </div>
              <span class="shrink-0 text-sm font-bold tabular-nums text-foreground">{{ typeof card.value === 'number' ? formatNumber(card.value) : card.value }}</span>
            </div>
          </div>

          <aside class="space-y-3 rounded-[0.39rem] bg-background/15 p-3">
            <div class="divide-y divide-foreground/[0.06] overflow-hidden rounded-[0.39rem] bg-background/35">
              <div v-for="item in analysisCards" :key="item.label" class="px-3 py-2.5">
                <p class="truncate text-xs font-bold text-foreground">{{ item.label }}</p>
                <p class="mt-1 truncate text-[11px] font-medium text-foreground/45">{{ item.detail }}</p>
                <p class="mt-1 text-lg font-bold tabular-nums text-foreground">{{ item.value }}</p>
              </div>
            </div>

          </aside>
        </div>

        <div class="rounded-[0.39rem] border border-foreground/10 bg-background/20 p-3">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="flex items-center gap-1.5 text-sm font-bold text-foreground"><TrendingUp class="h-4 w-4 text-primary" />Channel activity</p>
            <p class="dashboard-muted mt-1"><span class="tabular-nums font-bold text-foreground/70">{{ formatNumber(chartTotal) }}</span> conversations · {{ selectedBotName }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-if="selectedBot"
              type="button"
              class="dashboard-action-label inline-flex items-center gap-1.5 rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 py-2 text-foreground/60 transition hover:border-primary/20 hover:text-primary"
              @click="openSelectedBotConversations"
            >
              <MessageSquare class="h-3.5 w-3.5" />
              <span>Open conversations</span>
            </button>
            <div class="flex w-fit gap-1 rounded-[0.39rem] border border-foreground/10 bg-background/55 p-1">
              <button
                v-for="filter in channelFilters"
                :key="filter.value"
                type="button"
                :class="[
                  'dashboard-action-label inline-flex items-center gap-1.5 rounded-[0.3rem] border px-2.5 py-1.5 transition',
                  chartChannel === filter.value ? filter.activeClass : filter.inactiveClass
                ]"
                @click="chartChannel = filter.value"
              >
                <component :is="filter.icon" class="h-3.5 w-3.5" />
                <span>{{ filter.label }}</span>
              </button>
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
        </div>

        <div
          class="relative min-h-[15rem] overflow-hidden rounded-[0.39rem] border border-foreground/15 bg-background/35 p-4 pl-11 ring-1 ring-foreground/[0.04]"
          style="background-image: linear-gradient(rgb(var(--surface-border) / 0.055) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--surface-border) / 0.055) 1px, transparent 1px); background-size: 2.25rem 2.25rem;"
        >
          <span
            v-for="scale in chartScaleLabels"
            :key="scale.label + scale.position"
            :class="['absolute left-3 z-20 text-[10px] font-bold tabular-nums text-foreground/40', scale.position]"
          >
            {{ scale.label }}
          </span>

          <div v-if="!hasChartActivity" class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <MessageCircle class="h-9 w-9 text-foreground/20" />
            <p class="dashboard-eyebrow text-foreground/45">No activity recorded yet</p>
          </div>

          <svg v-else viewBox="0 0 100 100" preserveAspectRatio="none" class="relative z-10 h-40 w-full overflow-visible">
            <path v-if="chartChannel === 'all' && chartAreaPath" :d="chartAreaPath" fill="currentColor" class="text-primary/10" />
            <path v-if="chartChannel === 'all' && websiteChartPath" :d="websiteChartPath" fill="none" vector-effect="non-scaling-stroke" class="stroke-sky-400/85" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
            <path v-if="chartChannel === 'all' && whatsappChartPath" :d="whatsappChartPath" fill="none" vector-effect="non-scaling-stroke" class="stroke-emerald-400/85" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
            <path v-if="chartChannel === 'all' && instagramChartPath" :d="instagramChartPath" fill="none" vector-effect="non-scaling-stroke" class="stroke-pink-400/85" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
            <path v-if="chartChannel === 'all' && chartPath" :d="chartPath" fill="none" vector-effect="non-scaling-stroke" class="stroke-primary" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
            <path v-if="chartChannel === 'web' && websiteChartPath" :d="websiteChartPath" fill="none" vector-effect="non-scaling-stroke" class="stroke-sky-400" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
            <path v-if="chartChannel === 'whatsapp' && whatsappChartPath" :d="whatsappChartPath" fill="none" vector-effect="non-scaling-stroke" class="stroke-emerald-400" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
            <path v-if="chartChannel === 'instagram' && instagramChartPath" :d="instagramChartPath" fill="none" vector-effect="non-scaling-stroke" class="stroke-pink-400" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
          </svg>

          <div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/35">
            <span>{{ chartData[0]?.label }}</span>
            <div class="flex items-center gap-3">
              <span v-if="chartChannel === 'all'" class="inline-flex items-center gap-1"><i class="h-1.5 w-1.5 rounded-full bg-primary"></i>Total</span>
              <span v-if="chartChannel === 'all' || chartChannel === 'web'" class="inline-flex items-center gap-1"><i class="h-1.5 w-1.5 rounded-full bg-sky-400"></i>Web</span>
              <span v-if="chartChannel === 'all' || chartChannel === 'whatsapp'" class="inline-flex items-center gap-1"><i class="h-1.5 w-1.5 rounded-full bg-emerald-400"></i>WhatsApp</span>
              <span v-if="chartChannel === 'all' || chartChannel === 'instagram'" class="inline-flex items-center gap-1"><i class="h-1.5 w-1.5 rounded-full bg-pink-400"></i>Instagram</span>
            </div>
            <span>{{ chartData[chartData.length - 1]?.label }}</span>
          </div>
        </div>
        </div>
      </section>


    </template>

    <section v-if="!isLoading && !(chatbots || []).length" class="rounded-[0.39rem] border border-dashed border-foreground/10 bg-background/35 p-6 text-center">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-[0.39rem] bg-foreground/5 text-foreground/25">
        <AlertCircle class="h-8 w-8" />
      </div>
      <h2 class="mt-5 text-xl font-bold tracking-tight text-foreground">No chatbots found</h2>
      <p class="mt-2 text-sm text-foreground/50">Create a chatbot first, then analytics will appear here.</p>
    </section>
  </div>
</template>
