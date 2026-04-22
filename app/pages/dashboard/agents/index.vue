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

// UI State
const canCreateAgent = computed(() => {
  return agents.value.length < (limits.value.maxAgents || 1)
})

// Fetch Data using useAsyncData for consistency with other dashboard pages
const { data: agentsData, pending: dataLoading, refresh: refreshAgents } = useAsyncData('agents-list', async () => {
  if (!userId.value) return []
  
  const { data, error } = await supabase
    .from('chatbots')
    .select('*')
    .is('deleted_at', null)
    .eq('user_id', userId.value)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}, {
  watch: [userId]
})

const agents = computed(() => agentsData.value || [])
const isLoading = computed(() => authLoading.value || dataLoading.value)

const handleCreate = async () => {
  if (!userId.value || !newAgent.value.name) return
  if (!canCreateAgent.value) {
    notify.warn(`You've reached the limit of ${limits.value.maxAgents} agents for your current plan.`)
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
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="max-w-xl">
        <h2 class="text-xl font-bold tracking-tight text-white mb-2 italic-none uppercase">AI Agents</h2>
        <p class="text-gray-500 text-sm italic-none">Deploy and manage your fleet of intelligent conversation specialists.</p>
      </div>
      
      <button 
        @click="canCreateAgent ? (showCreateModal = true) : null"
        :class="[
          'flex items-center gap-3 px-6 py-3 font-bold rounded-2xl transition-all shadow-lg text-[11px] tracking-widest uppercase',
          canCreateAgent 
            ? 'bg-primary text-black hover:bg-primary-accent shadow-primary/10' 
            : 'bg-white/5 text-gray-500 cursor-not-allowed opacity-50'
        ]"
      >
        <Plus class="w-5 h-5" />
        {{ canCreateAgent ? 'Forge New Agent' : 'Agent Limit Reached' }}
      </button>
    </div>

    <!-- Stats Row (Loading or Data) -->
    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="glass-card !p-5 bg-white/[0.01]">
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
      <div v-for="stat in [
        { label: 'Active Agents', value: agents.length.toString().padStart(2, '0'), icon: Bot },
        { label: 'Success Rate', value: '96.2%', icon: Sparkles },
        { label: 'Total Chats', value: '231', icon: MessageSquare },
        { label: 'Response Time', value: '< 2s', icon: Zap }
      ]" :key="stat.label" class="glass-card !p-5 bg-white/[0.01]">
        <div class="flex items-center gap-4">
          <div class="p-2.5 bg-white/5 rounded-xl">
            <component :is="stat.icon" class="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p class="text-[10px] font-bold tracking-widest text-gray-500 mb-0.5 uppercase">{{ stat.label }}</p>
            <p class="text-lg font-bold text-white leading-none italic-none">{{ stat.value }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Agents Grid -->
    <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div v-for="i in 2" :key="i" class="glass-card !p-0 overflow-hidden bg-white/[0.01] opacity-60">
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
        class="glass-card hover:border-primary/20 transition-all group relative overflow-hidden bg-white/[0.01]"
      >
        <div class="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
          <Zap class="w-24 h-24 text-white" />
        </div>

        <div class="relative z-10 p-6">
          <div class="flex items-start justify-between mb-6">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-accent/5 flex items-center justify-center border border-white/5 shadow-inner">
                <Bot class="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 class="font-bold text-white tracking-tight uppercase text-xs">{{ agent.name }}</h4>
                <div class="flex items-center gap-1.5 mt-1">
                  <div class="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]"></div>
                  <span class="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Active</span>
                </div>
              </div>
            </div>
            
            <button class="p-2 text-gray-600 hover:text-white transition-colors">
              <MoreVertical class="w-5 h-5" />
            </button>
          </div>

          <div class="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-6 min-h-[60px]">
            <p class="text-[11px] text-gray-400 leading-relaxed line-clamp-2 italic-none capitalize">
              {{ agent.system_prompt || 'No system prompt configured. This agent will use default behavioral patterns.' }}
            </p>
          </div>

          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <Activity class="w-3.5 h-3.5 text-gray-600" />
              <span class="text-[10px] font-bold text-gray-400">0 Interactions</span>
            </div>
            <div class="flex items-center gap-2">
              <Clock class="w-3.5 h-3.5 text-gray-600" />
              <span class="text-[10px] font-bold text-gray-400">Deployed {{ new Date(agent.created_at).toLocaleDateString() }}</span>
            </div>
          </div>

          <div class="mt-8 flex items-center gap-3">
            <NuxtLink 
              :to="`/dashboard/agents/training?id=${agent.id}`"
              class="flex-1 py-2.5 bg-primary/10 hover:bg-primary/20 text-[10px] font-bold tracking-widest text-primary rounded-xl transition-all border border-primary/10 flex items-center justify-center gap-2 uppercase"
            >
              <Database class="w-3.5 h-3.5" />
              Knowledge Base
            </NuxtLink>
            <NuxtLink 
              :to="`/dashboard/agents/${agent.id}`"
              class="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-[10px] font-bold tracking-widest text-white rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2 uppercase"
            >
              <Edit3 class="w-3.5 h-3.5" />
              Configure
            </NuxtLink>
            <button 
              @click="handleDelete(agent.id)"
              class="w-11 h-11 flex items-center justify-center bg-white/5 hover:bg-red-400/10 rounded-xl border border-white/5 text-gray-500 hover:text-red-400 transition-all uppercase"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <button 
        @click="canCreateAgent ? (showCreateModal = true) : null"
        :class="[
          'glass-card border-dashed transition-all flex flex-col items-center justify-center py-12 group bg-white/[0.01]',
          canCreateAgent 
            ? 'border-white/10 hover:border-primary/30' 
            : 'border-white/5 cursor-not-allowed opacity-40'
        ]"
      >
        <div class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Plus :class="['w-6 h-6', canCreateAgent ? 'text-gray-600 group-hover:text-primary' : 'text-gray-800']" />
        </div>
        <span class="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
          {{ canCreateAgent ? 'Forge New Agent' : 'Limit Reached' }}
        </span>
      </button>
    </div>

    <div v-else class="glass-card flex flex-col items-center py-20 text-center border-dashed border-white/10 bg-white/[0.01]">
      <div class="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mb-6 border border-primary/10">
        <Bot class="w-10 h-10 text-primary" />
      </div>
      <h3 class="text-xl font-bold text-white mb-2 tracking-tight italic-none uppercase">No Agents Forged Yet</h3>
      <p class="text-gray-500 text-sm max-w-sm mb-10 leading-relaxed italic-none">Create your first AI agent to start automating your customer service and engagement.</p>
      
      <button 
        @click="showCreateModal = true"
        class="flex items-center gap-2 text-primary font-bold tracking-widest text-[11px] uppercase"
      >
        <Plus class="w-4 h-4" />
        Build Your First Agent
      </button>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="showCreateModal = false"></div>
      
      <div class="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div class="p-8">
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-xl font-bold text-white tracking-tight italic-none uppercase">Forge AI Agent</h3>
            <button @click="showCreateModal = false" class="p-2 text-gray-500 hover:text-white transition-colors">
              <Plus class="w-6 h-6 rotate-45" />
            </button>
          </div>
          
          <div class="space-y-6">
            <div>
              <label class="block text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-2">Agent Name</label>
              <input 
                v-model="newAgent.name"
                placeholder="e.g. Sales Pilot"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-700 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            
            <div>
              <label class="block text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-2">Behavioral Protocol</label>
              <textarea 
                v-model="newAgent.system_prompt"
                rows="5"
                placeholder="Describe how your agent should behave..."
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-700 focus:outline-none focus:border-primary/50 transition-colors resize-none mb-2"
              ></textarea>
              <p class="text-[10px] text-gray-600 leading-relaxed italic-none">
                <Info class="w-3 h-3 inline mr-1" />
                This protocol defines the agent's personality, tone, and decision-making logic.
              </p>
            </div>

            <div>
              <label class="block text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-2">Default Language</label>
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
              class="flex-1 py-3 text-[11px] font-bold tracking-widest text-gray-500 hover:bg-white/5 rounded-xl transition-all"
            >
              CANCEL
            </button>
            <button 
              @click="handleCreate"
              :disabled="isCreating || !newAgent.name"
              class="flex-1 py-3 bg-primary text-black font-bold tracking-widest text-[11px] rounded-xl hover:bg-primary-accent transition-all shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
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
.glass-card {
  @apply bg-[#111111]/40 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem];
}

.italic-none {
  font-style: normal !important;
}
</style>