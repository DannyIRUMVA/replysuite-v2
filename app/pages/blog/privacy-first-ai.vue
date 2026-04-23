<script setup lang="ts">
import { ArrowLeft, ShieldCheck, Lock, Globe, Zap, ArrowRight, EyeOff, Scale, Calendar, Clock } from 'lucide-vue-next'

useSeoMeta({
  title: 'Privacy-First AI: Navigating GDPR in 2026 | ReplySuite',
  description: 'Learn how ReplySuite handles data sovereignty, PII protection, and compliance with global AI regulations.',
})

definePageMeta({
  layout: 'default'
})
</script>

<template>
  <div class="relative min-h-screen pb-40">
    <!-- Hero -->
    <section class="max-w-4xl mx-auto px-6 pt-32 pb-20 relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <NuxtLink to="/blog" class="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-12 font-bold text-xs uppercase tracking-widest group">
        <ArrowLeft class="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Insights
      </NuxtLink>
      
      <span class="badge-gradient mb-8">Trust & Security</span>
      <h1 class="text-5xl md:text-7xl font-extrabold mb-8 tracking-tighter leading-[0.9] text-white">
        Privacy-First <span class="text-gradient">AI Architecture.</span>
      </h1>
      
      <div class="flex flex-wrap items-center gap-8 pt-8 border-t border-white/5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary">SC</div>
          <span class="text-white font-bold text-sm">Security Council</span>
        </div>
        <div class="flex items-center gap-6 text-xs text-gray-600 font-bold uppercase tracking-widest">
           <div class="flex items-center gap-2"><Calendar class="w-3 h-3" /> May 03, 2026</div>
           <div class="flex items-center gap-2"><Clock class="w-3 h-3" /> 10 min read</div>
        </div>
      </div>
    </section>

    <!-- Content -->
    <article class="max-w-3xl mx-auto px-6 prose prose-invert prose-primary prose-lg">
      <p class="text-xl text-gray-400 leading-relaxed font-medium mb-12">
        As AI becomes the backbone of customer engagement, the risk of data leakage and non-compliance has reached an all-time high. In 2026, privacy is no longer a checkbox—it's a competitive advantage.
      </p>

      <h2 class="text-3xl font-bold text-white mb-8 tracking-tight">The Challenge of LLM Sovereignty</h2>
      <p class="text-gray-500 mb-10">
        Most AI platforms send your data to centralized models where it can potentially be used for training. ReplySuite takes a fundamentally different approach. We utilize **Logically Isolated RAG (Retrieval-Augmented Generation)** to ensure your brand's data never leaves your secure environment.
      </p>

      <!-- Key Pillars -->
      <div class="not-prose grid gap-6 my-20">
        <div v-for="p in [
          { title: 'PII Redaction', desc: 'Automatic detection and stripping of sensitive customer data before AI processing.', icon: EyeOff },
          { title: 'Data Residency', icon: Globe, desc: 'Choose where your data lives: EU (Frankfurt), US (Virginia), or Africa (Kigali).' },
          { title: 'Zero-Retrain Policy', icon: Lock, desc: 'Your data is never used to improve global models. It stays yours, forever.' }
        ]" :key="p.title" class="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 flex gap-8 items-start group">
          <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
             <component :is="p.icon" class="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-xl font-bold text-white mb-2 tracking-tight">{{ p.title }}</h4>
            <p class="text-sm text-gray-500 leading-relaxed font-medium">{{ p.desc }}</p>
          </div>
        </div>
      </div>

      <h2 class="text-3xl font-bold text-white mb-8 tracking-tight">Meeting the 2026 Standards</h2>
      <p class="text-gray-500 mb-10">
        With the enforcement of the **Global AI Act**, brands are now legally required to provide transparency about how AI decisions are made. ReplySuite’s "Explainable AI" logs allow your legal team to audit exactly why an agent provided a specific response.
      </p>

      <blockquote class="border-l-4 border-primary pl-8 my-16 text-gray-400 italic font-medium py-4 bg-primary/5 rounded-r-3xl pr-8">
        "Privacy-first engineering isn't just about security; it's about building a relationship with your customer that is based on absolute transparency."
        <footer class="mt-4 text-xs font-bold uppercase tracking-widest text-primary">— ReplySuite CTO</footer>
      </blockquote>

      <h2 class="text-3xl font-bold text-white mb-8 tracking-tight">Conclusion</h2>
      <p class="text-gray-500 mb-12">
        Scaling your brand with AI shouldn't mean sacrificing your customer's trust. By adopting a privacy-first infrastructure, you protect your liability and your reputation simultaneously.
      </p>

      <!-- Bottom CTA -->
      <div class="not-prose p-12 rounded-[48px] bg-white/[0.02] border border-white/5 text-center mt-32 relative overflow-hidden group">
         <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity blur-[80px]"></div>
         <ShieldCheck class="w-12 h-12 text-primary mx-auto mb-8" />
         <h3 class="text-3xl font-bold text-white mb-6 tracking-tight">Audit-Ready AI.</h3>
         <p class="text-gray-500 mb-10 max-w-lg mx-auto font-medium">Download our Security Posture whitepaper or start a free trial.</p>
         <div class="flex flex-col sm:flex-row items-center justify-center gap-6">
            <NuxtLink to="/register" class="btn-gradient px-10 py-5 inline-flex items-center gap-4 group/btn">
                Start Scaling Securely
                <ArrowRight class="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
            </NuxtLink>
            <NuxtLink to="/security" class="text-white font-bold hover:text-primary transition-colors text-sm uppercase tracking-widest">View Security Policy</NuxtLink>
         </div>
      </div>
    </article>
  </div>
</template>
