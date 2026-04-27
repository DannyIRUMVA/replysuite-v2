<script setup lang="ts">
import { ShieldCheck, Scale, FileText, Lock, Globe, MessageCircle, Mail, Eye, Zap, ArrowRight } from 'lucide-vue-next'

useSeoMeta({
  title: 'Privacy Policy | ReplySuite AI',
  description: 'Your privacy is our priority. Learn how ReplySuite handles your brand data with industry-leading security and transparency.',
})

definePageMeta({
  layout: 'default'
})

const sections = [
  { id: 'collection', title: 'Data Collection', icon: FileText },
  { id: 'usage', title: 'Data Usage', icon: MessageCircle },
  { id: 'security', title: 'Security Protocol', icon: Lock },
  { id: 'compliance', title: 'Platform Compliance', icon: ShieldCheck },
  { id: 'ethics', title: 'AI Ethics', icon: Zap },
  { id: 'rights', title: 'User Rights', icon: Globe },
  { id: 'contact', title: 'Contact Support', icon: Mail }
]
</script>

<template>
  <div class="relative min-h-screen bg-background">
    <!-- Hero Header -->
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 border-b border-foreground/5 relative overflow-hidden">
       <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>
       <span class="badge-gradient mb-10">Legal Framework</span>
       <h1 class="text-5xl md:text-8xl font-extrabold mb-8 tracking-tighter text-foreground">
         Privacy <span class="text-gradient">Policy.</span>
       </h1>
       <p class="text-foreground/50 font-bold uppercase tracking-[0.2em] text-xs">Last updated: April 10, 2026</p>
    </section>

    <!-- Content -->
    <div class="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-4 gap-16">
      <!-- Sticky Nav -->
      <aside class="hidden lg:block">
        <div class="sticky top-32 space-y-2">
          <a v-for="s in sections" :key="s.id" :href="`#${s.id}`" class="flex items-center gap-4 p-4 rounded-2xl hover:bg-foreground/5 transition-all group text-foreground/50 hover:text-foreground">
            <component :is="s.icon" class="w-5 h-5 group-hover:text-primary transition-colors" />
            <span class="text-sm font-bold tracking-widest uppercase">{{ s.title }}</span>
          </a>
        </div>
      </aside>

      <!-- Main Text -->
      <main class="lg:col-span-3 prose dark:prose-invert prose-primary max-w-none">
        <p class="text-primary font-bold mb-12 tracking-widest uppercase text-xs">Premium AI Automation Standards</p>
        
        <section id="collection" class="mb-20">
          <h2 class="text-3xl font-bold mb-8 tracking-tight flex items-center gap-4 text-foreground">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <FileText class="w-5 h-5" />
             </div>
             introduction
          </h2>
          <p class="text-foreground/50 leading-relaxed text-lg">
            ReplySuite ("Company", "us", "we", or "our") operates the ReplySuite platform (hereinafter referred to as "Service").
          </p>
          <p class="text-foreground/50 leading-relaxed text-lg">
            Our Privacy Policy governs your visit to our Service and explains how we collect, safeguard, and disclose information that results from your use of our Service. By using the Service, you agree to the collection and use of information in accordance with this policy.
          </p>
        </section>

        <section id="data-collection" class="mb-20">
          <h2 class="text-3xl font-bold tracking-tight flex items-center gap-4 text-foreground">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Eye class="w-5 h-5" />
             </div>
             data collection
          </h2>
          <p class="text-foreground/50 leading-relaxed">
            We collect several different types of information for various purposes to provide and improve our Service to you.
          </p>
          <div class="grid md:grid-cols-2 gap-8 my-10 font-medium">
             <div class="glass-card p-8 border-foreground/5 bg-foreground/[0.01]">
                <h4 class="text-primary font-bold tracking-widest text-xs mb-4">personal data</h4>
                <p class="text-foreground/50 text-sm">email address, name, and connected platform metadata.</p>
             </div>
             <div class="glass-card p-8 border-foreground/5 bg-foreground/[0.01]">
                <h4 class="text-primary font-bold tracking-widest text-xs mb-4">usage data</h4>
                <p class="text-foreground/50 text-sm">ip address, browser type, diagnostic data, and interaction history.</p>
             </div>
          </div>
        </section>

        <section id="gdpr" class="mb-20">
          <h2 class="text-3xl font-bold tracking-tight flex items-center gap-4 text-foreground">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Globe class="w-5 h-5" />
             </div>
             gdpr & rights
          </h2>
          <p class="text-foreground/50 leading-relaxed">
            If you are a resident of the European Economic Area (EEA), you have certain data protection rights. ReplySuite aims to take reasonable steps to allow you to correct, amend, delete, or limit the use of your Personal Data.
          </p>
        </section>

        <section id="contact" class="mb-20">
           <h2 class="text-3xl font-bold tracking-tight flex items-center gap-4 text-foreground">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Mail class="w-5 h-5" />
             </div>
             contact
          </h2>
          <p class="text-foreground/50 leading-relaxed">
            If you have any questions about this Privacy Policy, please contact our security team at <a href="mailto:security@replysuite.app" class="text-primary hover:underline font-bold">security@replysuite.app</a>.
          </p>
        </section>

        <section id="ethics" class="mb-20">
           <h2 class="text-3xl font-bold tracking-tight flex items-center gap-4 text-foreground">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Zap class="w-5 h-5 fill-current" />
             </div>
             AI Ethics & Transparency
          </h2>
          <p class="text-foreground/50 leading-relaxed mb-6">
            We are committed to responsible AI. This includes ensuring your data is never used for training global models and providing transparency on our model usage.
          </p>
          <NuxtLink to="/ethics" class="inline-flex items-center gap-2 text-primary font-bold hover:underline">
            View full AI Ethics Statement
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
.glass-card { @apply rounded-[32px]; }
</style>
