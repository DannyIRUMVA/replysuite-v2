<script setup lang="ts">
import { MessageSquare, MapPin, ArrowRight, Zap, Globe, Instagram, Linkedin, ShieldCheck, Clock3, HelpCircle } from 'lucide-vue-next'

useSeoMeta({
  title: 'Contact | ReplySuite',
  description: 'Contact ReplySuite for support, sales, demos, WhatsApp onboarding, or security questions.',
  ogTitle: 'Contact | ReplySuite',
  ogDescription: 'Get help with ReplySuite setup, pricing, demos, WhatsApp onboarding, support, or security.',
  ogUrl: 'https://replysuite.app/contact',
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://replysuite.app/contact' }]
})

definePageMeta({
  layout: 'default'
})

const channels = [
  {
    name: 'Support',
    email: 'support@replysuite.app',
    desc: 'Setup, billing, training, and product questions.',
    icon: MessageSquare
  },
  {
    name: 'Sales & demo',
    email: 'partnership@replysuite.app',
    desc: 'Onboarding, demos, rollout planning, and WhatsApp growth.',
    icon: Zap
  },
  {
    name: 'Security',
    email: 'security@replysuite.app',
    desc: 'Vulnerability reports, abuse concerns, and security questions.',
    icon: ShieldCheck
  }
]

const quickHelp = [
  { label: 'Setup', value: 'Website chatbot, training, and widget install', icon: HelpCircle },
  { label: 'Growth', value: 'Pricing, demos, WhatsApp, and rollout support', icon: Zap },
  { label: 'Reply time', value: 'We reply as quickly as possible by email', icon: Clock3 }
]

const socialLinks = [
  {
    icon: Instagram,
    href: 'https://www.instagram.com/replysuite',
    label: 'Instagram'
  },
  {
    icon: Linkedin,
    href: 'https://rw.linkedin.com/showcase/replysuite/',
    label: 'LinkedIn'
  }
]
</script>

<template>
  <div class="contact-compact relative min-h-screen overflow-hidden">
    <section class="relative mx-auto max-w-[72rem] px-4 py-10 sm:px-6 md:py-12">
      <div class="absolute inset-x-0 top-8 mx-auto h-56 w-[58%] rounded-full bg-primary/[0.08] blur-[110px] -z-10"></div>

      <div class="grid items-center gap-6 lg:grid-cols-[0.92fr_0.78fr] lg:gap-8">
        <div class="max-w-2xl">
          <span class="badge-gradient mb-5 inline-flex">Contact</span>
          <h1 class="mb-4 text-3xl font-extrabold leading-[1.02] tracking-[-0.045em] text-foreground md:text-4xl lg:text-[3.15rem]">
            Need help getting ReplySuite live?
          </h1>
          <p class="max-w-xl text-sm font-semibold leading-6 text-foreground/60 md:text-[0.95rem]">
            Talk to us about setup, pricing, demos, WhatsApp onboarding, security, or a faster rollout for your business.
          </p>

          <div class="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <a href="mailto:support@replysuite.app"
              class="btn-gradient inline-flex items-center justify-center gap-2 rounded-[0.78rem] px-5 py-3 text-sm font-bold">
              Email support
              <ArrowRight class="h-4 w-4" />
            </a>
            <NuxtLink to="/pricing"
              class="inline-flex items-center justify-center gap-2 rounded-[0.78rem] border border-foreground/10 bg-foreground/[0.02] px-5 py-3 text-sm font-bold text-foreground/70 transition-all hover:bg-foreground/[0.05] hover:text-foreground">
              View pricing
              <Zap class="h-4 w-4" />
            </NuxtLink>
          </div>
        </div>

        <div class="rounded-[1rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5 backdrop-blur-xl md:p-5">
          <div class="grid gap-3">
            <div v-for="item in quickHelp" :key="item.label"
              class="flex items-start gap-3 rounded-[0.82rem] border border-foreground/10 bg-background/45 p-3.5 backdrop-blur-xl">
              <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[0.7rem] bg-primary/10">
                <component :is="item.icon" class="h-4 w-4 text-primary" />
              </div>
              <div>
                <p class="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/40">{{ item.label }}</p>
                <p class="text-sm font-bold leading-snug text-foreground/75">{{ item.value }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[72rem] border-t border-foreground/5 px-4 py-10 sm:px-6 md:py-12">
      <div class="mb-6 flex flex-col justify-between gap-4 md:mb-8 md:flex-row md:items-end">
        <div class="max-w-2xl">
          <span class="badge-gradient mb-4 inline-flex">Email us</span>
          <h2 class="mb-2 text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">
            Choose the right contact path.
          </h2>
          <p class="text-sm font-semibold leading-6 text-foreground/55">
            Send your message to the right team so we can help faster.
          </p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <article v-for="c in channels" :key="c.name"
          class="group rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 backdrop-blur-xl transition-all hover:border-primary/20 hover:bg-background-card/60">
          <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-[0.75rem] bg-primary/10 text-primary transition-transform group-hover:scale-105">
            <component :is="c.icon" class="h-5 w-5" />
          </div>
          <h3 class="mb-2 text-lg font-bold tracking-tight text-foreground">{{ c.name }}</h3>
          <p class="mb-5 text-sm font-medium leading-6 text-foreground/55">{{ c.desc }}</p>
          <a :href="`mailto:${c.email}`"
            class="inline-flex items-center gap-2 break-all text-sm font-bold text-foreground transition-colors hover:text-primary">
            {{ c.email }}
            <ArrowRight class="h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-1" />
          </a>
        </article>
      </div>
    </section>

    <section class="mx-auto max-w-[72rem] border-t border-foreground/5 px-4 py-10 sm:px-6 md:py-12">
      <div class="relative overflow-hidden rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 backdrop-blur-sm md:p-6">
        <div class="absolute -bottom-24 right-0 h-56 w-56 rounded-full bg-sky-400/[0.08] blur-[90px]"></div>

        <div class="relative grid items-center gap-5 md:grid-cols-[1fr_0.82fr] lg:gap-8">
          <div class="max-w-2xl">
            <span class="badge-gradient mb-4 inline-flex">Where we work</span>
            <h2 class="mb-3 text-2xl font-extrabold leading-tight tracking-[-0.035em] text-foreground md:text-3xl">
              Remote support from Kigali.
            </h2>
            <p class="mb-5 text-sm font-semibold leading-6 text-foreground/55">
              ReplySuite works remotely and supports customers across time zones. Share your business context and we will help you choose a practical setup path.
            </p>
            <div class="grid gap-2.5 sm:grid-cols-2">
              <div class="flex items-center gap-2.5 rounded-[0.78rem] border border-foreground/10 bg-foreground/[0.02] px-3 py-2.5 text-sm font-semibold text-foreground/65">
                <MapPin class="h-4 w-4 flex-shrink-0 text-primary" />
                <span>Kigali, Rwanda</span>
              </div>
              <div class="flex items-center gap-2.5 rounded-[0.78rem] border border-foreground/10 bg-foreground/[0.02] px-3 py-2.5 text-sm font-semibold text-foreground/65">
                <Globe class="h-4 w-4 flex-shrink-0 text-primary" />
                <span>Online support</span>
              </div>
            </div>
          </div>

          <div class="rounded-[0.9rem] border border-foreground/10 bg-background/45 p-5 backdrop-blur-xl">
            <h3 class="mb-2 text-lg font-bold tracking-tight text-foreground">Talk to founder</h3>
            <p class="mb-5 text-sm font-medium leading-6 text-foreground/55">
              Need a walkthrough before you start? Send a message and we can help you choose the fastest setup path.
            </p>
            <div class="flex gap-2.5">
              <a v-for="item in socialLinks" :key="item.label" :href="item.href" target="_blank" rel="noopener noreferrer"
                :aria-label="item.label"
                class="flex h-10 w-10 items-center justify-center rounded-[0.72rem] border border-foreground/10 bg-foreground/[0.03] text-foreground/55 transition-all hover:border-primary/20 hover:text-primary">
                <component :is="item.icon" class="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.contact-compact :deep(.badge-gradient) {
  border-radius: 0.7rem;
  padding: 0.42rem 0.7rem;
  font-size: 0.68rem;
}
</style>
