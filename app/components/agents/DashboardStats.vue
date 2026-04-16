<script setup lang="ts">
import { LucideActivity, Database } from 'lucide-vue-next'

const props = defineProps<{
  chatbot: any
  monthlyUsage: number
  totalTrainings: number
  planSlug: string
  sourcesCount: number
  limits: {
    maxEmbeddingMb: number
    maxTrainingUnits: number
    maxTrainings: number
  }
}>()

// Ability Score Calculation (Knowledge Intelligence Score)
const intelligenceScore = computed(() => {
  if (props.sourcesCount === 0) return 0
  // Base 20 pts per source + linear usage points (max 100)
  const base = props.sourcesCount * 20
  const bonus = Math.floor(props.monthlyUsage / 50)
  return Math.min(100, base + bonus)
})

const intelligenceLabel = computed(() => {
  const score = intelligenceScore.value
  if (score === 0) return 'Dormant'
  if (score < 30) return 'Novice'
  if (score < 60) return 'Intermediate'
  if (score < 90) return 'Expert'
  return 'Superhuman'
})

const intelligenceColor = computed(() => {
  const score = intelligenceScore.value
  if (score < 30) return 'text-orange-500'
  if (score < 60) return 'text-cyan-400'
  if (score < 90) return 'text-primary'
  return 'text-primary shadow-primary'
})

const usagePercent = computed(() => {
  if (!props.chatbot) return 0
  return Math.min(100, (Number(props.chatbot.current_embedding_mb || 0) / props.limits.maxEmbeddingMb) * 100)
})

const trainingPercent = computed(() => Math.min(100, (props.totalTrainings / props.limits.maxTrainings) * 100))
const isOverTrainingLimit = computed(() => props.totalTrainings >= props.limits.maxTrainings)
</script>

<template>
  <div class="space-y-6">
    <!-- Intelligence Meter -->
    <div class="glass-card bg-white/[0.01] relative overflow-hidden group">
      <div class="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl transition-all group-hover:bg-primary/10"></div>
      
      <div class="flex items-center justify-between mb-6 relative z-10">
        <h4 class="text-[11px] font-bold tracking-widest text-gray-500 uppercase italic-none">Ability Level</h4>
        <div :class="['px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-bold uppercase tracking-widest', intelligenceColor]">
          {{ intelligenceLabel }}
        </div>
      </div>

      <div class="flex items-center gap-6 relative z-10">
         <div class="relative w-24 h-24 flex items-center justify-center">
            <svg class="w-full h-full -rotate-90">
              <circle cx="48" cy="48" r="40" fill="transparent" stroke="currentColor" stroke-width="8" class="text-white/5" />
              <circle 
                cx="48" cy="48" r="40" 
                fill="transparent" 
                stroke="currentColor" 
                stroke-width="8" 
                stroke-dasharray="251.2"
                :stroke-dashoffset="251.2 * (1 - intelligenceScore / 100)"
                :class="['transition-all duration-1000', intelligenceColor.replace('text-', 'text-')]" 
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
               <p class="text-xl font-bold text-white">{{ intelligenceScore }}%</p>
            </div>
         </div>
         <div>
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 italic-none">Knowledge Intelligence Score (KIS)</p>
            <p class="text-[9px] text-gray-600 leading-relaxed uppercase tracking-widest italic-none">
               Determines completion, reasoning quality and response accuracy.
            </p>
         </div>
      </div>
    </div>

    <!-- Usage Meter -->
    <div class="glass-card space-y-6">
      <div class="flex items-center justify-between">
        <h4 class="text-[11px] font-bold tracking-widest text-gray-500 uppercase italic-none">Vector Capacity</h4>
        <Database class="w-4 h-4 text-gray-700" />
      </div>
      
      <div class="space-y-4">
        <div class="flex items-end justify-between font-bold italic-none">
          <p class="text-2xl text-white">{{ chatbot?.current_embedding_mb || 0 }}<span class="text-xs text-gray-600 ml-1">MB</span></p>
          <p class="text-[11px] text-gray-500 uppercase tracking-widest italic-none">LIMIT: {{ limits.maxEmbeddingMb }} MB</p>
        </div>
        
        <div class="h-2 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
            class="h-full bg-primary shadow-[0_0_12px_rgba(var(--primary),0.3)] transition-all duration-1000"
            :style="{ width: `${usagePercent}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Training Count Meter -->
    <div class="glass-card space-y-6">
      <div class="flex items-center justify-between">
        <h4 class="text-[11px] font-bold tracking-widest text-gray-500 uppercase italic-none">Session Quota ({{ planSlug }})</h4>
        <LucideActivity class="w-4 h-4 text-gray-700" />
      </div>
      
      <div class="space-y-4">
        <div class="flex items-end justify-between font-bold italic-none">
          <p class="text-2xl text-white">{{ totalTrainings }}<span class="text-xs text-gray-600 ml-1">SESS.</span></p>
          <p class="text-[11px] text-gray-500 uppercase tracking-widest italic-none">LIMIT: {{ limits.maxTrainings }}</p>
        </div>
        
        <div class="h-2 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
            class="h-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.3)] transition-all duration-1000"
            :style="{ width: `${trainingPercent}%` }"
          ></div>
        </div>

        <p class="text-[10px] text-gray-600 leading-relaxed uppercase tracking-widest italic-none">
          {{ isOverTrainingLimit ? 'Quota exceeded. Upgrade to unlock unlimited trainings.' : 'You have remaining quotas for this agent.' }}
        </p>
      </div>
    </div>
  </div>
</template>
