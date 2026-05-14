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
  Globe
} from 'lucide-vue-next'
import Skeleton from '~~/app/components/Skeleton.vue'

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

const newAgent = ref({
  name: '',
  system_prompt: '',
  default_language: 'English'
})

const languageOptions = [
  { label: 'Kinyarwanda', value: 'Kinyarwanda' },
  { label: 'English', value: 'English' },
  { label: 'French', value: 'French' },
  { label: 'Chinese', value: 'Chinese' },
  { label: 'Kirundi', value: 'Kirundi' },
  { label: 'Swahili', value: 'Swahili' },
  { label: 'Spanish', value: 'Spanish' },
  { label: 'Portuguese', value: 'Portuguese' },
  { label: 'German', value: 'German' }
]

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
        default_language: newAgent.value.default_language
      })
      .select()
      .single()

    if (error) throw error
    if (data) {
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
  <div class="space-y-12 pb-24 lg:pb-0">
    <div class="flex justify-end">
      <div class="flex flex-col items-start md:items-end gap-2">
        <button 
          @click="canCreateAgent ? (showCreateModal = true) : null"
          :class="[
            'flex items-center gap-3 px-6 py-3 font-bold rounded-2xl transition-all shadow-lg text-[11px] tracking-widest uppercase',
            canCreateAgent 
              ? 'bg-primary text-black hover:bg-primary-accent shadow-primary/10' 
              : 'bg-foreground/5 text-foreground/50 cursor-not-allowed opacity-60'
          ]"
        >
          <Plus class="w-5 h-5" />
          {{ canCreateAgent ? 'Create New Assistant' : 'Assistant Limit Reached' }}
        </button>

        <NuxtLink
          v-if="!canCreateAgent"
          to="/dashboard/pricing"
          class="text-[10px] font-bold tracking-widest uppercase text-primary hover:text-primary-accent transition-colors"
        >
          Need more assistants? Upgrade your plan
        </NuxtLink>
      </div>
    </div>

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

    <!-- Agents Grid -->
    <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div v-for="i in 2" :key="i" class="glass-card !p-0 overflow-hidden bg-foreground/[0.01] opacity-60">
        <div class="p-6">
          <div class="flex items-start justify-between mb-6">
            <div class="flex items-center gap-4">
               <Skeleton width="3rem" height="3rem" radius="1rem" />
               <div class="space-y-2">
                  <Skeleton width="8rem" height="1rem" />
                  <Skeleton width="4rem" height="0.5rem" />
               </div>
            </div>
            <Skeleton width="2rem" height="2rem" radius="0.5rem" />
          </div>
          <Skeleton width="100%" height="4rem" radius="1rem" class="mb-6" />
          <div class="flex gap-4">
             <Skeleton width="6rem" height="0.75rem" />
             <Skeleton width="8rem" height="0.75rem" />
          </div>
          <div class="mt-8 flex gap-3">
             <Skeleton width="40%" height="2.5rem" radius="0.75rem" />
             <Skeleton width="40%" height="2.5rem" radius="0.75rem" />
             <Skeleton width="3rem" height="2.5rem" radius="0.75rem" />
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="agents.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div 
        v-for="agent in agents" 
        :key="agent.id"
        class="glass-card hover:border-primary/20 transition-all group relative overflow-hidden bg-foreground/[0.01] h-full"
      >
        <div class="absolute top-0 right-0 p-6 opacity-[0.035] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
          <Zap class="w-24 h-24 text-foreground" />
        </div>

        <div class="relative z-10 p-6 flex h-full flex-col">
          <div class="flex items-start justify-between mb-6 gap-4">
            <div class="flex items-center gap-4 min-w-0">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-accent/5 flex items-center justify-center border border-foreground/5 shadow-inner shrink-0">
                <Bot class="w-6 h-6 text-primary" />
              </div>
              <div class="min-w-0">
                <h4 class="font-bold text-foreground tracking-tight uppercase text-[15px] truncate">{{ agent.name }}</h4>
                <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                  <div
                    :class="[
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-bold tracking-widest uppercase',
                      agent.status.tone === 'live' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : '',
                      agent.status.tone === 'web' ? 'border-sky-500/20 bg-sky-500/10 text-sky-400' : '',
                      agent.status.tone === 'ready' ? 'border-primary/20 bg-primary/10 text-primary' : '',
                      agent.status.tone === 'draft' ? 'border-foreground/10 bg-foreground/5 text-foreground/55' : ''
                    ]"
                  >
                    <span
                      :class="[
                        'w-1.5 h-1.5 rounded-full',
                        agent.status.tone === 'live' ? 'bg-emerald-400' : '',
                        agent.status.tone === 'web' ? 'bg-sky-400' : '',
                        agent.status.tone === 'ready' ? 'bg-primary' : '',
                        agent.status.tone === 'draft' ? 'bg-foreground/35' : '',
                        agent.status.pulse ? 'animate-pulse' : ''
                      ]"
                    />
                    {{ agent.status.label }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-foreground/[0.02] border border-foreground/5 rounded-2xl p-4 mb-6 h-[88px] sm:h-[96px] overflow-hidden">
            <p class="text-[14px] text-foreground/60 leading-relaxed line-clamp-3 italic-none">
              {{ agent.system_prompt || 'No assistant instructions configured yet. Default behavior will be used until you add custom guidance.' }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div class="flex items-center gap-2">
              <Activity class="w-3.5 h-3.5 text-foreground/55" />
              <span class="text-[13px] font-extrabold text-foreground/80">
                {{ agent.interaction_count.toLocaleString() }} Interactions
              </span>
            </div>
            <div class="flex items-center gap-2">
              <Clock class="w-3.5 h-3.5 text-foreground/45" />
              <span class="text-[13px] font-bold text-foreground/55">Deployed {{ new Date(agent.created_at).toLocaleDateString() }}</span>
            </div>
          </div>

          <div class="mt-auto pt-8 flex items-center gap-3">
            <NuxtLink 
              :to="`/dashboard/agents/skills/training?id=${agent.id}`"
              class="flex-1 py-2.5 bg-primary/10 hover:bg-primary/20 text-[13px] font-bold tracking-widest text-primary rounded-xl transition-all border border-primary/10 flex items-center justify-center gap-2 uppercase"
            >
              <Database class="w-3.5 h-3.5" />
              Knowledge Base
            </NuxtLink>
            <NuxtLink 
              :to="`/dashboard/agents/${agent.id}`"
              class="flex-1 py-2.5 bg-foreground/5 hover:bg-foreground/10 text-[13px] font-bold tracking-widest text-foreground rounded-xl transition-all border border-foreground/10 flex items-center justify-center gap-2 uppercase"
            >
              <Edit3 class="w-3.5 h-3.5" />
              Configure
            </NuxtLink>
            <button 
              @click="handleDelete(agent.id)"
              class="w-10 h-10 shrink-0 flex items-center justify-center bg-transparent hover:bg-red-400/8 rounded-xl border border-foreground/5 hover:border-red-400/20 text-foreground/35 hover:text-red-400 transition-all uppercase"
              title="Delete agent"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <button 
        v-if="canCreateAgent"
        @click="showCreateModal = true"
        class="glass-card border-dashed transition-all flex flex-col items-center justify-center py-12 group bg-foreground/[0.01] border-foreground/10 hover:border-primary/30"
      >
        <div class="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Plus class="w-6 h-6 text-foreground/50 group-hover:text-primary" />
        </div>
        <span class="text-[13px] font-bold tracking-widest text-foreground/50 uppercase">
          Forge New Agent
        </span>
      </button>

      <NuxtLink
        v-else
        to="/dashboard/pricing"
        class="glass-card border-dashed transition-all flex flex-col items-center justify-center py-12 group bg-foreground/[0.01] border-foreground/10 hover:border-primary/30"
      >
        <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
          <Sparkles class="w-6 h-6 text-primary" />
        </div>
        <span class="text-[13px] font-bold tracking-widest text-foreground/70 uppercase text-center">
          Agent Limit Reached
        </span>
        <span class="mt-2 text-[13px] font-bold tracking-widest text-primary uppercase text-center">
          Upgrade for more agents
        </span>
      </NuxtLink>
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