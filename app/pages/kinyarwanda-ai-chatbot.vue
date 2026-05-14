<script setup lang="ts">
import { ArrowRight, Languages, MessageSquare, CheckCircle2 } from 'lucide-vue-next'

useSeoMeta({
  title: 'Kinyarwanda AI Chatbot | ReplySuite',
  description: 'ReplySuite supports Kinyarwanda AI chatbot experiences for customer support on websites and WhatsApp.',
  ogTitle: 'Kinyarwanda AI Chatbot | ReplySuite',
  ogDescription: 'Use a Kinyarwanda AI chatbot to answer customer questions faster on websites and WhatsApp with ReplySuite.',
})

definePageMeta({ layout: 'default' })

const points = [
  'Support customers in Kinyarwanda',
  'Use the same assistant on website and WhatsApp',
  'Train answers on your own business content',
  'Improve multilingual customer support'
]
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-32 space-y-20">
    <section class="text-center max-w-4xl mx-auto">
      <span class="badge-gradient mb-6">Kinyarwanda AI Chatbot</span>
      <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.95] text-foreground">
        AI customer support in Kinyarwanda for websites and WhatsApp.
      </h1>
      <p class="mt-8 text-lg text-foreground/55 font-medium leading-relaxed">
        ReplySuite helps businesses serve customers in Kinyarwanda with faster replies, better FAQ coverage, and more accessible support.
      </p>
      <div class="mt-10 flex flex-col sm:flex-row justify-center gap-4">
        <NuxtLink to="/register" class="btn-gradient px-8 py-4 inline-flex items-center justify-center gap-3">
          Start Free
          <ArrowRight class="w-5 h-5" />
        </NuxtLink>
        <NuxtLink to="/contact" class="px-8 py-4 rounded-full border border-foreground/10 text-foreground font-bold hover:bg-foreground/[0.03] transition-all inline-flex items-center justify-center gap-3">
          Talk to Sales
          <MessageSquare class="w-5 h-5" />
        </NuxtLink>
      </div>
    </section>

    <section class="grid md:grid-cols-2 gap-8">
      <div class="glass-card p-10 border-foreground/10 bg-foreground/[0.02]">
        <Languages class="w-10 h-10 text-primary mb-5" />
        <h2 class="text-3xl font-black text-foreground tracking-tight mb-5">Why this matters</h2>
        <p class="text-foreground/55 font-medium leading-relaxed mb-6">
          Businesses build trust faster when customers can ask questions in the language they are most comfortable using.
        </p>
        <div class="space-y-4">
          <div v-for="point in points" :key="point" class="flex items-start gap-3">
            <CheckCircle2 class="w-5 h-5 text-primary mt-0.5" />
            <span class="text-sm font-semibold text-foreground/75">{{ point }}</span>
          </div>
        </div>
      </div>

      <div class="glass-card p-10 border-foreground/10 bg-foreground/[0.02]">
        <h2 class="text-3xl font-black text-foreground tracking-tight mb-5">How ReplySuite helps</h2>
        <p class="text-foreground/55 font-medium leading-relaxed">
          Train your AI chatbot on product details, services, FAQs, and business information so it can respond more naturally in multilingual customer support flows.
        </p>
      </div>
    </section>
  </div>
</template>
