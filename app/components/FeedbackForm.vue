<script setup lang="ts">
import { MessageSquare, Send, X, CheckCircle2, Loader2, Star } from 'lucide-vue-next'

const props = defineProps<{
  source: string
}>()

const emit = defineEmits(['close'])

const form = ref({
  rating: 5,
  message: ''
})

const loading = ref(false)
const submitted = ref(false)
const error = ref('')

const submitFeedback = async () => {
  if (!form.value.message) return
  
  loading.value = true
  error.value = ''
  
  try {
    const response = await $fetch('/api/feedback', {
      method: 'POST',
      body: {
        ...form.value,
        source: props.source
      }
    })
    
    if (response.success) {
      submitted.value = true
      setTimeout(() => {
        emit('close')
        submitted.value = false
        form.value = { rating: 5, message: '' }
      }, 3000)
    } else {
      error.value = 'Failed to send feedback. Please try again.'
    }
  } catch (err) {
    error.value = 'Something went wrong. Please try again later.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="glass-card p-8 w-full max-w-md relative overflow-hidden border-white/10 shadow-2xl">
    <button @click="$emit('close')" class="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5">
      <X class="w-5 h-5" />
    </button>

    <div v-if="!submitted" class="space-y-6">
      <div class="flex items-center gap-4 mb-2">
        <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <MessageSquare class="w-6 h-6" />
        </div>
        <div>
          <h3 class="text-xl font-bold text-white tracking-tight">System Feedback</h3>
          <p class="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Direct line to the engineering team</p>
        </div>
      </div>

      <div class="space-y-6">
        <div class="space-y-3 text-center">
          <label class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Rate your experience</label>
          <div class="flex items-center justify-center gap-2">
            <button 
              v-for="i in 5" 
              :key="i"
              @click="form.rating = i"
              class="p-1 transition-all transform hover:scale-125"
            >
              <Star 
                class="w-8 h-8" 
                :class="i <= form.rating ? 'text-primary fill-primary' : 'text-gray-800'"
              />
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Message *</label>
          <textarea 
            v-model="form.message"
            rows="4"
            placeholder="What's on your mind?"
            class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-all resize-none"
          ></textarea>
        </div>
      </div>

      <p v-if="error" class="text-red-500 text-[10px] font-bold uppercase tracking-widest text-center">{{ error }}</p>

      <button 
        @click="submitFeedback"
        :disabled="loading || !form.message"
        class="w-full bg-primary text-black py-4 rounded-xl font-bold tracking-widest text-xs uppercase hover:bg-primary-accent transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
        <Send v-else class="w-4 h-4" />
        {{ loading ? 'Transmitting...' : 'Dispatch Feedback' }}
      </button>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-10 text-center space-y-6">
      <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-bounce">
        <CheckCircle2 class="w-10 h-10" />
      </div>
      <div>
        <h3 class="text-2xl font-bold text-white mb-2 tracking-tight uppercase">Feedback Logged</h3>
        <p class="text-gray-500 text-sm font-medium">Your transmission has been received at HQ. <br /> Thank you for helping us build the future.</p>
      </div>
    </div>
  </div>
</template>
