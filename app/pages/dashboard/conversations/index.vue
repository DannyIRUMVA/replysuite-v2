<script setup lang="ts">
import {
  MessageCircle,
  Bot,
  Search,
  User,
  Clock,
  ChevronRight,
  Activity,
  Download,
  Brain,
  Globe,
  Phone,
  Instagram,
  RotateCcw,
  Send,
  UserCheck,
  X
} from 'lucide-vue-next'
definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

useHead({
  title: 'Conversations'
})

const { userId, planSlug } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()

const selectedChatbotId = useState<string>('selected-chatbot-id', () => '')
const activeSessionId = useState<string>('active-session-id', () => '')

const currentPage = ref(1)
const pageSize = 8
const searchQuery = ref('')
const selectedChannel = ref<'all' | 'web' | 'whatsapp' | 'instagram'>('all')
const isMounted = ref(false)
const isExporting = ref(false)
const isAnalyzing = ref(false)
const isTakingOver = ref(false)
const isUpdatingTakeover = ref(false)
const isSendingOperatorReply = ref(false)
const operatorReply = ref('')
type AnalysisReport = {
  id: string
  status: 'running' | 'done' | 'error'
  createdAt: string
  title: string
  summary: string
  meta?: { sessionsAnalyzed?: number; messagesAnalyzed?: number }
  topIntents?: string[]
  painPoints?: string[]
  actionItems?: string[]
}
const analysisReports = ref<AnalysisReport[]>([])
const selectedAnalysisReport = ref<AnalysisReport | null>(null)

onMounted(() => {
  isMounted.value = true
})

const channelFilters = [
  { label: 'All', value: 'all', icon: Activity, activeClass: 'border-primary/45 bg-primary/15 text-primary shadow-sm shadow-primary/10', inactiveClass: 'border-foreground/10 bg-background/60 text-foreground/60 hover:border-primary/35 hover:bg-primary/10 hover:text-primary' },
  { label: 'Web', value: 'web', icon: Globe, activeClass: 'border-sky-400/45 bg-sky-400/15 text-sky-300 shadow-sm shadow-sky-400/10', inactiveClass: 'border-foreground/10 bg-background/60 text-foreground/60 hover:border-sky-400/35 hover:bg-sky-400/10 hover:text-sky-300' },
  { label: 'WhatsApp', value: 'whatsapp', icon: Phone, activeClass: 'border-emerald-400/45 bg-emerald-400/15 text-emerald-300 shadow-sm shadow-emerald-400/10', inactiveClass: 'border-foreground/10 bg-background/60 text-foreground/60 hover:border-emerald-400/35 hover:bg-emerald-400/10 hover:text-emerald-300' },
  { label: 'Instagram', value: 'instagram', icon: Instagram, activeClass: 'border-pink-400/45 bg-pink-400/15 text-pink-300 shadow-sm shadow-pink-400/10', inactiveClass: 'border-foreground/10 bg-background/60 text-foreground/60 hover:border-pink-400/35 hover:bg-pink-400/10 hover:text-pink-300' }
] as const

const { data: chatbots } = await useAsyncData('user-chatbots-conv-v2', async () => {
  if (!userId.value) return []

  const { data } = await supabase
    .from('chatbots')
    .select('id, name')
    .eq('user_id', userId.value)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (data && data.length > 0 && !selectedChatbotId.value) {
    selectedChatbotId.value = data[0].id
  }

  return data || []
}, { watch: [userId] })

const botOptions = computed(() => {
  return (chatbots.value || []).map(bot => ({
    label: bot.name,
    value: bot.id
  }))
})

const headerBotOptions = useState<Array<{ label: string; value: string }>>('dashboard-conversations-bot-options', () => [])
watchEffect(() => {
  headerBotOptions.value = botOptions.value
})

const selectedAgentLabel = computed(() => {
  return botOptions.value.find(bot => bot.value === selectedChatbotId.value)?.label || 'Selected Agent'
})

const {
  data: rawSessions,
  pending: loadingSessions,
  refresh: refreshSessions
} = await useAsyncData('conversation-sessions-v2', async () => {
  if (!selectedChatbotId.value) return []

  const { data, error } = await supabase
    .from('chat_sessions')
    .select(`
      id,
      created_at,
      metadata,
      chat_messages (
        id,
        role,
        content,
        created_at
      )
    `)
    .eq('chatbot_id', selectedChatbotId.value)
    .order('created_at', { ascending: false })
    .limit(40)

  if (error) {
    console.error('Error fetching sessions:', error)
    notify.error('Failed to load conversations.')
    return []
  }

  return (data || [])
    .map((session: any) => ({
      ...session,
      chat_messages: (session.chat_messages || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }))
    .filter((session: any) => (session.chat_messages || []).length > 0)
}, { watch: [selectedChatbotId] })

const sessions = computed(() => rawSessions.value || [])

const getSessionChannel = (session: any) => String(session?.metadata?.channel || session?.metadata?.type || 'web').toLowerCase()
const getSessionContact = (session: any) => session?.metadata?.username || session?.metadata?.phone || 'Anonymous visitor'
const getSessionPreview = (session: any) => {
  const lastMessage = session?.chat_messages?.[session.chat_messages.length - 1]
  return lastMessage?.content || 'Conversation started with no visible message yet.'
}
const getSessionMessageCount = (session: any) => session?.chat_messages?.length || 0
const getSessionChannelLabel = (session: any) => {
  const channel = getSessionChannel(session)
  if (channel === 'whatsapp') return 'WhatsApp'
  if (channel === 'instagram') return 'Instagram'
  return 'Web'
}
const getSessionChannelBadge = (session: any) => {
  const channel = getSessionChannel(session)
  if (channel === 'whatsapp') return 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20'
  if (channel === 'instagram') return 'bg-pink-500/10 text-pink-400 border-pink-500/20'
  return 'bg-primary/10 text-primary border-primary/20'
}

const filteredSessions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return sessions.value.filter((session: any) => {
    const channel = getSessionChannel(session)
    const matchesChannel = selectedChannel.value === 'all' || channel === selectedChannel.value

    if (!matchesChannel) return false
    if (!query) return true

    const haystack = [
      getSessionContact(session),
      getSessionPreview(session),
      ...((session.chat_messages || []).slice(-4).map((msg: any) => msg.content || ''))
    ].join(' ').toLowerCase()

    return haystack.includes(query)
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredSessions.value.length / pageSize)))

const paginatedSessions = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredSessions.value.slice(start, start + pageSize)
})

watch([selectedChatbotId, searchQuery, selectedChannel], () => {
  currentPage.value = 1
})

watch(filteredSessions, (list) => {
  if (!list.length) {
    activeSessionId.value = ''
    return
  }

  if (!list.find((session: any) => session.id === activeSessionId.value)) {
    activeSessionId.value = list[0].id
  }
}, { immediate: true })

watch(paginatedSessions, (list) => {
  if (!list.length) return
  if (!list.find((session: any) => session.id === activeSessionId.value)) {
    activeSessionId.value = list[0].id
  }
}, { immediate: true })

watch(totalPages, (pages) => {
  if (currentPage.value > pages) {
    currentPage.value = pages
  }
})

const activeSession = computed(() => {
  return filteredSessions.value.find((session: any) => session.id === activeSessionId.value) || null
})

const isSessionTakeoverEnabled = (session: any) => Boolean(session?.metadata?.human_takeover?.enabled)

const activeTakeoverEnabled = computed(() => isSessionTakeoverEnabled(activeSession.value))

const summaryStats = computed(() => {
  const targetSessions = filteredSessions.value
  const totalMessages = targetSessions.reduce((sum: number, session: any) => sum + getSessionMessageCount(session), 0)
  const whatsappCount = targetSessions.filter((session: any) => getSessionChannel(session) === 'whatsapp').length
  const instagramCount = targetSessions.filter((session: any) => getSessionChannel(session) === 'instagram').length
  const webCount = targetSessions.filter((session: any) => getSessionChannel(session) === 'web').length

  return {
    conversations: targetSessions.length,
    messages: totalMessages,
    webCount,
    whatsappCount,
    instagramCount
  }
})

const activeSessionFacts = computed(() => {
  if (!activeSession.value) return null

  const firstMessage = activeSession.value.chat_messages?.[0]
  const lastMessage = activeSession.value.chat_messages?.[activeSession.value.chat_messages.length - 1]

  const messages = activeSession.value.chat_messages || []

  return {
    messageCount: getSessionMessageCount(activeSession.value),
    userMessages: messages.filter((message: any) => message.role !== 'assistant').length,
    assistantMessages: messages.filter((message: any) => message.role === 'assistant').length,
    startedAt: activeSession.value.created_at,
    lastActivity: lastMessage?.created_at || activeSession.value.created_at,
    firstSpeaker: firstMessage?.role || 'user'
  }
})

watch(activeSessionId, () => {
  isTakingOver.value = activeTakeoverEnabled.value
  operatorReply.value = ''
})

watch(activeTakeoverEnabled, (enabled) => {
  isTakingOver.value = enabled
}, { immediate: true })

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

const formatLongDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(date)
}

const exportToCSV = async () => {
  const allowedPlans = ['silver', 'gold', 'enterprise-ready']
  if (!allowedPlans.includes(planSlug.value || '')) {
    notify.error('Exporting is a premium feature. Please upgrade to Silver, Gold, or Enterprise Ready.')
    return
  }

  if (!selectedChatbotId.value) return

  isExporting.value = true
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select(`
        id,
        created_at,
        metadata,
        chat_messages (
          role,
          content,
          created_at
        )
      `)
      .eq('chatbot_id', selectedChatbotId.value)
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!data || data.length === 0) {
      notify.error('No data found to export.')
      return
    }

    const headers = ['Session ID', 'Session Date', 'User/Contact', 'Platform', 'Role', 'Message', 'Message Date']
    const csvRows = [headers.join(',')]

    data.forEach((session: any) => {
      const contact = session.metadata?.username || session.metadata?.phone || 'Anonymous'
      const platform = session.metadata?.type || 'Web'
      const sessionDate = new Date(session.created_at).toLocaleString()

      session.chat_messages.forEach((msg: any) => {
        const row = [
          `"${session.id}"`,
          `"${sessionDate}"`,
          `"${contact}"`,
          `"${platform}"`,
          `"${msg.role}"`,
          `"${String(msg.content || '').replace(/"/g, '""')}"`,
          `"${new Date(msg.created_at).toLocaleString()}"`
        ]
        csvRows.push(row.join(','))
      })
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `replysuite_conversations_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    notify.success('Conversation export is ready.')
  } catch (err: any) {
    console.error('Export error:', err)
    notify.error('Failed to generate export file.')
  } finally {
    isExporting.value = false
  }
}

const setSessionTakeover = async (enabled: boolean) => {
  if (!activeSession.value || isUpdatingTakeover.value) return

  isUpdatingTakeover.value = true
  try {
    await $fetch(`/api/conversations/${activeSession.value.id}/takeover`, {
      method: 'POST',
      body: { enabled }
    })

    isTakingOver.value = enabled
    await refreshSessions()
    notify.success(enabled ? 'AI paused for this conversation.' : 'AI resumed for this conversation.')
  } catch (error: any) {
    console.error('[Conversation Takeover]', error)
    notify.error(error?.data?.statusMessage || 'Failed to update takeover state.')
  } finally {
    isUpdatingTakeover.value = false
  }
}

const continueConversation = async () => {
  if (!activeSession.value || !operatorReply.value.trim() || isSendingOperatorReply.value) return

  const replyText = operatorReply.value.trim()
  const channel = getSessionChannel(activeSession.value)

  if (channel !== 'whatsapp') {
    notify.info('Direct sending is currently connected for WhatsApp only. Reply copied for your team to send in the customer channel.')
    if (navigator?.clipboard) navigator.clipboard.writeText(replyText).catch(() => null)
    return
  }

  isSendingOperatorReply.value = true
  try {
    await $fetch(`/api/conversations/${activeSession.value.id}/operator-reply`, {
      method: 'POST',
      body: { message: replyText }
    })

    operatorReply.value = ''
    await refreshSessions()
    notify.success('WhatsApp reply sent.')
  } catch (error: any) {
    console.error('[Conversation Operator Reply]', error)
    notify.error(error?.data?.statusMessage || 'Failed to send WhatsApp reply.')
  } finally {
    isSendingOperatorReply.value = false
  }
}

const analyzeSelectedAgent = async () => {
  if (!selectedChatbotId.value) return

  const reportId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const runningReport: AnalysisReport = {
    id: reportId,
    status: 'running',
    createdAt: new Date().toISOString(),
    title: selectedAgentLabel.value,
    summary: 'Reviewing recent conversations in the background...'
  }

  analysisReports.value = [runningReport, ...analysisReports.value].slice(0, 2)
  isAnalyzing.value = true

  try {
    const result: any = await $fetch('/api/conversations/analyze', {
      method: 'POST',
      body: { chatbotId: selectedChatbotId.value }
    })

    analysisReports.value = analysisReports.value.map((report) => report.id === reportId
      ? {
          ...report,
          status: 'done',
          summary: result?.analysis?.summary || 'Analysis completed.',
          meta: result?.meta,
          topIntents: result?.analysis?.topIntents || [],
          painPoints: result?.analysis?.painPoints || [],
          actionItems: result?.analysis?.actionItems || []
        }
      : report
    )
    notify.success('AI analyzer finished reviewing recent conversations.')
  } catch (error: any) {
    console.error('[Conversation Analyzer]', error)
    const message = error?.data?.statusMessage || 'Failed to analyze conversations.'
    analysisReports.value = analysisReports.value.map((report) => report.id === reportId
      ? { ...report, status: 'error', summary: message }
      : report
    )
    notify.error(message)
  } finally {
    isAnalyzing.value = false
  }
}
</script>

<template>
  <div class="min-h-0 flex-1 space-y-0 overflow-y-auto p-0 xl:flex xl:flex-col xl:overflow-hidden" style="zoom: 0.95">
    <section class="grid min-h-0 flex-1 overflow-hidden border-y border-r border-foreground/5 bg-background shadow-sm shadow-black/5 md:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)_20rem] 2xl:grid-cols-[20rem_minmax(0,1.45fr)_21rem]">
      <aside class="flex min-h-[320px] flex-col border-b border-foreground/5 bg-background-accent dark:bg-[#050505] md:min-h-0 md:border-b-0 md:border-r">
        <div class="space-y-3 border-b border-foreground/5 p-3">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0"><p class="flex items-center gap-1.5 truncate text-sm font-bold text-foreground"><MessageCircle class="h-3.5 w-3.5 text-primary" />Conversation inbox</p></div>
            <button @click="refreshSessions()" class="rounded-[0.39rem] border border-foreground/10 bg-background px-3 py-2 text-foreground/50 transition hover:border-primary/20 hover:text-primary" aria-label="Refresh conversations"><Activity class="h-4 w-4" /></button>
          </div>

          <div class="relative">
            <Search class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/35" />
            <input v-model="searchQuery" type="text" placeholder="Search..." class="w-full rounded-[0.39rem] border border-foreground/10 bg-background/55 py-2 pl-9 pr-3 text-xs text-foreground outline-none placeholder:text-foreground/35 focus:border-primary/40" />
          </div>

          <div class="grid w-full grid-cols-2 gap-1 rounded-[0.39rem] border border-foreground/10 bg-background/55 p-1 sm:flex sm:flex-wrap">
            <button
              v-for="filter in channelFilters"
              :key="filter.value"
              type="button"
              @click="selectedChannel = filter.value"
              :class="[
                'inline-flex items-center justify-center gap-1 rounded-[0.3rem] border px-[0.39rem] py-[0.39rem] text-[10.6px] font-bold leading-none transition',
                selectedChannel === filter.value ? filter.activeClass : filter.inactiveClass
              ]"
            >
              <component :is="filter.icon" class="h-3 w-3" />
              <span class="whitespace-nowrap">{{ filter.label }}</span>
            </button>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-hidden p-2">
          <div v-if="loadingSessions && !sessions.length" class="space-y-2">
            <div v-for="item in 6" :key="item" class="rounded-[0.39rem] border border-foreground/5 bg-background p-2.5">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1 space-y-2">
                  <div class="flex items-center gap-2">
                    <Skeleton width="7rem" height="0.875rem" radius="0.25rem" />
                    <Skeleton width="3rem" height="1rem" radius="0.3rem" />
                  </div>
                  <Skeleton width="100%" height="0.75rem" radius="0.25rem" />
                  <Skeleton width="72%" height="0.75rem" radius="0.25rem" />
                  <div class="flex items-center gap-3 pt-1">
                    <Skeleton width="5rem" height="0.7rem" radius="0.25rem" />
                    <Skeleton width="4rem" height="0.7rem" radius="0.25rem" />
                  </div>
                </div>
                <Skeleton width="1rem" height="1rem" radius="0.25rem" />
              </div>
            </div>
          </div>
          <div v-else-if="!selectedChatbotId || !sessions.length" class="flex h-48 flex-col items-center justify-center text-center text-foreground/50"><MessageCircle class="mb-3 h-10 w-10 opacity-20" /><p class="text-xs font-bold">No conversations yet</p><p class="mt-2 max-w-[220px] text-xs text-foreground/40">Customer conversations will appear here after this assistant receives messages.</p></div>
          <div v-else-if="!filteredSessions.length" class="flex h-48 flex-col items-center justify-center text-center text-foreground/50"><Search class="mb-3 h-10 w-10 opacity-20" /><p class="text-xs font-bold">No matches</p></div>
          <div v-else class="space-y-2">
            <button v-for="session in paginatedSessions" :key="session.id" @click="activeSessionId = session.id" class="w-full rounded-[0.39rem] border p-2.5 text-left transition" :class="activeSessionId === session.id ? 'border-primary/30 bg-primary/10' : 'border-transparent bg-background hover:border-foreground/10 hover:bg-foreground/[0.03]'">
              <div class="flex items-start justify-between gap-3"><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><p class="truncate text-sm font-bold text-foreground">{{ getSessionContact(session) }}</p><span class="shrink-0 rounded-[0.3rem] border px-2 py-0.5 text-[10px] font-bold" :class="getSessionChannelBadge(session)">{{ getSessionChannelLabel(session) }}</span></div><p class="mt-1 line-clamp-2 text-xs leading-5 text-foreground/50">{{ getSessionPreview(session) }}</p><div class="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-foreground/40"><span class="inline-flex items-center gap-1.5"><Clock class="h-3.5 w-3.5" /><template v-if="isMounted">{{ formatDate(session.created_at) }}</template><template v-else>Loading...</template></span><span class="inline-flex items-center gap-1.5"><MessageCircle class="h-3.5 w-3.5" />{{ getSessionMessageCount(session) }} messages</span></div></div><ChevronRight class="mt-1 h-4 w-4 shrink-0 text-foreground/25" /></div>
            </button>
          </div>
        </div>

        <div v-if="totalPages > 1" class="flex items-center justify-between gap-2 border-t border-foreground/10 bg-background px-3 py-2.5"><button @click="currentPage = Math.max(1, currentPage - 1)" :disabled="currentPage === 1" class="dashboard-action-label rounded-[0.39rem] border border-foreground/10 px-3 py-2 text-foreground/50 disabled:opacity-30">Prev</button><p class="text-center text-xs font-bold text-foreground/55"><span class="block">{{ currentPage }} / {{ totalPages }}</span><span class="text-[10px] text-foreground/35">{{ filteredSessions.length }} filtered</span></p><button @click="currentPage = Math.min(totalPages, currentPage + 1)" :disabled="currentPage === totalPages" class="dashboard-action-label rounded-[0.39rem] border border-foreground/10 px-3 py-2 text-foreground/50 disabled:opacity-30">Next</button></div>
      </aside>

      <main class="min-h-[460px] bg-background md:min-h-0 md:overflow-hidden">
        <template v-if="loadingSessions && !sessions.length">
          <div class="flex h-full min-h-[460px] flex-col md:min-h-0">
            <header class="border-b border-foreground/10 bg-background/95 px-4 py-3">
              <div class="flex items-center justify-between gap-3">
                <div class="space-y-2">
                  <Skeleton width="10rem" height="1rem" radius="0.25rem" />
                  <Skeleton width="7rem" height="0.75rem" radius="0.25rem" />
                </div>
                <div class="hidden gap-2 sm:flex">
                  <Skeleton width="5rem" height="1.75rem" radius="0.35rem" />
                  <Skeleton width="6rem" height="1.75rem" radius="0.35rem" />
                </div>
              </div>
            </header>
            <div class="min-h-0 flex-1 overflow-hidden px-4 py-5 sm:px-5">
              <div class="mx-auto max-w-4xl space-y-4">
                <div v-for="item in 5" :key="item" class="flex" :class="item % 2 === 0 ? 'justify-end' : 'justify-start'">
                  <div class="w-full max-w-[76%] space-y-2">
                    <Skeleton width="6rem" height="0.75rem" radius="0.25rem" :class="item % 2 === 0 ? 'ml-auto' : ''" />
                    <Skeleton width="100%" height="3.5rem" radius="0.39rem" />
                    <Skeleton width="7rem" height="0.7rem" radius="0.25rem" :class="item % 2 === 0 ? 'ml-auto' : ''" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
        <template v-else-if="activeSession">
          <div class="flex h-full min-h-[460px] flex-col md:min-h-0">
            <header class="border-b border-foreground/10 bg-background/95 px-4 py-3 backdrop-blur-xl">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div class="flex flex-wrap items-center gap-2"><h3 class="text-base font-bold text-foreground">{{ getSessionContact(activeSession) }}</h3><span class="rounded-[0.3rem] border px-2 py-0.5 text-[10px] font-bold" :class="getSessionChannelBadge(activeSession)">{{ getSessionChannelLabel(activeSession) }}</span></div><p class="mt-1 text-xs font-medium text-foreground/50">Conversation details</p></div><div v-if="activeSessionFacts" class="flex flex-wrap gap-2 text-xs font-semibold text-foreground/45"><span class="rounded-[0.35rem] border border-foreground/10 bg-foreground/[0.02] px-2.5 py-1.5">{{ activeSessionFacts.messageCount }} messages</span><span class="rounded-[0.35rem] border border-foreground/10 bg-foreground/[0.02] px-2.5 py-1.5">{{ formatDate(activeSessionFacts.lastActivity) }}</span></div></div>
            </header>
            <div class="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.05),transparent_55%)] px-4 py-5 sm:px-5">
              <div v-if="activeSession.chat_messages?.length" class="mx-auto max-w-4xl space-y-4">
                <div v-for="msg in activeSession.chat_messages" :key="msg.id" class="flex" :class="msg.role === 'assistant' ? 'justify-start' : 'justify-end'">
                  <div class="max-w-[92%] sm:max-w-[76%]">
                    <div class="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold" :class="msg.role === 'assistant' ? 'text-foreground/45' : 'justify-end text-primary'">
                      <template v-if="msg.role === 'assistant'"><Bot class="h-3.5 w-3.5" />Assistant</template>
                      <template v-else>Visitor<User class="h-3.5 w-3.5" /></template>
                      <span class="rounded-[0.3rem] border px-2 py-0.5 text-[10px] font-bold" :class="getSessionChannelBadge(activeSession)">{{ getSessionChannelLabel(activeSession) }}</span>
                    </div>
                    <div class="rounded-[0.39rem] border px-3.5 py-2.5 text-sm leading-6 shadow-sm" :class="msg.role === 'assistant' ? 'border-foreground/10 bg-foreground/[0.03] text-foreground/80 rounded-tl-sm' : 'border-primary/20 bg-primary text-black rounded-tr-sm'">{{ msg.content }}</div>
                    <p class="mt-1.5 text-[11px] font-semibold text-foreground/35" :class="msg.role === 'assistant' ? '' : 'text-right'">{{ formatLongDate(msg.created_at) }}</p>
                  </div>
                </div>
              </div>
              <div v-else class="flex h-full min-h-[260px] flex-col items-center justify-center text-center text-foreground/50"><Activity class="mb-3 h-10 w-10 opacity-20" /><p class="text-xs font-bold">No visible messages</p></div>
            </div>
          </div>
        </template>
        <div v-else class="flex h-full min-h-[460px] flex-col items-center justify-center text-center text-foreground/50 md:min-h-0"><MessageCircle class="mb-4 h-12 w-12 opacity-15" /><h3 class="text-sm font-bold text-foreground/45">Select a conversation</h3><p class="mt-2 max-w-sm text-sm text-foreground/40">Choose a session from the left panel to inspect the full message flow.</p></div>
      </main>

      <aside class="flex min-h-[320px] flex-col overflow-hidden border-t border-foreground/10 bg-foreground/[0.015] p-3 md:col-span-2 xl:col-span-1 xl:min-h-0 xl:border-l xl:border-t-0">
        <div class="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <UserCheck class="h-4 w-4 text-primary" /> Chat summary
        </div>

        <div v-if="loadingSessions && !sessions.length" class="mt-3 space-y-2.5">
          <div class="rounded-[0.39rem] border border-foreground/10 bg-background/55 p-3">
            <Skeleton width="8rem" height="1rem" radius="0.25rem" />
            <div class="mt-2 flex gap-1.5">
              <Skeleton width="3.5rem" height="1rem" radius="0.3rem" />
              <Skeleton width="5rem" height="1rem" radius="0.3rem" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div v-for="item in 4" :key="item" class="rounded-[0.39rem] border border-foreground/10 bg-background/45 p-2.5">
              <Skeleton width="4.5rem" height="0.75rem" radius="0.25rem" />
              <Skeleton width="2.5rem" height="1.25rem" radius="0.25rem" class="mt-2" />
            </div>
          </div>
          <div class="rounded-[0.39rem] border border-foreground/10 bg-background/55 p-3">
            <Skeleton width="8rem" height="1rem" radius="0.25rem" />
            <Skeleton width="100%" height="5.5rem" radius="0.39rem" class="mt-3" />
            <div class="mt-3 flex gap-2">
              <Skeleton width="7rem" height="2rem" radius="0.39rem" />
              <Skeleton width="6rem" height="2rem" radius="0.39rem" />
            </div>
          </div>
        </div>

        <div v-else-if="activeSession" class="mt-3 space-y-2.5">
          <div class="rounded-[0.39rem] border border-foreground/10 bg-background/55 p-3">
            <p class="truncate text-sm font-bold text-foreground">{{ getSessionContact(activeSession) }}</p>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <span class="rounded-[0.3rem] border px-2 py-0.5 text-[10px] font-bold" :class="getSessionChannelBadge(activeSession)">{{ getSessionChannelLabel(activeSession) }}</span>
              <span class="rounded-[0.3rem] border border-foreground/10 bg-background/60 px-2 py-0.5 text-[10px] font-bold text-foreground/50">{{ selectedAgentLabel }}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-[0.39rem] border border-foreground/10 bg-background/45 p-2.5">
              <p class="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/45"><MessageCircle class="h-3.5 w-3.5 text-primary/70" />Messages</p>
              <p class="mt-1 text-lg font-bold tabular-nums text-foreground">{{ activeSessionFacts?.messageCount || 0 }}</p>
            </div>
            <div class="rounded-[0.39rem] border border-foreground/10 bg-background/45 p-2.5">
              <p class="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/45"><User class="h-3.5 w-3.5 text-primary/70" />User</p>
              <p class="mt-1 text-lg font-bold tabular-nums text-foreground">{{ activeSessionFacts?.userMessages || 0 }}</p>
            </div>
            <div class="rounded-[0.39rem] border border-foreground/10 bg-background/45 p-2.5">
              <p class="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/45"><Bot class="h-3.5 w-3.5 text-primary/70" />AI</p>
              <p class="mt-1 text-lg font-bold tabular-nums text-primary">{{ activeSessionFacts?.assistantMessages || 0 }}</p>
            </div>
            <div class="rounded-[0.39rem] border border-foreground/10 bg-background/45 p-2.5">
              <p class="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/45"><Clock class="h-3.5 w-3.5 text-primary/70" />Last</p>
              <p class="mt-1 text-xs font-bold text-foreground">{{ activeSessionFacts ? formatDate(activeSessionFacts.lastActivity) : '—' }}</p>
            </div>
          </div>

          <div class="rounded-[0.39rem] border border-foreground/10 bg-background/55 p-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="flex items-center gap-1.5 text-sm font-bold text-foreground"><UserCheck class="h-4 w-4 text-primary" />Human takeover</p>
                <p class="mt-1 text-xs font-medium text-foreground/45">Pause AI for this conversation.</p>
              </div>
              <button
                type="button"
                :class="[
                  'dashboard-action-label rounded-[0.39rem] border px-3 py-2 transition disabled:cursor-not-allowed disabled:opacity-50',
                  isTakingOver ? 'border-primary/30 bg-primary/10 text-primary' : 'border-foreground/10 text-foreground/55 hover:border-primary/20 hover:text-primary'
                ]"
                :disabled="isUpdatingTakeover"
                @click="setSessionTakeover(!isTakingOver)"
              >
                {{ isUpdatingTakeover ? 'Saving' : isTakingOver ? 'AI paused' : 'Take over' }}
              </button>
            </div>

            <textarea
              v-model="operatorReply"
              rows="4"
              :disabled="!isTakingOver"
              placeholder="Write a reply for this customer..."
              class="mt-3 w-full resize-none rounded-[0.39rem] border border-foreground/10 bg-background/70 p-3 text-sm leading-6 text-foreground outline-none placeholder:text-foreground/35 focus:border-primary/35 disabled:cursor-not-allowed disabled:opacity-45"
            />

            <div class="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                :disabled="!isTakingOver || !operatorReply.trim() || isSendingOperatorReply"
                class="dashboard-action-label inline-flex items-center gap-1.5 rounded-[0.39rem] bg-primary px-3 py-2 text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                @click="continueConversation"
              >
                <Send v-if="!isSendingOperatorReply" class="h-3.5 w-3.5" /><div v-else class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/70 border-t-transparent" /> {{ isSendingOperatorReply ? 'Sending' : 'Continue chat' }}
              </button>
              <button
                type="button"
                :disabled="!isTakingOver && !operatorReply"
                class="dashboard-action-label inline-flex items-center gap-1.5 rounded-[0.39rem] border border-foreground/10 px-3 py-2 text-foreground/55 transition hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                @click="setSessionTakeover(false); operatorReply = ''"
              >
                <RotateCcw class="h-3.5 w-3.5" /> Resume AI
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button @click="exportToCSV" :disabled="isExporting || !selectedChatbotId" class="dashboard-action-label inline-flex items-center justify-center gap-1.5 rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 py-2 text-foreground/60 transition hover:border-primary/20 hover:text-primary disabled:opacity-50">
              <Download v-if="!isExporting" class="h-3.5 w-3.5 text-primary" /><div v-else class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />Export
            </button>
            <button @click="analyzeSelectedAgent" :disabled="isAnalyzing || !selectedChatbotId" class="dashboard-action-label inline-flex items-center justify-center gap-1.5 rounded-[0.39rem] border border-primary/20 bg-primary/10 px-3 py-2 text-primary transition hover:bg-primary hover:text-black disabled:opacity-50">
              <Brain v-if="!isAnalyzing" class="h-3.5 w-3.5" /><div v-else class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />Analyze
            </button>
          </div>


          <div v-if="analysisReports.length" class="rounded-[0.39rem] border border-foreground/10 bg-background/45 p-2.5">
            <div class="mb-2 flex items-center justify-between gap-2">
              <p class="inline-flex items-center gap-1.5 text-xs font-bold text-foreground/70"><Brain class="h-3.5 w-3.5 text-primary" />AI reports</p>
              <span class="text-[10px] font-bold text-foreground/35">Latest 2</span>
            </div>
            <div class="space-y-1.5">
              <button
                v-for="report in analysisReports"
                :key="report.id"
                type="button"
                class="flex h-11 w-full items-center justify-between gap-2 rounded-[0.35rem] border px-2 text-left transition hover:border-primary/25 hover:bg-primary/5"
                :class="report.status === 'error' ? 'border-red-500/15 bg-red-500/5' : report.status === 'running' ? 'border-primary/20 bg-primary/5' : 'border-foreground/10 bg-background/60'"
                @click="selectedAnalysisReport = report"
              >
                <div class="flex min-w-0 items-center gap-2">
                  <Brain class="h-3.5 w-3.5 shrink-0 text-primary" />
                  <div class="min-w-0">
                    <p class="truncate text-[11px] font-bold text-foreground">{{ report.status === 'running' ? 'Generating report...' : report.title }}</p>
                    <p class="truncate text-[10px] font-semibold text-foreground/40">
                      {{ formatDate(report.createdAt) }}<template v-if="report.meta"> · {{ report.meta.sessionsAnalyzed || 0 }} sessions</template>
                    </p>
                  </div>
                </div>
                <span
                  class="shrink-0 rounded-[0.25rem] border px-1.5 py-0.5 text-[9px] font-bold"
                  :class="report.status === 'error' ? 'border-red-500/20 text-red-400' : report.status === 'running' ? 'border-primary/25 text-primary' : 'border-emerald-400/20 text-emerald-300'"
                >
                  {{ report.status === 'running' ? 'Run' : report.status === 'error' ? 'Fail' : 'Done' }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div v-else class="mt-8 flex flex-1 flex-col items-center justify-center text-center text-foreground/45">
          <MessageCircle class="mb-3 h-10 w-10 opacity-20" />
          <p class="text-sm font-bold">No conversation selected</p>
          <p class="mt-2 max-w-[220px] text-xs leading-5">Choose a session to see summary and takeover controls.</p>
        </div>
      </aside>
    </section>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="selectedAnalysisReport" class="fixed inset-0 z-[500] flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm" @click.self="selectedAnalysisReport = null">
          <div class="max-h-[82vh] w-full max-w-2xl overflow-hidden rounded-[0.55rem] border border-foreground/10 bg-background shadow-2xl shadow-black/30">
            <header class="flex items-start justify-between gap-4 border-b border-foreground/10 p-4">
              <div class="min-w-0">
                <p class="inline-flex items-center gap-1.5 text-xs font-bold text-primary"><Brain class="h-3.5 w-3.5" />AI conversation report</p>
                <h3 class="mt-1 truncate text-base font-bold text-foreground">{{ selectedAnalysisReport.title }}</h3>
                <p class="mt-1 text-xs font-semibold text-foreground/45">{{ formatDate(selectedAnalysisReport.createdAt) }}</p>
              </div>
              <button type="button" class="rounded-[0.39rem] border border-foreground/10 p-2 text-foreground/45 transition hover:border-primary/25 hover:text-primary" aria-label="Close report" @click="selectedAnalysisReport = null">
                <X class="h-4 w-4" />
              </button>
            </header>

            <div class="max-h-[calc(82vh-5rem)] overflow-y-auto p-4">
              <div class="mb-3 flex flex-wrap gap-2">
                <span
                  class="rounded-[0.3rem] border px-2 py-1 text-[10px] font-bold"
                  :class="selectedAnalysisReport.status === 'error' ? 'border-red-500/20 text-red-400' : selectedAnalysisReport.status === 'running' ? 'border-primary/25 text-primary' : 'border-emerald-400/20 text-emerald-300'"
                >
                  {{ selectedAnalysisReport.status === 'running' ? 'Running' : selectedAnalysisReport.status === 'error' ? 'Failed' : 'Done' }}
                </span>
                <span v-if="selectedAnalysisReport.meta" class="rounded-[0.3rem] border border-foreground/10 bg-foreground/[0.03] px-2 py-1 text-[10px] font-bold text-foreground/45">{{ selectedAnalysisReport.meta.sessionsAnalyzed || 0 }} sessions</span>
                <span v-if="selectedAnalysisReport.meta" class="rounded-[0.3rem] border border-foreground/10 bg-foreground/[0.03] px-2 py-1 text-[10px] font-bold text-foreground/45">{{ selectedAnalysisReport.meta.messagesAnalyzed || 0 }} messages</span>
              </div>

              <p class="rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.025] p-3 text-sm leading-6 text-foreground/75">{{ selectedAnalysisReport.summary }}</p>

              <div v-if="selectedAnalysisReport.status === 'done'" class="mt-4 grid gap-3 sm:grid-cols-3">
                <div
                  v-for="group in [
                    { title: 'Top intents', items: selectedAnalysisReport.topIntents || [], dot: 'bg-primary' },
                    { title: 'Pain points', items: selectedAnalysisReport.painPoints || [], dot: 'bg-red-500' },
                    { title: 'Actions', items: selectedAnalysisReport.actionItems || [], dot: 'bg-emerald-500' }
                  ]"
                  :key="group.title"
                  class="rounded-[0.39rem] border border-foreground/10 bg-background/45 p-3"
                >
                  <p class="mb-2 text-xs font-bold text-foreground/65">{{ group.title }}</p>
                  <ul v-if="group.items.length" class="space-y-2 text-xs leading-5 text-foreground/65">
                    <li v-for="item in group.items" :key="item" class="flex gap-2">
                      <span :class="['mt-2 h-1.5 w-1.5 shrink-0 rounded-full', group.dot]" />{{ item }}
                    </li>
                  </ul>
                  <p v-else class="text-xs text-foreground/35">No records.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
