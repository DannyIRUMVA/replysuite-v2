<script setup lang="ts">
import { ArrowRight, CheckCircle2, ShieldCheck, Clock3, FileText } from 'lucide-vue-next'

useSeoMeta({
  title: 'AI Chatbot for Clinics | ReplySuite',
  description: 'Use an AI chatbot for clinics to answer patient questions, share service information, and reduce repetitive support work.',
  ogTitle: 'AI Chatbot for Clinics | ReplySuite',
  ogDescription: 'ReplySuite helps clinics automate patient FAQs, capture inquiries, and answer faster on websites and WhatsApp.',
})

definePageMeta({ layout: 'default' })

const items = [
  'Answer common patient questions faster',
  'Share clinic services, hours, and location details',
  'Reduce repetitive support load on staff',
  'Capture patient inquiries 24/7'
]
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-32 space-y-20">
    <section class="text-center max-w-4xl mx-auto">
      <span class="badge-gradient mb-6">AI Chatbot for Clinics</span>
      <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.95] text-foreground">
        Help clinics answer patient questions faster with AI.
      </h1>
      <p class="mt-8 text-lg text-foreground/55 font-medium leading-relaxed">
        ReplySuite helps clinics automate FAQs, service information, appointment inquiries, and multilingual support on websites and WhatsApp.
      </p>
      <div class="mt-10 flex flex-col sm:flex-row justify-center gap-4">
        <NuxtLink to="/register" class="btn-gradient px-8 py-4 inline-flex items-center justify-center gap-3">
          Start Free
          <ArrowRight class="w-5 h-5" />
        </NuxtLink>
        <NuxtLink to="/contact" class="px-8 py-4 rounded-full border border-foreground/10 text-foreground font-bold hover:bg-foreground/[0.03] transition-all inline-flex items-center justify-center gap-3">
          Book a Demo
          <ShieldCheck class="w-5 h-5" />
        </NuxtLink>
      </div>
    </section>

    <section class="grid md:grid-cols-2 gap-8">
      <div class="glass-card p-10 border-foreground/10 bg-foreground/[0.02]">
        <h2 class="text-3xl font-black text-foreground tracking-tight mb-5">Clinic pain points</h2>
        <p class="text-foreground/55 font-medium leading-relaxed mb-6">
          Front-desk teams get interrupted by the same questions about services, fees, appointment flow, and opening hours.
        </p>
        <div class="space-y-4">
          <div v-for="item in items" :key="item" class="flex items-start gap-3">
            <CheckCircle2 class="w-5 h-5 text-primary mt-0.5" />
            <span class="text-sm font-semibold text-foreground/75">{{ item }}</span>
          </div>
        </div>
      </div>

      <div class="grid gap-5">
        <div class="glass-card p-8 border-foreground/10 bg-foreground/[0.02]">
          <Clock3 class="w-8 h-8 text-primary mb-4" />
          <h3 class="text-xl font-black text-foreground mb-2">Instant first replies</h3>
          <p class="text-sm text-foreground/55 font-medium leading-relaxed">Give patients quick answers before your team follows up with more specific help.</p>
        </div>
        <div class="glass-card p-8 border-foreground/10 bg-foreground/[0.02]">
          <FileText class="w-8 h-8 text-primary mb-4" />
          <h3 class="text-xl font-black text-foreground mb-2">Train on clinic information</h3>
          <p class="text-sm text-foreground/55 font-medium leading-relaxed">Use your website, PDF documents, FAQs, and service details to improve reply quality.</p>
        </div>
      </div>
    </section>
  </div>
</template>
