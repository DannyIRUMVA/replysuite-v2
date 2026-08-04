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
  <div class="product-compact relative overflow-x-hidden">
    <section class="relative mx-auto max-w-[72rem] px-4 py-10 sm:px-6 md:py-12">
      <div class="pointer-events-none absolute inset-x-0 top-8 mx-auto h-56 w-[58%] rounded-full bg-primary/[0.08] blur-[110px]" />
      <div class="relative grid items-center gap-6 lg:grid-cols-[0.92fr_0.78fr] lg:gap-8">
        <div>
          <span class="badge-gradient mb-4">Product</span>
          <h1 class="max-w-3xl text-3xl font-extrabold leading-[1.02] tracking-[-0.045em] text-foreground md:text-4xl lg:text-[3.15rem]">
            A calm AI command center for customer conversations.
          </h1>
          <p class="mt-4 max-w-xl text-sm font-semibold leading-6 text-foreground/60 md:text-[0.95rem]">
            Train once. Reply everywhere. Book appointments. Manage bookings. Get paid. ReplySuite turns everyday customer messages into clear, trackable business actions.
          </p>
          <div class="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <NuxtLink to="/register" class="btn-gradient inline-flex items-center justify-center gap-2 rounded-[0.78rem] px-5 py-3 text-sm font-bold">
              Start free
              <ArrowRight class="h-4 w-4" />
            </NuxtLink>
            <NuxtLink to="/features" class="inline-flex items-center justify-center gap-2 rounded-[0.78rem] border border-foreground/10 bg-foreground/[0.02] px-5 py-3 text-sm font-bold text-foreground/70 transition hover:border-primary/25 hover:bg-foreground/[0.05] hover:text-foreground">
              Explore features
            </NuxtLink>
          </div>
          <div class="mt-6 grid gap-2.5 sm:grid-cols-3">
            <div v-for="stat in heroStats" :key="stat.label" class="rounded-[0.82rem] border border-foreground/10 bg-background-card/45 p-3.5 shadow-sm shadow-black/5 backdrop-blur-xl">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">{{ stat.label }}</p>
              <p class="mt-1 text-sm font-bold text-foreground/80">{{ stat.value }}</p>
            </div>
          </div>
        </div>

        <div class="relative">
          <div class="absolute -inset-6 rounded-full bg-primary/[0.08] blur-[90px]" />
          <div class="relative overflow-hidden rounded-[1rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5 backdrop-blur-xl sm:p-5">
            <div class="rounded-[0.9rem] border border-foreground/10 bg-background/60 p-4">
              <div class="mb-4 flex items-center justify-between gap-3 border-b border-foreground/10 pb-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 items-center justify-center rounded-[0.7rem] bg-primary/10 text-primary">
                    <Bot class="h-4 w-4" />
                  </div>
                  <div>
                    <p class="text-sm font-bold text-foreground">Conversation Rail</p>
                    <p class="text-[11px] font-medium text-foreground/45">Message → Action → Review</p>
                  </div>
                </div>
                <span class="rounded-[0.6rem] border border-emerald-500/15 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-500">Live-ready</span>
              </div>

              <div class="space-y-2.5">
                <article v-for="item in conversationRail" :key="item.label" class="grid grid-cols-[auto_1fr] gap-3 rounded-[0.82rem] border border-foreground/10 bg-foreground/[0.02] p-3.5">
                  <div class="flex h-9 w-9 items-center justify-center rounded-[0.7rem] border" :class="item.tone">
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

    <section class="mx-auto max-w-[72rem] border-t border-foreground/5 px-4 py-10 sm:px-6 md:py-12">
      <div class="mx-auto mb-6 max-w-3xl text-center md:mb-8">
        <span class="badge-gradient mb-3">Command center</span>
        <h2 class="text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">One product loop. Real business outcomes.</h2>
        <p class="mt-3 text-sm font-semibold leading-6 text-foreground/55">Every feature supports the same flow: train, connect, automate, review, and improve. Payments are checkout for real appointments and booking deposits — not a standalone invoice workflow.</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article v-for="item in pillars" :key="item.title" class="rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 backdrop-blur-xl transition hover:border-primary/25 hover:bg-background-card/60">
          <div class="mb-4 flex h-9 w-9 items-center justify-center rounded-[0.7rem] bg-primary/10 text-primary">
            <component :is="item.icon" class="h-4 w-4" />
          </div>
          <h3 class="text-base font-bold tracking-tight text-foreground">{{ item.title }}</h3>
          <p class="mt-2 text-sm font-medium leading-6 text-foreground/55">{{ item.desc }}</p>
        </article>
      </div>
    </section>

    <section class="mx-auto max-w-[72rem] border-t border-foreground/5 px-4 py-10 sm:px-6 md:py-12">
      <div class="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div class="lg:sticky lg:top-24">
          <span class="badge-gradient mb-3">Workflow</span>
          <h2 class="text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">Train → Connect → Automate → Review → Improve</h2>
          <p class="mt-3 max-w-xl text-sm font-semibold leading-6 text-foreground/55">A clean operating model for teams that need AI replies and accountable business actions without a complicated setup.</p>
        </div>
        <div class="grid gap-2.5">
          <article v-for="item in workflow" :key="item.step" class="grid gap-3 rounded-[1rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5 backdrop-blur-xl sm:grid-cols-[auto_1fr] sm:items-center">
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{{ item.step }}</span>
              <div class="flex h-9 w-9 items-center justify-center rounded-[0.7rem] bg-foreground/[0.04] text-primary">
                <component :is="item.icon" class="h-4 w-4" />
              </div>
            </div>
            <div>
              <h3 class="text-base font-bold text-foreground">{{ item.title }}</h3>
              <p class="mt-1 text-sm font-medium text-foreground/55">{{ item.desc }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[72rem] border-t border-foreground/5 px-4 py-10 sm:px-6 md:py-12">
      <div class="overflow-hidden rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 backdrop-blur-xl md:p-6">
        <div class="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <span class="badge-gradient mb-3">Built for service and commerce teams</span>
            <h2 class="text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">Useful across offices, service businesses, restaurants, and sellers.</h2>
            <p class="mt-3 max-w-2xl text-sm font-semibold leading-6 text-foreground/55">Appointments support service teams. Bookings support reservations, events, and appointment conversations. MTN/Airtel mobile checkout only appears when there is a real appointment or booking deposit to pay for.</p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div v-for="item in businessFits" :key="item" class="flex items-center gap-2.5 rounded-[0.78rem] border border-foreground/10 bg-background/45 p-3 text-sm font-bold text-foreground/65">
              <UsersRound class="h-4 w-4 shrink-0 text-primary" />
              {{ item }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[64rem] px-4 py-10 text-center sm:px-6 md:py-12">
      <div class="relative overflow-hidden rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 backdrop-blur-xl md:p-6">
        <div class="absolute inset-x-0 -top-20 mx-auto h-56 w-56 rounded-full bg-primary/15 blur-[90px]" />
        <MessageSquareText class="relative z-10 mx-auto mb-4 h-8 w-8 text-primary" />
        <h2 class="relative z-10 text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">Ready to turn messages into managed actions?</h2>
        <p class="relative z-10 mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-foreground/55">Start with trained replies, then add appointments, bookings, Google Calendar, and MTN/Airtel mobile checkout when your team is ready.</p>
        <NuxtLink to="/register" class="btn-gradient relative z-10 mt-5 inline-flex items-center justify-center gap-2 rounded-[0.78rem] px-5 py-3 text-sm font-bold">
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
