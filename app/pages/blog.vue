<script setup lang="ts">
import { BookOpen, Calendar, Clock, ArrowRight, Sparkles, MessageSquare, Zap } from 'lucide-vue-next'

useSeoMeta({
  title: 'Blog | AI Marketing & Automation Insights',
  description: 'Deep dives into AI marketing, customer engagement strategies, and the future of automation with ReplySuite.',
})

definePageMeta({
  layout: 'default'
})

const posts = [
  {
    title: '10 Best ReplySuite Alternatives in 2026',
    excerpt: 'A deep dive into the top 10 AI chatbot and automation platforms. See how we compare to the industry giants.',
    date: 'May 05, 2026',
    readTime: '12 min read',
    category: 'Comparison',
    image: '/blog/post-alt.png',
    to: '/blog/replysuite-alternatives'
  },
  {
    title: 'Privacy-First AI: Navigating GDPR in 2026',
    excerpt: 'How ReplySuite ensures absolute data sovereignty while maintaining high-performance AI reasoning.',
    date: 'May 03, 2026',
    readTime: '10 min read',
    category: 'Security',
    image: '/blog/post-privacy.png',
    to: '/blog/privacy-first-ai'
  },
  {
    title: 'Reducing Support Tickets by 70%',
    excerpt: 'A blueprint for brands to automate repetitive inquiries without losing the human touch.',
    date: 'Apr 28, 2026',
    readTime: '8 min read',
    category: 'Efficiency',
    image: '/blog/post-efficiency.png',
    to: '/blog/reduce-support-tickets'
  },
  {
    title: 'The Shift to AI-Native Brands in 2026',
    excerpt: 'Why traditional marketing is failing and how AI agents are reclaiming the human connection.',
    date: 'Apr 18, 2026',
    readTime: '6 min read',
    category: 'Strategy',
    image: '/blog/post-1.png',
    to: '#'
  }
]
</script>

<template>
  <div class="relative min-h-screen">
    <!-- Hero -->
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <div class="text-center max-w-3xl mx-auto">
        <span class="badge-gradient mb-10">Insights</span>
        <h1 class="text-5xl sm:text-7xl md:text-8xl font-extrabold mb-8 tracking-tighter leading-[0.85] text-white">
          The Future of <br />
          <span class="text-gradient">Engagement.</span>
        </h1>
        <p class="text-xl text-gray-400 font-medium leading-relaxed">
          Strategy, security, and stories from the frontier of AI automation.
        </p>
      </div>
    </section>

    <!-- Featured Post (Placeholder) -->
    <section class="max-w-7xl mx-auto px-6 py-20">
      <div class="glass-card p-1 items-center gap-16 border-white/5 bg-white/[0.01] overflow-hidden hidden lg:flex">
         <div class="w-1/2 aspect-video bg-gray-900 rounded-[30px] flex items-center justify-center border border-white/5 relative overflow-hidden group">
            <div class="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50 group-hover:opacity-80 transition-opacity"></div>
            <Zap class="w-20 h-20 text-primary opacity-20" />
         </div>
         <div class="w-1/2 pr-16 py-12">
            <span class="text-xs font-bold text-primary uppercase tracking-widest mb-6 block">Featured Post</span>
            <h2 class="text-4xl font-extrabold text-white mb-6 tracking-tight leading-tight">
              Reclaiming Human Time: The Role of AI in 2026.
            </h2>
            <p class="text-gray-500 mb-10 leading-relaxed font-medium">
              We explore how AI agents are not replacing human staff, but rather shielding them from repetitive inquiries to enable deep work.
            </p>
            <div class="flex items-center justify-between">
               <div class="flex items-center gap-4 text-xs text-gray-600 font-bold uppercase tracking-widest">
                  <span>May 01, 2026</span>
                  <span class="w-1 h-1 rounded-full bg-white/20"></span>
                  <span>10 min read</span>
               </div>
               <button class="flex items-center gap-2 text-white font-bold hover:text-primary transition-colors group">
                  Read Article
                  <ArrowRight class="w-5 h-5 group-hover:translate-x-2 transition-transform" />
               </button>
            </div>
         </div>
      </div>

      <!-- Post Grid -->
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
        <NuxtLink v-for="post in posts" :key="post.title" :to="post.to" class="glass-card flex flex-col border-white/5 hover:border-primary/20 transition-all group cursor-pointer overflow-hidden">
          <div class="aspect-video bg-gray-900 flex items-center justify-center border-b border-white/5 relative overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-40"></div>
            <BookOpen class="w-12 h-12 text-primary opacity-10 group-hover:scale-125 transition-transform duration-700" />
          </div>
          <div class="p-10 flex-1 flex flex-col">
            <div class="flex items-center justify-between mb-6">
              <span class="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full border border-primary/10">{{ post.category }}</span>
              <div class="flex items-center gap-2 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                 <Clock class="w-3 h-3" />
                 {{ post.readTime }}
              </div>
            </div>
            <h3 class="text-xl font-bold text-white mb-4 tracking-tight leading-snug group-hover:text-primary transition-colors">{{ post.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed font-medium mb-8 flex-1">{{ post.excerpt }}</p>
            <div class="flex items-center justify-between pt-6 border-t border-white/5 mt-auto">
              <span class="text-xs text-gray-600 font-medium">{{ post.date }}</span>
              <ArrowRight class="w-5 h-5 text-gray-500 group-hover:text-primary group-hover:translate-x-2 transition-all" />
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.glass-card { @apply rounded-[40px] bg-white/[0.01]; }
</style>
