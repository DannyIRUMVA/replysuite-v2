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
  <div class="space-y-6 pb-24 lg:pb-0">
    <!-- Stats Row (Loading or Data) -->
    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="glass-card !p-5 bg-foreground/[0.01]">
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
      <div v-for="stat in fleetStats" :key="stat.label" class="glass-card !p-5 bg-foreground/[0.01]">
        <div class="flex items-center gap-4">
          <div class="w-11 h-11 shrink-0 bg-foreground/5 rounded-xl flex items-center justify-center">
            <component :is="stat.icon" class="w-5 h-5 text-foreground/50" />
          </div>
          <div class="min-h-[44px] flex flex-col justify-center">
            <p class="text-[13px] font-bold tracking-widest text-foreground/50 mb-0.5 uppercase">{{ stat.label }}</p>
            <p class="text-[23px] font-bold text-foreground leading-none italic-none">{{ stat.value }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Agents Table -->
    <div v-if="isLoading" class="glass-card !p-0 overflow-hidden bg-foreground/[0.01]">
      <div class="border-b border-foreground/5 p-5">
        <Skeleton width="10rem" height="1rem" />
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[860px] text-left">
          <thead class="bg-foreground/[0.02]">
            <tr>
              <th v-for="heading in ['Assistant', 'Status', 'Language', 'Interactions', 'Training', 'Created', 'Actions']" :key="heading" class="px-5 py-3 text-[10px] font-bold tracking-[0.18em] text-foreground/45 uppercase">
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

    <div v-else-if="agents.length > 0" class="glass-card !p-0 overflow-hidden bg-foreground/[0.01]">
      <div class="flex flex-col gap-3 border-b border-foreground/5 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 class="text-sm font-bold tracking-widest text-foreground uppercase">Assistants</h3>
          <p class="mt-1 text-[12px] text-foreground/50">Manage configuration, training, status, and assistant activity in one table.</p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <NuxtLink
            to="/dashboard/pricing"
            class="dashboard-header-action-btn"
          >
            <Sparkles class="h-3.5 w-3.5" />
            Upgrade Plan
          </NuxtLink>
          <button
            @click="canCreateAgent ? (showCreateModal = true) : null"
            :disabled="!canCreateAgent"
            :class="[
              'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95',
              canCreateAgent
                ? 'border border-primary/20 bg-primary text-black shadow-sm shadow-primary/10 hover:bg-primary-accent dark:shadow-lg dark:shadow-primary/20'
                : 'cursor-not-allowed border border-foreground/10 bg-foreground/5 text-foreground/40'
            ]"
          >
            <Plus class="h-3.5 w-3.5" />
            {{ canCreateAgent ? 'Create Chatbot' : 'Limit Reached' }}
          </button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[1020px] text-left">
          <thead class="bg-foreground/[0.02]">
            <tr>
              <th class="px-5 py-3 text-[10px] font-bold tracking-[0.18em] text-foreground/45 uppercase">Assistant</th>
              <th class="px-5 py-3 text-[10px] font-bold tracking-[0.18em] text-foreground/45 uppercase">Status</th>
              <th class="px-5 py-3 text-[10px] font-bold tracking-[0.18em] text-foreground/45 uppercase">Language</th>
              <th class="px-5 py-3 text-[10px] font-bold tracking-[0.18em] text-foreground/45 uppercase">Interactions</th>
              <th class="px-5 py-3 text-[10px] font-bold tracking-[0.18em] text-foreground/45 uppercase">Training</th>
              <th class="px-5 py-3 text-[10px] font-bold tracking-[0.18em] text-foreground/45 uppercase">Created</th>
              <th class="px-5 py-3 text-right text-[10px] font-bold tracking-[0.18em] text-foreground/45 uppercase">Actions</th>
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
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-foreground/5 bg-gradient-to-br from-primary/20 to-primary-accent/5 shadow-inner">
                    <Bot class="h-5 w-5 text-primary" />
                  </div>
                  <div class="min-w-0">
                    <NuxtLink :to="`/dashboard/agents/${agent.id}`" class="block max-w-[220px] truncate text-[13px] font-bold tracking-tight text-foreground transition-colors hover:text-primary uppercase">
                      {{ agent.name }}
                    </NuxtLink>
                    <p class="mt-1 max-w-[320px] truncate text-[12px] text-foreground/45">
                      {{ agent.system_prompt || 'No assistant instructions configured yet.' }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4 align-middle">
                <div
                  :class="[
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase',
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
                <div class="inline-flex items-center gap-2 text-[12px] font-bold text-foreground/70">
                  <Globe class="h-3.5 w-3.5 text-foreground/35" />
                  {{ agent.default_language || 'English' }}
                </div>
              </td>
              <td class="px-5 py-4 align-middle">
                <div class="inline-flex items-center gap-2 text-[12px] font-extrabold text-foreground/75">
                  <Activity class="h-3.5 w-3.5 text-foreground/40" />
                  {{ agent.interaction_count.toLocaleString() }}
                </div>
              </td>
              <td class="px-5 py-4 align-middle">
                <NuxtLink
                  :to="`/dashboard/agents/skills/training?id=${agent.id}`"
                  class="inline-flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/10 px-3 py-2 text-[10px] font-black tracking-widest text-primary transition-all hover:border-primary/25 hover:bg-primary/15 uppercase"
                >
                  <Database class="h-3.5 w-3.5" />
                  Train
                </NuxtLink>
              </td>
              <td class="px-5 py-4 align-middle">
                <div class="inline-flex items-center gap-2 text-[12px] font-bold text-foreground/55">
                  <Clock class="h-3.5 w-3.5 text-foreground/35" />
                  {{ new Date(agent.created_at).toLocaleDateString() }}
                </div>
              </td>
              <td class="px-5 py-4 align-middle">
                <div class="flex flex-col items-end gap-2">
                  <button
                    @click.stop="toggleActionMenu(agent.id, $event)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/5 text-foreground/50 transition-all hover:bg-foreground/10 hover:text-foreground"
                    title="Assistant actions"
                    aria-label="Assistant actions"
                  >
                    <MoreVertical class="h-4 w-4" />
                  </button>

                  <Teleport to="body">
                    <div
                      v-if="openActionMenuId === agent.id"
                      class="fixed z-[120] w-52 overflow-hidden rounded-2xl border border-foreground/10 bg-background p-1.5 text-left shadow-2xl shadow-black/15"
                      :style="{ top: `${actionMenuPosition.top}px`, left: `${actionMenuPosition.left}px` }"
                      @click.stop
                    >
                    <NuxtLink
                      :to="`/dashboard/agents/skills?id=${agent.id}`"
                      @click="openActionMenuId = null"
                      class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-bold tracking-widest text-primary transition-all hover:bg-primary/10 uppercase"
                    >
                      <Sparkles class="h-3.5 w-3.5" />
                      Skills
                    </NuxtLink>
                    <NuxtLink
                      :to="`/dashboard/agents/tools?id=${agent.id}`"
                      @click="openActionMenuId = null"
                      class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-bold tracking-widest text-foreground/70 transition-all hover:bg-foreground/5 hover:text-foreground uppercase"
                    >
                      <CalendarDays class="h-3.5 w-3.5" />
                      Tools
                    </NuxtLink>
                    <NuxtLink
                      :to="`/dashboard/agents/${agent.id}`"
                      @click="openActionMenuId = null"
                      class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-bold tracking-widest text-foreground/70 transition-all hover:bg-foreground/5 hover:text-foreground uppercase"
                    >
                      <Edit3 class="h-3.5 w-3.5" />
                      Configure
                    </NuxtLink>
                    <button
                      @click="openActionMenuId = null; handleDelete(agent.id)"
                      class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold tracking-widest text-red-400 transition-all hover:bg-red-400/10 uppercase"
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

    <div v-else class="glass-card flex flex-col items-center py-20 text-center border-dashed border-foreground/10 bg-foreground/[0.01]">
      <div class="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mb-6 border border-primary/10">
        <Bot class="w-10 h-10 text-primary" />
      </div>
      <h3 class="text-[26px] font-bold text-foreground mb-2 tracking-tight italic-none uppercase">No Assistants Yet</h3>
      <p class="text-foreground/50 text-[18px] max-w-sm mb-10 leading-relaxed italic-none">Create your first AI assistant to start automating customer support and lead capture.</p>
      
      <button 
        @click="showCreateModal = true"
        class="flex items-center gap-2 text-primary font-bold tracking-widest text-[14px] uppercase"
      >
        <Plus class="w-4 h-4" />
        Create Your First Assistant
      </button>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
      <div class="absolute inset-0 bg-background/80 backdrop-blur-sm" @click="showCreateModal = false"></div>
      
      <div class="relative w-full max-w-lg bg-background border border-foreground/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div class="p-8">
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-xl font-bold text-foreground tracking-tight italic-none uppercase">Create AI Assistant</h3>
            <button @click="showCreateModal = false" class="p-2 text-foreground/50 hover:text-foreground transition-colors">
              <Plus class="w-6 h-6 rotate-45" />
            </button>
          </div>
          
          <div class="space-y-6">
            <div>
              <label class="block text-[14px] font-bold tracking-widest text-foreground/50 uppercase mb-2">Assistant Name</label>
              <input 
                v-model="newAgent.name"
                placeholder="e.g. Sales Pilot"
                class="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            
            <div>
              <label class="block text-[14px] font-bold tracking-widest text-foreground/50 uppercase mb-2">Assistant Instructions</label>
              <textarea 
                v-model="newAgent.system_prompt"
                rows="5"
                placeholder="Describe how your assistant should behave..."
                class="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors resize-none mb-2"
              ></textarea>
              <p class="text-[13px] text-foreground/50 leading-relaxed italic-none">
                <Info class="w-3 h-3 inline mr-1" />
                These instructions define your assistant's tone, behavior, and response style.
              </p>
            </div>

            <div>
              <label class="block text-[14px] font-bold tracking-widest text-foreground/50 uppercase mb-2">Default Language</label>
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
              class="flex-1 py-3 text-[14px] font-bold tracking-widest text-foreground/50 hover:bg-foreground/5 rounded-xl transition-all"
            >
              CANCEL
            </button>
            <button 
              @click="handleCreate"
              :disabled="isCreating || !newAgent.name"
              class="flex-1 py-3 bg-primary text-black font-bold tracking-widest text-[14px] rounded-xl hover:bg-primary-accent transition-all shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Loader2 v-if="isCreating" class="w-4 h-4 animate-spin" />
              INITIATE FORGE
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.italic-none {
  font-style: normal !important;
}
</style>