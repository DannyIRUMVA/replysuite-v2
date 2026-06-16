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
  Zap as LucideZap,
  Sparkles as LucideSparkles
} from 'lucide-vue-next'
import HistoryTable from '~/components/agents/skills/HistoryTable.vue'
import DashboardStats from '~/components/agents/skills/DashboardStats.vue'
import ExtractionModal from '~/components/agents/skills/ExtractionModal.vue'
import Skeleton from '~~/app/components/Skeleton.vue'
import { marked } from 'marked'
import xss from 'xss'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const route = useRoute()
const chatbotId = route.query.id as string
const { userId, limits, planSlug, profile } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()

// State
const isLoading = ref(true)
const isProcessing = ref(false)
const activeTab = ref<'url' | 'file' | 'text'>('url')
const chatbot = ref<any>(null)
const sources = ref<any[]>([])
const trainingJobs = ref<any[]>([])
const monthlyUsage = ref(0)
const totalTrainings = ref(0)

const isPremium = computed(() => ['silver', 'gold', 'enterprise-ready'].includes(planSlug.value || ''))
const activeJobStatuses = ['queued', 'processing', 'retry_wait']
const isOnboardingTraining = computed(() => route.query.onboarding === '1')
const onboardingIntegration = computed(() => route.query.integration === 'whatsapp' ? 'whatsapp' : 'website')
const onboardingIntegrationPath = computed(() => onboardingIntegration.value === 'whatsapp' ? '/dashboard/integrations/whatsapp' : '/dashboard/integrations/website')
const onboardingIntegrationLabel = computed(() => onboardingIntegration.value === 'whatsapp' ? 'WhatsApp' : 'Website')

const renderMarkdown = (text: string) => {
  if (!text) return ''
  const rawHtml = marked.parse(text, { async: false, breaks: true }) as string
  return xss(rawHtml)
}

useHead({
  title: computed(() => chatbot.value?.name ? `${chatbot.value.name} | Train Your AI` : 'Train Your AI | ReplySuite'),
})

// Form States
const urlForm = ref({ url: '' })
const textForm = ref({ title: '', content: '' })
const selectedFile = ref<File | null>(null)

// Extraction Viewer State
const showExtractionModal = ref(false)
const selectedExtraction = ref<{ title: string, content: string } | null>(null)
const rerunningJobId = ref<string | null>(null)

// Fetch Data
const fetchData = async () => {
  if (!chatbotId || !userId.value) {
    isLoading.value = false
    return
  }

  try {
    const [chatbotRes, sourcesRes, jobsRes, usageRes, embeddingsRes] = await Promise.all([
      supabase.from('chatbots').select('*').eq('id', chatbotId).single(),
      supabase.from('data_sources').select('*').eq('chatbot_id', chatbotId),
      supabase.from('training_jobs').select('*').eq('chatbot_id', chatbotId).order('started_at', { ascending: false, nullsFirst: false }),
      $fetch(`/api/agents/usage?chatbotId=${chatbotId}`),
      supabase.from('embeddings').select('*', { count: 'exact', head: true }).eq('chatbot_id', chatbotId)
    ])

    if (chatbotRes.error) throw chatbotRes.error
    chatbot.value = chatbotRes.data
    sources.value = (sourcesRes.data || []).reverse()
    trainingJobs.value = jobsRes.data || []
    totalTrainings.value = trainingJobs.value.length
    monthlyUsage.value = (usageRes as any).usage || 0
    chatbot.value.embeddings_count = embeddingsRes.count || 0
  } catch (err) {
    console.error('Error fetching training data:', err)
  } finally {
    isLoading.value = false
  }
}

// Polling for processing jobs
let pollInterval: any = null
watch(trainingJobs, (newJobs) => {
  const hasActiveJobs = newJobs.some(j => activeJobStatuses.includes(j.status))
  if (hasActiveJobs && !pollInterval) {
    pollInterval = setInterval(fetchData, 5000)
  } else if (!hasActiveJobs && pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}, { deep: true })

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

onMounted(async () => {
  await fetchData()
  if (isOnboardingTraining.value) {
    showTrainingModal.value = true
    const website = String(profile.value?.website || '').trim()
    if (website && !urlForm.value.url) urlForm.value.url = website
  }
})

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
  if (!urlForm.value.url || isOverTrainingLimit.value) return
  isProcessing.value = true

  try {
    const trainPromise = $fetch('/api/agents/train/url', {
      method: 'POST',
      body: { chatbotId, url: urlForm.value.url }
    })

    setTimeout(() => fetchData(), 1000)

    const res: any = await trainPromise
    if (res.success) {
      urlForm.value.url = ''
      showTrainingModal.value = false
      notify.success(res.message || 'Website training queued successfully.')
    }
  } catch (err: any) {
    console.error('[URL Training Error]', err)
    notify.error(err.message || 'Failed to train from URL')
  } finally {
    isProcessing.value = false
    await fetchData()
  }
}

const handleTextTrain = async () => {
  if (!textForm.value.content || isOverTrainingLimit.value) return
  isProcessing.value = true

  try {
    const trainPromise = $fetch('/api/agents/train/text', {
      method: 'POST',
      body: { chatbotId, ...textForm.value }
    })

    setTimeout(() => fetchData(), 1000)

    const res: any = await trainPromise
    if (res.success) {
      textForm.value = { title: '', content: '' }
      showTrainingModal.value = false
      notify.success(res.message || 'Text training queued successfully.')
    }
  } catch (err: any) {
    console.error('[Text Training Error]', err)
    notify.error(err.message || 'Failed to train from text')
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
  if (!selectedFile.value || isOverTrainingLimit.value) return
  isProcessing.value = true

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('chatbotId', chatbotId)

    const trainPromise = $fetch('/api/agents/train/file', {
      method: 'POST',
      body: formData
    })

    setTimeout(() => fetchData(), 1000)

    const res: any = await trainPromise
    if (res.success) {
      selectedFile.value = null
      showTrainingModal.value = false
      notify.success(res.message || 'Document training queued successfully.')
    }
  } catch (err: any) {
    console.error('[File Training Error]', err)
    notify.error(err.message || 'Failed to train from file')
  } finally {
    isProcessing.value = false
    await fetchData()
  }
}

const handleDeleteSource = async (id: string) => {
  if (!(await notify.confirm('Are you sure you want to remove this knowledge source? The corresponding embeddings will also be deleted.'))) return

  try {
    await $fetch(`/api/agents/train/source/${id}`, { method: 'DELETE' })
    notify.success('Knowledge source removed successfully.')
    await fetchData()
  } catch (err) {
    console.error('Error deleting source:', err)
    notify.error('Failed to delete the selected knowledge source.')
  }
}

const handleRerunJob = async (job: any) => {
  if (!job?.id || rerunningJobId.value) return

  rerunningJobId.value = job.id
  try {
    const res: any = await $fetch('/api/agents/train/rerun', {
      method: 'POST',
      body: { jobId: job.id }
    })

    notify.success(res?.message || 'Training job queued again.')
    await fetchData()
  } catch (err: any) {
    console.error('[Training Rerun Error]', err)
    notify.error(err?.data?.message || err?.message || 'Failed to rerun training job.')
  } finally {
    rerunningJobId.value = null
  }
}

// UI Helper
const isOverTrainingLimit = computed(() => {
  if (!limits.value?.maxTrainings) return false
  if (limits.value.maxTrainings === -1) return false
  return trainingJobs.value.length >= limits.value.maxTrainings
})

// Chat Test State
const showChatTest = ref(false)
const showTrainingModal = ref(false)
const testInput = ref('')
const testMessages = ref<{ role: 'user' | 'assistant', content: string }[]>([])
const testSessionId = ref('')
const isTestLoading = ref(false)

const handleTestChat = async () => {
  if (!testInput.value || isTestLoading.value) return

  const userMsg = testInput.value
  testMessages.value.push({ role: 'user', content: userMsg })
  testInput.value = ''
  isTestLoading.value = true

  try {
    const res = await $fetch('/api/agents/chat/test', {
      method: 'POST',
      body: { chatbotId, message: userMsg, sessionId: testSessionId.value || undefined }
    })
    if ((res as any)?.sessionId) testSessionId.value = (res as any).sessionId
    if (res.success) {
      testMessages.value.push({ role: 'assistant', content: res.response })
      await fetchData() // Refresh usage stats
    }
  } catch (err: any) {
    testMessages.value.push({ role: 'assistant', content: `Error: ${err.message || 'Brain connection failed'}` })
  } finally {
    isTestLoading.value = false
  }
}
</script>

<template>
  <div class="relative space-y-6 pb-20">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <NuxtLink to="/dashboard/agents"
        class="dashboard-back-link group">
        <ArrowLeft class="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
        Back to Agents
      </NuxtLink>

    </div>

    <div v-if="isOnboardingTraining" class="glass-card !rounded-2xl border-primary/15 bg-primary/[0.035] p-4 sm:p-5">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <LucideSparkles class="h-5 w-5" />
          </div>
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">First training step</p>
            <h2 class="mt-1 text-lg font-black tracking-tight text-foreground">Train your assistant before connecting {{ onboardingIntegrationLabel }}.</h2>
            <p class="mt-1 max-w-2xl text-xs font-medium leading-relaxed text-foreground/55">Add your website, a PDF, or custom text. Once training finishes, continue to the integration setup you selected during onboarding.</p>
          </div>
        </div>
        <NuxtLink :to="onboardingIntegrationPath" class="inline-flex shrink-0 items-center justify-center rounded-xl border border-foreground/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/60 transition hover:border-primary/30 hover:text-primary">
          Setup {{ onboardingIntegrationLabel }}
        </NuxtLink>
      </div>
    </div>

    <div v-if="isLoading" class="space-y-6">
      <div class="glass-card !rounded-2xl !p-0 overflow-hidden">
        <div class="grid grid-cols-1 divide-y divide-foreground/5 md:grid-cols-2 md:divide-x md:divide-y-0">
          <div v-for="item in 2" :key="item" class="space-y-5 p-5 sm:p-6">
            <div class="flex items-center justify-between gap-4">
              <Skeleton width="7rem" height="0.65rem" />
              <Skeleton width="2rem" height="2rem" radius="0.75rem" />
            </div>
            <Skeleton width="45%" height="1.9rem" radius="0.85rem" />
            <Skeleton width="100%" height="0.5rem" radius="999px" />
            <Skeleton width="70%" height="0.65rem" />
          </div>
        </div>
      </div>

      <div class="glass-card space-y-4">
        <div class="flex items-center justify-between gap-4">
          <Skeleton width="10rem" height="0.85rem" />
          <Skeleton width="6rem" height="2rem" radius="0.75rem" />
        </div>
        <div class="space-y-3">
          <Skeleton v-for="row in 4" :key="row" height="3.5rem" radius="0.9rem" />
        </div>
      </div>
    </div>

    <div v-else class="space-y-6">
      <DashboardStats :chatbot="chatbot" :monthly-usage="monthlyUsage" :total-trainings="trainingJobs.length"
        :plan-slug="planSlug" :sources-count="sources.length" :limits="limits"
        @train-assistant="showTrainingModal = true"
        @test-assistant="showChatTest = true" />

      <!-- Training Registry -->
      <div class="space-y-6 min-w-0">
        <!-- Training Registry (Recorded History) -->
        <HistoryTable 
          :jobs="trainingJobs" 
          :sources="sources" 
          :is-premium="isPremium"
          :rerunning-job-id="rerunningJobId"
          @view-extraction="viewExtraction" 
          @delete-source="handleDeleteSource" 
          @rerun-job="handleRerunJob"
        />
      </div>

    </div>

    <!-- Training Modal -->
    <div v-if="showTrainingModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div class="absolute inset-0 bg-background/70 backdrop-blur-sm" @click="showTrainingModal = false"></div>

      <div class="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-background shadow-2xl">
        <div class="flex items-center justify-between gap-4 border-b border-foreground/5 p-5 sm:p-6">
          <div>
            <h3 class="text-sm font-bold uppercase tracking-widest text-foreground italic-none">Train Assistant</h3>
            <p class="mt-1 text-[9px] font-bold uppercase tracking-widest text-foreground/40 italic-none">
              Add website, PDF, or custom knowledge in the background.
            </p>
          </div>
          <button @click="showTrainingModal = false" class="rounded-xl p-2 transition-all hover:bg-foreground/5">
            <Plus class="h-5 w-5 rotate-45 text-foreground/40" />
          </button>
        </div>

        <div class="overflow-y-auto p-4 sm:p-5">
        <div class="glass-card !bg-foreground/[0.01]">
          <!-- Tabs -->
          <div class="mb-6 flex flex-col gap-1 rounded-xl bg-foreground/5 p-1 sm:flex-row">
            <button v-for="tab in [
              { id: 'url', label: 'Website URL', icon: Globe },
              { id: 'file', label: 'PDF Document', icon: FileText },
              { id: 'text', label: 'Custom Text', icon: Type }
            ] as const" :key="tab.id" @click="activeTab = tab.id" :class="[
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-bold tracking-widest rounded-xl transition-all uppercase italic-none',
              activeTab === tab.id ? 'bg-primary text-black shadow-lg shadow-primary/10' : 'text-foreground/40 hover:text-foreground hover:bg-foreground/5'
            ]">
              <component :is="tab.icon" class="w-3.5 h-3.5" />
              {{ tab.label }}
            </button>
          </div>

          <!-- Training Tabs Content -->
          <div class="space-y-6">
            <!-- URL Form -->
            <div v-if="activeTab === 'url'" class="space-y-6">
              <div>
                <label
                  class="block text-[11px] font-bold tracking-widest text-foreground/40 uppercase mb-3 italic-none">Website
                  URL</label>
                <div class="flex flex-col gap-3 sm:flex-row">
                  <input v-model="urlForm.url" placeholder="https://example.com/docs"
                    class="flex-1 bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors italic-none" />
                  <button @click="handleUrlTrain" :disabled="isProcessing || !urlForm.url || isOverTrainingLimit"
                    class="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-black transition-all hover:bg-primary-accent disabled:opacity-50 sm:py-0 italic-none">
                    <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
                    {{ isOverTrainingLimit ? 'LIMIT REACHED' : 'TRAIN WEBSITE' }}
                  </button>
                </div>
                <p v-if="isOverTrainingLimit"
                  class="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-widest italic-none">
                  Training limit reached for {{ planSlug }} plan. Upgrade for more training sessions.
                </p>
                <p
                  class="text-[10px] text-foreground/30 mt-3 flex items-center gap-2 italic-none uppercase tracking-widest font-bold">
                  <Search class="w-3 h-3" />
                  Website content trains in small background slices and resumes automatically if rate-limited.
                </p>
              </div>
            </div>

            <!-- File Form -->
            <div v-if="activeTab === 'file'" class="space-y-6">
              <div
                class="cursor-pointer rounded-2xl border-2 border-dashed border-foreground/10 bg-foreground/[0.01] p-6 text-center transition-all hover:border-primary/30 sm:p-8"
                @click="$refs.fileInput.click()">
                <input type="file" ref="fileInput" class="hidden" accept=".pdf" @change="handleFileChange" />
                <div v-if="!selectedFile" class="space-y-4">
                  <div class="w-16 h-16 bg-foreground/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText class="w-8 h-8 text-foreground/30" />
                  </div>
                  <p class="text-xs font-bold text-foreground uppercase tracking-widest italic-none">DRAG & DROP OR CLICK TO
                    SELECT A PDF</p>
                  <p class="text-[10px] text-foreground/30 uppercase tracking-widest italic-none">Free-mode PDF max: 2MB</p>
                </div>
                <div v-else class="space-y-4">
                  <div class="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText class="w-8 h-8 text-primary" />
                  </div>
                  <p class="text-xs font-bold text-primary uppercase tracking-widest italic-none">{{ selectedFile.name
                    }}</p>
                  <button @click.stop="handleFileTrain" :disabled="isProcessing || isOverTrainingLimit"
                    class="mt-4 px-8 py-3 bg-primary text-black font-bold tracking-widest text-[11px] rounded-xl hover:bg-primary-accent transition-all disabled:opacity-50 flex items-center gap-2 mx-auto uppercase italic-none">
                    <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
                    {{ isOverTrainingLimit ? 'LIMIT REACHED' : 'TRAIN PDF' }}
                  </button>
                </div>
                <p v-if="isOverTrainingLimit"
                  class="text-[10px] text-red-500 mt-4 font-bold uppercase tracking-widest italic-none text-center">
                  Training limit reached. Upgrade to continue adding training sessions.
                </p>
              </div>
            </div>

            <!-- Text Form -->
            <div v-if="activeTab === 'text'" class="space-y-6">
              <div class="space-y-4">
                <div>
                  <label
                    class="block text-[11px] font-bold tracking-widest text-foreground/40 uppercase mb-2 italic-none">Subject
                    / Title</label>
                  <input v-model="textForm.title" placeholder="e.g. Return Policy"
                    class="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors italic-none" />
                </div>
                <div>
                  <label
                    class="block text-[11px] font-bold tracking-widest text-foreground/40 uppercase mb-2 italic-none">Business
                    Content</label>
                  <textarea v-model="textForm.content" rows="8" placeholder="Paste your knowledge content here..."
                    class="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-4 py-3 text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-colors resize-none mb-2 italic-none"></textarea>
                </div>
                <button @click="handleTextTrain" :disabled="isProcessing || !textForm.content || isOverTrainingLimit"
                  class="w-full py-3.5 bg-primary text-black font-bold tracking-widest text-[11px] rounded-xl hover:bg-primary-accent transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase shadow-lg shadow-primary/10 italic-none">
                  <Plus v-if="!isProcessing" class="w-4 h-4" />
                  <Loader2 v-else class="w-4 h-4 animate-spin" />
                  {{ isOverTrainingLimit ? 'LIMIT REACHED' : 'ADD CONTENT' }}
                </button>
                <p v-if="isOverTrainingLimit"
                  class="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-widest italic-none text-center px-8">
                  User on {{ planSlug }} plan has reached the maximum of {{ limits.maxTrainings }} sessions.
                </p>
              </div>
            </div>
          </div>
        </div>

        </div>
      </div>
    </div>

    <!-- Chat Test Modal/Drawer -->
    <div v-if="showChatTest" class="fixed inset-0 z-50 flex items-center justify-end">
      <div class="absolute inset-0 bg-background/60 backdrop-blur-sm" @click="showChatTest = false"></div>

      <div
        class="relative w-full max-w-lg h-full bg-background border-l border-foreground/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        <!-- Close button -->
        <div class="p-8 border-b border-foreground/5 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <LucideSparkles class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-foreground uppercase tracking-widest italic-none">Test Your Assistant</h3>
              <p class="text-[9px] text-foreground/40 font-bold uppercase tracking-widest italic-none">Try real questions
                against your trained content</p>
            </div>
          </div>
          <button @click="showChatTest = false" class="p-2 hover:bg-foreground/5 rounded-xl transition-all">
            <Plus class="w-5 h-5 rotate-45 text-foreground/40" />
          </button>
        </div>

        <!-- Chat Area -->
        <div class="flex-1 overflow-y-auto p-8 space-y-6">
          <div v-if="testMessages.length === 0"
            class="h-full flex flex-col items-center justify-center text-center opacity-40">
            <Bot class="w-12 h-12 mb-4 text-foreground/30" />
            <p class="text-[11px] font-bold text-foreground/40 uppercase tracking-widest max-w-[220px]">Ask your assistant
              a question based on the content you added.</p>
          </div>

          <div v-for="(msg, i) in testMessages" :key="i"
            :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
            <div :class="[
              'max-w-[85%] p-4 text-xs italic-none',
              msg.role === 'user'
                ? 'bg-primary text-black rounded-2xl rounded-tr-sm font-medium'
                : 'bg-foreground/5 text-foreground/80 border border-foreground/5 rounded-2xl rounded-tl-sm leading-relaxed widget-markdown'
            ]">
              <div v-if="msg.role === 'assistant'" v-html="renderMarkdown(msg.content)"></div>
              <div v-else>{{ msg.content }}</div>
            </div>
          </div>

          <div v-if="isTestLoading" class="flex justify-start">
            <div class="bg-foreground/5 border border-foreground/5 p-4 rounded-2xl rounded-tl-sm">
              <div class="flex gap-1">
                <div class="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></div>
                <div class="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce delay-100"></div>
                <div class="w-1.5 h-1.5 bg-primary/80 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="p-8 border-t border-foreground/5 bg-background">
          <div class="relative">
            <input v-model="testInput" @keyup.enter="handleTestChat" placeholder="Ask a question about your training data..."
              class="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-6 py-4 text-xs text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/50 transition-all italic-none" />
            <button @click="handleTestChat" :disabled="!testInput || isTestLoading"
              class="absolute right-2 top-2 bottom-2 px-4 bg-primary text-black rounded-xl hover:bg-primary-accent transition-all disabled:opacity-30 disabled:hover:bg-primary">
              <LucideZap class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Extraction Result Modal -->
    <ExtractionModal :show="showExtractionModal" :data="selectedExtraction" @close="showExtractionModal = false" />
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-2xl border border-foreground/5 bg-foreground/[0.03] p-5 backdrop-blur-xl sm:p-6;
}

.italic-none {
  font-style: normal !important;
}
</style>
