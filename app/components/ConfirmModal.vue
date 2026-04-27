<script setup lang="ts">
import { useNotify } from '~/composables/useNotify'
import { AlertCircle, X } from 'lucide-vue-next'

const { confirmRequest } = useNotify()

const handleConfirm = () => {
  if (confirmRequest.value) {
    confirmRequest.value.resolve(true)
  }
}

const handleCancel = () => {
  if (confirmRequest.value) {
    confirmRequest.value.resolve(false)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="confirmRequest" class="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div 
          class="absolute inset-0 bg-background/80 backdrop-blur-md"
          @click="handleCancel"
        />
        
        <!-- Modal -->
        <div class="relative w-full max-w-md glass-card bg-background-card border border-foreground/10 rounded-[32px] overflow-hidden shadow-2xl">
          <div class="p-8">
            <div class="flex items-center gap-4 mb-6">
              <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <AlertCircle class="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 class="text-sm font-black uppercase tracking-widest text-foreground">
                  {{ confirmRequest.title || 'Confirm Action' }}
                </h3>
                <p class="text-[10px] font-bold tracking-widest text-foreground/50 uppercase">
                  Verification Required
                </p>
              </div>
            </div>

            <p class="text-xs font-medium text-foreground/70 leading-relaxed mb-8">
              {{ confirmRequest.message }}
            </p>

            <div class="flex gap-3">
              <button 
                @click="handleCancel"
                class="flex-1 py-4 bg-foreground/5 hover:bg-foreground/10 text-foreground text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border border-foreground/5"
              >
                Cancel
              </button>
              <button 
                @click="handleConfirm"
                class="flex-1 py-4 bg-primary hover:bg-primary/90 text-black text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-primary/20"
              >
                Confirm
              </button>
            </div>
          </div>
          
          <button 
            @click="handleCancel"
            class="absolute top-6 right-6 p-2 hover:bg-foreground/5 rounded-xl transition-all text-foreground/50 hover:text-foreground"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.glass-card {
  box-shadow: 0 0 80px rgba(0,0,0,0.8);
}
</style>
