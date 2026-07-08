<script setup lang="ts">
import { ArrowLeft, BookOpenCheck, CreditCard, GraduationCap, MessageCircle, ShieldCheck } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
useHead({ title: 'AI Tutor | ReplySuite' })

const tutorFlow = [
  { title: 'Connect WhatsApp', text: 'Students revise from the channel they already use.', icon: MessageCircle },
  { title: 'Ask questions', text: 'The assistant quizzes students and explains answers calmly.', icon: BookOpenCheck },
  { title: 'Collect session payment', text: 'Paid revision sessions can use MTN/Airtel mobile payment after the session is confirmed.', icon: CreditCard },
]
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5 pb-20 pt-3">
    <NuxtLink to="/dashboard/school" class="dashboard-action-label inline-flex items-center gap-1.5 text-foreground/45 transition hover:text-primary">
      <ArrowLeft class="h-3.5 w-3.5" />
      Back to school
    </NuxtLink>

    <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="dashboard-eyebrow text-primary/80">School · AI Tutor</p>
          <h1 class="dashboard-section-title mt-2">WhatsApp AI tutor</h1>
          <p class="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/65">AI Tutor will let schools connect a trained assistant to WhatsApp so students can revise at home through guided questions and explanations.</p>
        </div>
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15">
          <GraduationCap class="h-5 w-5" />
        </div>
      </div>
    </section>

    <section class="grid gap-3 md:grid-cols-3">
      <article v-for="item in tutorFlow" :key="item.title" class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4">
        <div class="flex h-9 w-9 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15">
          <component :is="item.icon" class="h-4 w-4" />
        </div>
        <h2 class="mt-3 text-sm font-bold text-foreground">{{ item.title }}</h2>
        <p class="mt-1 text-sm leading-relaxed text-foreground/55">{{ item.text }}</p>
      </article>
    </section>

    <section class="rounded-[0.39rem] border border-primary/15 bg-primary/5 p-4">
      <div class="flex items-start gap-3">
        <ShieldCheck class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p class="text-sm font-bold text-foreground">Planned workspace</p>
          <p class="mt-1 text-sm leading-relaxed text-foreground/65">This directory is ready in the dashboard. The full AI Tutor workflow will come after WhatsApp connection and payment-session rules are finalized.</p>
        </div>
      </div>
    </section>
  </div>
</template>
