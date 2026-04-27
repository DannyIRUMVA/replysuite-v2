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
   Globe2,
   Check,
   Loader2
} from 'lucide-vue-next'

useSeoMeta({
   title: 'ReplySuite | The Infrastructure of AI Conversation',
   ogTitle: 'ReplySuite | Enterprise AI Automation Platform',
   description: 'The gold standard for RAG-powered AI agents. Train your unique AI workforce on brand data and deploy to WhatsApp and Web in minutes.',
   ogDescription: 'Elite AI automation for digital-native brands. Train RAG models on your own documents and automate conversations with human-like precision.',
})

useHead({
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
      desc: 'Connect to WhatsApp, WordPress, or any Website with one click. Scale without limits.'
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
      title: 'WordPress Plugin',
      desc: 'One-click deployment for the world’s most popular CMS. Native support for Elementor and WooCommerce.',
      icon: Globe2
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
const { isAuthenticated, refreshAuth, syncWithPolar } = useAuth()
const notify = useNotify()
const isProcessing = ref<string | null>(null)

const plans = [
   {
      name: 'Free',
      id: 'starter',
      price: '0.00',
      desc: 'Experience the gold standard risk-free.',
      features: ['1 website chatbot', '100 AI replies / mo', '10 training sessions', 'Trainable AI agent', 'Email support'],
      popular: false
   },
   {
      name: 'Silver',
      id: 'silver',
      productId: 'dc070937-6444-40a6-8a02-fd8b25df7aae',
      price: '17.88',
      desc: 'The best value for growing elite brands.',
      features: ['3 website chatbots', '4,000 AI replies / mo', '30 training sessions', 'Advanced bot training', 'Priority support'],
      popular: true
   },
   {
      name: 'Gold',
      id: 'gold',
      productId: 'd0493f6f-16bc-4d3c-97bb-7be920840f12',
      price: '26.88',
      desc: 'Elite power for high-volume experts.',
      features: ['5 website chatbots', '10,000 AI replies / mo', '100 training sessions', 'WhatsApp integration', 'Dedicated manager'],
      popular: false
   }
]

onMounted(() => {
   if (window.PolarEmbedCheckout) {
      window.PolarEmbedCheckout.init()
   }

   // Listen for successful checkout
   window.addEventListener("polar:checkout:confirmed", async (event) => {
      console.log("[Index] Checkout confirmed:", event)
      notify.success('Payment successful! Redirecting to your dashboard...')
      await syncWithPolar()
      setTimeout(() => {
         navigateTo('/dashboard/analytics')
      }, 1500)
   })
})

const handleSelect = async (plan: any) => {
   if (!isAuthenticated.value) {
      return navigateTo(`/register?plan=${plan.id}`)
   }

   isProcessing.value = plan.id

   try {
      if (plan.id === 'starter') {
         const res = await $fetch('/api/billing/onboard-free', { method: 'POST' })
         if (res.success) {
            await refreshAuth()
            return navigateTo('/dashboard/analytics')
         }
      } else {
         const res = await $fetch('/api/billing/checkout', {
            method: 'POST',
            body: { productId: plan.productId }
         })

         if (res.url) {
            if (window.PolarEmbedCheckout) {
               window.PolarEmbedCheckout.open(res.url)
            } else {
               window.location.href = res.url
            }
         }
      }
   } catch (err: any) {
      console.error('[Index Pricing] Action failed:', err)
      notify.error('Failed to process request. Please try again.')
   } finally {
      isProcessing.value = null
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
               <div class="flex items-center gap-3 mb-8 opacity-80 group cursor-default">
                  <div class="h-[1px] w-10 bg-primary/40 group-hover:w-14 transition-all duration-500"></div>
                  <span class="text-[11px] font-bold tracking-[0.3em] text-primary uppercase">Enterprise Infrastructure</span>
               </div>
               <h1 class="text-6xl md:text-7xl font-black mb-8 leading-[0.9] text-foreground">
                  The Infrastructure <br />
                  of <span class="text-gradient">AI Conversation.</span>
               </h1>
               <p class="text-xl text-foreground/60 mb-12 max-w-lg leading-relaxed font-semibold">
                  ReplySuite is the premium automation layer for 2026 digital-native brands.
                  Train your unique AI workforce on brand data and deploy anywhere in minutes.
               </p>

               <div class="flex flex-col sm:flex-row gap-6 relative z-10 transition-all items-center">
                  <NuxtLink :to="user ? '/dashboard' : '/login'"
                     class="btn-gradient px-12 py-5 text-lg flex items-center justify-center gap-3 group w-full sm:w-auto">
                     {{ user ? 'Access Executive Hub' : 'Deploy Your First Agent' }}
                     <ArrowRight class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </NuxtLink>
                  <button
                     class="px-10 py-5 text-foreground/60 hover:text-foreground transition-all text-base font-bold flex items-center justify-center gap-3 group border border-foreground/5 hover:border-foreground/10 rounded-full hover:bg-foreground/[0.02]">
                     <div class="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all">
                        <Play class="w-3 h-3 fill-current ml-0.5" />
                     </div>
                     Watch Demo
                  </button>
               </div>

               <!-- Social Proof -->
               <div
                  class="mt-24 flex items-center gap-10 opacity-50 grayscale hover:opacity-100 transition-all duration-1000">
                  <div v-for="logo in trustedLogos" :key="logo.name" class="flex items-center gap-2 group">
                     <component :is="logo.icon" class="w-5 h-5 text-foreground/70 group-hover:text-primary transition-colors" />
                     <span class="text-xs font-bold text-foreground/60 uppercase group-hover:text-primary transition-colors">{{ logo.name }}</span>
                  </div>
               </div>
            </div>

            <!-- Visual Asset: Chat Simulation -->
            <div class="relative hidden lg:block">
               <div class="glass-card p-3 border-foreground/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] transition-all duration-1000">
                  <div
                     class="bg-background-card rounded-[28px] overflow-hidden aspect-[4/5] relative border border-foreground/5 shadow-inner">
                     <!-- Premium Chat Header -->
                     <div class="p-6 border-b border-foreground/10 flex items-center justify-between bg-foreground/[0.02]">
                        <div class="flex items-center gap-4">
                           <div class="relative">
                              <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-primary-accent p-0.5 shadow-lg shadow-primary/20">
                                 <div class="w-full h-full rounded-2xl bg-background flex items-center justify-center">
                                    <Bot class="text-primary w-6 h-6" />
                                 </div>
                              </div>
                              <div class="absolute -right-1 -bottom-1 w-3.5 h-3.5 bg-green-500 border-4 border-background-card rounded-full shadow-sm"></div>
                           </div>
                           <div>
                              <div class="text-sm font-black uppercase">RS Core Infrastructure</div>
                              <div class="text-[10px] text-foreground/40 font-bold uppercase tracking-widest mt-0.5">Cluster-01 Active</div>
                           </div>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center hover:bg-foreground/10 transition-colors cursor-pointer">
                           <Settings class="w-5 h-5 text-foreground/40" />
                        </div>
                     </div>

                     <!-- Chat Messages -->
                     <div class="p-8 space-y-6 h-[420px] overflow-y-auto scrollbar-hide flex flex-col">
                        <div v-for="(msg, idx) in chatMessages" :key="idx"
                           :class="['flex', msg.role === 'user' ? 'justify-start' : 'justify-end']">
                           <div :class="[
                              'p-5 rounded-3xl text-sm transition-all animate-in fade-in slide-in-from-bottom-3 duration-500',
                              msg.role === 'user'
                                 ? 'bg-foreground/5 border border-foreground/5 rounded-tl-none max-w-[85%] text-foreground font-medium'
                                 : 'bg-primary text-black font-black rounded-tr-none max-w-[85%] shadow-xl shadow-primary/20'
                           ]">
                              {{ msg.content }}
                           </div>
                        </div>

                        <!-- Typing Indicator -->
                        <div v-if="isChatLoading" class="flex justify-end animate-pulse">
                           <div class="bg-primary/10 border border-primary/20 px-6 py-4 rounded-3xl rounded-tr-none">
                              <div class="flex gap-2">
                                 <div class="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                 <div class="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                 <div class="w-1.5 h-1.5 bg-primary rounded-full"></div>
                              </div>
                           </div>
                        </div>
                     </div>

                     <!-- Modern Input Field -->
                     <div class="absolute bottom-6 left-6 right-6">
                        <form @submit.prevent="sendDemoMessage"
                           class="relative flex items-center group/form">
                           <input v-model="chatInput" placeholder="System prompt here..."
                              class="w-full bg-foreground/[0.04] rounded-2xl pl-6 pr-14 py-4 border border-foreground/10 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/40 focus:bg-background-card transition-all font-bold shadow-inner" />
                           <button type="submit" :disabled="!chatInput.trim() || isChatLoading"
                              class="absolute right-2 w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-20">
                              <Send class="w-4 h-4" />
                           </button>
                        </form>
                     </div>
                  </div>
               </div>

               <!-- Decorative Background Blur -->
               <div class="absolute -z-10 -right-20 -bottom-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-pulse"></div>
            </div>
         </div>
      </div>

      <!-- Features Section -->
      <section id="features" class="max-w-7xl mx-auto px-6 py-32 border-t border-foreground/5">
         <div class="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
            <div class="max-w-2xl">
               <span class="badge-gradient mb-6">Features</span>
               <h2 class="text-5xl md:text-7xl font-extrabold leading-none text-foreground">
                  Automation for <br /> the <span class="text-gradient">Elite.</span>
               </h2>
            </div>
            <p class="text-foreground/50 max-w-sm text-right font-medium">
               We've refined every interaction to feel premium. No bot-like responses, only sophisticated AI
               conversations.
            </p>
         </div>

         <div class="grid md:grid-cols-3 gap-8">
            <div v-for="feat in marketingFeatures" :key="feat.title"
               class="glass-card p-10 border-foreground/5 group hover:border-primary/20 transition-all duration-500">
               <div
                  class="w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center mb-10 group-hover:scale-110 group-hover:bg-primary/10 transition-all">
                  <component :is="feat.icon" class="text-primary w-8 h-8" />
               </div>
               <h3 class="text-2xl font-bold mb-4">{{ feat.title }}</h3>
               <p class="text-foreground/50 text-sm leading-relaxed mb-8">{{ feat.desc }}</p>
               <div class="w-full h-1 bg-foreground/5 rounded-full overflow-hidden">
                  <div class="h-full bg-primary w-0 group-hover:w-full transition-all duration-1000 ease-in-out"></div>
               </div>
            </div>
         </div>
      </section>

      <!-- Global Reach -->
      <section class="max-w-7xl mx-auto px-6 py-40 border-t border-foreground/5 relative">
         <div class="grid lg:grid-cols-2 gap-20 items-center">
            <div>
               <span class="badge-gradient mb-8 uppercase tracking-[0.2em] text-[10px]">Global Expansion</span>
               <h2 class="text-5xl md:text-7xl font-extrabold mb-10 leading-tight text-foreground">
                  Beyond <br />
                  <span class="text-gradient leading-none">Borders.</span>
               </h2>
               <p class="text-lg text-foreground/50 leading-relaxed font-medium mb-12">
                  While the U.S. remains our high-ticket anchor, ReplySuite is architected for global volume. We are the
                  default infrastructure for the <strong>India-Brazil-Indonesia</strong> corridor, where WhatsApp is the
                  operating system of daily commerce.
               </p>
               <div class="space-y-6">
                  <div v-for="market in [
                     { name: 'India', stat: '532M+ Users', desc: 'Conversational Commerce Hub' },
                     { name: 'Brazil', stat: '98% Adoption', desc: 'Real Estate & Hospitality Focus' },
                     { name: 'Indonesia', stat: '94M+ Users', desc: 'Social Commerce Standard' }
                  ]" :key="market.name"
                     class="flex items-center gap-6 p-6 rounded-3xl bg-foreground/[0.02] border border-foreground/5 group hover:border-primary/20 transition-all">
                     <div
                        class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xs uppercase tracking-widest">
                        {{ market.name.substring(0, 2) }}
                     </div>
                     <div>
                        <div class="text-foreground font-bold"> {{ market.name }} — {{ market.stat }}
                        </div>
                        <div class="text-xs text-foreground/50 font-medium">{{ market.desc }}</div>
                     </div>
                  </div>
               </div>
            </div>
            <div class="relative">
               <div class="glass-card p-10 border-foreground/5 relative overflow-hidden group">
                  <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div class="flex items-center gap-4 mb-6">
                     <div
                        class="w-10 h-10 rounded-xl bg-foreground/5 border border-foreground/10 flex items-center justify-center text-lg">
                        🇺🇸</div>
                     <h4 class="text-lg font-bold text-foreground uppercase">North America</h4>
                  </div>
                  <p class="text-foreground/50 text-sm leading-relaxed font-medium mb-6">
                     High-performance infrastructure aligned with <b>SOC 2 Type II</b> and <b>CCPA/CPRA</b>
                     standards for enterprise U.S. clients.
                  </p>
                  <div class="flex items-center gap-2 text-[10px] font-bold text-primary tracking-widest uppercase">
                     <CheckCircle2 class="w-3 h-3" />
                     Enterprise Ready
                  </div>
               </div>
               <div class="absolute inset-0 bg-primary/10 blur-[100px] rounded-full"></div>
               <div class="glass-card p-12 relative z-10 border-primary/20 mt-4">
                  <div class="flex items-center gap-4 mb-8">
                     <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <Globe2 class="w-5 h-5" />
                     </div>
                     <h3 class="text-xl font-bold text-foreground">The Kigali Advantage</h3>
                  </div>
                  <p class="text-foreground/50 font-medium mb-8 leading-relaxed">
                     Operating from the heart of Kigali, we are uniquely positioned to bridge the gap between global AI
                     standards and local African context. Our <strong>Kinyarwanda-native models</strong> provide a moat
                     that international competitors cannot easily match.
                  </p>
                  <div class="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-[10px]">
                     Scale your brand in Africa
                     <ArrowRight class="w-4 h-4" />
                  </div>
               </div>
            </div>
         </div>
      </section>

      <!-- Global Linguistic Reach -->
      <section class="max-w-7xl mx-auto px-6 py-20 relative overflow-hidden">
         <div class="glass-card p-12 border-foreground/5 relative overflow-hidden group">
            <div class="absolute inset-0 bg-primary/5 -z-10 group-hover:bg-primary/10 transition-colors duration-700"></div>
            <div class="flex flex-col lg:flex-row items-center justify-between gap-16">
               <div class="max-w-xl">
                  <div class="flex items-center gap-3 mb-6">
                     <div class="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                        <Globe2 class="w-5 h-5" />
                     </div>
                     <span class="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Polyglot Intelligence</span>
                  </div>
                  <h2 class="text-4xl md:text-5xl font-black text-foreground mb-8 leading-tight">
                     Universal <span class="text-gradient">Linguistic</span> <br />
                     Architecture.
                  </h2>
                  <p class="text-lg text-foreground/50 leading-relaxed font-medium">
                     ReplySuite agents are trained on massive localized datasets to ensure high-fidelity interactions in 
                     regional dialects and global languages. From <b>Kinyarwanda</b> to <b>Mandarin</b>, your brand 
                     speaks the language of your customer.
                  </p>
               </div>
               
               <div class="grid grid-cols-2 md:grid-cols-3 gap-4 w-full lg:w-auto shrink-0">
                  <div v-for="lang in [
                     { name: 'Kinyarwanda', flag: '🇷🇼' },
                     { name: 'English', flag: '🇺🇸' },
                     { name: 'French', flag: '🇫🇷' },
                     { name: 'Swahili', flag: '🇹🇿' },
                     { name: 'Chinese', flag: '🇨🇳' },
                     { name: 'Spanish', flag: '🇪🇸' },
                     { name: 'Portuguese', flag: '🇵🇹' },
                     { name: 'German', flag: '🇩🇪' },
                     { name: 'Kirundi', flag: '🇧🇮' }
                  ]" :key="lang.name"
                     class="px-6 py-4 rounded-2xl bg-foreground/[0.02] border border-foreground/5 flex items-center gap-4 hover:border-primary/30 hover:bg-primary/[0.02] transition-all group/lang">
                     <span class="text-xl grayscale group-hover/lang:grayscale-0 transition-all">{{ lang.flag }}</span>
                     <span class="text-[11px] font-black text-foreground/60 group-hover/lang:text-primary uppercase tracking-widest">{{ lang.name }}</span>
                  </div>
               </div>
            </div>
         </div>
      </section>

      <!-- Multi-Channel Roadmap Section -->
      <section class="max-w-7xl mx-auto px-6 py-32 border-t border-foreground/5 relative overflow-hidden">
         <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 translate-y-1/2"></div>

         <div class="text-center mb-20">
            <span class="badge-gradient mb-6">Roadmap</span>
            <h2 class="text-5xl md:text-7xl font-extrabold text-foreground">
               The future is <span class="text-gradient">Limitless.</span>
            </h2>
         </div>

         <div class="grid grid-cols-2 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div v-for="channel in channelFeatures" :key="channel.name"
               class="glass-card p-8 border-foreground/5 text-center group hover:border-primary/20 transition-all">
               <div
                  class="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/10">
                  <component :is="channel.icon" class="w-6 h-6 text-primary" />
               </div>
               <div class="text-sm font-bold mb-2 text-foreground">{{ channel.title }}</div>
               <div class="text-[10px] font-semibold text-foreground/50 uppercase tracking-widest">Active Infrastructure
               </div>
            </div>
         </div>
      </section>

      <!-- Pricing Section -->
      <section id="pricing" class="max-w-7xl mx-auto px-6 py-32 border-t border-foreground/5">
         <div class="text-center mb-24">
            <span class="badge-gradient mb-6">Investment</span>
            <h2 class="text-5xl md:text-7xl font-extrabold text-foreground">
               Choose your <span class="text-gradient">Empire Class.</span>
            </h2>
            <p class="text-foreground/50 mt-6 max-w-xl mx-auto font-medium">Choose the perfect plan for your brand
               growth. From startups to high-volume global brands.</p>
         </div>

         <div class="grid lg:grid-cols-3 gap-8">
            <div v-for="plan in plans" :key="plan.name"
               class="glass-card p-10 flex flex-col relative transition-all duration-500 hover:-translate-y-4 border-foreground/5"
               :class="plan.popular ? 'border-primary/40 !bg-primary/[0.03]' : ''">
               <div v-if="plan.popular"
                  class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-black text-[10px] font-bold tracking-widest rounded-full uppercase">
                  Elite Choice
               </div>

               <div class="mb-8">
                  <h3 class="text-2xl font-bold mb-2">{{ plan.name }}</h3>
                  <p class="text-xs text-foreground/50 font-medium">{{ plan.desc }}</p>
               </div>

               <div class="mb-10 flex items-baseline gap-2">
                  <span class="text-5xl font-extrabold text-foreground">${{ plan.price }}</span>
                  <span class="text-foreground/50 font-bold tracking-widest text-[10px] uppercase">/mo</span>
               </div>

               <button @click="handleSelect(plan)" :disabled="isProcessing === plan.id"
                  class="w-full py-5 rounded-full font-bold text-center mb-10 transition-all tracking-widest text-xs flex items-center justify-center gap-2"
                  :class="plan.popular ? 'btn-gradient' : 'bg-foreground/5 hover:bg-foreground/10 text-foreground border border-foreground/10 hover:border-foreground/20'">
                  <template v-if="isProcessing === plan.id">
                     <Loader2 class="w-4 h-4 animate-spin" />
                     Processing...
                  </template>
                  <template v-else>
                     {{ isAuthenticated ? (plan.id === 'starter' ? 'Activate Free' : 'Select Plan') : (plan.id ===
                        'gold' ? 'Get Started' : 'Start Free Month') }}
                  </template>
               </button>

               <div class="space-y-4 flex-grow">
                  <div v-for="feat in plan.features" :key="feat"
                     class="flex items-center gap-3 text-xs font-medium text-foreground/50">
                     <div class="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Check class="w-2.5 h-2.5 text-primary" />
                     </div>
                     {{ feat }}
                  </div>
               </div>
            </div>
         </div>
      </section>

      <!-- Final CTA Section -->
      <section class="max-w-5xl mx-auto px-6 py-32">
         <div
            class="bg-foreground/[0.03] p-20 rounded-[40px] border border-foreground/5 text-center relative overflow-hidden backdrop-blur-sm">
            <div class="absolute inset-0 bg-primary/5 blur-[120px]"></div>

            <h2 class="text-5xl md:text-7xl font-extrabold mb-12 relative z-10 leading-tight text-foreground">
               Ready to build your <br />
               <span class="text-foreground/50">AI Workforce?</span>
            </h2>

            <NuxtLink to="/register"
               class="bg-foreground text-background px-12 py-6 rounded-full font-bold text-xl inline-flex items-center gap-3 relative z-10 hover:bg-foreground/90 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-foreground/10">
               Get Started Free
            </NuxtLink>

            <p class="text-foreground/50 mt-12 text-xs relative z-10 tracking-[0.2em] font-bold uppercase">
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
