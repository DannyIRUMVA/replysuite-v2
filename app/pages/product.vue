<script setup lang="ts">
useHead({ title: 'The Platform | ReplySuite AI' })

import { Play, ShieldCheck, Database, Layers, Smartphone, Layout, UserPlus, Zap, Globe2, ArrowRight } from 'lucide-vue-next'

definePageMeta({
  layout: 'default'
})

const workflow = [
  { step: '01', title: 'Train Your AI', desc: 'Sync your brand documents, FAQs, and tone of voice guides.', icon: Database },
  { step: '02', title: 'Embed Script', desc: 'Securely integrate your trained AI into any website with one line of code.', icon: Globe2 },
  { step: '03', title: 'Scale Engagement', desc: 'Watch your AI handle thousands of inquiries instantly.', icon: Zap }
]
</script>

<template>
  <div class="relative">
      <!-- Hero -->
      <section class="max-w-7xl mx-auto px-6 py-32 grid lg:grid-cols-2 gap-16 items-center">
        <div class="relative z-10">
           <span class="badge-gradient mb-6">The Platform</span>
           <h1 class="text-6xl md:text-8xl font-extrabold mb-8 leading-[0.9] tracking-tight text-white">
              Autonomy <br />
              <span class="text-gradient">Redefined.</span>
           </h1>
           <p class="text-xl text-gray-500 mb-12 max-w-lg leading-relaxed font-medium">
             ReplySuite is a sophisticated AI-driven marketing automation platform designed for modern brands. We bridge the gap between complex data and human-like precision.
           </p>
           <div class="flex flex-col sm:flex-row items-center gap-6">
              <NuxtLink to="/register" class="w-full sm:w-auto btn-gradient px-10 py-5 text-lg flex items-center justify-center gap-3">
                 Start Building
                 <Zap class="w-5 h-5 fill-current" />
              </NuxtLink>
              <button class="w-full sm:w-auto px-10 py-5 rounded-full border border-white/10 hover:bg-white/5 transition-all text-lg font-bold flex items-center justify-center gap-3">
                 <Play class="w-5 h-5 fill-current" />
                 Watch Demo
              </button>
           </div>
        </div>
        
        <div class="relative group">
           <div class="absolute -inset-10 bg-primary/10 blur-[100px] rounded-full group-hover:bg-primary/20 transition-all duration-1000"></div>
           <div class="aspect-square glass-card border-white/10 p-2 overflow-hidden bg-black/40 backdrop-blur-xl relative z-10">
              <div class="w-full h-full bg-[#050505] rounded-24 border border-white/5 flex flex-col p-10 overflow-hidden">
                 <!-- Mock UI header -->
                 <div class="flex items-center justify-between mb-12 pb-8 border-b border-white/5">
                    <div class="flex items-center gap-4">
                       <div class="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                          <Zap class="w-6 h-6 text-primary" />
                       </div>
                       <div>
                          <div class="h-3 w-32 bg-white/10 rounded-full mb-2"></div>
                          <div class="h-2 w-20 bg-white/5 rounded-full"></div>
                       </div>
                    </div>
                    <div class="flex gap-3">
                       <div class="w-4 h-4 rounded-full bg-white/5"></div>
                       <div class="w-4 h-4 rounded-full bg-white/5"></div>
                    </div>
                 </div>
                 <!-- Mock UI content -->
                 <div class="space-y-8">
                    <div class="space-y-3">
                       <div class="h-3 w-full bg-white/5 rounded-full"></div>
                       <div class="h-3 w-full bg-white/5 rounded-full"></div>
                       <div class="h-3 w-2/3 bg-white/5 rounded-full"></div>
                    </div>
                    <div class="h-40 w-full bg-primary/[0.02] border border-primary/10 rounded-3xl flex flex-col items-center justify-center gap-4 group/box overflow-hidden relative">
                       <div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover/box:opacity-100 transition-opacity"></div>
                       <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover/box:scale-110 transition-transform relative z-10">
                          <ShieldCheck class="w-8 h-8 text-primary" />
                       </div>
                       <div class="h-2 w-24 bg-primary/20 rounded-full relative z-10"></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      <!-- Workflow Section -->
      <section class="max-w-7xl mx-auto px-6 py-40 border-t border-white/5">
        <div class="text-center mb-32">
           <h2 class="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 text-white">The <span class="text-gradient">Process.</span></h2>
           <p class="text-gray-500 max-w-lg mx-auto font-medium">Three steps to achieving absolute conversation freedom.</p>
        </div>
        
        <div class="grid md:grid-cols-3 gap-20">
          <div v-for="w in workflow" :key="w.step" class="relative group">
            <div class="text-[120px] font-extrabold text-white/[0.02] absolute -top-20 -left-10 group-hover:text-primary transition-colors duration-1000 leading-none select-none">
              {{ w.step }}
            </div>
            <div class="relative z-10">
               <div class="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-primary mb-10 group-hover:bg-primary group-hover:text-black transition-all duration-500 group-hover:-translate-y-2 border border-white/10 group-hover:border-primary/50">
                  <component :is="w.icon" class="w-10 h-10" />
               </div>
               <h3 class="text-2xl font-bold mb-6 tracking-tight text-white">{{ w.title }}</h3>
               <p class="text-gray-500 leading-relaxed font-medium">{{ w.desc }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Elite Features -->
      <section class="bg-white/[0.02] py-40 border-y border-white/5 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-[120px]"></div>
        <div class="max-w-7xl mx-auto px-6 relative z-10">
           <div class="grid lg:grid-cols-4 gap-12">
              <div v-for="item in [
                 { title: 'Real-time Monitoring', icon: Smartphone, desc: 'Track every conversation as it happens.' },
                 { title: 'Elite Encryption', icon: ShieldCheck, desc: 'Your data is secured by industry standards.' },
                 { title: 'Scenario Library', icon: Layout, desc: 'Switch between brand personalities in one click.' },
                 { title: 'Team Sync', icon: UserPlus, desc: 'Collaborate with your entire support team.' }
              ]" :key="item.title" class="glass-card p-8 border-white/5 hover:border-primary/20 transition-all text-center">
                 <div class="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
                    <component :is="item.icon" class="w-8 h-8 text-primary" />
                 </div>
                 <h4 class="text-xl font-bold mb-4 tracking-tight">{{ item.title }}</h4>
                 <p class="text-sm text-gray-500 font-medium leading-relaxed">{{ item.desc }}</p>
              </div>
           </div>
        </div>
      </section>

      <!-- Summary CTA -->
      <section class="max-w-5xl mx-auto px-6 py-40 text-center relative">
         <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full"></div>
         <h2 class="text-5xl md:text-8xl font-extrabold mb-16 relative z-10 tracking-tighter leading-[0.85] text-white">
            Scale your <br />
            <span class="text-gradient">Presence.</span>
         </h2>
         <NuxtLink to="/register" class="btn-gradient px-12 py-6 text-xl relative z-10 inline-flex items-center gap-4 group">
            Get Started Now
            <ArrowRight class="w-6 h-6 group-hover:translate-x-2 transition-transform" />
         </NuxtLink>
         <p class="text-gray-500 mt-12 text-xs uppercase tracking-[0.2em] font-bold">
            The premium choice for brands who demand the best
         </p>
      </section>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[32px] transition-all duration-500;
}
</style>
