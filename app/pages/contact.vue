<script setup lang="ts">
import { Mail, MessageSquare, MapPin, ArrowRight, Zap, Globe, Instagram, Linkedin } from 'lucide-vue-next'

useSeoMeta({
  title: 'Contact | ReplySuite',
  description: 'Contact ReplySuite for support, sales, or security questions.',
})

definePageMeta({
  layout: 'default'
})

const channels = [
  {
    name: 'Support',
    email: 'support@replysuite.app',
    desc: 'Help with setup, billing, and product questions.',
    icon: MessageSquare
  },
  {
    name: 'Sales',
    email: 'partnership@replysuite.app',
    desc: 'Ask about onboarding, volume, or custom help.',
    icon: Zap
  },
  {
    name: 'Security',
    email: 'security@replysuite.app',
    desc: 'Report a vulnerability or security concern.',
    icon: Mail
  }
]

const socialLinks = [
  {
    icon: Instagram,
    href: 'https://www.instagram.com/replysuite',
    label: 'Instagram'
  },
  {
    icon: Linkedin,
    href: 'https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://rw.linkedin.com/showcase/replysuite/&ved=2ahUKEwi_gtGn8qqUAxWBQEEAHR_uFisQFnoECB8QAQ&usg=AOvVaw1qymawqHdl9ObjInc9vRqM',
    label: 'LinkedIn'
  }
]
</script>

<template>
  <div class="relative min-h-screen">
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <div class="text-center max-w-3xl mx-auto">
        <span class="badge-gradient mb-10">Contact</span>
        <h1 class="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight leading-[0.95] text-foreground">
          Need help? Want to talk?
        </h1>
        <p class="text-lg text-foreground/60 font-medium leading-relaxed">
          Send us a message. We can help with setup, pricing, and support.
        </p>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-20">
      <div class="grid lg:grid-cols-3 gap-8 mb-24">
        <div v-for="c in channels" :key="c.name" class="glass-card p-10 border-foreground/10 bg-foreground/[0.02] rounded-[32px] hover:border-primary/20 transition-all group">
          <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform">
            <component :is="c.icon" class="w-6 h-6" />
          </div>
          <h3 class="text-2xl font-bold text-foreground mb-2 tracking-tight">{{ c.name }}</h3>
          <p class="text-foreground/50 mb-6 font-medium text-sm">{{ c.desc }}</p>
          <a :href="`mailto:${c.email}`" class="text-foreground font-bold hover:text-primary transition-colors flex items-center gap-2 group/link">
            {{ c.email }}
            <ArrowRight class="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>

      <div class="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center pt-16 border-t border-foreground/5">
        <div>
          <h2 class="text-3xl font-bold text-foreground mb-6 tracking-tight">Where we work</h2>
          <p class="text-foreground/50 leading-relaxed font-medium mb-8">
            ReplySuite works remotely and supports customers across time zones.
          </p>
          <div class="space-y-4">
            <div class="flex items-center gap-4 text-foreground/60">
              <MapPin class="w-5 h-5 text-primary" />
              <span class="font-medium">Kigali, Rwanda</span>
            </div>
            <div class="flex items-center gap-4 text-foreground/60">
              <Globe class="w-5 h-5 text-primary" />
              <span class="font-medium">Online support across regions</span>
            </div>
          </div>
        </div>

        <div class="bg-foreground/[0.02] border border-foreground/10 p-10 rounded-[32px] text-center">
          <h3 class="text-xl font-bold text-foreground mb-8 tracking-tight">Follow updates</h3>
          <div class="flex justify-center gap-6">
            <a v-for="item in socialLinks" :key="item.label" :href="item.href" target="_blank" rel="noopener noreferrer" :aria-label="item.label" class="w-14 h-14 rounded-2xl bg-foreground/5 border border-foreground/5 flex items-center justify-center text-foreground/50 hover:text-primary hover:border-primary/20 transition-all hover:-translate-y-1">
              <component :is="item.icon" class="w-6 h-6" />
            </a>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.glass-card { @apply rounded-[32px]; }
</style>
