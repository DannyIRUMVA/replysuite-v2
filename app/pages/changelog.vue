<script setup lang="ts">
import { Zap, Sparkles, ShieldCheck, Bug, ArrowRight, Github } from 'lucide-vue-next'

useSeoMeta({
  title: 'Changelog | ReplySuite Product Updates',
  description: 'Stay updated with the latest features, improvements, and fixes on the ReplySuite platform.',
})

definePageMeta({
  layout: 'default'
})

const updates = [
  {
    version: 'Master (v2.4.0)',
    date: 'April 20, 2026',
    title: 'Enterprise Trust Infrastructure',
    items: [
      'New AI Ethics & Transparency framework',
      'Advanced Security Posture documentation',
      'Refined institutional branding across guest pages',
      'Enhanced LLM context for AI crawlers'
    ],
    icon: ShieldCheck,
    type: 'Release'
  },
  {
    version: 'v1.0.0',
    date: 'January 15, 2026',
    title: 'The Official Launch',
    items: [
      'Production-ready RAG (Retrieval-Augmented Generation)',
      'Global Edge deployment on Cloudflare',
      '99.9% Uptime Guarantee (SLA) for Enterprise',
      'Unified Dashboard for Multi-Channel Management'
    ],
    icon: Zap,
    type: 'Major'
  },
  {
    version: 'Beta (v0.9.0)',
    date: 'November 10, 2025',
    title: 'Multi-Channel Engine',
    items: [
      'Initial WhatsApp Business API integration',
      'Advanced Sentiment Analysis for handoffs',
      'Customizable Web Widget for brands'
    ],
    icon: Sparkles,
    type: 'Beta'
  },
  {
    version: 'Alpha',
    date: 'August 05, 2025',
    title: 'The Genesis',
    items: [
      'Core AI reasoning engine development',
      'First-generation Instagram DM automation',
      'Basic knowledge base ingestion logic'
    ],
    icon: Bug,
    type: 'Alpha'
  }
]
</script>

<template>
  <div class="relative min-h-screen">
    <!-- Hero -->
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <div class="text-center max-w-3xl mx-auto">
        <span class="badge-gradient mb-10">Updates</span>
        <h1 class="text-5xl sm:text-7xl md:text-8xl font-extrabold mb-8 tracking-tighter leading-[0.85] text-white">
          Platform <br />
          <span class="text-gradient">Evolution.</span>
        </h1>
        <p class="text-xl text-gray-400 font-medium leading-relaxed">
          Tracking our journey as we build the gold standard in AI automation.
        </p>
      </div>
    </section>

    <!-- Timeline -->
    <section class="max-w-4xl mx-auto px-6 py-20 relative">
      <div class="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-white/5 -z-10"></div>
      
      <div v-for="(update, index) in updates" :key="update.version" 
        class="mb-32 relative flex flex-col md:flex-row gap-12 group"
        :class="index % 2 === 0 ? 'md:flex-row-reverse' : ''">
        
        <!-- Icon/Point -->
        <div class="absolute left-0 md:left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-black border border-white/10 flex items-center justify-center z-20 group-hover:border-primary/50 transition-colors">
          <component :is="update.icon" class="w-5 h-5 text-primary" />
        </div>

        <!-- Content Card -->
        <div class="flex-1">
          <div class="glass-card p-10 border-white/5 hover:border-primary/20 transition-all">
            <div class="flex items-center justify-between mb-6">
              <span class="text-xs font-bold text-primary uppercase tracking-widest">{{ update.version }}</span>
              <span class="text-xs text-gray-600 font-medium">{{ update.date }}</span>
            </div>
            <h3 class="text-2xl font-bold text-white mb-6 tracking-tight">{{ update.title }}</h3>
            <ul class="space-y-4">
              <li v-for="item in update.items" :key="item" class="flex items-start gap-3 text-gray-400 text-sm leading-relaxed font-medium">
                <div class="w-1.5 h-1.5 rounded-full bg-primary/40 mt-2 shrink-0"></div>
                {{ item }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Empty spacer for desktop timeline -->
        <div class="flex-1 hidden md:block"></div>
      </div>

      <!-- Footer CTA -->
      <div class="mt-40 p-16 rounded-[48px] bg-white/[0.02] border border-white/5 text-center">
        <h3 class="text-3xl font-bold text-white mb-6 tracking-tight">Open Source Mindset</h3>
        <p class="text-gray-400 mb-10 font-medium">Follow our development journey on GitHub for real-time commits.</p>
        <a href="https://github.com/replysuite" class="btn-gradient px-10 py-5 inline-flex items-center gap-4 group">
          View on GitHub
          <Github class="w-5 h-5" />
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.glass-card { @apply rounded-[40px]; }
</style>
