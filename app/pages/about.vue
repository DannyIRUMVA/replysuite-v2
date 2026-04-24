<script setup lang="ts">
import { Users, Sparkles, ShieldCheck, Heart, ArrowRight } from 'lucide-vue-next'

useSeoMeta({
  title: 'About ReplySuite | Our Story & Mission',
  description: 'Learn the mission behind ReplySuite. We\'re building the sophisticated AI infrastructure that helps modern brands scale their engagement with human-like precision.',
  ogTitle: 'About ReplySuite | Our Mission & Values',
  ogDescription: 'ReplySuite empowers creators and brands with AI-powered chatbots and automation tools.',
  ogUrl: 'https://replysuite.app/about',
  twitterCard: 'summary_large_image',
  twitterTitle: 'About ReplySuite',
  twitterDescription: 'The story and mission behind ReplySuite — AI for brand growth.',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://replysuite.app/about' }]
})

definePageMeta({
  layout: 'default'
})

const values = [
  { 
    title: 'Excellence', 
    desc: 'We strive for the gold standard in every line of code and every customer interaction.',
    icon: Sparkles
  },
  { 
    title: 'Trust', 
    desc: 'Your data security and platform compliance are our absolute top priorities.',
    icon: ShieldCheck
  },
  { 
    title: 'Innovation', 
    desc: 'Pushing the boundaries of what AI can do for modern creators and brands.',
    icon: Heart
  }
]
</script>

<template>
  <div class="relative">
      <!-- Hero -->
      <section class="max-w-7xl mx-auto px-6 py-32 text-center relative">
        <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>
        <span class="badge-gradient mb-10">Our Story</span>
        <h1 class="text-6xl md:text-9xl font-extrabold mb-12 tracking-tighter leading-[0.85] text-white">
          Beyond <br />
          <span class="text-gradient">Conversation.</span>
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed font-medium">
          ReplySuite is an AI-driven marketing automation platform designed for modern brands. We leverage custom knowledge bases to help you scale without losing your soul.
        </p>
      </section>

      <!-- Mission -->
      <section id="mission" class="max-w-7xl mx-auto px-6 py-32 border-t border-white/5">
        <div class="bg-white/[0.02] p-16 md:p-24 rounded-[48px] border border-white/5 relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-[100px] group-hover:bg-primary/10 transition-all duration-1000"></div>
          <div class="grid lg:grid-cols-2 gap-20 items-center relative z-10">
            <div>
              <h2 class="text-5xl md:text-7xl font-extrabold mb-10 tracking-tighter leading-tight text-white">
                AI as an <br />
                <span class="text-gradient leading-none">Extension.</span>
              </h2>
              <p class="text-lg text-gray-400 leading-relaxed font-medium mb-12">
                We believe that every brand deserves world-class automation. ReplySuite isn't just a tool; it's a partner that learns from your data, grows with your business, and helps you win back your time.
              </p>
              <div class="flex items-center gap-4 text-primary font-bold uppercase tracking-[0.2em] text-[10px]">
                Learn more about our technology
                <ArrowRight class="w-4 h-4" />
              </div>
            </div>
            <div class="relative flex justify-center lg:justify-end">
              <div class="w-72 h-72 rounded-[64px] bg-gradient-to-br from-primary/30 to-transparent p-1 group-hover:rotate-6 transition-transform duration-700">
                <div class="w-full h-full rounded-[63px] bg-[#050505] flex items-center justify-center p-12">
                   <Users class="w-24 h-24 text-primary group-hover:scale-110 transition-transform shadow-2xl shadow-primary/20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Vision 2026 -->
      <section class="max-w-7xl mx-auto px-6 py-40 border-t border-white/5 relative overflow-hidden">
        <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 translate-y-1/2"></div>
        <div class="grid lg:grid-cols-2 gap-20 items-center">
          <div class="order-2 lg:order-1">
             <div class="grid grid-cols-2 gap-4">
                <div v-for="i in 4" :key="i" class="h-40 rounded-3xl bg-white/[0.02] border border-white/5 overflow-hidden group">
                   <div class="w-full h-full bg-primary/5 group-hover:bg-primary/10 transition-all flex items-center justify-center">
                      <Zap class="w-8 h-8 text-gray-800" />
                   </div>
                </div>
             </div>
          </div>
          <div class="order-1 lg:order-2">
            <span class="badge-gradient mb-8 uppercase tracking-[0.2em] text-[10px]">Strategic Vision</span>
            <h2 class="text-5xl md:text-7xl font-extrabold mb-10 tracking-tighter leading-tight text-white">
              The Infrastructure <br />
              of <span class="text-gradient">Tomorrow.</span>
            </h2>
            <p class="text-lg text-gray-400 leading-relaxed font-medium mb-12">
              By 2026, we aim to be the silent engine behind every major D2C brand on Earth. Our goal isn't just to automate chats, but to provide the **Infrastructure of AI Conversation**—a seamless layer where brand and customer meet with zero friction and absolute trust.
            </p>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="max-w-5xl mx-auto px-6 py-40 text-center">
        <h2 class="text-5xl md:text-8xl font-extrabold mb-16 tracking-tighter leading-none text-white">
          Let's <span class="text-gradient">Build</span> <br />
          Together.
        </h2>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-8">
           <a href="mailto:partnership@replysuite.app" class="w-full sm:w-auto btn-gradient px-12 py-5 text-xl">Partner With Us</a>
           <NuxtLink to="/pricing" class="w-full sm:w-auto border border-white/10 px-12 py-5 rounded-full hover:bg-white/5 transition-colors text-xl font-bold">View Pricing</NuxtLink>
        </div>
      </section>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[40px] bg-white/[0.02];
}
</style>
