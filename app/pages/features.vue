<script setup lang="ts">
import { Bot, Zap, MessageSquare, Target, BarChart3, Globe2, Layers, ArrowRight, MessageCircle } from 'lucide-vue-next'

useSeoMeta({
  title: 'Features | ReplySuite',
  description: 'See what ReplySuite can do: train on your content, deploy on your website, and expand into WhatsApp.',
  ogTitle: 'ReplySuite Features',
  ogDescription: 'Business AI chatbot features for website and WhatsApp.',
  ogUrl: 'https://replysuite.app/features',
  twitterCard: 'summary_large_image',
  twitterTitle: 'ReplySuite Features',
  twitterDescription: 'AI chatbot features built for real business use.',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://replysuite.app/features' }]
})

definePageMeta({
  layout: 'default'
})

const features = [
  {
    title: 'Train on your content',
    desc: 'Use your website, PDFs, FAQs, and custom text.',
    icon: Bot
  },
  {
    title: 'Website widget',
    desc: 'Add your chatbot to your site with a simple script.',
    icon: Globe2
  },
  {
    title: 'WhatsApp support',
    desc: 'Move into WhatsApp when you need a higher-value channel.',
    icon: MessageCircle
  },
  {
    title: 'Lead capture',
    desc: 'Turn common questions into real conversations.',
    icon: Target
  },
  {
    title: 'Usage tracking',
    desc: 'See replies, training, and activity in one place.',
    icon: BarChart3
  },
  {
    title: 'One dashboard',
    desc: 'Manage setup, testing, and deployment from one product.',
    icon: Layers
  }
]
</script>

<template>
  <div class="relative">
    <section class="max-w-7xl mx-auto px-6 py-32 text-center relative">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>
      <span class="badge-gradient mb-10">Features</span>
      <h1 class="text-5xl md:text-7xl font-extrabold mb-10 tracking-tight leading-[0.95] text-foreground">
        Features for faster replies, better support, and more captured leads.
      </h1>
      <p class="text-lg text-foreground/50 max-w-3xl mx-auto leading-relaxed font-medium">
        ReplySuite is built for practical business use. Train on your business content, launch on your website, and expand into WhatsApp AI support when you are ready.
      </p>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 lg:grid-cols-3 gap-10 mb-24">
      <div v-for="feat in features" :key="feat.title" class="glass-card p-10 border-foreground/10 group hover:border-primary/30 transition-all relative overflow-hidden">
        <div class="absolute -right-8 -bottom-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all"></div>
        <div class="w-16 h-16 rounded-3xl bg-foreground/5 flex items-center justify-center text-primary mb-8 border border-foreground/10 relative z-10">
          <component :is="feat.icon" class="w-8 h-8" />
        </div>
        <h3 class="text-2xl font-bold mb-4 tracking-tight text-foreground">{{ feat.title }}</h3>
        <p class="text-sm text-foreground/50 leading-relaxed font-medium relative z-10">{{ feat.desc }}</p>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 space-y-24 mb-24">
      <div class="grid lg:grid-cols-2 gap-20 items-center">
        <div>
          <h2 class="text-4xl md:text-6xl font-extrabold mb-8 tracking-tight text-foreground">
            Better answers start with better training.
          </h2>
          <p class="text-foreground/50 text-lg mb-8 leading-relaxed font-medium">
            Generic bots give generic replies. ReplySuite lets you ground answers in your business content so customers get more useful responses.
          </p>
          <div class="space-y-4">
            <div v-for="item in ['Website URL training', 'PDF and document uploads', 'Custom text and FAQ content']" :key="item" class="flex items-center gap-4 text-sm font-bold tracking-tight text-primary/80">
              <div class="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                <Zap class="w-3 h-3 text-primary fill-current" />
              </div>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>
        <div>
          <div class="aspect-video glass-card border-foreground/10 p-12 flex flex-col items-center justify-center relative bg-background/40 overflow-hidden">
            <div class="absolute inset-0 bg-primary/5 blur-[100px]"></div>
            <div class="absolute top-6 right-6 px-4 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-bold text-primary uppercase tracking-[0.2em] relative z-10">customer support ai</div>
            <div class="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center relative z-10 shadow-2xl shadow-primary/20">
              <MessageSquare class="w-14 h-14 text-primary" />
            </div>
          </div>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-20 items-center">
        <div>
          <div class="aspect-video glass-card border-foreground/10 p-12 flex flex-col items-center justify-center relative bg-background/40 overflow-hidden">
            <div class="absolute inset-0 bg-primary/5 blur-[100px]"></div>
            <div class="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center relative z-10 shadow-2xl shadow-primary/20">
              <MessageCircle class="w-14 h-14 text-primary" />
            </div>
          </div>
        </div>
        <div>
          <h2 class="text-4xl md:text-6xl font-extrabold mb-8 tracking-tight text-foreground">
            Start on web. Expand when ready.
          </h2>
          <p class="text-foreground/50 text-lg mb-10 leading-relaxed font-medium">
            The easiest first step is your website chatbot. When the core setup works, you can grow into WhatsApp AI support and more advanced automation.
          </p>
          <NuxtLink to="/register" class="btn-gradient inline-flex items-center gap-4 px-10 py-5 text-lg group">
            Start Free
            <ArrowRight class="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[40px] bg-foreground/[0.02];
}
</style>
