<script setup lang="ts">
import { ArrowLeft, Zap, TrendingDown, Clock, Users, ArrowRight, MessageSquare, BarChart3, Calendar } from 'lucide-vue-next'

useSeoMeta({
  title: 'Reducing Support Tickets by 70% | ReplySuite Insights',
  description: 'How brands are using AI automation to handle repetitive inquiries and free up human teams for deep work.',
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
      <NuxtLink to="/blog" class="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-12 font-bold text-xs uppercase tracking-widest group">
        <ArrowLeft class="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Insights
      </NuxtLink>
      
      <span class="badge-gradient mb-8">Efficiency Blueprint</span>
      <h1 class="text-5xl md:text-7xl font-extrabold mb-8 tracking-tighter leading-[0.9] text-white">
        The 70% <br /><span class="text-gradient">Reduction.</span>
      </h1>
      
      <div class="flex flex-wrap items-center gap-8 pt-8 border-t border-white/5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary">OP</div>
          <span class="text-white font-bold text-sm">Operations Team</span>
        </div>
        <div class="flex items-center gap-6 text-xs text-gray-600 font-bold uppercase tracking-widest">
           <div class="flex items-center gap-2"><Calendar class="w-3 h-3" /> April 28, 2026</div>
           <div class="flex items-center gap-2"><Clock class="w-3 h-3" /> 8 min read</div>
        </div>
      </div>
    </section>

    <!-- Content -->
    <article class="max-w-3xl mx-auto px-6 prose prose-invert prose-primary prose-lg">
      <p class="text-xl text-gray-400 leading-relaxed font-medium mb-12">
        Scaling customer support shouldn't mean scaling your headcount linearly. In the modern era of high-velocity commerce, AI is the only way to maintain a 1:1 human connection at 1,000x scale.
      </p>

      <h2 class="text-3xl font-bold text-white mb-8 tracking-tight">Identifying the "Dead Weight"</h2>
      <p class="text-gray-500 mb-10">
        80% of support tickets are repetitive. "Where is my order?", "Do you ship to Rwanda?", "What are your pricing tiers?" These questions take up 60% of a human agent's day. By automating these, you don't just save money—you save your team from burnout.
      </p>

      <!-- Stats Grid -->
      <div class="not-prose grid sm:grid-cols-2 gap-6 my-20">
         <div class="p-10 rounded-[40px] bg-white/[0.02] border border-white/5 text-center group">
            <div class="text-5xl font-extrabold text-primary mb-2 tracking-tighter group-hover:scale-110 transition-transform">-70%</div>
            <div class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Ticket Volume</div>
         </div>
         <div class="p-10 rounded-[40px] bg-white/[0.02] border border-white/5 text-center group">
            <div class="text-5xl font-extrabold text-white mb-2 tracking-tighter group-hover:scale-110 transition-transform">< 1s</div>
            <div class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Initial Response Time</div>
         </div>
      </div>

      <h2 class="text-3xl font-bold text-white mb-8 tracking-tight">The 3-Step Automation Strategy</h2>
      <ol class="text-gray-500 space-y-8">
         <li class="pl-4">
            <strong class="text-white">Knowledge Sync:</strong> Use ReplySuite to ingest your entire documentation hub. This creates a "Brain" that knows everything your agents know.
         </li>
         <li class="pl-4">
            <strong class="text-white">Seamless Handoff:</strong> Configure AI to handle the first 3-5 messages. If the sentiment becomes frustrated or the query is complex, the bot triggers a human notification instantly.
         </li>
         <li class="pl-4">
            <strong class="text-white">Continuous Feedback:</strong> Use the ReplySuite analytics dashboard to identify where the AI is failing and update your training data in one click.
         </li>
      </ol>

      <h2 class="text-3xl font-bold text-white mb-8 tracking-tight">Case Study: Brand X</h2>
      <p class="text-gray-500 mb-12">
        A premium fashion brand integrated ReplySuite across Instagram and Web. Within 30 days, they reduced their average response time from 4 hours to 0.8 seconds, while human support tickets dropped by exactly 72%.
      </p>

      <!-- Bottom CTA -->
      <div class="not-prose p-12 rounded-[48px] bg-white/[0.02] border border-white/5 text-center mt-32 relative overflow-hidden group">
         <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity blur-[80px]"></div>
         <BarChart3 class="w-12 h-12 text-primary mx-auto mb-8" />
         <h3 class="text-3xl font-bold text-white mb-6 tracking-tight">Scale Without the Stress.</h3>
         <p class="text-gray-500 mb-10 max-w-lg mx-auto font-medium">Join 500+ brands optimizing their operations with ReplySuite AI.</p>
         <NuxtLink to="/register" class="btn-gradient px-12 py-6 text-xl inline-flex items-center gap-4 group/btn">
            Build Your AI Agent
            <Zap class="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
         </NuxtLink>
      </div>
    </article>
  </div>
</template>
