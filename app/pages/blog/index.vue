<script setup lang="ts">
import { Clock, ArrowRight } from 'lucide-vue-next'
import Skeleton from '~~/app/components/Skeleton.vue'
import ArticleThumbnail from '~~/app/components/blog/ArticleThumbnail.vue'
import { blogArticles } from '~~/app/data/blog'

useSeoMeta({
  title: 'Blog | ReplySuite',
  description: 'Long-form guides about AI chatbots, support automation, pricing models, website widgets, and WhatsApp workflows.',
  ogTitle: 'ReplySuite Blog',
  ogDescription: 'Practical long-form guides about AI chatbots, pricing, support automation, and WhatsApp workflows.',
  ogImage: 'https://replysuite.app/og/blog/index.svg',
  twitterCard: 'summary_large_image',
  twitterTitle: 'ReplySuite Blog',
  twitterDescription: 'Practical long-form guides about AI chatbots, pricing, support automation, and WhatsApp workflows.',
  twitterImage: 'https://replysuite.app/og/blog/index.svg'
})

definePageMeta({
  layout: 'default'
})

const { data: posts, pending } = await useAsyncData('blog-index', async () => blogArticles)

const featuredPost = computed(() => posts.value?.find((post) => post.featured) || posts.value?.[0])
const otherPosts = computed(() => (posts.value || []).filter((post) => post.slug !== featuredPost.value?.slug))
</script>

<template>
  <div class="relative min-h-screen">
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <div class="text-center max-w-3xl mx-auto">
        <span class="badge-gradient mb-10">Blog</span>
        <h1 class="text-5xl sm:text-7xl md:text-8xl font-extrabold mb-8 tracking-tight leading-[0.9] text-foreground">
          Practical guides for AI chatbots, support, pricing, and growth.
        </h1>
        <p class="text-lg text-foreground/50 font-medium leading-relaxed">
          Long-form articles about website chatbots, WhatsApp workflows, AI pricing, and support automation.
        </p>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-20">
      <div v-if="pending" class="glass-card p-8 border-foreground/10 bg-foreground/[0.01] hidden lg:block">
        <div class="grid lg:grid-cols-2 gap-16 items-center">
          <Skeleton width="100%" height="320px" radius="2rem" />
          <div>
            <Skeleton width="120px" height="12px" class="mb-6" />
            <Skeleton width="100%" height="44px" radius="1rem" class="mb-4" />
            <Skeleton width="86%" height="44px" radius="1rem" class="mb-6" />
            <Skeleton width="100%" height="16px" class="mb-3" />
            <Skeleton width="90%" height="16px" class="mb-8" />
            <div class="flex items-center justify-between">
              <div class="flex gap-4">
                <Skeleton width="90px" height="12px" />
                <Skeleton width="80px" height="12px" />
              </div>
              <Skeleton width="120px" height="16px" />
            </div>
          </div>
        </div>
      </div>

      <NuxtLink v-else-if="featuredPost" :to="featuredPost.to" class="glass-card p-1 items-center gap-16 border-foreground/10 bg-foreground/[0.01] overflow-hidden hidden lg:flex group">
        <div class="w-1/2">
          <ArticleThumbnail :article="featuredPost" featured />
        </div>
        <div class="w-1/2 pr-16 py-12">
          <span class="text-xs font-bold text-primary uppercase tracking-widest mb-6 block">Featured</span>
          <h2 class="text-4xl font-extrabold text-foreground mb-6 tracking-tight leading-tight group-hover:text-primary transition-colors">
            {{ featuredPost.title }}
          </h2>
          <p class="text-foreground/40 mb-10 leading-relaxed font-medium">
            {{ featuredPost.excerpt }}
          </p>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4 text-xs text-foreground/30 font-bold uppercase tracking-widest">
              <span>{{ featuredPost.date }}</span>
              <span class="w-1 h-1 rounded-full bg-foreground/20"></span>
              <span>{{ featuredPost.readTime }}</span>
            </div>
            <div class="flex items-center gap-2 text-foreground font-bold group-hover:text-primary transition-colors">
              Read article
              <ArrowRight class="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </div>
          </div>
        </div>
      </NuxtLink>

      <div v-if="pending" class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
        <div v-for="i in 5" :key="i" class="glass-card flex flex-col border-foreground/10 overflow-hidden bg-foreground/[0.01] p-0">
          <Skeleton width="100%" height="180px" radius="0" />
          <div class="p-10 flex-1 flex flex-col">
            <div class="flex items-center justify-between mb-6">
              <Skeleton width="90px" height="22px" radius="9999px" />
              <Skeleton width="70px" height="12px" />
            </div>
            <Skeleton width="100%" height="26px" class="mb-3" />
            <Skeleton width="88%" height="26px" class="mb-5" />
            <Skeleton width="100%" height="14px" class="mb-3" />
            <Skeleton width="92%" height="14px" class="mb-8" />
            <div class="mt-auto pt-6 border-t border-foreground/10 flex items-center justify-between">
              <Skeleton width="80px" height="12px" />
              <Skeleton width="18px" height="18px" circle />
            </div>
          </div>
        </div>
      </div>

      <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
        <NuxtLink v-for="post in otherPosts" :key="post.title" :to="post.to" class="glass-card flex flex-col border-foreground/10 hover:border-primary/20 transition-all group cursor-pointer overflow-hidden">
          <ArticleThumbnail :article="post" compact />
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
