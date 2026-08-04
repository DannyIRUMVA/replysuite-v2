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
  <div class="about-compact relative overflow-x-hidden">
    <section class="relative mx-auto max-w-[72rem] px-4 py-10 text-center sm:px-6 md:py-12">
      <div class="absolute inset-x-0 top-8 mx-auto h-56 w-[58%] rounded-full bg-primary/[0.08] blur-[110px] -z-10"></div>
      <span class="badge-gradient mb-4">About</span>
      <h1 class="mx-auto max-w-4xl text-3xl font-extrabold leading-[1.02] tracking-[-0.045em] text-foreground md:text-4xl lg:text-[3.15rem]">
        We build AI chatbots that businesses can actually use.
      </h1>
      <p class="mx-auto mt-4 max-w-3xl text-sm font-semibold leading-6 text-foreground/60 md:text-[0.95rem]">
        ReplySuite helps businesses train a chatbot on their own content and deploy it on their website and WhatsApp. The goal is simple: answer faster, support better, and miss fewer leads.
      </p>
    </section>

    <section id="mission" class="mx-auto max-w-[72rem] border-t border-foreground/5 px-4 py-10 sm:px-6 md:py-12">
      <div class="group relative overflow-hidden rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 backdrop-blur-xl md:p-6">
        <div class="absolute right-0 top-0 h-full w-1/3 bg-primary/[0.05] blur-[90px] transition-all duration-1000 group-hover:bg-primary/[0.08]"></div>
        <div class="relative z-10 grid gap-6 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 class="text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">
              Built for clear business value.
            </h2>
            <p class="mt-3 text-sm font-semibold leading-6 text-foreground/55">
              We care about practical results. Better replies. Faster support. More consistent answers. Less time wasted repeating the same information.
            </p>
            <NuxtLink to="/product" class="mt-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              See the product
              <ArrowRight class="w-4 h-4" />
            </NuxtLink>
          </div>
          <div class="relative flex justify-center lg:justify-end">
            <div class="h-40 w-40 rounded-[1rem] bg-gradient-to-br from-primary/25 to-transparent p-1 sm:h-48 sm:w-48">
              <div class="flex h-full w-full items-center justify-center rounded-[0.95rem] bg-background p-8">
                <Users class="h-12 w-12 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[72rem] border-t border-foreground/5 px-4 py-10 sm:px-6 md:py-12">
      <div class="mb-6 text-center md:mb-8">
        <h2 class="text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">What matters to us</h2>
      </div>
      <div class="grid gap-4 md:grid-cols-3">
        <div v-for="value in values" :key="value.title" class="rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 text-center shadow-sm shadow-black/5 backdrop-blur-xl">
          <div class="mx-auto mb-4 flex h-9 w-9 items-center justify-center rounded-[0.7rem] bg-primary/10">
            <component :is="value.icon" class="h-4 w-4 text-primary" />
          </div>
          <h4 class="mb-2 text-base font-bold tracking-tight text-foreground">{{ value.title }}</h4>
          <p class="text-sm font-medium leading-6 text-foreground/55">{{ value.desc }}</p>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[64rem] px-4 py-10 text-center sm:px-6 md:py-12">
      <h2 class="text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">
        Want to try ReplySuite?
      </h2>
      <div class="mt-5 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
        <NuxtLink to="/register" class="btn-gradient w-full rounded-[0.78rem] px-5 py-3 text-sm font-bold sm:w-auto">Start Free</NuxtLink>
        <NuxtLink to="/pricing" class="w-full rounded-[0.78rem] border border-foreground/10 bg-foreground/[0.02] px-5 py-3 text-sm font-bold text-foreground/70 transition-colors hover:bg-foreground/5 sm:w-auto">
          View Pricing
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[1rem] bg-background-card/45;
}
</style>
