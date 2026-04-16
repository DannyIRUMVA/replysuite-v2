<script setup lang="ts">
import { 
  ArrowLeft, 
  Bot, 
  Globe, 
  FileText, 
  Type, 
  Plus, 
  Loader2, 
  Search,
  History,
  AlertTriangle,
  Activity as LucideActivity,
  Zap as LucideZap,
  Sparkles as LucideSparkles
} from 'lucide-vue-next'
import HistoryTable from '~/components/agents/HistoryTable.vue'
import DashboardStats from '~/components/agents/DashboardStats.vue'
import ExtractionModal from '~/components/agents/ExtractionModal.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const route = useRoute()
const chatbotId = route.query.id as string
const { userId, limits, planSlug } = useAuth()
const supabase = useSupabaseClient()

// State
const isLoading = ref(true)
const isProcessing = ref(false)
const activeTab = ref<'url' | 'file' | 'text'>('url')
const chatbot = ref<any>(null)
const sources = ref<any[]>([])
const trainingJobs = ref<any[]>([])
const monthlyUsage = ref(0)
const totalTrainings = ref(0)

// Form States
const urlForm = ref({ url: '' })
const textForm = ref({ title: '', content: '' })
const selectedFile = ref<File | null>(null)

// Extraction Viewer State
const showExtractionModal = ref(false)
const selectedExtraction = ref<{ title: string, content: string } | null>(null)

// Fetch Data
const fetchData = async () => {
  if (!chatbotId || !userId.value) return
  
  try {
    const [chatbotRes, sourcesRes, jobsRes, usageRes] = await Promise.all([
      supabase.from('chatbots').select('*').eq('id', chatbotId).single(),
      supabase.from('data_sources').select('*').eq('chatbot_id', chatbotId).order('created_at', { ascending: false }),
      supabase.from('training_jobs').select('*').eq('chatbot_id', chatbotId).order('started_at', { ascending: false }),
      $fetch(`/api/agents/usage?chatbotId=${chatbotId}`)
    ])

    if (chatbotRes.error) throw chatbotRes.error
    chatbot.value = chatbotRes.data
    sources.value = sourcesRes.data || []
    trainingJobs.value = jobsRes.data || []
    totalTrainings.value = trainingJobs.value.length
    monthlyUsage.value = (usageRes as any).usage || 0
  } catch (err) {
    console.error('Error fetching training data:', err)
  } finally {
    isLoading.value = false
  }
}

// Polling for processing jobs
let pollInterval: any = null
watch(trainingJobs, (newJobs) => {
  const hasProcessing = newJobs.some(j => j.status === 'processing')
  if (hasProcessing && !pollInterval) {
    pollInterval = setInterval(fetchData, 3000)
  } else if (!hasProcessing && pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}, { deep: true })

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

onMounted(fetchData)

// Actions
const viewExtraction = (job: any) => {
  // Find the corresponding source if possible, or use job meta
  const source = sources.value.find(s => 
    (s.metadata?.url && s.metadata.url === job.meta?.url) || 
    (s.metadata?.filename && s.metadata.filename === job.meta?.filename) ||
    (s.type === 'text' && s.metadata?.title === job.meta?.title)
  )

  selectedExtraction.value = {
    title: job.meta?.title || job.meta?.filename || job.meta?.url || 'Extracted Data',
    content: source?.content_text || job.meta?.error || 'Processing knowledge or data already indexed.'
  }
  showExtractionModal.value = true
}

const handleUrlTrain = async () => {
  if (!urlForm.value.url) return
  isProcessing.value = true
  
  try {
    const trainPromise = $fetch('/api/agents/train/url', {
      method: 'POST',
      body: { chatbotId, url: urlForm.value.url }
    })

    // Immediate visibility fix: Refresh data after a short delay to allow DB insert
    setTimeout(() => fetchData(), 1000)

    const res = await trainPromise
    if (res.success) {
      urlForm.value.url = ''
    }
  } catch (err: any) {
    console.error('[URL Training Error]', err)
    alert(err.message || 'Failed to train from URL')
  } finally {
    isProcessing.value = false
    await fetchData()
  }
}

const handleTextTrain = async () => {
  if (!textForm.value.content) return
  isProcessing.value = true
  
  try {
    const trainPromise = $fetch('/api/agents/train/text', {
      method: 'POST',
      body: { chatbotId, ...textForm.value }
    })

    // Immediate visibility fix: Refresh data after a short delay
    setTimeout(() => fetchData(), 1000)

    const res = await trainPromise
    if (res.success) {
      textForm.value = { title: '', content: '' }
    }
  } catch (err: any) {
    console.error('[Text Training Error]', err)
    alert(err.message || 'Failed to train from text')
  } finally {
    isProcessing.value = false
    await fetchData()
  }
}

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
  }
}

const handleFileTrain = async () => {
  if (!selectedFile.value) return
  isProcessing.value = true
  
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('chatbotId', chatbotId)

    const trainPromise = $fetch('/api/agents/train/file', {
      method: 'POST',
      body: formData
    })

    // Immediate visibility fix
    setTimeout(() => fetchData(), 1000)

    const res = await trainPromise
    if (res.success) {
      selectedFile.value = null
    }
  } catch (err: any) {
    console.error('[File Training Error]', err)
    alert(err.message || 'Failed to train from file')
  } finally {
    isProcessing.value = false
    await fetchData()
  }
}

const handleDeleteSource = async (id: string) => {
  if (!confirm('Are you sure you want to remove this knowledge source? The corresponding embeddings will also be deleted.')) return
  
  try {
    // Delete embeddings first
    await supabase.from('embeddings').delete().eq('chatbot_id', chatbotId) // Simplification for now, usually you'd want to tag embeddings to source
    await supabase.from('data_sources').delete().eq('id', id)
    await fetchData()
  } catch (err) {
    console.error('Error deleting source:', err)
  }
}

// UI Helper
const isOverTrainingLimit = computed(() => trainingJobs.value.length >= (limits.value.maxTrainings || 10))

// Chat Test State
const showChatTest = ref(false)
const testInput = ref('')
const testMessages = ref<{ role: 'user' | 'assistant', content: string }[]>([])
const isTestLoading = ref(false)

const handleTestChat = async () => {
  if (!testInput.value || isTestLoading.value) return
  
  const userMsg = testInput.value
  testMessages.value.push({ role: 'user', content: userMsg })
  testInput.value= ''
  isTestLoading.value = true

  try {
    const res = await $fetch('/api/agents/chat/test', {
      method: 'POST',
      body: { chatbotId, message: userMsg }
    })
    if (res.success) {
      testMessages.value.push({ role: 'assistant', content: res.response })
    }
  } catch (err: any) {
    testMessages.value.push({ role: 'assistant', content: `Error: ${err.message || 'Brain connection failed'}` })
  } finally {
    isTestLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-8 pb-20 relative">
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
          <h2 class="text-xl font-bold tracking-tight text-white mb-1 uppercase italic-none">Knowledge Ops</h2>
          <div v-if="chatbot" class="flex items-center gap-2">
            <Bot class="w-3.5 h-3.5 text-primary" />
            <span class="text-[10px] font-bold tracking-widest text-gray-500 uppercase italic-none">{{ chatbot.name }}</span>
          </div>
        </div>
      </div>

      <button 
        @click="showChatTest = true"
        class="group flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-primary hover:text-black border border-white/10 rounded-2xl transition-all shadow-xl"
      >
        <LucideSparkles class="w-4 h-4 text-primary group-hover:text-black" />
        <span class="text-[11px] font-bold tracking-widest uppercase italic-none">Test Agent Ability</span>
      </button>
    </div>

    <div v-if="isLoading" class="flex justify-center py-20">
      <Loader2 class="w-8 h-8 text-primary animate-spin" />
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left: Training Interface -->
      <div class="lg:col-span-2 space-y-6">
        <div class="glass-card !bg-white/[0.01]">
          <!-- Tabs -->
          <div class="flex items-center gap-1 p-1 bg-white/5 rounded-2xl mb-8">
            <button 
              v-for="tab in [
                { id: 'url', label: 'Website URL', icon: Globe },
                { id: 'file', label: 'PDF Document', icon: FileText },
                { id: 'text', label: 'Custom Text', icon: Type }
              ] as const"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-bold tracking-widest rounded-xl transition-all uppercase italic-none',
                activeTab === tab.id ? 'bg-primary text-black shadow-lg shadow-primary/10' : 'text-gray-500 hover:text-white hover:bg-white/5'
              ]"
            >
              <component :is="tab.icon" class="w-3.5 h-3.5" />
              {{ tab.label }}
            </button>
          </div>

          <!-- Training Tabs Content -->
          <div class="space-y-6">
            <!-- URL Form -->
            <div v-if="activeTab === 'url'" class="space-y-6">
              <div>
                <label class="block text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-3 italic-none">Target URL</label>
                <div class="flex gap-3">
                  <input 
                    v-model="urlForm.url"
                    placeholder="https://example.com/docs"
                    class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-700 focus:outline-none focus:border-primary/50 transition-colors italic-none"
                  />
                  <button 
                    @click="handleUrlTrain"
                    :disabled="isProcessing || !urlForm.url || isOverTrainingLimit"
                    class="px-6 bg-primary text-black font-bold tracking-widest text-[11px] rounded-xl hover:bg-primary-accent transition-all disabled:opacity-50 flex items-center gap-2 uppercase italic-none"
                  >
                    <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
                    {{ isOverTrainingLimit ? 'LIMIT REACHED' : 'SCRAPE & TRAIN' }}
                  </button>
                </div>
                <p v-if="isOverTrainingLimit" class="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-widest italic-none">
                  Training limit reached for {{ planSlug }} plan. Upgrade for unlimited training.
                </p>
                <p class="text-[10px] text-gray-600 mt-3 flex items-center gap-2 italic-none uppercase tracking-widest font-bold">
                  <Search class="w-3 h-3" />
                  Autonomous extraction & vectorization active.
                </p>
              </div>
            </div>

            <!-- File Form -->
            <div v-if="activeTab === 'file'" class="space-y-6">
              <div 
                class="border-2 border-dashed border-white/10 rounded-3xl p-10 text-center hover:border-primary/30 transition-all cursor-pointer bg-white/[0.01]"
                @click="$refs.fileInput.click()"
              >
                <input 
                  type="file" 
                  ref="fileInput" 
                  class="hidden" 
                  accept=".pdf"
                  @change="handleFileChange"
                />
                <div v-if="!selectedFile" class="space-y-4">
                  <div class="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText class="w-8 h-8 text-gray-600" />
                  </div>
                  <p class="text-xs font-bold text-white uppercase tracking-widest italic-none">DRAG & DROP OR CLICK TO SELECT PDF</p>
                  <p class="text-[10px] text-gray-600 uppercase tracking-widest italic-none">Max File Size: 10MB</p>
                </div>
                <div v-else class="space-y-4">
                  <div class="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText class="w-8 h-8 text-primary" />
                  </div>
                  <p class="text-xs font-bold text-primary uppercase tracking-widest italic-none">{{ selectedFile.name }}</p>
                  <button 
                    @click.stop="handleFileTrain"
                    :disabled="isProcessing || isOverTrainingLimit"
                    class="mt-4 px-8 py-3 bg-primary text-black font-bold tracking-widest text-[11px] rounded-xl hover:bg-primary-accent transition-all disabled:opacity-50 flex items-center gap-2 mx-auto uppercase italic-none"
                  >
                    <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
                    {{ isOverTrainingLimit ? 'LIMIT REACHED' : 'Process Knowledge' }}
                  </button>
                </div>
                <p v-if="isOverTrainingLimit" class="text-[10px] text-red-500 mt-4 font-bold uppercase tracking-widest italic-none text-center">
                  Training limit reached. Upgrade to continue adding documents.
                </p>
              </div>
            </div>

            <!-- Text Form -->
            <div v-if="activeTab === 'text'" class="space-y-6">
              <div class="space-y-4">
                <div>
                  <label class="block text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-2 italic-none">Subject / Title</label>
                  <input 
                    v-model="textForm.title"
                    placeholder="e.g. Return Policy"
                    class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-700 focus:outline-none focus:border-primary/50 transition-colors italic-none"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-2 italic-none">Knowledge Content</label>
                  <textarea 
                    v-model="textForm.content"
                    rows="8"
                    placeholder="Paste your knowledge content here..."
                    class="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-gray-700 focus:outline-none focus:border-primary/50 transition-colors resize-none mb-2 italic-none"
                  ></textarea>
                </div>
                <button 
                  @click="handleTextTrain"
                  :disabled="isProcessing || !textForm.content || isOverTrainingLimit"
                  class="w-full py-3.5 bg-primary text-black font-bold tracking-widest text-[11px] rounded-xl hover:bg-primary-accent transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase shadow-lg shadow-primary/10 italic-none"
                >
                  <Plus v-if="!isProcessing" class="w-4 h-4" />
                  <Loader2 v-else class="w-4 h-4 animate-spin" />
                  {{ isOverTrainingLimit ? 'LIMIT REACHED' : 'Add to Knowledge Base' }}
                </button>
                <p v-if="isOverTrainingLimit" class="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-widest italic-none text-center">
                  User on {{ planSlug }} plan has reached the maximum of 10 trainings.
                </p>
              </div>
            </div>
          </div>
        </div>


        <!-- Training Registry (Recorded History) -->
        <HistoryTable 
          :jobs="trainingJobs" 
          :sources="sources"
          @view-extraction="viewExtraction"
          @delete-source="handleDeleteSource"
        />
      </div>

      <!-- Right Column: Meter & Strategy -->
      <div class="space-y-6">
        <DashboardStats 
          :chatbot="chatbot"
          :monthly-usage="monthlyUsage"
          :total-trainings="trainingJobs.length"
          :plan-slug="planSlug"
          :sources-count="sources.length"
          :limits="limits"
        />

        <!-- Strategy Box -->
        <div class="glass-card bg-primary/5 border-primary/10">
          <div class="flex items-center gap-3 mb-4">
            <LucideSparkles class="w-5 h-5 text-primary" />
            <h4 class="text-[11px] font-bold tracking-widest text-primary uppercase italic-none">Expert Strategy</h4>
          </div>
          <p class="text-[11px] text-gray-400 leading-relaxed mb-6 italic-none">
            Your agent uses **RAG (Retrieval Augmented Generation)**. It will search this knowledge base before replying.
          </p>
          <div class="space-y-3">
            <div v-for="tip in ['Keep text clear and distinct', 'Add FAQs as line entries', 'Avoid overly large PDFs']" :key="tip" class="flex items-center gap-2">
              <div class="w-1 h-1 rounded-full bg-primary/40"></div>
              <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic-none">{{ tip }}</span>
            </div>
          </div>
        </div>

        <!-- Help box -->
        <div class="glass-card border-dashed border-white/5 opacity-60">
          <div class="flex items-center gap-3 mb-3">
            <AlertTriangle class="w-4 h-4 text-orange-400/50" />
            <p class="text-[9px] font-bold text-gray-500 uppercase tracking-widest italic-none">System Note</p>
          </div>
          <p class="text-[10px] text-gray-600 italic-none">Training is irreversible for the current session. Deleting a source clears indexed context immediately.</p>
        </div>
      </div>
    </div>

    <!-- Chat Test Modal/Drawer -->
    <div v-if="showChatTest" class="fixed inset-0 z-50 flex items-center justify-end">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showChatTest = false"></div>
      
      <div class="relative w-full max-w-lg h-full bg-[#0a0a0a] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        <!-- Close button -->
        <div class="p-8 border-b border-white/5 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <LucideSparkles class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-widest italic-none">Ability Sandbox</h3>
              <p class="text-[9px] text-gray-600 font-bold uppercase tracking-widest italic-none">Test trained knowledge in real-time</p>
            </div>
          </div>
          <button @click="showChatTest = false" class="p-2 hover:bg-white/5 rounded-xl transition-all">
             <Plus class="w-5 h-5 rotate-45 text-gray-500" />
          </button>
        </div>

        <!-- Chat Area -->
        <div class="flex-1 overflow-y-auto p-8 space-y-6">
          <div v-if="testMessages.length === 0" class="h-full flex flex-col items-center justify-center text-center opacity-40">
             <Bot class="w-12 h-12 mb-4 text-gray-600" />
             <p class="text-[11px] font-bold text-gray-500 uppercase tracking-widest max-w-[200px]">Ask your agent anything based on the data you provided.</p>
          </div>

          <div v-for="(msg, i) in testMessages" :key="i" :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
             <div :class="[
               'max-w-[85%] p-4 text-xs italic-none',
               msg.role === 'user' 
                ? 'bg-primary text-black rounded-2xl rounded-tr-sm font-medium' 
                : 'bg-white/5 text-gray-300 border border-white/5 rounded-2xl rounded-tl-sm leading-relaxed'
             ]">
                {{ msg.content }}
             </div>
          </div>

          <div v-if="isTestLoading" class="flex justify-start">
            <div class="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-tl-sm">
               <div class="flex gap-1">
                 <div class="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></div>
                 <div class="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce delay-100"></div>
                 <div class="w-1.5 h-1.5 bg-primary/80 rounded-full animate-bounce delay-200"></div>
               </div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="p-8 border-t border-white/5 bg-[#080808]">
          <div class="relative">
            <input 
              v-model="testInput"
              @keyup.enter="handleTestChat"
              placeholder="Query the agent knowledge..."
              class="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white placeholder:text-gray-700 focus:outline-none focus:border-primary/50 transition-all italic-none"
            />
            <button 
              @click="handleTestChat"
              :disabled="!testInput || isTestLoading"
              class="absolute right-2 top-2 bottom-2 px-4 bg-primary text-black rounded-xl hover:bg-primary-accent transition-all disabled:opacity-30 disabled:hover:bg-primary"
            >
              <LucideZap class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Extraction Result Modal -->
    <ExtractionModal 
      :show="showExtractionModal" 
      :data="selectedExtraction"
      @close="showExtractionModal = false"
    />
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
