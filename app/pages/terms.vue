<script setup lang="ts">
import { ShieldCheck, Scale, FileText, Lock, Globe, Mail, Zap } from 'lucide-vue-next'

useSeoMeta({
  title: 'Terms of Service | ReplySuite AI',
  description: 'Understand the legal framework for using ReplySuite automation. Human-like precision backed by sophisticated AI infrastructure.',
})

definePageMeta({
  layout: 'default'
})

const sections = [
  { id: 'introduction', title: 'Introduction', icon: FileText },
  { id: 'accounts', title: 'Accounts & Security', icon: Lock },
  { id: 'subscriptions', title: 'Subscriptions & Billing', icon: Scale },
  { id: 'usage', title: 'Fair Usage Policy', icon: ShieldCheck },
  { id: 'compliance', title: 'Platform Compliance', icon: Globe },
  { id: 'liability', title: 'Liability & Warranty', icon: ShieldCheck },
  { id: 'contact', title: 'Contact', icon: Mail }
]
</script>

<template>
  <div class="relative min-h-screen bg-background text-gray-400">
    <!-- Hero Header -->
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 border-b border-white/5 relative overflow-hidden">
       <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>
       <span class="badge-gradient mb-10">Legal Framework</span>
       <h1 class="text-5xl md:text-8xl font-extrabold mb-8 tracking-tighter text-white">
         Terms of <span class="text-gradient">Service.</span>
       </h1>
       <p class="text-gray-500 font-bold uppercase tracking-[0.2em] text-xs">Last updated: April 10, 2026</p>
    </section>

    <!-- Content -->
    <div class="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-4 gap-16">
      <!-- Sticky Nav -->
      <aside class="hidden lg:block">
        <div class="sticky top-32 space-y-2">
          <a v-for="s in sections" :key="s.id" :href="`#${s.id}`" class="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all group text-gray-500 hover:text-white">
            <component :is="s.icon" class="w-5 h-5 group-hover:text-primary transition-colors" />
            <span class="text-sm font-bold tracking-widest uppercase">{{ s.title }}</span>
          </a>
        </div>
      </aside>

      <!-- Main Text -->
      <main class="lg:col-span-3 prose prose-invert prose-primary max-w-none">
        <p class="text-primary font-bold mb-12 tracking-widest uppercase text-xs">Sophisticated AI Infrastructure</p>
        
        <section id="introduction" class="mb-20">
          <h2 class="text-3xl font-bold mb-8 tracking-tight flex items-center gap-4 text-white">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <FileText class="w-5 h-5" />
             </div>
             Introduction
          </h2>
          <p class="leading-relaxed text-lg">
            Welcome to ReplySuite ("Company", "us", "we", or "our"). These Terms of Service ("Terms") govern your use of our website located at replysuite.com and our automation services (collectively, "Service").
          </p>
          <p class="leading-relaxed text-lg">
            By accessing or using our Service, you agree to be bound by these Terms and our Privacy Policy. If you disagree with any part of the terms, then you may not access the Service.
          </p>
        </section>

        <section id="accounts" class="mb-20">
          <h2 class="text-3xl font-bold mb-8 tracking-tight flex items-center gap-4 text-white">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Lock class="w-5 h-5" />
             </div>
             Accounts & Security
          </h2>
          <p class="leading-relaxed">
            When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
          </p>
          <ul class="space-y-4">
            <li>You are responsible for safeguarding your password and account access.</li>
            <li>You agree not to disclose your password to any third party.</li>
            <li>You must notify us immediately upon becoming aware of any breach of security.</li>
          </ul>
        </section>

        <section id="subscriptions" class="mb-20">
          <h2 class="text-3xl font-bold mb-8 tracking-tight flex items-center gap-4 text-white">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Scale class="w-5 h-5" />
             </div>
             Subscriptions & Billing
          </h2>
          <p class="leading-relaxed">
            Some parts of the Service are billed on a subscription basis. You will be billed in advance on a recurring and periodic basis ("Billing Cycle").
          </p>
          <div class="bg-primary/5 border border-primary/20 p-8 rounded-[32px] my-8 font-medium">
             <h4 class="text-primary font-bold tracking-widest text-[10px] uppercase mb-4 flex items-center gap-2">
               <Zap class="w-3 h-3 fill-current" />
               Elite Trial Period
             </h4>
             <p class="text-gray-300 text-sm">New accounts are granted a 30-day "Free Month" period. After this period, you must select a paid tier to continue using automation features.</p>
          </div>
        </section>

        <section id="usage" class="mb-20">
          <h2 class="text-3xl font-bold mb-8 tracking-tight flex items-center gap-4 text-white">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck class="w-5 h-5" />
             </div>
             Fair Usage Policy
          </h2>
          <p class="leading-relaxed">
            ReplySuite is designed for organic engagement. We strictly prohibit high-frequency spam, automated harassment, or any behavior that violates the platform policies of our supported channels (including Web, Instagram, and future integrations).
          </p>
        </section>

        <section id="contact" class="mb-20">
           <h2 class="text-3xl font-bold mb-8 tracking-tight flex items-center gap-4 text-white">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Mail class="w-5 h-5" />
             </div>
             Contact
          </h2>
          <p class="leading-relaxed">
            If you have any questions about these Terms, please contact us at <a href="mailto:support@replysuite.com" class="text-primary hover:underline font-bold">support@replysuite.com</a>.
          </p>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.prose h2 { @apply text-white border-b border-white/5 pb-6 mt-20; }
.prose p { @apply text-gray-400 leading-loose; }
.prose ul { @apply list-disc list-inside; }
</style>
