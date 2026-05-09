<script setup lang="ts">
interface SectionLink {
  id: string
  title: string
}

const props = defineProps<{
  badge: string
  title: string
  description: string
  lastUpdated: string
  sections: SectionLink[]
}>()
</script>

<template>
  <div class="relative min-h-screen">
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-16 relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <div class="max-w-4xl">
        <span class="badge-gradient mb-8">{{ props.badge }}</span>
        <h1 class="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-[0.94] text-foreground text-balance">
          {{ props.title }}
        </h1>
        <p class="text-lg md:text-xl text-foreground/55 font-medium leading-relaxed max-w-3xl">
          {{ props.description }}
        </p>
        <div class="mt-8 inline-flex items-center gap-3 rounded-full border border-foreground/10 bg-foreground/[0.03] px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-foreground/45">
          Last updated
          <span class="text-foreground/75">{{ props.lastUpdated }}</span>
        </div>
      </div>
    </section>

    <div class="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-[260px_minmax(0,1fr)] gap-12 lg:gap-16">
      <aside class="hidden lg:block">
        <div class="sticky top-32 rounded-[28px] border border-foreground/10 bg-foreground/[0.02] p-4 backdrop-blur-sm">
          <div class="text-[10px] font-black uppercase tracking-[0.22em] text-foreground/35 px-3 py-2">On this page</div>
          <a
            v-for="item in props.sections"
            :key="item.id"
            :href="`#${item.id}`"
            class="block px-3 py-3 rounded-2xl text-sm font-semibold text-foreground/55 hover:text-foreground hover:bg-foreground/[0.03] transition-colors"
          >
            {{ item.title }}
          </a>
        </div>
      </aside>

      <main class="rounded-[40px] border border-foreground/10 bg-foreground/[0.02] backdrop-blur-sm shadow-[0_20px_80px_rgba(0,0,0,0.12)] p-8 md:p-10 lg:p-12">
        <div class="legal-prose prose dark:prose-invert prose-primary prose-lg max-w-none">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.legal-prose :deep(h2) {
  @apply text-3xl md:text-4xl font-black tracking-tight text-foreground mt-16 mb-6;
}

.legal-prose :deep(h3) {
  @apply text-xl md:text-2xl font-bold tracking-tight text-foreground mt-10 mb-4;
}

.legal-prose :deep(p) {
  @apply text-foreground/70 leading-8 font-medium;
}

.legal-prose :deep(ul),
.legal-prose :deep(ol) {
  @apply text-foreground/70;
}

.legal-prose :deep(li) {
  @apply my-3;
}

.legal-prose :deep(strong) {
  @apply text-foreground font-bold;
}

.legal-prose :deep(blockquote) {
  @apply rounded-r-[28px] border-l-4 border-primary bg-primary/5 px-8 py-6 text-foreground/75 italic;
}
</style>
