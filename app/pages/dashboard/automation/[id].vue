<script setup lang="ts">
import {
  ArrowLeft,
  Instagram,
  MessageCircle,
  Zap,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ExternalLink,
  Bot,
  AlertCircle,
  RefreshCw,
  Search,
  Layout,
  Settings2
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const route = useRoute()
const supabase = useSupabaseClient()
const notify = useNotify()
const triggerId = route.params.id as string

// State
const isLoading = ref(true)
const isRefreshing = ref(false)
const trigger = ref<any>(null)
const logs = ref<any[]>([])
const stats = ref({
  total: 0,
  replied: 0,
  skipped: 0,
  failed: 0
})

const fetchTriggerDetails = async () => {
  const { data, error } = await supabase
    .from('instagram_comment_triggers')
    .select('*, chatbots(id, name), instagram_posts(*)')
    .eq('id', triggerId)
    .single()

  if (error) {
    console.error('Error fetching trigger:', error)
    notify.error('Failed to sync automation intelligence.')
    return
  }
  trigger.value = data
}

const fetchActivityLogs = async () => {
  if (!trigger.value?.instagram_post_id) return

  const { data, error } = await supabase
    .from('instagram_message_jobs')
    .select('*')
    .eq('instagram_post_id', trigger.value.instagram_post_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching logs:', error)
    notify.error('Intelligence logs unavailable at this moment.')
    return
  }
  
  logs.value = data || []
  
  // Calculate Stats
  stats.value = {
    total: logs.value.length,
    replied: logs.value.filter(l => l.status === 'sent').length,
    skipped: logs.value.filter(l => l.status === 'skipped').length,
    failed: logs.value.filter(l => l.status === 'failed').length
  }
}

const refreshData = async () => {
  isRefreshing.value = true
  await Promise.all([fetchTriggerDetails(), fetchActivityLogs()])
  isRefreshing.value = false
}

const toggleStatus = async () => {
  if (!trigger.value) return
  const newStatus = !trigger.value.is_active
  const { error } = await supabase
    .from('instagram_comment_triggers')
    .update({ is_active: newStatus })
    .eq('id', triggerId)
  
  if (!error) trigger.value.is_active = newStatus
}

onMounted(async () => {
  await fetchTriggerDetails()
  if (trigger.value) {
    await fetchActivityLogs()
  }
  isLoading.value = false
})

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'sent': return 'bg-green-500/10 text-green-400 border-green-500/20'
    case 'skipped': return 'bg-white/5 text-gray-400 border-white/10'
    case 'failed': return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'pending': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'sent': return CheckCircle2
    case 'skipped': return Filter
    case 'failed': return XCircle
    default: return Clock
  }
}
</script>

<template>
  <div class="space-y-8 pb-20">
    <!-- Breadcrumbs & Actions -->
    <div class="flex items-center justify-between">
      <NuxtLink to="/dashboard/automation" class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
        <ArrowLeft class="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span class="text-xs font-bold uppercase tracking-widest">Back to Rules</span>
      </NuxtLink>

      <div class="flex items-center gap-3">
        <button 
          @click="refreshData"
          class="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
          :class="{ 'animate-spin': isRefreshing }"
        >
          <RefreshCw class="w-4 h-4" />
        </button>
        <button 
          @click="toggleStatus"
          :class="[
            'px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shadow-lg',
            trigger?.is_active 
              ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 shadow-primary/5' 
              : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
          ]"
        >
          {{ trigger?.is_active ? 'Rule is Active' : 'Rule is Paused' }}
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="space-y-8 animate-pulse">
      <div class="h-64 bg-white/5 rounded-[2rem] border border-white/10"></div>
      <div class="grid grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="h-24 bg-white/5 rounded-2xl border border-white/10"></div>
      </div>
    </div>

    <template v-else-if="trigger">
      <!-- Rule Overview Header -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Post Preview Card -->
        <div class="lg:col-span-2 glass-card !p-0 overflow-hidden flex flex-col md:flex-row">
          <div class="w-full md:w-64 aspect-square bg-[#0a0a0a] relative overflow-hidden flex-shrink-0">
            <template v-if="trigger.instagram_posts?.media_url">
              <img 
                :src="`/api/instagram/proxy-image?url=${encodeURIComponent(trigger.instagram_posts.media_type === 'VIDEO' ? (trigger.instagram_posts.thumbnail_url || trigger.instagram_posts.media_url) : trigger.instagram_posts.media_url)}`" 
                class="w-full h-full object-cover opacity-80"
              />
              <div v-if="trigger.instagram_posts.media_type === 'VIDEO'" class="absolute top-4 left-4 bg-black/60 px-2 py-1 rounded text-[8px] font-bold uppercase">Video</div>
            </template>
            <div v-else class="w-full h-full flex items-center justify-center">
              <Instagram class="w-12 h-12 text-gray-800" />
            </div>
          </div>
          
          <div class="p-8 flex-1 flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-2 mb-4">
                <span class="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-gray-500 uppercase tracking-widest">Automation Rule</span>
                <div v-if="trigger.chatbot_id" class="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full">
                  <Bot class="w-2.5 h-2.5 text-primary" />
                  <span class="text-[8px] font-black text-primary uppercase">AI AGENT: {{ trigger.chatbots?.name }}</span>
                </div>
              </div>
              <p class="text-sm text-gray-300 leading-relaxed line-clamp-3 mb-6 font-medium italic-none">
                {{ trigger.instagram_posts?.caption || 'Monitoring automation logic for this post...' }}
              </p>
            </div>

            <div class="flex flex-wrap gap-6 pt-6 border-t border-white/5">
              <div class="space-y-1">
                <p class="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Keywords</p>
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="kw in trigger.keywords" :key="kw" class="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-white font-bold uppercase">
                    {{ kw }}
                  </span>
                  <span v-if="!trigger.keywords?.length" class="text-[10px] font-bold text-primary uppercase">CATCH-ALL (Any comment)</span>
                </div>
              </div>
              <div class="space-y-1">
                <p class="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Actions</p>
                <div class="flex items-center gap-3">
                  <div v-if="trigger.reply_in_comment" class="flex items-center gap-1.5 text-primary text-[10px] font-bold uppercase">
                    <MessageCircle class="w-3 h-3" /> Public Reply
                  </div>
                  <div v-if="trigger.reply_in_dm" class="flex items-center gap-1.5 text-primary text-[10px] font-bold uppercase">
                    <Zap class="w-3 h-3" /> Direct DM
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mini Settings/Config -->
        <div class="glass-card flex flex-col justify-between">
          <div class="space-y-6">
            <h4 class="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Settings2 class="w-4 h-4 text-primary" /> Configuration
            </h4>
            
            <div class="space-y-4">
              <div class="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <p class="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-2">Reply Template</p>
                <p class="text-[11px] text-gray-300 italic-none line-clamp-4">{{ trigger.dm_template }}</p>
              </div>

              <div v-if="trigger.instagram_posts?.permalink" class="flex items-center gap-2">
                <a :href="trigger.instagram_posts.permalink" target="_blank" class="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all">
                  <Instagram class="w-4 h-4" />
                  <span class="text-[9px] font-bold uppercase tracking-widest">View original post</span>
                  <ExternalLink class="w-3 h-3 text-gray-600" />
                </a>
              </div>
            </div>
          </div>

          <p class="text-[9px] text-gray-600 font-bold uppercase tracking-widest leading-relaxed mt-6">
            Last processed comment checked at: <br/>
            <span class="text-gray-500 italic-none">{{ logs[0] ? new Date(logs[0].created_at).toLocaleString() : 'N/A' }}</span>
          </p>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="(val, label) in { 'Total Reach': stats.total, 'Auto-Replied': stats.replied, 'Skipped': stats.skipped, 'Failures': stats.failed }" :key="label" 
          class="glass-card !p-6 border-white/5 bg-white/[0.01] flex flex-col items-center justify-center text-center">
          <p class="text-[8px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">{{ label }}</p>
          <p class="text-3xl font-black text-white tracking-tighter">{{ val }}</p>
        </div>
      </div>

      <!-- Activity Feed -->
      <div class="space-y-4">
        <div class="flex items-center justify-between px-4">
          <h3 class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
            <Clock class="w-5 h-5 text-primary" /> Activity Stream
          </h3>
          <span class="text-[10px] font-bold text-gray-500 uppercase italic-none">Showing last 50 processed events</span>
        </div>

        <div class="glass-card !p-0 overflow-hidden border-white/5 bg-[#080808]/50 overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr class="bg-white/[0.02] border-b border-white/5">
                <th class="px-6 py-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">Time</th>
                <th class="px-6 py-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">Instagram User</th>
                <th class="px-6 py-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">Comment Text</th>
                <th class="px-6 py-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">Processing Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr v-for="log in logs" :key="log.id" class="group hover:bg-white/[0.01] transition-colors">
                <td class="px-6 py-6 whitespace-nowrap">
                  <div class="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                    {{ new Date(log.created_at).toLocaleDateString() }}
                  </div>
                  <div class="text-[9px] text-gray-600 font-medium italic-none">
                    {{ new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
                  </div>
                </td>
                <td class="px-6 py-6">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <User class="w-4 h-4 text-gray-600" />
                    </div>
                    <span class="text-[11px] font-bold text-white tracking-tight">@{{ log.payload?.from?.username || 'user' }}</span>
                  </div>
                </td>
                <td class="px-6 py-6 max-w-md">
                  <p class="text-[11px] text-gray-400 italic-none line-clamp-2 leading-relaxed">
                    {{ log.payload?.text || 'No text found' }}
                  </p>
                </td>
                <td class="px-6 py-6 whitespace-nowrap">
                  <div class="flex items-center gap-4">
                    <span 
                      class="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest"
                      :class="getStatusBadgeClass(log.status)"
                    >
                      <component :is="getStatusIcon(log.status)" class="w-3 h-3" />
                      {{ log.status === 'sent' ? 'REPLIED' : log.status }}
                    </span>
                    
                    <span v-if="log.status === 'sent'" class="text-[8px] font-bold text-gray-600 uppercase">
                      via {{ (log.payload?.action_type || 'Automation').toUpperCase() }}
                    </span>
                    <span v-if="log.status === 'skipped'" class="text-[8px] font-bold text-gray-600 uppercase">
                      NO KEYWORD MATCH
                    </span>
                  </div>
                </td>
              </tr>
              <tr v-if="logs.length === 0">
                <td colspan="4" class="px-6 py-20 text-center">
                  <div class="flex flex-col items-center opacity-30">
                    <Layout class="w-12 h-12 mb-4" />
                    <p class="text-[10px] font-bold uppercase tracking-widest italic-none">No activity recorded yet for this rule.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div v-else class="glass-card flex flex-col items-center py-20 text-center">
      <AlertCircle class="w-16 h-16 text-gray-800 mb-6" />
      <h3 class="text-lg font-bold text-white mb-2 uppercase italic-none">Automation Rule not found</h3>
      <p class="text-gray-500 text-[11px] max-w-sm mb-10 leading-relaxed uppercase tracking-widest italic-none">The rule might have been deleted or is inaccessible.</p>
      <NuxtLink to="/dashboard/automation" class="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-white transition-all">Return to Dashboard</NuxtLink>
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

/* Custom indicator for the activity stream */
.sent-indicator {
  @apply bg-primary/20 text-primary border-primary/30;
}
</style>
