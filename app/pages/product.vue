<script setup lang="ts">
useHead({ title: 'Product | ReplySuite' })

import { Play, Database, Globe2, MessageCircle, ArrowRight, Bot, ShieldCheck, Layout } from 'lucide-vue-next'

definePageMeta({
  layout: 'default'
})

const workflow = [
  { step: '01', title: 'Create your chatbot', desc: 'Start with a bot for your website.', icon: Bot },
  { step: '02', title: 'Train it on your content', desc: 'Use your website, PDFs, FAQs, and custom text.', icon: Database },
  { step: '03', title: 'Deploy and improve', desc: 'Go live on web first and expand to WhatsApp.', icon: Globe2 }
]

const highlights = [
  { title: 'Website chatbot', desc: 'Answer questions and capture leads on your site.', icon: Globe2 },
  { title: 'WhatsApp ready', desc: 'Move into higher-value conversations when you are ready.', icon: MessageCircle },
  { title: 'Simple dashboard', desc: 'Manage training, testing, and deployment in one place.', icon: Layout },
  { title: 'Grounded answers', desc: 'Use your own business content instead of generic replies.', icon: ShieldCheck }
]
</script>

<template>
  <div class="relative">
    <section class="max-w-7xl mx-auto px-6 py-32 grid lg:grid-cols-2 gap-16 items-center">
      <div class="relative z-10">
        <span class="badge-gradient mb-6">Product</span>
        <h1 class="text-5xl md:text-7xl font-extrabold mb-8 leading-[0.95] tracking-tight text-foreground">
          Train one chatbot on your business content.
          <span class="text-gradient">Use it on your website and WhatsApp.</span>
        </h1>
        <p class="text-lg text-foreground/50 mb-12 max-w-2xl leading-relaxed font-medium">
          ReplySuite helps businesses reply faster, support customers better, and miss fewer leads. You train the bot on your content. Then you deploy it where customers already talk to you.
        </p>
        <div class="flex flex-col sm:flex-row items-center gap-6">
          <NuxtLink to="/register" class="w-full sm:w-auto btn-gradient px-10 py-5 text-lg flex items-center justify-center gap-3">
            Start Free
            <ArrowRight class="w-5 h-5" />
          </NuxtLink>
          <NuxtLink to="/pricing" class="w-full sm:w-auto px-10 py-5 rounded-full border border-foreground/10 hover:bg-foreground/5 transition-all text-lg font-bold flex items-center justify-center gap-3">
            View Pricing
            <Play class="w-5 h-5 fill-current" />
          </NuxtLink>
        </div>
      </div>

      <div class="relative group">
        <div class="absolute -inset-10 bg-primary/10 blur-[100px] rounded-full group-hover:bg-primary/20 transition-all duration-1000"></div>
        <div class="aspect-square glass-card border-foreground/10 p-2 overflow-hidden bg-foreground/[0.03] backdrop-blur-xl relative z-10">
          <div class="w-full h-full bg-background rounded-[32px] border border-foreground/5 flex flex-col p-10 overflow-hidden">
            <div class="flex items-center justify-between mb-10 pb-8 border-b border-foreground/5">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Bot class="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div class="h-3 w-32 bg-foreground/10 rounded-full mb-2"></div>
                  <div class="h-2 w-20 bg-foreground/5 rounded-full"></div>
                </div>
              </div>
              <div class="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary">
                live setup
              </div>
            </div>
            <div class="space-y-6">
              <div v-for="item in ['Website URL', 'PDF uploads', 'Custom text', 'Widget deploy']" :key="item" class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-5 py-4 text-sm font-semibold text-foreground/70">
                {{ item }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-32 border-t border-foreground/5">
      <div class="text-center mb-24">
        <h2 class="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-foreground">How it works</h2>
        <p class="text-foreground/50 max-w-2xl mx-auto font-medium">Three simple steps. No custom AI project required.</p>
      </div>

      <div class="grid md:grid-cols-3 gap-12">
        <div v-for="w in workflow" :key="w.step" class="relative group glass-card p-10 border-foreground/10">
          <div class="text-[11px] font-black tracking-[0.35em] text-primary uppercase mb-6">Step {{ w.step }}</div>
          <div class="w-16 h-16 rounded-3xl bg-foreground/5 flex items-center justify-center text-primary mb-8 border border-foreground/10">
            <component :is="w.icon" class="w-8 h-8" />
          </div>
          <h3 class="text-2xl font-bold mb-4 tracking-tight text-foreground">{{ w.title }}</h3>
          <p class="text-foreground/50 leading-relaxed font-medium">{{ w.desc }}</p>
        </div>
      </div>
    </section>

    <section class="bg-foreground/[0.02] py-32 border-y border-foreground/5 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-[120px]"></div>
      <div class="max-w-7xl mx-auto px-6 relative z-10">
        <div class="text-center mb-16">
          <h2 class="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">What you get</h2>
          <p class="text-foreground/50 max-w-2xl mx-auto mt-6 font-medium">Short setup. Clear value. One place to manage your chatbot.</p>
        </div>
        <div class="grid lg:grid-cols-4 gap-8">
          <div v-for="item in highlights" :key="item.title" class="glass-card p-8 border-foreground/10 text-center">
            <div class="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
              <component :is="item.icon" class="w-8 h-8 text-primary" />
            </div>
            <h4 class="text-xl font-bold mb-4 tracking-tight text-foreground">{{ item.title }}</h4>
            <p class="text-sm text-foreground/50 font-medium leading-relaxed">{{ item.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-5xl mx-auto px-6 py-32 text-center relative">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full"></div>
      <h2 class="text-4xl md:text-6xl font-extrabold mb-10 relative z-10 tracking-tight leading-[1.05] text-foreground">
        Start with your website.
        <span class="text-gradient">Scale when you need more.</span>
      </h2>
      <NuxtLink to="/register" class="btn-gradient px-12 py-6 text-xl relative z-10 inline-flex items-center gap-4 group">
        Start Free
        <ArrowRight class="w-6 h-6 group-hover:translate-x-2 transition-transform" />
      </NuxtLink>
      <p class="text-foreground/50 mt-10 text-xs uppercase tracking-[0.2em] font-bold">
        No credit card required
      </p>
    </section>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[32px] transition-all duration-500;
}
</style>
