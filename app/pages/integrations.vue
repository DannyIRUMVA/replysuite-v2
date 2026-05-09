<script setup lang="ts">
import { Globe, Code, Zap, ArrowRight, MessageCircle } from 'lucide-vue-next'

useSeoMeta({
  title: 'Integrations | ReplySuite',
  description: 'Connect ReplySuite to your website, WordPress site, and WhatsApp.',
})

definePageMeta({
  layout: 'default'
})

const integrations = [
  {
    name: 'Website widget',
    desc: 'Add your chatbot to any website with a simple script.',
    icon: Code,
    status: 'Live'
  },
  {
    name: 'WordPress',
    desc: 'Use ReplySuite on WordPress sites with a simple setup flow.',
    icon: Globe,
    status: 'Live'
  },
  {
    name: 'WhatsApp',
    desc: 'Connect your business line for higher-value customer conversations.',
    icon: MessageCircle,
    status: 'Available'
  }
]
</script>

<template>
  <div class="relative min-h-screen">
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 text-center relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <span class="badge-gradient mb-10 text-xs uppercase tracking-widest font-bold">Integrations</span>
      <h1 class="text-5xl sm:text-7xl md:text-8xl font-extrabold mb-8 tracking-tight leading-[0.9] text-foreground">
        Connect your chatbot where customers already talk to you.
      </h1>
      <p class="text-lg text-foreground/50 max-w-3xl mx-auto leading-relaxed font-medium">
        Start with your website. Add WordPress if needed. Move into WhatsApp when you want more direct support and sales conversations.
      </p>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-20">
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div v-for="i in integrations" :key="i.name" class="glass-card p-10 border-foreground/10 hover:border-primary/20 transition-all group bg-foreground/[0.02] rounded-[32px]">
          <div class="flex items-start justify-between mb-8">
            <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
              <component :is="i.icon" class="w-8 h-8" />
            </div>
            <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border bg-primary/10 border-primary/20 text-primary">
              {{ i.status }}
            </span>
          </div>
          <h3 class="text-2xl font-bold text-foreground mb-4 tracking-tight">{{ i.name }}</h3>
          <p class="text-foreground/50 leading-relaxed font-medium mb-8 text-sm">{{ i.desc }}</p>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-24 border-t border-foreground/5">
      <div class="bg-foreground/[0.02] border border-foreground/10 p-12 md:p-20 rounded-[40px] flex flex-col md:flex-row items-center gap-12 overflow-hidden relative">
        <div class="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-[100px]"></div>
        <div class="flex-1 relative z-10">
          <h2 class="text-4xl md:text-5xl font-extrabold text-foreground mb-6 tracking-tight leading-tight">
            Need a custom setup?
          </h2>
          <p class="text-foreground/50 mb-8 text-lg leading-relaxed font-medium">
            Talk to us if you want help with implementation, onboarding, or a larger rollout.
          </p>
          <NuxtLink to="/contact" class="btn-gradient px-10 py-5 inline-flex items-center gap-3">
            Contact us
            <ArrowRight class="w-5 h-5" />
          </NuxtLink>
        </div>
        <div class="flex-1 bg-background p-10 rounded-[32px] border border-foreground/10 font-mono text-sm relative z-10 shadow-2xl">
          <div class="flex gap-2 mb-6">
            <div class="w-3 h-3 rounded-full bg-red-500/20"></div>
            <div class="w-3 h-3 rounded-full bg-yellow-500/20"></div>
            <div class="w-3 h-3 rounded-full bg-green-500/20"></div>
          </div>
          <div class="text-foreground/50">
            <span class="text-primary">Channels</span><br />
            website_widget<br />
            wordpress<br />
            whatsapp
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.glass-card { @apply rounded-[32px]; }
</style>
