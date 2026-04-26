<script setup lang="ts">
import { 
  MessageCircle, 
  Bot, 
  Search,
  User,
  Clock,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  Activity,
  Download,
  FileSpreadsheet
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

// Pagination state
const currentPage = useState<number>('conv-current-page', () => 1)
const pageSize = ref(10)
const totalPages = useState<number>('conv-total-pages', () => 0)

const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

// Fetch user's chatbots
const { data: chatbots } = await useAsyncData('user-chatbots-conv', async () => {
    if (!userId.value) return []
    const { data } = await supabase.from('chatbots').select('id, name').eq('user_id', userId.value).is('deleted_at', null)
    
    // Auto-select first chatbot on server
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

// Removed watchEffect for initial selection - now handled in useAsyncData for SSR safety

// Reset to first page when changing chatbots
watch(selectedChatbotId, () => {
    currentPage.value = 1
})

// Fetch Sessions securely mapping internal messages on join
const { data: rawSessions, pending: loadingSessions, refresh: refreshSessions } = await useAsyncData(`sessions-${selectedChatbotId.value}-${currentPage.value}`, async () => {
    if (!selectedChatbotId.value) return []
    
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value - 1

    // We want the sessions with their nested messages using robust query selection
    const { data, error, count } = await supabase
        .from('chat_sessions')
        .select(`
            *,
            chat_messages (
                *
            )
        `, { count: 'exact' })
        .eq('chatbot_id', selectedChatbotId.value)
        .order('created_at', { ascending: false })
        .range(start, end)

    if (error) {
        console.error('Error fetching sessions:', error)
        notify.error('Failed to load chat parameters.')
        return []
    }
    
    // Update total pages on server so it hydrates correctly
    totalPages.value = Math.ceil((count || 0) / pageSize.value)
    
    // Sort chat_messages by created_at asc inside each session to show natural timeline progression
    const sortedData = data?.map(session => {
        const sortedMessages = (session.chat_messages || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        return { ...session, chat_messages: sortedMessages }
    })
    
    // Auto-select first session on server
    if (sortedData && sortedData.length > 0 && (!activeSessionId.value || !sortedData.find(s => s.id === activeSessionId.value))) {
        activeSessionId.value = sortedData[0].id
    }
    
    return sortedData || []
}, { watch: [selectedChatbotId, currentPage] })

const sessions = computed(() => rawSessions.value || [])

// Removed watch for initial selection - now handled in useAsyncData for SSR safety

const activeSession = computed(() => {
    return sessions.value.find(s => s.id === activeSessionId.value) || null
})

const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

// Export Logic
const isExporting = ref(false)
const exportToCSV = async () => {
    // Check membership (Silver or Gold)
    const allowedPlans = ['silver', 'gold']
    if (!allowedPlans.includes(planSlug.value || '')) {
        notify.error('Exporting is a premium feature. Please upgrade to Silver or Gold.')
        return
    }

    if (!selectedChatbotId.value) return

    isExporting.value = true
    try {
        // Fetch ALL data for this chatbot for export
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

        // CSV Generation
        const headers = ['Session ID', 'Session Date', 'User/Contact', 'Platform', 'Role', 'Message', 'Message Date']
        const csvRows = [headers.join(',')]

        data.forEach(session => {
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
                    `"${msg.content.replace(/"/g, '""')}"`,
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
        
        notify.success('Log export initiated successfully.')
    } catch (err: any) {
        console.error('Export error:', err)
        notify.error('Failed to generate export file.')
    } finally {
        isExporting.value = false
    }
}
</script>

<template>
  <div class="h-[calc(100vh-6rem)] flex flex-col pt-4">
    <!-- Header Controls -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 shrink-0">
      <div class="max-w-xl">
        <h2 class="text-xl font-bold tracking-tight text-white mb-2 uppercase">Conversations Logs</h2>
        <p class="text-gray-500 text-sm">Analyze raw engagement threads generated by your AI counterparts.</p>
      </div>

      <div class="flex items-center gap-3">
        <button 
          @click="exportToCSV"
          :disabled="isExporting"
          class="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <Download v-if="!isExporting" class="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
          <div v-else class="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          {{ isExporting ? 'Preparing...' : 'Export Logs' }}
        </button>

        <div class="flex items-center gap-4 relative min-w-[250px]">
            <CustomSelect 
              v-model="selectedChatbotId"
              :options="botOptions"
              placeholder="Select Chatbot Agent"
              class="w-full"
            />
        </div>
      </div>
    </div>

    <!-- Interface Structure -->
    <div class="flex-1 min-h-0 bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden flex shadow-2xl">
        
        <!-- Sidebar Contacts / Sessions -->
        <div class="w-full md:w-[350px] border-r border-white/5 flex flex-col bg-[#050505]/50">
            <div class="p-5 border-b border-white/5 shrink-0">
                <div class="relative">
                    <Search class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder="Search conversations..." class="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs text-white uppercase tracking-widest focus:outline-none focus:border-primary/30 transition-all">
                </div>
            </div>

            <div class="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 custom-scrollbar">
                <div v-if="loadingSessions && sessions.length === 0" class="flex flex-col items-center justify-center h-40 text-gray-600 space-y-4">
                    <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span class="text-[10px] uppercase tracking-widest font-bold">Decrypting Logs...</span>
                </div>
                
                <div v-else-if="sessions.length === 0" class="flex flex-col items-center justify-center p-8 text-center text-gray-500 h-40">
                     <MessageCircle class="w-8 h-8 opacity-20 mb-3" />
                     <p class="text-[10px] uppercase tracking-widest font-bold">No Records Found</p>
                </div>

                <div v-else v-for="session in sessions" :key="session.id" 
                     @click="activeSessionId = session.id"
                     class="p-4 rounded-2xl cursor-pointer transition-all duration-300 relative group overflow-hidden border"
                     :class="[
                         activeSessionId === session.id 
                            ? 'bg-primary/10 border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.05)]' 
                            : 'bg-transparent border-transparent hover:bg-white/5'
                     ]">
                     <div class="flex items-center justify-between mb-3">
                         <span class="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <span v-if="session.metadata?.type === 'whatsapp'" class="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(22,163,74,0.5)]"></span>
                            <span v-else class="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"></span>
                            <span class="truncate w-32 block">{{ session.metadata?.username || session.metadata?.phone || 'Anonymous Session' }}</span>
                         </span>
                         <span class="text-[9px] text-gray-600 tracking-widest whitespace-nowrap font-black">
                            <template v-if="isMounted">{{ formatDate(session.created_at) }}</template>
                            <template v-else>Loading...</template>
                         </span>
                     </div>
                     <p class="text-[11px] text-gray-500 line-clamp-1 italic-none truncate w-full flex items-center gap-2">
                        <span class="uppercase tracking-[0.1em] text-[8px] opacity-70 bg-black border border-white/5 px-1.5 py-0.5 rounded font-black">{{ session.metadata?.type || 'Web' }}</span>
                        <span class="truncate opacity-80 group-hover:opacity-100 transition-opacity">{{ session.chat_messages && session.chat_messages.length > 0 ? session.chat_messages[session.chat_messages.length - 1].content : 'Initialization phase...' }}</span>
                     </p>
                </div>
            </div>

            <!-- Sidebar Pagination -->
            <ClientOnly>
                <div v-if="totalPages > 1" class="p-4 border-t border-white/5 bg-[#080808] flex items-center justify-between">
                    <button 
                    @click="currentPage > 1 ? currentPage-- : null"
                    :disabled="currentPage === 1"
                    class="p-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 disabled:opacity-20 transition-all"
                    >
                    <ChevronLeft class="w-4 h-4 text-white" />
                    </button>

                    <div class="flex flex-col items-center">
                        <span class="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Grid Page</span>
                        <span class="text-xs font-bold text-white tracking-tighter">{{ currentPage }} <span class="text-gray-600 mx-1">/</span> {{ totalPages }}</span>
                    </div>

                    <button 
                    @click="currentPage < totalPages ? currentPage++ : null"
                    :disabled="currentPage === totalPages"
                    class="p-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 disabled:opacity-20 transition-all"
                    >
                    <ChevronRight class="w-4 h-4 text-white" />
                    </button>
                </div>
            </ClientOnly>
        </div>

        <!-- Conversation Details -->
        <div class="hidden md:flex flex-1 flex-col bg-[#080808] relative">
            <template v-if="activeSession">
                <!-- Thread Header -->
                <div class="h-[80px] shrink-0 border-b border-white/5 flex items-center justify-between px-8 bg-[#0a0a0a]/50 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center shadow-lg border border-white/5">
                            <User class="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                            <h3 class="font-bold text-white uppercase tracking-widest text-sm mb-1">{{ activeSession.metadata?.username || activeSession.metadata?.phone || 'Anonymous Entity' }}</h3>
                            <p class="text-[9px] text-primary tracking-widest font-black uppercase flex items-center gap-2 bg-primary/10 px-2 py-0.5 rounded w-max border border-primary/20">
                                <Activity class="w-3 h-3" /> System Tracking Engaged
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Messages Area -->
                <div class="flex-1 overflow-y-auto p-8 pt-[120px] pb-32 space-y-6 custom-scrollbar bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02)_0%,transparent_100%)]">
                    <div v-if="activeSession.chat_messages && activeSession.chat_messages.length === 0" class="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                        <Activity class="w-12 h-12 mb-4" />
                        <p class="text-xs uppercase tracking-widest font-black">No Messages Recorded in Grid</p>
                    </div>

                    <template v-for="msg in activeSession.chat_messages" :key="msg.id">
                        <!-- Bot Message -->
                        <div v-if="msg.role === 'assistant'" class="flex gap-4 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div class="w-10 h-10 rounded-[14px] bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 shadow-[0_0_20px_rgba(var(--primary),0.1)]">
                                <Bot class="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <div class="bg-[#111] border border-white/5 rounded-2xl rounded-tl-sm p-4 text-[13px] text-gray-300 leading-relaxed shadow-xl">
                                    {{ msg.content }}
                                </div>
                                <span class="text-[9px] text-gray-600 uppercase tracking-widest font-black mt-2 ml-1 block">{{ formatDate(msg.created_at) }}</span>
                            </div>
                        </div>

                        <!-- User Message -->
                        <div v-else class="flex gap-4 max-w-[85%] ml-auto justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div class="flex flex-col items-end">
                                <div class="bg-gradient-to-r from-primary to-primary-accent border border-primary/20 rounded-2xl rounded-tr-sm p-4 text-[13px] text-black font-medium leading-relaxed shadow-xl shadow-primary/10">
                                    {{ msg.content }}
                                </div>
                                <span class="text-[9px] text-gray-600 uppercase tracking-widest font-black mt-2 mr-1 block">{{ formatDate(msg.created_at) }}</span>
                            </div>
                        </div>
                    </template>
                </div>

                <div class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#080808] to-transparent pointer-events-none"></div>
            </template>
            <div v-else class="flex-1 flex flex-col items-center justify-center text-gray-500">
                <MessageCircle class="w-16 h-16 opacity-10 mb-6" />
                <h3 class="text-sm font-bold uppercase tracking-widest mb-2 text-gray-400">Awaiting Feed Selection</h3>
                <p class="text-[10px] uppercase tracking-widest opacity-40">Select a communication tunnel from the sidebar</p>
            </div>
        </div>

    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: rgba(var(--primary), 0.3);
}
</style>
