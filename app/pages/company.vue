<script setup lang="ts">
import {
  ArrowRight,
  Bot,
  Building2,
  Globe2,
  HeartHandshake,
  Mail,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-vue-next'

useSeoMeta({
  title: 'Company | ReplySuite Limited',
  description: 'ReplySuite Limited builds AI chatbot tools for websites and WhatsApp.',
  ogTitle: 'Company | ReplySuite Limited',
  ogDescription: 'ReplySuite Limited builds AI customer support assistants for websites and WhatsApp.',
  ogUrl: 'https://replysuite.app/company',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Company | ReplySuite Limited',
  twitterDescription: 'Meet ReplySuite Limited.',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://replysuite.app/company' }]
})

definePageMeta({
  layout: 'default'
})

const companyFacts = [
  {
    label: 'Company',
    value: 'ReplySuite Limited',
    icon: Building2,
  },
  {
    label: 'Product focus',
    value: 'Website and WhatsApp AI chatbots',
    icon: Bot,
  },
  {
    label: 'Primary market',
    value: 'Fast customer support',
    icon: Globe2,
  },
]

const principles = [
  {
    title: 'Practical automation',
    desc: 'AI workflows that answer questions, capture leads, and reduce repetitive work.',
    icon: Sparkles,
  },
  {
    title: 'Trust and security',
    desc: 'Clear permissions, careful data handling, and responsible AI behavior.',
    icon: ShieldCheck,
  },
  {
    title: 'Human-friendly support',
    desc: 'Faster customer service with clear, respectful replies.',
    icon: HeartHandshake,
  },
]

const teamAreas = [
  {
    title: 'Product & strategy',
    desc: 'Roadmap, customer problems, onboarding, and product vision.',
    icon: Sparkles,
  },
  {
    title: 'Engineering & AI',
    desc: 'Chatbot platform, widget, WhatsApp automation, languages, and integrations.',
    icon: Bot,
  },
  {
    title: 'Customer success',
    desc: 'Setup, training, and improvements from real customer conversations.',
    icon: MessageSquare,
  },
]
</script>

<template>
  <div class="relative overflow-hidden">
    <section class="max-w-7xl mx-auto px-6 py-20 md:py-24 relative">
      <div class="absolute inset-x-0 top-10 mx-auto w-[70%] h-72 bg-primary/10 blur-[140px] rounded-full -z-10"></div>

      <div class="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-12 items-center">
        <div>
          <span class="badge-gradient mb-5">Company</span>
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight leading-[1.02] text-foreground">
            AI support tools for modern businesses.
          </h1>
          <p class="text-base md:text-lg text-foreground/55 max-w-3xl leading-relaxed font-medium mb-8">
            ReplySuite Limited helps businesses launch trained AI chatbots on websites and WhatsApp.
          </p>
          <div class="flex flex-col sm:flex-row gap-4">
            <NuxtLink to="/register" class="btn-gradient px-8 py-4 text-sm inline-flex items-center justify-center gap-3">
              Start Free
              <ArrowRight class="w-4 h-4" />
            </NuxtLink>
            <NuxtLink to="/contact" class="px-8 py-4 rounded-full border border-foreground/10 text-sm font-bold text-foreground/70 hover:text-foreground hover:bg-foreground/[0.04] transition-all inline-flex items-center justify-center gap-3">
              Contact us
              <Mail class="w-4 h-4" />
            </NuxtLink>
          </div>
        </div>

        <div class="liquid-glass p-5 md:p-6 rounded-[30px] relative overflow-hidden">
          <div class="absolute -right-20 -top-20 w-56 h-56 bg-primary/10 blur-[80px] rounded-full"></div>
          <div class="relative z-10 space-y-4">
            <div
              v-for="fact in companyFacts"
              :key="fact.label"
              class="liquid-glass-soft rounded-[20px] p-4 md:p-5 flex items-start gap-4"
            >
              <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <component :is="fact.icon" class="w-5 h-5 text-primary" />
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-[0.2em] text-foreground/40 font-bold mb-2">{{ fact.label }}</p>
                <p class="text-base font-black text-foreground leading-snug">{{ fact.value }}</p>
              </div>
            </div>

            <div class="liquid-glass-gold rounded-[20px] p-5">
              <div class="flex items-center gap-3 mb-3">
                <MapPin class="w-5 h-5 text-primary" />
                <p class="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Built for local and global support</p>
              </div>
              <p class="text-sm text-foreground/60 leading-relaxed font-medium">
                Fast answers, multilingual support, and simple deployment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-16 md:py-20 border-t border-foreground/10">
      <div class="grid lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-10 items-start">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">What we do</span>
          <h2 class="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mt-4 mb-4">
            Business knowledge into instant answers.
          </h2>
          <p class="text-foreground/55 leading-relaxed font-medium">
            Upload website content, PDFs, FAQs, and custom text. ReplySuite turns them into useful customer replies.
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-5">
          <div
            v-for="principle in principles"
            :key="principle.title"
            class="liquid-glass p-5 md:p-6 rounded-[24px]"
          >
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
              <component :is="principle.icon" class="w-5 h-5 text-primary" />
            </div>
            <h3 class="text-base font-black text-foreground mb-2">{{ principle.title }}</h3>
            <p class="text-sm text-foreground/50 leading-relaxed font-medium">{{ principle.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <section id="team" class="max-w-7xl mx-auto px-6 py-16 md:py-20 border-t border-foreground/10">
      <div class="text-center max-w-3xl mx-auto mb-10 md:mb-12">
        <span class="badge-gradient mb-5">Team</span>
        <h2 class="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
          The team behind ReplySuite.
        </h2>
        <p class="text-foreground/55 leading-relaxed font-medium">
          Product, engineering, AI automation, and customer support working together.
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <article
          v-for="area in teamAreas"
          :key="area.title"
          class="liquid-glass group rounded-[26px] p-6 hover:border-primary/25 transition-all"
        >
          <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
            <component :is="area.icon" class="w-6 h-6 text-primary" />
          </div>
          <h3 class="text-xl font-black text-foreground mb-3 tracking-tight">{{ area.title }}</h3>
          <p class="text-sm text-foreground/50 leading-relaxed font-medium">{{ area.desc }}</p>
        </article>
      </div>

      <div class="liquid-glass-gold mt-8 md:mt-10 rounded-[26px] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div class="flex items-start gap-5">
          <div class="w-12 h-12 rounded-xl bg-background/50 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Users class="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 class="text-xl md:text-2xl font-black text-foreground mb-2">Work with ReplySuite Limited?</h3>
            <p class="text-sm text-foreground/55 leading-relaxed font-medium max-w-2xl">
              Partner, integrate, request a demo, or ask how ReplySuite can help.
            </p>
          </div>
        </div>
        <NuxtLink to="/contact" class="btn-gradient px-8 py-4 text-sm whitespace-nowrap inline-flex items-center gap-3">
          Contact us
          <ArrowRight class="w-4 h-4" />
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.liquid-glass {
  @apply border border-foreground/10 bg-background-card/55 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur-2xl dark:bg-white/[0.035] dark:shadow-[0_24px_90px_-42px_rgba(0,0,0,0.85)];
  background-image:
    linear-gradient(135deg, rgb(var(--surface) / 0.62), rgb(var(--surface) / 0.24)),
    radial-gradient(circle at 12% 0%, rgb(var(--primary) / 0.10), transparent 34%);
}

.liquid-glass-soft {
  @apply border border-foreground/10 bg-background/35 shadow-sm backdrop-blur-xl dark:bg-white/[0.025];
  background-image: linear-gradient(135deg, rgb(var(--surface) / 0.44), rgb(var(--surface) / 0.16));
}

.liquid-glass-gold {
  @apply border border-primary/20 bg-primary/10 shadow-[0_20px_70px_-45px_rgb(var(--primary))] backdrop-blur-2xl;
  background-image:
    linear-gradient(135deg, rgb(var(--primary) / 0.14), rgb(var(--surface) / 0.28)),
    radial-gradient(circle at top right, rgb(var(--primary-accent) / 0.16), transparent 42%);
}
</style>
