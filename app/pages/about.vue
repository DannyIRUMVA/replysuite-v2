<script setup lang="ts">
import { Users, Sparkles, ShieldCheck, Heart, ArrowRight } from 'lucide-vue-next'

useSeoMeta({
  title: 'About ReplySuite',
  description: 'ReplySuite helps businesses launch AI chatbots trained on their own content for website and WhatsApp support.',
  ogTitle: 'About ReplySuite',
  ogDescription: 'Learn what ReplySuite builds and why.',
  ogUrl: 'https://replysuite.app/about',
  twitterCard: 'summary_large_image',
  twitterTitle: 'About ReplySuite',
  twitterDescription: 'AI chatbot software for website and WhatsApp.',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://replysuite.app/about' }]
})

definePageMeta({
  layout: 'default'
})

const values = [
  {
    title: 'Clarity',
    desc: 'We want AI tools to be easy to understand and easy to use.',
    icon: Sparkles
  },
  {
    title: 'Trust',
    desc: 'Your business data and customer conversations should be handled with care.',
    icon: ShieldCheck
  },
  {
    title: 'Usefulness',
    desc: 'The product should solve real support and sales problems, not just look impressive.',
    icon: Heart
  }
]
</script>

<template>
  <div class="relative">
    <section class="max-w-7xl mx-auto px-6 py-32 text-center relative">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>
      <span class="badge-gradient mb-10">About</span>
      <h1 class="text-5xl md:text-7xl font-extrabold mb-10 tracking-tight leading-[0.95] text-foreground">
        We build AI chatbots that businesses can actually use.
      </h1>
      <p class="text-lg text-foreground/50 max-w-3xl mx-auto leading-relaxed font-medium">
        ReplySuite helps businesses train a chatbot on their own content and deploy it on their website and WhatsApp. The goal is simple: answer faster, support better, and miss fewer leads.
      </p>
    </section>

    <section id="mission" class="max-w-7xl mx-auto px-6 py-24 border-t border-foreground/10">
      <div class="bg-foreground/[0.02] p-12 md:p-20 rounded-[40px] border border-foreground/10 relative overflow-hidden group">
        <div class="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-[100px] group-hover:bg-primary/10 transition-all duration-1000"></div>
        <div class="grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div>
            <h2 class="text-4xl md:text-6xl font-extrabold mb-8 tracking-tight leading-tight text-foreground">
              Built for clear business value.
            </h2>
            <p class="text-lg text-foreground/50 leading-relaxed font-medium mb-8">
              We care about practical results. Better replies. Faster support. More consistent answers. Less time wasted repeating the same information.
            </p>
            <NuxtLink to="/product" class="inline-flex items-center gap-3 text-primary font-bold uppercase tracking-[0.2em] text-[10px]">
              See the product
              <ArrowRight class="w-4 h-4" />
            </NuxtLink>
          </div>
          <div class="relative flex justify-center lg:justify-end">
            <div class="w-64 h-64 rounded-[48px] bg-gradient-to-br from-primary/30 to-transparent p-1">
              <div class="w-full h-full rounded-[47px] bg-background flex items-center justify-center p-12">
                <Users class="w-20 h-20 text-primary shadow-2xl shadow-primary/20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-24 border-t border-foreground/10">
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">What matters to us</h2>
      </div>
      <div class="grid md:grid-cols-3 gap-8">
        <div v-for="value in values" :key="value.title" class="glass-card p-10 border-foreground/10 text-center">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
            <component :is="value.icon" class="w-8 h-8 text-primary" />
          </div>
          <h4 class="text-xl font-bold mb-4 tracking-tight text-foreground">{{ value.title }}</h4>
          <p class="text-sm text-foreground/50 font-medium leading-relaxed">{{ value.desc }}</p>
        </div>
      </div>
    </section>

    <section class="max-w-5xl mx-auto px-6 py-24 text-center">
      <h2 class="text-4xl md:text-6xl font-extrabold mb-10 tracking-tight leading-none text-foreground">
        Want to try ReplySuite?
      </h2>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-6">
        <NuxtLink to="/register" class="w-full sm:w-auto btn-gradient px-12 py-5 text-xl">Start Free</NuxtLink>
        <NuxtLink to="/pricing" class="w-full sm:w-auto border border-foreground/10 px-12 py-5 rounded-full hover:bg-foreground/5 transition-colors text-xl font-bold">
          View Pricing
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[32px] bg-foreground/[0.02];
}
</style>
