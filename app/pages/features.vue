<script setup lang="ts">
import { ArrowRight, BarChart3, Bot, CalendarDays, CheckCircle2, CreditCard, FileText, Globe2, Languages, LayoutDashboard, Lock, MessageCircle, MessageSquare, ShieldCheck, ShoppingBag, Sparkles, Target } from 'lucide-vue-next'

useSeoMeta({
  title: 'Features | ReplySuite AI Chatbot Tools',
  description: 'ReplySuite features for trained AI replies, website chat, WhatsApp and Instagram automation, appointments, orders, and Paypack checkout attached to real customer actions.',
  ogTitle: 'ReplySuite Features',
  ogDescription: 'Train once. Reply everywhere. Book appointments. Take orders. Get paid.',
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
    desc: 'Start with the website widget, then expand into WhatsApp and Instagram automation while keeping the same trained assistant context.',
    icon: MessageCircle,
    items: ['Website chatbot widget', 'WhatsApp automation', 'Instagram comment and DM workflows', 'Lead capture and staff handoff'],
  },
  {
    label: 'Act',
    title: 'Turn conversations into appointments and orders',
    desc: 'Let the assistant collect structured details, create trackable records, and keep staff in control of approval, fulfillment, and follow-up.',
    icon: Sparkles,
    items: ['Appointment service setup', 'Staff and availability rules', 'Catalog and order creation', 'Status timelines for review'],
  },
]

const features = [
  { title: 'Trained AI assistant', desc: 'Replies use your real business content instead of generic guesses.', icon: Bot },
  { title: 'Website widget', desc: 'Deploy the assistant on approved domains with a simple embed flow.', icon: Globe2 },
  { title: 'WhatsApp ready', desc: 'Expand support to a high-value customer messaging channel.', icon: MessageCircle },
  { title: 'Instagram automation', desc: 'Support comment replies, comment-to-DM, and polling fallback workflows.', icon: MessageSquare },
  { title: 'Appointments', desc: 'Collect service, staff, time, contact, notes, and deposit intent.', icon: CalendarDays },
  { title: 'Orders', desc: 'Use catalog items to create structured customer orders from chat.', icon: ShoppingBag },
  { title: 'Paypack checkout', desc: 'Request payment only for existing orders or appointment deposits.', icon: CreditCard },
  { title: 'Conversation memory', desc: 'Keep context connected to the customer conversation and session.', icon: Target },
  { title: 'Usage analytics', desc: 'Monitor replies, activity, plan limits, and customer automation performance.', icon: BarChart3 },
  { title: 'Multilingual support', desc: 'Support English, Kinyarwanda, Swahili, Kirundi, Luganda, Arabic, and more.', icon: Languages },
  { title: 'Safer controls', desc: 'Control training, channel setup, domains, and tool access from the dashboard.', icon: Lock },
  { title: 'Review dashboard', desc: 'Review appointments, orders, payments, and conversations before follow-up.', icon: LayoutDashboard },
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
  <div class="relative overflow-x-hidden">
    <section class="relative mx-auto max-w-7xl px-4 pb-12 pt-20 text-center sm:px-6 md:pb-16 md:pt-24">
      <div class="pointer-events-none absolute inset-x-0 top-10 mx-auto h-72 w-[72%] rounded-full bg-primary/10 blur-[140px]" />
      <span class="badge-gradient mb-5">Features</span>
      <h1 class="relative mx-auto max-w-5xl text-4xl font-black leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
        Everything needed to reply, book, sell, and review from one calm dashboard.
      </h1>
      <p class="relative mx-auto mt-6 max-w-3xl text-base font-medium leading-relaxed text-foreground/58 md:text-lg">
        ReplySuite combines trained AI replies with practical business tools. Your assistant can answer questions, request appointments, build orders, and trigger verified Paypack checkout.
      </p>
      <div class="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <NuxtLink to="/register" class="btn-gradient inline-flex h-12 items-center justify-center gap-3 px-6 text-sm">
          Start free
          <ArrowRight class="h-4 w-4" />
        </NuxtLink>
        <NuxtLink to="/product" class="inline-flex h-12 items-center justify-center rounded-full border border-foreground/10 px-6 text-sm font-black text-foreground/70 transition hover:border-primary/25 hover:text-foreground">
          See product flow
        </NuxtLink>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-4 pb-14 sm:px-6 md:pb-18">
      <div class="grid gap-4 lg:grid-cols-3">
        <article v-for="group in featureGroups" :key="group.label" class="rounded-[1.75rem] border border-foreground/10 bg-background-card/65 p-5 backdrop-blur-2xl md:p-6">
          <div class="mb-5 flex items-center justify-between gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <component :is="group.icon" class="h-6 w-6" />
            </div>
            <span class="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">{{ group.label }}</span>
          </div>
          <h2 class="text-xl font-black tracking-tight text-foreground">{{ group.title }}</h2>
          <p class="mt-3 text-sm font-medium leading-relaxed text-foreground/55">{{ group.desc }}</p>
          <div class="mt-5 space-y-2">
            <div v-for="item in group.items" :key="item" class="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-background/45 px-4 py-3 text-xs font-bold text-foreground/60">
              <CheckCircle2 class="h-4 w-4 shrink-0 text-primary" />
              {{ item }}
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="mx-auto max-w-7xl border-t border-foreground/5 px-4 py-14 sm:px-6 md:py-18">
      <div class="mx-auto mb-10 max-w-3xl text-center">
        <span class="badge-gradient mb-4">Capability map</span>
        <h2 class="text-3xl font-black tracking-tight text-foreground md:text-5xl">A practical feature set for live businesses.</h2>
        <p class="mt-4 text-sm font-medium leading-relaxed text-foreground/55 md:text-base">The product stays focused: conversations, training, connected channels, appointments, orders, and contextual payment checkout.</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article v-for="feat in features" :key="feat.title" class="group rounded-[1.5rem] border border-foreground/10 bg-background-card/55 p-5 backdrop-blur-xl transition hover:border-primary/25 hover:bg-primary/[0.025]">
          <div class="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:scale-105">
            <component :is="feat.icon" class="h-5 w-5" />
          </div>
          <h3 class="text-base font-black tracking-tight text-foreground">{{ feat.title }}</h3>
          <p class="mt-2 text-sm font-medium leading-relaxed text-foreground/55">{{ feat.desc }}</p>
        </article>
      </div>
    </section>

    <section class="mx-auto max-w-7xl border-t border-foreground/5 px-4 py-14 sm:px-6 md:py-18">
      <div class="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <span class="badge-gradient mb-4">Payments without risk drift</span>
          <h2 class="text-3xl font-black tracking-tight text-foreground md:text-5xl">Paypack is checkout, not an invoice bot.</h2>
          <p class="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-foreground/55 md:text-base">
            Payment requests attach to existing appointments or orders. The server verifies the target, amount, ownership, and duplicate state before a Paypack prompt is created.
          </p>
          <NuxtLink to="/pricing" class="mt-7 inline-flex h-12 items-center justify-center gap-3 rounded-full border border-foreground/10 px-6 text-sm font-black text-foreground/70 transition hover:border-primary/25 hover:text-foreground">
            View pricing
            <ArrowRight class="h-4 w-4" />
          </NuxtLink>
        </div>
        <div class="rounded-[2rem] border border-foreground/10 bg-background-card/70 p-5 backdrop-blur-2xl md:p-6">
          <div class="mb-5 flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck class="h-6 w-6" />
            </div>
            <div>
              <p class="text-sm font-black text-foreground">Payment guardrails</p>
              <p class="text-xs font-medium text-foreground/45">Designed for real customer operations</p>
            </div>
          </div>
          <div class="grid gap-3">
            <div v-for="rule in paymentRules" :key="rule" class="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-background/45 p-4 text-sm font-bold text-foreground/65">
              <CheckCircle2 class="h-4 w-4 shrink-0 text-emerald-500" />
              {{ rule }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 md:py-20">
      <div class="relative overflow-hidden rounded-[2rem] border border-foreground/10 bg-foreground/[0.025] p-8 backdrop-blur-xl md:p-12">
        <div class="absolute inset-x-0 -top-20 mx-auto h-56 w-56 rounded-full bg-primary/15 blur-[90px]" />
        <h2 class="relative z-10 text-3xl font-black tracking-tight text-foreground md:text-5xl">Build your first assistant, then add actions when ready.</h2>
        <p class="relative z-10 mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-foreground/55 md:text-base">Start with trained replies on your website. Expand into appointments, orders, WhatsApp, Instagram, and Paypack checkout as your business needs grow.</p>
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
