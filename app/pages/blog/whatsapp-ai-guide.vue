<script setup lang="ts">
import { ArrowLeft, Clock, Calendar, Zap, MessageCircle, ArrowRight, CheckCircle2, Shield } from 'lucide-vue-next'

useSeoMeta({
  title: 'How to Connect AI to WhatsApp (No-Code Guide 2026)',
  description: 'Step-by-step guide on connecting advanced AI agents to your Official WhatsApp Business API without writing a single line of code.',
})

definePageMeta({
  layout: 'default'
})
</script>

<template>
  <div class="relative min-h-screen pb-40">
    <!-- Hero -->
    <section class="max-w-4xl mx-auto px-6 pt-32 pb-20 relative overflow-hidden text-center">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <NuxtLink to="/blog" class="inline-flex items-center gap-2 text-foreground/50 hover:text-primary transition-colors mb-12 font-bold text-xs uppercase tracking-widest group">
        <ArrowLeft class="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Blog
      </NuxtLink>
      
      <span class="badge-gradient mb-8 mx-auto">Step-by-Step Guide</span>
      <h1 class="text-6xl md:text-8xl font-extrabold mb-8 tracking-tighter leading-[0.85] text-foreground">
        WhatsApp AI <br />
        <span class="text-gradient">Integration.</span>
      </h1>
      
      <div class="flex flex-wrap items-center justify-center gap-8 pt-12 border-t border-foreground/5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center font-bold text-xs">RS</div>
          <span class="text-foreground font-bold text-sm">ReplySuite Team</span>
        </div>
        <div class="flex items-center gap-6 text-xs text-foreground/40 font-bold uppercase tracking-widest">
           <div class="flex items-center gap-2"><Calendar class="w-3 h-3" /> April 24, 2026</div>
           <div class="flex items-center gap-2"><Clock class="w-3 h-3" /> 8 min read</div>
        </div>
      </div>
    </section>

    <!-- Content -->
    <article class="max-w-3xl mx-auto px-6 prose dark:prose-invert prose-primary prose-lg">
      <p class="text-xl text-foreground/70 leading-relaxed font-medium mb-12">
        In 2026, customers don't want to wait for an email. They want answers on the platform they use every day: WhatsApp. But connecting a sophisticated AI to WhatsApp used to require expensive developers. **Not anymore.**
      </p>

      <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">Step 1: Get an Official WhatsApp API Key</h2>
      <p class="text-foreground/50 mb-10">
        To avoid being banned for spam, you must use the **Official WhatsApp Business API** via Meta. ReplySuite handles the technical handshake, but you'll need a verified Meta Business Account.
      </p>

      <div class="bg-foreground/[0.02] p-8 rounded-[32px] border border-foreground/10 my-10 not-prose">
         <div class="flex items-center gap-4 mb-6">
            <div class="p-3 bg-primary/10 rounded-xl text-primary">
               <Shield class="w-6 h-6" />
            </div>
            <h4 class="text-xl font-bold text-foreground tracking-tight">Pro Tip: Trust Matters</h4>
         </div>
         <p class="text-foreground/70 font-medium text-sm leading-relaxed">
           Avoid "gray market" WhatsApp tools that use web automation. Meta is aggressive in 2026 about shutting down unofficial integrations. Always use a Cloud API partner like ReplySuite.
         </p>
      </div>

      <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">Step 2: Train Your AI Agent</h2>
      <p class="text-foreground/50 mb-10">
        Upload your company's PDFs, handbooks, or website URLs. The AI needs to know your brand's voice and product details before it can speak to customers.
      </p>

      <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">Step 3: Connect the Webhook</h2>
      <p class="text-foreground/50 mb-10">
        With ReplySuite, this is a one-click process. You copy the unique Webhook URL provided in your dashboard and paste it into your Meta Developer settings.
      </p>

      <div class="not-prose space-y-4 my-20">
         <div v-for="step in [
           { title: 'Meta Verification', status: 'Required' },
           { title: 'AI Training', status: 'Completed in 2m' },
           { title: 'Live Deployment', status: 'Instant' },
         ]" :key="step.title" class="flex items-center justify-between p-6 rounded-2xl bg-foreground/[0.02] border border-foreground/5">
            <div class="flex items-center gap-4">
               <CheckCircle2 class="text-primary w-5 h-5" />
               <span class="text-foreground font-bold tracking-tight">{{ step.title }}</span>
            </div>
            <span class="text-[10px] font-bold text-foreground/50 uppercase tracking-widest">{{ step.status }}</span>
         </div>
      </div>

      <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight">Why Choose WhatsApp?</h2>
      <p class="text-foreground/50 mb-12">
        WhatsApp has a **98% open rate** in most U.S. markets for high-intent queries. It's the ultimate channel for sales conversion and premium customer support.
      </p>

      <!-- CTA -->
      <div class="not-prose p-12 rounded-[48px] bg-primary/[0.03] border border-primary/20 text-center mt-32 relative overflow-hidden group">
         <MessageCircle class="w-12 h-12 text-primary mx-auto mb-8" />
         <h3 class="text-3xl font-bold text-foreground mb-6 tracking-tight">Ready to Go Global?</h3>
         <p class="text-foreground/50 mb-10 max-w-lg mx-auto font-medium">Connect your first WhatsApp AI Agent today with our 14-day Professional trial.</p>
         <NuxtLink to="/register" class="btn-gradient px-10 py-5 inline-flex items-center gap-4 group/btn">
            Get WhatsApp Access
            <ArrowRight class="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
         </NuxtLink>
      </div>
    </article>
  </div>
</template>
