<script setup lang="ts">
import { Bot, Zap, MessageSquare, Target, BarChart3, Globe2, Layers, ArrowRight, MessageCircle, FileText, ShieldCheck, Languages, Settings2 } from 'lucide-vue-next'

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
  { title: 'Train on your content', desc: 'Use your website, PDFs, FAQs, and custom text to ground customer replies.', icon: Bot },
  { title: 'Website widget', desc: 'Add your chatbot to approved domains with an embeddable website widget.', icon: Globe2 },
  { title: 'WhatsApp support', desc: 'Expand into WhatsApp when you need a higher-value support channel.', icon: MessageCircle },
  { title: 'Lead capture', desc: 'Turn support questions into useful customer conversations and follow-up details.', icon: Target },
  { title: 'Usage tracking', desc: 'Monitor replies, training activity, and plan limits from one dashboard.', icon: BarChart3 },
  { title: 'One dashboard', desc: 'Manage setup, testing, deployment, language settings, and training sources.', icon: Layers },
  { title: 'Document training', desc: 'Upload PDFs and business documents so the assistant can answer from them.', icon: FileText },
  { title: 'Safer control', desc: 'Control where the chatbot is deployed and how it presents your business.', icon: ShieldCheck },
  { title: 'Multilingual replies', desc: 'Support English, Kinyarwanda, Swahili, Kirundi, Luganda, Arabic, and more.', icon: Languages }
]

const trainingItems = ['Website URL training', 'PDF and document uploads', 'Custom text and FAQ content', 'Language and tone guidance']
const channelItems = ['Website chatbot first', 'WhatsApp on growth plans', 'Lead capture and handoff', 'Usage visibility']
</script>

<template>
  <div class="relative overflow-hidden">
    <section class="max-w-7xl mx-auto px-6 py-20 md:py-24 text-center relative">
      <div class="absolute inset-x-0 top-10 mx-auto h-72 w-[72%] rounded-full bg-primary/10 blur-[140px] -z-10"></div>
      <span class="badge-gradient mb-6">Features</span>
      <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight leading-[1.02] text-foreground max-w-5xl mx-auto">
        Features for faster replies, better support, and more captured leads.
      </h1>
      <p class="text-base md:text-lg text-foreground/55 max-w-3xl mx-auto leading-relaxed font-medium">
        ReplySuite is built for practical business use. Train on your business content, launch on your website, and expand into WhatsApp AI support when you are ready.
      </p>
    </section>

    <section class="max-w-7xl mx-auto px-6 pb-16 md:pb-20">
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
        <article v-for="feat in features" :key="feat.title" class="liquid-glass rounded-[28px] p-6 md:p-7 border-foreground/10 group hover:border-primary/25 transition-all relative overflow-hidden">
          <div class="absolute -right-10 -bottom-10 w-36 h-36 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all"></div>
          <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-5 border border-primary/10 relative z-10">
            <component :is="feat.icon" class="w-6 h-6" />
          </div>
          <h3 class="text-xl font-bold mb-3 tracking-tight text-foreground">{{ feat.title }}</h3>
          <p class="text-sm text-foreground/55 leading-relaxed font-medium relative z-10">{{ feat.desc }}</p>
        </article>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-16 md:py-20 border-t border-foreground/5 space-y-10 md:space-y-12">
      <div class="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div>
          <span class="badge-gradient mb-5">Training</span>
          <h2 class="text-3xl md:text-5xl font-extrabold mb-5 tracking-tight text-foreground leading-tight">
            Better answers start with better training.
          </h2>
          <p class="text-foreground/55 text-base md:text-lg mb-7 leading-relaxed font-medium">
            Generic bots give generic replies. ReplySuite grounds answers in your own business content so customers get more useful responses.
          </p>
          <div class="grid sm:grid-cols-2 gap-3">
            <div v-for="item in trainingItems" :key="item" class="rounded-2xl border border-foreground/10 bg-foreground/[0.025] px-4 py-3 flex items-center gap-3 text-sm font-bold tracking-tight text-foreground/70">
              <Zap class="w-4 h-4 text-primary fill-current flex-shrink-0" />
              <span>{{ item }}</span>
            </div>
          </div>
        </div>
        <div class="liquid-glass rounded-[32px] border-foreground/10 p-6 md:p-8 relative bg-background/40 overflow-hidden min-h-[280px] flex flex-col items-center justify-center">
          <div class="absolute inset-0 bg-primary/5 blur-[100px]"></div>
          <div class="absolute top-5 right-5 px-4 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-bold text-primary uppercase tracking-[0.18em] relative z-10">customer support ai</div>
          <div class="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center relative z-10 shadow-2xl shadow-primary/20">
            <MessageSquare class="w-12 h-12 text-primary" />
          </div>
          <p class="relative z-10 mt-6 text-sm text-foreground/55 font-semibold text-center max-w-sm">Content-aware answers for real customer questions.</p>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div class="liquid-glass rounded-[32px] border-foreground/10 p-6 md:p-8 relative bg-background/40 overflow-hidden min-h-[280px] flex flex-col items-center justify-center lg:order-1 order-2">
          <div class="absolute inset-0 bg-primary/5 blur-[100px]"></div>
          <div class="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center relative z-10 shadow-2xl shadow-primary/20">
            <MessageCircle class="w-12 h-12 text-primary" />
          </div>
          <div class="relative z-10 mt-6 grid grid-cols-2 gap-3 w-full max-w-md">
            <div v-for="item in channelItems" :key="item" class="rounded-2xl border border-foreground/10 bg-background/50 px-4 py-3 text-xs font-bold text-foreground/60 text-center">
              {{ item }}
            </div>
          </div>
        </div>
        <div class="lg:order-2 order-1">
          <span class="badge-gradient mb-5">Channels</span>
          <h2 class="text-3xl md:text-5xl font-extrabold mb-5 tracking-tight text-foreground leading-tight">
            Start on web. Expand when ready.
          </h2>
          <p class="text-foreground/55 text-base md:text-lg mb-8 leading-relaxed font-medium">
            The easiest first step is your website chatbot. When the core setup works, grow into WhatsApp AI support and more advanced automation.
          </p>
          <NuxtLink to="/register" class="btn-gradient inline-flex items-center gap-3 px-8 py-4 text-sm group">
            Start Free
            <ArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="max-w-5xl mx-auto px-6 py-16 md:py-20 text-center">
      <div class="liquid-glass rounded-[34px] p-8 md:p-12 relative overflow-hidden">
        <div class="absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/15 blur-[90px]"></div>
        <Settings2 class="relative z-10 mx-auto mb-5 h-10 w-10 text-primary" />
        <h2 class="relative z-10 text-3xl md:text-5xl font-extrabold text-foreground tracking-tight leading-tight mb-5">
          One product for training, deploying, and improving support.
        </h2>
        <p class="relative z-10 text-foreground/55 max-w-2xl mx-auto font-medium leading-relaxed">
          Keep the workflow simple: train your assistant, test answers, connect channels, and monitor usage from one dashboard.
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
