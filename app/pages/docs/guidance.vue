<script setup lang="ts">
import { BarChart3, Bot, CheckCircle2, FileText, Globe2, MessageCircle, Settings2, ShieldCheck, UploadCloud } from 'lucide-vue-next'

useSeoMeta({
  title: 'Guidance Docs | ReplySuite',
  description: 'Step-by-step ReplySuite guidance for creating chatbots, training knowledge, installing the website widget, connecting WhatsApp, and reviewing conversations.',
  ogTitle: 'ReplySuite Guidance Docs',
  ogDescription: 'Learn how to set up, train, deploy, and improve your ReplySuite AI assistant.',
  ogUrl: 'https://replysuite.app/docs/guidance',
  twitterCard: 'summary_large_image',
})

useHead({ link: [{ rel: 'canonical', href: 'https://replysuite.app/docs/guidance' }] })

definePageMeta({ layout: 'default' })

const setupSteps = [
  { title: 'Create an account', desc: 'Sign up, verify your email, and complete company details so your assistant can represent the right brand.' },
  { title: 'Create a chatbot', desc: 'Name the assistant, choose the default language, and set the first approved website domain.' },
  { title: 'Train knowledge', desc: 'Add your website, PDFs, FAQs, or custom text so replies are grounded in your business content.' },
  { title: 'Test and connect', desc: 'Use the dashboard tester, then install the website widget or connect WhatsApp Business.' },
]

const trainingSources = [
  { title: 'Website URL', desc: 'Best for public product, pricing, FAQ, and contact pages.', icon: Globe2 },
  { title: 'Text / FAQ', desc: 'Best for precise answers, policies, tone rules, and common support scripts.', icon: FileText },
  { title: 'PDF file', desc: 'Best for menus, brochures, guides, manuals, and documentation.', icon: UploadCloud },
]

const guidanceSections = [
  {
    id: 'website-widget',
    title: 'Website widget',
    icon: Globe2,
    points: [
      'Open Dashboard → Integrations → Website.',
      'Choose the chatbot you want to publish.',
      'Add the allowed domain where the widget will run.',
      'Copy the embed script and place it before the closing body tag.',
      'Send a test message and confirm the conversation appears in Dashboard → Conversations.',
    ],
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Business',
    icon: MessageCircle,
    points: [
      'Open Dashboard → Integrations → WhatsApp.',
      'Connect or configure your WhatsApp Business phone number.',
      'Assign the phone number to a trained chatbot.',
      'Make sure the account status is active or deployed.',
      'Send a live WhatsApp test message and verify it appears in conversations.',
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics and conversations',
    icon: BarChart3,
    points: [
      'Use Dashboard → Conversations to review the latest website and WhatsApp chats.',
      'Use Dashboard → Analytics to compare all chatbots or filter by one chatbot/channel.',
      'Review plan usage so reply and training limits do not block customer support.',
      'Improve training content when analytics show repeated unanswered questions.',
    ],
  },
]
</script>

<template>
  <div class="relative overflow-hidden">
    <section class="mx-auto max-w-7xl px-6 pb-12 pt-24 md:pt-28">
      <div class="absolute left-1/2 top-12 h-72 w-[70%] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px] -z-10"></div>
      <NuxtLink to="/docs" class="mb-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground/45 transition hover:text-primary">
        ← Back to docs
      </NuxtLink>
      <div class="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.45fr)] lg:items-end">
        <div>
          <span class="badge-gradient mb-6">Guidance</span>
          <h1 class="text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">Launch your ReplySuite assistant step by step.</h1>
          <p class="mt-6 max-w-2xl text-base font-medium leading-relaxed text-foreground/55 md:text-lg">
            Use this page as a setup checklist for training, deploying, and improving your AI customer support assistant.
          </p>
        </div>
        <div class="rounded-[28px] border border-primary/15 bg-primary/10 p-6">
          <ShieldCheck class="mb-4 h-7 w-7 text-primary" />
          <p class="text-sm font-bold leading-relaxed text-foreground/70">Tip: train first, test second, deploy third. Better source content creates better customer replies.</p>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-6 py-14" id="quick-start">
      <div class="mb-8 flex items-end justify-between gap-6">
        <div>
          <span class="badge-gradient mb-5">Quick start</span>
          <h2 class="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Recommended setup flow</h2>
        </div>
      </div>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article v-for="(step, index) in setupSteps" :key="step.title" class="guide-card rounded-[28px] p-6">
          <div class="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-sm font-black text-primary ring-1 ring-primary/15">{{ index + 1 }}</div>
          <h3 class="text-lg font-black text-foreground">{{ step.title }}</h3>
          <p class="mt-3 text-sm font-medium leading-relaxed text-foreground/55">{{ step.desc }}</p>
        </article>
      </div>
    </section>

    <section id="training" class="mx-auto max-w-7xl border-t border-foreground/5 px-6 py-16 md:py-20">
      <div class="grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)] lg:items-start">
        <div>
          <span class="badge-gradient mb-5">Training</span>
          <h2 class="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">Add the content your assistant should know.</h2>
          <p class="mt-5 text-sm font-medium leading-relaxed text-foreground/55 md:text-base">
            Training lets ReplySuite answer from your real business information instead of generic model memory.
          </p>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <article v-for="source in trainingSources" :key="source.title" class="guide-card rounded-[28px] p-6">
            <component :is="source.icon" class="mb-5 h-7 w-7 text-primary" />
            <h3 class="text-lg font-black text-foreground">{{ source.title }}</h3>
            <p class="mt-3 text-sm font-medium leading-relaxed text-foreground/55">{{ source.desc }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-6 py-16 md:py-20">
      <div class="grid gap-6 lg:grid-cols-3">
        <article v-for="section in guidanceSections" :id="section.id" :key="section.id" class="guide-card rounded-[30px] p-6 md:p-7">
          <div class="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <component :is="section.icon" class="h-6 w-6" />
          </div>
          <h2 class="text-2xl font-black tracking-tight text-foreground">{{ section.title }}</h2>
          <ul class="mt-6 space-y-4">
            <li v-for="point in section.points" :key="point" class="flex gap-3 text-sm font-medium leading-relaxed text-foreground/55">
              <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{{ point }}</span>
            </li>
          </ul>
        </article>
      </div>
    </section>

    <section class="mx-auto max-w-5xl px-6 py-16 text-center md:py-20">
      <div class="guide-card rounded-[36px] p-8 md:p-12">
        <Bot class="mx-auto mb-5 h-10 w-10 text-primary" />
        <h2 class="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">Ready for developers?</h2>
        <p class="mx-auto mt-5 max-w-2xl text-sm font-medium leading-relaxed text-foreground/55 md:text-base">Use the API page for embed scripts, endpoint behavior, webhook flow, and security notes.</p>
        <NuxtLink to="/docs/api" class="mt-7 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-7 py-3.5 text-sm font-black text-primary transition hover:bg-primary/15">
          API reference
          <Settings2 class="h-4 w-4" />
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.guide-card {
  @apply border border-foreground/10 bg-background-card/65 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.45)] backdrop-blur-2xl;
  background-image:
    linear-gradient(135deg, rgb(var(--surface) / 0.68), rgb(var(--surface) / 0.24)),
    radial-gradient(circle at 12% 0%, rgb(var(--primary) / 0.09), transparent 34%);
}
</style>
