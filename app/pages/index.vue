<script setup lang="ts">
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
  Coffee
} from 'lucide-vue-next'

definePageMeta({
  layout: 'default'
})

const user = useSupabaseUser()

const trustedLogos = [
  { name: 'GrowthX', icon: BarChart3 },
  { name: 'Valant', icon: ShieldCheck },
  { name: 'Savory', icon: Coffee },
  { name: 'Sagacity', icon: Zap }
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
    title: 'Automate',
    desc: 'Connect Instagram. Watch your AI handle comments and DMs while you scale.'
  }
]

const instagramFeatures = [
  { 
    title: 'Smart Rules', 
    desc: 'Trigger responses based on specific keywords or emoji patterns in comments.' 
  },
  { 
    title: 'Instant DMing', 
    desc: 'Automatically send a personalized direct message the moment a rule is met.' 
  }
]
</script>

<template>
  <div class="relative overflow-hidden">
     <!-- Hero Section -->
     <div class="relative pt-20 pb-20 mt-[10vh] md:pt-32 md:pb-32 overflow-hidden">
        <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>
        
        <div class="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
           <div>
              <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black tracking-widest mb-8 animate-bounce">
                 <Zap class="w-3 h-3 fill-current" />
                 ready to automate
              </div>
              <h1 class="text-6xl md:text-8xl font-black mb-8 leading-[0.9] tracking-tight">
                 the gold <br />
                 <span class="text-gradient">standard</span> <br />
                 of dm's.
              </h1>
              <p class="text-xl text-gray-500 mb-12 max-w-lg leading-relaxed font-medium">
                 ReplySuite turns Every Instagram comment into a sales opportunity. Train your AI on your brand and let it close deals while you sleep.
              </p>
              
              <div class="flex flex-col sm:flex-row gap-6 relative z-10 transition-all">
                 <NuxtLink 
                   :to="user ? '/dashboard' : '/login'" 
                   class="btn-gradient px-10 py-5 text-lg flex items-center justify-center gap-3 group"
                 >
                    {{ user ? 'Go to Dashboard' : 'Start Free Month' }}
                    <ArrowRight class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                 </NuxtLink>
                 <button class="px-10 py-5 rounded-full border border-white/10 hover:bg-white/5 transition-all text-lg font-bold flex items-center justify-center gap-3">
                    <Play class="w-5 h-5 fill-current" />
                    How it works
                 </button>
              </div>

              <!-- Social Proof -->
              <div class="mt-20 flex items-center gap-8 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                  <div v-for="logo in trustedLogos" :key="logo.name" class="flex items-center gap-2">
                     <component :is="logo.icon" class="w-5 h-5 text-white" />
                     <span class="text-sm font-black tracking-widest">{{ logo.name }}</span>
                  </div>
              </div>
           </div>

           <!-- Visual Asset: Chat Simulation -->
           <div class="relative perspective-1000 hidden lg:block">
              <div class="glass-card p-2 border-white/10 rotate-y-[-10deg] rotate-x-[5deg] shadow-2xl skew-x-[-1deg] hover:rotate-0 transition-all duration-1000">
                 <div class="bg-black/40 rounded-3xl overflow-hidden aspect-[4/5] relative border border-white/5 backdrop-blur-md">
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
                    <div class="p-8 space-y-6">
                       <div class="flex justify-start">
                          <div class="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-tl-none max-w-[80%] text-sm">
                             "How does the pricing work?"
                          </div>
                       </div>
                       <div class="flex justify-end">
                           <div class="bg-primary/10 border border-primary/20 p-4 rounded-2xl rounded-tr-none max-w-[80%] text-sm">
                              "hey! we have 3 plans: free ($0), silver ($8.88), and gold ($26.88). would you like to see a comparison?"
                           </div>
                       </div>
                       <div class="flex justify-start animate-pulse">
                          <div class="bg-white/5 border border-white/5 p-4 rounded-lg px-6">
                             <div class="flex gap-1">
                                <div class="w-1 h-1 bg-gray-500 rounded-full"></div>
                                <div class="w-1 h-1 bg-gray-500 rounded-full"></div>
                                <div class="w-1 h-1 bg-gray-500 rounded-full"></div>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div class="absolute bottom-6 left-6 right-6 flex gap-2 font-bold tracking-tight">
                       <div class="flex-grow bg-white/5 rounded-full px-5 py-3 border border-white/5 text-sm text-gray-500">
                         Ask me anything...
                       </div>
                       <div class="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                         <ArrowRight class="text-black w-6 h-6" />
                       </div>
                    </div>
                 </div>
              </div>

              <!-- Floating Badges -->
              <div class="absolute -top-10 -right-10 glass-card p-6 border-primary/20 animate-float">
                 <Bot class="text-primary w-8 h-8 mb-2" />
                 <div class="text-xs font-bold tracking-widest">ai trained</div>
              </div>
              <div class="absolute -bottom-10 -left-10 glass-card p-6 border-primary/20 animate-float-delayed">
                 <CheckCircle2 class="text-primary w-8 h-8 mb-2" />
                 <div class="text-xs font-bold tracking-widest">verified human</div>
              </div>
           </div>
        </div>
     </div>

     <!-- Features Section -->
     <section id="features" class="max-w-7xl mx-auto px-6 py-32 border-t border-white/5">
        <div class="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
            <div class="max-w-2xl">
               <span class="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-widest mb-6">features</span>
               <h2 class="text-5xl md:text-7xl font-bold tracking-tighter leading-none">
                  automation for the <br /> <span class="text-primary font-black tracking-widest">elite.</span>
               </h2>
            </div>
           <p class="text-gray-500 max-w-sm text-right font-medium">
              We've refined every interaction to feel premium. No bot-like responses, only sophisticated AI conversations.
           </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
           <div v-for="i in 3" :key="i" class="glass-card p-10 border-white/5 group hover:border-primary/20 transition-all duration-500">
              <div class="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-10 group-hover:scale-110 group-hover:bg-primary/10 transition-all">
                 <component :is="i === 1 ? Bot : i === 2 ? BrainCircuit : Instagram" class="text-primary w-8 h-8" />
              </div>
              <h3 class="text-2xl font-bold mb-4 tracking-tight">{{ i === 1 ? 'AI Personalities' : i === 2 ? 'Knowledge Base' : 'IG Integration' }}</h3>
              <p class="text-gray-500 text-sm leading-relaxed mb-8">
                 {{ i === 1 ? 'Fine-tune your bot to sound exactly like your brand voice.' : i === 2 ? 'Upload your PDFs and let the AI learn your business inside out.' : 'Seamlessly connect your Instagram professional account in one click.' }}
              </p>
              <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                 <div class="h-full bg-primary w-0 group-hover:w-full transition-all duration-1000 ease-in-out"></div>
              </div>
           </div>
        </div>
     </section>

     <!-- Final CTA Section -->
     <section class="max-w-5xl mx-auto px-6 py-32">
        <div class="bg-white/5 p-20 rounded-[40px] border border-white/5 text-center relative overflow-hidden backdrop-blur-sm">
           <div class="absolute inset-0 bg-primary/5 blur-[120px]"></div>
           
           <h2 class="text-5xl md:text-7xl font-bold mb-12 relative z-10 leading-tight">
             Ready to build your <br />
             <span class="text-gray-400">AI Workforce?</span>
           </h2>
           
           <NuxtLink to="/register" class="bg-white text-black px-10 py-5 rounded-full font-bold text-xl inline-flex items-center gap-3 relative z-10 hover:bg-gray-200 transition-colors tracking-[0.2em]">
              get started free
           </NuxtLink>
           
           <p class="text-gray-500 mt-12 text-sm relative z-10 tracking-widest font-black">
             no credit card required • 30-day free month • cancel anytime
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
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

.animate-float-delayed {
  animation: float 6s ease-in-out infinite;
  animation-delay: 3s;
}
</style>
