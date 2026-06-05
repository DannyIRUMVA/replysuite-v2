<script setup lang="ts">
import { 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Globe, 
  FileText, 
  Type, 
  Clock, 
  History,
  Search,
  ArrowLeft,
  Eye,
  Lock,
  RotateCcw
} from 'lucide-vue-next'

const props = defineProps<{
  jobs: any[]
  sources: any[]
  isPremium: boolean
  rerunningJobId?: string | null
}>()

const emit = defineEmits<{
  (e: 'view-extraction', job: any): void
  (e: 'delete-source', id: string): void
  (e: 'rerun-job', job: any): void
}>()

// Filter & Pagination State
const searchQuery = ref('')
const statusFilter = ref<'all' | 'finished' | 'failed' | 'queued' | 'processing' | 'retry_wait'>('all')
const typeFilter = ref<'all' | 'url' | 'file' | 'text'>('all')
const currentPage = ref(1)
const itemsPerPage = 5

// Computed
const filteredJobs = computed(() => {
  return props.jobs.filter(job => {
    const title = (job.meta?.title || job.meta?.filename || job.meta?.url || '').toLowerCase()
    const matchesSearch = title.includes(searchQuery.value.toLowerCase())
    const matchesStatus = statusFilter.value === 'all' || job.status === statusFilter.value
    const matchesType = typeFilter.value === 'all' || job.meta?.type === typeFilter.value
    return matchesSearch && matchesStatus && matchesType
  })
})

const totalPages = computed(() => Math.ceil(filteredJobs.value.length / itemsPerPage))

const paginatedJobs = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredJobs.value.slice(start, end)
})

// Reset page on filter change
watch([searchQuery, statusFilter, typeFilter], () => {
  currentPage.value = 1
})

const getJobSource = (job: any) => {
  return props.sources.find(s => 
    (s.metadata?.url && s.metadata.url === job.meta?.url) || 
    (s.metadata?.filename && s.metadata.filename === job.meta?.filename) ||
    (s.type === 'text' && s.metadata?.title === job.meta?.title)
  )
}

const getJobType = (job: any) => job.meta?.type || job.job_type || 'batch'
const getJobTitle = (job: any) => job.meta?.title || job.meta?.filename || job.meta?.url || 'Batch Processing'
const getJobSubline = (job: any) => job.progress_label || job.meta?.url || job.meta?.filename || 'Manual Entry'
const getJobProgress = (job: any) => {
  const value = Math.max(0, Math.min(100, Number(job?.progress || 0)))
  if (value > 0) return value
  if (['queued', 'processing', 'retry_wait'].includes(job?.status)) return 5
  return 0
}

const getStatusTone = (status: string) => {
  if (status === 'finished') return 'bg-primary text-primary'
  if (status === 'failed') return 'bg-red-500 text-red-500'
  if (status === 'retry_wait') return 'bg-amber-500 text-amber-500'
  return 'bg-orange-500 text-orange-500'
}

const getRetryHint = (job: any) => {
  const nextRunAfter = job?.meta?.worker?.nextRunAfter
  if (!nextRunAfter) return getJobSubline(job)

  const retryDate = new Date(nextRunAfter)
  if (Number.isNaN(retryDate.getTime())) return getJobSubline(job)

  return `Retry scheduled ${retryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}
</script>

<template>
  <div class="glass-card">
    <div class="flex flex-col md:flex-row items-center gap-4 mb-8">
      <div class="relative flex-1 group">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30 group-focus-within:text-primary transition-colors" />
        <input v-model="searchQuery" placeholder="Search training context..." 
          class="w-full bg-foreground/5 border border-foreground/5 focus:border-primary/30 rounded-2xl pl-12 pr-4 py-3 text-xs text-foreground placeholder:text-foreground/20 focus:outline-none transition-all" />
      </div>
      
      <div class="flex items-center gap-3 w-full md:w-auto">
        <select v-model="statusFilter" class="bg-foreground/5 border border-foreground/5 rounded-2xl px-4 py-3 text-[10px] font-bold text-foreground/40 uppercase tracking-widest focus:outline-none focus:border-primary/30 transition-all cursor-pointer">
          <option value="all">ALL STATUS</option>
          <option value="finished">FINISHED</option>
          <option value="failed">FAILED</option>
          <option value="queued">QUEUED</option>
          <option value="processing">PROCESSING</option>
          <option value="retry_wait">RETRY WAIT</option>
        </select>
        
        <select v-model="typeFilter" class="bg-foreground/5 border border-foreground/5 rounded-2xl px-4 py-3 text-[10px] font-bold text-foreground/40 uppercase tracking-widest focus:outline-none focus:border-primary/30 transition-all cursor-pointer">
          <option value="all">ALL TYPES</option>
          <option value="url">WEBSITE</option>
          <option value="file">DOCUMENT</option>
          <option value="text">CUSTOM TEXT</option>
        </select>
      </div>
    </div>

    <div v-if="filteredJobs.length === 0" class="flex flex-col items-center justify-center py-20 bg-foreground/[0.02] rounded-2xl border border-dashed border-foreground/5">
      <div class="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center mb-4">
        <History class="w-8 h-8 text-foreground/30" />
      </div>
      <p class="text-sm font-bold text-foreground/40 uppercase tracking-widest italic-none">No matching sessions</p>
      <p class="text-[10px] text-foreground/30 mt-2 uppercase tracking-widest italic-none">Try adjusting your filters or search query</p>
    </div>

    <div v-else class="space-y-6">
      <div class="overflow-hidden bg-foreground/[0.01] rounded-2xl border border-foreground/5">
      <div v-if="jobs.some(job => ['queued', 'processing', 'retry_wait'].includes(job.status))" class="px-6 py-4 border-b border-foreground/5 bg-primary/5">
        <p class="text-[10px] font-bold text-primary uppercase tracking-widest italic-none">Live training progress and retry updates are active</p>
      </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-foreground/5 bg-foreground/[0.02]">
                <th class="px-6 py-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest italic-none">Context Source</th>
                <th class="px-6 py-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest italic-none">Type</th>
                <th class="px-6 py-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest italic-none">Status</th>
                <th class="px-6 py-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest italic-none">Started At</th>
                <th class="px-6 py-4 text-right text-[10px] font-bold text-foreground/40 uppercase tracking-widest italic-none">Insights</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-foreground/5">
              <tr v-for="job in paginatedJobs" :key="job.id" class="group hover:bg-foreground/[0.02] transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors border border-foreground/5 group-hover:border-primary/20">
                      <Globe v-if="job.meta?.type === 'url'" class="w-4 h-4 text-foreground/40 group-hover:text-primary" />
                      <FileText v-else-if="job.meta?.type === 'file'" class="w-4 h-4 text-foreground/40 group-hover:text-primary" />
                      <Type v-else class="w-4 h-4 text-foreground/40 group-hover:text-primary" />
                    </div>
                    <div>
                      <p class="text-[11px] font-bold text-foreground mb-0.5 truncate max-w-[200px]">
                        {{ getJobTitle(job) }}
                      </p>
                      <p class="text-[9px] text-foreground/30 font-bold uppercase tracking-widest italic-none truncate max-w-[200px]">
                        {{ getJobSubline(job) }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span class="px-2 py-0.5 rounded bg-foreground/5 text-[9px] font-bold text-foreground/40 uppercase tracking-widest italic-none">
                    {{ getJobType(job) }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="space-y-2 min-w-[140px]">
                    <div class="flex items-center gap-2">
                      <div :class="[
                        'w-1.5 h-1.5 rounded-full',
                        getStatusTone(job.status).split(' ')[0],
                        ['queued', 'processing'].includes(job.status) ? 'animate-pulse' : ''
                      ]"></div>
                      <span :class="[
                        'text-[9px] font-bold uppercase tracking-widest italic-none',
                        getStatusTone(job.status).split(' ')[1]
                      ]">
                        {{ job.status }}
                      </span>
                      <span v-if="job.status === 'processing'" class="text-[9px] font-bold text-primary uppercase tracking-widest italic-none">
                        {{ getJobProgress(job) }}%
                      </span>
                    </div>

                    <div v-if="job.status === 'processing' || job.status === 'queued' || job.status === 'retry_wait'" class="space-y-1">
                      <div class="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
                        <div
                          :class="['h-full transition-all duration-500', job.status === 'retry_wait' ? 'bg-amber-500' : 'bg-primary']"
                          :style="{ width: `${getJobProgress(job)}%` }"
                        ></div>
                      </div>
                      <p class="text-[9px] text-foreground/35 uppercase tracking-widest italic-none truncate">
                        {{ job.status === 'retry_wait' ? getRetryHint(job) : getJobSubline(job) }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2 text-[10px] text-foreground/40 font-bold tracking-widest italic-none">
                    <Clock class="w-3 h-3" />
                    {{ job.created_at ? new Date(job.created_at).toLocaleDateString() : 'Pending' }}
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-3">
                    <button 
                      v-if="job.status === 'failed'"
                      @click="emit('rerun-job', job)"
                      :disabled="props.rerunningJobId === job.id"
                      class="px-3 py-1.5 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all border bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20 disabled:cursor-wait disabled:opacity-60"
                    >
                      <Loader2 v-if="props.rerunningJobId === job.id" class="w-3.5 h-3.5 animate-spin" />
                      <RotateCcw v-else class="w-3.5 h-3.5" />
                      Rerun
                    </button>

                    <button 
                      v-if="job.status === 'finished' || job.status === 'failed'"
                      @click="isPremium ? emit('view-extraction', job) : null"
                      :class="[
                        'px-3 py-1.5 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all border',
                        !isPremium 
                          ? 'bg-foreground/5 border-foreground/5 text-foreground/20 cursor-not-allowed grayscale' 
                          : job.status === 'failed' 
                            ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' 
                            : 'bg-primary/5 border-primary/10 text-primary hover:bg-primary/10'
                      ]"
                    >
                      <component :is="isPremium ? Eye : Lock" class="w-3.5 h-3.5" />
                      {{ job.status === 'failed' ? 'Error Detail' : 'Inspect' }}
                      <span v-if="!isPremium" class="ml-1 bg-primary/20 text-primary px-1.5 py-0.5 rounded-[4px] text-[7px]">PRO</span>
                    </button>
                    
                    <button 
                      v-if="job.status === 'finished' && getJobSource(job)"
                      @click="emit('delete-source', getJobSource(job).id)"
                      class="p-1.5 rounded-lg bg-foreground/5 hover:bg-red-500/10 text-foreground/40 hover:text-red-500 transition-all"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
  
                    <CheckCircle2 v-if="job.status === 'finished'" class="w-4 h-4 text-primary" />
                    <AlertTriangle v-else-if="job.status === 'failed'" class="w-4 h-4 text-red-500" />
                    <Clock v-else-if="job.status === 'retry_wait'" class="w-4 h-4 text-amber-500" />
                    <Loader2 v-else class="w-4 h-4 text-orange-500 animate-spin" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-2">
        <p class="text-[10px] text-foreground/30 font-bold uppercase tracking-widest">
          Showing {{ ((currentPage - 1) * itemsPerPage) + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredJobs.length) }} of {{ filteredJobs.length }}
        </p>
        <div class="flex items-center gap-2">
          <button @click="currentPage--" :disabled="currentPage === 1"
            class="p-2 bg-foreground/5 hover:bg-foreground/10 border border-foreground/5 rounded-xl text-foreground/40 hover:text-foreground disabled:opacity-30 disabled:hover:bg-foreground/5 transition-all">
            <ArrowLeft class="w-4 h-4" />
          </button>
          <div class="flex items-center gap-1">
            <button v-for="p in totalPages" :key="p" @click="currentPage = p"
              :class="['w-8 h-8 rounded-xl text-[10px] font-bold transition-all', currentPage === p ? 'bg-primary text-black shadow-lg shadow-primary/10' : 'text-foreground/40 hover:text-foreground hover:bg-foreground/5']">
              {{ p }}
            </button>
          </div>
          <button @click="currentPage++" :disabled="currentPage === totalPages"
            class="p-2 bg-foreground/5 hover:bg-foreground/10 border border-foreground/5 rounded-xl text-foreground/40 hover:text-foreground disabled:opacity-30 disabled:hover:bg-foreground/5 transition-all">
            <ArrowLeft class="w-4 h-4 rotate-180" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
