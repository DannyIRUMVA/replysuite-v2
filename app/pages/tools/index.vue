<script setup lang="ts">
import { ArrowRight, Bot, CalendarCheck, MessageCircle, Search, ShieldCheck, Sparkles, Star } from 'lucide-vue-next'
import { freeToolCategories, freeTools } from '~~/shared/free-tools'

useSeoMeta({
  title: 'Free AI Reply Generators',
  description: 'Use ReplySuite free tools to generate customer replies, Google review responses, WhatsApp Business messages, complaint responses, and booking confirmations.',
  ogTitle: 'Free AI Reply Generators | ReplySuite',
  ogDescription: 'Generate professional customer replies for reviews, complaints, WhatsApp, and bookings — then automate them with ReplySuite.',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://replysuite.app/tools' }],
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
  <main class="min-h-screen overflow-hidden pb-24 pt-12">
    <section class="relative px-4 py-16 sm:px-6 lg:py-24">
      <div class="absolute left-1/2 top-0 -z-10 h-[420px] w-[min(900px,90vw)] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]"></div>
      <div class="mx-auto max-w-5xl text-center">
        <span class="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
          <Sparkles class="h-4 w-4" /> Free ReplySuite tools
        </span>
        <h1 class="mt-8 text-4xl font-black tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Free AI reply generators for customer conversations.
        </h1>
        <p class="mx-auto mt-6 max-w-3xl text-base font-medium leading-relaxed text-foreground/65 sm:text-lg">
          Generate professional responses for Google reviews, angry customers, WhatsApp inquiries, refund requests, and booking messages. Built for businesses that want faster, calmer replies.
        </p>
        <div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <NuxtLink to="/tools/google-review-reply-generator" class="btn-gradient inline-flex items-center gap-2 px-7 py-3 text-sm font-black">
            Try Google review reply
            <ArrowRight class="h-4 w-4" />
          </NuxtLink>
          <NuxtLink to="/register?ref=free-tools" class="inline-flex items-center gap-2 rounded-full border border-foreground/10 px-7 py-3 text-sm font-bold text-foreground/70 transition hover:border-primary/30 hover:text-foreground">
            Automate replies with ReplySuite
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-4 sm:px-6">
      <div class="grid gap-6 lg:grid-cols-3">
        <article v-for="tool in freeTools.slice(0, 3)" :key="tool.slug" class="rounded-[32px] border border-foreground/10 bg-background-card/70 p-6 shadow-2xl shadow-foreground/5 backdrop-blur-xl">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">{{ tool.category }}</p>
          <h2 class="mt-4 text-2xl font-black tracking-tight text-foreground">{{ tool.title }}</h2>
          <p class="mt-3 text-sm leading-relaxed text-foreground/65">{{ tool.description }}</p>
          <NuxtLink :to="`/tools/${tool.slug}`" class="mt-6 inline-flex items-center gap-2 text-sm font-black text-primary">
            Open tool <ArrowRight class="h-4 w-4" />
          </NuxtLink>
        </article>
      </div>
    </section>

    <section class="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
      <div class="mb-8 flex items-end justify-between gap-4">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Tool library</p>
          <h2 class="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Start with the exact reply you need.</h2>
        </div>
        <Search class="hidden h-10 w-10 text-foreground/20 sm:block" />
      </div>

      <div class="space-y-8">
        <div v-for="group in groupedTools" :key="group.category" class="rounded-[36px] border border-foreground/10 bg-foreground/[0.02] p-5 sm:p-7">
          <div class="mb-5 flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <component :is="group.icon" class="h-5 w-5" />
            </div>
            <h3 class="text-xl font-black tracking-tight text-foreground">{{ group.category }}</h3>
          </div>
          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <NuxtLink v-for="tool in group.tools" :key="tool.slug" :to="`/tools/${tool.slug}`" class="group rounded-[26px] border border-foreground/10 bg-background-card/70 p-5 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
              <p class="text-sm font-black text-foreground">{{ tool.shortTitle }}</p>
              <p class="mt-2 text-sm leading-relaxed text-foreground/60">{{ tool.description }}</p>
              <span class="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-primary">
                Generate reply <ArrowRight class="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
      <div class="rounded-[40px] border border-primary/20 bg-primary/10 p-8 sm:p-12 lg:flex lg:items-center lg:justify-between lg:gap-12">
        <div class="max-w-2xl">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">From free tool to automation</p>
          <h2 class="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Want ReplySuite to reply automatically?</h2>
          <p class="mt-4 text-sm leading-relaxed text-foreground/65 sm:text-base">
            These tools create one reply at a time. ReplySuite learns your website, FAQs, services, tone, booking rules, and policies so your assistant can answer on website chat, WhatsApp, Instagram comments, Instagram DMs, and appointments.
          </p>
        </div>
        <NuxtLink to="/register?ref=free-tools" class="btn-gradient mt-8 inline-flex shrink-0 items-center gap-2 px-8 py-4 text-sm font-black lg:mt-0">
          Train your assistant
          <ArrowRight class="h-4 w-4" />
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
