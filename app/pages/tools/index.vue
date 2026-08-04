<script setup lang="ts">
import { ArrowRight, Bot, CalendarCheck, MessageCircle, Search, ShieldCheck, Sparkles, Star } from 'lucide-vue-next'
import { freeToolCategories, freeTools } from '~~/shared/free-tools'

useSeoMeta({
  title: 'Free AI Reply Generators',
  description: 'Use ReplySuite free tools to generate customer replies, Google review responses, WhatsApp Business messages, complaint responses, and booking confirmations.',
  keywords: 'free AI reply generator, Google review reply generator, customer complaint response generator, WhatsApp business reply generator, booking confirmation message generator',
  robots: 'index, follow, max-image-preview:large',
  ogTitle: 'Free AI Reply Generators | ReplySuite',
  ogDescription: 'Generate professional customer replies for reviews, complaints, WhatsApp, and bookings — then automate them with ReplySuite.',
  ogUrl: 'https://replysuite.app/tools',
  twitterTitle: 'Free AI Reply Generators | ReplySuite',
  twitterDescription: 'Generate customer replies, review responses, WhatsApp Business messages, and booking confirmations.',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://replysuite.app/tools' }],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Free AI Reply Generators',
        description: 'Free ReplySuite tools for generating customer replies and business responses.',
        url: 'https://replysuite.app/tools',
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: freeTools.map((tool, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: tool.title,
            url: `https://replysuite.app/tools/${tool.slug}`,
          })),
        },
      }),
    },
  ],
})

const categoryIcons: Record<string, any> = {
  Reviews: Star,
  Support: ShieldCheck,
  Messaging: MessageCircle,
  Bookings: CalendarCheck,
}

const groupedTools = computed(() => freeToolCategories.map((category) => ({
  category,
  icon: categoryIcons[category] || Bot,
  tools: freeTools.filter((tool) => tool.category === category),
})))
</script>

<template>
  <main class="tools-compact min-h-screen overflow-hidden pb-12">
    <section class="relative mx-auto max-w-[72rem] px-4 py-10 sm:px-6 md:py-12">
      <div class="absolute left-1/2 top-0 -z-10 h-56 w-[58%] -translate-x-1/2 rounded-full bg-primary/[0.08] blur-[110px]"></div>
      <div class="mx-auto max-w-4xl text-center">
        <span class="inline-flex items-center gap-2 rounded-[0.7rem] border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
          <Sparkles class="h-3.5 w-3.5" /> Free ReplySuite tools
        </span>
        <h1 class="mt-4 text-3xl font-extrabold leading-[1.02] tracking-[-0.045em] text-foreground md:text-4xl lg:text-[3.15rem]">
          Free AI reply generators for customer conversations.
        </h1>
        <p class="mx-auto mt-4 max-w-3xl text-sm font-semibold leading-6 text-foreground/60 md:text-[0.95rem]">
          Generate professional responses for Google reviews, angry customers, WhatsApp inquiries, refund requests, and booking messages. Built for businesses that want faster, calmer replies.
        </p>
        <div class="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <NuxtLink to="/tools/google-review-reply-generator" class="btn-gradient inline-flex items-center gap-2 rounded-[0.78rem] px-5 py-3 text-sm font-bold">
            Try Google review reply
            <ArrowRight class="h-4 w-4" />
          </NuxtLink>
          <NuxtLink to="/register?ref=free-tools" class="inline-flex items-center gap-2 rounded-[0.78rem] border border-foreground/10 bg-foreground/[0.02] px-5 py-3 text-sm font-bold text-foreground/70 transition hover:border-primary/30 hover:bg-foreground/[0.05] hover:text-foreground">
            Automate replies with ReplySuite
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[72rem] px-4 sm:px-6">
      <div class="grid gap-4 lg:grid-cols-3">
        <article v-for="tool in freeTools.slice(0, 3)" :key="tool.slug" class="rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 backdrop-blur-xl">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">{{ tool.category }}</p>
          <div role="heading" aria-level="2" class="mt-3 text-lg font-bold tracking-tight text-foreground">{{ tool.title }}</div>
          <p class="mt-2 text-sm leading-6 text-foreground/60">{{ tool.description }}</p>
          <NuxtLink :to="`/tools/${tool.slug}`" class="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
            Open tool <ArrowRight class="h-4 w-4" />
          </NuxtLink>
        </article>
      </div>
    </section>

    <section class="mx-auto mt-10 max-w-[72rem] px-4 sm:px-6 md:mt-12">
      <div class="mb-6 flex items-end justify-between gap-4">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Tool library</p>
          <h2 class="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">Start with the exact reply you need.</h2>
        </div>
        <Search class="hidden h-8 w-8 text-foreground/20 sm:block" />
      </div>

      <div class="space-y-4">
        <div v-for="group in groupedTools" :key="group.category" class="rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
          <div class="mb-4 flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-[0.7rem] bg-primary/10 text-primary">
              <component :is="group.icon" class="h-4 w-4" />
            </div>
            <div role="heading" aria-level="3" class="text-lg font-bold tracking-tight text-foreground">{{ group.category }}</div>
          </div>
          <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <NuxtLink v-for="tool in group.tools" :key="tool.slug" :to="`/tools/${tool.slug}`" class="group rounded-[0.9rem] border border-foreground/10 bg-background/45 p-4 transition hover:border-primary/30 hover:bg-background-card/65">
              <p class="text-sm font-black text-foreground">{{ tool.shortTitle }}</p>
              <p class="mt-2 text-sm leading-6 text-foreground/60">{{ tool.description }}</p>
              <span class="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-primary">
                Generate reply <ArrowRight class="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto mt-10 max-w-[72rem] px-4 sm:px-6 md:mt-12">
      <div class="rounded-[1rem] border border-primary/15 bg-primary/[0.08] p-5 shadow-sm shadow-black/5 sm:p-6 lg:flex lg:items-center lg:justify-between lg:gap-8">
        <div class="max-w-2xl">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">From free tool to automation</p>
          <h2 class="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">Want ReplySuite to reply automatically?</h2>
          <p class="mt-3 text-sm font-semibold leading-6 text-foreground/60">
            These tools create one reply at a time. ReplySuite learns your website, FAQs, services, tone, booking rules, and policies so your assistant can answer on website chat, WhatsApp, Instagram comments, Instagram DMs, and appointments.
          </p>
        </div>
        <NuxtLink to="/register?ref=free-tools" class="btn-gradient mt-5 inline-flex shrink-0 items-center gap-2 rounded-[0.78rem] px-5 py-3 text-sm font-bold lg:mt-0">
          Train your assistant
          <ArrowRight class="h-4 w-4" />
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
