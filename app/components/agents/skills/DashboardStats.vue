<script setup lang="ts">
import { LucideActivity, Plus, Sparkles as LucideSparkles } from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'train-assistant'): void
  (e: 'test-assistant'): void
}>()

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

const chatbotName = computed(() => props.chatbot?.name || 'Assistant')
const chatbotLanguage = computed(() => props.chatbot?.default_language || 'English')

</script>

<template>
  <div class="glass-card relative overflow-hidden !rounded-2xl !p-0">
    <div class="absolute -right-10 -top-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl"></div>
    
    <div class="grid grid-cols-1 divide-y divide-foreground/5 md:grid-cols-2 md:divide-x md:divide-y-0">
      <!-- Intelligence Meter -->
      <div class="relative space-y-3 p-4 sm:p-5">
        <div class="relative z-10 flex items-center justify-between gap-3">
          <h4 class="text-[10px] font-bold tracking-widest text-foreground/40 uppercase italic-none">Ability Level</h4>
          <div :class="['rounded-md bg-foreground/5 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest', intelligenceColor]">
            {{ intelligenceLabel }}
          </div>
        </div>

        <div class="relative z-10 rounded-xl border border-foreground/5 bg-foreground/[0.025] p-3">
          <p class="truncate text-sm font-bold text-foreground italic-none">{{ chatbotName }}</p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <span class="rounded-lg bg-primary/10 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-primary italic-none">
              {{ chatbotLanguage }}
            </span>
            <span class="text-[8px] font-bold uppercase tracking-widest text-foreground/30 italic-none">Primary language</span>
          </div>
        </div>

        <div class="relative z-10 flex items-center gap-4">
          <div class="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg class="h-full w-full -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
              <circle cx="48" cy="48" r="39" fill="transparent" stroke="currentColor" stroke-width="7" class="text-foreground/5" />
              <circle 
                cx="48" cy="48" r="39" 
                fill="transparent" 
                stroke="currentColor" 
                stroke-width="7" 
                stroke-dasharray="245"
                :stroke-dashoffset="245 * (1 - intelligenceScore / 100)"
                :class="['transition-all duration-1000', intelligenceColor]" 
              />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <p class="text-sm font-bold text-foreground">{{ intelligenceScore }}%</p>
            </div>
          </div>
          <div class="min-w-0">
            <p class="mb-1 text-[9px] font-bold uppercase tracking-widest text-foreground/40 italic-none">Knowledge Score</p>
            <p class="line-clamp-2 text-[9px] uppercase leading-relaxed tracking-widest text-foreground/30 italic-none">
              Based on trained knowledge coverage and response readiness.
            </p>
          </div>
        </div>

        <div class="relative z-10 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button @click="emit('train-assistant')"
            class="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-black shadow-lg shadow-primary/10 transition-all hover:bg-primary-accent">
            <Plus class="h-4 w-4" />
            <span class="text-[10px] font-bold tracking-widest uppercase italic-none">Train Assistant</span>
          </button>

          <button @click="emit('test-assistant')"
            class="group flex w-full items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-2.5 shadow-lg transition-all hover:bg-primary hover:text-black">
            <LucideSparkles class="h-4 w-4 text-primary group-hover:text-black" />
            <span class="text-[10px] font-bold tracking-widest uppercase italic-none">Test Assistant</span>
          </button>
        </div>
      </div>

      <!-- Vector Usage & Replies -->
      <div class="space-y-5 p-5 sm:p-6">
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

    </div>
  </div>
</template>
