<script setup lang="ts">
import Skeleton from '~~/app/components/Skeleton.vue'
import ArticleThumbnail from '~~/app/components/blog/ArticleThumbnail.vue'
import type { BlogArticleMeta } from '~~/app/data/blog'

interface CtaConfig {
  title: string
  text: string
  buttonLabel: string
  buttonTo: string
}

const props = withDefaults(defineProps<{
  article: BlogArticleMeta
  pending?: boolean
  centeredHero?: boolean
  cta?: CtaConfig
}>(), {
  pending: false,
  centeredHero: false,
  cta: () => ({
    title: 'Create your chatbot in minutes',
    text: 'Train it on your content, launch it on your website, and grow into WhatsApp when you are ready.',
    buttonLabel: 'Start free',
    buttonTo: '/register'
  })
})
</script>

<template>
  <div class="relative min-h-screen pb-40">
    <div class="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.14),transparent_42%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_28%)] pointer-events-none"></div>

    <section class="max-w-5xl mx-auto px-6 pt-32 pb-16 relative overflow-hidden" :class="props.centeredHero ? 'text-center' : ''">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>

      <template v-if="pending">
        <div class="mb-12">
          <Skeleton width="120px" height="14px" class="mb-6" />
          <Skeleton width="180px" height="12px" />
        </div>
        <div class="article-hero-shell p-8 md:p-10">
          <Skeleton width="160px" height="22px" class="mb-8" />
          <Skeleton width="100%" height="56px" radius="1.5rem" class="mb-4" />
          <Skeleton width="85%" height="56px" radius="1.5rem" class="mb-8" />
          <Skeleton width="100%" height="16px" class="mb-3" />
          <Skeleton width="92%" height="16px" class="mb-3" />
          <Skeleton width="72%" height="16px" class="mb-10" />
          <Skeleton width="100%" height="320px" radius="2rem" class="mb-10" />
          <div class="flex flex-wrap items-center gap-8 pt-8 border-t border-foreground/5">
            <div class="flex items-center gap-3">
              <Skeleton width="40px" height="40px" circle />
              <Skeleton width="140px" height="14px" />
            </div>
            <div class="flex items-center gap-6">
              <Skeleton width="100px" height="12px" />
              <Skeleton width="90px" height="12px" />
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <NuxtLink to="/blog" class="inline-flex items-center gap-2 text-foreground/50 hover:text-primary transition-colors mb-10 font-bold text-xs uppercase tracking-widest group" :class="props.centeredHero ? 'mx-auto' : ''">
          <span class="group-hover:-translate-x-1 transition-transform">←</span>
          Back to blog
        </NuxtLink>

        <div class="article-hero-shell p-8 md:p-10 lg:p-12">
          <span class="badge-gradient mb-8" :class="props.centeredHero ? 'mx-auto' : ''">{{ props.article.badge }}</span>
          <h1 class="text-5xl md:text-7xl font-extrabold mb-8 tracking-tighter leading-[0.92] text-foreground text-balance">
            {{ props.article.title }}
          </h1>
          <p class="text-xl text-foreground/65 leading-relaxed font-medium mb-10 max-w-3xl" :class="props.centeredHero ? 'mx-auto' : ''">
            {{ props.article.description }}
          </p>

          <div class="mb-10">
            <ArticleThumbnail :article="props.article" featured />
          </div>

          <div class="flex flex-wrap items-center gap-4 md:gap-6 pt-8 border-t border-foreground/5" :class="props.centeredHero ? 'justify-center' : ''">
            <div class="inline-flex items-center gap-3 rounded-full border border-foreground/10 bg-foreground/[0.03] px-4 py-2">
              <div class="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center font-bold text-xs text-white">{{ props.article.authorInitials }}</div>
              <span class="text-foreground font-bold text-sm">{{ props.article.author }}</span>
            </div>
            <div class="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.03] px-4 py-2 text-xs text-foreground/50 font-bold uppercase tracking-widest">
              <span>Published</span>
              <span class="text-foreground/75">{{ props.article.date }}</span>
            </div>
            <div class="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.03] px-4 py-2 text-xs text-foreground/50 font-bold uppercase tracking-widest">
              <span>Read time</span>
              <span class="text-foreground/75">{{ props.article.readTime }}</span>
            </div>
          </div>
        </div>
      </template>
    </section>

    <article v-if="pending" class="max-w-4xl mx-auto px-6">
      <div class="article-shell p-8 md:p-10 lg:p-12">
        <div class="space-y-5">
          <Skeleton width="100%" height="18px" />
          <Skeleton width="98%" height="18px" />
          <Skeleton width="92%" height="18px" />
          <Skeleton width="80%" height="18px" />
        </div>
        <div class="my-14 rounded-[32px] border border-foreground/10 bg-foreground/[0.02] p-8">
          <Skeleton width="220px" height="24px" class="mb-6" />
          <div class="space-y-4">
            <Skeleton width="100%" height="14px" />
            <Skeleton width="92%" height="14px" />
            <Skeleton width="88%" height="14px" />
          </div>
        </div>
        <div class="space-y-5">
          <Skeleton width="70%" height="32px" class="mb-6" />
          <Skeleton width="100%" height="18px" />
          <Skeleton width="96%" height="18px" />
          <Skeleton width="90%" height="18px" />
        </div>
        <div class="grid md:grid-cols-3 gap-6 my-14">
          <Skeleton v-for="i in 3" :key="i" width="100%" height="180px" radius="1.5rem" />
        </div>
        <div class="space-y-5">
          <Skeleton width="75%" height="32px" class="mb-6" />
          <Skeleton width="100%" height="18px" />
          <Skeleton width="94%" height="18px" />
          <Skeleton width="89%" height="18px" />
        </div>
      </div>
    </article>

    <article v-else class="max-w-4xl mx-auto px-6">
      <div class="article-shell p-8 md:p-10 lg:p-12">
        <div class="article-prose prose dark:prose-invert prose-primary prose-lg max-w-none">
          <slot />
        </div>
      </div>

      <div class="not-prose p-12 rounded-[40px] bg-foreground/[0.02] border border-foreground/10 text-center mt-12 relative overflow-hidden group">
        <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity blur-[80px]"></div>
        <h3 class="text-3xl font-bold text-foreground mb-6 tracking-tight">{{ props.cta.title }}</h3>
        <p class="text-foreground/50 mb-10 max-w-lg mx-auto font-medium">
          {{ props.cta.text }}
        </p>
        <NuxtLink :to="props.cta.buttonTo" class="btn-gradient px-10 py-5 inline-flex items-center gap-4">
          {{ props.cta.buttonLabel }}
        </NuxtLink>
      </div>
    </article>
  </div>
</template>

<style scoped>
.article-hero-shell {
  @apply rounded-[40px] border border-foreground/10 bg-foreground/[0.02] backdrop-blur-sm shadow-[0_20px_80px_rgba(0,0,0,0.18)];
}

.article-shell {
  @apply rounded-[40px] border border-foreground/10 bg-foreground/[0.02] backdrop-blur-sm shadow-[0_20px_80px_rgba(0,0,0,0.16)];
}

.article-prose :deep(h2) {
  @apply text-3xl md:text-4xl font-black tracking-tight text-foreground mt-16 mb-6;
}

.article-prose :deep(h3) {
  @apply text-2xl font-bold tracking-tight text-foreground mt-12 mb-4;
}

.article-prose :deep(p) {
  @apply text-foreground/70 leading-8 font-medium;
}

.article-prose :deep(strong) {
  @apply text-foreground font-bold;
}

.article-prose :deep(ul),
.article-prose :deep(ol) {
  @apply text-foreground/70;
}

.article-prose :deep(li) {
  @apply my-3;
}

.article-prose :deep(blockquote) {
  @apply rounded-r-[28px] border-l-4 border-primary bg-primary/5 px-8 py-6 text-foreground/75 italic;
}

.article-prose :deep(table) {
  @apply w-full border-collapse;
}

.article-prose :deep(thead tr) {
  @apply border-b border-foreground/10;
}

.article-prose :deep(th) {
  @apply py-4 pr-6 text-left text-[10px] font-bold uppercase tracking-widest text-foreground/40;
}

.article-prose :deep(td) {
  @apply py-4 pr-6 align-top text-foreground/65 border-b border-foreground/5;
}

.article-prose :deep(hr) {
  @apply border-foreground/10 my-14;
}
</style>
