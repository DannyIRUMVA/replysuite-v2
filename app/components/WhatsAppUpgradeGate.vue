<script setup lang="ts">
import { ArrowLeft, Lock, MessageCircle, Sparkles } from 'lucide-vue-next'

withDefaults(defineProps<{
  title?: string
  description?: string
  backTo?: string
  backLabel?: string
}>(), {
  title: 'Upgrade to unlock WhatsApp',
  description: 'WhatsApp automation is not available on the Starter plan. Upgrade your plan to connect your business number and unlock AI replies on WhatsApp.',
  backTo: '/dashboard',
  backLabel: 'Back',
})
</script>

<template>
  <div class="w-full max-w-4xl mx-auto pb-20 space-y-6">
    <NuxtLink :to="backTo" class="inline-flex items-center gap-2 text-sm text-foreground/55 hover:text-foreground transition-colors">
      <ArrowLeft class="w-4 h-4" />
      {{ backLabel }}
    </NuxtLink>

    <div class="glass-card p-8 md:p-12 border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background relative overflow-hidden">
      <div class="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl"></div>

      <div class="relative z-10 max-w-2xl">
        <div class="flex items-center gap-4 mb-6">
          <div class="w-16 h-16 rounded-3xl bg-primary/12 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
            <MessageCircle class="w-8 h-8" />
          </div>
          <div class="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            <Lock class="w-3.5 h-3.5" />
            Locked on Starter
          </div>
        </div>

        <h1 class="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-4">{{ title }}</h1>
        <p class="text-sm md:text-base leading-relaxed text-foreground/60 mb-8 max-w-xl">{{ description }}</p>

        <div class="flex flex-col sm:flex-row gap-3">
          <NuxtLink to="/dashboard/pricing" class="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-black hover:brightness-95 transition-all shadow-lg shadow-primary/10">
            <Sparkles class="w-4 h-4" />
            Upgrade plan
          </NuxtLink>
          <NuxtLink :to="backTo" class="inline-flex items-center justify-center rounded-2xl border border-foreground/10 px-6 py-4 text-sm font-bold text-foreground/65 hover:text-foreground hover:border-foreground/20 transition-all">
            {{ backLabel }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
