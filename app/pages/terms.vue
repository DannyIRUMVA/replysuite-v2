<script setup lang="ts">
import { ShieldCheck, Scale, FileText, Lock, Globe, Mail } from 'lucide-vue-next'

useSeoMeta({
  title: 'Terms of Service | ReplySuite',
  description: 'Read the terms for using ReplySuite.',
})

definePageMeta({
  layout: 'default'
})

const sections = [
  { id: 'introduction', title: 'Introduction', icon: FileText },
  { id: 'accounts', title: 'Accounts', icon: Lock },
  { id: 'subscriptions', title: 'Billing', icon: Scale },
  { id: 'usage', title: 'Usage', icon: ShieldCheck },
  { id: 'compliance', title: 'Compliance', icon: Globe },
  { id: 'contact', title: 'Contact', icon: Mail }
]
</script>

<template>
  <div class="relative min-h-screen bg-background text-foreground/50">
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 border-b border-foreground/5 relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>
      <span class="badge-gradient mb-10">Terms</span>
      <h1 class="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight text-foreground">
        Terms of service
      </h1>
      <p class="text-foreground/50 font-bold uppercase tracking-[0.2em] text-xs">Last updated: April 10, 2026</p>
    </section>

    <div class="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-4 gap-16">
      <aside class="hidden lg:block">
        <div class="sticky top-32 space-y-2">
          <a v-for="s in sections" :key="s.id" :href="`#${s.id}`" class="flex items-center gap-4 p-4 rounded-2xl hover:bg-foreground/5 transition-all group text-foreground/50 hover:text-foreground">
            <component :is="s.icon" class="w-5 h-5 group-hover:text-primary transition-colors" />
            <span class="text-sm font-bold tracking-widest uppercase">{{ s.title }}</span>
          </a>
        </div>
      </aside>

      <main class="lg:col-span-3 prose dark:prose-invert prose-primary max-w-none">
        <section id="introduction" class="mb-20">
          <h2 class="text-3xl font-bold mb-8 tracking-tight flex items-center gap-4 text-foreground">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <FileText class="w-5 h-5" />
            </div>
            Introduction
          </h2>
          <p class="leading-relaxed text-lg">
            These terms explain how you may use ReplySuite and what to expect from the service.
          </p>
          <p class="leading-relaxed text-lg">
            By using ReplySuite, you agree to these terms and our privacy policy.
          </p>
        </section>

        <section id="accounts" class="mb-20">
          <h2 class="text-3xl font-bold mb-8 tracking-tight flex items-center gap-4 text-foreground">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Lock class="w-5 h-5" />
            </div>
            Accounts
          </h2>
          <p class="leading-relaxed">
            You are responsible for keeping your account information accurate and your sign-in details secure.
          </p>
          <ul class="space-y-4">
            <li>Keep your password private.</li>
            <li>Use accurate information.</li>
            <li>Tell us if you believe your account was compromised.</li>
          </ul>
        </section>

        <section id="subscriptions" class="mb-20">
          <h2 class="text-3xl font-bold mb-8 tracking-tight flex items-center gap-4 text-foreground">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Scale class="w-5 h-5" />
            </div>
            Billing
          </h2>
          <p class="leading-relaxed">
            Paid plans are billed on a recurring basis. You can review your plan and billing from your account.
          </p>
        </section>

        <section id="usage" class="mb-20">
          <h2 class="text-3xl font-bold mb-8 tracking-tight flex items-center gap-4 text-foreground">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck class="w-5 h-5" />
            </div>
            Usage
          </h2>
          <p class="leading-relaxed">
            You may not use ReplySuite for spam, harassment, abuse, or anything that violates the rules of connected platforms.
          </p>
        </section>

        <section id="contact" class="mb-20">
          <h2 class="text-3xl font-bold mb-8 tracking-tight flex items-center gap-4 text-foreground">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Mail class="w-5 h-5" />
            </div>
            Contact
          </h2>
          <p class="leading-relaxed">
            Questions? Contact <a href="mailto:legal@replysuite.app" class="text-primary hover:underline font-bold">legal@replysuite.app</a>.
          </p>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.prose h2 { @apply text-foreground border-b border-foreground/5 pb-6 mt-20; }
.prose p { @apply text-foreground/50 leading-loose; }
.prose ul { @apply list-disc list-inside; }
</style>
