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
  <div class="company-compact relative overflow-hidden">
    <section class="relative mx-auto max-w-[72rem] px-4 py-10 sm:px-6 md:py-12">
      <div class="absolute inset-x-0 top-8 mx-auto h-56 w-[58%] rounded-full bg-primary/[0.08] blur-[110px] -z-10"></div>

      <div class="grid items-center gap-6 lg:grid-cols-[0.92fr_0.78fr] lg:gap-8">
        <div>
          <span class="badge-gradient mb-5 inline-flex">Company</span>
          <h1 class="mb-4 text-3xl font-extrabold leading-[1.02] tracking-[-0.045em] text-foreground md:text-4xl lg:text-[3.15rem]">
            AI support tools for modern businesses.
          </h1>
          <p class="mb-6 max-w-xl text-sm font-semibold leading-6 text-foreground/60 md:text-[0.95rem]">
            ReplySuite Limited helps businesses launch trained AI chatbots on websites and WhatsApp.
          </p>
          <div class="flex flex-col gap-2.5 sm:flex-row">
            <NuxtLink to="/register" class="btn-gradient inline-flex items-center justify-center gap-2 rounded-[0.78rem] px-5 py-3 text-sm font-bold">
              Start Free
              <ArrowRight class="w-4 h-4" />
            </NuxtLink>
            <NuxtLink to="/contact" class="inline-flex items-center justify-center gap-2 rounded-[0.78rem] border border-foreground/10 bg-foreground/[0.02] px-5 py-3 text-sm font-bold text-foreground/70 transition-all hover:bg-foreground/[0.05] hover:text-foreground">
              Contact us
              <Mail class="w-4 h-4" />
            </NuxtLink>
          </div>
        </div>

        <div class="liquid-glass relative overflow-hidden rounded-[1rem] p-4 md:p-5">
          <div class="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/[0.08] blur-[80px]"></div>
          <div class="relative z-10 space-y-3">
            <div
              v-for="fact in companyFacts"
              :key="fact.label"
              class="liquid-glass-soft flex items-start gap-3 rounded-[0.82rem] p-3.5"
            >
              <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[0.7rem] bg-primary/10">
                <component :is="fact.icon" class="h-4 w-4 text-primary" />
              </div>
              <div>
                <p class="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/40">{{ fact.label }}</p>
                <p class="text-sm font-bold leading-snug text-foreground/80">{{ fact.value }}</p>
              </div>
            </div>

            <div class="liquid-glass-gold rounded-[0.82rem] p-4">
              <div class="mb-2 flex items-center gap-2.5">
                <MapPin class="h-4 w-4 text-primary" />
                <p class="text-[10px] font-black uppercase tracking-[0.14em] text-primary">Built for local and global support</p>
              </div>
              <p class="text-sm font-medium leading-6 text-foreground/60">
                Fast answers, multilingual support, and simple deployment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[72rem] border-t border-foreground/10 px-4 py-10 sm:px-6 md:py-12">
      <div class="grid items-start gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-8">
        <div>
          <span class="inline-flex text-[10px] font-black uppercase tracking-[0.16em] text-primary">What we do</span>
          <h2 class="mb-3 mt-4 text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">
            Business knowledge into instant answers.
          </h2>
          <p class="text-sm font-semibold leading-6 text-foreground/55">
            Upload website content, PDFs, FAQs, and custom text. ReplySuite turns them into useful customer replies.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <div
            v-for="principle in principles"
            :key="principle.title"
            class="liquid-glass rounded-[1rem] p-5"
          >
            <div class="mb-4 flex h-9 w-9 items-center justify-center rounded-[0.7rem] bg-primary/10">
              <component :is="principle.icon" class="h-4 w-4 text-primary" />
            </div>
            <h3 class="mb-2 text-base font-bold text-foreground">{{ principle.title }}</h3>
            <p class="text-sm font-medium leading-6 text-foreground/55">{{ principle.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <section id="team" class="mx-auto max-w-[72rem] border-t border-foreground/10 px-4 py-10 sm:px-6 md:py-12">
      <div class="mx-auto mb-6 max-w-3xl text-center md:mb-8">
        <span class="badge-gradient mb-4 inline-flex">Team</span>
        <h2 class="mb-3 text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">
          The team behind ReplySuite.
        </h2>
        <p class="text-sm font-semibold leading-6 text-foreground/55">
          Product, engineering, AI automation, and customer support working together.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <article
          v-for="area in teamAreas"
          :key="area.title"
          class="liquid-glass group rounded-[1rem] p-5 transition-all hover:border-primary/25"
        >
          <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-[0.75rem] bg-primary/10 transition-transform group-hover:scale-105">
            <component :is="area.icon" class="h-5 w-5 text-primary" />
          </div>
          <h3 class="mb-2 text-lg font-bold tracking-tight text-foreground">{{ area.title }}</h3>
          <p class="text-sm font-medium leading-6 text-foreground/55">{{ area.desc }}</p>
        </article>
      </div>

      <div class="liquid-glass-gold mt-5 flex flex-col items-start justify-between gap-4 rounded-[1rem] p-5 md:mt-6 md:flex-row md:items-center md:p-6">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[0.75rem] border border-primary/20 bg-background/50">
            <Users class="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 class="mb-2 text-lg font-bold text-foreground md:text-xl">Work with ReplySuite Limited?</h3>
            <p class="max-w-2xl text-sm font-medium leading-6 text-foreground/55">
              Partner, integrate, request a demo, or ask how ReplySuite can help.
            </p>
          </div>
        </div>
        <NuxtLink to="/contact" class="btn-gradient inline-flex items-center gap-2 whitespace-nowrap rounded-[0.78rem] px-5 py-3 text-sm font-bold">
          Contact us
          <ArrowRight class="w-4 h-4" />
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.company-compact :deep(.badge-gradient) {
  border-radius: 0.7rem;
  padding: 0.42rem 0.7rem;
  font-size: 0.68rem;
}

.liquid-glass {
  @apply border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 backdrop-blur-xl dark:bg-white/[0.03];
}

.liquid-glass-soft {
  @apply border border-foreground/10 bg-background/40 shadow-sm shadow-black/5 backdrop-blur-xl dark:bg-white/[0.025];
}

.liquid-glass-gold {
  @apply border border-primary/15 bg-primary/[0.08] shadow-sm shadow-black/5 backdrop-blur-xl;
}
</style>
