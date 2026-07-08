<script setup lang="ts">
import { ArrowRight, GraduationCap, MessageCircle } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
useHead({ title: 'School | ReplySuite' })
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-5 pb-20 pt-3">
    <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
      <p class="dashboard-eyebrow text-primary/80">School directory</p>
      <h1 class="dashboard-section-title mt-2">AI learning support</h1>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/65">School workspaces will connect trained assistants to learning conversations, starting with an AI tutor for student revision.</p>
    </section>

    <NuxtLink to="/dashboard/school/ai-tutor" class="group block rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5 transition hover:border-primary/25 hover:bg-primary/[0.03]">
      <div class="flex items-start justify-between gap-4">
        <div class="flex min-w-0 items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15">
            <GraduationCap class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-base font-bold text-foreground">AI Tutor</h2>
              <span class="rounded-[0.3rem] border border-foreground/10 bg-background/55 px-1.5 py-0.5 text-[10px] font-bold text-foreground/45">Planned</span>
            </div>
            <p class="mt-1 text-sm leading-relaxed text-foreground/55">Connect a WhatsApp learning assistant that asks revision questions, explains answers, and helps students practice at home.</p>
          </div>
        </div>
        <ArrowRight class="mt-1 h-4 w-4 shrink-0 text-foreground/30 transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </NuxtLink>

    <section class="rounded-[0.39rem] border border-primary/15 bg-primary/5 p-4">
      <div class="flex items-start gap-3">
        <MessageCircle class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p class="text-sm leading-relaxed text-foreground/65">The first school workflow will focus on WhatsApp-based revision with a trained AI assistant.</p>
      </div>
    </section>
  </div>
</template>
