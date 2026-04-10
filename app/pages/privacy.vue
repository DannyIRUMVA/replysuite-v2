<script setup lang="ts">
import { ShieldCheck, Lock, Eye, Users, Globe, Mail, FileText } from 'lucide-vue-next'

definePageMeta({
  layout: 'default'
})

const sections = [
  { id: 'introduction', title: 'Introduction', icon: FileText },
  { id: 'data-collection', title: 'Data Collection', icon: Eye },
  { id: 'use-of-data', title: 'Use of Data', icon: Lock },
  { id: 'sharing', title: 'Disclosure & Sharing', icon: Users },
  { id: 'security', title: 'Security', icon: ShieldCheck },
  { id: 'gdpr', title: 'GDPR & Rights', icon: Globe },
  { id: 'subprocessors', title: 'Sub-processors', icon: Users },
  { id: 'contact', title: 'Contact', icon: Mail }
]
</script>

<template>
  <div class="relative">
    <!-- Hero Header -->
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 border-b border-white/5 relative overflow-hidden">
       <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>
       <span class="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-10">Legal Documentation</span>
       <h1 class="text-5xl md:text-8xl font-black mb-8 tracking-tighter italic">Privacy <span class="text-primary not-italic font-black uppercase tracking-widest">Policy.</span></h1>
       <p class="text-gray-500 font-medium">Last Updated: April 10, 2026</p>
    </section>

    <!-- Content -->
    <div class="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-4 gap-16">
      <!-- Sticky Nav -->
      <aside class="hidden lg:block">
        <div class="sticky top-32 space-y-2">
          <a v-for="s in sections" :key="s.id" :href="`#${s.id}`" class="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all group text-gray-500 hover:text-white">
            <component :is="s.icon" class="w-5 h-5 group-hover:text-primary transition-colors" />
            <span class="text-sm font-bold uppercase tracking-widest">{{ s.title }}</span>
          </a>
        </div>
      </aside>

      <!-- Main Text -->
      <main class="lg:col-span-3 prose prose-invert prose-primary max-w-none">
        <section id="introduction" class="mb-20">
          <h2 class="text-3xl font-black italic mb-8 uppercase tracking-widest flex items-center gap-4">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <FileText class="w-5 h-5" />
             </div>
             Introduction
          </h2>
          <p class="text-gray-400 leading-relaxed text-lg">
            ReplySuite ("Company", "us", "we", or "our") operates the ReplySuite platform (hereinafter referred to as "Service").
          </p>
          <p class="text-gray-400 leading-relaxed text-lg">
            Our Privacy Policy governs your visit to our Service and explains how we collect, safeguard, and disclose information that results from your use of our Service. By using the Service, you agree to the collection and use of information in accordance with this policy.
          </p>
        </section>

        <section id="data-collection" class="mb-20">
          <h2 class="text-3xl font-black italic mb-8 uppercase tracking-widest flex items-center gap-4">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Eye class="w-5 h-5" />
             </div>
             Data Collection
          </h2>
          <p class="text-gray-400 leading-relaxed">
            We collect several different types of information for various purposes to provide and improve our Service to you.
          </p>
          <div class="grid md:grid-cols-2 gap-8 my-10 font-medium">
             <div class="glass-card p-8 border-white/5 bg-white/[0.01]">
                <h4 class="text-primary font-black uppercase tracking-widest text-xs mb-4">Personal Data</h4>
                <p class="text-gray-400 text-sm">Email address, Name, and Instagram Account metadata.</p>
             </div>
             <div class="glass-card p-8 border-white/5 bg-white/[0.01]">
                <h4 class="text-primary font-black uppercase tracking-widest text-xs mb-4">Usage Data</h4>
                <p class="text-gray-400 text-sm">IP address, browser type, diagnostic data, and interaction history.</p>
             </div>
          </div>
        </section>

        <section id="gdpr" class="mb-20">
          <h2 class="text-3xl font-black italic mb-8 uppercase tracking-widest flex items-center gap-4">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Globe class="w-5 h-5" />
             </div>
             GDPR & Rights
          </h2>
          <p class="text-gray-400 leading-relaxed">
            If you are a resident of the European Economic Area (EEA), you have certain data protection rights. ReplySuite aims to take reasonable steps to allow you to correct, amend, delete, or limit the use of your Personal Data.
          </p>
        </section>

        <section id="contact" class="mb-20">
           <h2 class="text-3xl font-black italic mb-8 uppercase tracking-widest flex items-center gap-4">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Mail class="w-5 h-5" />
             </div>
             Contact
          </h2>
          <p class="text-gray-400 leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us at <a href="mailto:privacy@replysuite.com" class="text-primary hover:underline font-bold">privacy@replysuite.com</a>.
          </p>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.prose h2 { @apply text-white border-b border-white/5 pb-6 mt-20; }
.prose p { @apply text-gray-400 leading-loose; }
.glass-card { @apply rounded-[32px]; }
</style>
