<script setup lang="ts">
import { Bot, Sparkles as LucideSparkles } from 'lucide-vue-next'

defineProps<{
  show: boolean
  data: { title: string, content: string } | null
}>()

defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="show && data" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div class="glass-card w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col p-0 border-white/10 shadow-2xl">
        <!-- Modal Header -->
        <div class="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-primary/10">
              <Bot class="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 class="font-bold text-white">{{ data.title }}</h3>
              <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 italic-none">Extraction Insight</p>
            </div>
          </div>
          <button @click="$emit('close')" class="text-gray-500 hover:text-white transition-colors">
            <span class="text-xs font-bold uppercase tracking-widest">Close</span>
          </button>
        </div>

        <!-- Modal Content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <LucideSparkles class="w-3 h-3 text-primary" />
              <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic-none">Processed Knowledge</h4>
            </div>
            <div class="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] leading-relaxed text-gray-300 whitespace-pre-wrap">
              {{ data.content }}
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="p-4 border-t border-white/5 bg-white/[0.01] flex justify-end">
          <button 
            @click="$emit('close')"
            class="px-6 py-2 bg-primary text-black text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(var(--primary),0.2)]"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
