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
  <div class="legal-compact relative min-h-screen overflow-x-hidden">
    <section class="relative mx-auto max-w-[72rem] overflow-hidden px-4 py-10 sm:px-6 md:py-12">
      <div class="absolute inset-x-0 top-8 mx-auto h-56 w-[58%] rounded-full bg-primary/[0.08] blur-[110px] -z-10"></div>
      <div class="max-w-3xl">
        <span class="badge-gradient mb-4">{{ props.badge }}</span>
        <h1 class="text-3xl font-extrabold leading-[1.02] tracking-[-0.045em] text-foreground text-balance md:text-4xl lg:text-[3.15rem]">
          {{ props.title }}
        </h1>
        <p class="mt-4 max-w-3xl text-sm font-semibold leading-6 text-foreground/60 md:text-[0.95rem]">
          {{ props.description }}
        </p>
        <div class="mt-5 inline-flex items-center gap-2.5 rounded-[0.7rem] border border-foreground/10 bg-foreground/[0.03] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-foreground/45">
          Last updated
          <span class="text-foreground/75">{{ props.lastUpdated }}</span>
        </div>
      </div>
    </section>

    <div class="mx-auto grid max-w-[72rem] gap-6 px-4 py-10 sm:px-6 md:py-12 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside class="hidden lg:block">
        <div class="sticky top-28 rounded-[1rem] border border-foreground/10 bg-background-card/45 p-3 shadow-sm shadow-black/5 backdrop-blur-xl">
          <div class="px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/35">On this page</div>
          <a
            v-for="item in props.sections"
            :key="item.id"
            :href="`#${item.id}`"
            class="block rounded-[0.7rem] px-3 py-2.5 text-sm font-semibold text-foreground/55 transition-colors hover:bg-foreground/[0.03] hover:text-foreground"
          >
            {{ item.title }}
          </a>
        </div>
      </aside>

      <main class="rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 backdrop-blur-xl md:p-6">
        <div class="legal-prose prose dark:prose-invert prose-primary max-w-none">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.legal-prose :deep(h2) {
  @apply mt-10 mb-4 text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl;
}

.legal-prose :deep(h3) {
  @apply mt-8 mb-3 text-lg font-bold tracking-tight text-foreground;
}

.legal-prose :deep(p) {
  @apply text-sm font-medium leading-6 text-foreground/70;
}

.legal-prose :deep(ul),
.legal-prose :deep(ol) {
  @apply text-foreground/70;
}

.legal-prose :deep(li) {
  @apply my-2 text-sm leading-6;
}

.legal-prose :deep(strong) {
  @apply text-foreground font-bold;
}

.legal-prose :deep(blockquote) {
  @apply rounded-r-[0.9rem] border-l-4 border-primary bg-primary/5 px-5 py-4 text-sm italic text-foreground/75;
}
</style>
