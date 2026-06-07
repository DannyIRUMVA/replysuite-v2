<script setup lang="ts">
import { AlertTriangle, ArrowRight, CheckCircle2, Code2, Copy, Globe2, KeyRound, Lock, MessageSquare, Server, ShieldCheck, Webhook } from 'lucide-vue-next'

useSeoMeta({
  title: 'API Docs | ReplySuite',
  description: 'ReplySuite API documentation for website embeds, public chatbot config, chat requests, WhatsApp webhooks, and integration security.',
  ogTitle: 'ReplySuite API Docs',
  ogDescription: 'Developer reference for integrating ReplySuite website and WhatsApp chatbot workflows.',
  ogUrl: 'https://replysuite.app/docs/api',
  twitterCard: 'summary_large_image',
})

useHead({ link: [{ rel: 'canonical', href: 'https://replysuite.app/docs/api' }] })

definePageMeta({ layout: 'default' })

const baseUrl = 'https://replysuite.app'
const embedSnippet = `<script src="https://replysuite.app/embed.js" data-chatbot-id="YOUR_CHATBOT_ID" async><\/script>`
const chatRequest = `POST /api/public/chat
Content-Type: application/json

{
  "chatbotId": "YOUR_CHATBOT_ID",
  "message": "What are your opening hours?",
  "sessionId": "optional-existing-session-id",
  "metadata": {
    "pageUrl": "https://example.com/pricing"
  }
}`
const chatResponse = `{
  "reply": "We are open Monday to Friday from 9:00 AM to 5:00 PM.",
  "sessionId": "chat-session-id",
  "sources": []
}`
const configRequest = `GET /api/public/config/YOUR_CHATBOT_ID`
const whatsappWebhook = `POST /api/whatsapp/webhook
X-Hub-Signature-256: sha256=...

{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "changes": [
        {
          "field": "messages",
          "value": {
            "metadata": { "phone_number_id": "..." },
            "messages": [{ "type": "text", "text": { "body": "Hello" } }]
          }
        }
      ]
    }
  ]
}`

const endpoints = [
  { method: 'GET', path: '/api/public/config/:chatbotId', desc: 'Returns public chatbot/widget configuration for approved website usage.' },
  { method: 'POST', path: '/api/public/chat', desc: 'Sends a website chat message to a public chatbot and records the conversation.' },
  { method: 'GET', path: '/api/whatsapp/webhook', desc: 'Meta webhook verification challenge endpoint.' },
  { method: 'POST', path: '/api/whatsapp/webhook', desc: 'Receives WhatsApp Business messages, records inbound messages, and dispatches assistant replies.' },
]

const securityNotes = [
  'Never expose Supabase service-role keys, training worker secrets, or provider API keys in browser code.',
  'Only use public chatbot IDs and the hosted embed script on the frontend.',
  'Restrict website widgets with allowed domains from the dashboard.',
  'Verify WhatsApp webhook signatures with the Meta app secret in production.',
  'Use server-side routes for any privileged integration or custom automation.',
]
</script>

<template>
  <div class="relative overflow-hidden">
    <section class="mx-auto max-w-7xl px-6 pb-12 pt-24 md:pt-28">
      <div class="absolute left-1/2 top-12 h-72 w-[70%] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px] -z-10"></div>
      <NuxtLink to="/docs" class="mb-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground/45 transition hover:text-primary">
        ← Back to docs
      </NuxtLink>
      <div class="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.4fr)] lg:items-end">
        <div>
          <span class="badge-gradient mb-6">API reference</span>
          <h1 class="text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">Integrate ReplySuite into your product and channels.</h1>
          <p class="mt-6 max-w-2xl text-base font-medium leading-relaxed text-foreground/55 md:text-lg">
            Use the hosted widget for browser integrations and server routes for secure automation around chat, config, and WhatsApp webhooks.
          </p>
        </div>
        <div class="api-card rounded-[28px] p-6">
          <Server class="mb-4 h-7 w-7 text-primary" />
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Base URL</p>
          <p class="mt-2 break-all rounded-2xl bg-background/50 px-4 py-3 font-mono text-sm text-foreground/70 ring-1 ring-foreground/10">{{ baseUrl }}</p>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-6 py-14" id="endpoints">
      <div class="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <span class="badge-gradient mb-5">Endpoints</span>
          <h2 class="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Available integration routes</h2>
        </div>
        <p class="max-w-xl text-sm font-medium leading-relaxed text-foreground/50">These are the public-facing routes used by the hosted widget and WhatsApp webhook flow.</p>
      </div>
      <div class="grid gap-3">
        <article v-for="endpoint in endpoints" :key="endpoint.path + endpoint.method" class="api-card grid gap-4 rounded-[24px] p-5 md:grid-cols-[110px_minmax(0,0.8fr)_minmax(0,1fr)] md:items-center">
          <span class="w-fit rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">{{ endpoint.method }}</span>
          <code class="break-all font-mono text-sm font-bold text-foreground">{{ endpoint.path }}</code>
          <p class="text-sm font-medium leading-relaxed text-foreground/55">{{ endpoint.desc }}</p>
        </article>
      </div>
    </section>

    <section class="mx-auto max-w-7xl border-t border-foreground/5 px-6 py-16 md:py-20" id="website-widget">
      <div class="grid gap-8 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)] lg:items-start">
        <div>
          <span class="badge-gradient mb-5">Website widget</span>
          <h2 class="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">Embed your chatbot on an approved domain.</h2>
          <p class="mt-5 text-sm font-medium leading-relaxed text-foreground/55 md:text-base">
            The easiest integration path is the hosted widget script. Configure allowed domains in ReplySuite before installing it on production websites.
          </p>
        </div>
        <div class="api-card rounded-[28px] p-5">
          <div class="mb-4 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 text-sm font-black text-foreground"><Globe2 class="h-5 w-5 text-primary" /> Embed snippet</div>
            <Copy class="h-4 w-4 text-foreground/35" />
          </div>
          <pre class="overflow-x-auto rounded-2xl bg-black/70 p-5 text-sm leading-relaxed text-white"><code>{{ embedSnippet }}</code></pre>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-6 py-16 md:py-20" id="public-chat">
      <div class="grid gap-6 lg:grid-cols-2">
        <article class="api-card rounded-[30px] p-6">
          <div class="mb-5 flex items-center gap-3 text-lg font-black text-foreground"><MessageSquare class="h-6 w-6 text-primary" /> Chat request</div>
          <pre class="overflow-x-auto rounded-2xl bg-black/70 p-5 text-sm leading-relaxed text-white"><code>{{ chatRequest }}</code></pre>
        </article>
        <article class="api-card rounded-[30px] p-6">
          <div class="mb-5 flex items-center gap-3 text-lg font-black text-foreground"><CheckCircle2 class="h-6 w-6 text-primary" /> Chat response</div>
          <pre class="overflow-x-auto rounded-2xl bg-black/70 p-5 text-sm leading-relaxed text-white"><code>{{ chatResponse }}</code></pre>
        </article>
      </div>
    </section>

    <section class="mx-auto max-w-7xl border-t border-foreground/5 px-6 py-16 md:py-20" id="config">
      <div class="api-card rounded-[30px] p-6 md:p-8">
        <div class="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span class="badge-gradient mb-4">Public config</span>
            <h2 class="text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">Load chatbot display settings.</h2>
          </div>
          <KeyRound class="h-8 w-8 text-primary" />
        </div>
        <pre class="overflow-x-auto rounded-2xl bg-black/70 p-5 text-sm leading-relaxed text-white"><code>{{ configRequest }}</code></pre>
        <p class="mt-5 text-sm font-medium leading-relaxed text-foreground/55">Use this route only for public widget configuration. Private automation should use authenticated server-side routes.</p>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-6 py-16 md:py-20" id="whatsapp-webhook">
      <div class="grid gap-8 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)] lg:items-start">
        <div>
          <span class="badge-gradient mb-5">WhatsApp webhook</span>
          <h2 class="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">Receive WhatsApp messages safely.</h2>
          <p class="mt-5 text-sm font-medium leading-relaxed text-foreground/55 md:text-base">
            Meta sends webhook payloads to ReplySuite. The app verifies signatures when configured, records inbound messages first, then generates and sends assistant replies.
          </p>
        </div>
        <div class="api-card rounded-[28px] p-5">
          <div class="mb-4 flex items-center gap-3 text-sm font-black text-foreground"><Webhook class="h-5 w-5 text-primary" /> Example webhook shape</div>
          <pre class="max-h-[460px] overflow-auto rounded-2xl bg-black/70 p-5 text-sm leading-relaxed text-white"><code>{{ whatsappWebhook }}</code></pre>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl border-t border-foreground/5 px-6 py-16 md:py-20" id="security">
      <div class="grid gap-8 lg:grid-cols-[minmax(0,0.5fr)_minmax(0,1fr)]">
        <div>
          <span class="badge-gradient mb-5">Security</span>
          <h2 class="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">Keep secrets on the server.</h2>
          <p class="mt-5 text-sm font-medium leading-relaxed text-foreground/55 md:text-base">ReplySuite public integrations are designed so browser code uses only public chatbot identifiers and hosted scripts.</p>
        </div>
        <div class="grid gap-3">
          <div v-for="note in securityNotes" :key="note" class="api-card flex gap-3 rounded-[22px] p-4 text-sm font-medium leading-relaxed text-foreground/60">
            <Lock class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{{ note }}</span>
          </div>
          <div class="rounded-[22px] border border-amber-400/20 bg-amber-400/10 p-4 text-sm font-bold leading-relaxed text-foreground/70">
            <AlertTriangle class="mr-2 inline h-4 w-4 text-primary" /> If you need a private API key flow, build it as a server-side integration instead of calling secret-bearing APIs from the browser.
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-5xl px-6 py-16 text-center md:py-20">
      <div class="api-card rounded-[36px] p-8 md:p-12">
        <ShieldCheck class="mx-auto mb-5 h-10 w-10 text-primary" />
        <h2 class="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">Need setup guidance too?</h2>
        <p class="mx-auto mt-5 max-w-2xl text-sm font-medium leading-relaxed text-foreground/55 md:text-base">Read the guidance docs for the recommended dashboard workflow before wiring custom integrations.</p>
        <NuxtLink to="/docs/guidance" class="mt-7 inline-flex items-center gap-3 rounded-full bg-primary px-7 py-3.5 text-sm font-black text-black transition hover:brightness-95">
          Open guidance
          <ArrowRight class="h-4 w-4" />
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.api-card {
  @apply border border-foreground/10 bg-background-card/65 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.45)] backdrop-blur-2xl;
  background-image:
    linear-gradient(135deg, rgb(var(--surface) / 0.68), rgb(var(--surface) / 0.24)),
    radial-gradient(circle at 12% 0%, rgb(var(--primary) / 0.09), transparent 34%);
}
</style>
