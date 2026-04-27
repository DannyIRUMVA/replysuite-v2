<script setup lang="ts">
import { useNotify } from '~/composables/useNotify'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-vue-next'

const { toasts, removeToast } = useNotify()

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle
}

const colors = {
  success: 'text-primary',
  error: 'text-red-500',
  info: 'text-blue-400',
  warning: 'text-amber-500'
}
</script>

<template>
  <div class="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
    <TransitionGroup name="toast">
      <div 
        v-for="toast in toasts" 
        :key="toast.id"
        class="pointer-events-auto group min-w-[320px] max-w-[450px] glass-card p-4 flex items-start gap-4 shadow-2xl relative overflow-hidden backdrop-blur-2xl bg-background/95 border-foreground/10"
      >
        <div class="flex-shrink-0 mt-1">
          <component :is="icons[toast.type]" :class="['w-5 h-5', colors[toast.type]]" />
        </div>
        
        <div class="flex-grow pr-6">
          <p class="text-[11px] font-bold tracking-widest text-foreground/40 uppercase mb-0.5">
            {{ toast.type }}
          </p>
          <p class="text-xs font-medium text-foreground/90 leading-relaxed">
            {{ toast.message }}
          </p>
        </div>

        <button 
          @click="removeToast(toast.id)"
          class="absolute top-4 right-4 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-foreground/5 transition-all"
        >
          <X class="w-3.5 h-3.5 text-foreground/40" />
        </button>

        <!-- Progress bar decorator -->
        <div 
          class="absolute bottom-0 left-0 h-[2px] bg-primary/30 transition-all duration-linear"
          :style="{ width: '100%', transition: `width ${toast.duration || 4000}ms linear` }"
          :class="{ 'opacity-0': !toast.duration }"
        />
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(20px) scale(0.98);
}

.toast-move {
  transition: transform 0.4s ease;
}

.glass-card {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}
</style>
