<script setup lang="ts">
import { 
  ArrowLeft, 
  Bot, 
  Save, 
  Loader2, 
  Info,
  Globe,
  Lock,
  MessageSquare,
  Shield,
  Trash2
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const route = useRoute()
const chatbotId = route.params.id as string
const { userId } = useAuth()
const supabase = useSupabaseClient()
const router = useRouter()

// State
const isLoading = ref(true)
const isSaving = ref(false)
const agent = ref<any>(null)

// Forms
const form = ref({
  name: '',
  system_prompt: '',
  is_public: false
})

// Fetch Data
const fetchData = async () => {
  if (!chatbotId || !userId.value) return
  
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('chatbots')
      .select('*')
      .eq('id', chatbotId)
      .eq('user_id', userId.value)
      .single()

    if (error) throw error
    if (data) {
      agent.value = data
      form.value = {
        name: data.name,
        system_prompt: data.system_prompt || '',
        is_public: data.is_public || false
      }
    }
  } catch (err) {
    console.error('Error fetching agent:', err)
    router.push('/dashboard/agents')
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchData)

// Actions
const handleSave = async () => {
  if (!chatbotId || isSaving.value) return
  
  isSaving.value = true
  try {
    const { error } = await supabase
      .from('chatbots')
      .update({
        name: form.value.name,
        system_prompt: form.value.system_prompt,
        is_public: form.value.is_public
      })
      .eq('id', chatbotId)

    if (error) throw error
    // Refresh local state
    agent.value = { ...agent.value, ...form.value }
  } catch (err) {
    console.error('Error saving settings:', err)
    alert('Failed to save changes')
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) return
  
  try {
    const { error } = await supabase
      .from('chatbots')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', chatbotId)

    if (error) throw error
    router.push('/dashboard/agents')
  } catch (err) {
    console.error('Error deleting agent:', err)
    alert('Failed to delete agent')
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-12 pb-24">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <NuxtLink 
          to="/dashboard/agents"
          class="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-gray-500 hover:text-white"
        >
          <ArrowLeft class="w-5 h-5" />
        </NuxtLink>
        <div>
          <h2 class="text-xl font-bold tracking-tight text-white mb-1 uppercase italic-none">Agent Intelligence</h2>
          <div v-if="agent" class="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-[10px]">
            <Bot class="w-3.5 h-3.5" />
            <span>{{ agent.name }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button 
          @click="handleSave"
          :disabled="isSaving || isLoading"
          class="flex items-center gap-3 px-8 py-3 bg-primary text-black font-bold rounded-2xl transition-all shadow-lg shadow-primary/10 hover:bg-primary-accent disabled:opacity-50"
        >
          <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
          <Save v-else class="w-4 h-4" />
          <span class="text-[11px] font-bold tracking-widest uppercase italic-none">Finalize settings</span>
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="flex justify-center py-20">
      <Loader2 class="w-8 h-8 text-primary animate-spin" />
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 space-y-8">
        <!-- Identity Settings -->
        <section class="glass-card bg-white/[0.01]">
          <h3 class="text-xs font-bold text-gray-500 tracking-widest uppercase mb-8 italic-none">Core Identity</h3>
          <div class="space-y-6">
            <div>
              <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-3 italic-none">Agent Designation</label>
              <input 
                v-model="form.name"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors italic-none"
                placeholder="e.g. Sales Pilot"
              />
            </div>

            <div>
              <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-3 italic-none">Behavioral Protocol (System Prompt)</label>
              <textarea 
                v-model="form.system_prompt"
                rows="10"
                class="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-xs text-gray-300 focus:outline-none focus:border-primary/50 transition-colors resize-none leading-relaxed italic-none"
                placeholder="Give your agent a personality, goals, and constraints..."
              ></textarea>
              <div class="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-3">
                <Info class="w-4 h-4 text-primary shrink-0" />
                <p class="text-[10px] text-gray-500 leading-relaxed uppercase tracking-wider italic-none">
                  This protocol overrides default behaviors. Define exactly how you want the AI to represent your brand.
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- Danger Zone -->
        <section class="glass-card border-red-500/10 bg-red-500/[0.01]">
          <h3 class="text-xs font-bold text-red-500/50 tracking-widest uppercase mb-8 italic-none">Critical Actions</h3>
          <div class="flex items-center justify-between p-6 rounded-2xl bg-white/[0.01] border border-white/5">
            <div>
              <p class="text-sm font-bold text-white italic-none mb-1">Decommission Agent</p>
              <p class="text-[10px] text-gray-500 uppercase tracking-widest italic-none">Permanently remove this intelligence from your fleet.</p>
            </div>
            <button 
              @click="handleDelete"
              class="px-6 py-2.5 bg-red-500/10 text-red-500 rounded-xl font-bold text-[10px] tracking-widest uppercase hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
            >
              Delete Bot
            </button>
          </div>
        </section>
      </div>

      <!-- Right Column: Sidebar Settings -->
      <div class="space-y-6">
        <!-- Visibility Toggle -->
        <div class="glass-card bg-white/[0.01] overflow-hidden group">
          <div class="flex items-center justify-between mb-8">
            <h4 class="text-[10px] font-bold tracking-widest text-gray-500 uppercase italic-none">Deployment status</h4>
            <component :is="form.is_public ? Globe : Lock" class="w-4 h-4 text-primary opacity-50" />
          </div>

          <button 
            @click="form.is_public = !form.is_public"
            :class="[
              'w-full p-4 rounded-2xl border transition-all flex items-center justify-between text-left',
              form.is_public ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/5 text-gray-500'
            ]"
          >
            <div>
              <p class="text-[11px] font-bold uppercase tracking-widest mb-1 italic-none">{{ form.is_public ? 'Public mode active' : 'Internal only' }}</p>
              <p class="text-[9px] opacity-60 italic-none">
                {{ form.is_public ? 'Token-free API access enabled.' : 'Authenticated access required.' }}
              </p>
            </div>
            <div :class="['w-10 h-5 rounded-full relative transition-colors p-1', form.is_public ? 'bg-primary' : 'bg-gray-800']">
              <div :class="['w-3 h-3 bg-white rounded-full transition-all', form.is_public ? 'translate-x-5' : 'translate-x-0']"></div>
            </div>
          </button>
          
          <p class="mt-6 text-[9px] text-gray-600 leading-relaxed uppercase tracking-wider italic-none">
            Public mode allows your agent to be embedded on websites via the integration code snippet.
          </p>
        </div>

        <!-- Capability Score -->
        <div class="glass-card bg-white/[0.01]">
          <h4 class="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-6 italic-none">Resource summary</h4>
          <div class="space-y-6">
            <div class="flex items-center gap-4">
               <div class="p-2 rounded-lg bg-white/5">
                  <MessageSquare class="w-4 h-4 text-gray-500" />
               </div>
               <div>
                  <p class="text-xs font-bold text-white italic-none">0 Conversations</p>
                  <p class="text-[9px] text-gray-600 uppercase tracking-widest">Lifetime interactions</p>
               </div>
            </div>
            <div class="flex items-center gap-4">
               <div class="p-2 rounded-lg bg-white/5">
                  <Shield class="w-4 h-4 text-gray-500" />
               </div>
               <div>
                  <p class="text-xs font-bold text-white italic-none">Secure Vault</p>
                  <p class="text-[9px] text-gray-600 uppercase tracking-widest">Encryption layer active</p>
               </div>
            </div>
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
