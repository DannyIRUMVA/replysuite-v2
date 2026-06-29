<script setup lang="ts">
import { Zap, Instagram, Globe2, Linkedin } from 'lucide-vue-next'
import { freeTools } from '~~/shared/free-tools'

const { openFeedback } = useFeedback()
const footerTools = freeTools.slice(0, 6)
const { openSettings } = useCookieConsent()

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
  <footer class="relative overflow-hidden border-t border-foreground/10 bg-background-card/70">
    <div class="absolute inset-0 pointer-events-none footer-glow"></div>
    <div class="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

    <div class="relative max-w-7xl mx-auto px-6 py-16 md:py-20">
      <!-- Top Brand Row -->
      <div class="flex flex-col md:flex-row justify-between items-start gap-10 mb-14 pb-14 border-b border-foreground/10">
      <div class="max-w-md">
        <div class="flex items-center gap-3 mb-8">
          <Zap class="text-primary w-8 h-8 fill-current" />
          <span class="text-3xl font-bold tracking-tighter text-foreground">ReplySuite</span>
        </div>
        <p class="text-foreground/65 leading-relaxed font-medium">
          A calm AI command center for customer conversations. Train once, reply everywhere, book appointments, manage bookings, and get paid.
        </p>
      </div>
      <div class="flex gap-4">
        <a v-for="item in socialLinks" :key="item.label" :href="item.href" target="_blank" rel="noopener noreferrer"
          :aria-label="item.label"
          class="p-4 rounded-2xl border border-foreground/10 bg-background/35 text-foreground/65 shadow-sm backdrop-blur-xl hover:text-primary hover:border-primary/20 hover:bg-primary/10 transition-all hover:-translate-y-1">
          <component :is="item.icon" class="w-5 h-5" />
        </a>
      </div>
    </div>

    <!-- Footer Links Grid -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-10 mb-14">
      <!-- Column 1: Product -->
      <div>
        <h2 class="text-[4px] font-bold uppercase tracking-[0.16em] text-primary mb-4">Product</h2>
        <ul class="space-y-4">
          <li v-for="link in [
            { name: 'Product Overview', to: '/product' },
            { name: 'Features', to: '/features' },
            { name: 'Free Tools', to: '/tools' },
            { name: 'Pricing & Plans', to: '/pricing' },
            { name: 'Product Changelog', to: '/changelog' }
          ]" :key="link.name">
            <NuxtLink :to="link.to"
              class="text-sm text-foreground/65 hover:text-foreground transition-colors font-medium">{{ link.name }}
            </NuxtLink>
          </li>
        </ul>
      </div>

      <!-- Column 2: Tools -->
      <div>
        <h2 class="text-[4px] font-bold uppercase tracking-[0.16em] text-primary mb-4">Tools</h2>
        <ul class="space-y-4">
          <li>
            <NuxtLink to="/tools"
              class="text-sm text-foreground/65 hover:text-foreground transition-colors font-medium">All Free Tools</NuxtLink>
          </li>
          <li v-for="tool in footerTools" :key="tool.slug">
            <NuxtLink :to="`/tools/${tool.slug}`"
              class="text-sm text-foreground/65 hover:text-foreground transition-colors font-medium">{{ tool.shortTitle }}</NuxtLink>
          </li>
        </ul>
      </div>

      <!-- Column 3: Resources -->
      <div>
        <h2 class="text-[4px] font-bold uppercase tracking-[0.16em] text-primary mb-4">Resources</h2>
        <ul class="space-y-4">
          <li v-for="link in [
            { name: 'Blog & Insights', to: '/blog' },
            { name: 'Success Stories', to: '/about#mission' },
            { name: 'Community Hub', to: '/community' },
            { name: 'Documentation', to: '/docs' }
          ]" :key="link.name">
            <NuxtLink :to="link.to"
              class="text-sm text-foreground/65 hover:text-foreground transition-colors font-medium">{{ link.name }}
            </NuxtLink>
          </li>
        </ul>
      </div>

      <!-- Column 4: Company -->
      <div>
        <h2 class="text-[4px] font-bold uppercase tracking-[0.16em] text-primary mb-4">Company</h2>
        <ul class="space-y-4">
          <li v-for="link in [
            { name: 'Company', to: '/company' },
            { name: 'Our Story', to: '/about' },
            { name: 'Contact Sales', to: '/contact' },
            { name: 'Institutional Email', to: 'mailto:support@replysuite.app' }
          ]" :key="link.name">
            <NuxtLink :to="link.to"
              class="text-sm text-foreground/65 hover:text-foreground transition-colors font-medium">{{ link.name }}
            </NuxtLink>
          </li>
          <li>
            <button @click="openFeedback('Guest Footer')"
              class="text-sm text-foreground/65 hover:text-foreground transition-colors font-medium">Share
              Feedback</button>
          </li>
        </ul>
      </div>

      <!-- Column 5: Trust & Legal -->
      <div>
        <h2 class="text-[4px] font-bold uppercase tracking-[0.16em] text-primary mb-4">Trust & Legal</h2>
        <ul class="space-y-4">
          <li v-for="link in [
            { name: 'AI Ethics', to: '/ethics' },
            { name: 'Privacy Policy', to: '/privacy' },
            { name: 'Terms of Service', to: '/terms' },
            { name: 'Cookie Policy', to: '/cookie' }
          ]" :key="link.name">
            <NuxtLink :to="link.to"
              class="text-sm text-foreground/65 hover:text-foreground transition-colors font-medium">{{ link.name }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>

    <!-- Bottom Bar -->
      <div class="pt-8 border-t border-foreground/10 flex flex-col md:flex-row items-center justify-between gap-8">
      <div class="flex flex-col gap-3">
        <div class="text-[10px] text-foreground/60 font-bold uppercase tracking-widest">
          © 2026 ReplySuite Ltd. All rights reserved.
        </div>
        <button
          @click="openSettings"
          class="text-left text-[10px] text-foreground/60 hover:text-primary transition-colors font-bold uppercase tracking-widest"
        >
          Cookie settings
        </button>
      </div>

      <div class="flex items-center gap-8">
        <div
          class="flex items-center gap-3 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/15 shadow-sm backdrop-blur-xl text-[10px] font-bold text-green-500/80 uppercase tracking-widest">
          <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          All Systems Operational
        </div>
        <div
          class="hidden md:flex items-center gap-6 text-[10px] text-foreground/60 font-bold uppercase tracking-widest">
          <div class="flex items-center gap-2 group cursor-pointer hover:text-foreground transition-colors">
            <Globe2 class="w-3 h-3 group-hover:text-primary" />
            <select aria-label="Select footer language" class="bg-transparent border-none focus:ring-0 cursor-pointer appearance-none">
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
    </div>
  </footer>
</template>

<style scoped>
.footer-glow {
  background:
    radial-gradient(circle at 12% 12%, rgb(var(--primary) / 0.14), transparent 28%),
    radial-gradient(circle at 88% 8%, rgba(59, 130, 246, 0.10), transparent 24%),
    linear-gradient(180deg, rgb(var(--surface) / 0.72), rgb(var(--background) / 0.92));
}
</style>
