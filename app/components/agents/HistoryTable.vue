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
  History
} from 'lucide-vue-next'

const props = defineProps<{
  jobs: any[]
  sources: any[]
}>()

const emit = defineEmits<{
  (e: 'view-extraction', job: any): void
  (e: 'delete-source', id: string): void
}>()

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
    <div class="flex items-center gap-3 mb-8">
      <div class="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
        <History class="w-5 h-5 text-primary" />
      </div>
      <div>
        <h3 class="text-lg font-bold text-white leading-tight">Training Sessions</h3>
        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-0.5 italic-none">Activity Feed & Extraction Insights</p>
      </div>
    </div>

    <div v-if="jobs.length === 0" class="flex flex-col items-center justify-center py-20 bg-white/[0.02] rounded-2xl border border-dashed border-white/5">
      <div class="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <History class="w-8 h-8 text-gray-700" />
      </div>
      <p class="text-sm font-bold text-gray-500 uppercase tracking-widest italic-none">No training history yet</p>
      <p class="text-[10px] text-gray-700 mt-2 uppercase tracking-widest italic-none">Your agent is waiting for its first lesson</p>
    </div>

    <div v-else class="overflow-hidden bg-white/[0.01] rounded-2xl border border-white/5">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-white/5 bg-white/[0.02]">
              <th class="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest italic-none">Context Source</th>
              <th class="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest italic-none">Type</th>
              <th class="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest italic-none">Status</th>
              <th class="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest italic-none">Started At</th>
              <th class="px-6 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest italic-none">Insights</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-for="job in jobs" :key="job.id" class="group hover:bg-white/[0.02] transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors border border-white/5 group-hover:border-primary/20">
                    <Globe v-if="job.meta?.type === 'url'" class="w-4 h-4 text-gray-400 group-hover:text-primary" />
                    <FileText v-else-if="job.meta?.type === 'file'" class="w-4 h-4 text-gray-400 group-hover:text-primary" />
                    <Type v-else class="w-4 h-4 text-gray-400 group-hover:text-primary" />
                  </div>
                  <div>
                    <p class="text-[11px] font-bold text-white mb-0.5 truncate max-w-[200px]">
                      {{ job.meta?.title || job.meta?.filename || job.meta?.url || 'Batch Processing' }}
                    </p>
                    <p class="text-[9px] text-gray-600 font-bold uppercase tracking-widest italic-none truncate max-w-[200px]">
                      {{ job.meta?.url || job.meta?.filename || 'Manual Entry' }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="px-2 py-0.5 rounded bg-white/5 text-[9px] font-bold text-gray-500 uppercase tracking-widest italic-none">
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
                <div class="flex items-center gap-2 text-[10px] text-gray-500 font-bold tracking-widest italic-none">
                  <Clock class="w-3 h-3" />
                  {{ job.started_at ? new Date(job.started_at).toLocaleDateString() : 'Pending' }}
                </div>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-3">
                  <button 
                    v-if="job.status === 'finished' || job.status === 'failed'"
                    @click="emit('view-extraction', job)"
                    :class="[
                      'px-3 py-1 bg-white/5 hover:bg-white/10 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all border border-white/5',
                      job.status === 'failed' ? 'text-red-400 hover:text-red-300' : 'text-gray-400 hover:text-white'
                    ]"
                  >
                    {{ job.status === 'failed' ? 'View Error' : 'View Data' }}
                  </button>
                  
                  <!-- Only show delete for finished sources that exist -->
                  <button 
                    v-if="job.status === 'finished' && getJobSource(job)"
                    @click="emit('delete-source', getJobSource(job).id)"
                    class="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-all"
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
  </div>
</template>
