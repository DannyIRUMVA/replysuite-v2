<script setup lang="ts">
import { Send, Bot, User, Loader2, Sparkles, X } from 'lucide-vue-next'

definePageMeta({ layout: false })

const route = useRoute()
const chatbotId = route.params.id as string

// ── Design config (loaded from API) ──────────────────────────
const design = ref({
  name: 'AI Assistant',
  primaryColor: '#D4AF37',
  secondaryColor: '#0a0a0a',
  bubbleStyle: 'rounded',
  welcomeMessage: 'Hello! How can I help you today?',
})

// Computed bubble radius
const bubbleRadius = computed(() => {
  if (design.value.bubbleStyle === 'pill') return '9999px'
  if (design.value.bubbleStyle === 'sharp') return '6px'
  return '18px'
})

// Inject CSS variables into :root when design loads
const applyDesignVars = () => {
  const root = document.documentElement
  root.style.setProperty('--widget-primary', design.value.primaryColor)
  root.style.setProperty('--widget-bg', design.value.secondaryColor)
}

// ── Messages ──────────────────────────────────────────────────
const messages = ref<{ role: 'user' | 'assistant'; content: string }[]>([])
const input = ref('')
const isLoading = ref(false)
const container = ref<HTMLElement | null>(null)

const scrollToBottom = () => {
  nextTick(() => {
    if (container.value) container.value.scrollTop = container.value.scrollHeight
  })
}

const minimize = () => {
  if (window.parent) window.parent.postMessage({ type: 'replysuite-minimize' }, '*')
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
      body: { chatbotId, message: userMsg },
    })
    if (typeof res === 'object' && res && 'success' in res && res.success) {
      messages.value.push({ role: 'assistant', content: (res as any).response })
    }
  } catch {
    messages.value.push({
      role: 'assistant',
      content: 'I apologize, but I encountered an error. Please try again later.',
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

// Load chatbot config (name + design)
onMounted(async () => {
  try {
    const res = await $fetch<{
      success: boolean
      name: string
      primaryColor: string
      secondaryColor: string
      bubbleStyle: string
      widgetPosition: string
      welcomeMessage: string
    }>(`/api/public/config/${chatbotId}`)

    if (res.success) {
      design.value = {
        name: res.name,
        primaryColor: res.primaryColor || '#D4AF37',
        secondaryColor: res.secondaryColor || '#0a0a0a',
        bubbleStyle: res.bubbleStyle || 'rounded',
        welcomeMessage: res.welcomeMessage || 'Hello! How can I help you today?',
      }
      applyDesignVars()
      // Set welcome message as the first bot message
      messages.value = [{ role: 'assistant', content: design.value.welcomeMessage }]
    }
  } catch (e) {
    console.error('Failed to load chatbot config')
    messages.value = [{ role: 'assistant', content: design.value.welcomeMessage }]
  }
})
</script>

<template>
  <div
    class="h-screen flex flex-col text-white font-sans overflow-hidden border border-white/5 shadow-2xl"
    :style="{ backgroundColor: design.secondaryColor }"
  >
    <!-- Header -->
    <header
      class="p-5 flex items-center justify-between shrink-0 border-b"
      :style="{
        backgroundColor: design.primaryColor + '15',
        borderColor: design.primaryColor + '30',
      }"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
          :style="{ backgroundColor: design.primaryColor + '25', color: design.primaryColor }"
        >
          <Bot class="w-5 h-5" />
        </div>
        <div>
          <h1 class="text-xs font-extrabold uppercase tracking-widest text-white leading-tight">
            {{ design.name }}
          </h1>
          <div class="flex items-center gap-1.5 mt-0.5">
            <div class="w-1 h-1 rounded-full animate-pulse" :style="{ backgroundColor: design.primaryColor }" />
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

    <!-- Messages -->
    <main ref="container" class="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide">
      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        :class="[
          'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
          msg.role === 'user' ? 'flex-row-reverse' : '',
        ]"
      >
        <!-- Avatar -->
        <div
          class="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center"
          :style="msg.role === 'user'
            ? 'background: rgba(255,255,255,0.05); color: #aaa'
            : `background: ${design.primaryColor}25; color: ${design.primaryColor}`"
        >
          <User v-if="msg.role === 'user'" class="w-4 h-4" />
          <Bot v-else class="w-4 h-4" />
        </div>

        <!-- Bubble -->
        <div
          class="max-w-[85%] px-4 py-3 text-xs leading-relaxed font-medium"
          :style="msg.role === 'user'
            ? { backgroundColor: design.primaryColor, color: '#000', borderRadius: bubbleRadius, fontWeight: '700' }
            : { backgroundColor: design.primaryColor + '18', border: `1px solid ${design.primaryColor}30`, color: '#e5e5e5', borderRadius: bubbleRadius }"
        >
          {{ msg.content }}
        </div>
      </div>

      <!-- Typing indicator -->
      <div v-if="isLoading" class="flex gap-3 animate-pulse">
        <div
          class="w-8 h-8 rounded-xl flex items-center justify-center"
          :style="{ backgroundColor: design.primaryColor + '25', color: design.primaryColor }"
        >
          <Loader2 class="w-4 h-4 animate-spin" />
        </div>
        <div
          class="w-20 h-8"
          :style="{ backgroundColor: design.primaryColor + '18', borderRadius: bubbleRadius }"
        />
      </div>
    </main>

    <!-- Input Footer -->
    <footer
      class="p-5 shrink-0 border-t"
      :style="{ backgroundColor: design.primaryColor + '08', borderColor: design.primaryColor + '20' }"
    >
      <form @submit.prevent="sendMessage" class="relative group">
        <div
          class="absolute -inset-0.5 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500 pointer-events-none"
          :style="{ background: `linear-gradient(90deg, ${design.primaryColor}40, ${design.primaryColor}20)` }"
        />
        <input
          v-model="input"
          type="text"
          placeholder="Type a message..."
          class="widget-input w-full border rounded-2xl px-5 py-4 text-xs font-medium placeholder:text-gray-700 focus:outline-none transition-all text-white pr-14"
          :style="{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderColor: design.primaryColor + '30',
          }"
        />
        <button
          type="submit"
          :disabled="!input.trim() || isLoading"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all disabled:opacity-30 disabled:grayscale hover:opacity-90 active:scale-95"
          :style="{ backgroundColor: design.primaryColor }"
        >
          <Send class="w-4 h-4 text-black" />
        </button>
      </form>

      <div class="mt-3 flex items-center justify-center gap-1.5 opacity-30 hover:opacity-70 transition-all">
        <Sparkles class="w-3 h-3" :style="{ color: design.primaryColor }" />
        <span class="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">Powered by ReplySuite</span>
      </div>
    </footer>
  </div>
</template>

<style>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
body { margin: 0; padding: 0; }
.widget-input { color: white !important; -webkit-text-fill-color: white !important; }
#nuxt-devtools-container, [id*="nuxt-devtools"], .nuxt-devtools-button {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
</style>
