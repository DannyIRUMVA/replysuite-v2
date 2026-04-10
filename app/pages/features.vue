<script setup lang="ts">
import { Bot, Zap, MessageSquare, Target, Settings, BarChart3, Globe2, Layers, Headphones, Instagram, ArrowRight } from 'lucide-vue-next'

definePageMeta({
  layout: 'default'
})

const features = [
  {
    title: 'AI Persona Training',
    desc: 'Upload your brand documentation and train your AI to speak exactly like your best salesperson.',
    icon: Bot
  },
  {
    title: 'Instagram Auto-DM',
    desc: 'Convert comments to conversations. Automatically reply to posts, stories, and mentions.',
    icon: Instagram
  },
  {
    title: 'Multilingual Support',
    desc: 'Fully optimized for Kinyarwanda, English, and French. Reach your local audience effectively.',
    icon: Globe2
  },
  {
    title: 'Lead Management',
    desc: 'Integrated CRM to track every interaction and capture high-intent leads automatically.',
    icon: Target
  },
  {
    title: 'Advanced Analytics',
    desc: 'Track conversion rates, response times, and sentiment across all your accounts.',
    icon: BarChart3
  },
  {
    title: 'Seamless Integrations',
    desc: 'Connect with Zendesk, WhatsApp, and more in just a few clicks.',
    icon: Layers
  }
]
</script>

<template>
  <div class="relative">
      <!-- Hero -->
      <section class="max-w-7xl mx-auto px-6 py-32 text-center relative">
        <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>
        <span class="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-10">Capabilities</span>
        <h1 class="text-6xl md:text-9xl font-black mb-10 tracking-tighter leading-[0.85]">
          POWERFUL <br />
          <span class="text-gradient">CAPABILITIES.</span>
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed font-medium">
          ReplySuite combines cutting-edge LLMs with robust social automation to give you the ultimate edge in customer engagement.
        </p>
      </section>

      <!-- Feature Grid -->
      <section class="max-w-7xl mx-auto px-6 py-32 grid md:grid-cols-2 lg:grid-cols-3 gap-12 mb-40">
        <div v-for="feat in features" :key="feat.title" class="glass-card p-12 border-white/5 group hover:border-primary/30 transition-all relative overflow-hidden">
          <div class="absolute -right-8 -bottom-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all"></div>
          <div class="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-primary mb-10 group-hover:bg-primary group-hover:text-black transition-all duration-500 border border-white/10 group-hover:border-primary/50 relative z-10">
            <component :is="feat.icon" class="w-10 h-10" />
          </div>
          <h3 class="text-3xl font-bold mb-6 tracking-tight uppercase tracking-widest relative z-10 italic">{{ feat.title }}</h3>
          <p class="text-sm text-gray-500 leading-relaxed font-medium relative z-10">{{ feat.desc }}</p>
        </div>
      </section>

      <!-- Deep Dive Sections -->
      <section class="max-w-7xl mx-auto px-6 space-y-40 mb-40">
        <!-- AI Deep Dive -->
        <div class="grid lg:grid-cols-2 gap-24 items-center">
          <div class="order-2 lg:order-1">
            <h2 class="text-5xl md:text-7xl font-bold mb-10 tracking-tighter italic leading-none">
              Trained on <br />
              <span class="text-primary not-italic font-black uppercase tracking-widest">Your Data.</span>
            </h2>
            <p class="text-gray-400 text-lg mb-12 leading-relaxed font-medium">
              Forget generic chatbots. ReplySuite learns from your PDFs, website, and past conversations to provide hyper-relevant answers that convert.
            </p>
            <div class="space-y-6">
              <div v-for="item in ['Zero-shot learning', 'Context-aware responses', 'Anti-hallucination guardrails']" :key="item" class="flex items-center gap-6 text-sm font-black uppercase tracking-widest text-primary/80">
                <div class="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                   <Zap class="w-3 h-3 text-primary fill-current" />
                </div>
                <span>{{ item }}</span>
              </div>
            </div>
          </div>
          <div class="order-1 lg:order-2">
             <div class="aspect-video glass-card border-white/10 p-12 flex flex-col items-center justify-center relative group bg-black/40 overflow-hidden">
                <div class="absolute inset-0 bg-primary/5 blur-[100px] group-hover:bg-primary/10 transition-all duration-1000"></div>
                <div class="absolute top-6 right-6 px-4 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black text-primary uppercase tracking-[0.2em] relative z-10">GPT-4o Ready</div>
                <div class="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform shadow-2xl shadow-primary/20">
                   <MessageSquare class="w-16 h-16 text-primary" />
                </div>
             </div>
          </div>
        </div>

        <!-- Instagram Deep Dive -->
        <div class="grid lg:grid-cols-2 gap-24 items-center">
          <div>
             <div class="aspect-video glass-card border-white/10 p-12 flex flex-col items-center justify-center relative group bg-black/40 overflow-hidden">
                <div class="absolute inset-0 bg-primary/5 blur-[100px] group-hover:bg-primary/10 transition-all duration-1000"></div>
                <div class="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform shadow-2xl shadow-primary/20">
                   <Instagram class="w-16 h-16 text-primary" />
                </div>
             </div>
          </div>
          <div>
            <h2 class="text-5xl md:text-7xl font-bold mb-10 tracking-tighter italic leading-none">
              Instagram <br />
              <span class="text-primary not-italic font-black uppercase tracking-widest">Mastery.</span>
            </h2>
            <p class="text-gray-400 text-lg mb-12 leading-relaxed font-medium">
              Automate the grunt work so you can focus on creativity. From reply triggers to direct sales in DMs, we handle it all with precision.
            </p>
             <NuxtLink to="/register" class="btn-gradient inline-flex items-center gap-4 px-10 py-5 text-lg group">
              Explore Integration 
              <ArrowRight class="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- Bottom Banner -->
      <section class="max-w-5xl mx-auto px-6 py-40 text-center relative">
        <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full"></div>
        <h2 class="text-5xl md:text-8xl font-black mb-12 relative z-10 italic tracking-tighter leading-none">
          READY TO <span class="text-primary not-italic uppercase tracking-widest">DOMINATE?</span>
        </h2>
        <NuxtLink to="/register" class="bg-white text-black px-12 py-6 rounded-full font-black text-xl inline-flex items-center gap-4 relative z-10 hover:bg-gray-200 transition-colors uppercase tracking-[0.2em]">
          Get Started For Free
          <ArrowRight class="w-6 h-6" />
        </NuxtLink>
        <p class="text-gray-600 mt-12 text-sm uppercase tracking-widest font-black">
          No credit card required • 30-day free month
        </p>
      </section>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[48px] bg-white/[0.02];
}
</style>
