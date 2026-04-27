<script setup lang="ts">
import { Cookie, ShieldCheck, Eye, Scale, ArrowRight, Zap, Info } from 'lucide-vue-next'

useSeoMeta({
  title: 'Cookie Policy | ReplySuite AI',
  description: 'Understand how we use cookies and similar technologies to provide a premium automation experience.',
})

definePageMeta({
  layout: 'default'
})

const cookies = [
  {
    category: 'Essential',
    desc: 'Necessary for the website to function. Includes authentication and security tokens.',
    type: 'Required'
  },
  {
    category: 'Performance',
    desc: 'Helps us understand how visitors interact with our platform to improve performance.',
    type: 'Optional'
  },
  {
    category: 'Functional',
    desc: 'Enables enhanced functionality and personalization, such as remembering your preferences.',
    type: 'Optional'
  }
]
</script>

<template>
  <div class="relative min-h-screen">
    <!-- Hero Section -->
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <div class="text-center max-w-3xl mx-auto mb-20">
        <span class="badge-gradient mb-10">Transparency</span>
        <h1 class="text-6xl md:text-8xl font-extrabold mb-8 tracking-tighter leading-[0.85] text-foreground">
          Cookie <br />
          <span class="text-gradient">Policy.</span>
        </h1>
        <p class="text-xl text-foreground/50 font-medium leading-relaxed">
          We believe in a dark-pattern-free experience. Here is exactly how we use cookies.
        </p>
      </div>
    </section>

    <!-- Content -->
    <div class="max-w-4xl mx-auto px-6 py-20">
      <div class="space-y-6 mb-32">
        <div v-for="c in cookies" :key="c.category" class="glass-card p-10 border-foreground/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div class="flex items-center gap-3 mb-4">
              <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Cookie class="w-4 h-4" />
              </div>
              <h3 class="text-xl font-bold text-foreground tracking-tight">{{ c.category }}</h3>
            </div>
            <p class="text-foreground/50 font-medium leading-relaxed max-w-lg">{{ c.desc }}</p>
          </div>
          <div :class="[
            'px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border',
            c.type === 'Required' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-foreground/5 border-foreground/10 text-foreground/50'
          ]">
            {{ c.type }}
          </div>
        </div>
      </div>

      <main class="prose dark:prose-invert prose-primary prose-lg">
        <section class="mb-24">
          <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Zap class="w-5 h-5 fill-current" />
            </div>
            Why we use cookies
          </h2>
          <p>
            ReplySuite uses cookies and similar technologies (like local storage) to ensure that our application remains secure, performs efficiently, and provides a personalized experience for each brand.
          </p>
        </section>

        <section class="mb-24">
          <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck class="w-5 h-5" />
            </div>
            Your Consent
          </h2>
          <p>
            You have the right to manage your cookie preferences. While essential cookies cannot be disabled as they are required for security and core functionality, you can opt-out of performance and functional cookies at any time.
          </p>
        </section>

        <!-- CTA -->
        <div class="mt-40 p-16 rounded-[48px] bg-foreground/[0.02] border border-foreground/5 text-center">
          <h3 class="text-3xl font-bold text-foreground mb-6 tracking-tight">Questions about your data?</h3>
          <p class="text-foreground/50 mb-10 font-medium">Read our full Privacy Policy or contact our legal team.</p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-6">
            <NuxtLink to="/privacy" class="btn-gradient px-10 py-5 inline-flex items-center gap-4 group">
              Privacy Policy
              <ArrowRight class="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </NuxtLink>
            <a href="mailto:legal@replysuite.app" class="text-foreground font-bold hover:text-primary transition-colors">
              Contact Legal
            </a>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.glass-card { @apply rounded-[32px]; }
</style>
