<script setup lang="ts">
import { Zap, Instagram, Globe2, Linkedin } from 'lucide-vue-next'
import { freeTools } from '~~/shared/free-tools'

const { openFeedback } = useFeedback()
const footerTools = freeTools.slice(0, 6)

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
  <footer class="relative overflow-hidden border-t border-foreground/10 bg-background-card/55">
    <div class="absolute inset-0 pointer-events-none footer-glow"></div>
    <div class="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

    <div class="relative max-w-[72rem] mx-auto px-4 sm:px-6 py-10 md:py-12">
      <!-- Top Brand Row -->
      <div class="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 pb-8 border-b border-foreground/10">
      <div class="max-w-md">
        <div class="flex items-center gap-2.5 mb-4">
          <Zap class="text-primary w-5 h-5 fill-current" />
          <span class="text-xl font-bold tracking-tight text-foreground">ReplySuite</span>
        </div>
        <p class="text-sm text-foreground/65 leading-6 font-medium">
          A calm AI command center for customer conversations. Train once, reply everywhere, book appointments, manage bookings, and get paid.
        </p>
      </div>
      <div class="flex gap-2.5">
        <a v-for="item in socialLinks" :key="item.label" :href="item.href" target="_blank" rel="noopener noreferrer"
          :aria-label="item.label"
          class="p-2.5 rounded-[0.72rem] border border-foreground/10 bg-background/35 text-foreground/65 shadow-sm backdrop-blur-xl hover:text-primary hover:border-primary/20 hover:bg-primary/10 transition-all">
          <component :is="item.icon" class="w-5 h-5" />
        </a>
      </div>
    </div>

    <!-- Footer Links Grid -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8 mb-8">
      <!-- Column 1: Product -->
      <div>
        <div role="heading" aria-level="2" class="mb-4 text-[9px] font-bold uppercase tracking-[0.14em] text-primary">Product</div>
        <ul class="space-y-2.5">
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
        <div role="heading" aria-level="2" class="mb-4 text-[9px] font-bold uppercase tracking-[0.14em] text-primary">Tools</div>
        <ul class="space-y-2.5">
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
        <div role="heading" aria-level="2" class="mb-4 text-[9px] font-bold uppercase tracking-[0.14em] text-primary">Resources</div>
        <ul class="space-y-2.5">
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
        <div role="heading" aria-level="2" class="mb-4 text-[9px] font-bold uppercase tracking-[0.14em] text-primary">Company</div>
        <ul class="space-y-2.5">
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
        <div role="heading" aria-level="2" class="mb-4 text-[9px] font-bold uppercase tracking-[0.14em] text-primary">Trust & Legal</div>
        <ul class="space-y-2.5">
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
      <div class="pt-6 border-t border-foreground/10 flex flex-col md:flex-row items-center justify-between gap-5">
      <div class="text-[10px] text-foreground/60 font-bold uppercase tracking-widest">
        © 2026 ReplySuite Ltd. All rights reserved.
      </div>

      <div class="flex items-center gap-2 text-[10px] text-foreground/60 font-bold uppercase tracking-widest">
        <Globe2 class="w-3 h-3 text-primary" />
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
