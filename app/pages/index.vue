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
   title: 'Trainable AI Chatbots for Website & Brand Growth',
   ogTitle: 'ReplySuite | AI-Driven Marketing Automation Platform',
   description: 'ReplySuite is an AI-driven marketing automation platform designed for modern brands. By leveraging a custom-trained knowledge base, ReplySuite allows businesses to feed their own data into a sophisticated AI model that handles customer inquiries with human-like precision.',
   ogDescription: 'Train your unique AI chatbot on your brand data to handle website interactions automatically. Built for brands who demand human-like precision.',
   script: [
      {
         src: 'https://replysuite.app/embed.js',
         async: true,
         'data-chatbot': 'cacdbcdb-7157-4e12-92c4-a715aadf3112'
      }
   ]
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
      title: 'Script Embed',
      desc: 'Copy a single line of code to your website. Watch your AI handle inquiries while you scale.'
   }
]

const instagramFeatures = [
   {
      title: 'Web Chatbot',
      desc: 'Connect the AI to your website via a simple script and allow it to answer customer inquiries based on your data.'
   },
   {
      title: 'Social Automation',
      desc: 'Coming Soon: Automatically reply to Instagram, WhatsApp, and Slack with brand-aware AI.'
   }
]

// Hardened Features Data for SSR Stability
const marketingFeatures = [
   {
      title: 'AI Persona Training',
      desc: 'Fine-tune your bot to sound exactly like your brand voice.',
      icon: Bot
   },
   {
      title: 'Knowledge Base',
      desc: 'Upload your PDFs and let the AI learn your business inside out.',
      icon: BrainCircuit
   },
   {
      title: 'Web Integration',
      desc: 'Embed your custom-trained AI on any website with a single line of script.',
      icon: Globe2
   }
]

// Real Chat Demo Logic
const chatbotId = 'cacdbcdb-7157-4e12-92c4-a715aadf3112'
const chatInput = ref('')
const isChatLoading = ref(false)
const chatMessages = ref([
   { role: 'assistant', content: "Hi there! Welcome to ReplySuite. We empower your business by training AI that talks exactly like your brand. Ready to automate your growth? How can I help you scale today?" }
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
                  Ready to Automate
               </div>
               <h1 class="text-6xl md:text-8xl font-extrabold mb-8 leading-[0.9] tracking-tight text-white">
                  Smart Replies, <br />
                  Trained <span class="text-gradient">by You</span>
               </h1>
               <p class="text-xl text-gray-500 mb-12 max-w-lg leading-relaxed font-medium">
                  ReplySuite is an AI-driven marketing automation platform designed for modern brands.
                  Leverage your unique brand data to handle inquiries with human-like precision 24/7.
               </p>

               <div class="flex flex-col sm:flex-row gap-6 relative z-10 transition-all">
                  <NuxtLink :to="user ? '/dashboard' : '/login'"
                     class="btn-gradient px-10 py-5 text-lg flex items-center justify-center gap-3 group">
                     {{ user ? 'Go to Dashboard' : 'Start Free Month' }}
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
            <div v-for="channel in [
               { name: 'Instagram', icon: Instagram, status: 'Coming Soon' },
               { name: 'WhatsApp', icon: MessageCircle, status: 'Coming Soon' },
               { name: 'Slack', icon: Slack, status: 'Coming Soon' },
               { name: 'Telegram', icon: Send, status: 'Coming Soon' }
            ]" :key="channel.name"
               class="glass-card p-8 border-white/5 text-center group hover:border-primary/20 transition-all opacity-60">
               <div
                  class="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/10">
                  <component :is="channel.icon" class="w-6 h-6 text-primary" />
               </div>
               <div class="text-sm font-bold tracking-tight mb-2 text-white">{{ channel.name }}</div>
               <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{{ channel.status }}</div>
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
