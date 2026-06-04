<script setup lang="ts">
import { Play, Database, Globe2, MessageCircle, ArrowRight, Bot, ShieldCheck, Layout, FileText, Gauge, Languages } from 'lucide-vue-next'

useSeoMeta({
  title: 'Product | ReplySuite',
  description: 'ReplySuite helps businesses launch trained AI customer support chatbots on websites and WhatsApp.',
  ogTitle: 'Product | ReplySuite',
  ogDescription: 'Train AI chatbots on your business content, deploy on your website, and expand into WhatsApp.',
  ogUrl: 'https://replysuite.app/product',
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://replysuite.app/product' }]
})

definePageMeta({
  layout: 'default'
})

const workflow = [
  { step: '01', title: 'Create your chatbot', desc: 'Set up an assistant for support, FAQs, bookings, or lead capture.', icon: Bot },
  { step: '02', title: 'Train it on your content', desc: 'Add pages, PDFs, FAQs, documents, and custom business text.', icon: Database },
  { step: '03', title: 'Deploy and improve', desc: 'Launch on your first channel, then expand as volume grows.', icon: Globe2, channelIcons: [Globe2, MessageCircle] }
]

const highlights = [
  { title: 'Chatbot', desc: 'Answer questions and capture leads on your approved domains.', icon: Globe2, channelIcons: [Globe2] },
  { title: 'Ready', desc: 'Move into higher-value customer conversations when you are ready.', icon: MessageCircle, channelIcons: [MessageCircle] },
  { title: 'Training sources', desc: 'Use URLs, PDFs, FAQs, and custom text to ground answers.', icon: FileText },
  { title: 'Simple dashboard', desc: 'Manage training, testing, usage, and deployment in one place.', icon: Layout },
  { title: 'Grounded answers', desc: 'Reduce generic replies by using your real business content.', icon: ShieldCheck },
  { title: 'Language support', desc: 'Support multilingual business conversations across your connected channels.', icon: Languages }
]

const productStats = [
  { label: 'Launch path', value: 'Web first' },
  { label: 'Channels', icons: [Globe2, MessageCircle] },
  { label: 'Coverage', value: '24/7 replies' }
]
</script>

<template>
  <div class="relative overflow-hidden">
    <section class="max-w-7xl mx-auto px-6 py-20 md:py-24 relative">
      <div class="absolute inset-x-0 top-8 mx-auto h-72 w-[72%] rounded-full bg-primary/10 blur-[140px] -z-10"></div>

      <div class="grid lg:grid-cols-[1.02fr_0.98fr] gap-10 lg:gap-14 items-center">
        <div class="relative z-10">
          <span class="badge-gradient mb-6">Product</span>
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-[1.02] tracking-tight text-foreground">
            AI customer support for your
            <span class="inline-flex translate-y-1 items-center gap-2 rounded-full border border-foreground/10 bg-background/70 px-3 py-1.5 align-middle shadow-sm backdrop-blur-xl" aria-label="website and WhatsApp">
              <Globe2 class="h-6 w-6 md:h-8 md:w-8 text-primary" aria-hidden="true" />
              <MessageCircle class="h-6 w-6 md:h-8 md:w-8 text-primary" aria-hidden="true" />
            </span>.
            <span class="text-gradient">Trained on your business content.</span>
          </h1>
          <p class="text-base md:text-lg text-foreground/55 mb-8 max-w-2xl leading-relaxed font-medium">
            ReplySuite helps businesses automate FAQs, lead capture, and support replies. Train the assistant on your own content, then deploy it where customers already talk to you.
          </p>
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <NuxtLink to="/register" class="btn-gradient px-8 py-4 text-sm flex items-center justify-center gap-3">
              Start Free
              <ArrowRight class="w-4 h-4" />
            </NuxtLink>
            <NuxtLink to="/pricing" class="px-8 py-4 rounded-full border border-foreground/10 hover:bg-foreground/5 transition-all text-sm font-bold flex items-center justify-center gap-3">
              View Pricing
              <Play class="w-4 h-4 fill-current" />
            </NuxtLink>
          </div>
        </div>

        <div class="relative">
          <div class="absolute -inset-8 bg-primary/10 blur-[100px] rounded-full"></div>
          <div class="liquid-glass rounded-[34px] p-4 md:p-5 relative overflow-hidden">
            <div class="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-[90px]"></div>
            <div class="relative rounded-[28px] border border-foreground/10 bg-background/65 backdrop-blur-xl p-5 md:p-7">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7 pb-6 border-b border-foreground/10">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                    <Bot class="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p class="text-sm font-black text-foreground">ReplySuite assistant</p>
                    <p class="text-xs text-foreground/45 font-semibold">Training and deployment</p>
                  </div>
                </div>
                <div class="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary w-fit">
                  live setup
                </div>
              </div>

              <div class="grid gap-3">
                <div v-for="item in ['URL training', 'PDF and FAQ uploads', 'Custom business text', 'Widget deployment']" :key="item" class="rounded-2xl border border-foreground/10 bg-foreground/[0.025] px-4 py-3 flex items-center gap-3 text-sm font-semibold text-foreground/70">
                  <Gauge class="w-4 h-4 text-primary flex-shrink-0" />
                  {{ item }}
                </div>
              </div>

              <div class="grid sm:grid-cols-3 gap-3 mt-5">
                <div v-for="stat in productStats" :key="stat.label" class="rounded-2xl border border-foreground/10 bg-background/45 px-4 py-3">
                  <p class="text-[9px] uppercase tracking-[0.16em] text-foreground/40 font-black">{{ stat.label }}</p>
                  <div v-if="stat.icons" class="mt-2 flex items-center gap-2" aria-label="Website and WhatsApp channels">
                    <span v-for="(Icon, index) in stat.icons" :key="index" class="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
                      <component :is="Icon" class="h-4 w-4 text-primary" aria-hidden="true" />
                    </span>
                  </div>
                  <p v-else class="mt-1 text-xs font-black text-foreground">{{ stat.value }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-16 md:py-20 border-t border-foreground/5">
      <div class="text-center mb-12 max-w-3xl mx-auto">
        <span class="badge-gradient mb-5">Workflow</span>
        <h2 class="text-3xl md:text-5xl font-extrabold tracking-tight mb-5 text-foreground">How it works</h2>
        <p class="text-foreground/55 font-medium leading-relaxed">Three simple steps to launch AI customer support without a custom AI project.</p>
      </div>

      <div class="grid md:grid-cols-3 gap-6 lg:gap-8">
        <article v-for="w in workflow" :key="w.step" class="liquid-glass group rounded-[28px] p-6 md:p-7 border-foreground/10">
          <div class="text-[11px] font-black tracking-[0.28em] text-primary uppercase mb-5">Step {{ w.step }}</div>
          <div class="w-14 h-14 rounded-2xl bg-foreground/5 flex items-center justify-center text-primary mb-6 border border-foreground/10">
            <component :is="w.icon" class="w-7 h-7" />
          </div>
          <h3 class="text-xl md:text-2xl font-bold mb-3 tracking-tight text-foreground flex items-center gap-2">
            <span>{{ w.title }}</span>
            <span v-if="w.channelIcons" class="inline-flex items-center gap-1.5" aria-label="Website and WhatsApp">
              <span v-for="(Icon, index) in w.channelIcons" :key="index" class="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
                <component :is="Icon" class="h-4 w-4 text-primary" aria-hidden="true" />
              </span>
            </span>
          </h3>
          <p class="text-sm text-foreground/55 leading-relaxed font-medium">{{ w.desc }}</p>
        </article>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-16 md:py-20 border-t border-foreground/5 relative">
      <div class="absolute right-0 top-16 w-1/3 h-72 bg-primary/10 blur-[120px] -z-10"></div>
      <div class="text-center mb-12 max-w-3xl mx-auto">
        <span class="badge-gradient mb-5">Included</span>
        <h2 class="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">What you get</h2>
        <p class="text-foreground/55 max-w-2xl mx-auto mt-5 font-medium leading-relaxed">Short setup. Clear value. One place to manage your AI customer support assistant.</p>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
        <article v-for="item in highlights" :key="item.title" class="liquid-glass rounded-[28px] p-6 border-foreground/10">
          <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <component :is="item.icon" class="w-6 h-6 text-primary" />
          </div>
          <h4 class="text-lg font-bold mb-2 tracking-tight text-foreground flex items-center gap-2">
            <span v-if="item.channelIcons" class="inline-flex items-center gap-1.5" :aria-label="item.channelIcons.length > 1 ? 'Website and WhatsApp' : 'Channel icon'">
              <span v-for="(Icon, index) in item.channelIcons" :key="index" class="flex h-7 w-7 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
                <component :is="Icon" class="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              </span>
            </span>
            <span>{{ item.title }}</span>
          </h4>
          <p class="text-sm text-foreground/55 font-medium leading-relaxed">{{ item.desc }}</p>
        </article>
      </div>
    </section>

    <section class="max-w-5xl mx-auto px-6 py-16 md:py-20 text-center relative">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <div class="liquid-glass rounded-[34px] p-8 md:p-12">
        <h2 class="text-3xl md:text-5xl font-extrabold mb-6 tracking-tight leading-tight text-foreground">
          Start with your
          <span class="inline-flex translate-y-1 items-center rounded-full border border-foreground/10 bg-background/65 px-3 py-1.5 align-middle backdrop-blur-xl" aria-label="website">
            <Globe2 class="h-6 w-6 md:h-8 md:w-8 text-primary" aria-hidden="true" />
          </span>.
          <span class="text-gradient">Scale when you need more.</span>
        </h2>
        <NuxtLink to="/register" class="btn-gradient px-8 py-4 text-sm relative z-10 inline-flex items-center gap-3 group">
          Start Free
          <ArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </NuxtLink>
        <p class="text-foreground/50 mt-6 text-xs uppercase tracking-[0.2em] font-bold">
          No credit card required
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.liquid-glass {
  @apply border border-foreground/10 bg-background-card/55 shadow-[0_24px_80px_-44px_rgba(15,23,42,0.35)] backdrop-blur-2xl dark:bg-white/[0.035] dark:shadow-[0_24px_90px_-42px_rgba(0,0,0,0.85)];
  background-image:
    linear-gradient(135deg, rgb(var(--surface) / 0.58), rgb(var(--surface) / 0.22)),
    radial-gradient(circle at 12% 0%, rgb(var(--primary) / 0.10), transparent 34%);
}
</style>
