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
          class="absolute inset-0 bg-black/80 backdrop-blur-md"
          @click="handleCancel"
        />
        
        <!-- Modal -->
        <div class="relative w-full max-w-md glass-card bg-[#0a0a0a] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
          <div class="p-8">
            <div class="flex items-center gap-4 mb-6">
              <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <AlertCircle class="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 class="text-sm font-black uppercase tracking-widest text-white">
                  {{ confirmRequest.title || 'Confirm Action' }}
                </h3>
                <p class="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  Verification Required
                </p>
              </div>
            </div>

            <p class="text-xs font-medium text-gray-300 leading-relaxed mb-8">
              {{ confirmRequest.message }}
            </p>

            <div class="flex gap-3">
              <button 
                @click="handleCancel"
                class="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border border-white/5"
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
            class="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-xl transition-all text-gray-500 hover:text-white"
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
