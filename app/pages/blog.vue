<script setup lang="ts">
import { BookOpen, Clock, ArrowRight, Zap } from 'lucide-vue-next'

useSeoMeta({
  title: 'Blog | ReplySuite',
  description: 'Short guides and updates about AI chatbots, support automation, and website or WhatsApp use cases.',
})

definePageMeta({
  layout: 'default'
})

const posts = [
  {
    title: '10 Best ReplySuite Alternatives in 2026',
    excerpt: 'A simple comparison of chatbot tools and where ReplySuite fits.',
    date: 'May 05, 2026',
    readTime: '12 min read',
    category: 'Comparison',
    to: '/blog/replysuite-alternatives'
  },
  {
    title: 'Privacy-First AI: Navigating GDPR in 2026',
    excerpt: 'What privacy means when you use AI for customer conversations.',
    date: 'May 03, 2026',
    readTime: '10 min read',
    category: 'Security',
    to: '/blog/privacy-first-ai'
  },
  {
    title: 'Reducing Support Tickets by 70%',
    excerpt: 'How teams can reduce repetitive work with trained AI replies.',
    date: 'Apr 28, 2026',
    readTime: '8 min read',
    category: 'Efficiency',
    to: '/blog/reduce-support-tickets'
  },
  {
    title: 'The Shift to AI-Native Brands in 2026',
    excerpt: 'Why faster answers and better coverage matter more than ever.',
    date: 'Apr 18, 2026',
    readTime: '6 min read',
    category: 'Strategy',
    to: '#'
  }
]
</script>

<template>
  <div class="relative min-h-screen">
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <div class="text-center max-w-3xl mx-auto">
        <span class="badge-gradient mb-10">Blog</span>
        <h1 class="text-5xl sm:text-7xl md:text-8xl font-extrabold mb-8 tracking-tight leading-[0.9] text-foreground">
          Practical guides for AI chatbots and support automation.
        </h1>
        <p class="text-lg text-foreground/50 font-medium leading-relaxed">
          Short reads about setup, security, support, and customer response workflows.
        </p>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-20">
      <div class="glass-card p-1 items-center gap-16 border-foreground/10 bg-foreground/[0.01] overflow-hidden hidden lg:flex">
        <div class="w-1/2 aspect-video bg-foreground/5 rounded-[30px] flex items-center justify-center border border-foreground/10 relative overflow-hidden group">
          <div class="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50"></div>
          <Zap class="w-20 h-20 text-primary opacity-20" />
        </div>
        <div class="w-1/2 pr-16 py-12">
          <span class="text-xs font-bold text-primary uppercase tracking-widest mb-6 block">Featured</span>
          <h2 class="text-4xl font-extrabold text-foreground mb-6 tracking-tight leading-tight">
            How AI chatbots save time without replacing your team.
          </h2>
          <p class="text-foreground/40 mb-10 leading-relaxed font-medium">
            A simple look at where AI helps most: repetitive questions, fast answers, and better after-hours coverage.
          </p>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4 text-xs text-foreground/30 font-bold uppercase tracking-widest">
              <span>May 01, 2026</span>
              <span class="w-1 h-1 rounded-full bg-foreground/20"></span>
              <span>10 min read</span>
            </div>
            <button class="flex items-center gap-2 text-foreground font-bold hover:text-primary transition-colors group">
              Read article
              <ArrowRight class="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
        <NuxtLink v-for="post in posts" :key="post.title" :to="post.to" class="glass-card flex flex-col border-foreground/10 hover:border-primary/20 transition-all group cursor-pointer overflow-hidden">
          <div class="aspect-video bg-foreground/5 flex items-center justify-center border-b border-foreground/10 relative overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-40"></div>
            <BookOpen class="w-12 h-12 text-primary opacity-10 group-hover:scale-125 transition-transform duration-700" />
          </div>
          <div class="p-10 flex-1 flex flex-col">
            <div class="flex items-center justify-between mb-6">
              <span class="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full border border-primary/10">{{ post.category }}</span>
              <div class="flex items-center gap-2 text-[10px] text-foreground/30 font-bold uppercase tracking-widest">
                <Clock class="w-3 h-3" />
                {{ post.readTime }}
              </div>
            </div>
            <h3 class="text-xl font-bold text-foreground mb-4 tracking-tight leading-snug group-hover:text-primary transition-colors">{{ post.title }}</h3>
            <p class="text-sm text-foreground/40 leading-relaxed font-medium mb-8 flex-1">{{ post.excerpt }}</p>
            <div class="flex items-center justify-between pt-6 border-t border-foreground/10 mt-auto">
              <span class="text-xs text-foreground/30 font-medium">{{ post.date }}</span>
              <ArrowRight class="w-5 h-5 text-foreground/40 group-hover:text-primary group-hover:translate-x-2 transition-all" />
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.glass-card { @apply rounded-[32px] bg-foreground/[0.01]; }
</style>
