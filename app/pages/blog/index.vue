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
  <div class="blog-compact relative min-h-screen overflow-x-hidden">
    <section class="relative mx-auto max-w-[72rem] overflow-hidden px-4 py-10 sm:px-6 md:py-12">
      <div class="absolute inset-x-0 top-8 mx-auto h-56 w-[58%] rounded-full bg-primary/[0.08] blur-[110px] -z-10"></div>
      <div class="mx-auto max-w-4xl text-center">
        <span class="badge-gradient mb-4">Blog</span>
        <h1 class="text-3xl font-extrabold leading-[1.02] tracking-[-0.045em] text-foreground md:text-4xl lg:text-[3.15rem]">
          Practical guides for AI chatbots, support, pricing, and growth.
        </h1>
        <p class="mx-auto mt-4 max-w-3xl text-sm font-semibold leading-6 text-foreground/60 md:text-[0.95rem]">
          Long-form articles about website chatbots, WhatsApp workflows, AI pricing, and support automation.
        </p>
      </div>
    </section>

    <section class="mx-auto max-w-[72rem] px-4 py-10 sm:px-6 md:py-12">
      <div v-if="pending" class="glass-card hidden border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 lg:block">
        <div class="grid gap-6 lg:grid-cols-2 lg:items-center">
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

      <NuxtLink v-else-if="featuredPost" :to="featuredPost.to" class="glass-card group flex flex-col gap-4 overflow-hidden border-foreground/10 bg-background-card/45 p-1 shadow-sm shadow-black/5 lg:flex-row lg:items-center lg:gap-6">
        <div class="w-full lg:w-1/2">
          <ArticleThumbnail :article="featuredPost" featured />
        </div>
        <div class="w-full p-5 lg:w-1/2 lg:py-6 lg:pl-0 lg:pr-6">
          <span class="mb-3 block text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Featured</span>
          <h2 class="mb-3 text-2xl font-extrabold tracking-[-0.035em] text-foreground transition-colors group-hover:text-primary md:text-3xl">
            {{ featuredPost.title }}
          </h2>
          <p class="mb-5 text-sm font-medium leading-6 text-foreground/55">
            {{ featuredPost.excerpt }}
          </p>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-foreground/30">
              <span>{{ featuredPost.date }}</span>
              <span class="w-1 h-1 rounded-full bg-foreground/20"></span>
              <span>{{ featuredPost.readTime }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm font-bold text-foreground transition-colors group-hover:text-primary">
              Read article
              <ArrowRight class="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </div>
          </div>
        </div>
      </NuxtLink>

      <div v-if="pending" class="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div v-for="i in 5" :key="i" class="glass-card flex flex-col overflow-hidden border-foreground/10 bg-background-card/45 p-0 shadow-sm shadow-black/5">
          <Skeleton width="100%" height="180px" radius="0" />
          <div class="flex flex-1 flex-col p-5">
            <div class="mb-4 flex items-center justify-between">
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

      <div v-else class="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <NuxtLink v-for="post in otherPosts" :key="post.title" :to="post.to" class="glass-card group flex cursor-pointer flex-col overflow-hidden border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 transition-all hover:border-primary/20">
          <ArticleThumbnail :article="post" compact />
          <div class="flex flex-1 flex-col p-5">
            <div class="mb-4 flex items-center justify-between">
              <span class="rounded-[0.6rem] border border-primary/10 bg-primary/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">{{ post.category }}</span>
              <div class="flex items-center gap-2 text-[10px] text-foreground/30 font-bold uppercase tracking-widest">
                <Clock class="w-3 h-3" />
                {{ post.readTime }}
              </div>
            </div>
            <h3 class="mb-2 text-base font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">{{ post.title }}</h3>
            <p class="mb-5 flex-1 text-sm font-medium leading-6 text-foreground/55">{{ post.excerpt }}</p>
            <div class="mt-auto flex items-center justify-between border-t border-foreground/10 pt-4">
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
.glass-card { @apply rounded-[1rem] border bg-background-card/45; }
</style>
