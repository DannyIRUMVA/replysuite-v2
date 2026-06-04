<script setup lang="ts">
import { Mail, MessageSquare, MapPin, ArrowRight, Zap, Globe, Instagram, Linkedin, ShieldCheck, Clock3, HelpCircle } from 'lucide-vue-next'

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
    desc: 'Help with setup, billing, training, and product questions.',
    icon: MessageSquare
  },
  {
    name: 'Sales & Demo',
    email: 'partnership@replysuite.app',
    desc: 'Ask about onboarding, demos, volume, or custom rollout help.',
    icon: Zap
  },
  {
    name: 'Security',
    email: 'security@replysuite.app',
    desc: 'Report a vulnerability, abuse concern, or security question.',
    icon: ShieldCheck
  }
]

const quickHelp = [
  { label: 'Setup questions', value: 'Website chatbot, training, and widget install', icon: HelpCircle },
  { label: 'Sales requests', value: 'Pricing, demos, WhatsApp, and rollout support', icon: Zap },
  { label: 'Response expectation', value: 'We reply as quickly as possible by email', icon: Clock3 }
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
  <div class="relative min-h-screen overflow-hidden">
    <section class="max-w-7xl mx-auto px-6 py-20 md:py-24 relative">
      <div class="absolute inset-x-0 top-10 mx-auto h-72 w-[72%] rounded-full bg-primary/10 blur-[140px] -z-10"></div>
      <div class="grid lg:grid-cols-[0.95fr_1.05fr] gap-10 lg:gap-14 items-center">
        <div>
          <span class="badge-gradient mb-6">Contact</span>
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight leading-[1.02] text-foreground">
            Need help getting ReplySuite live?
          </h1>
          <p class="text-base md:text-lg text-foreground/60 font-medium leading-relaxed max-w-2xl">
            Talk to us about setup, pricing, demos, WhatsApp onboarding, security, or a faster rollout for your business.
          </p>
          <div class="mt-8 flex flex-col sm:flex-row gap-4">
            <a href="mailto:support@replysuite.app" class="btn-gradient px-8 py-4 text-sm inline-flex items-center justify-center gap-3">
              Email support
              <ArrowRight class="w-4 h-4" />
            </a>
            <NuxtLink to="/pricing" class="px-8 py-4 rounded-full border border-foreground/10 text-sm font-bold text-foreground/70 hover:text-foreground hover:bg-foreground/[0.04] transition-all inline-flex items-center justify-center gap-3">
              View pricing
              <Zap class="w-4 h-4" />
            </NuxtLink>
          </div>
        </div>

        <div class="liquid-glass rounded-[34px] p-5 md:p-6 relative overflow-hidden">
          <div class="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/15 blur-[100px]"></div>
          <div class="relative grid gap-4">
            <div v-for="item in quickHelp" :key="item.label" class="rounded-[24px] border border-foreground/10 bg-background/55 p-5 backdrop-blur-xl flex items-start gap-4">
              <div class="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <component :is="item.icon" class="w-5 h-5 text-primary" />
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-[0.18em] text-foreground/40 font-black mb-2">{{ item.label }}</p>
                <p class="text-sm md:text-base font-bold text-foreground/75 leading-snug">{{ item.value }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-16 md:py-20 border-t border-foreground/5">
      <div class="text-center max-w-3xl mx-auto mb-10 md:mb-12">
        <span class="badge-gradient mb-5">Email us</span>
        <h2 class="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">Choose the right contact path.</h2>
        <p class="text-foreground/55 font-medium leading-relaxed">Send your message to the right team so we can help faster.</p>
      </div>

      <div class="grid md:grid-cols-3 gap-5 lg:gap-6">
        <article v-for="c in channels" :key="c.name" class="liquid-glass p-6 md:p-7 rounded-[30px] hover:border-primary/20 transition-all group">
          <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-105 transition-transform">
            <component :is="c.icon" class="w-6 h-6" />
          </div>
          <h3 class="text-xl md:text-2xl font-bold text-foreground mb-2 tracking-tight">{{ c.name }}</h3>
          <p class="text-foreground/55 mb-6 font-medium text-sm leading-relaxed">{{ c.desc }}</p>
          <a :href="`mailto:${c.email}`" class="text-sm text-foreground font-bold hover:text-primary transition-colors inline-flex items-center gap-2 group/link break-all">
            {{ c.email }}
            <ArrowRight class="w-4 h-4 flex-shrink-0 group-hover/link:translate-x-1 transition-transform" />
          </a>
        </article>
      </div>
    </section>

    <section class="max-w-6xl mx-auto px-6 py-16 md:py-20 border-t border-foreground/5">
      <div class="liquid-glass rounded-[34px] p-6 md:p-8 lg:p-10 relative overflow-hidden">
        <div class="absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-sky-400/10 blur-[110px]"></div>
        <div class="relative grid md:grid-cols-[0.95fr_1.05fr] gap-8 lg:gap-12 items-center">
          <div>
            <span class="badge-gradient mb-5">Where we work</span>
            <h2 class="text-3xl md:text-5xl font-extrabold text-foreground mb-5 tracking-tight leading-tight">Remote support from Kigali.</h2>
            <p class="text-foreground/55 leading-relaxed font-medium mb-7">
              ReplySuite works remotely and supports customers across time zones. Share your business context and we will help you choose a practical setup path.
            </p>
            <div class="space-y-4">
              <div class="flex items-center gap-4 text-foreground/65">
                <MapPin class="w-5 h-5 text-primary flex-shrink-0" />
                <span class="font-medium">Kigali, Rwanda</span>
              </div>
              <div class="flex items-center gap-4 text-foreground/65">
                <Globe class="w-5 h-5 text-primary flex-shrink-0" />
                <span class="font-medium">Online support across regions</span>
              </div>
            </div>
          </div>

          <div class="rounded-[28px] border border-foreground/10 bg-background/55 p-6 md:p-8 text-center backdrop-blur-xl">
            <h3 class="text-2xl font-bold text-foreground mb-4 tracking-tight">Talk to founder</h3>
            <p class="text-sm text-foreground/55 font-medium mb-7 leading-relaxed">
              Need a walkthrough before you start? Send a message and we can help you choose the fastest setup path.
            </p>
            <div class="flex justify-center gap-4">
              <a v-for="item in socialLinks" :key="item.label" :href="item.href" target="_blank" rel="noopener noreferrer" :aria-label="item.label" class="w-13 h-13 rounded-2xl bg-foreground/5 border border-foreground/10 flex items-center justify-center text-foreground/55 hover:text-primary hover:border-primary/20 transition-all hover:-translate-y-1">
                <component :is="item.icon" class="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.liquid-glass {
  @apply border border-foreground/10 bg-background-card/55 shadow-[0_24px_80px_-44px_rgba(15,23,42,0.35)] backdrop-blur-2xl dark:bg-white/[0.035] dark:shadow-[0_24px_90px_-42px_rgba(0,0,0,0.85)];
  background-image:
    linear-gradient(135deg, rgb(var(--surface) / 0.58), rgb(var(--surface) / 0.22)),
    radial-gradient(circle at 12% 0%, rgb(var(--primary) / 0.10), transparent 34%);
}
</style>
