<script setup lang="ts">
import { ArrowRight, CheckCircle2, MessageCircle, Globe2, Languages, FileText } from 'lucide-vue-next'

useSeoMeta({
  title: 'WhatsApp AI Chatbot for Customer Support | ReplySuite',
  description: 'Use a WhatsApp AI chatbot to automate customer support, FAQs, lead capture, and multilingual replies with ReplySuite.',
  ogTitle: 'WhatsApp AI Chatbot for Customer Support | ReplySuite',
  ogDescription: 'Automate customer support, FAQs, lead capture, and multilingual replies on WhatsApp with ReplySuite.',
})

definePageMeta({ layout: 'default' })

const benefits = [
  'Reply faster to WhatsApp questions',
  'Automate common support and FAQ replies',
  'Capture leads without missing messages',
  'Train answers on your business content'
]
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-32 space-y-20">
    <section class="text-center max-w-4xl mx-auto">
      <span class="badge-gradient mb-6">WhatsApp AI Chatbot</span>
      <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.95] text-foreground">
        WhatsApp AI chatbot for faster customer support.
      </h1>
      <p class="mt-8 text-lg text-foreground/55 font-medium leading-relaxed">
        ReplySuite helps businesses automate customer support, FAQs, bookings, and lead generation on WhatsApp using AI trained on real business content.
      </p>
      <div class="mt-10 flex flex-col sm:flex-row justify-center gap-4">
        <NuxtLink to="/register" class="btn-gradient px-8 py-4 inline-flex items-center justify-center gap-3">
          Start Free
          <ArrowRight class="w-5 h-5" />
        </NuxtLink>
        <NuxtLink to="/contact" class="px-8 py-4 rounded-full border border-foreground/10 text-foreground font-bold hover:bg-foreground/[0.03] transition-all inline-flex items-center justify-center gap-3">
          Talk to Founder
          <MessageCircle class="w-5 h-5" />
        </NuxtLink>
      </div>
    </section>

    <section class="grid md:grid-cols-2 gap-10 items-start">
      <div class="glass-card p-10 border-foreground/10 bg-foreground/[0.02]">
        <h2 class="text-3xl font-black text-foreground tracking-tight mb-5">Why businesses use it</h2>
        <p class="text-foreground/55 font-medium leading-relaxed mb-6">
          Customers already message your business on WhatsApp. ReplySuite helps you answer faster, reduce repetitive work, and keep lead conversations moving.
        </p>
        <div class="space-y-4">
          <div v-for="item in benefits" :key="item" class="flex items-start gap-3">
            <CheckCircle2 class="w-5 h-5 text-primary mt-0.5" />
            <span class="text-sm font-semibold text-foreground/75">{{ item }}</span>
          </div>
        </div>
      </div>

      <div class="grid gap-5">
        <div class="glass-card p-8 border-foreground/10 bg-foreground/[0.02]">
          <MessageCircle class="w-8 h-8 text-primary mb-4" />
          <h3 class="text-xl font-black text-foreground mb-2">WhatsApp support</h3>
          <p class="text-sm text-foreground/55 font-medium leading-relaxed">Handle repetitive questions, service requests, and pre-sales chats with faster replies.</p>
        </div>
        <div class="glass-card p-8 border-foreground/10 bg-foreground/[0.02]">
          <Languages class="w-8 h-8 text-primary mb-4" />
          <h3 class="text-xl font-black text-foreground mb-2">Multilingual chatbot</h3>
          <p class="text-sm text-foreground/55 font-medium leading-relaxed">Support customers in languages your business already uses, including Kinyarwanda.</p>
        </div>
        <div class="glass-card p-8 border-foreground/10 bg-foreground/[0.02]">
          <FileText class="w-8 h-8 text-primary mb-4" />
          <h3 class="text-xl font-black text-foreground mb-2">Trained on your content</h3>
          <p class="text-sm text-foreground/55 font-medium leading-relaxed">Use your website, PDFs, FAQs, and business text so replies stay useful and on-brand.</p>
        </div>
      </div>
    </section>

    <section class="glass-card p-10 border-foreground/10 bg-foreground/[0.02] text-center">
      <Globe2 class="w-10 h-10 text-primary mx-auto mb-5" />
      <h2 class="text-3xl font-black text-foreground tracking-tight mb-4">Use the same assistant on your website too</h2>
      <p class="text-foreground/55 font-medium leading-relaxed max-w-3xl mx-auto">
        Start with website support, then expand into WhatsApp AI support without changing your product story.
      </p>
    </section>
  </div>
</template>
