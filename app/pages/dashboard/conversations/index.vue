<script setup lang="ts">
import {
  MessageCircle,
  Bot,
  Search,
  User,
  Clock,
  ChevronRight,
  ChevronLeft,
  Activity,
  Download,
  Brain,
  Sparkles,
  Globe,
  Phone,
  Filter,
  MessagesSquare
} from 'lucide-vue-next'
import CustomSelect from '~~/app/components/CustomSelect.vue'

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
const pageSize = 3
const searchQuery = ref('')
const selectedChannel = ref<'all' | 'web' | 'whatsapp'>('all')
const isMounted = ref(false)
const isExporting = ref(false)
const isAnalyzing = ref(false)
const analysisError = ref('')
const analysisResult = ref<any | null>(null)

onMounted(() => {
  isMounted.value = true
})

const channelFilters = [
  { label: 'All', value: 'all', icon: Filter },
  { label: 'Web', value: 'web', icon: Globe },
  { label: 'WhatsApp', value: 'whatsapp', icon: Phone }
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

const getSessionChannel = (session: any) => String(session?.metadata?.type || 'web').toLowerCase()
const getSessionContact = (session: any) => session?.metadata?.username || session?.metadata?.phone || 'Anonymous visitor'
const getSessionPreview = (session: any) => {
  const lastMessage = session?.chat_messages?.[session.chat_messages.length - 1]
  return lastMessage?.content || 'Conversation started with no visible message yet.'
}
const getSessionMessageCount = (session: any) => session?.chat_messages?.length || 0
const getSessionChannelLabel = (session: any) => {
  const channel = getSessionChannel(session)
  if (channel === 'whatsapp') return 'WhatsApp'
  return 'Web'
}
const getSessionChannelBadge = (session: any) => {
  const channel = getSessionChannel(session)
  if (channel === 'whatsapp') return 'bg-green-500/10 text-green-500 border-green-500/20'
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

watch(totalPages, (pages) => {
  if (currentPage.value > pages) {
    currentPage.value = pages
  }
})

const activeSession = computed(() => {
  return filteredSessions.value.find((session: any) => session.id === activeSessionId.value) || null
})

const summaryStats = computed(() => {
  const targetSessions = filteredSessions.value
  const totalMessages = targetSessions.reduce((sum: number, session: any) => sum + getSessionMessageCount(session), 0)
  const whatsappCount = targetSessions.filter((session: any) => getSessionChannel(session) === 'whatsapp').length
  const webCount = targetSessions.filter((session: any) => getSessionChannel(session) === 'web').length

  return {
    conversations: targetSessions.length,
    messages: totalMessages,
    webCount,
    whatsappCount
  }
})

const activeSessionFacts = computed(() => {
  if (!activeSession.value) return null

  const firstMessage = activeSession.value.chat_messages?.[0]
  const lastMessage = activeSession.value.chat_messages?.[activeSession.value.chat_messages.length - 1]

  return {
    messageCount: getSessionMessageCount(activeSession.value),
    startedAt: activeSession.value.created_at,
    lastActivity: lastMessage?.created_at || activeSession.value.created_at,
    firstSpeaker: firstMessage?.role || 'user'
  }
})

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

const analyzeSelectedAgent = async () => {
  if (!selectedChatbotId.value) return

  isAnalyzing.value = true
  analysisError.value = ''

  try {
    const result = await $fetch('/api/conversations/analyze', {
      method: 'POST',
      body: { chatbotId: selectedChatbotId.value }
    })

    analysisResult.value = result
    notify.success('AI analyzer finished reviewing recent conversations.')
  } catch (error: any) {
    console.error('[Conversation Analyzer]', error)
    analysisError.value = error?.data?.statusMessage || 'Failed to analyze conversations.'
    notify.error(analysisError.value)
  } finally {
    isAnalyzing.value = false
  }
}
</script>

<template>
  <div class="space-y-6 pb-24">
    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
      <div class="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.24em] text-foreground/40 mb-2">Agent</p>
          <CustomSelect
            v-model="selectedChatbotId"
            :options="botOptions"
            placeholder="Select chatbot agent"
          />
        </div>

        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.24em] text-foreground/40 mb-2">Search recent conversations</p>
          <div class="relative">
            <Search class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search contact, latest message, or keywords..."
              class="w-full rounded-2xl border border-foreground/10 bg-background-card py-3.5 pl-11 pr-4 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            >
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3 xl:justify-end">
        <button
          @click="exportToCSV"
          :disabled="isExporting || !selectedChatbotId"
          class="dashboard-secondary-btn disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download v-if="!isExporting" class="w-4 h-4 text-primary" />
          <div v-else class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          {{ isExporting ? 'Preparing export...' : 'Export CSV' }}
        </button>

        <button
          @click="analyzeSelectedAgent"
          :disabled="isAnalyzing || !selectedChatbotId"
          class="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Brain v-if="!isAnalyzing" class="w-4 h-4" />
          <div v-else class="w-4 h-4 border-2 border-black/70 border-t-transparent rounded-full animate-spin"></div>
          {{ isAnalyzing ? 'Analyzing...' : 'AI Analyzer' }}
        </button>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-foreground/5 bg-foreground/[0.02] p-4 sm:p-5">
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="filter in channelFilters"
          :key="filter.value"
          @click="selectedChannel = filter.value"
          class="inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all"
          :class="selectedChannel === filter.value
            ? 'border-primary/25 bg-primary/10 text-primary'
            : 'border-foreground/10 bg-background text-foreground/50 hover:border-foreground/20 hover:text-foreground'"
        >
          <component :is="filter.icon" class="w-3.5 h-3.5" />
          {{ filter.label }}
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">
        <span>{{ summaryStats.conversations }} conversations</span>
        <span>{{ summaryStats.messages }} messages</span>
        <span>{{ selectedAgentLabel }}</span>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-4">
      <div class="rounded-[2rem] border border-foreground/5 bg-foreground/[0.02] p-5">
        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/45 mb-2">Loaded scope</p>
        <p class="text-3xl font-black text-foreground tracking-tight">{{ summaryStats.conversations }}</p>
        <p class="text-xs text-foreground/55 mt-1">Recent conversations loaded for this agent.</p>
      </div>

      <div class="rounded-[2rem] border border-foreground/5 bg-foreground/[0.02] p-5">
        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/45 mb-2">Messages</p>
        <p class="text-3xl font-black text-foreground tracking-tight">{{ summaryStats.messages }}</p>
        <p class="text-xs text-foreground/55 mt-1">Across the currently visible filter scope.</p>
      </div>

      <div class="rounded-[2rem] border border-foreground/5 bg-foreground/[0.02] p-5">
        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/45 mb-2">Web vs WhatsApp</p>
        <p class="text-3xl font-black text-foreground tracking-tight">{{ summaryStats.webCount }} / {{ summaryStats.whatsappCount }}</p>
        <p class="text-xs text-foreground/55 mt-1">Web and WhatsApp conversation split.</p>
      </div>

      <div class="rounded-[2rem] border border-foreground/5 bg-foreground/[0.02] p-5">
        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/45 mb-2">Selected agent</p>
        <p class="text-lg font-black text-foreground tracking-tight line-clamp-2">{{ selectedAgentLabel }}</p>
        <p class="text-xs text-foreground/55 mt-1">Current agent whose conversations you are reviewing.</p>
      </div>
    </div>

    <div class="rounded-[2rem] border border-foreground/5 bg-gradient-to-br from-foreground/[0.03] to-primary/[0.03] p-5 sm:p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div class="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            <Sparkles class="w-3.5 h-3.5" />
            AI Conversation Analyzer
          </div>
          <h3 class="mt-3 text-lg font-black text-foreground">Analyze recent conversations for {{ selectedAgentLabel }}</h3>
          <p class="mt-1 max-w-2xl text-sm text-foreground/55">
            Get a concise AI review of recurring intents, pain points, strengths, and next actions based on the selected agent’s recent conversation history.
          </p>
        </div>

        <div v-if="analysisResult?.meta" class="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/45">
          <span class="rounded-full border border-foreground/10 bg-background px-3 py-1.5">{{ analysisResult.meta.sessionsAnalyzed }} sessions</span>
          <span class="rounded-full border border-foreground/10 bg-background px-3 py-1.5">{{ analysisResult.meta.messagesAnalyzed }} messages</span>
        </div>
      </div>

      <div v-if="isAnalyzing" class="mt-5 rounded-[1.5rem] border border-primary/15 bg-background/80 p-5">
        <div class="flex items-center gap-3 text-sm font-semibold text-foreground">
          <div class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          Analyzing recent conversations...
        </div>
        <p class="mt-2 text-sm text-foreground/55">This reviews the selected agent’s recent messages and summarizes patterns worth acting on.</p>
      </div>

      <div v-else-if="analysisError" class="mt-5 rounded-[1.5rem] border border-red-500/15 bg-red-500/5 p-5 text-sm text-red-500">
        {{ analysisError }}
      </div>

      <div v-else-if="analysisResult?.analysis" class="mt-5 grid gap-4 xl:grid-cols-2">
        <div class="rounded-[1.5rem] border border-foreground/5 bg-background/90 p-5 xl:col-span-2">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-2">Summary</p>
          <p class="text-sm leading-7 text-foreground/80">{{ analysisResult.analysis.summary }}</p>
        </div>

        <div class="rounded-[1.5rem] border border-foreground/5 bg-background/90 p-5">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-3">Top intents</p>
          <ul class="space-y-2 text-sm text-foreground/75">
            <li v-for="item in analysisResult.analysis.topIntents" :key="item" class="flex gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0"></span>
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>

        <div class="rounded-[1.5rem] border border-foreground/5 bg-background/90 p-5">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-3">Pain points</p>
          <ul class="space-y-2 text-sm text-foreground/75">
            <li v-for="item in analysisResult.analysis.painPoints" :key="item" class="flex gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0"></span>
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>

        <div class="rounded-[1.5rem] border border-foreground/5 bg-background/90 p-5">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-3">Agent strengths</p>
          <ul class="space-y-2 text-sm text-foreground/75">
            <li v-for="item in analysisResult.analysis.agentStrengths" :key="item" class="flex gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0"></span>
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>

        <div class="rounded-[1.5rem] border border-foreground/5 bg-background/90 p-5">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-3">Missed opportunities</p>
          <ul class="space-y-2 text-sm text-foreground/75">
            <li v-for="item in analysisResult.analysis.missedOpportunities" :key="item" class="flex gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0"></span>
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>

        <div class="rounded-[1.5rem] border border-foreground/5 bg-background/90 p-5 xl:col-span-2">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-3">Recommended actions</p>
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div v-for="item in analysisResult.analysis.actionItems" :key="item" class="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-4 text-sm text-foreground/80">
              {{ item }}
            </div>
          </div>
        </div>
      </div>

      <div v-else class="mt-5 rounded-[1.5rem] border border-dashed border-foreground/10 bg-background/70 p-5 text-sm text-foreground/55">
        Run the analyzer to get a fast overview of what customers are asking, where the agent performs well, and where you should refine prompts or knowledge.
      </div>
    </div>

    <div class="grid min-h-[72vh] gap-0 overflow-hidden rounded-[2rem] border border-foreground/5 bg-background shadow-[0_20px_60px_rgba(0,0,0,0.08)] md:grid-cols-[360px_minmax(0,1fr)]">
      <div class="flex min-h-0 flex-col border-r border-foreground/5 bg-foreground/[0.02]">
        <div class="border-b border-foreground/5 p-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Conversation explorer</p>
              <h3 class="mt-1 text-base font-black text-foreground">Recent sessions</h3>
            </div>
            <button
              @click="refreshSessions()"
              class="inline-flex items-center gap-2 rounded-xl border border-foreground/10 bg-background px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/60 transition-all hover:border-primary/20 hover:text-primary"
            >
              <Activity class="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
          <p class="mt-2 text-xs text-foreground/55">Browse the latest loaded conversations for the selected agent and filter them quickly.</p>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <div v-if="loadingSessions && !sessions.length" class="flex h-48 flex-col items-center justify-center text-foreground/50">
            <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <span class="text-[10px] font-black uppercase tracking-[0.2em]">Loading conversations...</span>
          </div>

          <div v-else-if="!selectedChatbotId || !sessions.length" class="flex h-48 flex-col items-center justify-center text-center text-foreground/50">
            <MessageCircle class="w-10 h-10 opacity-20 mb-3" />
            <p class="text-[10px] font-black uppercase tracking-[0.2em]">No recent conversations</p>
            <p class="mt-2 text-xs text-foreground/40 max-w-[220px]">Once this agent receives conversations, they will appear here for review.</p>
          </div>

          <div v-else-if="!filteredSessions.length" class="flex h-48 flex-col items-center justify-center text-center text-foreground/50">
            <Search class="w-10 h-10 opacity-20 mb-3" />
            <p class="text-[10px] font-black uppercase tracking-[0.2em]">No matches found</p>
            <p class="mt-2 text-xs text-foreground/40 max-w-[220px]">Try a different keyword or channel filter.</p>
          </div>

          <div v-else class="space-y-3">
            <button
              v-for="session in paginatedSessions"
              :key="session.id"
              @click="activeSessionId = session.id"
              class="w-full rounded-[1.5rem] border p-4 text-left transition-all"
              :class="activeSessionId === session.id
                ? 'border-primary/20 bg-primary/10 shadow-[0_10px_30px_rgba(212,175,55,0.08)]'
                : 'border-transparent bg-background hover:border-foreground/10 hover:bg-foreground/[0.02]'"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="truncate text-sm font-black text-foreground">{{ getSessionContact(session) }}</p>
                    <span class="rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em]" :class="getSessionChannelBadge(session)">
                      {{ getSessionChannelLabel(session) }}
                    </span>
                  </div>
                  <p class="mt-1 line-clamp-2 text-xs leading-5 text-foreground/55">{{ getSessionPreview(session) }}</p>
                </div>
                <ChevronRight class="w-4 h-4 shrink-0 text-foreground/25" />
              </div>

              <div class="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/40">
                <span class="inline-flex items-center gap-1.5">
                  <Clock class="w-3.5 h-3.5" />
                  <template v-if="isMounted">{{ formatDate(session.created_at) }}</template>
                  <template v-else>Loading...</template>
                </span>
                <span class="inline-flex items-center gap-1.5">
                  <MessagesSquare class="w-3.5 h-3.5" />
                  {{ getSessionMessageCount(session) }} messages
                </span>
              </div>
            </button>
          </div>
        </div>

        <div v-if="totalPages > 1" class="flex items-center justify-between border-t border-foreground/5 bg-background px-4 py-4">
          <button
            @click="currentPage = Math.max(1, currentPage - 1)"
            :disabled="currentPage === 1"
            class="inline-flex items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/60 transition-all hover:border-foreground/20 hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft class="w-4 h-4" />
            Prev
          </button>

          <div class="text-center">
            <p class="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/35">Page</p>
            <p class="mt-1 text-sm font-bold text-foreground">{{ currentPage }} / {{ totalPages }}</p>
          </div>

          <button
            @click="currentPage = Math.min(totalPages, currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="inline-flex items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/60 transition-all hover:border-foreground/20 hover:text-foreground disabled:opacity-30"
          >
            Next
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="min-h-0 bg-background">
        <template v-if="activeSession">
          <div class="flex h-full min-h-0 flex-col">
            <div class="border-b border-foreground/5 bg-background/90 px-5 py-5 backdrop-blur-xl sm:px-6">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="text-lg font-black text-foreground">{{ getSessionContact(activeSession) }}</h3>
                    <span class="rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em]" :class="getSessionChannelBadge(activeSession)">
                      {{ getSessionChannelLabel(activeSession) }}
                    </span>
                  </div>
                  <p class="mt-2 text-sm text-foreground/55">Conversation details for the selected thread.</p>
                </div>

                <div v-if="activeSessionFacts" class="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/45">
                  <span class="rounded-full border border-foreground/10 bg-foreground/[0.02] px-3 py-1.5">{{ activeSessionFacts.messageCount }} messages</span>
                  <span class="rounded-full border border-foreground/10 bg-foreground/[0.02] px-3 py-1.5">Started {{ formatDate(activeSessionFacts.startedAt) }}</span>
                  <span class="rounded-full border border-foreground/10 bg-foreground/[0.02] px-3 py-1.5">Last activity {{ formatDate(activeSessionFacts.lastActivity) }}</span>
                </div>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.05),transparent_55%)] px-5 py-6 sm:px-6">
              <div v-if="activeSession.chat_messages?.length" class="mx-auto max-w-4xl space-y-5">
                <div
                  v-for="msg in activeSession.chat_messages"
                  :key="msg.id"
                  class="flex"
                  :class="msg.role === 'assistant' ? 'justify-start' : 'justify-end'"
                >
                  <div class="max-w-[90%] sm:max-w-[75%]">
                    <div class="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]"
                      :class="msg.role === 'assistant' ? 'text-foreground/40' : 'justify-end text-primary'">
                      <template v-if="msg.role === 'assistant'">
                        <Bot class="w-3.5 h-3.5" />
                        Assistant
                      </template>
                      <template v-else>
                        Visitor
                        <User class="w-3.5 h-3.5" />
                      </template>
                    </div>
                    <div
                      class="rounded-[1.5rem] border px-4 py-3.5 text-sm leading-7 shadow-sm"
                      :class="msg.role === 'assistant'
                        ? 'border-foreground/8 bg-foreground/[0.03] text-foreground/80 rounded-tl-sm'
                        : 'border-primary/20 bg-primary text-black rounded-tr-sm'"
                    >
                      {{ msg.content }}
                    </div>
                    <p class="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/35"
                      :class="msg.role === 'assistant' ? '' : 'text-right'">
                      {{ formatLongDate(msg.created_at) }}
                    </p>
                  </div>
                </div>
              </div>

              <div v-else class="flex h-full min-h-[260px] flex-col items-center justify-center text-center text-foreground/50">
                <Activity class="w-10 h-10 opacity-20 mb-3" />
                <p class="text-[10px] font-black uppercase tracking-[0.2em]">No visible messages</p>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="flex h-full min-h-[420px] flex-col items-center justify-center text-center text-foreground/50">
          <MessageCircle class="w-12 h-12 opacity-15 mb-4" />
          <h3 class="text-sm font-black uppercase tracking-[0.2em] text-foreground/45">Select a conversation</h3>
          <p class="mt-2 max-w-sm text-sm text-foreground/40">Choose a session from the left panel to inspect the full message flow.</p>
        </div>
      </div>
    </div>
  </div>
</template>
