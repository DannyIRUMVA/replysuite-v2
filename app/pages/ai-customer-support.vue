<script setup lang="ts">
import { ArrowRight, CheckCircle2, Bot, MessageCircle, Globe2 } from 'lucide-vue-next'

useSeoMeta({
  title: 'AI Customer Support for Websites & WhatsApp | ReplySuite',
  description: 'Automate customer support, FAQs, bookings, and lead generation with ReplySuite on websites and WhatsApp.',
  ogTitle: 'AI Customer Support for Websites & WhatsApp | ReplySuite',
  ogDescription: 'Train AI customer support on your business content and automate replies on websites and WhatsApp.',
})

definePageMeta({ layout: 'default' })

const benefits = [
  'Automate repetitive customer questions',
  'Improve first response speed',
  'Support customers 24/7',
  'Use one assistant across website and WhatsApp'
]
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-32 space-y-20">
    <section class="text-center max-w-4xl mx-auto">
      <span class="badge-gradient mb-6">AI Customer Support</span>
      <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.95] text-foreground">
        AI customer support for websites and WhatsApp.
      </h1>
      <p class="mt-8 text-lg text-foreground/55 font-medium leading-relaxed">
        ReplySuite helps businesses train an AI support assistant on their own content so they can answer customers faster, reduce repetitive work, and capture more leads.
      </p>
      <div class="mt-10 flex flex-col sm:flex-row justify-center gap-4">
        <NuxtLink to="/register" class="btn-gradient px-8 py-4 inline-flex items-center justify-center gap-3">
          Start Free
          <ArrowRight class="w-5 h-5" />
        </NuxtLink>
        <NuxtLink to="/pricing" class="px-8 py-4 rounded-full border border-foreground/10 text-foreground font-bold hover:bg-foreground/[0.03] transition-all inline-flex items-center justify-center gap-3">
          View Pricing
          <Bot class="w-5 h-5" />
        </NuxtLink>
      </div>
    </section>

    <section class="grid lg:grid-cols-3 gap-6">
      <div class="glass-card p-8 border-foreground/10 bg-foreground/[0.02]" v-for="item in benefits" :key="item">
        <CheckCircle2 class="w-8 h-8 text-primary mb-4" />
        <p class="text-base font-black text-foreground tracking-tight">{{ item }}</p>
      </div>
    </section>

    <section class="grid md:grid-cols-2 gap-8">
      <div class="glass-card p-10 border-foreground/10 bg-foreground/[0.02]">
        <Globe2 class="w-10 h-10 text-primary mb-5" />
        <h2 class="text-3xl font-black text-foreground tracking-tight mb-5">Website chatbot</h2>
        <p class="text-foreground/55 font-medium leading-relaxed">Deploy AI customer support on your website to answer FAQs, service questions, and lead inquiries in real time.</p>
      </div>
      <div class="glass-card p-10 border-foreground/10 bg-foreground/[0.02]">
        <MessageCircle class="w-10 h-10 text-primary mb-5" />
        <h2 class="text-3xl font-black text-foreground tracking-tight mb-5">WhatsApp AI assistant</h2>
        <p class="text-foreground/55 font-medium leading-relaxed">Expand support into WhatsApp to keep customer conversations moving on a channel many businesses already use daily.</p>
      </div>
    </section>
  </div>
</template>
