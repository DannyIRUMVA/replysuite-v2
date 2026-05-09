<script setup lang="ts">
import type { BlogArticleMeta } from '~~/app/data/blog'

const props = withDefaults(defineProps<{
  article: BlogArticleMeta
  featured?: boolean
  compact?: boolean
}>(), {
  featured: false,
  compact: false
})
</script>

<template>
  <div
    class="relative overflow-hidden border border-foreground/10 bg-[#09090b] isolate"
    :class="props.featured ? 'rounded-[32px] p-8 md:p-10 min-h-[340px] shadow-[0_20px_80px_rgba(0,0,0,0.25)]' : 'aspect-video p-6 rounded-none'"
  >
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.30),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.24),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]"></div>
    <div class="absolute -right-10 top-8 text-[5rem] md:text-[7rem] font-black uppercase tracking-[-0.06em] text-white/[0.04] leading-none select-none">ReplySuite</div>
    <div class="absolute left-6 bottom-6 h-28 w-28 rounded-full bg-primary/20 blur-3xl"></div>
    <div class="absolute right-8 top-10 h-24 w-24 rounded-full bg-blue-400/20 blur-3xl"></div>
    <div class="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>

    <div class="relative z-10 flex h-full flex-col justify-between">
      <div class="flex items-center justify-between gap-4">
        <span class="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-primary backdrop-blur-sm">
          {{ props.article.category }}
        </span>
        <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-white/90 backdrop-blur-sm">
          ReplySuite
        </span>
      </div>

      <div class="mt-8 max-w-[32rem]">
        <div class="mb-4 flex items-center gap-3">
          <span class="h-px w-10 bg-primary/50"></span>
          <div class="text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">
            {{ props.article.badge }}
          </div>
        </div>
        <h3
          class="font-black tracking-tight text-white text-balance"
          :class="props.featured ? 'text-3xl md:text-[2.7rem] leading-[0.95]' : 'text-xl leading-tight line-clamp-3'"
        >
          {{ props.article.title }}
        </h3>
      </div>

      <div class="mt-8 flex items-end justify-between gap-6">
        <p class="max-w-[20rem] text-sm font-medium leading-relaxed text-white/65" :class="props.compact ? 'line-clamp-2' : 'line-clamp-3'">
          {{ props.article.excerpt }}
        </p>
        <div class="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right backdrop-blur-sm">
          <div class="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Read</div>
          <div class="text-sm font-bold text-white">{{ props.article.readTime }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
