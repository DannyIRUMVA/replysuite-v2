<script setup lang="ts">
import { ArrowLeft, CreditCard, ShieldCheck, Sparkles } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
useHead({ title: 'Selling | ReplySuite' })

const sellingPlan = [
  'Qualify buyer intent from website chat, WhatsApp, and Instagram conversations.',
  'Recommend the next safe step using assistant training and business rules.',
  'Collect MTN/Airtel mobile payment only when checkout details are confirmed server-side.',
]
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5 pb-20 pt-3">
    <NuxtLink to="/dashboard/business" class="dashboard-action-label inline-flex items-center gap-1.5 text-foreground/45 transition hover:text-primary">
      <ArrowLeft class="h-3.5 w-3.5" />
      Back to business
    </NuxtLink>

    <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="dashboard-eyebrow text-primary/80">Business selling</p>
          <h1 class="dashboard-section-title mt-2">Selling workspace</h1>
          <p class="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/65">This workspace will help assistants move qualified customers toward safe selling steps without adding invoices or invoice-first workflows.</p>
        </div>
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15">
          <CreditCard class="h-5 w-5" />
        </div>
      </div>
    </section>

    <section class="grid gap-3 md:grid-cols-3">
      <article v-for="item in sellingPlan" :key="item" class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4">
        <Sparkles class="h-4 w-4 text-primary" />
        <p class="mt-3 text-sm leading-relaxed text-foreground/65">{{ item }}</p>
      </article>
    </section>

    <section class="rounded-[0.39rem] border border-primary/15 bg-primary/5 p-4">
      <div class="flex items-start gap-3">
        <ShieldCheck class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p class="text-sm font-bold text-foreground">Planned workspace</p>
          <p class="mt-1 text-sm leading-relaxed text-foreground/65">Selling is listed as a directory item for now. When enabled, it will stay focused on conversation-led sales and MTN/Airtel mobile payment, not invoices.</p>
        </div>
      </div>
    </section>
  </div>
</template>
