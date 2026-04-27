<script setup lang="ts">
import { ArrowLeft, Clock, Calendar, Zap, TrendingUp, ArrowRight, MessageSquare, ShieldCheck } from 'lucide-vue-next'

useSeoMeta({
  title: 'Fashion Brand Scales to $2M/mo with ReplySuite AI',
  description: 'How an elite U.S. fashion brand used ReplySuite to automate 94% of customer inquiries and drive $500k in additional DM revenue.',
})

definePageMeta({
  layout: 'default'
})
</script>

<template>
  <div class="relative min-h-screen pb-40">
    <!-- Hero -->
    <section class="max-w-4xl mx-auto px-6 pt-32 pb-20 relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <NuxtLink to="/about" class="flex items-center gap-2 text-foreground/50 hover:text-primary transition-colors mb-12 font-bold text-xs uppercase tracking-widest group">
        <ArrowLeft class="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Stories
      </NuxtLink>
      
      <span class="badge-gradient mb-8">Case Study: E-Commerce</span>
      <h1 class="text-5xl md:text-8xl font-extrabold mb-8 tracking-tighter leading-[0.9] text-foreground">
        Elite Fashion <br />
        <span class="text-gradient">Scale.</span>
      </h1>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-foreground/5 mt-12">
        <div v-for="stat in [
          { label: 'Revenue Growth', val: '+42%' },
          { label: 'AI Resolution', val: '94%' },
          { label: 'Support Savings', val: '$12k/mo' },
          { label: 'DM Conversion', val: '18.5%' },
        ]" :key="stat.label">
          <div class="text-3xl font-extrabold text-foreground mb-2">{{ stat.val }}</div>
          <div class="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">{{ stat.label }}</div>
        </div>
      </div>
    </section>

    <!-- Content -->
    <article class="max-w-3xl mx-auto px-6 prose dark:prose-invert prose-primary prose-lg">
      <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">The Challenge</h2>
      <p class="text-foreground/50 mb-10">
        A leading Los Angeles-based streetwear brand was drowning in Instagram DMs. With over 500 inquiries per day ranging from "Where is my order?" to "Is this true to size?", their 3-person support team was overwhelmed, leading to 24-hour response delays and lost sales.
      </p>

      <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">The Solution: ReplySuite Infrastructure</h2>
      <p class="text-foreground/50 mb-10">
        They deployed a ReplySuite AI Agent trained on their Shopify product catalog and shipping policies. By using our **Instagram Elite Protocol**, the agent could handle high-intent sales questions instantly in the DM.
      </p>

      <div class="not-prose my-20 p-10 rounded-[48px] bg-foreground/[0.02] border border-foreground/5 relative group">
         <div class="absolute inset-0 bg-primary/5 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
         <h4 class="text-primary font-bold tracking-[0.2em] text-[10px] uppercase mb-8">Implementation Results</h4>
         <div class="space-y-6">
            <div v-for="res in [
              '94% of inquiries resolved without human intervention.',
              'Response time dropped from 24 hours to 1.2 seconds.',
              '$520,000 in revenue attributed directly to AI-assisted DM sales.',
              'CSAT score increased from 3.8 to 4.9 stars.'
            ]" :key="res" class="flex items-start gap-4">
               <Zap class="w-5 h-5 text-primary shrink-0 mt-1" />
               <span class="text-foreground font-medium">{{ res }}</span>
            </div>
         </div>
      </div>

      <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">The Outcome</h2>
      <p class="text-foreground/50 mb-12">
        Today, the brand handles 10x the volume with the same 3-person team, who now focus exclusively on high-value influencer partnerships and complex white-glove sales. ReplySuite has become their **Infrastructure of AI Conversation**.
      </p>

      <!-- CTA -->
      <div class="not-prose p-12 rounded-[48px] bg-primary/[0.03] border border-primary/20 text-center mt-32 relative overflow-hidden group">
         <TrendingUp class="w-12 h-12 text-primary mx-auto mb-8" />
         <h3 class="text-3xl font-bold text-foreground mb-6 tracking-tight">Ready for Hypergrowth?</h3>
         <p class="text-foreground/50 mb-10 max-w-lg mx-auto font-medium">Join the ranks of elite brands using AI to dominate the 2026 market.</p>
         <NuxtLink to="/pricing" class="btn-gradient px-10 py-5 inline-flex items-center gap-4 group/btn">
            View Scaling Plans
            <ArrowRight class="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
         </NuxtLink>
      </div>
    </article>
  </div>
</template>
