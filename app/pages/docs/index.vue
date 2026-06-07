<script setup lang="ts">
import { ArrowRight, Code2, Compass, Sparkles, Zap } from 'lucide-vue-next'

useSeoMeta({
  title: 'Docs | ReplySuite',
  description: 'ReplySuite documentation for setup guidance, chatbot training, website and WhatsApp deployment, analytics, and API integration.',
  ogTitle: 'ReplySuite Docs',
  ogDescription: 'Guides and API references for launching trained AI chatbots on your website and WhatsApp.',
  ogUrl: 'https://replysuite.app/docs',
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://replysuite.app/docs' }]
})

definePageMeta({ layout: 'default' })

const docSections = [
  {
    title: 'Guidance',
    eyebrow: 'Setup playbook',
    desc: 'Step-by-step guidance for creating your assistant, training it, connecting channels, and monitoring conversations.',
    to: '/docs/guidance',
    icon: Compass,
    items: ['Create your first chatbot', 'Train from URL, text, or PDF', 'Connect website and WhatsApp', 'Review analytics and conversations'],
  },
  {
    title: 'API',
    eyebrow: 'Developer reference',
    desc: 'Integration notes for the website embed, public chatbot config, chat requests, webhook behavior, and safe server-side patterns.',
    to: '/docs/api',
    icon: Code2,
    items: ['Website widget embed', 'Public chat endpoint', 'WhatsApp webhook flow', 'Authentication and security notes'],
  },
]

</script>

<template>
  <div class="relative overflow-hidden">
    <section class="mx-auto max-w-7xl px-6 pb-14 pt-24 md:pb-18 md:pt-28">
      <div class="absolute inset-x-0 top-10 mx-auto h-72 w-[70%] rounded-full bg-primary/10 blur-[140px] -z-10"></div>
      <div class="mx-auto max-w-3xl text-center">
        <span class="badge-gradient mb-6">Documentation</span>
        <h1 class="text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
          Build, launch, and integrate ReplySuite with confidence.
        </h1>
        <p class="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-foreground/55 md:text-lg">
          Practical setup guides and developer references for trained AI assistants across your website and WhatsApp conversations.
        </p>
        <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <NuxtLink to="/docs/guidance" class="btn-gradient inline-flex items-center justify-center gap-3 px-7 py-3.5 text-sm">
            Read guidance
            <ArrowRight class="h-4 w-4" />
          </NuxtLink>
          <NuxtLink to="/docs/api" class="inline-flex items-center justify-center gap-3 rounded-full border border-foreground/10 bg-foreground/[0.03] px-7 py-3.5 text-sm font-bold text-foreground/70 transition hover:border-primary/20 hover:text-primary">
            View API docs
            <Code2 class="h-4 w-4" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-6 pb-16 md:pb-20">
      <div class="grid gap-6 lg:grid-cols-2">
        <NuxtLink v-for="section in docSections" :key="section.title" :to="section.to" class="doc-card group block rounded-[32px] p-6 md:p-8">
          <div class="mb-7 flex items-start justify-between gap-5">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
              <component :is="section.icon" class="h-7 w-7" />
            </div>
            <ArrowRight class="h-5 w-5 text-foreground/25 transition group-hover:translate-x-1 group-hover:text-primary" />
          </div>
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{{ section.eyebrow }}</p>
          <h2 class="mt-3 text-2xl font-black tracking-tight text-foreground md:text-3xl">{{ section.title }}</h2>
          <p class="mt-4 max-w-xl text-sm font-medium leading-relaxed text-foreground/55">{{ section.desc }}</p>
          <div class="mt-7 grid gap-2 sm:grid-cols-2">
            <div v-for="item in section.items" :key="item" class="rounded-2xl border border-foreground/10 bg-background/45 px-4 py-3 text-xs font-bold text-foreground/60">
              {{ item }}
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section class="mx-auto max-w-5xl px-6 py-16 text-center md:py-20">
      <div class="doc-card rounded-[36px] p-8 md:p-12">
        <Sparkles class="mx-auto mb-5 h-9 w-9 text-primary" />
        <h2 class="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">Need implementation help?</h2>
        <p class="mx-auto mt-5 max-w-2xl text-sm font-medium leading-relaxed text-foreground/55 md:text-base">
          If you are connecting a live customer channel or need guidance on a production setup, contact the ReplySuite team.
        </p>
        <NuxtLink to="/contact" class="mt-7 inline-flex items-center gap-3 rounded-full bg-primary px-7 py-3.5 text-sm font-black text-black transition hover:brightness-95">
          Contact support
          <Zap class="h-4 w-4 fill-current" />
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.doc-card {
  @apply border border-foreground/10 bg-background-card/65 shadow-[0_24px_80px_-46px_rgba(0,0,0,0.45)] backdrop-blur-2xl;
  background-image:
    linear-gradient(135deg, rgb(var(--surface) / 0.68), rgb(var(--surface) / 0.24)),
    radial-gradient(circle at 12% 0%, rgb(var(--primary) / 0.10), transparent 34%);
}
</style>
