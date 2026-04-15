<script setup lang="ts">
import { 
  ArrowLeft,
  Settings2,
  Trash2,
  MessageCircle,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Instagram,
  User,
  Bot,
  Hash
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const route = useRoute()
const { userId } = useAuth()
const supabase = useSupabaseClient()
const triggerId = route.params.id as string

// State
const isLoading = ref(true)
const trigger = ref<any>(null)
const jobs = ref<any[]>([])
const stats = ref({
  total: 0,
  sent: 0,
  failed: 0
})

const fetchData = async () => {
  isLoading.value = true
  try {
    // 1. Fetch Trigger Details
    const { data: triggerData } = await supabase
      .from('instagram_comment_triggers')
      .select('*, chatbots(*)')
      .eq('id', triggerId)
      .single()

    if (triggerData) {
      trigger.value = triggerData
      
      // 1.5 Fetch Linked Post Details for Media
      const { data: postData } = await supabase
        .from('instagram_posts')
        .select('*')
        .eq('id', triggerData.instagram_post_id)
        .single()
      
      if (postData) {
        trigger.value.post = postData
      }
    }

    // 2. Fetch Activity Logs (Jobs)
    const { data: jobData } = await supabase
      .from('instagram_message_jobs')
      .select('*')
      .eq('trigger_id', triggerId)
      .order('created_at', { ascending: false })

    jobs.value = jobData || []
    
    // 3. Calculate Stats
    stats.value = {
      total: jobs.value.length,
      sent: jobs.value.filter(j => j.status === 'sent').length,
      failed: jobs.value.filter(j => j.status === 'failed').length
    }
  } catch (err) {
    console.error('Error fetching detail data:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchData)

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex items-center gap-6">
        <NuxtLink to="/dashboard/automation" class="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group">
          <ArrowLeft class="w-5 h-5 text-gray-400 group-hover:text-white group-hover:-translate-x-1 transition-all" />
        </NuxtLink>
        <div>
          <h1 class="text-3xl font-black text-white tracking-tighter uppercase italic-none">Rule Analysis</h1>
          <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Deep dive into automation performance</p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
          <div :class="['w-2 h-2 rounded-full animate-pulse', trigger?.is_active ? 'bg-primary' : 'bg-gray-600']"></div>
          <span class="text-[10px] font-bold text-white uppercase tracking-widest">{{ trigger?.is_active ? 'Active' : 'Paused' }}</span>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
       <div class="lg:col-span-2 space-y-8">
         <div class="h-64 bg-white/5 rounded-[2.5rem] animate-pulse"></div>
         <div class="h-96 bg-white/5 rounded-[2.5rem] animate-pulse"></div>
       </div>
       <div class="h-96 bg-white/5 rounded-[2.5rem] animate-pulse"></div>
    </div>

    <div v-else-if="trigger" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left Column: Logs -->
      <div class="lg:col-span-2 space-y-8">
        <!-- Stats Row -->
        <div class="grid grid-cols-3 gap-4">
          <div class="glass-card p-6 bg-white/[0.01]">
            <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Detected</p>
            <h3 class="text-2xl font-black text-white italic-none">{{ stats.total }}</h3>
          </div>
          <div class="glass-card p-6 bg-white/[0.01]">
            <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 text-primary">Success</p>
            <h3 class="text-2xl font-black text-primary italic-none">{{ stats.sent }}</h3>
          </div>
          <div class="glass-card p-6 bg-white/[0.01]">
            <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 text-red-500">Failed</p>
            <h3 class="text-2xl font-black text-red-500 italic-none">{{ stats.failed }}</h3>
          </div>
        </div>

        <!-- Activity Log -->
        <div class="glass-card p-8 bg-[#0a0a0a]">
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-sm font-bold text-white uppercase tracking-widest italic-none">Activity Broadcast</h3>
            <span class="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Live Stream</span>
          </div>

          <div class="space-y-4">
            <div v-if="jobs.length === 0" class="py-20 text-center opacity-20">
              <Clock class="w-12 h-12 mx-auto mb-4" />
              <p class="text-[10px] font-bold uppercase tracking-widest">No activity recorded yet</p>
            </div>

            <div 
              v-for="job in jobs" 
              :key="job.id"
              class="flex items-start gap-6 p-5 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.04] transition-all group"
            >
              <div :class="[
                'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border',
                job.status === 'sent' ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-red-500/5 border-red-500/20 text-red-500'
              ]">
                <Zap v-if="job.status === 'sent'" class="w-5 h-5" />
                <XCircle v-else class="w-5 h-5" />
              </div>

              <div class="flex-1 min-w-0 space-y-2">
                <div class="flex items-center justify-between gap-4">
                  <div class="flex items-center gap-2">
                     <span class="text-[10px] font-bold text-white uppercase tracking-tight">Comment Detected</span>
                     <span class="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{{ formatDate(job.created_at) }}</span>
                  </div>
                  <span :class="[
                    'text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border',
                    job.status === 'sent' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-red-500/10 border-red-500/20 text-red-500'
                  ]">
                    {{ job.status }}
                  </span>
                </div>
                
                <div class="flex flex-col gap-1">
                  <p class="text-[11px] text-gray-500 leading-relaxed font-medium italic-none">
                     {{ job.payload?.error ? `Error: ${job.payload.error}` : 'Reply successfully dispatched via agent.' }}
                  </p>
                  <div class="flex items-center gap-2 pt-1">
                    <Hash class="w-3 h-3 text-gray-700" />
                    <span class="text-[9px] text-gray-700 font-mono">{{ job.comment_id }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Config -->
      <div class="space-y-8">
        <div class="glass-card p-8 bg-[#0a0a0a]">
          <Settings2 class="w-8 h-8 text-primary mb-6" />
          <h3 class="text-sm font-bold text-white uppercase tracking-widest mb-6 italic-none">Configuration</h3>
          
          <div class="space-y-6">
            <div class="space-y-2">
              <label class="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Automation Engine</label>
              <div class="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div class="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Bot v-if="trigger.chatbot_id" class="w-5 h-5" />
                  <User v-else class="w-5 h-5" />
                </div>
                <div>
                   <p class="text-[11px] font-bold text-white uppercase">{{ trigger.chatbot_id ? (trigger.chatbots?.name || 'Assigned AI') : 'Manual Only' }}</p>
                   <p class="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{{ trigger.chatbot_id ? 'RAG Enabled' : 'Static Template' }}</p>
                </div>
              </div>
            </div>

            <div v-if="trigger.keywords?.length" class="space-y-2">
              <label class="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Keywords</label>
              <div class="flex flex-wrap gap-2">
                <span v-for="kw in trigger.keywords" :key="kw" class="px-3 py-1 bg-white/5 border border-white/10 text-white text-[10px] font-bold rounded-lg uppercase tracking-tight">
                  {{ kw }}
                </span>
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Trigger Strategy</label>
              <div class="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest">
                <span v-if="trigger.reply_in_comment" class="text-primary">Comment Reply</span>
                <span v-if="trigger.reply_in_comment && trigger.reply_in_dm" class="text-gray-600">+</span>
                <span v-if="trigger.reply_in_dm" class="text-primary">Direct Message</span>
              </div>
            </div>

            <div class="pt-6 border-t border-white/5">
              <label class="text-[9px] font-bold text-gray-600 uppercase tracking-widest block mb-3">Linked Media</label>
              <div class="aspect-square bg-white/5 border border-white/10 rounded-3xl overflow-hidden relative">
                 <img 
                    :src="`/api/instagram/proxy-image?url=${encodeURIComponent(trigger.post?.thumbnail_url || trigger.post?.media_url || '')}`"
                    class="absolute inset-0 w-full h-full object-cover grayscale opacity-50"
                 />
                 <div class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                   <Instagram class="w-8 h-8 text-gray-800" />
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
