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
  ArrowLeft
} from 'lucide-vue-next'

const props = defineProps<{
  jobs: any[]
  sources: any[]
}>()

const emit = defineEmits<{
  (e: 'view-extraction', job: any): void
  (e: 'delete-source', id: string): void
}>()

// Filter & Pagination State
const searchQuery = ref('')
const statusFilter = ref<'all' | 'finished' | 'failed' | 'processing'>('all')
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
          <option value="processing">PROCESSING</option>
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
                        {{ job.meta?.title || job.meta?.filename || job.meta?.url || 'Batch Processing' }}
                      </p>
                      <p class="text-[9px] text-foreground/30 font-bold uppercase tracking-widest italic-none truncate max-w-[200px]">
                        {{ job.meta?.url || job.meta?.filename || 'Manual Entry' }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span class="px-2 py-0.5 rounded bg-foreground/5 text-[9px] font-bold text-foreground/40 uppercase tracking-widest italic-none">
                    {{ job.meta?.type || 'BATCH' }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <div :class="[
                      'w-1.5 h-1.5 rounded-full', 
                      job.status === 'finished' ? 'bg-primary' : 
                      job.status === 'failed' ? 'bg-red-500' : 'bg-orange-500 animate-pulse'
                    ]"></div>
                    <span :class="[
                      'text-[9px] font-bold uppercase tracking-widest italic-none', 
                      job.status === 'finished' ? 'text-primary' : 
                      job.status === 'failed' ? 'text-red-500' : 'text-orange-500'
                    ]">
                      {{ job.status }}
                    </span>
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
                      v-if="job.status === 'finished' || job.status === 'failed'"
                      @click="emit('view-extraction', job)"
                      :class="[
                        'px-3 py-1 bg-foreground/5 hover:bg-foreground/10 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all border border-foreground/5',
                        job.status === 'failed' ? 'text-red-400 hover:text-red-300' : 'text-foreground/40 hover:text-foreground'
                      ]"
                    >
                      {{ job.status === 'failed' ? 'View Error' : 'View Data' }}
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
