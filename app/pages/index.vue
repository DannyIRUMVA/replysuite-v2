<script setup lang="ts">
import { ref } from 'vue'
import {
   Zap,
   ArrowRight,
   Play,
   CheckCircle2,
   Instagram,
   Settings,
   Bot,
   BrainCircuit,
   Target,
   BarChart3,
   ShieldCheck,
   Coffee,
   Slack,
   MessageCircle,
   Send,
   Globe2
} from 'lucide-vue-next'

useSeoMeta({
   title: 'ReplySuite | The Infrastructure of AI Conversation',
   ogTitle: 'ReplySuite | Enterprise AI Automation Platform',
   description: 'The gold standard for RAG-powered AI agents. Train your unique AI workforce on brand data and deploy to WhatsApp, Instagram, and Web in minutes.',
   ogDescription: 'Elite AI automation for digital-native brands. Train RAG models on your own documents and automate DMs with human-like precision.',
})

useHead({
   script: [
      {
         src: 'https://replysuite.app/embed.js',
         async: true,
         'data-chatbot': 'cacdbcdb-7157-4e12-92c4-a715aadf3112'
      }
   ],
   link: [{ rel: 'canonical', href: 'https://replysuite.app' }]
})

definePageMeta({
   layout: 'default'
})

const user = useSupabaseUser()

const trustedLogos = [
   { name: 'GrowthX', icon: BarChart3 },
   { name: 'Valant', icon: ShieldCheck },
   { name: 'Savory', icon: Coffee },
   { name: 'Sagacity', icon: Zap },

]

const steps = [
   {
      num: '01',
      title: 'Sync Data',
      desc: 'Upload PDFs, CSVs, or just paste your URL. We scrape and learn instantly.'
   },
   {
      num: '02',
      title: 'Train AI',
      desc: 'Fine-tune your brand voice. Test responses in our playground before going live.'
   },
   {
      num: '03',
      title: 'Deploy Everywhere',
      desc: 'Connect to WhatsApp, Instagram, or Web with one click. Scale without limits.'
   }
]

const channelFeatures = [
   {
      title: 'Website AI Agent',
      desc: 'Connect the AI to your website via a simple script and allow it to answer customer inquiries based on your data.',
      icon: Globe2
   },
   {
      title: 'Official WhatsApp API',
      desc: 'The only no-code bridge for advanced RAG-powered agents on the Meta Business platform.',
      icon: MessageCircle
   },
   {
      title: 'Instagram Elite Protocol',
      desc: 'Handle thousands of high-intent DMs automatically with brand-aware precision.',
      icon: Instagram
   }
]

// Hardened Features Data for SSR Stability
const marketingFeatures = [
   {
      title: 'Advanced RAG Engine',
      desc: 'Fine-tune your bot using Retrieval-Augmented Generation to eliminate hallucinations.',
      icon: Bot
   },
   {
      title: 'Secure Knowledge Base',
      desc: 'Upload your PDFs and documents to our encrypted vector database.',
      icon: BrainCircuit
   },
   {
      title: 'Infrastructure Scale',
      desc: 'Built on Cloudflare Edge and Microsoft Azure for sub-second global response times.',
      icon: Zap
   }
]

// Real Chat Demo Logic
const chatbotId = 'cacdbcdb-7157-4e12-92c4-a715aadf3112'
const chatInput = ref('')
const isChatLoading = ref(false)
const chatMessages = ref([
   { role: 'assistant', content: "Hi there! I am the ReplySuite Infrastructure Agent. I'm trained on 2026 market standards to help you scale your brand via AI. How can I assist you with your deployment today?" }
])

const sendDemoMessage = async () => {
   if (!chatInput.value.trim() || isChatLoading.value) return

   const userMsg = chatInput.value
   chatMessages.value.push({ role: 'user', content: userMsg })
   chatInput.value = ''
   isChatLoading.value = true

   try {
      const res = await $fetch<{ success: boolean; response: string }>('/api/public/chat', {
         method: 'POST',
         body: { chatbotId, message: userMsg }
      })

      if (res.success) {
         chatMessages.value.push({ role: 'assistant', content: res.response })
      }
   } catch (err) {
      chatMessages.value.push({
         role: 'assistant',
         content: "I apologize, but I encountered an error. Please try again or sign in to the full dashboard!"
      })
   } finally {
      isChatLoading.value = false
   }
}
</script>

<template>
   <div class="relative overflow-hidden">
      <!-- Hero Section -->
      <div class="relative pt-20 pb-20 mt-[10vh] md:pt-32 md:pb-32 overflow-hidden">
         <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>

         <div class="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
            <div>
               <div class="badge-gradient mb-8 flex items-center gap-2">
                  <Zap class="w-3 h-3 fill-current" />
                  Enterprise Ready
               </div>
               <h1 class="text-6xl md:text-8xl font-extrabold mb-8 leading-[0.9] tracking-tight text-white">
                  The Infrastructure <br />
                  of <span class="text-gradient">AI Conversation.</span>
               </h1>
               <p class="text-xl text-gray-500 mb-12 max-w-lg leading-relaxed font-medium">
                  ReplySuite is the premium automation layer for 2026 digital-native brands.
                  Train your unique AI workforce on brand data and deploy anywhere in minutes.
               </p>

               <div class="flex flex-col sm:flex-row gap-6 relative z-10 transition-all">
                  <NuxtLink :to="user ? '/dashboard' : '/login'"
                     class="btn-gradient px-10 py-5 text-lg flex items-center justify-center gap-3 group">
                     {{ user ? 'Go to Dashboard' : 'Deploy Your First Agent' }}
                     <ArrowRight class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </NuxtLink>
                  <button
                     class="px-10 py-5 rounded-full border border-white/10 hover:bg-white/5 transition-all text-lg font-bold flex items-center justify-center gap-3">
                     <Play class="w-5 h-5 fill-current" />
                     How it works
                  </button>
               </div>

               <!-- Social Proof -->
               <div
                  class="mt-20 flex items-center gap-8 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                  <div v-for="logo in trustedLogos" :key="logo.name" class="flex items-center gap-2">
                     <component :is="logo.icon" class="w-5 h-5 text-white" />
                     <span class="text-sm font-bold tracking-tight">{{ logo.name }}</span>
                  </div>
               </div>
            </div>

            <!-- Visual Asset: Chat Simulation -->
            <div class="relative perspective-1000 hidden lg:block">
               <div
                  class="glass-card p-2 border-white/10 rotate-y-[-10deg] rotate-x-[5deg] shadow-2xl skew-x-[-1deg] hover:rotate-0 transition-all duration-1000">
                  <div
                     class="bg-black/40 rounded-3xl overflow-hidden aspect-[4/5] relative border border-white/5 backdrop-blur-md">
                     <!-- Fake IG Header -->
                     <div class="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
                        <div class="flex items-center gap-3">
                           <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-primary-accent p-0.5">
                              <div class="w-full h-full rounded-full bg-background flex items-center justify-center">
                                 <Instagram class="text-primary w-5 h-5" />
                              </div>
                           </div>
                           <div>
                              <div class="text-xs font-bold">ReplySuite AI</div>
                              <div class="text-[10px] text-green-500 font-medium animate-pulse">Active now</div>
                           </div>
                        </div>
                        <Settings class="w-5 h-5 text-white/40" />
                     </div>

                     <!-- Chat Messages -->
                     <div class="p-8 space-y-6 h-[400px] overflow-y-auto scrollbar-hide flex flex-col">
                        <div v-for="(msg, idx) in chatMessages" :key="idx"
                           :class="['flex', msg.role === 'user' ? 'justify-start' : 'justify-end']">
                           <div :class="[
                              'p-4 rounded-2xl text-sm transition-all animate-in fade-in slide-in-from-bottom-2',
                              msg.role === 'user'
                                 ? 'bg-white/5 border border-white/5 rounded-tl-none max-w-[80%]'
                                 : 'bg-primary/10 border border-primary/20 rounded-tr-none max-w-[80%] text-white'
                           ]">
                              {{ msg.content }}
                           </div>
                        </div>

                        <!-- Typing Indicator -->
                        <div v-if="isChatLoading" class="flex justify-end animate-pulse">
                           <div class="bg-primary/5 border border-primary/20 p-4 rounded-2xl rounded-tr-none">
                              <div class="flex gap-1.5">
                                 <div class="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                 <div class="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                 <div class="w-1.5 h-1.5 bg-primary rounded-full"></div>
                              </div>
                           </div>
                        </div>
                     </div>

                     <form @submit.prevent="sendDemoMessage"
                        class="absolute bottom-6 left-6 right-6 flex gap-2 font-bold tracking-tight">
                        <input v-model="chatInput" placeholder="Ask me anything..."
                           class="flex-grow bg-white/5 rounded-full px-6 py-3 border border-white/5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-all font-medium" />
                        <button type="submit" :disabled="!chatInput.trim() || isChatLoading"
                           class="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 text-black hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale">
                           <ArrowRight class="w-6 h-6" />
                        </button>
                     </form>
                  </div>
               </div>

               <!-- Floating Badges -->
               <div class="absolute -top-10 -right-10 glass-card p-6 border-primary/20 animate-float backdrop-blur-xl">
                  <Bot class="text-primary w-8 h-8 mb-2" />
                  <div class="text-[10px] font-bold tracking-widest uppercase text-white/80">AI Trained</div>
               </div>
               <div
                  class="absolute -top-10 -left-10 glass-card p-6 border-primary/20 animate-float-delayed backdrop-blur-xl">
                  <CheckCircle2 class="text-primary w-8 h-8 mb-2" />
                  <div class="text-[10px] font-bold tracking-widest uppercase text-white/80">Verified Human</div>
               </div>
            </div>
         </div>
      </div>

      <!-- Features Section -->
      <section id="features" class="max-w-7xl mx-auto px-6 py-32 border-t border-white/5">
         <div class="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
            <div class="max-w-2xl">
               <span class="badge-gradient mb-6">Features</span>
               <h2 class="text-5xl md:text-7xl font-extrabold tracking-tighter leading-none text-white">
                  Automation for <br /> the <span class="text-gradient">Elite.</span>
               </h2>
            </div>
            <p class="text-gray-500 max-w-sm text-right font-medium">
               We've refined every interaction to feel premium. No bot-like responses, only sophisticated AI
               conversations.
            </p>
         </div>

         <div class="grid md:grid-cols-3 gap-8">
            <div v-for="feat in marketingFeatures" :key="feat.title"
               class="glass-card p-10 border-white/5 group hover:border-primary/20 transition-all duration-500">
               <div
                  class="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-10 group-hover:scale-110 group-hover:bg-primary/10 transition-all">
                  <component :is="feat.icon" class="text-primary w-8 h-8" />
               </div>
               <h3 class="text-2xl font-bold mb-4 tracking-tight">{{ feat.title }}</h3>
               <p class="text-gray-500 text-sm leading-relaxed mb-8">{{ feat.desc }}</p>
               <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div class="h-full bg-primary w-0 group-hover:w-full transition-all duration-1000 ease-in-out"></div>
               </div>
            </div>
         </div>
      </section>

      <!-- Global Reach -->
      <section class="max-w-7xl mx-auto px-6 py-40 border-t border-white/5 relative">
         <div class="grid lg:grid-cols-2 gap-20 items-center">
            <div>
               <span class="badge-gradient mb-8 uppercase tracking-[0.2em] text-[10px]">Global Expansion</span>
               <h2 class="text-5xl md:text-7xl font-extrabold mb-10 tracking-tighter leading-tight text-white">
                  Beyond <br />
                  <span class="text-gradient leading-none">Borders.</span>
               </h2>
               <p class="text-lg text-gray-400 leading-relaxed font-medium mb-12">
                  While the U.S. remains our high-ticket anchor, ReplySuite is architected for global volume. We are the default infrastructure for the <strong>India-Brazil-Indonesia</strong> corridor, where WhatsApp is the operating system of daily commerce.
               </p>
               <div class="space-y-6">
                  <div v-for="market in [
                    { name: 'India', stat: '532M+ Users', desc: 'Conversational Commerce Hub' },
                    { name: 'Brazil', stat: '98% Adoption', desc: 'Real Estate & Hospitality Focus' },
                    { name: 'Indonesia', stat: '94M+ Users', desc: 'Social Commerce Standard' }
                  ]" :key="market.name" class="flex items-center gap-6 p-6 rounded-3xl bg-white/[0.02] border border-white/5 group hover:border-primary/20 transition-all">
                     <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xs uppercase tracking-widest">
                        {{ market.name.substring(0, 2) }}
                     </div>
                     <div>
                        <div class="text-white font-bold tracking-tight">{{ market.name }} — {{ market.stat }}</div>
                        <div class="text-xs text-gray-500 font-medium">{{ market.desc }}</div>
                     </div>
                  </div>
               </div>
            </div>
            <div class="relative">
               <div class="glass-card p-10 border-white/5 relative overflow-hidden group">
                  <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div class="flex items-center gap-4 mb-6">
                    <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg">🇺🇸</div>
                    <h4 class="text-lg font-bold text-white tracking-tight uppercase">North America</h4>
                  </div>
                  <p class="text-gray-500 text-sm leading-relaxed font-medium mb-6">
                    High-performance infrastructure aligned with **SOC 2 Type II** and **CCPA/CPRA** standards for enterprise U.S. clients.
                  </p>
                  <div class="flex items-center gap-2 text-[10px] font-bold text-primary tracking-widest uppercase">
                    <CheckCircle2 class="w-3 h-3" />
                    Enterprise Ready
                  </div>
               </div>
               <div class="absolute inset-0 bg-primary/10 blur-[100px] rounded-full"></div>
               <div class="glass-card p-12 relative z-10 border-primary/20">
                  <div class="flex items-center gap-4 mb-8">
                     <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <Globe2 class="w-5 h-5" />
                     </div>
                     <h3 class="text-xl font-bold text-white tracking-tight">The Kigali Advantage</h3>
                  </div>
                  <p class="text-gray-400 font-medium mb-8 leading-relaxed">
                     Operating from the heart of Kigali, we are uniquely positioned to bridge the gap between global AI standards and local African context. Our <strong>Kinyarwanda-native models</strong> provide a moat that international competitors cannot easily match.
                  </p>
                  <div class="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-[10px]">
                     Scale your brand in Africa
                     <ArrowRight class="w-4 h-4" />
                  </div>
               </div>
            </div>
         </div>
      </section>

      <!-- Multi-Channel Roadmap Section -->
      <section class="max-w-7xl mx-auto px-6 py-32 border-t border-white/5 relative overflow-hidden">
         <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 translate-y-1/2"></div>

         <div class="text-center mb-20">
            <span class="badge-gradient mb-6">Roadmap</span>
            <h2 class="text-5xl md:text-7xl font-extrabold tracking-tighter text-white">
               The future is <span class="text-gradient">Limitless.</span>
            </h2>
         </div>

         <div class="grid grid-cols-2 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div v-for="channel in channelFeatures" :key="channel.name"
               class="glass-card p-8 border-white/5 text-center group hover:border-primary/20 transition-all">
               <div
                  class="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/10">
                  <component :is="channel.icon" class="w-6 h-6 text-primary" />
               </div>
               <div class="text-sm font-bold tracking-tight mb-2 text-white">{{ channel.title }}</div>
               <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Active Infrastructure</div>
            </div>
         </div>
      </section>

      <!-- Final CTA Section -->
      <section class="max-w-5xl mx-auto px-6 py-32">
         <div
            class="bg-white/5 p-20 rounded-[40px] border border-white/5 text-center relative overflow-hidden backdrop-blur-sm">
            <div class="absolute inset-0 bg-primary/5 blur-[120px]"></div>

            <h2 class="text-5xl md:text-7xl font-extrabold mb-12 relative z-10 leading-tight text-white">
               Ready to build your <br />
               <span class="text-gray-400">AI Workforce?</span>
            </h2>

            <NuxtLink to="/register"
               class="bg-white text-black px-12 py-6 rounded-full font-bold text-xl inline-flex items-center gap-3 relative z-10 hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/10">
               Get Started Free
            </NuxtLink>

            <p class="text-gray-500 mt-12 text-xs relative z-10 tracking-[0.2em] font-bold uppercase">
               No credit card required • 30-day free month • Cancel anytime
            </p>
         </div>
      </section>
   </div>
</template>

<style scoped>
.perspective-1000 {
   perspective: 1000px;
}

@keyframes float {

   0%,
   100% {
      transform: translateY(0);
   }

   50% {
      transform: translateY(-20px);
   }
}

.animate-float {
   animation: float 6s ease-in-out infinite;
}

.animate-float-delayed {
   animation: float 6s ease-in-out infinite;
   animation-delay: 3s;
}
</style>
