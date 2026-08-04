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
  <div class="docs-compact relative overflow-hidden">
    <section class="relative mx-auto max-w-[72rem] px-4 py-10 sm:px-6 md:py-12">
      <div class="absolute inset-x-0 top-8 mx-auto h-56 w-[58%] rounded-full bg-primary/[0.08] blur-[110px] -z-10"></div>
      <div class="mx-auto max-w-4xl text-center">
        <span class="badge-gradient mb-4">Documentation</span>
        <h1 class="text-3xl font-extrabold leading-[1.02] tracking-[-0.045em] text-foreground md:text-4xl lg:text-[3.15rem]">
          Build, launch, and integrate ReplySuite with confidence.
        </h1>
        <p class="mx-auto mt-4 max-w-3xl text-sm font-semibold leading-6 text-foreground/60 md:text-[0.95rem]">
          Practical setup guides and developer references for trained AI assistants across your website and WhatsApp conversations.
        </p>
        <div class="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
          <NuxtLink to="/docs/guidance" class="btn-gradient inline-flex items-center justify-center gap-2 rounded-[0.78rem] px-5 py-3 text-sm font-bold">
            Read guidance
            <ArrowRight class="h-4 w-4" />
          </NuxtLink>
          <NuxtLink to="/docs/api" class="inline-flex items-center justify-center gap-2 rounded-[0.78rem] border border-foreground/10 bg-foreground/[0.02] px-5 py-3 text-sm font-bold text-foreground/70 transition hover:border-primary/20 hover:bg-foreground/[0.05] hover:text-primary">
            View API docs
            <Code2 class="h-4 w-4" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[72rem] px-4 pb-10 sm:px-6 md:pb-12">
      <div class="grid gap-4 lg:grid-cols-2">
        <NuxtLink v-for="section in docSections" :key="section.title" :to="section.to" class="doc-card group block rounded-[1rem] p-5 shadow-sm shadow-black/5 md:p-6">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div class="flex h-9 w-9 items-center justify-center rounded-[0.7rem] border border-primary/15 bg-primary/10 text-primary">
              <component :is="section.icon" class="h-4 w-4" />
            </div>
            <ArrowRight class="h-5 w-5 text-foreground/25 transition group-hover:translate-x-1 group-hover:text-primary" />
          </div>
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{{ section.eyebrow }}</p>
          <h2 class="mt-2 text-lg font-bold tracking-tight text-foreground">{{ section.title }}</h2>
          <p class="mt-2 max-w-xl text-sm font-medium leading-6 text-foreground/55">{{ section.desc }}</p>
          <div class="mt-4 grid gap-2 sm:grid-cols-2">
            <div v-for="item in section.items" :key="item" class="rounded-[0.72rem] border border-foreground/10 bg-background/45 px-3 py-2.5 text-xs font-bold text-foreground/60">
              {{ item }}
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section class="mx-auto max-w-[64rem] px-4 py-10 text-center sm:px-6 md:py-12">
      <div class="doc-card rounded-[1rem] p-5 shadow-sm shadow-black/5 md:p-6">
        <Sparkles class="mx-auto mb-4 h-8 w-8 text-primary" />
        <h2 class="text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">Need implementation help?</h2>
        <p class="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-foreground/55">
          If you are connecting a live customer channel or need guidance on a production setup, contact the ReplySuite team.
        </p>
        <NuxtLink to="/contact" class="mt-5 inline-flex items-center gap-2 rounded-[0.78rem] bg-primary px-5 py-3 text-sm font-bold text-black transition hover:brightness-95">
          Contact support
          <Zap class="h-4 w-4 fill-current" />
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.doc-card {
  @apply border border-foreground/10 bg-background-card/45 backdrop-blur-xl;
  background-image:
    linear-gradient(135deg, rgb(var(--surface) / 0.46), rgb(var(--surface) / 0.20)),
    radial-gradient(circle at 12% 0%, rgb(var(--primary) / 0.07), transparent 34%);
}
</style>
