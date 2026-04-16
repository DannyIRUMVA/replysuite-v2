<script setup lang="ts">
import { Send, Bot, User, Loader2, Sparkles, X } from 'lucide-vue-next'

const route = useRoute()
const chatbotId = route.params.id as string

const messages = ref<{ role: 'user' | 'assistant', content: string }[]>([
  { role: 'assistant', content: 'Hello! How can I help you today?' }
])
const input = ref('')
const chatbotName = ref('AI Assistant')
const isLoading = ref(false)
const container = ref<HTMLElement | null>(null)

const minimize = () => {
  if (window.parent) {
    window.parent.postMessage({ type: 'replysuite-minimize' }, '*')
  }
}

// Auto-scroll logic
const scrollToBottom = () => {
  nextTick(() => {
    if (container.value) {
      container.value.scrollTop = container.value.scrollHeight
    }
  })
}

const sendMessage = async () => {
  if (!input.value.trim() || isLoading.value) return

  const userMsg = input.value
  messages.value.push({ role: 'user', content: userMsg })
  input.value = ''
  isLoading.value = true
  scrollToBottom()

  try {
    const res = await $fetch('/api/public/chat', {
      method: 'POST',
      body: { chatbotId, message: userMsg }
    })
    
    if (res.success) {
      messages.value.push({ role: 'assistant', content: res.response })
    }
  } catch (err: any) {
    messages.value.push({ 
      role: 'assistant', 
      content: 'I apologize, but I encountered an error. Please try again later.' 
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

// Fetch chatbot info for name
onMounted(async () => {
  try {
    const res = await $fetch<{ success: boolean; name: string }>(`/api/public/config/${chatbotId}`)
    if (res.success) {
      chatbotName.value = res.name
    }
  } catch (e) {
    console.error('Failed to load chatbot config')
  }
})

// Prevent standard layout
definePageMeta({
  layout: false
})
</script>

<template>
  <div class="h-screen flex flex-col bg-[#0a0a0a] text-white font-sans selection:bg-primary/30 overflow-hidden border border-white/5 shadow-2xl">
    <!-- Header -->
    <header class="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
          <Bot class="w-5 h-5" />
        </div>
        <div>
          <h1 class="text-xs font-black uppercase tracking-widest text-white leading-tight">{{ chatbotName }}</h1>
          <div class="flex items-center gap-1.5">
            <div class="w-1 h-1 rounded-full bg-primary animate-pulse"></div>
            <span class="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Online</span>
          </div>
        </div>
      </div>
      
      <button 
        @click="minimize" 
        class="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all"
        title="Minimize Chat"
      >
        <X class="w-4 h-4" />
      </button>
    </header>

    <!-- Message Area -->
    <main 
      ref="container"
      class="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide"
    >
      <div 
        v-for="(msg, idx) in messages" 
        :key="idx"
        :class="[
          'flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300',
          msg.role === 'user' ? 'flex-row-reverse' : ''
        ]"
      >
        <div 
          :class="[
            'w-8 h-8 rounded-lg shrink-0 flex items-center justify-center',
            msg.role === 'user' ? 'bg-white/5 text-gray-400' : 'bg-primary/10 text-primary'
          ]"
        >
          <User v-if="msg.role === 'user'" class="w-4 h-4" />
          <Bot v-else class="w-4 h-4" />
        </div>
        
        <div 
          :class="[
            'max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed font-medium',
            msg.role === 'user' ? 'bg-white/5 text-gray-200 rounded-tr-none' : 'bg-white/[0.02] border border-white/5 text-gray-100 rounded-tl-none'
          ]"
        >
          {{ msg.content }}
        </div>
      </div>

      <div v-if="isLoading" class="flex gap-4 animate-pulse">
        <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Loader2 class="w-4 h-4 animate-spin" />
        </div>
        <div class="bg-white/[0.02] border border-white/5 w-24 h-8 rounded-2xl rounded-tl-none"></div>
      </div>
    </main>

    <!-- Footer Input -->
    <footer class="p-6 border-t border-white/5 bg-white/[0.02] shrink-0">
      <form @submit.prevent="sendMessage" class="relative group">
        <div class="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-cyan-400/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500 pointer-events-none"></div>
        <input 
          v-model="input"
          type="text"
          placeholder="Type a message..."
          class="widget-input w-full bg-[#111] border border-white/10 rounded-2xl px-5 py-4 text-xs font-medium placeholder:text-gray-700 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all text-white pr-14"
        />
        <button 
          type="submit"
          :disabled="!input.trim() || isLoading"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-primary text-black hover:bg-primary/90 transition-all disabled:opacity-30 disabled:grayscale"
        >
          <Send class="w-4 h-4" />
        </button>
      </form>
      <div class="mt-4 flex items-center justify-center gap-1.5 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-default">
         <Sparkles class="w-3 h-3 text-primary" />
         <span class="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Powered by ReplySuite</span>
      </div>
    </footer>
  </div>
</template>

<style>
/* Hide scrollbar for Chrome, Safari and Opera */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.scrollbar-hide {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

body {
  margin: 0;
  padding: 0;
  background-color: #0a0a0a;
}

.widget-input {
  color: white !important;
  -webkit-text-fill-color: white !important;
}

/* Force hide Nuxt DevTools elements in the widget if they exist */
#nuxt-devtools-container, 
[id*="nuxt-devtools"],
.nuxt-devtools-button {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
</style>
