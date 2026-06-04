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
const pageSize = 8
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
  <div class="space-y-5 pb-24">
    <section class="rounded-[22px] border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur-xl md:p-6">
      <div class="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p class="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/45">Assistant</p>
          <CustomSelect v-model="selectedChatbotId" :options="botOptions" placeholder="Select assistant" />
        </div>
        <div>
          <p class="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/45">Search</p>
          <div class="relative">
            <Search class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
            <input v-model="searchQuery" type="text" placeholder="Search contact, message, or keyword..." class="w-full rounded-xl border border-foreground/10 bg-foreground/5 py-3 pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-foreground/35 focus:border-primary/40" />
          </div>
        </div>
        <div class="flex flex-wrap gap-2 lg:justify-end">
          <button v-for="filter in channelFilters" :key="filter.value" @click="selectedChannel = filter.value" class="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all" :class="selectedChannel === filter.value ? 'border-primary/25 bg-primary/10 text-primary' : 'border-foreground/10 bg-foreground/5 text-foreground/50 hover:text-foreground'">
            <component :is="filter.icon" class="h-3.5 w-3.5" />{{ filter.label }}
          </button>
        </div>
      </div>

      <div class="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-foreground/45">
          <span class="rounded-full border border-foreground/10 bg-background/50 px-3 py-1.5">{{ summaryStats.conversations }} conversations</span>
          <span class="rounded-full border border-foreground/10 bg-background/50 px-3 py-1.5">{{ summaryStats.messages }} messages</span>
          <span class="rounded-full border border-foreground/10 bg-background/50 px-3 py-1.5">{{ summaryStats.webCount }} web</span>
          <span class="rounded-full border border-foreground/10 bg-background/50 px-3 py-1.5">{{ summaryStats.whatsappCount }} WhatsApp</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <button @click="exportToCSV" :disabled="isExporting || !selectedChatbotId" class="inline-flex items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-foreground/60 transition-all hover:bg-foreground/10 hover:text-foreground disabled:opacity-50">
            <Download v-if="!isExporting" class="h-4 w-4 text-primary" /><div v-else class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />Export CSV
          </button>
          <button @click="analyzeSelectedAgent" :disabled="isAnalyzing || !selectedChatbotId" class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:opacity-90 disabled:opacity-50">
            <Brain v-if="!isAnalyzing" class="h-4 w-4" /><div v-else class="h-4 w-4 animate-spin rounded-full border-2 border-black/70 border-t-transparent" />{{ isAnalyzing ? 'Analyzing' : 'Analyze' }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="isAnalyzing || analysisError || analysisResult?.analysis" class="rounded-[22px] border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur-xl md:p-6">
      <div class="mb-4 flex items-center justify-between gap-3">
        <div><p class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">AI analyzer</p><h2 class="mt-1 text-lg font-black text-foreground">Conversation insights</h2></div>
        <div v-if="analysisResult?.meta" class="hidden text-[10px] font-black uppercase tracking-widest text-foreground/45 sm:block">{{ analysisResult.meta.sessionsAnalyzed }} sessions · {{ analysisResult.meta.messagesAnalyzed }} messages</div>
      </div>
      <div v-if="isAnalyzing" class="flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm font-semibold"><div class="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />Reviewing recent conversations...</div>
      <div v-else-if="analysisError" class="rounded-2xl border border-red-500/15 bg-red-500/5 p-4 text-sm text-red-500">{{ analysisError }}</div>
      <div v-else-if="analysisResult?.analysis" class="space-y-4">
        <p class="rounded-2xl border border-foreground/10 bg-background/70 p-4 text-sm leading-7 text-foreground/75">{{ analysisResult.analysis.summary }}</p>
        <div class="grid gap-3 lg:grid-cols-3">
          <div v-for="group in [
            { title: 'Top intents', items: analysisResult.analysis.topIntents, dot: 'bg-primary' },
            { title: 'Pain points', items: analysisResult.analysis.painPoints, dot: 'bg-red-500' },
            { title: 'Actions', items: analysisResult.analysis.actionItems, dot: 'bg-emerald-500' }
          ]" :key="group.title" class="rounded-2xl border border-foreground/10 bg-background/50 p-4">
            <p class="mb-3 text-[10px] font-black uppercase tracking-widest text-foreground/40">{{ group.title }}</p>
            <ul class="space-y-2 text-sm text-foreground/70"><li v-for="item in group.items" :key="item" class="flex gap-2"><span :class="['mt-2 h-1.5 w-1.5 shrink-0 rounded-full', group.dot]" />{{ item }}</li></ul>
          </div>
        </div>
      </div>
    </section>

    <section class="grid overflow-hidden rounded-[22px] border border-foreground/10 bg-background shadow-[0_18px_50px_rgba(0,0,0,0.06)] lg:min-h-[72vh] lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside class="flex min-h-[420px] flex-col border-b border-foreground/10 bg-foreground/[0.02] lg:border-b-0 lg:border-r">
        <div class="flex items-center justify-between gap-3 border-b border-foreground/10 p-4">
          <div><p class="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Recent sessions</p><p class="mt-1 text-sm font-bold text-foreground">{{ selectedAgentLabel }}</p></div>
          <button @click="refreshSessions()" class="rounded-xl border border-foreground/10 bg-background px-3 py-2 text-foreground/50 transition-all hover:text-primary" aria-label="Refresh conversations"><Activity class="h-4 w-4" /></button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-3">
          <div v-if="loadingSessions && !sessions.length" class="flex h-48 flex-col items-center justify-center text-foreground/50"><div class="mb-4 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /><span class="text-[10px] font-black uppercase tracking-widest">Loading conversations</span></div>
          <div v-else-if="!selectedChatbotId || !sessions.length" class="flex h-48 flex-col items-center justify-center text-center text-foreground/50"><MessageCircle class="mb-3 h-10 w-10 opacity-20" /><p class="text-[10px] font-black uppercase tracking-widest">No conversations yet</p><p class="mt-2 max-w-[220px] text-xs text-foreground/40">Customer conversations will appear here after this assistant receives messages.</p></div>
          <div v-else-if="!filteredSessions.length" class="flex h-48 flex-col items-center justify-center text-center text-foreground/50"><Search class="mb-3 h-10 w-10 opacity-20" /><p class="text-[10px] font-black uppercase tracking-widest">No matches</p></div>
          <div v-else class="space-y-2">
            <button v-for="session in paginatedSessions" :key="session.id" @click="activeSessionId = session.id" class="w-full rounded-2xl border p-3 text-left transition-all" :class="activeSessionId === session.id ? 'border-primary/30 bg-primary/10' : 'border-transparent bg-background hover:border-foreground/10 hover:bg-foreground/[0.03]'">
              <div class="flex items-start justify-between gap-3"><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><p class="truncate text-sm font-black text-foreground">{{ getSessionContact(session) }}</p><span class="shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest" :class="getSessionChannelBadge(session)">{{ getSessionChannelLabel(session) }}</span></div><p class="mt-1 line-clamp-2 text-xs leading-5 text-foreground/50">{{ getSessionPreview(session) }}</p><div class="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-widest text-foreground/35"><span class="inline-flex items-center gap-1.5"><Clock class="h-3.5 w-3.5" /><template v-if="isMounted">{{ formatDate(session.created_at) }}</template><template v-else>Loading...</template></span><span>{{ getSessionMessageCount(session) }} messages</span></div></div><ChevronRight class="mt-1 h-4 w-4 shrink-0 text-foreground/25" /></div>
            </button>
          </div>
        </div>

        <div v-if="totalPages > 1" class="flex items-center justify-between border-t border-foreground/10 bg-background px-4 py-3"><button @click="currentPage = Math.max(1, currentPage - 1)" :disabled="currentPage === 1" class="rounded-xl border border-foreground/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/50 disabled:opacity-30">Prev</button><p class="text-xs font-bold text-foreground/55">{{ currentPage }} / {{ totalPages }}</p><button @click="currentPage = Math.min(totalPages, currentPage + 1)" :disabled="currentPage === totalPages" class="rounded-xl border border-foreground/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/50 disabled:opacity-30">Next</button></div>
      </aside>

      <main class="min-h-[520px] bg-background">
        <template v-if="activeSession">
          <div class="flex h-full min-h-[520px] flex-col">
            <header class="border-b border-foreground/10 bg-background/95 px-5 py-4 backdrop-blur-xl">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div class="flex flex-wrap items-center gap-2"><h3 class="text-lg font-black text-foreground">{{ getSessionContact(activeSession) }}</h3><span class="rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest" :class="getSessionChannelBadge(activeSession)">{{ getSessionChannelLabel(activeSession) }}</span></div><p class="mt-1 text-xs font-medium text-foreground/50">Selected conversation thread</p></div><div v-if="activeSessionFacts" class="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest text-foreground/40"><span class="rounded-full border border-foreground/10 bg-foreground/[0.02] px-3 py-1.5">{{ activeSessionFacts.messageCount }} messages</span><span class="rounded-full border border-foreground/10 bg-foreground/[0.02] px-3 py-1.5">{{ formatDate(activeSessionFacts.lastActivity) }}</span></div></div>
            </header>
            <div class="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.05),transparent_55%)] px-4 py-6 sm:px-6">
              <div v-if="activeSession.chat_messages?.length" class="mx-auto max-w-4xl space-y-5">
                <div v-for="msg in activeSession.chat_messages" :key="msg.id" class="flex" :class="msg.role === 'assistant' ? 'justify-start' : 'justify-end'"><div class="max-w-[92%] sm:max-w-[76%]"><div class="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest" :class="msg.role === 'assistant' ? 'text-foreground/40' : 'justify-end text-primary'"><template v-if="msg.role === 'assistant'"><Bot class="h-3.5 w-3.5" />Assistant</template><template v-else>Visitor<User class="h-3.5 w-3.5" /></template></div><div class="rounded-2xl border px-4 py-3 text-sm leading-7 shadow-sm" :class="msg.role === 'assistant' ? 'border-foreground/10 bg-foreground/[0.03] text-foreground/80 rounded-tl-sm' : 'border-primary/20 bg-primary text-black rounded-tr-sm'">{{ msg.content }}</div><p class="mt-2 text-[10px] font-black uppercase tracking-widest text-foreground/35" :class="msg.role === 'assistant' ? '' : 'text-right'">{{ formatLongDate(msg.created_at) }}</p></div></div>
              </div>
              <div v-else class="flex h-full min-h-[260px] flex-col items-center justify-center text-center text-foreground/50"><Activity class="mb-3 h-10 w-10 opacity-20" /><p class="text-[10px] font-black uppercase tracking-widest">No visible messages</p></div>
            </div>
          </div>
        </template>
        <div v-else class="flex h-full min-h-[520px] flex-col items-center justify-center text-center text-foreground/50"><MessageCircle class="mb-4 h-12 w-12 opacity-15" /><h3 class="text-sm font-black uppercase tracking-widest text-foreground/45">Select a conversation</h3><p class="mt-2 max-w-sm text-sm text-foreground/40">Choose a session from the left panel to inspect the full message flow.</p></div>
      </main>
    </section>
  </div>
</template>
