<script setup lang="ts">
import {
 Plus,
 Bot,
 Trash2,
 Edit3,
 MessageSquare,
 Zap,
 Info,
 Loader2,
 AlertCircle,
 MoreVertical,
 CheckCircle2,
 Clock,
 Activity,
 Sparkles,
 Database,
 Search,
 Globe,
 CalendarDays
} from 'lucide-vue-next'
import Skeleton from '~~/app/components/Skeleton.vue'
import { chatbotLanguageOptions, getChatbotLanguageCode, normalizeChatbotLanguageName } from '~~/app/utils/chatbotLanguages'

definePageMeta({
 middleware: 'auth',
 layout: 'dashboard'
})

useHead({
 title: 'AI Assistants'
})

const { userId, limits, isVerified, isLoading: authLoading } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()

// State
const isCreating = ref(false)
const showCreateModal = ref(false)
const openActionMenuId = ref<string | null>(null)
const actionMenuPosition = ref({ top: 0, left: 0 })

const toggleActionMenu = (agentId: string, event: MouseEvent) => {
 if (openActionMenuId.value === agentId) {
 openActionMenuId.value = null
 return
 }

 const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
 const menuWidth = 208
 actionMenuPosition.value = {
 top: rect.bottom + 8,
 left: Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)),
 }
 openActionMenuId.value = agentId
}

const newAgent = ref({
 name: '',
 system_prompt: '',
 default_language: 'English'
})

const languageOptions = chatbotLanguageOptions

const agents = computed(() => pageData.value?.agents || [])
const stats = computed(() => pageData.value?.stats || {
 totalChats: 0,
 totalDataSources: 0,
 liveWebAgents: 0,
 liveWhatsappAgents: 0,
})
const isLoading = computed(() => authLoading.value || dataLoading.value)

const fleetStats = computed(() => [
 { label: 'Active Assistants', value: agents.value.length.toString().padStart(2, '0'), icon: Bot },
 { label: 'Plan Limit', value: `${agents.value.length} / ${limits.value.maxAgents ?? '∞'}`, icon: Sparkles },
 { label: 'Total Interactions', value: stats.value.totalChats.toLocaleString(), icon: MessageSquare },
 { label: 'Data Sources', value: stats.value.totalDataSources.toLocaleString(), icon: Database }
])

// UI State
const canCreateAgent = computed(() => {
 return agents.value.length < (limits.value.maxAgents || 1)
})

const getAgentStatus = (agent: any, dataSourceCount: number, whatsappLiveCount: number) => {
 const allowedDomains = Array.isArray(agent.allowed_domains) ? agent.allowed_domains : []
 const hasWebsiteConnection = !!agent.is_public || allowedDomains.length > 0

 if (hasWebsiteConnection && whatsappLiveCount > 0) {
 return {
 label: 'Live on Web + WhatsApp',
 tone: 'live',
 pulse: true,
 }
 }

 if (whatsappLiveCount > 0) {
 return {
 label: 'Live on WhatsApp',
 tone: 'live',
 pulse: true,
 }
 }

 if (hasWebsiteConnection) {
 return {
 label: 'Live on Web',
 tone: 'web',
 pulse: true,
 }
 }

 if (dataSourceCount > 0) {
 return {
 label: 'Trained',
 tone: 'ready',
 pulse: false,
 }
 }

 return {
 label: 'Draft',
 tone: 'draft',
 pulse: false,
 }
}

// Fetch Data using useAsyncData for consistency with other dashboard pages
const { data: pageData, pending: dataLoading, refresh: refreshAgents } = useAsyncData('agents-data', async () => {
 if (!userId.value) {
 return {
 agents: [],
 stats: {
 totalChats: 0,
 totalDataSources: 0,
 liveWebAgents: 0,
 liveWhatsappAgents: 0,
 }
 }
 }

 const { data: agents, error: agentsError } = await supabase
 .from('chatbots')
 .select('*, data_sources(count)')
 .is('deleted_at', null)
 .eq('user_id', userId.value)
 .order('created_at', { ascending: false })

 if (agentsError) throw agentsError

 const agentIds = (agents || []).map(a => a.id)
 let sessionRows: any[] = []
 let whatsappAccounts: any[] = []

 if (agentIds.length > 0) {
 const [{ data: sessionsData }, { data: whatsappData }] = await Promise.all([
 supabase
 .from('chat_sessions')
 .select('id, chatbot_id')
 .in('chatbot_id', agentIds),
 supabase
 .from('whatsapp_accounts')
 .select('id, chatbot_id, status')
 .in('chatbot_id', agentIds)
 ])

 sessionRows = sessionsData || []
 whatsappAccounts = whatsappData || []
 }

 const interactionCountByAgent = sessionRows.reduce((acc: Record<string, number>, row: any) => {
 if (!row.chatbot_id) return acc
 acc[row.chatbot_id] = (acc[row.chatbot_id] || 0) + 1
 return acc
 }, {})

 const whatsappLiveCountByAgent = whatsappAccounts.reduce((acc: Record<string, number>, row: any) => {
 if (!row.chatbot_id) return acc
 if (!['active', 'deployed'].includes(row.status)) return acc
 acc[row.chatbot_id] = (acc[row.chatbot_id] || 0) + 1
 return acc
 }, {})

 const normalizedAgents = (agents || []).map(a => {
 const dataSourceCount = Array.isArray(a.data_sources) ? (a.data_sources[0]?.count ?? 0) : 0
 const whatsappLiveCount = whatsappLiveCountByAgent[a.id] || 0
 const allowedDomains = Array.isArray(a.allowed_domains) ? a.allowed_domains : []
 const webConnected = !!a.is_public || allowedDomains.length > 0
 const status = getAgentStatus(a, dataSourceCount, whatsappLiveCount)

 return {
 ...a,
 data_source_count: dataSourceCount,
 interaction_count: interactionCountByAgent[a.id] || 0,
 whatsapp_live_count: whatsappLiveCount,
 web_connected: webConnected,
 status,
 }
 })

 const totalDataSources = normalizedAgents.reduce((s, a) => s + a.data_source_count, 0)
 const liveWebAgents = normalizedAgents.filter(a => a.web_connected).length
 const liveWhatsappAgents = normalizedAgents.filter(a => a.whatsapp_live_count > 0).length

 return {
 agents: normalizedAgents,
 stats: {
 totalChats: sessionRows.length,
 totalDataSources,
 liveWebAgents,
 liveWhatsappAgents,
 }
 }
}, {
 watch: [userId]
})


const handleCreate = async () => {
 if (!userId.value || !newAgent.value.name) return
 if (!canCreateAgent.value) {
 notify.warn(`You've reached the limit of ${limits.value.maxAgents} assistants for your current plan.`)
 return
 }

 isCreating.value = true
 try {
 const { data, error } = await supabase
 .from('chatbots')
 .insert({
 user_id: userId.value,
 name: newAgent.value.name,
 system_prompt: newAgent.value.system_prompt,
 default_language: normalizeChatbotLanguageName(newAgent.value.default_language)
 })
 .select()
 .single()

 if (error) throw error
 if (data) {
 const primaryCode = getChatbotLanguageCode(newAgent.value.default_language)
 const languageRows = Array.from(new Set([primaryCode, 'en'])).map((code) => ({
 chatbot_id: data.id,
 language_code: code,
 is_primary: code === primaryCode,
 is_fallback: code === 'en',
 is_enabled: true,
 }))

 const { error: languageError } = await (supabase as any)
 .from('chatbot_languages')
 .upsert(languageRows, { onConflict: 'chatbot_id,language_code' })

 if (languageError) {
 console.warn('[Languages] New agent language mapping will sync after migration deployment:', languageError)
 }

 await refreshAgents()
 showCreateModal.value = false
 newAgent.value = { name: '', system_prompt: '', default_language: 'English' }
 }
 } catch (err) {
 console.error('Error creating agent:', err)
 notify.error('Failed to create agent')
 } finally {
 isCreating.value = false
 }
}

const handleDelete = async (id: string) => {
 if (!(await notify.confirm('Are you sure you want to delete this agent?'))) return

 const { error } = await supabase
 .from('chatbots')
 .update({ deleted_at: new Date().toISOString() })
 .eq('id', id)

 if (!error) {
 await refreshAgents()
 }
}
</script>

<template>
 <div class="mx-auto max-w-7xl space-y-5 pb-24 pt-3 lg:pb-6">
 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
 <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
 <div>
 <p class="dashboard-eyebrow text-primary/80">Assistant command center</p>
 <h1 class="dashboard-section-title mt-2">Assistants</h1>
 <p class="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/65">
 Create, train, configure, and connect the AI assistants that reply across your customer channels.
 </p>
 </div>
 <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
 <NuxtLink to="/dashboard/agents/skills/training" class="dashboard-header-action-btn">
 <Database class="h-3.5 w-3.5" />
 Training
 </NuxtLink>
 <button
 @click="canCreateAgent ? (showCreateModal = true) : null"
 :disabled="!canCreateAgent"
 :class="[
 'inline-flex items-center justify-center gap-2 rounded-[0.39rem] px-3.5 py-2 text-xs font-bold transition active:scale-[0.99]',
 canCreateAgent
 ? 'border border-primary/20 bg-primary text-black shadow-sm shadow-primary/10 hover:bg-primary-accent'
 : 'cursor-not-allowed border border-foreground/10 bg-foreground/5 text-foreground/40'
 ]"
 >
 <Plus class="h-3.5 w-3.5" />
 {{ canCreateAgent ? 'Create assistant' : 'Limit reached' }}
 </button>
 </div>
 </div>
 </section>

 <!-- Stats Row (Loading or Data) -->
 <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <div v-for="i in 4" :key="i" class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-4">
 <div class="flex items-center gap-4">
 <Skeleton width="40px" height="40px" radius="12px" />
 <div class="space-y-2 flex-1">
 <Skeleton width="40%" height="0.6rem" />
 <Skeleton width="60%" height="1rem" />
 </div>
 </div>
 </div>
 </div>

 <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <div v-for="stat in fleetStats" :key="stat.label" class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-4">
 <div class="flex items-center gap-4">
 <div class="w-11 h-11 shrink-0 bg-foreground/5 rounded-[0.39rem] flex items-center justify-center">
 <component :is="stat.icon" class="w-5 h-5 text-foreground/50" />
 </div>
 <div class="min-h-[44px] flex flex-col justify-center">
 <p class="text-sm font-bold text-foreground/50 mb-0.5 ">{{ stat.label }}</p>
 <p class="text-[23px] font-bold text-foreground leading-none italic-none">{{ stat.value }}</p>
 </div>
 </div>
 </div>
 </div>

 <!-- Agents Table -->
 <div v-if="isLoading" class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 overflow-hidden">
 <div class="border-b border-foreground/5 p-5">
 <Skeleton width="10rem" height="1rem" />
 </div>
 <div class="overflow-x-auto">
 <table class="w-full min-w-[860px] text-left">
 <thead class="bg-foreground/[0.02]">
 <tr>
 <th v-for="heading in ['Assistant', 'Status', 'Language', 'Interactions', 'Training', 'Created', 'Actions']" :key="heading" class="px-5 py-3 text-xs font-semibold text-foreground/45">
 {{ heading }}
 </th>
 </tr>
 </thead>
 <tbody class="divide-y divide-foreground/5">
 <tr v-for="i in 4" :key="i">
 <td class="px-5 py-4">
 <div class="flex items-center gap-3">
 <Skeleton width="2.25rem" height="2.25rem" radius="0.75rem" />
 <div class="space-y-2">
 <Skeleton width="8rem" height="0.85rem" />
 <Skeleton width="12rem" height="0.6rem" />
 </div>
 </div>
 </td>
 <td class="px-5 py-4"><Skeleton width="7rem" height="1.25rem" radius="999px" /></td>
 <td class="px-5 py-4"><Skeleton width="5rem" height="0.8rem" /></td>
 <td class="px-5 py-4"><Skeleton width="4rem" height="0.8rem" /></td>
 <td class="px-5 py-4"><Skeleton width="4rem" height="0.8rem" /></td>
 <td class="px-5 py-4"><Skeleton width="6rem" height="0.8rem" /></td>
 <td class="px-5 py-4"><Skeleton width="8rem" height="2rem" radius="0.75rem" /></td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 <div v-else-if="agents.length > 0" class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 overflow-hidden">
 <div class="flex flex-col gap-3 border-b border-foreground/5 p-5 lg:flex-row lg:items-center lg:justify-between">
 <div>
 <h2 class="text-sm font-bold text-foreground">Assistant list</h2>
 <p class="mt-1 text-xs text-foreground/50">Manage configuration, training, status, and assistant activity in one table.</p>
 </div>
 <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
 <NuxtLink to="/dashboard/pricing" class="dashboard-header-action-btn">
 <Sparkles class="h-3.5 w-3.5" />
 Upgrade plan
 </NuxtLink>
 </div>
 </div>

 <div class="overflow-x-auto">
 <table class="w-full min-w-[1020px] text-left">
 <thead class="bg-foreground/[0.02]">
 <tr>
 <th class="px-5 py-3 text-xs font-semibold text-foreground/45">Assistant</th>
 <th class="px-5 py-3 text-xs font-semibold text-foreground/45">Status</th>
 <th class="px-5 py-3 text-xs font-semibold text-foreground/45">Language</th>
 <th class="px-5 py-3 text-xs font-semibold text-foreground/45">Interactions</th>
 <th class="px-5 py-3 text-xs font-semibold text-foreground/45">Training</th>
 <th class="px-5 py-3 text-xs font-semibold text-foreground/45">Created</th>
 <th class="px-5 py-3 text-right text-xs font-semibold text-foreground/45">Actions</th>
 </tr>
 </thead>
 <tbody class="divide-y divide-foreground/5">
 <tr
 v-for="agent in agents"
 :key="agent.id"
 class="group transition-colors hover:bg-foreground/[0.025]"
 >
 <td class="px-5 py-4 align-middle">
 <div class="flex items-center gap-3 min-w-0">
 <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.39rem] border border-foreground/5 bg-gradient-to-br from-primary/20 to-primary-accent/5 shadow-inner">
 <Bot class="h-5 w-5 text-primary" />
 </div>
 <div class="min-w-0">
 <NuxtLink :to="`/dashboard/agents/${agent.id}`" class="block max-w-[220px] truncate text-sm font-bold tracking-tight text-foreground transition-colors hover:text-primary ">
 {{ agent.name }}
 </NuxtLink>
 <p class="mt-1 max-w-[320px] truncate text-xs text-foreground/45">
 {{ agent.system_prompt || 'No assistant instructions configured yet.' }}
 </p>
 </div>
 </div>
 </td>
 <td class="px-5 py-4 align-middle">
 <div
 :class="[
 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ',
 agent.status.tone === 'live' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : '',
 agent.status.tone === 'web' ? 'border-sky-500/20 bg-sky-500/10 text-sky-400' : '',
 agent.status.tone === 'ready' ? 'border-primary/20 bg-primary/10 text-primary' : '',
 agent.status.tone === 'draft' ? 'border-foreground/10 bg-foreground/5 text-foreground/55' : ''
 ]"
 >
 <span
 :class="[
 'h-1.5 w-1.5 rounded-full',
 agent.status.tone === 'live' ? 'bg-emerald-400' : '',
 agent.status.tone === 'web' ? 'bg-sky-400' : '',
 agent.status.tone === 'ready' ? 'bg-primary' : '',
 agent.status.tone === 'draft' ? 'bg-foreground/35' : '',
 agent.status.pulse ? 'animate-pulse' : ''
 ]"
 />
 {{ agent.status.label }}
 </div>
 </td>
 <td class="px-5 py-4 align-middle">
 <div class="inline-flex items-center gap-2 text-xs font-bold text-foreground/70">
 <Globe class="h-3.5 w-3.5 text-foreground/35" />
 {{ agent.default_language || 'English' }}
 </div>
 </td>
 <td class="px-5 py-4 align-middle">
 <div class="inline-flex items-center gap-2 text-xs font-bold text-foreground/75">
 <Activity class="h-3.5 w-3.5 text-foreground/40" />
 {{ agent.interaction_count.toLocaleString() }}
 </div>
 </td>
 <td class="px-5 py-4 align-middle">
 <NuxtLink
 :to="`/dashboard/agents/skills/training?id=${agent.id}`"
 class="inline-flex items-center gap-2 rounded-[0.39rem] border border-primary/15 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-all hover:border-primary/25 hover:bg-primary/15 "
 >
 <Database class="h-3.5 w-3.5" />
 Train
 </NuxtLink>
 </td>
 <td class="px-5 py-4 align-middle">
 <div class="inline-flex items-center gap-2 text-xs font-bold text-foreground/55">
 <Clock class="h-3.5 w-3.5 text-foreground/35" />
 {{ new Date(agent.created_at).toLocaleDateString() }}
 </div>
 </td>
 <td class="px-5 py-4 align-middle">
 <div class="flex flex-col items-end gap-2">
 <button
 @click.stop="toggleActionMenu(agent.id, $event)"
 class="inline-flex h-9 w-9 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-foreground/5 text-foreground/50 transition-all hover:bg-foreground/10 hover:text-foreground"
 title="Assistant actions"
 aria-label="Assistant actions"
 >
 <MoreVertical class="h-4 w-4" />
 </button>

 <Teleport to="body">
 <div
 v-if="openActionMenuId === agent.id"
 class="fixed z-[120] w-52 overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background p-1.5 text-left shadow-xl shadow-black/15"
 :style="{ top: `${actionMenuPosition.top}px`, left: `${actionMenuPosition.left}px` }"
 @click.stop
 >
 <NuxtLink
 :to="`/dashboard/agents/skills?id=${agent.id}`"
 @click="openActionMenuId = null"
 class="flex items-center gap-3 rounded-[0.39rem] px-3 py-2.5 text-xs font-semibold text-primary transition-all hover:bg-primary/10 "
 >
 <Sparkles class="h-3.5 w-3.5" />
 Skills
 </NuxtLink>
 <NuxtLink
 :to="`/dashboard/agents/tools?id=${agent.id}`"
 @click="openActionMenuId = null"
 class="flex items-center gap-3 rounded-[0.39rem] px-3 py-2.5 text-xs font-semibold text-foreground/70 transition-all hover:bg-foreground/5 hover:text-foreground "
 >
 <CalendarDays class="h-3.5 w-3.5" />
 Tools
 </NuxtLink>
 <NuxtLink
 :to="`/dashboard/agents/${agent.id}`"
 @click="openActionMenuId = null"
 class="flex items-center gap-3 rounded-[0.39rem] px-3 py-2.5 text-xs font-semibold text-foreground/70 transition-all hover:bg-foreground/5 hover:text-foreground "
 >
 <Edit3 class="h-3.5 w-3.5" />
 Configure
 </NuxtLink>
 <button
 @click="openActionMenuId = null; handleDelete(agent.id)"
 class="flex w-full items-center gap-3 rounded-[0.39rem] px-3 py-2.5 text-left text-xs font-semibold text-red-400 transition-all hover:bg-red-400/10 "
 >
 <Trash2 class="h-3.5 w-3.5" />
 Delete
 </button>
 </div>
 </Teleport>
 </div>
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 <div v-else class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 flex flex-col items-center py-12 text-center border-dashed">
 <div class="w-14 h-14 bg-primary/5 rounded-[0.39rem] flex items-center justify-center mb-4 border border-primary/10">
 <Bot class="w-7 h-7 text-primary" />
 </div>
 <h3 class="text-xl font-bold text-foreground mb-2 tracking-tight ">No assistants yet</h3>
 <p class="text-foreground/50 text-sm max-w-sm mb-6 leading-relaxed italic-none">Create your first AI assistant to start automating customer support and lead capture.</p>

 <button
 @click="showCreateModal = true"
 class="inline-flex items-center gap-2 rounded-[0.39rem] bg-primary px-4 py-2 text-xs font-bold text-black transition hover:bg-primary-accent"
 >
 <Plus class="w-4 h-4" />
 Create your first assistant
 </button>
 </div>

 <!-- Create Modal -->
 <div v-if="showCreateModal" class="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
 <div class="absolute inset-0 bg-background/80 backdrop-blur-sm" @click="showCreateModal = false"></div>

 <div class="relative w-full max-w-lg bg-background border border-foreground/10 rounded-[0.39rem] overflow-hidden shadow-xl animate-in zoom-in-95 duration-200">
 <div class="p-5">
 <div class="flex items-center justify-between mb-4">
 <h3 class="text-xl font-bold text-foreground tracking-tight ">Create assistant</h3>
 <button @click="showCreateModal = false" class="p-2 text-foreground/50 hover:text-foreground transition-colors">
 <Plus class="w-6 h-6 rotate-45" />
 </button>
 </div>

 <div class="space-y-6">
 <div>
 <label class="block text-sm font-bold text-foreground/50 mb-2">Assistant name</label>
 <input
 v-model="newAgent.name"
 placeholder="e.g. Sales Pilot"
 class="w-full bg-foreground/5 border border-foreground/10 rounded-[0.39rem] px-4 py-3 text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors"
 />
 </div>

 <div>
 <label class="block text-sm font-bold text-foreground/50 mb-2">Assistant instructions</label>
 <textarea
 v-model="newAgent.system_prompt"
 rows="5"
 placeholder="Describe how your assistant should behave..."
 class="w-full bg-foreground/5 border border-foreground/10 rounded-[0.39rem] px-4 py-3 text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors resize-none mb-2"
 ></textarea>
 <p class="text-sm text-foreground/50 leading-relaxed italic-none">
 <Info class="w-3 h-3 inline mr-1" />
 These instructions define your assistant's tone, behavior, and response style.
 </p>
 </div>

 <div>
 <label class="block text-sm font-bold text-foreground/50 mb-2">Default language</label>
 <CustomSelect
 v-model="newAgent.default_language"
 :options="languageOptions"
 placeholder="Select Language"
 />
 </div>
 </div>

 <div class="mt-10 flex gap-4">
 <button
 @click="showCreateModal = false"
 class="flex-1 py-3 text-sm font-bold text-foreground/50 hover:bg-foreground/5 rounded-[0.39rem] transition-all"
 >
 Cancel
 </button>
 <button
 @click="handleCreate"
 :disabled="isCreating || !newAgent.name"
 class="flex flex-1 items-center justify-center gap-2 rounded-[0.39rem] bg-primary py-3 text-sm font-bold text-black shadow-sm shadow-primary/10 transition hover:bg-primary-accent disabled:opacity-50"
 >
 <Loader2 v-if="isCreating" class="w-4 h-4 animate-spin" />
 Create assistant
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
</template>

<style scoped>
.{
 font-style: normal !important;
}
</style>
