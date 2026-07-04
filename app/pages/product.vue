<script setup lang="ts">
import { ArrowRight, Bot, BrainCircuit, CalendarDays, CheckCircle2, CreditCard, FileText, Globe2, LayoutDashboard, MessageCircle, MessageSquareText, ShieldCheck, Sparkles, UsersRound } from 'lucide-vue-next'

useSeoMeta({
  title: 'Product | ReplySuite AI Command Center',
  description: 'ReplySuite is a calm AI command center for customer conversations. Train once, reply everywhere, book appointments, manage bookings, and get paid with MTN/Airtel mobile checkout.',
  ogTitle: 'ReplySuite Product | AI command center for customer conversations',
  ogDescription: 'Train once. Reply everywhere. Book appointments. Manage bookings. Get paid.',
  ogUrl: 'https://replysuite.app/product',
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://replysuite.app/product' }]
})

definePageMeta({ layout: 'default' })

const heroStats = [
  { label: 'Training', value: 'Website, PDFs, FAQs' },
  { label: 'Channels', value: 'Web, WhatsApp, Instagram' },
  { label: 'Actions', value: 'Appointments + Bookings' },
]

const conversationRail = [
  { label: 'Customer message', title: '“Do you have availability tomorrow?”', icon: MessageCircle, tone: 'text-sky-500 bg-sky-500/10 border-sky-500/15' },
  { label: 'AI reply', title: 'Answers from your trained business content.', icon: BrainCircuit, tone: 'text-primary bg-primary/10 border-primary/15' },
  { label: 'Tool action', title: 'Books an appointment or reservation.', icon: CalendarDays, tone: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/15' },
  { label: 'Checkout', title: 'MTN/Airtel mobile payment attaches to the real record.', icon: CreditCard, tone: 'text-orange-500 bg-orange-500/10 border-orange-500/15' },
]

const pillars = [
  { title: 'Train once', desc: 'Use your website, PDFs, FAQs, and custom text so replies stay grounded in your real business.', icon: FileText },
  { title: 'Reply everywhere', desc: 'Start on your website, then expand customer conversations to WhatsApp and Instagram automation.', icon: Globe2 },
  { title: 'Book appointments', desc: 'Let customers request services, staff, preferred times, and deposits without turning the assistant into an invoice bot.', icon: CalendarDays },
  { title: 'Manage bookings', desc: 'Use Google Calendar-backed bookings for reservations, events, and appointment slots while keeping staff in control.', icon: CalendarDays },
  { title: 'Get paid', desc: 'Use mobile payment as checkout for existing appointment and booking deposits. The server verifies amount and ownership.', icon: CreditCard },
  { title: 'Review calmly', desc: 'Track every action in the dashboard so your team can approve, follow up, and improve the assistant.', icon: LayoutDashboard },
]

const workflow = [
  { step: '01', title: 'Train', desc: 'Add the content your assistant should trust.', icon: BrainCircuit },
  { step: '02', title: 'Connect', desc: 'Install the web widget and connect customer channels.', icon: Globe2 },
  { step: '03', title: 'Automate', desc: 'Answer FAQs, collect leads, book times, and request bookings.', icon: Sparkles },
  { step: '04', title: 'Review', desc: 'Approve appointments, manage bookings, and inspect payment status.', icon: CheckCircle2 },
  { step: '05', title: 'Improve', desc: 'Use conversations and training updates to keep replies accurate.', icon: ShieldCheck },
]

const businessFits = [
  'Clinics and service desks',
  'Salons, studios, and coaches',
  'Restaurants, cafés, and shops',
  'Consultants, agencies, and law firms',
  'Schools and real estate offices',
  'WhatsApp and Instagram sellers',
]
</script>

<template>
  <div class="relative overflow-x-hidden">
    <section class="relative mx-auto max-w-7xl px-4 pb-14 pt-20 sm:px-6 md:pb-20 md:pt-24">
      <div class="pointer-events-none absolute inset-x-0 top-8 mx-auto h-72 w-[72%] rounded-full bg-primary/10 blur-[140px]" />
      <div class="relative grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
        <div>
          <span class="badge-gradient mb-5">Product</span>
          <h1 class="max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            A calm AI command center for customer conversations.
          </h1>
          <p class="mt-6 max-w-2xl text-base font-medium leading-relaxed text-foreground/58 md:text-lg">
            Train once. Reply everywhere. Book appointments. Manage bookings. Get paid. ReplySuite turns everyday customer messages into clear, trackable business actions.
          </p>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <NuxtLink to="/register" class="btn-gradient inline-flex h-12 items-center justify-center gap-3 px-6 text-sm">
              Start free
              <ArrowRight class="h-4 w-4" />
            </NuxtLink>
            <NuxtLink to="/features" class="inline-flex h-12 items-center justify-center gap-3 rounded-full border border-foreground/10 px-6 text-sm font-black text-foreground/70 transition hover:border-primary/25 hover:text-foreground">
              Explore features
            </NuxtLink>
          </div>
          <div class="mt-8 grid gap-3 sm:grid-cols-3">
            <div v-for="stat in heroStats" :key="stat.label" class="rounded-2xl border border-foreground/10 bg-background-card/55 p-4 backdrop-blur-xl">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">{{ stat.label }}</p>
              <p class="mt-2 text-sm font-black text-foreground">{{ stat.value }}</p>
            </div>
          </div>
        </div>

        <div class="relative">
          <div class="absolute -inset-8 rounded-full bg-primary/10 blur-[100px]" />
          <div class="relative overflow-hidden rounded-[2rem] border border-foreground/10 bg-background-card/70 p-4 shadow-2xl shadow-black/5 backdrop-blur-2xl sm:p-5">
            <div class="rounded-[1.5rem] border border-foreground/10 bg-background/70 p-4 sm:p-5">
              <div class="mb-5 flex items-center justify-between gap-4 border-b border-foreground/10 pb-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Bot class="h-5 w-5" />
                  </div>
                  <div>
                    <p class="text-sm font-black text-foreground">Conversation Rail</p>
                    <p class="text-xs font-medium text-foreground/45">Message → Action → Review</p>
                  </div>
                </div>
                <span class="rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-500">Live-ready</span>
              </div>

              <div class="space-y-3">
                <article v-for="item in conversationRail" :key="item.label" class="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
                  <div class="flex h-10 w-10 items-center justify-center rounded-xl border" :class="item.tone">
                    <component :is="item.icon" class="h-4 w-4" />
                  </div>
                  <div>
                    <p class="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/40">{{ item.label }}</p>
                    <p class="mt-1 text-sm font-bold leading-snug text-foreground/75">{{ item.title }}</p>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl border-t border-foreground/5 px-4 py-14 sm:px-6 md:py-18">
      <div class="mx-auto mb-10 max-w-3xl text-center">
        <span class="badge-gradient mb-4">Command center</span>
        <h2 class="text-3xl font-black tracking-tight text-foreground md:text-5xl">One product loop. Real business outcomes.</h2>
        <p class="mt-4 text-sm font-medium leading-relaxed text-foreground/55 md:text-base">Every feature supports the same flow: train, connect, automate, review, and improve. Payments are checkout for real appointments and booking deposits — not a standalone invoice workflow.</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article v-for="item in pillars" :key="item.title" class="rounded-[1.5rem] border border-foreground/10 bg-background-card/60 p-5 backdrop-blur-xl transition hover:border-primary/25 hover:bg-primary/[0.025]">
          <div class="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <component :is="item.icon" class="h-5 w-5" />
          </div>
          <h3 class="text-lg font-black tracking-tight text-foreground">{{ item.title }}</h3>
          <p class="mt-2 text-sm font-medium leading-relaxed text-foreground/55">{{ item.desc }}</p>
        </article>
      </div>
    </section>

    <section class="mx-auto max-w-7xl border-t border-foreground/5 px-4 py-14 sm:px-6 md:py-18">
      <div class="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div class="lg:sticky lg:top-28">
          <span class="badge-gradient mb-4">Workflow</span>
          <h2 class="text-3xl font-black tracking-tight text-foreground md:text-5xl">Train → Connect → Automate → Review → Improve</h2>
          <p class="mt-4 max-w-xl text-sm font-medium leading-relaxed text-foreground/55 md:text-base">A clean operating model for teams that need AI replies and accountable business actions without a complicated setup.</p>
        </div>
        <div class="grid gap-3">
          <article v-for="item in workflow" :key="item.step" class="grid gap-4 rounded-[1.5rem] border border-foreground/10 bg-background-card/60 p-4 backdrop-blur-xl sm:grid-cols-[auto_1fr] sm:items-center">
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{{ item.step }}</span>
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground/[0.04] text-primary">
                <component :is="item.icon" class="h-5 w-5" />
              </div>
            </div>
            <div>
              <h3 class="text-base font-black text-foreground">{{ item.title }}</h3>
              <p class="mt-1 text-sm font-medium text-foreground/55">{{ item.desc }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl border-t border-foreground/5 px-4 py-14 sm:px-6 md:py-18">
      <div class="overflow-hidden rounded-[2rem] border border-foreground/10 bg-background-card/70 p-6 backdrop-blur-2xl md:p-8 lg:p-10">
        <div class="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <span class="badge-gradient mb-4">Built for service and commerce teams</span>
            <h2 class="text-3xl font-black tracking-tight text-foreground md:text-5xl">Useful across offices, service businesses, restaurants, and sellers.</h2>
            <p class="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-foreground/55 md:text-base">Appointments support service teams. Bookings support reservations, events, and appointment conversations. MTN/Airtel mobile checkout only appears when there is a real appointment or booking deposit to pay for.</p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div v-for="item in businessFits" :key="item" class="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-background/45 p-4 text-sm font-bold text-foreground/65">
              <UsersRound class="h-4 w-4 shrink-0 text-primary" />
              {{ item }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 md:py-20">
      <div class="relative overflow-hidden rounded-[2rem] border border-foreground/10 bg-foreground/[0.025] p-8 backdrop-blur-xl md:p-12">
        <div class="absolute inset-x-0 -top-20 mx-auto h-56 w-56 rounded-full bg-primary/15 blur-[90px]" />
        <MessageSquareText class="relative z-10 mx-auto mb-5 h-10 w-10 text-primary" />
        <h2 class="relative z-10 text-3xl font-black tracking-tight text-foreground md:text-5xl">Ready to turn messages into managed actions?</h2>
        <p class="relative z-10 mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-foreground/55 md:text-base">Start with trained replies, then add appointments, bookings, Google Calendar, and MTN/Airtel mobile checkout when your team is ready.</p>
        <NuxtLink to="/register" class="btn-gradient relative z-10 mt-7 inline-flex h-12 items-center justify-center gap-3 px-7 text-sm">
          Start free
          <ArrowRight class="h-4 w-4" />
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  * {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
