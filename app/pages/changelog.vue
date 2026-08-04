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
    date: 'March 15, 2026',
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
    date: 'February 10, 2026',
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
    date: 'Janaury 05, 2026',
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
  <div class="changelog-compact relative min-h-screen overflow-x-hidden">
    <!-- Hero -->
    <section class="relative mx-auto max-w-[72rem] overflow-hidden px-4 py-10 sm:px-6 md:py-12">
      <div class="absolute inset-x-0 top-8 mx-auto h-56 w-[58%] rounded-full bg-primary/[0.08] blur-[110px] -z-10"></div>
      <div class="mx-auto max-w-4xl text-center">
        <span class="badge-gradient mb-4">Updates</span>
        <h1
          class="text-3xl font-extrabold leading-[1.02] tracking-[-0.045em] text-foreground md:text-4xl lg:text-[3.15rem]">
          Platform <br />
          <span class="text-gradient">Evolution.</span>
        </h1>
        <p class="mx-auto mt-4 max-w-3xl text-sm font-semibold leading-6 text-foreground/60 md:text-[0.95rem]">
          Tracking our journey as we build the gold standard in AI automation.
        </p>
      </div>
    </section>

    <!-- Timeline -->
    <section class="relative mx-auto max-w-[64rem] px-4 py-10 sm:px-6 md:py-12">
      <div class="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-foreground/5 -z-10"></div>

      <div v-for="(update, index) in updates" :key="update.version"
        class="group relative mb-8 flex flex-col gap-4 md:flex-row"
        :class="index % 2 === 0 ? 'md:flex-row-reverse' : ''">

        <!-- Icon/Point -->
        <div
          class="absolute left-0 z-20 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-[0.7rem] border border-foreground/10 bg-background transition-colors group-hover:border-primary/50 md:left-1/2">
          <component :is="update.icon" class="h-4 w-4 text-primary" />
        </div>

        <!-- Content Card -->
        <div class="flex-1">
          <div class="rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 backdrop-blur-xl transition-all hover:border-primary/20">
            <div class="mb-4 flex items-center justify-between">
              <span class="text-xs font-bold text-primary uppercase tracking-widest">{{ update.version }}</span>
              <span class="text-xs text-foreground/30 font-medium">{{ update.date }}</span>
            </div>
            <h3 class="mb-4 text-lg font-bold tracking-tight text-foreground">{{ update.title }}</h3>
            <ul class="space-y-2.5">
              <li v-for="item in update.items" :key="item"
                class="flex items-start gap-3 text-sm font-medium leading-6 text-foreground/50">
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
      <div class="mt-10 rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 text-center shadow-sm shadow-black/5 md:p-6">
        <h3 class="mb-3 text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">Open Source Mindset</h3>
        <p class="mb-5 text-sm font-semibold leading-6 text-foreground/55">Follow our development journey on GitHub for real-time commits.
        </p>
        <a href="https://github.com/replysuite" class="btn-gradient inline-flex items-center gap-2 rounded-[0.78rem] px-5 py-3 text-sm font-bold group">
          View on GitHub
          <Github class="w-5 h-5" />
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[1rem];
}
</style>
