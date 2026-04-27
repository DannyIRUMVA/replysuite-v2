<script setup lang="ts">
import { Mail, MessageSquare, MapPin, ArrowRight, Zap, Globe, Github, Twitter, Instagram } from 'lucide-vue-next'

useSeoMeta({
  title: 'Contact Us | ReplySuite Support & Sales',
  description: 'Get in touch with the ReplySuite team for support, sales inquiries, or partnership opportunities.',
})

definePageMeta({
  layout: 'default'
})

const channels = [
  {
    name: 'Customer Support',
    email: 'support@replysuite.app',
    desc: 'For technical help and billing questions.',
    icon: MessageSquare
  },
  {
    name: 'Sales & Enterprise',
    email: 'partnership@replysuite.app',
    desc: 'For custom plans and volume pricing.',
    icon: Zap
  },
  {
    name: 'Security & Ethics',
    email: 'security@replysuite.app',
    desc: 'To report vulnerabilities or audit our AI.',
    icon: Mail
  }
]
</script>

<template>
  <div class="relative min-h-screen">
    <!-- Hero -->
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <div class="text-center max-w-3xl mx-auto">
        <span class="badge-gradient mb-10">Get In Touch</span>
        <h1 class="text-6xl md:text-8xl font-extrabold mb-8 tracking-tighter leading-[0.85] text-foreground">
          Let's Start a <br />
          <span class="text-gradient">Dialogue.</span>
        </h1>
        <p class="text-xl text-foreground/60 font-medium leading-relaxed">
          Whether you’re scaling a global brand or just getting started, our team is here to help.
        </p>
      </div>
    </section>

    <!-- Channels -->
    <section class="max-w-7xl mx-auto px-6 py-20">
      <div class="grid lg:grid-cols-3 gap-8 mb-32">
        <div v-for="c in channels" :key="c.name" class="glass-card p-12 border-foreground/5 bg-foreground/[0.02] rounded-[48px] hover:border-primary/20 transition-all group">
          <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-10 group-hover:scale-110 transition-transform">
            <component :is="c.icon" class="w-6 h-6" />
          </div>
          <h3 class="text-2xl font-bold text-foreground mb-2 tracking-tight">{{ c.name }}</h3>
          <p class="text-foreground/50 mb-8 font-medium text-sm">{{ c.desc }}</p>
          <a :href="`mailto:${c.email}`" class="text-foreground font-bold hover:text-primary transition-colors flex items-center gap-2 group/link">
            {{ c.email }}
            <ArrowRight class="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>

      <!-- Institutional Info -->
      <div class="max-w-5xl mx-auto grid md:grid-cols-2 gap-20 items-center pt-20 border-t border-foreground/5">
        <div>
          <h2 class="text-3xl font-bold text-foreground mb-6 tracking-tight">Global Presence</h2>
          <p class="text-foreground/50 leading-relaxed font-medium mb-10">
            ReplySuite operates as a remote-first organization with hubs in Kigali, London, and San Francisco. Our support team provides coverage across all major time zones.
          </p>
          <div class="space-y-6">
            <div class="flex items-center gap-4 text-foreground/60">
               <MapPin class="w-5 h-5 text-primary" />
               <span class="font-medium">Kigali, Rwanda — Innovation Hub</span>
            </div>
            <div class="flex items-center gap-4 text-foreground/60">
               <Globe class="w-5 h-5 text-primary" />
               <span class="font-medium">24/7 Global Response Coverage</span>
            </div>
          </div>
        </div>
        
        <!-- Socials -->
        <div class="bg-foreground/[0.02] border border-foreground/5 p-12 rounded-[48px] text-center">
          <h3 class="text-xl font-bold text-foreground mb-8 tracking-tight">Connect on Social</h3>
          <div class="flex justify-center gap-6">
            <a v-for="icon in [Github, Twitter, Instagram]" :key="icon" href="#" class="w-14 h-14 rounded-2xl bg-foreground/5 border border-foreground/5 flex items-center justify-center text-foreground/50 hover:text-primary hover:border-primary/20 transition-all hover:-translate-y-1">
              <component :is="icon" class="w-6 h-6" />
            </a>
          </div>
          <p class="mt-10 text-foreground/50 text-xs uppercase tracking-widest font-bold">Follow our latest updates</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.glass-card { @apply rounded-[48px]; }
</style>
