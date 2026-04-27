<script setup lang="ts">
import { Bot, Zap, MessageSquare, Target, Settings, BarChart3, Globe2, Layers, Headphones, Instagram, ArrowRight, Slack, MessageCircle, Send } from 'lucide-vue-next'

useSeoMeta({
  title: 'Features | AI Automation for Every Channel',
  description: 'Explore all ReplySuite features: trainable AI chatbots, Instagram DM automation, WhatsApp replies, website embeds, and real-time analytics. One platform, every channel.',
  ogTitle: 'ReplySuite Features | Multi-Channel AI Automation',
  ogDescription: 'Trainable chatbots, Instagram DM automation, WhatsApp, website embeds & analytics — all in one platform.',
  ogUrl: 'https://replysuite.app/features',
  twitterCard: 'summary_large_image',
  twitterTitle: 'ReplySuite Features',
  twitterDescription: 'AI-powered live chat for Instagram, WhatsApp, and your website.',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://replysuite.app/features' }]
})

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
    title: 'Website Integration',
    desc: 'Embed your custom AI on any website via a simple script. Handle inquiries with zero latency.',
    icon: Globe2
  },
  {
    title: 'Multi-Channel',
    desc: 'ROADMAP: Scalable integrations for Instagram, WhatsApp, and Slack coming very soon.',
    icon: Layers
  },
  {
    title: 'Lead Management',
    desc: 'Integrated CRM to track every interaction and capture high-intent leads automatically.',
    icon: Target
  },
  {
    title: 'Advanced Analytics',
    desc: 'Track conversion rates, response times, and sentiment across all your channels.',
    icon: BarChart3
  },
  {
    title: 'Custom Logic',
    desc: 'COMING SOON: Build complex automation trees and specialized rules for your brand.',
    icon: Zap
  }
]
</script>

<template>
  <div class="relative">
      <!-- Hero -->
      <section class="max-w-7xl mx-auto px-6 py-32 text-center relative">
        <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>
        <span class="badge-gradient mb-10">Capabilities</span>
        <h1 class="text-6xl md:text-9xl font-extrabold mb-10 tracking-tighter leading-[0.85] text-foreground">
          Powerful <br />
          <span class="text-gradient">Capabilities.</span>
        </h1>
        <p class="text-xl text-foreground/50 max-w-2xl mx-auto leading-relaxed font-medium">
          ReplySuite combines cutting-edge LLMs with sophisticated AI infrastructure to give you the ultimate edge in customer engagement.
        </p>
      </section>

      <!-- Feature Grid -->
      <section class="max-w-7xl mx-auto px-6 py-32 grid md:grid-cols-2 lg:grid-cols-3 gap-12 mb-40">
        <div v-for="feat in features" :key="feat.title" class="glass-card p-12 border-foreground/5 group hover:border-primary/30 transition-all relative overflow-hidden">
          <div class="absolute -right-8 -bottom-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all"></div>
          <div class="w-20 h-20 rounded-3xl bg-foreground/5 flex items-center justify-center text-primary mb-10 group-hover:bg-primary group-hover:text-black transition-all duration-500 border border-foreground/10 group-hover:border-primary/50 relative z-10">
            <component :is="feat.icon" class="w-10 h-10" />
          </div>
          <h3 class="text-2xl font-bold mb-6 tracking-tight text-foreground">{{ feat.title }}</h3>
          <p class="text-sm text-foreground/50 leading-relaxed font-medium relative z-10">{{ feat.desc }}</p>
        </div>
      </section>

      <!-- Deep Dive Sections -->
      <section class="max-w-7xl mx-auto px-6 space-y-40 mb-40">
        <!-- AI Deep Dive -->
        <div class="grid lg:grid-cols-2 gap-24 items-center">
          <div class="order-2 lg:order-1">
            <h2 class="text-5xl md:text-7xl font-extrabold mb-10 tracking-tighter leading-none text-foreground transition-all">
              Trained on <br />
              <span class="text-gradient">Your Data.</span>
            </h2>
            <p class="text-foreground/50 text-lg mb-12 leading-relaxed font-medium">
              Forget generic chatbots. ReplySuite learns from your PDFs, website, and past conversations to provide hyper-relevant answers that convert.
            </p>
            <div class="space-y-6">
              <div v-for="item in ['Zero-shot learning', 'Context-aware responses', 'Anti-hallucination guardrails']" :key="item" class="flex items-center gap-6 text-sm font-bold tracking-tight text-primary/80">
                <div class="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                   <Zap class="w-3 h-3 text-primary fill-current" />
                </div>
                <span>{{ item }}</span>
              </div>
            </div>
          </div>
          <div class="order-1 lg:order-2">
             <div class="aspect-video glass-card border-foreground/10 p-12 flex flex-col items-center justify-center relative group bg-background/40 overflow-hidden">
                <div class="absolute inset-0 bg-primary/5 blur-[100px] group-hover:bg-primary/10 transition-all duration-1000"></div>
                <div class="absolute top-6 right-6 px-4 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-bold text-primary uppercase tracking-[0.2em] relative z-10">GPT-4o Ready</div>
                <div class="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform shadow-2xl shadow-primary/20">
                   <MessageSquare class="w-16 h-16 text-primary" />
                </div>
             </div>
          </div>
        </div>

        <!-- Instagram Deep Dive -->
        <div class="grid lg:grid-cols-2 gap-24 items-center">
          <div>
             <div class="aspect-video glass-card border-foreground/10 p-12 flex flex-col items-center justify-center relative group bg-background/40 overflow-hidden">
                <div class="absolute inset-0 bg-primary/5 blur-[100px] group-hover:bg-primary/10 transition-all duration-1000"></div>
                <div class="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform shadow-2xl shadow-primary/20">
                   <Instagram class="w-16 h-16 text-primary" />
                </div>
             </div>
          </div>
          <div>
            <h2 class="text-5xl md:text-7xl font-extrabold mb-10 tracking-tighter leading-none text-foreground">
              Channel <br />
              <span class="text-gradient">Mastery.</span>
            </h2>
            <p class="text-foreground/50 text-lg mb-12 leading-relaxed font-medium">
              Start with your website and scale to social channels as they launch. From reply triggers to direct sales, we handle it all with precision.
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
        <h2 class="text-5xl md:text-8xl font-extrabold mb-12 relative z-10 tracking-tighter leading-none text-foreground">
          Ready to <span class="text-gradient">Dominate?</span>
        </h2>
        <NuxtLink to="/register" class="bg-foreground text-background px-12 py-6 rounded-full font-bold text-xl inline-flex items-center gap-4 relative z-10 hover:opacity-90 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-foreground/10 uppercase tracking-[0.2em]">
          Get Started Free
          <ArrowRight class="w-6 h-6" />
        </NuxtLink>
        <p class="text-foreground/50 mt-12 text-xs uppercase tracking-widest font-bold">
          No credit card required • 30-day free month
        </p>
      </section>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[48px] bg-foreground/[0.02];
}
</style>
