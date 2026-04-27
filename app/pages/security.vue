<script setup lang="ts">
import { Lock, Shield, Server, Cpu, Globe, Database, ArrowRight, Zap, CheckCircle2 } from 'lucide-vue-next'

useSeoMeta({
  title: 'Security Posture | ReplySuite Enterprise',
  description: 'Learn about the robust security measures protecting your data at ReplySuite. Enterprise-grade encryption, infrastructure, and compliance.',
})

definePageMeta({
  layout: 'default'
})

const features = [
  {
    title: 'Data Encryption',
    desc: 'AES-256 encryption at rest and TLS 1.3 for all data in transit.',
    icon: Lock
  },
  {
    title: 'Global CDN',
    desc: 'Distributed edge protection via Cloudflare to mitigate DDoS and latency.',
    icon: Globe
  },
  {
    title: 'Isolated Tiers',
    desc: 'Logical database isolation ensuring your data is never mixed with others.',
    icon: Database
  },
  {
    title: 'Regular Audits',
    desc: 'Continuous monitoring and automated vulnerability scanning.',
    icon: Shield
  }
]
</script>

<template>
  <div class="relative min-h-screen">
    <!-- Hero Section -->
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <div class="text-center max-w-3xl mx-auto mb-20">
        <span class="badge-gradient mb-10">Infrastructure</span>
        <h1 class="text-6xl md:text-8xl font-extrabold mb-8 tracking-tighter leading-[0.85] text-foreground">
          Security <br />
          <span class="text-gradient">Posture.</span>
        </h1>
        <p class="text-xl text-foreground/50 font-medium leading-relaxed">
          Enterprise-grade protection is not an add-on; it is the foundation of the ReplySuite architecture.
        </p>
      </div>
    </section>

    <!-- Content -->
    <div class="max-w-7xl mx-auto px-6 py-20">
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-32">
        <div v-for="f in features" :key="f.title" class="glass-card p-10 border-foreground/5 hover:border-primary/20 transition-all group">
          <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <component :is="f.icon" class="w-5 h-5 text-primary" />
          </div>
          <h3 class="text-lg font-bold text-foreground mb-2 tracking-tight">{{ f.title }}</h3>
          <p class="text-foreground/50 text-sm leading-relaxed font-medium">{{ f.desc }}</p>
        </div>
      </div>

      <!-- Detailed Info -->
      <main class="max-w-4xl mx-auto prose dark:prose-invert prose-primary prose-lg">
        <section class="mb-24">
          <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight flex items-center gap-4">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
               <Server class="w-5 h-5" />
             </div>
             Cloud Infrastructure
          </h2>
          <p>
            ReplySuite is hosted on world-class infrastructure provided by <strong>Cloudflare</strong> and <strong>Supabase (PostgreSQL)</strong>. We leverage global CDN nodes to ensure that your chatbots are responsive and protected against distributed denial-of-service (DDoS) attacks.
          </p>
          <ul class="space-y-4 not-prose">
            <li v-for="item in ['Automated point-in-time recovery (PITR)', 'SOC 2 compliant data centers', 'Multi-region redundancy', 'Real-time threat detection']" :key="item" class="flex items-center gap-4 text-foreground/50 font-medium">
              <CheckCircle2 class="w-5 h-5 text-primary flex-shrink-0" />
              {{ item }}
            </li>
          </ul>
        </section>

        <section class="mb-24">
          <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight flex items-center gap-4">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
               <Cpu class="w-5 h-5" />
             </div>
             Application Security
          </h2>
          <p>
            Our codebase is built with a "Security by Design" philosophy. We employ strict input sanitization, CSRF protection, and rigorous access control lists (ACLs) to ensure that users can only interact with their own data.
          </p>
          <div class="bg-primary/5 border border-primary/20 p-8 rounded-[32px] my-10">
             <h4 class="text-primary font-bold tracking-widest text-[10px] uppercase mb-4 flex items-center gap-2">
               <Zap class="w-3 h-3 fill-current" />
               Continuous Monitoring
             </h4>
             <p class="text-foreground font-medium mb-0 leading-relaxed text-base">
               Every commit to our core infrastructure undergoes automated security scanning. We maintain a private bug bounty program and perform internal penetration tests every quarter.
             </p>
          </div>
        </section>

        <section class="mb-24">
          <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight flex items-center gap-4">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
               <Lock class="w-5 h-5" />
             </div>
             Authentication
          </h2>
          <p>
            We use industry-standard authentication protocols, supporting Multi-Factor Authentication (MFA) and Single Sign-On (SSO) for enterprise clients. Your credentials are never stored in plain text; we use salted, high-entropy hashing algorithms.
          </p>
        </section>

        <section class="mb-24">
          <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight flex items-center gap-4">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
               <Globe class="w-5 h-5" />
             </div>
             EU AI Act & Regional Sovereignty
          </h2>
          <p>
            In alignment with the 2026 <strong>EU AI Act</strong>, ReplySuite provides industry-leading transparency and data sovereignty features. We leverage Cloudflare Regional Services to ensure that data for our European clients is processed and stored exclusively within EU boundaries.
          </p>
          <ul class="space-y-4 not-prose mt-8">
            <li v-for="item in ['Regional Data Residency (EU-only processing)', 'Mandatory AI Transparency Labeling', 'Privacy-First Training Protocols', 'GDPR/EU-AI-Act Certified Infrastructure']" :key="item" class="flex items-center gap-4 text-foreground/50 font-medium">
              <CheckCircle2 class="w-5 h-5 text-primary flex-shrink-0" />
              {{ item }}
            </li>
          </ul>
        </section>

        <section class="mb-24">
          <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight flex items-center gap-4">
             <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
               <Shield class="w-5 h-5" />
             </div>
             U.S. Enterprise Standards
          </h2>
          <p>
            ReplySuite is fully compliant with United States data privacy and security standards. Our infrastructure is designed to meet the rigorous requirements of the most demanding U.S. sectors, from FinTech to Healthcare.
          </p>
          <ul class="space-y-4 not-prose mt-8">
            <li v-for="item in ['CCPA/CPRA Compliant (California Privacy)', 'SOC 2 Type II Aligned Infrastructure', 'California B.O.T. Act (Disclosure Compliant)', 'HIPAA & GLBA Ready Controls']" :key="item" class="flex items-center gap-4 text-foreground/50 font-medium">
              <CheckCircle2 class="w-5 h-5 text-primary flex-shrink-0" />
              {{ item }}
            </li>
          </ul>
        </section>

        <!-- CTA -->
        <div class="mt-40 p-16 rounded-[48px] bg-foreground/[0.02] border border-foreground/5 text-center">
          <h3 class="text-3xl font-bold text-foreground mb-6 tracking-tight">Need a full security audit?</h3>
          <p class="text-foreground/50 mb-10 font-medium">Request our detailed security whitepaper or VDP policy.</p>
          <a href="mailto:security@replysuite.app" class="btn-gradient px-10 py-5 inline-flex items-center gap-4 group">
            Contact Security Team
            <ArrowRight class="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </a>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.glass-card { @apply rounded-[32px]; }
</style>
