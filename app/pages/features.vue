<script setup lang="ts">
import { ArrowRight, BarChart3, Bot, CalendarDays, CheckCircle2, CreditCard, FileText, Globe2, Languages, LayoutDashboard, Lock, MessageCircle, MessageSquare, ShieldCheck, Sparkles, Target } from 'lucide-vue-next'

useSeoMeta({
  title: 'Features | ReplySuite AI Chatbot Tools',
  description: 'ReplySuite features for trained AI replies, website chat, WhatsApp, Instagram comment replies, Instagram comment-to-DM, appointments, bookings, Google Calendar, and MTN/Airtel mobile checkout attached to real customer actions.',
  ogTitle: 'ReplySuite Features',
  ogDescription: 'Train once. Reply everywhere. Book appointments. Manage bookings. Get paid.',
  ogUrl: 'https://replysuite.app/features',
  twitterCard: 'summary_large_image',
  twitterTitle: 'ReplySuite Features',
  twitterDescription: 'AI chatbot features built for real business conversations and actions.',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://replysuite.app/features' }]
})

definePageMeta({ layout: 'default' })

const featureGroups = [
  {
    label: 'Train',
    title: 'Ground answers in your business content',
    desc: 'Upload or connect the knowledge your assistant should trust: website pages, PDFs, FAQs, policies, menus, service descriptions, and custom text.',
    icon: FileText,
    items: ['Website URL training', 'PDF and document uploads', 'FAQ and policy text', 'Language and tone guidance'],
  },
  {
    label: 'Reply',
    title: 'Answer customer questions across channels',
    desc: 'Start with the website widget, then expand into WhatsApp, Instagram comment replies, and Instagram comment-to-DM while keeping the same trained assistant context.',
    icon: MessageCircle,
    items: ['Website chatbot widget', 'WhatsApp automation', 'Instagram comment replies', 'Instagram comment-to-DM', 'Lead capture and staff handoff'],
  },
  {
    label: 'Act',
    title: 'Turn conversations into appointments and bookings',
    desc: 'Let the assistant collect structured details, create trackable booking records, and keep staff in control of approval, calendar availability, and follow-up.',
    icon: Sparkles,
    items: ['Google Calendar connection', 'Appointment service setup', 'Staff and availability rules', 'Status timelines for review'],
  },
]

const features = [
  { title: 'Trained AI assistant', desc: 'Replies use your real business content instead of generic guesses.', icon: Bot },
  { title: 'Website widget', desc: 'Deploy the assistant on approved domains with a simple embed flow.', icon: Globe2 },
  { title: 'WhatsApp ready', desc: 'Expand support to a high-value customer messaging channel.', icon: MessageCircle },
  { title: 'Instagram comment replies', desc: 'Reply publicly to matching Instagram comments with short, safe responses.', icon: MessageSquare },
  { title: 'Instagram comment-to-DM', desc: 'Follow up privately when a comment needs a more helpful DM conversation.', icon: MessageCircle },
  { title: 'Appointments', desc: 'Collect service, staff, time, contact, notes, and deposit intent.', icon: CalendarDays },
  { title: 'Google Calendar bookings', desc: 'Use connected calendars for reservations, events, and appointment availability.', icon: CalendarDays },
  { title: 'MTN/Airtel mobile checkout', desc: 'Request payment only for existing appointment or booking deposits.', icon: CreditCard },
  { title: 'Conversation memory', desc: 'Keep context connected to the customer conversation and session.', icon: Target },
  { title: 'Usage analytics', desc: 'Monitor replies, activity, plan limits, and customer automation performance.', icon: BarChart3 },
  { title: 'Multilingual support', desc: 'Support English, Kinyarwanda, Swahili, Kirundi, Luganda, Arabic, and more.', icon: Languages },
  { title: 'Safer controls', desc: 'Control training, channel setup, domains, and tool access from the dashboard.', icon: Lock },
  { title: 'Review dashboard', desc: 'Review appointments, bookings, payments, and conversations before follow-up.', icon: LayoutDashboard },
]

const paymentRules = [
  'No standalone payment workflow',
  'No automated invoice generation',
  'Amount is derived server-side',
  'Target ownership is verified',
  'Duplicate paid payments are blocked',
]
</script>

<template>
  <div class="features-compact relative overflow-x-hidden">
    <section class="relative mx-auto max-w-[72rem] px-4 py-10 text-center sm:px-6 md:py-12">
      <div class="pointer-events-none absolute inset-x-0 top-8 mx-auto h-56 w-[58%] rounded-full bg-primary/[0.08] blur-[110px]" />
      <span class="badge-gradient mb-4">Features</span>
      <h1 class="relative mx-auto max-w-4xl text-3xl font-extrabold leading-[1.02] tracking-[-0.045em] text-foreground md:text-4xl lg:text-[3.15rem]">
        Everything needed to reply, book, sell, and review from one calm dashboard.
      </h1>
      <p class="relative mx-auto mt-4 max-w-3xl text-sm font-semibold leading-6 text-foreground/60 md:text-[0.95rem]">
        ReplySuite combines trained AI replies with practical business tools. Your assistant can answer questions, request appointments, manage bookings, and trigger verified MTN/Airtel mobile checkout.
      </p>
      <div class="relative mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
        <NuxtLink to="/register" class="btn-gradient inline-flex items-center justify-center gap-2 rounded-[0.78rem] px-5 py-3 text-sm font-bold">
          Start free
          <ArrowRight class="h-4 w-4" />
        </NuxtLink>
        <NuxtLink to="/product" class="inline-flex items-center justify-center rounded-[0.78rem] border border-foreground/10 bg-foreground/[0.02] px-5 py-3 text-sm font-bold text-foreground/70 transition hover:border-primary/25 hover:bg-foreground/[0.05] hover:text-foreground">
          See product flow
        </NuxtLink>
      </div>
    </section>

    <section class="mx-auto max-w-[72rem] px-4 pb-10 sm:px-6 md:pb-12">
      <div class="grid gap-4 lg:grid-cols-3">
        <article v-for="group in featureGroups" :key="group.label" class="rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 backdrop-blur-xl md:p-6">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-[0.7rem] bg-primary/10 text-primary">
              <component :is="group.icon" class="h-4 w-4" />
            </div>
            <span class="rounded-[0.6rem] border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">{{ group.label }}</span>
          </div>
          <h2 class="text-lg font-bold tracking-tight text-foreground">{{ group.title }}</h2>
          <p class="mt-2 text-sm font-medium leading-6 text-foreground/55">{{ group.desc }}</p>
          <div class="mt-4 space-y-2">
            <div v-for="item in group.items" :key="item" class="flex items-center gap-2.5 rounded-[0.72rem] border border-foreground/10 bg-background/45 px-3 py-2.5 text-xs font-bold text-foreground/60">
              <CheckCircle2 class="h-4 w-4 shrink-0 text-primary" />
              {{ item }}
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="mx-auto max-w-[72rem] border-t border-foreground/5 px-4 py-10 sm:px-6 md:py-12">
      <div class="mx-auto mb-6 max-w-3xl text-center md:mb-8">
        <span class="badge-gradient mb-3">Capability map</span>
        <h2 class="text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">A practical feature set for live businesses.</h2>
        <p class="mt-3 text-sm font-semibold leading-6 text-foreground/55">The product stays focused: conversations, training, connected channels, appointments, bookings, Google Calendar, and contextual payment checkout.</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article v-for="feat in features" :key="feat.title" class="group rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 backdrop-blur-xl transition hover:border-primary/25 hover:bg-background-card/60">
          <div class="mb-4 flex h-9 w-9 items-center justify-center rounded-[0.7rem] bg-primary/10 text-primary transition group-hover:scale-105">
            <component :is="feat.icon" class="h-4 w-4" />
          </div>
          <h3 class="text-base font-bold tracking-tight text-foreground">{{ feat.title }}</h3>
          <p class="mt-2 text-sm font-medium leading-6 text-foreground/55">{{ feat.desc }}</p>
        </article>
      </div>
    </section>

    <section class="mx-auto max-w-[72rem] border-t border-foreground/5 px-4 py-10 sm:px-6 md:py-12">
      <div class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <span class="badge-gradient mb-3">Payments without risk drift</span>
          <h2 class="text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">MTN/Airtel mobile payment is checkout, not an invoice bot.</h2>
          <p class="mt-3 max-w-2xl text-sm font-semibold leading-6 text-foreground/55">
            Payment requests attach to existing appointment or booking deposits. The server verifies the target, amount, ownership, and duplicate state before a mobile payment prompt is created.
          </p>
          <NuxtLink to="/pricing" class="mt-5 inline-flex items-center justify-center gap-2 rounded-[0.78rem] border border-foreground/10 bg-foreground/[0.02] px-5 py-3 text-sm font-bold text-foreground/70 transition hover:border-primary/25 hover:bg-foreground/[0.05] hover:text-foreground">
            View pricing
            <ArrowRight class="h-4 w-4" />
          </NuxtLink>
        </div>
        <div class="rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 backdrop-blur-xl md:p-6">
          <div class="mb-4 flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-[0.7rem] bg-primary/10 text-primary">
              <ShieldCheck class="h-4 w-4" />
            </div>
            <div>
              <p class="text-sm font-bold text-foreground">Payment guardrails</p>
              <p class="text-[11px] font-medium text-foreground/45">Designed for real customer operations</p>
            </div>
          </div>
          <div class="grid gap-3">
            <div v-for="rule in paymentRules" :key="rule" class="flex items-center gap-2.5 rounded-[0.72rem] border border-foreground/10 bg-background/45 p-3 text-sm font-bold text-foreground/65">
              <CheckCircle2 class="h-4 w-4 shrink-0 text-emerald-500" />
              {{ rule }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[64rem] px-4 py-10 text-center sm:px-6 md:py-12">
      <div class="relative overflow-hidden rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 backdrop-blur-xl md:p-6">
        <div class="absolute inset-x-0 -top-20 mx-auto h-56 w-56 rounded-full bg-primary/15 blur-[90px]" />
        <h2 class="relative z-10 text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">Build your first assistant, then add actions when ready.</h2>
        <p class="relative z-10 mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-foreground/55">Start with trained replies on your website. Expand into appointments, bookings, WhatsApp, Instagram, and MTN/Airtel mobile checkout as your business needs grow.</p>
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
