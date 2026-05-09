<script setup lang="ts">
import { Lock, Shield, Server, Cpu, Globe, Database, ArrowRight, CheckCircle2 } from 'lucide-vue-next'

useSeoMeta({
  title: 'Security | ReplySuite',
  description: 'Learn how ReplySuite protects your data and customer conversations.',
})

definePageMeta({
  layout: 'default'
})

const features = [
  { title: 'Encryption', desc: 'Data is protected at rest and in transit.', icon: Lock },
  { title: 'Cloud protection', desc: 'We use modern cloud infrastructure and edge protection.', icon: Globe },
  { title: 'Data separation', desc: 'Your account data stays scoped to your account.', icon: Database },
  { title: 'Monitoring', desc: 'We monitor and review platform health and risk.', icon: Shield }
]
</script>

<template>
  <div class="relative min-h-screen">
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <div class="text-center max-w-3xl mx-auto mb-16">
        <span class="badge-gradient mb-10">Security</span>
        <h1 class="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight leading-[0.95] text-foreground">
          Security matters from the start.
        </h1>
        <p class="text-lg text-foreground/50 font-medium leading-relaxed">
          ReplySuite is built to protect your business data and customer conversations.
        </p>
      </div>
    </section>

    <div class="max-w-7xl mx-auto px-6 py-16">
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
        <div v-for="f in features" :key="f.title" class="glass-card p-8 border-foreground/10 hover:border-primary/20 transition-all group">
          <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <component :is="f.icon" class="w-5 h-5 text-primary" />
          </div>
          <h3 class="text-lg font-bold text-foreground mb-2 tracking-tight">{{ f.title }}</h3>
          <p class="text-foreground/50 text-sm leading-relaxed font-medium">{{ f.desc }}</p>
        </div>
      </div>

      <main class="max-w-4xl mx-auto prose dark:prose-invert prose-primary prose-lg">
        <section class="mb-20">
          <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Server class="w-5 h-5" />
            </div>
            Infrastructure
          </h2>
          <p>
            ReplySuite runs on modern cloud infrastructure. The goal is simple: keep the product available, responsive, and protected.
          </p>
          <ul class="space-y-4 not-prose">
            <li v-for="item in ['Cloud hosting and edge delivery', 'Backups and recovery controls', 'Threat monitoring', 'Service-level review']" :key="item" class="flex items-center gap-4 text-foreground/50 font-medium">
              <CheckCircle2 class="w-5 h-5 text-primary flex-shrink-0" />
              {{ item }}
            </li>
          </ul>
        </section>

        <section class="mb-20">
          <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Cpu class="w-5 h-5" />
            </div>
            Application security
          </h2>
          <p>
            We use input validation, access control, and ongoing review to reduce risk inside the application itself.
          </p>
        </section>

        <section class="mb-20">
          <h2 class="text-3xl font-bold text-foreground mb-8 tracking-tight flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Lock class="w-5 h-5" />
            </div>
            Authentication
          </h2>
          <p>
            User access is protected through modern authentication flows. Verified accounts and access boundaries help keep account data scoped correctly.
          </p>
        </section>

        <div class="mt-24 p-12 rounded-[32px] bg-foreground/[0.02] border border-foreground/10 text-center">
          <h3 class="text-3xl font-bold text-foreground mb-4 tracking-tight">Need more detail?</h3>
          <p class="text-foreground/50 mb-8 font-medium">Contact us for security questions or request more information.</p>
          <a href="mailto:security@replysuite.app" class="btn-gradient px-10 py-5 inline-flex items-center gap-4 group">
            Contact security
            <ArrowRight class="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </a>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.glass-card { @apply rounded-[24px]; }
</style>
