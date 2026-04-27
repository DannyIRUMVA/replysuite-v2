<script setup lang="ts">
import { 
  Copy, Check, Code2, Globe, ShieldCheck, Terminal, Bot, ChevronDown, Loader2, 
  Settings, Shield, Palette, ExternalLink, MessageSquare, Sparkles, Zap, Info, ArrowLeft 
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

useHead({
  title: 'Website Integration'
})

const { isVerified, userId } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()

// State
const chatbots = ref<any[]>([])
const selectedChatbotId = ref('')
const isLoading = ref(true)
const copiedType = ref<string | null>(null)

const copyText = (text: string, type: string) => {
  navigator.clipboard.writeText(text)
  notify.success(`${type.toUpperCase()} logic duplicated to clipboard.`)
}

// Fetch Chatbots
const fetchChatbots = async () => {
  if (!userId.value) return
  isLoading.value = true
  try {
    const { data } = await supabase
      .from('chatbots')
      .select('id, name, launcher_color, launcher_icon, launcher_style, allowed_domains, primary_color')
      .order('name')
    
    chatbots.value = data || []
    if (chatbots.value.length > 0) {
      selectedChatbotId.value = chatbots.value[0].id
    }
  } catch (err) {
    console.error('Error fetching chatbots:', err)
    notify.error('Failed to sync integration sources.')
  } finally {
    isLoading.value = false
  }
}

const selectedChatbot = computed(() => chatbots.value.find(c => c.id === selectedChatbotId.value))

const launcherIconsMap: any = {
  MessageSquare,
  Bot,
  Sparkles,
  Zap,
  HelpCircle: Info
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
  <div class="w-full space-y-8 pb-20">
    <NuxtLink to="/dashboard" class="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-all text-[10px] font-black uppercase tracking-widest mb-2 group w-fit">
        <ArrowLeft class="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
        Back to Overview
    </NuxtLink>

    <div v-if="!isVerified" class="glass-card p-12 border-primary/20 bg-primary/5 text-center flex flex-col items-center">
      <ShieldCheck class="w-16 h-16 text-primary mb-6 opacity-30" />
      <h2 class="text-2xl font-black mb-4 uppercase italic-none text-foreground">Verification Required</h2>
      <p class="text-foreground/50 max-w-sm mb-8 font-bold uppercase tracking-widest text-[10px] italic-none">Please verify your account to unlock external embeddings and API access.</p>
      <NuxtLink to="/dashboard/settings" class="px-8 py-3 bg-primary text-black font-bold tracking-widest text-xs uppercase rounded-xl hover:scale-105 transition-all">go to settings</NuxtLink>
    </div>

    <div v-else-if="isLoading" class="space-y-8">
      <!-- Skeleton Header Sync -->
      <section class="glass-card p-8 bg-background border-foreground/5 relative overflow-hidden">
        <Skeleton width="180px" height="10px" class="mb-4" />
        <Skeleton width="320px" height="48px" radius="1rem" />
      </section>

      <div class="grid lg:grid-cols-2 gap-8">
        <div class="space-y-8">
          <!-- Widget Embed Skeleton -->
          <section class="glass-card p-8 bg-[#0a0a0a] border-white/5">
            <div class="flex items-center gap-4 mb-8">
              <Skeleton width="48px" height="48px" radius="0.75rem" />
              <div class="space-y-2">
                <Skeleton width="150px" height="14px" />
                <Skeleton width="220px" height="10px" />
              </div>
            </div>
            <Skeleton height="100px" radius="1rem" />
          </section>
        </div>

        <div class="space-y-8">
          <!-- CLI Skeleton -->
          <section class="glass-card p-8 bg-[#0a0a0a] border-white/5">
            <div class="flex items-center gap-4 mb-8">
              <Skeleton width="48px" height="48px" radius="0.75rem" />
              <div class="space-y-2">
                <Skeleton width="180px" height="14px" />
                <Skeleton width="240px" height="10px" />
              </div>
            </div>
            <Skeleton height="120px" radius="1rem" />
          </section>
        </div>
      </div>

      <!-- Security Placeholder Skeleton -->
      <section class="glass-card p-8 bg-[#0a0a0a] border-white/5 opacity-40">
        <Skeleton width="200px" height="14px" class="mb-6" />
        <div class="flex gap-4">
          <Skeleton height="44px" class="flex-1" radius="0.75rem" />
          <Skeleton width="100px" height="44px" radius="0.75rem" />
        </div>
      </section>
    </div>

    <div v-else class="space-y-8">
      <!-- Selector (Full Width for prominence, or can be grid-aligned) -->
      <section class="glass-card p-8 bg-background border-foreground/10 relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
        <div class="relative z-10">
            <label class="block text-[11px] font-bold tracking-widest text-foreground/50 uppercase mb-4 italic-none">Target Intelligence Source</label>
            <div class="relative max-w-md">
                <select 
                    v-model="selectedChatbotId"
                    class="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-6 py-4 text-sm font-bold text-foreground appearance-none focus:outline-none focus:border-primary/40 transition-all cursor-pointer uppercase tracking-widest italic-none"
                >
                    <option v-for="bot in chatbots" :key="bot.id" :value="bot.id" class="bg-background">{{ bot.name }}</option>
                </select>
                <ChevronDown class="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50 pointer-events-none" />
                <div v-if="chatbots.length === 0" class="absolute inset-y-0 left-0 right-0 flex items-center px-6 bg-background/80 backdrop-blur-sm rounded-xl">
                    <NuxtLink to="/dashboard/agents" class="text-primary text-[10px] font-bold uppercase tracking-widest hover:underline"> Create your first agent to integrate</NuxtLink>
                </div>
            </div>
        </div>
      </section>

      <div class="grid lg:grid-cols-2 gap-8">
        <!-- Left Column: technical details & embed -->
        <div class="space-y-8">
          <!-- Direct Embed -->
          <section class="glass-card h-full p-8 bg-background border-foreground/10 flex flex-col">
            <div class="flex items-center justify-between mb-8">
              <div class="flex items-center gap-4">
                <div class="p-3 rounded-xl bg-primary/10 text-primary">
                  <Code2 class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="text-xl font-bold tracking-tight text-foreground uppercase italic-none">Widget Embedding</h3>
                  <p class="text-[10px] text-foreground/50 font-bold uppercase tracking-widest italic-none leading-relaxed">Add this autonomous script to your website's <code class="text-primary">&lt;head&gt;</code>.</p>
                </div>
              </div>
              
              <NuxtLink 
                v-if="selectedChatbotId"
                :to="`/dashboard/agents/${selectedChatbotId}?tab=design`"
                class="flex items-center gap-2 px-3 py-1.5 bg-foreground/5 hover:bg-foreground/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-foreground/50 hover:text-primary transition-all border border-foreground/10"
              >
                <Palette class="w-3 h-3" />
                Customize
              </NuxtLink>
            </div>

            <div class="flex-1 space-y-6">
              <div class="relative group">
                <div class="absolute -inset-1 bg-gradient-to-r from-primary/20 to-cyan-400/20 rounded-xl blur opacity-10 group-hover:opacity-30 transition duration-1000"></div>
                <div class="relative flex items-center gap-4 p-6 bg-foreground/[0.03] border border-foreground/10 rounded-xl overflow-x-auto overflow-y-hidden">
                  <pre class="text-foreground/50 text-[11px] flex-1 leading-relaxed">{{ scriptTag }}</pre>
                  <button 
                    @click="copyText(scriptTag, 'Embed Script')"
                    class="shrink-0 p-4 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground/50 transition-all hover:text-foreground"
                  >
                    <Copy class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Preview section -->
              <div v-if="selectedChatbot" class="p-4 bg-foreground/[0.02] border border-foreground/10 rounded-xl flex items-center gap-6">
                <div class="relative group flex items-center justify-center p-4">
                  <div class="absolute inset-0 bg-primary/5 rounded-full blur-xl scale-75 group-hover:scale-100 transition-transform"></div>
                  <div 
                    class="w-12 h-12 flex items-center justify-center shadow-2xl relative z-10 transition-transform group-hover:scale-110"
                    :style="{ 
                      backgroundColor: selectedChatbot.launcher_color || selectedChatbot.primary_color || '#D4AF37',
                      borderRadius: selectedChatbot.launcher_style === 'circle' ? '50%' : selectedChatbot.launcher_style === 'square' ? '0px' : selectedChatbot.launcher_style === 'rounded-square' ? '12px' : '9999px'
                    }"
                  >
                    <component 
                      :is="launcherIconsMap[selectedChatbot.launcher_icon] || MessageSquare" 
                      class="w-6 h-6 text-black" 
                    />
                  </div>
                </div>
                <div class="flex-1">
                  <h4 class="text-[10px] font-black uppercase tracking-widest text-foreground mb-1">Live Launcher Preview</h4>
                  <p class="text-[9px] text-foreground/50 font-bold uppercase tracking-widest leading-relaxed">This is exactly how your chatbot button will appear on your domain.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="space-y-8">
          <!-- API / Curl Test -->
          <section class="glass-card h-full p-8 bg-background border-foreground/10">
            <div class="flex items-center gap-4 mb-8">
              <div class="p-3 rounded-xl bg-cyan-400/10 text-cyan-400">
                <Terminal class="w-6 h-6" />
              </div>
              <div>
                <h3 class="text-xl font-bold tracking-tight text-foreground uppercase italic-none">CLI Connectivity Check</h3>
                <p class="text-[10px] text-foreground/50 font-bold uppercase tracking-widest italic-none leading-relaxed">Public-ready endpoint (no dashboard token required).</p>
              </div>
            </div>

            <div class="relative group">
              <div class="absolute -inset-1 bg-cyan-400/10 rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-1000"></div>
              <div class="relative flex items-center gap-4 p-6 bg-foreground/[0.03] border border-foreground/10 rounded-xl overflow-x-auto overflow-y-hidden">
                <pre class="text-foreground/50 text-[11px] flex-1 leading-loose">{{ curlCommand }}</pre>
                <button 
                  @click="copyText(curlCommand, 'CLI Command')"
                  class="shrink-0 p-4 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground/50 transition-all hover:text-foreground"
                >
                  <Copy class="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-8">
        <!-- Standalone Sandbox -->
        <section class="glass-card p-8 bg-background border-foreground/10 relative overflow-hidden">
          <div class="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          <div class="relative z-10">
            <div class="flex items-center gap-4 mb-8">
              <div class="p-3 rounded-xl bg-primary/10 text-primary">
                <Bot class="w-6 h-6" />
              </div>
              <div>
                <h3 class="text-xl font-bold tracking-tight text-foreground uppercase italic-none">Local Sandbox Tool</h3>
                <p class="text-[10px] text-foreground/50 font-bold uppercase tracking-widest italic-none leading-relaxed">Test the full widget experience in a clean environment.</p>
              </div>
            </div>

            <div class="space-y-4">
              <p class="text-[10px] text-foreground/50 leading-relaxed uppercase tracking-widest italic-none italic">
                  Copy the code below, save it as <span class="text-primary italic-none">index.html</span> on your computer, and open it.
              </p>
              <div class="relative group">
                  <div class="relative flex items-center gap-4 p-6 bg-foreground/[0.03] border border-foreground/10 rounded-xl overflow-x-auto overflow-y-hidden">
                      <pre class="text-foreground/50 text-[9px] flex-1 leading-relaxed">{{ playgroundHtml }}</pre>
                      <button 
                        @click="copyText(playgroundHtml, 'Sandbox HTML')"
                        class="shrink-0 p-4 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground/50 transition-all hover:text-foreground"
                      >
                        <Copy class="w-4 h-4" />
                      </button>
                  </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Domain Protection -->
        <section class="glass-card p-8 bg-background border-foreground/10">
          <div class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-4">
              <div class="p-3 rounded-xl bg-foreground/5 text-primary">
                <Shield class="w-6 h-6" />
              </div>
              <div>
                <h3 class="text-xl font-bold tracking-tight text-foreground uppercase italic-none">Domain Protection</h3>
                <p class="text-[10px] text-foreground/50 font-bold uppercase tracking-widest italic-none leading-relaxed">Active restrictions for selected intelligence source.</p>
              </div>
            </div>

            <NuxtLink 
              v-if="selectedChatbotId"
              :to="`/dashboard/agents/${selectedChatbotId}?tab=security`"
              class="flex items-center gap-2 px-3 py-1.5 bg-foreground/5 hover:bg-foreground/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-foreground/50 hover:text-primary transition-all border border-foreground/10"
            >
              <ShieldCheck class="w-3 h-3" />
              Manage
            </NuxtLink>
          </div>

          <div class="space-y-3">
            <div v-if="selectedChatbot?.allowed_domains?.length > 0" class="flex flex-wrap gap-2">
              <div 
                v-for="domain in selectedChatbot.allowed_domains" 
                :key="domain"
                class="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-bold text-primary uppercase tracking-widest"
              >
                <Globe class="w-3 h-3" />
                {{ domain }}
              </div>
            </div>
            <div v-else class="p-6 bg-foreground/[0.02] border border-dashed border-foreground/10 rounded-xl text-center">
              <p class="text-[9px] text-foreground/50 font-bold uppercase tracking-widest">No domain restrictions active. Your widget will work on any site.</p>
            </div>
            
            <div class="flex items-center gap-2 mt-4 pt-4 border-t border-foreground/5">
              <div class="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span class="text-[9px] text-foreground/50 font-bold uppercase tracking-widest">
                System Status: <span class="text-foreground">Active Enforcement</span>
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply bg-foreground/[0.03] backdrop-blur-xl border border-foreground/10 p-8 rounded-[20px];
}
.italic-none {
  font-style: normal !important;
}
</style>
