<script setup lang="ts">
import { Users, Sparkles, ShieldCheck, Heart, ArrowRight } from 'lucide-vue-next'

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
        <span class="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-10">Our Story</span>
        <h1 class="text-6xl md:text-9xl font-black mb-12 tracking-tighter leading-[0.85]">
          BEYOND <br />
          <span class="text-gradient">CONVERSATION.</span>
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed font-medium">
          ReplySuite was born from a simple idea: automation should feel human. We're building the infrastructure that helps brands scale without losing their soul.
        </p>
      </section>

      <!-- Mission -->
      <section id="mission" class="max-w-7xl mx-auto px-6 py-32 border-t border-white/5">
        <div class="bg-white/[0.02] p-16 md:p-24 rounded-[48px] border border-white/5 relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-[100px] group-hover:bg-primary/10 transition-all duration-1000"></div>
          <div class="grid lg:grid-cols-2 gap-20 items-center relative z-10">
            <div>
              <h2 class="text-5xl md:text-7xl font-bold mb-10 tracking-tighter italic">
                AI as an <br />
                <span class="text-primary not-italic font-black uppercase tracking-widest leading-none">Extension.</span>
              </h2>
              <p class="text-lg text-gray-400 leading-relaxed font-medium mb-12">
                We believe that every creator, from micro-influencers to global agencies, deserves world-class automation. ReplySuite isn't just a tool; it's a partner that learns, grows, and helps you win back your time.
              </p>
              <div class="flex items-center gap-4 text-primary font-black uppercase tracking-widest text-xs">
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

      <!-- Values -->
      <section class="max-w-7xl mx-auto px-6 py-32 grid md:grid-cols-3 gap-12">
        <div v-for="val in values" :key="val.title" class="glass-card p-12 border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden">
          <div class="absolute -right-8 -bottom-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all"></div>
          <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-10 group-hover:bg-primary group-hover:text-black transition-all">
            <component :is="val.icon" class="w-8 h-8" />
          </div>
          <h3 class="text-2xl font-bold mb-6 tracking-tight uppercase tracking-widest">{{ val.title }}</h3>
          <p class="text-sm text-gray-500 leading-relaxed font-medium">{{ val.desc }}</p>
        </div>
      </section>

      <!-- CTA -->
      <section class="max-w-5xl mx-auto px-6 py-40 text-center">
        <h2 class="text-5xl md:text-8xl font-black mb-16 italic tracking-tighter leading-none">
          LET'S <span class="text-primary not-italic uppercase tracking-widest">BUILD</span> <br />
          TOGETHER.
        </h2>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-8">
           <a href="mailto:support@replysuite.com" class="w-full sm:w-auto btn-gradient px-12 py-5 text-xl">Contact Sales</a>
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
