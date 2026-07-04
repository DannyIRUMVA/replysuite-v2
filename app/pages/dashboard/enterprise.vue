<script setup lang="ts">
import {
  ArrowRight,
  Bot,
  Cloud,
  Crown,
  Database,
  Image,
  Loader2,
  Lock,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Workflow,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
useHead({ title: 'Enterprise Workspace | ReplySuite' })

const { userId, membership } = useAuth()
const { isEnterprisePlan } = usePlanAccess()
const supabase = useSupabaseClient()
const notify = useNotify()

const isLoading = ref(true)
const assistants = ref<any[]>([])
const selectedAssistantId = ref('')

const selectedAssistant = computed(() => assistants.value.find((assistant) => assistant.id === selectedAssistantId.value) || null)
const toolsConfig = computed(() => selectedAssistant.value?.tools_config || {})
const websiteControl = computed(() => toolsConfig.value?.website_builder_control || {})
const websitePayment = computed(() => toolsConfig.value?.website_payment || {})
const enabledTools = computed(() => Array.isArray(selectedAssistant.value?.enabled_tools) ? selectedAssistant.value.enabled_tools : [])

const websiteBuilderReady = computed(() => Boolean(websiteControl.value?.enabled && websiteControl.value?.webhook_url))
const mediaReady = computed(() => Boolean(websiteControl.value?.enabled))
const paymentReady = computed(() => Boolean(websitePayment.value?.enabled && websitePayment.value?.base_url))
const bookingReady = computed(() => enabledTools.value.includes('appointments'))

const readinessCards = computed(() => [
  {
    title: 'Website builder control',
    desc: 'Sanitized create, update, deploy, preview, and logs jobs can be sent to the private website execution layer.',
    ready: websiteBuilderReady.value,
    icon: Workflow,
    action: selectedAssistant.value ? `/dashboard/agents/tools?id=${selectedAssistant.value.id}` : '/dashboard/agents/tools',
    actionLabel: 'Open tools',
  },
  {
    title: 'WhatsApp image assets',
    desc: 'Customer images can be stored in ReplySuite media storage and forwarded as safe asset URLs for website drafts.',
    ready: mediaReady.value,
    icon: Image,
    action: '/dashboard/integrations/whatsapp',
    actionLabel: 'Open WhatsApp',
  },
  {
    title: 'Website advance payments',
    desc: 'Website jobs can request a confirmed advance before work starts. Payment secrets stay server-side.',
    ready: paymentReady.value,
    icon: WalletCards,
    action: selectedAssistant.value ? `/dashboard/agents/tools?id=${selectedAssistant.value.id}` : '/dashboard/agents/tools',
    actionLabel: 'Review payment',
  },
  {
    title: 'Bookings and deposits',
    desc: 'Google Calendar-backed appointments, rescheduling, cancellation, and contextual Paypack deposits.',
    ready: bookingReady.value,
    icon: MessageCircle,
    action: selectedAssistant.value ? `/dashboard/agents/tools?id=${selectedAssistant.value.id}` : '/dashboard/agents/tools',
    actionLabel: 'Booking tools',
  },
])

const priceRows = [
  { name: 'Simple website', price: '10,000 RWF', note: 'Up to 10 simple static pages.' },
  { name: 'Extra simple page', price: '+1,000 RWF', note: 'Per additional simple page.' },
  { name: 'Dynamic or hard page', price: '2,000 RWF', note: 'Per page when logic or custom structure is needed.' },
  { name: 'Data collection form page', price: '26,000 RWF', note: 'Full form page connected to secure database-backed storage.' },
  { name: 'Database/blog add-on', price: '+50,000 RWF', note: 'For content or structured database features.' },
  { name: 'Payment add-on', price: '+100,000 RWF', note: 'Requires review and handoff.' },
  { name: 'Advanced SEO', price: '+26,000 RWF', note: 'Simple SEO remains included.' },
]

const fetchAssistants = async () => {
  if (!userId.value) return
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('chatbots')
      .select('id, name, default_language, enabled_tools, tools_config, created_at')
      .eq('user_id', userId.value)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    assistants.value = data || []
    if (!selectedAssistantId.value && assistants.value.length) selectedAssistantId.value = assistants.value[0].id
  } catch (err: any) {
    console.error('Failed to load enterprise assistants:', err)
    notify.error(err?.message || 'Failed to load assistants.')
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchAssistants)
watch(userId, fetchAssistants)
</script>

<template>
  <div class="w-full overflow-x-hidden space-y-5 pb-24">
    <section class="relative overflow-hidden rounded-[1.75rem] border border-primary/15 bg-background-card p-5 shadow-sm md:p-7">
      <div class="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl"></div>
      <div class="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <span class="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
            <Crown class="h-3.5 w-3.5" /> Enterprise workspace
          </span>
          <h1 class="mt-4 max-w-3xl text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">Website builder control for premium service teams.</h1>
          <p class="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-foreground/55">Manage the Enterprise-only website flow: WhatsApp requests, image assets, secure data forms, advance payments, and sanitized website build jobs.</p>
        </div>
        <div class="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 min-w-56">
          <p class="text-[10px] font-black uppercase tracking-widest text-foreground/45">Current plan</p>
          <p class="mt-1 text-lg font-black text-foreground">{{ membership?.plans?.display_name || membership?.plans?.name || 'No active plan' }}</p>
          <p :class="['mt-2 inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest', isEnterprisePlan ? 'bg-primary/10 text-primary' : 'bg-orange-500/10 text-orange-500']">{{ isEnterprisePlan ? 'Enterprise ready' : 'Upgrade required' }}</p>
        </div>
      </div>
    </section>

    <section v-if="!isEnterprisePlan" class="rounded-2xl border border-orange-500/15 bg-orange-500/[0.04] p-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-start gap-3">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500"><Lock class="h-5 w-5" /></div>
          <div>
            <h2 class="text-base font-black text-foreground">Enterprise subscription required</h2>
            <p class="mt-1 max-w-3xl text-sm font-medium leading-relaxed text-foreground/55">Website execution control, media-assisted website builds, booking deposits, and advanced business automation are available on Enterprise.</p>
          </div>
        </div>
        <NuxtLink to="/dashboard/pricing" class="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-5 text-[10px] font-black uppercase tracking-widest text-black transition hover:opacity-90">Upgrade</NuxtLink>
      </div>
    </section>

    <section v-if="isLoading" class="rounded-2xl border border-foreground/10 bg-background-card p-8 text-center">
      <Loader2 class="mx-auto h-7 w-7 animate-spin text-primary" />
      <p class="mt-4 text-[10px] font-black uppercase tracking-widest text-foreground/45">Loading enterprise workspace</p>
    </section>

    <template v-else>
      <section class="grid gap-5 xl:grid-cols-[19rem_1fr]">
        <aside class="rounded-2xl border border-foreground/10 bg-background-card p-5 xl:sticky xl:top-24 xl:self-start">
          <label class="mb-3 block text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Assistant</label>
          <div class="relative">
            <select v-model="selectedAssistantId" class="w-full cursor-pointer appearance-none rounded-xl border border-foreground/10 bg-background px-4 py-3 pr-10 text-sm font-bold text-foreground focus:border-primary/40 focus:outline-none">
              <option v-for="assistant in assistants" :key="assistant.id" :value="assistant.id" class="bg-background">{{ assistant.name }}</option>
            </select>
          </div>
          <div v-if="selectedAssistant" class="mt-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
            <Bot class="h-5 w-5 text-primary" />
            <p class="mt-3 text-sm font-black text-foreground">{{ selectedAssistant.name }}</p>
            <p class="mt-1 text-[10px] font-black uppercase tracking-widest text-foreground/45">{{ selectedAssistant.default_language || 'English' }} assistant</p>
          </div>
          <div v-else class="mt-4 rounded-2xl border border-dashed border-foreground/10 bg-foreground/[0.02] p-4 text-center">
            <p class="text-sm font-bold text-foreground/70">No assistant yet</p>
            <NuxtLink to="/dashboard/agents" class="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black">Create one</NuxtLink>
          </div>
        </aside>

        <main class="space-y-5">
          <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <NuxtLink v-for="card in readinessCards" :key="card.title" :to="card.action" class="group rounded-2xl border border-foreground/10 bg-background-card p-5 transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-foreground/[0.03]">
              <div class="flex items-start justify-between gap-3">
                <div :class="['flex h-11 w-11 items-center justify-center rounded-2xl', card.ready ? 'bg-primary text-black' : 'bg-foreground/5 text-foreground/35']"><component :is="card.icon" class="h-5 w-5" /></div>
                <span :class="['rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest', card.ready ? 'bg-primary/10 text-primary' : 'bg-foreground/5 text-foreground/35']">{{ card.ready ? 'Ready' : 'Setup' }}</span>
              </div>
              <h2 class="mt-4 text-sm font-black text-foreground">{{ card.title }}</h2>
              <p class="mt-2 min-h-16 text-xs font-medium leading-relaxed text-foreground/50">{{ card.desc }}</p>
              <p class="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">{{ card.actionLabel }} <ArrowRight class="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></p>
            </NuxtLink>
          </section>

          <section class="rounded-2xl border border-foreground/10 bg-background-card p-5">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Website builder flow</p>
                <h2 class="mt-1 text-lg font-black tracking-tight text-foreground">WhatsApp images, payments, and website jobs stay separated.</h2>
                <p class="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-foreground/55">Customers send requirements and images on WhatsApp. ReplySuite stores media safely, confirms payment, then sends only sanitized public job data and image URLs to the website builder.</p>
              </div>
              <Cloud class="hidden h-10 w-10 text-primary/70 lg:block" />
            </div>
            <div class="mt-5 grid gap-3 md:grid-cols-4">
              <div class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"><MessageCircle class="h-5 w-5 text-primary" /><p class="mt-3 text-xs font-black uppercase tracking-wider text-foreground">WhatsApp request</p><p class="mt-1 text-xs text-foreground/50">Collect requirements, budget, photos, and page list.</p></div>
              <div class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"><Image class="h-5 w-5 text-cyan-400" /><p class="mt-3 text-xs font-black uppercase tracking-wider text-foreground">Media storage</p><p class="mt-1 text-xs text-foreground/50">Images become safe asset URLs for previews.</p></div>
              <div class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"><WalletCards class="h-5 w-5 text-emerald-400" /><p class="mt-3 text-xs font-black uppercase tracking-wider text-foreground">Advance payment</p><p class="mt-1 text-xs text-foreground/50">50% advance before work starts.</p></div>
              <div class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"><Sparkles class="h-5 w-5 text-violet-400" /><p class="mt-3 text-xs font-black uppercase tracking-wider text-foreground">Preview link</p><p class="mt-1 text-xs text-foreground/50">Return a customer-safe website draft link.</p></div>
            </div>
          </section>

          <section class="rounded-2xl border border-foreground/10 bg-background-card p-5">
            <div class="mb-4 flex items-center justify-between gap-3">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Website pricing guardrails</p>
                <h2 class="mt-1 text-lg font-black tracking-tight text-foreground">Use these prices before payment requests.</h2>
              </div>
              <Database class="h-6 w-6 text-primary/70" />
            </div>
            <div class="overflow-x-auto rounded-2xl border border-foreground/10">
              <table class="min-w-full divide-y divide-foreground/10 text-left">
                <thead class="bg-foreground/[0.03]">
                  <tr>
                    <th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/45">Service</th>
                    <th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/45">Price</th>
                    <th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/45">Notes</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-foreground/10">
                  <tr v-for="row in priceRows" :key="row.name" class="bg-background-card/60">
                    <td class="px-4 py-3 text-sm font-bold text-foreground">{{ row.name }}</td>
                    <td class="whitespace-nowrap px-4 py-3 text-sm font-black text-primary">{{ row.price }}</td>
                    <td class="px-4 py-3 text-xs font-medium leading-relaxed text-foreground/55">{{ row.note }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
              <div class="flex items-start gap-3">
                <ShieldCheck class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p class="text-sm font-medium leading-relaxed text-foreground/60">Payment rule: collect the customer offer or confirm the quote first, request 50% advance before work starts, and collect the remaining 50% before final handover.</p>
              </div>
            </div>
          </section>
        </main>
      </section>
    </template>
  </div>
</template>
