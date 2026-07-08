<script setup lang="ts">
import { CalendarDays, CreditCard, ArrowRight, MessageSquare } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
useHead({ title: 'Business | ReplySuite' })

const businessItems = [
  {
    title: 'Bookings',
    description: 'Review appointment and booking requests created by your assistants across connected channels.',
    href: '/dashboard/appointments',
    icon: CalendarDays,
    status: 'Live',
  },
  {
    title: 'Selling',
    description: 'Prepare assistant-led selling flows with buyer qualification, next steps, and MTN/Airtel mobile payment when checkout is required.',
    href: '/dashboard/business/selling',
    icon: CreditCard,
    status: 'Planned',
  },
]
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-5 pb-20 pt-3">
    <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
      <p class="dashboard-eyebrow text-primary/80">Business directory</p>
      <h1 class="dashboard-section-title mt-2">Manage booking and selling workflows</h1>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/65">Business workspaces keep customer actions organized after conversations turn into bookings, appointments, or checkout-ready sales.</p>
    </section>

    <section class="grid gap-3 md:grid-cols-2">
      <NuxtLink v-for="item in businessItems" :key="item.title" :to="item.href" class="group rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5 transition hover:border-primary/25 hover:bg-primary/[0.03]">
        <div class="flex items-start justify-between gap-4">
          <div class="flex min-w-0 items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15">
              <component :is="item.icon" class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-base font-bold text-foreground">{{ item.title }}</h2>
                <span class="rounded-[0.3rem] border border-foreground/10 bg-background/55 px-1.5 py-0.5 text-[10px] font-bold text-foreground/45">{{ item.status }}</span>
              </div>
              <p class="mt-1 text-sm leading-relaxed text-foreground/55">{{ item.description }}</p>
            </div>
          </div>
          <ArrowRight class="mt-1 h-4 w-4 shrink-0 text-foreground/30 transition group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
      </NuxtLink>
    </section>

    <section class="rounded-[0.39rem] border border-primary/15 bg-primary/5 p-4">
      <div class="flex items-start gap-3">
        <MessageSquare class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p class="text-sm leading-relaxed text-foreground/65">Business actions should always start from a customer conversation and use server-verified appointment, booking, or checkout details.</p>
      </div>
    </section>
  </div>
</template>
