<script setup lang="ts">
import { Copy, Check, Code2, Globe, ShieldCheck } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { isVerified } = useAuth()
const copied = ref(false)
const scriptTag = computed(() => `<script src="${window.location.origin}/embed.js" data-chatbot="YOUR_CHATBOT_ID"><\/script>`)

const copyScript = () => {
  navigator.clipboard.writeText(scriptTag.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <div class="mb-12">
      <h1 class="text-4xl font-black tracking-tighter mb-4 text-white">Integration</h1>
      <p class="text-gray-400 font-medium">Connect your AI Agent to your website in seconds.</p>
    </div>

    <div v-if="!isVerified" class="glass-card p-12 border-primary/20 bg-primary/5 text-center flex flex-col items-center">
      <ShieldCheck class="w-16 h-16 text-primary mb-6 opacity-30" />
      <h2 class="text-2xl font-black mb-4">Verification Required</h2>
      <p class="text-gray-400 max-w-sm mb-8">Please verify your email to access website integration features and custom scripts.</p>
      <NuxtLink to="/dashboard/settings" class="btn-gradient px-8 py-3 font-bold tracking-widest text-xs uppercase">go to settings</NuxtLink>
    </div>

    <div v-else class="space-y-8">
      <!-- Direct Embed -->
      <section class="glass-card p-8 border-white/5 bg-[#0a0a0a]">
        <div class="flex items-center gap-4 mb-8">
          <div class="p-3 rounded-xl bg-primary/10 text-primary">
            <Code2 class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-xl font-bold tracking-tight">Direct Embed</h3>
            <p class="text-sm text-gray-500">Add this script to your website's <code class="text-primary font-mono">&lt;head&gt;</code> or <code class="text-primary font-mono">&lt;body&gt;</code>.</p>
          </div>
        </div>

        <div class="relative group">
          <div class="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary-accent/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div class="relative flex items-center gap-4 p-6 bg-black border border-white/10 rounded-xl font-mono text-sm overflow-x-auto">
            <pre class="text-gray-300 flex-1">{{ scriptTag }}</pre>
            <button 
              @click="copyScript"
              class="shrink-0 p-3 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-all active:scale-95"
            >
              <Check v-if="copied" class="w-5 h-5 text-green-500" />
              <Copy v-else class="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      <!-- Security / Domain Whitelist -->
      <section class="glass-card p-8 border-white/5 bg-[#0a0a0a]">
        <div class="flex items-center gap-4 mb-8">
          <div class="p-3 rounded-xl bg-primary/10 text-primary">
            <Globe class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-xl font-bold tracking-tight">Domain Whitelist</h3>
            <p class="text-sm text-gray-500">Protect your agent by limiting which domains can host your widget.</p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex gap-4">
            <input 
              type="text" 
              placeholder="e.g. yourdomain.com"
              class="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-3 focus:outline-none focus:border-primary/50 transition-all text-sm font-medium"
            />
            <button class="bg-white text-black px-6 py-3 rounded-xl font-black text-xs tracking-widest uppercase hover:bg-gray-200 transition-all">add</button>
          </div>
          <p class="text-[10px] uppercase font-black tracking-widest text-gray-600 px-1 italic">Note: gold plan supports unlimited whitelisted domains.</p>
        </div>
      </section>
    </div>
  </div>
</template>
