<script setup lang="ts">
import { 
  Plus, 
  MessageSquare, 
  Settings2, 
  Bot,
  ChevronRight,
  Brain,
  Sparkles,
  Zap,
  Activity,
  History,
  MoreVertical,
  Trash2,
  Power
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const user = useSupabaseUser()
const supabase = useSupabaseClient()

// Placeholder agents for UI demonstration
const agents = ref([
  {
    id: '1',
    name: 'sales pilot',
    personality: 'highly professional and persuasive, focused on converting interest into leads.',
    status: 'active',
    accuracy: '98%',
    conversations: 142
  },
  {
    id: '2',
    name: 'support sentinel',
    personality: 'empathetic and helpful, specialized in technical troubleshooting.',
    status: 'paused',
    accuracy: '94%',
    conversations: 89
  }
])

const isCreateModalOpen = ref(false)
</script>

<template>
  <div class="space-y-12">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="max-w-xl">
        <h2 class="text-xl font-bold tracking-tight text-white mb-2">ai agents</h2>
        <p class="text-gray-500 text-sm">deploy and manage your fleet of intelligent conversation specialists.</p>
      </div>
      
      <button 
        @click="isCreateModalOpen = true"
        class="flex items-center gap-3 px-6 py-3 bg-primary text-black font-bold rounded-2xl hover:bg-primary-accent transition-all shadow-lg shadow-primary/10"
      >
        <Plus class="w-5 h-5" />
        forge new agent
      </button>
    </div>

    <!-- Stats Row -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="stat in [
        { label: 'active agents', value: '02', icon: Bot },
        { label: 'success rate', value: '96.2%', icon: Sparkles },
        { label: 'total chats', value: '231', icon: MessageSquare },
        { label: 'response time', value: '< 2s', icon: Zap }
      ]" :key="stat.label" class="glass-card !p-5">
        <div class="flex items-center gap-4">
          <div class="p-2.5 bg-white/5 rounded-xl">
            <component :is="stat.icon" class="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p class="text-[10px] font-bold tracking-widest text-gray-500 mb-0.5">{{ stat.label }}</p>
            <p class="text-lg font-black text-white leading-none">{{ stat.value }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Agents Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div 
        v-for="agent in agents" 
        :key="agent.id"
        class="glass-card hover:border-primary/20 transition-all group relative overflow-hidden"
      >
        <div class="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
          <Brain class="w-24 h-24 text-white" />
        </div>

        <div class="relative z-10">
          <div class="flex items-start justify-between mb-6">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-accent/5 flex items-center justify-center border border-white/5 shadow-inner">
                <Bot class="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 class="font-bold text-white tracking-tight uppercase text-xs">{{ agent.name }}</h4>
                <div class="flex items-center gap-1.5 mt-1">
                  <div class="w-1.5 h-1.5 rounded-full" :class="agent.status === 'active' ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]' : 'bg-gray-600'"></div>
                  <span class="text-[9px] font-bold tracking-widest text-gray-500">{{ agent.status }}</span>
                </div>
              </div>
            </div>
            
            <button class="p-2 text-gray-600 hover:text-white transition-colors">
              <MoreVertical class="w-5 h-5" />
            </button>
          </div>

          <div class="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-6">
            <p class="text-[11px] text-gray-400 leading-relaxed line-clamp-2">
              {{ agent.personality }}
            </p>
          </div>

          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <Activity class="w-3.5 h-3.5 text-gray-600" />
              <span class="text-[10px] font-bold text-gray-400">{{ agent.conversations }} interactions</span>
            </div>
            <div class="flex items-center gap-2">
              <Sparkles class="w-3.5 h-3.5 text-primary" />
              <span class="text-[10px] font-bold text-gray-400">accuracy: {{ agent.accuracy }}</span>
            </div>
          </div>

          <div class="mt-8 flex items-center gap-3">
            <button class="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-[10px] font-bold tracking-widest text-white rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2">
              <Settings2 class="w-3.5 h-3.5" />
              configure
            </button>
            <button 
              class="w-11 h-11 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-gray-500 hover:text-white transition-all"
              title="toggle active state"
            >
              <Power class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Empty/Add New Slot -->
      <button 
        @click="isCreateModalOpen = true"
        class="glass-card border-dashed border-white/10 hover:border-primary/30 transition-all flex flex-col items-center justify-center py-12 group"
      >
        <div class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Plus class="w-6 h-6 text-gray-600 group-hover:text-primary" />
        </div>
        <span class="text-[10px] font-bold tracking-widest text-gray-500 uppercase">add another agent</span>
      </button>
    </div>

    <!-- Recent Logs -->
    <div class="space-y-6">
      <div class="flex items-center justify-between border-b border-white/5 pb-4">
        <div class="flex items-center gap-3 font-bold text-white tracking-tight">
          <History class="w-5 h-5 text-primary" />
          recent agent activity
        </div>
        <button class="text-[10px] font-bold tracking-widest text-gray-500 hover:text-white transition-colors">view global logs archive</button>
      </div>

      <div class="space-y-3">
        <div v-for="i in 3" :key="i" class="glass-card !p-4 flex items-center justify-between text-[11px] group hover:bg-white/[0.02]">
          <div class="flex items-center gap-4">
            <div class="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10">
              <MessageSquare class="w-4 h-4 text-primary" />
            </div>
            <div>
              <p class="text-white font-bold tracking-tight">agent processed inbound comment</p>
              <p class="text-gray-500 text-[10px]">2 minutes ago via instagram automation</p>
            </div>
          </div>
          <ChevronRight class="w-4 h-4 text-gray-700 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply bg-[#111111]/40 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem];
}
</style>