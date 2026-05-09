<script setup lang="ts">
import { ShieldCheck, FileText, Lock, Globe, MessageCircle, Mail, Eye, ArrowRight } from 'lucide-vue-next'

useSeoMeta({
  title: 'Privacy Policy | ReplySuite',
  description: 'Learn how ReplySuite handles account data and customer conversation data.',
})

definePageMeta({
  layout: 'default'
})

const sections = [
  { id: 'intro', title: 'Introduction', icon: FileText },
  { id: 'collection', title: 'Data collection', icon: Eye },
  { id: 'usage', title: 'How we use data', icon: MessageCircle },
  { id: 'security', title: 'Security', icon: Lock },
  { id: 'rights', title: 'Your rights', icon: Globe },
  { id: 'contact', title: 'Contact', icon: Mail }
]
</script>

<template>
  <div class="relative min-h-screen bg-background">
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 border-b border-foreground/5 relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>
      <span class="badge-gradient mb-10">Privacy</span>
      <h1 class="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight text-foreground">
        Privacy policy
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
        <section id="intro" class="mb-20">
          <h2 class="text-3xl font-bold mb-8 tracking-tight flex items-center gap-4 text-foreground">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <FileText class="w-5 h-5" />
            </div>
            Introduction
          </h2>
          <p class="text-foreground/50 leading-relaxed text-lg">
            This policy explains what data ReplySuite collects and how we use it.
          </p>
          <p class="text-foreground/50 leading-relaxed text-lg">
            By using ReplySuite, you agree to this policy.
          </p>
        </section>

        <section id="collection" class="mb-20">
          <h2 class="text-3xl font-bold tracking-tight flex items-center gap-4 text-foreground">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Eye class="w-5 h-5" />
            </div>
            Data collection
          </h2>
          <p class="text-foreground/50 leading-relaxed">
            We collect account data, service usage data, and data needed to provide the product.
          </p>
          <div class="grid md:grid-cols-2 gap-8 my-10 font-medium">
            <div class="glass-card p-8 border-foreground/10 bg-foreground/[0.01]">
              <h4 class="text-primary font-bold tracking-widest text-xs mb-4">account data</h4>
              <p class="text-foreground/50 text-sm">Name, email, and business details you provide.</p>
            </div>
            <div class="glass-card p-8 border-foreground/10 bg-foreground/[0.01]">
              <h4 class="text-primary font-bold tracking-widest text-xs mb-4">usage data</h4>
              <p class="text-foreground/50 text-sm">Product activity, browser details, and service diagnostics.</p>
            </div>
          </div>
        </section>

        <section id="usage" class="mb-20">
          <h2 class="text-3xl font-bold tracking-tight flex items-center gap-4 text-foreground">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <MessageCircle class="w-5 h-5" />
            </div>
            How we use data
          </h2>
          <p class="text-foreground/50 leading-relaxed">
            We use data to run the product, improve reliability, support your account, and maintain security.
          </p>
        </section>

        <section id="rights" class="mb-20">
          <h2 class="text-3xl font-bold tracking-tight flex items-center gap-4 text-foreground">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Globe class="w-5 h-5" />
            </div>
            Your rights
          </h2>
          <p class="text-foreground/50 leading-relaxed">
            Depending on your region, you may have rights to access, correct, delete, or limit the use of your personal data.
          </p>
        </section>

        <section id="contact" class="mb-20">
          <h2 class="text-3xl font-bold tracking-tight flex items-center gap-4 text-foreground">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Mail class="w-5 h-5" />
            </div>
            Contact
          </h2>
          <p class="text-foreground/50 leading-relaxed">
            Questions? Contact <a href="mailto:security@replysuite.app" class="text-primary hover:underline font-bold">security@replysuite.app</a>.
          </p>
          <NuxtLink to="/security" class="inline-flex items-center gap-2 text-primary font-bold hover:underline mt-4">
            Read our security page
            <ArrowRight class="w-4 h-4" />
          </NuxtLink>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.prose h2 { @apply text-foreground border-b border-foreground/5 pb-6 mt-20; }
.prose p { @apply text-foreground/50 leading-loose; }
.glass-card { @apply rounded-[24px]; }
</style>
