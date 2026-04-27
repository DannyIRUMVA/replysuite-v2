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
    maxReplies: number
  }
}>()

// Ability Score Calculation (Knowledge Intelligence Score)
const intelligenceScore = computed(() => {
  const count = props.chatbot?.embeddings_count || 0
  if (count === 0) return 0
  // Dynamic scale: 200 embeddings = 100% capacity for baseline expert
  // We use a non-linear feel to make it more rewarding
  return Math.min(100, Math.floor(Math.sqrt(count / 200) * 100))
})

const intelligenceLabel = computed(() => {
  const score = intelligenceScore.value
  if (score === 0) return 'Dormant'
  if (score < 25) return 'Learning'
  if (score < 50) return 'Capable'
  if (score < 75) return 'Advanced'
  if (score < 95) return 'Expert'
  return 'Superhuman'
})

const intelligenceColor = computed(() => {
  const score = intelligenceScore.value
  if (score < 25) return 'text-foreground/40'
  if (score < 50) return 'text-cyan-500'
  if (score < 75) return 'text-primary'
  if (score < 95) return 'text-primary-accent'
  return 'text-foreground shadow-[0_0_15px_rgba(var(--foreground),0.5)]'
})

const usagePercent = computed(() => {
  if (!props.chatbot) return 0
  return Math.min(100, (Number(props.chatbot.current_embedding_mb || 0) / props.limits.maxEmbeddingMb) * 100)
})

const trainingPercent = computed(() => Math.min(100, (props.totalTrainings / props.limits.maxTrainings) * 100))
const isOverTrainingLimit = computed(() => props.totalTrainings >= props.limits.maxTrainings)
</script>

<template>
  <div class="glass-card !p-0 overflow-hidden relative">
    <div class="absolute -right-10 -top-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl"></div>
    
    <div class="divide-y divide-foreground/5">
      <!-- Intelligence Meter -->
      <div class="p-6 sm:p-8 space-y-6 relative group">
        <div class="flex items-center justify-between relative z-10">
          <h4 class="text-[11px] font-bold tracking-widest text-foreground/40 uppercase italic-none">Ability Level</h4>
          <div :class="['px-2 py-0.5 rounded-md bg-foreground/5 text-[9px] font-bold uppercase tracking-widest', intelligenceColor]">
            {{ intelligenceLabel }}
          </div>
        </div>

        <div class="flex flex-col 2xl:flex-row items-center 2xl:items-start gap-4 2xl:gap-6 relative z-10">
            <div class="relative w-24 h-24 flex items-center justify-center shrink-0">
              <svg class="w-full h-full -rotate-90">
                <circle cx="48" cy="48" r="40" fill="transparent" stroke="currentColor" stroke-width="8" class="text-foreground/5" />
                <circle 
                  cx="48" cy="48" r="40" 
                  fill="transparent" 
                  stroke="currentColor" 
                  stroke-width="8" 
                  stroke-dasharray="251.2"
                  :stroke-dashoffset="251.2 * (1 - intelligenceScore / 100)"
                  :class="['transition-all duration-1000', intelligenceColor]" 
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                 <p class="text-xl font-bold text-foreground">{{ intelligenceScore }}%</p>
              </div>
           </div>
           <div class="text-center 2xl:text-left mt-2 2xl:mt-0">
              <p class="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-1 italic-none">Knowledge Intelligence Score (KIS)</p>
              <p class="text-[9px] text-foreground/30 leading-relaxed uppercase tracking-widest italic-none">
                 Determines completion, reasoning quality and response accuracy.
              </p>
           </div>
        </div>
      </div>

      <!-- Vector Usage & Replies -->
      <div class="p-6 sm:p-8 space-y-6">
        <div class="flex items-center justify-between">
          <h4 class="text-[11px] font-bold tracking-widest text-foreground/40 uppercase italic-none">Vector Output Capacity</h4>
          <LucideActivity class="w-4 h-4 text-foreground/30" />
        </div>
        
        <div class="space-y-4">
          <div class="flex items-end justify-between font-bold italic-none">
            <p class="text-2xl text-foreground">{{ monthlyUsage }} <span class="text-xs text-foreground/30 ml-1">USED REPLIES</span></p>
            <p class="text-[11px] text-foreground/40 uppercase tracking-widest italic-none">LIMIT: {{ limits.maxReplies === -1 ? '∞' : limits.maxReplies }}</p>
          </div>
          
          <div class="h-2 w-full bg-foreground/5 rounded-full overflow-hidden">
            <div 
              class="h-full bg-primary shadow-[0_0_12px_rgba(var(--primary),0.3)] transition-all duration-1000"
              :style="{ width: limits.maxReplies === -1 ? '0%' : `${Math.min(100, (monthlyUsage / (limits.maxReplies || 1)) * 100)}%` }"
            ></div>
          </div>
        </div>
      </div>


      <!-- Training Intelligence Sessions -->
      <div class="p-6 sm:p-8 space-y-6">
        <div class="flex items-center justify-between">
          <h4 class="text-[11px] font-bold tracking-widest text-foreground/40 uppercase italic-none">Training Sessions ({{ planSlug }})</h4>
          <Database class="w-4 h-4 text-foreground/30" />
        </div>
        
        <div class="space-y-4">
          <div class="flex items-end justify-between font-bold italic-none">
            <p class="text-2xl text-foreground">{{ totalTrainings }}<span class="text-xs text-foreground/30 ml-1">SESSIONS</span></p>
            <p class="text-[11px] text-foreground/40 uppercase tracking-widest italic-none">LIMIT: {{ limits.maxTrainings === -1 ? '∞' : limits.maxTrainings }}</p>
          </div>
          
          <div class="h-2 w-full bg-foreground/5 rounded-full overflow-hidden">
            <div 
              class="h-full bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.3)] transition-all duration-1000"
              :style="{ width: limits.maxTrainings === -1 ? '0%' : `${trainingPercent}%` }"
            ></div>
          </div>

          <p class="text-[10px] text-foreground/30 leading-relaxed uppercase tracking-widest italic-none">
            {{ isOverTrainingLimit ? 'Quota exceeded. Upgrade to unlock unlimited trainings.' : 'Active learning sessions for the current month.' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
