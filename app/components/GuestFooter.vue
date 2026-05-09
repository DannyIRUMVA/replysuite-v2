<script setup lang="ts">
import { Zap, Instagram, Globe2, Linkedin } from 'lucide-vue-next'

const { openFeedback } = useFeedback()

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
  <footer class="max-w-7xl mx-auto px-6 py-24 border-t border-foreground/5">
    <!-- Top Brand Row -->
    <div class="flex flex-col md:flex-row justify-between items-start gap-12 mb-20 pb-20 border-b border-foreground/5">
      <div class="max-w-md">
        <div class="flex items-center gap-3 mb-8">
          <Zap class="text-primary w-8 h-8 fill-current" />
          <span class="text-3xl font-bold tracking-tighter text-foreground">ReplySuite</span>
        </div>
        <p class="text-foreground/50 leading-relaxed font-medium">
          Embeddable AI chatbot for your website with WhatsApp integration. Train it on your business content, answer faster, and support customers better.
        </p>
      </div>
      <div class="flex gap-4">
        <a v-for="item in socialLinks" :key="item.label" :href="item.href" target="_blank" rel="noopener noreferrer"
          :aria-label="item.label"
          class="p-4 rounded-2xl bg-foreground/[0.02] border border-foreground/5 text-foreground/50 hover:text-primary hover:border-primary/20 transition-all hover:-translate-y-1">
          <component :is="item.icon" class="w-5 h-5" />
        </a>
      </div>
    </div>

    <!-- 4 Column Links Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-16 mb-20">
      <!-- Column 1: Product -->
      <div>
        <h4 class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-10">Product</h4>
        <ul class="space-y-4">
          <li v-for="link in [
            { name: 'Multi-Channel DM', to: '/features' },
            { name: 'Integrations', to: '/integrations' },
            { name: 'Pricing & Plans', to: '/pricing' },
            { name: 'Product Changelog', to: '/changelog' }
          ]" :key="link.name">
            <NuxtLink :to="link.to"
              class="text-sm text-foreground/50 hover:text-foreground transition-colors font-medium">{{ link.name }}
            </NuxtLink>
          </li>
        </ul>
      </div>

      <!-- Column 2: Resources -->
      <div>
        <h4 class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-10">Resources</h4>
        <ul class="space-y-4">
          <li v-for="link in [
            { name: 'Blog & Insights', to: '/blog' },
            { name: 'Success Stories', to: '/about#mission' },
            { name: 'Community Hub', to: '/community' },
            { name: 'API Reference', to: '/docs' }
          ]" :key="link.name">
            <NuxtLink :to="link.to"
              class="text-sm text-foreground/50 hover:text-foreground transition-colors font-medium">{{ link.name }}
            </NuxtLink>
          </li>
        </ul>
      </div>

      <!-- Column 3: Company -->
      <div>
        <h4 class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-10">Company</h4>
        <ul class="space-y-4">
          <li v-for="link in [
            { name: 'Our Story', to: '/about' },
            { name: 'Contact Sales', to: '/contact' },
            { name: 'Institutional Email', to: 'mailto:support@replysuite.app' }
          ]" :key="link.name">
            <NuxtLink :to="link.to"
              class="text-sm text-foreground/50 hover:text-foreground transition-colors font-medium">{{ link.name }}
            </NuxtLink>
          </li>
          <li>
            <button @click="openFeedback('Guest Footer')"
              class="text-sm text-foreground/50 hover:text-foreground transition-colors font-medium">Share
              Feedback</button>
          </li>
        </ul>
      </div>

      <!-- Column 4: Trust & Legal -->
      <div>
        <h4 class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-10">Trust & Legal</h4>
        <ul class="space-y-4">
          <li v-for="link in [
            { name: 'AI Ethics', to: '/ethics' },
            { name: 'Privacy Policy', to: '/privacy' },
            { name: 'Terms of Service', to: '/terms' },
            { name: 'Cookie Policy', to: '/cookie' }
          ]" :key="link.name">
            <NuxtLink :to="link.to"
              class="text-sm text-foreground/50 hover:text-foreground transition-colors font-medium">{{ link.name }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>

    <!-- Bottom Bar -->
    <div class="pt-10 border-t border-foreground/5 flex flex-col md:flex-row items-center justify-between gap-8">
      <div class="flex flex-col gap-2">
        <div class="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">
          © 2026 ReplySuite Ltd. All rights reserved.
        </div>
      </div>

      <div class="flex items-center gap-8">
        <div
          class="flex items-center gap-3 px-4 py-2 rounded-full bg-green-500/5 border border-green-500/10 text-[10px] font-bold text-green-500/80 uppercase tracking-widest">
          <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          All Systems Operational
        </div>
        <div
          class="hidden md:flex items-center gap-6 text-[10px] text-foreground/40 font-bold uppercase tracking-widest">
          <div class="flex items-center gap-2 group cursor-pointer hover:text-foreground transition-colors">
            <Globe2 class="w-3 h-3 group-hover:text-primary" />
            <select class="bg-transparent border-none focus:ring-0 cursor-pointer appearance-none">
              <option value="en">English (US)</option>
              <option value="pt">Português (BR)</option>
              <option value="es">Español (ES)</option>
              <option value="hi">हिन्दी (IN)</option>
              <option value="rw">Kinyarwanda (RW)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* No additional styles needed with Tailwind */
</style>
