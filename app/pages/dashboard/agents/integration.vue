<script setup lang="ts">
import { Copy, Check, Code2, Globe, ShieldCheck, Terminal, Bot, ChevronDown, Loader2 } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { isVerified, userId } = useAuth()
const supabase = useSupabaseClient()

// State
const chatbots = ref<any[]>([])
const selectedChatbotId = ref('')
const isLoading = ref(true)
const copiedType = ref<string | null>(null)

const copyText = (text: string, type: string) => {
  navigator.clipboard.writeText(text)
  copiedType.value = type
  setTimeout(() => { copiedType.value = null }, 2000)
}

// Fetch Chatbots
const fetchChatbots = async () => {
  if (!userId.value) return
  isLoading.value = true
  try {
    const { data } = await supabase.from('chatbots').select('id, name').order('name')
    chatbots.value = data || []
    if (chatbots.value.length > 0) {
      selectedChatbotId.value = chatbots.value[0].id
    }
  } catch (err) {
    console.error('Error fetching chatbots:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchChatbots)

// Computed
const scriptTag = computed(() => {
  const id = selectedChatbotId.value || 'YOUR_CHATBOT_ID'
  return `<script src="${window.location.origin}/embed.js" data-chatbot="${id}"><\/script>`
})

const curlCommand = computed(() => {
  const id = selectedChatbotId.value || 'YOUR_CHATBOT_ID'
  return `curl -X POST "${window.location.origin}/api/public/chat" \\
  -H "Content-Type: application/json" \\
  -d '{
    "chatbotId": "${id}",
    "message": "Hello, how can you help me today?"
  }'`
})

const playgroundHtml = computed(() => {
  const id = selectedChatbotId.value || 'YOUR_CHATBOT_ID'
  const scriptUrl = `${window.location.origin}/embed.js` // Placeholder or demo loader
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chatbot Test - ReplySuite</title>
    <!-- Integration Script -->
    <script src="${scriptUrl}" data-chatbot="${id}" async><\/script>
</head>
<body style="background: #0a0a0a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
    <div style="text-align: center;">
        <h1 style="font-weight: 900; letter-spacing: -0.05em;">YOUR AGENT IS ACTIVE</h1>
        <p style="color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">Look for the chat bubble in the bottom right corner.</p>
    </div>
</body>
</html>`
})

</script>

<template>
  <div class="max-w-4xl mx-auto space-y-12 pb-20">
    <!-- Header -->
    <div class="relative overflow-hidden group p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/5">
      <div class="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
      <div class="relative z-10">
        <h1 class="text-4xl font-black tracking-tighter mb-4 text-white uppercase italic-none">Integration Console</h1>
        <p class="text-gray-500 font-bold uppercase tracking-widest text-[11px] italic-none">Connect your intelligence engine to any digital interface.</p>
      </div>
    </div>

    <div v-if="!isVerified" class="glass-card p-12 border-primary/20 bg-primary/5 text-center flex flex-col items-center">
      <ShieldCheck class="w-16 h-16 text-primary mb-6 opacity-30" />
      <h2 class="text-2xl font-black mb-4 uppercase italic-none">Verification Required</h2>
      <p class="text-gray-400 max-w-sm mb-8 font-bold uppercase tracking-widest text-[10px] italic-none">Please verify your account to unlock external embeddings and API access.</p>
      <NuxtLink to="/dashboard/settings" class="px-8 py-3 bg-primary text-black font-bold tracking-widest text-xs uppercase rounded-xl hover:scale-105 transition-all">go to settings</NuxtLink>
    </div>

    <div v-else-if="isLoading" class="flex justify-center py-20">
       <Loader2 class="w-8 h-8 text-primary animate-spin" />
    </div>

    <div v-else class="space-y-8">
      <!-- Selector -->
      <section class="glass-card p-8 bg-[#0a0a0a] border-white/5 relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
        <div class="relative z-10">
            <label class="block text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-4 italic-none">Target Intelligence Source</label>
            <div class="relative max-w-md">
                <select 
                    v-model="selectedChatbotId"
                    class="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white appearance-none focus:outline-none focus:border-primary/40 transition-all cursor-pointer uppercase tracking-widest italic-none"
                >
                    <option v-for="bot in chatbots" :key="bot.id" :value="bot.id" class="bg-[#0a0a0a]">{{ bot.name }}</option>
                </select>
                <ChevronDown class="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <div v-if="chatbots.length === 0" class="absolute inset-y-0 left-0 right-0 flex items-center px-6 bg-[#0a0a0a]/80 backdrop-blur-sm rounded-2xl">
                    <NuxtLink to="/dashboard/agents" class="text-primary text-[10px] font-bold uppercase tracking-widest hover:underline"> Create your first agent to integrate</NuxtLink>
                </div>
            </div>
        </div>
      </section>

      <!-- Direct Embed -->
      <section class="glass-card p-8 bg-[#0a0a0a] border-white/5">
        <div class="flex items-center gap-4 mb-8">
          <div class="p-3 rounded-xl bg-primary/10 text-primary">
            <Code2 class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-xl font-bold tracking-tight text-white uppercase italic-none">Widget Embedding</h3>
            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic-none leading-relaxed">Add this autonomous script to your website's <code class="text-primary">&lt;head&gt;</code> component.</p>
          </div>
        </div>

        <div class="relative group">
          <div class="absolute -inset-1 bg-gradient-to-r from-primary/20 to-cyan-400/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000"></div>
          <div class="relative flex items-center gap-4 p-6 bg-black/40 border border-white/5 rounded-2xl overflow-x-auto">
            <pre class="text-gray-400 text-[11px] flex-1 leading-relaxed">{{ scriptTag }}</pre>
            <button 
              @click="copyText(scriptTag, 'script')"
              class="shrink-0 p-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 transition-all hover:text-white"
            >
              <Check v-if="copiedType === 'script'" class="w-4 h-4 text-primary" />
              <Copy v-else class="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <!-- API / Curl Test -->
      <section class="glass-card p-8 bg-[#0a0a0a] border-white/5">
        <div class="flex items-center gap-4 mb-8">
          <div class="p-3 rounded-xl bg-cyan-400/10 text-cyan-400">
            <Terminal class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-xl font-bold tracking-tight text-white uppercase italic-none">CLI Connectivity Check</h3>
            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic-none leading-relaxed">Public-ready endpoint (no dashboard token required).</p>
          </div>
        </div>

        <div class="relative group">
          <div class="absolute -inset-1 bg-cyan-400/10 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-1000"></div>
          <div class="relative flex items-center gap-4 p-6 bg-black/40 border border-white/5 rounded-2xl overflow-x-auto">
            <pre class="text-gray-400 text-[11px] flex-1 leading-loose">{{ curlCommand }}</pre>
            <button 
              @click="copyText(curlCommand, 'curl')"
              class="shrink-0 p-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 transition-all hover:text-white"
            >
              <Check v-if="copiedType === 'curl'" class="w-4 h-4 text-cyan-400" />
              <Copy v-else class="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <!-- Standalone Sandbox -->
      <section class="glass-card p-8 bg-[#0a0a0a] border-white/5 relative overflow-hidden">
        <div class="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-4 mb-8">
            <div class="p-3 rounded-xl bg-primary/10 text-primary">
              <Bot class="w-6 h-6" />
            </div>
            <div>
              <h3 class="text-xl font-bold tracking-tight text-white uppercase italic-none">Local Sandbox Tool</h3>
              <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic-none leading-relaxed">Test the full widget experience in a clean environment.</p>
            </div>
          </div>

          <div class="space-y-4">
             <p class="text-[10px] text-gray-400 leading-relaxed uppercase tracking-widest italic-none italic">
                Copy the code below, save it as <span class="text-primary italic-none">index.html</span> on your computer, and open it.
             </p>
             <div class="relative group">
                <div class="relative flex items-center gap-4 p-6 bg-black/40 border border-white/5 rounded-2xl overflow-x-auto">
                    <pre class="text-gray-500 text-[9px] flex-1 leading-relaxed">{{ playgroundHtml }}</pre>
                    <button 
                      @click="copyText(playgroundHtml, 'playground')"
                      class="shrink-0 p-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 transition-all hover:text-white"
                    >
                      <Check v-if="copiedType === 'playground'" class="w-4 h-4 text-primary" />
                      <Copy v-else class="w-4 h-4" />
                    </button>
                </div>
             </div>
          </div>
        </div>
      </section>

      <!-- Domain Protection -->
      <section class="glass-card p-8 bg-[#0a0a0a] border-white/5 opacity-50">
        <div class="flex items-center gap-4 mb-8">
          <div class="p-3 rounded-xl bg-white/5 text-gray-500">
            <Globe class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-xl font-bold tracking-tight text-white uppercase italic-none">Security Layers</h3>
            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic-none leading-relaxed">Limit interaction to whitelisted domains.</p>
          </div>
        </div>

        <div class="flex gap-4">
            <input 
              type="text" 
              placeholder="e.g. dev.yourdomain.com"
              disabled
              class="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-3 focus:outline-none text-[11px] font-bold tracking-widest uppercase italic-none text-gray-700 placeholder:text-gray-800"
            />
            <button class="bg-white/5 text-gray-700 px-8 py-3 rounded-xl font-black text-xs tracking-widest uppercase cursor-not-allowed">active</button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply bg-[#111111]/40 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem];
}
.italic-none {
  font-style: normal !important;
}
</style>
