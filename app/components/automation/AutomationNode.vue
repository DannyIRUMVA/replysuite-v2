<script setup lang="ts">
import { CheckCircle2, Circle } from 'lucide-vue-next'

defineProps<{
  title: string
  description?: string
  status: 'pending' | 'active' | 'completed'
  icon: any
  isLast?: boolean
  isFirst?: boolean
}>()
</script>

<template>
  <div class="relative flex flex-col items-center">
    <!-- Top Connector Line -->
    <div 
      v-if="!isFirst" 
      class="w-0.5 h-8 bg-gradient-to-b"
      :class="[
        status === 'pending' ? 'from-white/5 to-white/5' : 
        status === 'active' ? 'from-primary/20 to-primary/50' : 
        'from-primary to-primary'
      ]"
    ></div>

    <!-- Node Card -->
    <div 
      class="w-full max-w-xl group transition-all duration-500"
      :class="[
        status === 'pending' ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'
      ]"
    >
      <div 
        class="relative overflow-hidden glass-card p-6 border transition-all duration-500"
        :class="[
          status === 'active' ? 'bg-primary/[0.03] border-primary/30 shadow-[0_0_30px_-10px_rgba(212,175,55,0.2)]' : 'bg-white/[0.02] border-white/10'
        ]"
      >
        <!-- Background Glow for Active Node -->
        <div 
          v-if="status === 'active'"
          class="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full animate-pulse"
        ></div>

        <div class="flex items-start gap-5 relative z-10">
          <!-- Icon Circle -->
          <div 
            class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500"
            :class="[
              status === 'completed' ? 'bg-primary text-black' : 
              status === 'active' ? 'bg-primary/20 text-primary border border-primary/30' : 
              'bg-white/5 text-gray-500 border border-white/10'
            ]"
          >
            <component :is="icon" class="w-6 h-6" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-4 mb-1">
              <h3 
                class="text-sm font-black uppercase tracking-widest italic-none transition-colors"
                :class="status === 'active' ? 'text-primary' : 'text-white'"
              >
                {{ title }}
              </h3>
              <div class="flex-shrink-0">
                <CheckCircle2 v-if="status === 'completed'" class="w-5 h-5 text-primary" />
                <Circle v-else-if="status === 'active'" class="w-5 h-5 text-primary/50 animate-pulse" />
              </div>
            </div>
            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">
              {{ description }}
            </p>

            <!-- Slot for Node Configuration UI -->
            <div class="mt-2 transition-all duration-300">
              <slot />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Connector Line -->
    <div 
      v-if="!isLast" 
      class="w-0.5 h-8 bg-gradient-to-b"
      :class="[
        status === 'completed' ? 'from-primary to-primary' : 
        status === 'active' ? 'from-primary/50 to-white/5' : 
        'from-white/5 to-white/5'
      ]"
    ></div>
  </div>
</template>

<style scoped>
.glass-card {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
</style>
