<script setup lang="ts">
import { Users, MessageSquare, Twitter, Github, Disc, Share2, Heart, ArrowRight, Zap } from 'lucide-vue-next'

useSeoMeta({
  title: 'Community | ReplySuite AI Collective',
  description: 'Join thousands of brands and developers building the future of automated engagement.',
})

definePageMeta({
  layout: 'default'
})

const platforms = [
  { name: 'Discord', desc: 'Join our developer hub for real-time support and collaboration.', icon: Disc, color: 'text-[#5865F2]' },
  { name: 'Twitter / X', desc: 'Follow us for the latest AI trends and platform updates.', icon: Twitter, color: 'text-white' },
  { name: 'GitHub', desc: 'Contribute to our open-source tools and SDKs.', icon: Github, color: 'text-gray-400' }
]
</script>

<template>
  <div class="relative min-h-screen">
    <!-- Hero -->
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 text-center relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <span class="badge-gradient mb-10">Collective</span>
      <h1 class="text-5xl sm:text-7xl md:text-8xl font-extrabold mb-8 tracking-tighter leading-[0.85] text-white">
        Built for <br />
        <span class="text-gradient">Builders.</span>
      </h1>
      <p class="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
        Join the ecosystem of forward-thinking brands, agencies, and developers scaling human connection with AI.
      </p>
    </section>

    <!-- Platforms -->
    <section class="max-w-7xl mx-auto px-6 py-20">
      <div class="grid md:grid-cols-3 gap-8">
        <div v-for="p in platforms" :key="p.name" class="glass-card p-12 border-white/5 hover:border-primary/20 transition-all group text-center">
          <div :class="['w-16 h-16 mx-auto rounded-[24px] bg-white/5 flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-500', p.color]">
            <component :is="p.icon" class="w-8 h-8" />
          </div>
          <h3 class="text-2xl font-bold text-white mb-4 tracking-tight">{{ p.name }}</h3>
          <p class="text-sm text-gray-500 leading-relaxed font-medium mb-10">{{ p.desc }}</p>
          <a href="#" class="btn-gradient-outline px-8 py-4 inline-flex items-center gap-3">
            Join {{ p.name }}
            <ArrowRight class="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>

    <!-- Stats / Community Love -->
    <section class="max-w-7xl mx-auto px-6 py-40 border-t border-white/5 relative overflow-hidden">
      <div class="absolute bottom-0 left-0 w-1/3 h-full bg-primary/5 blur-[100px]"></div>
      <div class="grid lg:grid-cols-2 gap-24 items-center">
        <div>
          <h2 class="text-4xl md:text-6xl font-extrabold text-white mb-8 tracking-tighter leading-tight">
            A Growing <br />
            <span class="text-gradient leading-none">Network.</span>
          </h2>
          <div class="grid grid-cols-2 gap-12 mt-16">
            <div v-for="s in [
              { label: 'Community Members', value: '12k+' },
              { label: 'Conversations / Mo', value: '2.5M+' },
              { label: 'Integrations Built', value: '450+' },
              { label: 'Developer Stars', value: '1.2k+' }
            ]" :key="s.label">
              <div class="text-4xl font-extrabold text-white mb-2 tracking-tighter">{{ s.value }}</div>
              <div class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{{ s.label }}</div>
            </div>
          </div>
        </div>
        
        <div class="grid md:grid-cols-2 gap-8">
          <div class="glass-card p-12 border-white/5 bg-white/[0.02]">
             <div class="flex items-center gap-4 mb-10">
                <div class="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center font-bold text-xs">AI</div>
                <div>
                   <div class="text-white font-bold tracking-tight">Alex Rivera</div>
                   <div class="text-xs text-gray-500 font-medium">Head of Growth @ TechScale</div>
                </div>
             </div>
             <p class="text-lg text-gray-400 italic leading-relaxed font-medium mb-10">
              "The ReplySuite community is hands-down the best place to learn about RAG and AI customer support. The weekly office hours have been a game changer for our bot's performance."
             </p>
             <div class="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                Verified Partner
                <Heart class="w-3 h-3 fill-current" />
             </div>
          </div>

          <div class="glass-card p-12 border-white/5 bg-white/[0.02]">
             <div class="flex items-center gap-4 mb-10">
                <div class="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center font-bold text-xs">SM</div>
                <div>
                   <div class="text-white font-bold tracking-tight">Sarah Miller</div>
                   <div class="text-xs text-gray-500 font-medium">CEO @ ModeLuxury</div>
                </div>
             </div>
             <p class="text-lg text-gray-400 italic leading-relaxed font-medium mb-10">
              "Switching from ManyChat to ReplySuite felt like moving from a toy to a professional instrument. The level of AI precision and the supportive developer community is unmatched."
             </p>
             <div class="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                Elite Customer
                <Zap class="w-3 h-3 fill-current" />
             </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="max-w-5xl mx-auto px-6 py-40 text-center">
       <div class="p-20 rounded-[64px] bg-primary/[0.03] border border-primary/10 relative group overflow-hidden">
          <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity blur-[100px]"></div>
          <Zap class="w-16 h-16 text-primary mx-auto mb-10 group-hover:scale-110 transition-transform" />
          <h2 class="text-4xl md:text-6xl font-extrabold text-white mb-8 tracking-tighter">Ready to Scale?</h2>
          <p class="text-gray-400 max-w-xl mx-auto mb-12 text-lg font-medium leading-relaxed">Join thousands of brands who have already automated their growth with ReplySuite.</p>
          <NuxtLink to="/register" class="btn-gradient px-12 py-6 text-xl inline-flex items-center gap-4">
             Join the Collective
             <ArrowRight class="w-6 h-6" />
          </NuxtLink>
       </div>
    </section>
  </div>
</template>

<style scoped>
.glass-card { @apply rounded-[48px]; }
.btn-gradient-outline {
  @apply rounded-full border border-white/10 hover:border-primary/50 transition-all font-bold text-white;
}
</style>
