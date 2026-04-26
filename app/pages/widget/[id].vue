<script setup lang="ts">
useHead({ title: 'Chat Widget | ReplySuite' })

import { Send, Bot, User, Loader2, Sparkles, X, MessageSquare, Zap, Info as HelpCircle, Maximize2, Minimize2, RotateCcw, Paperclip, Smile } from 'lucide-vue-next'
import { marked } from 'marked'


definePageMeta({ layout: false })

import xss from 'xss'

const renderMarkdown = (text: string) => {
  if (!text) return ''
  try {
    // Force standard sync behavior
    const html = marked.parse(text, { breaks: true, gfm: true })
    // If for some reason it returns a promise (it shouldn't here), return original text
    if (typeof html !== 'string') return text
    return xss(html)
  } catch (e) {
    console.error('Markdown error:', e)
    return text
  }
}

const route = useRoute()
const chatbotId = route.params.id as string

// ── Design config (loaded from API) ──────────────────────────
const design = ref({
  name: 'AI Assistant',
  primaryColor: '#D4AF37',
  secondaryColor: '#0a0a0a',
  bubbleStyle: 'rounded',
  welcomeMessage: 'Hello! How can I help you today?',
  planSlug: 'starter',
  removeBranding: false,
  aiDisclosure: true,
  chatIcon: 'Bot',
  chatIconColor: ''
})
const isExpanded = ref(false)
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
  if (window.parent) {
    window.parent.postMessage({ 
      type: 'replysuite-resize', 
      expanded: isExpanded.value 
    }, '*')
  }
}

const isPremium = computed(() => design.value.planSlug !== 'starter')

// Computed bubble radius
const bubbleRadius = computed(() => {
  if (design.value.bubbleStyle === 'pill') return '9999px'
  if (design.value.bubbleStyle === 'sharp') return '6px'
  return '18px'
})

const chatIconComponent = computed(() => {
  const icons: Record<string, any> = {
    'MessageSquare': MessageSquare,
    'Bot': Bot,
    'Sparkles': Sparkles,
    'Zap': Zap,
    'HelpCircle': HelpCircle
  }
  return icons[design.value.chatIcon] || Bot
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

const clearChat = () => {
  if (confirm('Are you sure you want to clear this conversation?')) {
    messages.value = []
  }
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
      aiDisclosure: boolean
      removeBranding: boolean
      planSlug: string
      chatIcon: string
      chatIconColor: string
    }>(`/api/public/config/${chatbotId}`)

    if (res.success) {
      design.value = {
        name: res.name,
        primaryColor: res.primaryColor || '#D4AF37',
        secondaryColor: res.secondaryColor || '#0a0a0a',
        bubbleStyle: res.bubbleStyle || 'rounded',
        welcomeMessage: res.welcomeMessage || 'Hello! How can I help you today?',
        planSlug: res.planSlug || 'starter',
        removeBranding: res.removeBranding || false,
        aiDisclosure: res.aiDisclosure ?? true,
        chatIcon: res.chatIcon || 'Bot',
        chatIconColor: res.chatIconColor || ''
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
    class="h-screen flex flex-col text-white font-sans overflow-hidden border border-white/5 shadow-2xl relative"
    :style="{ backgroundColor: design.secondaryColor }"
  >
    <!-- Premium Backdrop Glow (Silver/Gold Only) -->
    <div 
      v-if="isPremium"
      class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 blur-[100px] opacity-20 pointer-events-none"
      :style="{ background: `radial-gradient(circle, ${design.primaryColor}, transparent)` }"
    />

    <!-- Header -->
    <header
      class="p-5 flex items-center justify-between shrink-0 border-b backdrop-blur-md z-10"
      :style="{
        backgroundColor: isPremium ? design.primaryColor + '08' : design.primaryColor + '15',
        borderColor: design.primaryColor + '20',
      }"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-105"
          :style="{ 
            backgroundColor: design.primaryColor + '20', 
            color: design.chatIconColor || design.primaryColor,
            border: `1px solid ${design.primaryColor}30`
          }"
        >
          <component :is="chatIconComponent" class="w-5 h-5" />
        </div>
        <div>
          <h1 class="text-xs font-black uppercase tracking-widest text-white leading-tight">
            {{ design.name }}
          </h1>
          <div class="flex items-center gap-1.5 mt-0.5">
            <div class="w-1.5 h-1.5 rounded-full animate-pulse" :style="{ backgroundColor: design.primaryColor }" />
            <span class="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Active Now</span>
            <span v-if="design.planSlug === 'gold'" class="ml-2 text-[8px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">PREMIUM</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <button
          @click="clearChat"
          class="p-2.5 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all active:scale-90"
          title="Reset Conversation"
        >
          <RotateCcw class="w-4 h-4" />
        </button>
        <button
          @click="toggleExpand"
          class="p-2.5 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all active:scale-90"
          :title="isExpanded ? 'Shrink' : 'Expand'"
        >
          <component :is="isExpanded ? Minimize2 : Maximize2" class="w-4 h-4" />
        </button>
        <button
          @click="minimize"
          class="p-2.5 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all active:scale-90"
          title="Minimize Chat"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </header>

    <!-- Messages -->
    <main ref="container" class="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide relative z-0">
      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        :class="[
          'flex gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both',
          msg.role === 'user' ? 'flex-row-reverse' : '',
        ]"
      >
        <!-- Avatar -->
        <div
          class="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border shadow-sm"
          :style="msg.role === 'user'
            ? { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#888' }
            : { backgroundColor: design.primaryColor + '15', borderColor: design.primaryColor + '25', color: design.primaryColor }"
        >
          <User v-if="msg.role === 'user'" class="w-4 h-4" />
          <component :is="chatIconComponent" v-else class="w-4 h-4" :style="{ color: design.chatIconColor || design.primaryColor }" />
        </div>

        <!-- Bubble -->
        <div
          class="max-w-[85%] px-4 py-3 text-[13px] leading-relaxed shadow-sm transition-all hover:shadow-md prose-sm prose-p:my-1 prose-ul:my-1 prose-li:ml-4 prose-li:list-disc widget-markdown"
          :style="msg.role === 'user'
            ? { 
                backgroundColor: design.primaryColor, 
                color: '#000', 
                borderRadius: bubbleRadius, 
                fontWeight: '700',
                boxShadow: `0 4px 15px ${design.primaryColor}30`
              }
            : { 
                backgroundColor: isPremium ? 'rgba(255,255,255,0.05)' : design.primaryColor + '12', 
                border: `1px solid ${isPremium ? 'rgba(255,255,255,0.1)' : design.primaryColor + '20'}`, 
                color: '#efefef', 
                borderRadius: bubbleRadius,
                backdropFilter: isPremium ? 'blur(12px)' : 'none'
              }"
        >
          <div v-html="renderMarkdown(msg.content)"></div>
          <div v-if="msg.role === 'assistant' && design.aiDisclosure && idx === messages.length - 1" class="mt-2 pt-2 border-t border-white/5 flex items-center gap-1 opacity-40 text-[9px] uppercase tracking-tighter font-bold">
            <Sparkles class="w-2 h-2" />
            AI Generated Response
          </div>
        </div>
      </div>

      <!-- Typing indicator -->
      <div v-if="isLoading" class="flex gap-3 animate-pulse">
        <div
          class="w-8 h-8 rounded-xl flex items-center justify-center border"
          :style="{ backgroundColor: design.primaryColor + '15', borderColor: design.primaryColor + '25', color: design.primaryColor }"
        >
          <Loader2 class="w-4 h-4 animate-spin" />
        </div>
        <div
          class="w-24 h-10 border border-dashed opacity-50"
          :style="{ borderColor: design.primaryColor + '30', borderRadius: bubbleRadius }"
        />
      </div>
    </main>

    <!-- Input Footer -->
    <footer
      class="p-6 shrink-0 border-t backdrop-blur-xl z-10"
      :style="{ backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.05)' }"
    >
      <form @submit.prevent="sendMessage" class="relative group">
        <div
          class="absolute -inset-0.5 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500 pointer-events-none"
          :style="{ background: `linear-gradient(90deg, ${design.primaryColor}30, ${design.primaryColor}10)` }"
        />
        <div class="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-600">
          <button type="button" class="hover:text-primary transition-colors p-1"><Paperclip class="w-4 h-4" /></button>
          <button type="button" class="hover:text-primary transition-colors p-1"><Smile class="w-4 h-4" /></button>
        </div>
        <input
          v-model="input"
          type="text"
          placeholder="Type your message..."
          class="widget-input w-full border rounded-2xl px-5 py-4 pl-20 pr-14 text-sm font-medium placeholder:text-gray-600 focus:outline-none transition-all text-white"
          :style="{
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderColor: 'rgba(255,255,255,0.08)',
          }"
        />
        <button
          type="submit"
          :disabled="!input.trim() || isLoading"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all disabled:opacity-20 disabled:grayscale hover:opacity-90 active:scale-95 shadow-lg"
          :style="{ backgroundColor: design.primaryColor }"
        >
          <Send class="w-4 h-4 text-black" />
        </button>
      </form>

      <!-- Branding (Hidden for Silver/Gold) -->
      <div v-if="!design.removeBranding" class="mt-4 flex items-center justify-center gap-1.5 opacity-20 hover:opacity-50 transition-all cursor-default">
        <Sparkles class="w-3 h-3" :style="{ color: design.primaryColor }" />
        <span class="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Powered by ReplySuite</span>
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

/* Markdown Styles for Chat Bubbles */
.widget-markdown p {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}
.widget-markdown p:first-child {
  margin-top: 0;
}
.widget-markdown p:last-child {
  margin-bottom: 0;
}
.widget-markdown ul {
  list-style-type: disc;
  margin-left: 1.25rem;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}
.widget-markdown ol {
  list-style-type: decimal;
  margin-left: 1.25rem;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}
.widget-markdown li {
  margin-top: 0.125rem;
}
.widget-markdown strong {
  font-weight: 700;
}
.widget-markdown a {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.widget-markdown :deep(h1) { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; }
.widget-markdown :deep(h2) { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
.widget-markdown :deep(p) { margin-bottom: 0.5rem; }
.widget-markdown :deep(strong) { font-weight: 800; color: white; }
.widget-markdown :deep(ul) { list-style-type: disc; margin-left: 1.25rem; margin-bottom: 0.5rem; }
.widget-markdown :deep(ol) { list-style-type: decimal; margin-left: 1.25rem; margin-bottom: 0.5rem; }
.widget-markdown :deep(code) { background-color: rgba(255,255,255,0.1); padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: monospace; }
</style>
