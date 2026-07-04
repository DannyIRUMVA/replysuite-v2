<script setup lang="ts">
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  ExternalLink,
  Globe2,
  Image,
  Loader2,
  Lock,
  MessageCircle,
  RefreshCcw,
  ServerCog,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
useHead({ title: 'Website Builder Tools | ReplySuite' })

const route = useRoute()
const { userId } = useAuth()
const { isEnterprisePlan } = usePlanAccess()
const supabase = useSupabaseClient()
const notify = useNotify()

const isLoading = ref(true)
const isCheckingHermes = ref(false)
const assistants = ref<any[]>([])
const sessions = ref<any[]>([])
const selectedAssistantId = ref('')
const hermesStatus = ref<any>(null)

const selectedAssistant = computed(() => assistants.value.find((assistant) => assistant.id === selectedAssistantId.value) || null)
const toolsConfig = computed(() => selectedAssistant.value?.tools_config || {})
const websiteControl = computed(() => toolsConfig.value?.website_builder_control || {})
const websitePayment = computed(() => toolsConfig.value?.website_payment || {})
const enabledTools = computed(() => Array.isArray(selectedAssistant.value?.enabled_tools) ? selectedAssistant.value.enabled_tools : [])

const builderConfigured = computed(() => Boolean(websiteControl.value?.enabled && websiteControl.value?.webhook_url))
const paymentConfigured = computed(() => Boolean(websitePayment.value?.enabled && websitePayment.value?.base_url))
const bookingsEnabled = computed(() => enabledTools.value.includes('appointments'))
const mediaConfigured = computed(() => Boolean(builderConfigured.value))
const hermesConnected = computed(() => Boolean(hermesStatus.value?.hermes?.connected))
const hermesCapabilities = computed(() => hermesStatus.value?.hermes?.capabilities?.length
  ? hermesStatus.value.hermes.capabilities
  : ['website.create', 'website.update', 'website.deploy', 'website.preview', 'website.logs']
)

const formatDate = (value?: string) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

const asArray = (value: unknown) => Array.isArray(value) ? value : []
const textIncludesWebsiteIntent = (text: string) => /website|web site|urubuga|site|page|form|design|logo|hosting|domain|database|payment|checkout|advance|preview|build/i.test(text)

const selectedSessions = computed(() => sessions.value.filter((session) => session.chatbot_id === selectedAssistantId.value))

const websiteRequests = computed(() => selectedSessions.value
  .map((session) => {
    const messages = asArray(session.chat_messages).sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
    const text = messages.map((message: any) => message.content || '').join('\n')
    const metadata = session.metadata || {}
    const assets = asArray(metadata.media_assets)
    const hasWebsiteIntent = textIncludesWebsiteIntent(text) || assets.length > 0 || metadata.last_media_asset
    if (!hasWebsiteIntent) return null

    const customerMessages = messages.filter((message: any) => message.role !== 'assistant')
    const assistantMessages = messages.filter((message: any) => message.role === 'assistant')
    const lastCustomerMessage = customerMessages.at(-1)?.content || messages.at(-1)?.content || 'Website request captured from conversation.'
    const lastAssistantMessage = assistantMessages.at(-1)?.content || ''
    const quoteMentioned = /\b\d{2,3}[,.]?\d{3}\b|rwf|advance|deposit|payment|paypack/i.test(text)
    const previewMentioned = /preview|draft|link|deployed|url/i.test(text)
    const status = previewMentioned ? 'Preview discussed' : quoteMentioned ? 'Quote/payment stage' : assets.length ? 'Assets received' : 'Requirements stage'

    return {
      key: session.id,
      createdAt: session.created_at,
      status,
      assetsCount: assets.length,
      messageCount: messages.length,
      summary: String(lastCustomerMessage).replace(/\s+/g, ' ').slice(0, 180),
      lastAssistantNote: String(lastAssistantMessage).replace(/\s+/g, ' ').slice(0, 140),
    }
  })
  .filter(Boolean)
  .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
)

const persistedJobs = computed(() => selectedSessions.value
  .flatMap((session) => {
    const metadata = session.metadata || {}
    const candidates = [metadata.hermes_jobs, metadata.website_jobs, metadata.website_builder_jobs, metadata.jobs].flatMap(asArray)
    return candidates.map((job: any) => ({
      type: job.type || job.action || 'website job',
      status: job.status || 'tracked',
      project: job.project_ref || job.project || job.business_name || 'Website project',
      createdAt: job.created_at || job.createdAt || session.created_at,
      previewUrl: job.preview_url || job.previewUrl || job.url || null,
    }))
  })
  .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
)

const botWorkRows = computed(() => assistants.value.map((assistant) => {
  const config = assistant.tools_config || {}
  const control = config.website_builder_control || {}
  const payment = config.website_payment || {}
  const assistantSessions = sessions.value.filter((session) => session.chatbot_id === assistant.id)
  const requestCount = assistantSessions.filter((session) => {
    const text = asArray(session.chat_messages).map((message: any) => message.content || '').join('\n')
    const metadata = session.metadata || {}
    return textIncludesWebsiteIntent(text) || asArray(metadata.media_assets).length > 0
  }).length
  const mediaCount = assistantSessions.reduce((total, session) => total + asArray(session.metadata?.media_assets).length, 0)

  return {
    name: assistant.name,
    language: assistant.default_language || 'English',
    builderReady: Boolean(control.enabled && control.webhook_url),
    paymentReady: Boolean(payment.enabled && payment.base_url),
    bookingsReady: Array.isArray(assistant.enabled_tools) && assistant.enabled_tools.includes('appointments'),
    requestCount,
    mediaCount,
    isSelected: assistant.id === selectedAssistantId.value,
  }
}))

const readinessCards = computed(() => [
  { title: 'Website builder control', ready: builderConfigured.value, icon: ServerCog, desc: 'Create, update, deploy, preview, and logs jobs are configured for this assistant.' },
  { title: 'Connected Hermes agent', ready: hermesConnected.value, icon: Sparkles, desc: hermesConnected.value ? 'Health check passed for the connected website execution agent.' : 'Configured agent is not yet reporting healthy status.' },
  { title: 'Website advance payments', ready: paymentConfigured.value, icon: WalletCards, desc: 'Website quote advance payment can be requested after a confirmed quote.' },
  { title: 'WhatsApp media assets', ready: mediaConfigured.value, icon: Image, desc: 'Customer images can be stored and sent as safe asset URLs for drafts.' },
])

const getAuthHeaders = async () => {
  const { data: sessionData } = await (supabase as any).auth.getSession()
  const accessToken = sessionData?.session?.access_token
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
}

const fetchHermesStatus = async () => {
  if (!selectedAssistantId.value) {
    hermesStatus.value = null
    return
  }
  isCheckingHermes.value = true
  try {
    hermesStatus.value = await $fetch('/api/hermes/status', {
      query: { chatbotId: selectedAssistantId.value },
      headers: await getAuthHeaders(),
    })
  } catch (err) {
    console.error('Failed to load Hermes status:', err)
    hermesStatus.value = null
  } finally {
    isCheckingHermes.value = false
  }
}

const fetchData = async () => {
  if (!userId.value) return
  isLoading.value = true
  try {
    const { data: bots, error: botsError } = await supabase
      .from('chatbots')
      .select('id, name, default_language, enabled_tools, tools_config, created_at')
      .eq('user_id', userId.value)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (botsError) throw botsError

    assistants.value = bots || []
    const requestedAssistantId = typeof route.query.chatbotId === 'string' ? route.query.chatbotId : typeof route.query.id === 'string' ? route.query.id : ''
    if (requestedAssistantId && assistants.value.some((assistant) => assistant.id === requestedAssistantId)) selectedAssistantId.value = requestedAssistantId
    else if (!selectedAssistantId.value && assistants.value.length) selectedAssistantId.value = assistants.value[0].id

    const botIds = assistants.value.map((assistant) => assistant.id)
    if (botIds.length) {
      const { data: sessionRows, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('id, chatbot_id, created_at, metadata, chat_messages(content, role, created_at)')
        .in('chatbot_id', botIds)
        .order('created_at', { ascending: false })
        .limit(80)
      if (sessionsError) throw sessionsError
      sessions.value = sessionRows || []
    } else {
      sessions.value = []
    }

    await fetchHermesStatus()
  } catch (err: any) {
    console.error('Failed to load website builder tools:', err)
    notify.error(err?.message || 'Failed to load website builder tools.')
  } finally {
    isLoading.value = false
  }
}

watch(selectedAssistantId, () => { void fetchHermesStatus() })
onMounted(fetchData)
</script>

<template>
  <div class="w-full overflow-x-hidden space-y-5 pb-24">
    <NuxtLink to="/dashboard/agents/tools" class="dashboard-back-link group">
      <ArrowLeft class="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
      Back to Tools
    </NuxtLink>

    <section class="relative overflow-hidden rounded-[1.75rem] border border-primary/15 bg-background-card p-5 shadow-sm md:p-7">
      <div class="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl"></div>
      <div class="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <span class="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
            <Globe2 class="h-3.5 w-3.5" /> Enterprise website builder tool
          </span>
          <h1 class="mt-4 max-w-3xl text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">Track requested websites, build jobs, bots, and the connected Hermes agent.</h1>
          <p class="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-foreground/55">This page lives under Assistant Tools and is gated to Enterprise subscriptions. It gives operators one place to watch website requests, readiness, media, payments, and private website execution status.</p>
        </div>
        <button type="button" class="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-5 text-[10px] font-black uppercase tracking-widest text-primary transition hover:bg-primary/15" :disabled="isCheckingHermes" @click="fetchHermesStatus">
          <Loader2 v-if="isCheckingHermes" class="h-4 w-4 animate-spin" />
          <RefreshCcw v-else class="h-4 w-4" />
          Check Hermes
        </button>
      </div>
    </section>

    <section v-if="!isEnterprisePlan" class="rounded-2xl border border-orange-500/15 bg-orange-500/[0.04] p-5">
      <div class="flex items-start gap-3">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500"><Lock class="h-5 w-5" /></div>
        <div>
          <h2 class="text-base font-black text-foreground">Enterprise subscription required</h2>
          <p class="mt-1 max-w-3xl text-sm font-medium leading-relaxed text-foreground/55">Website build operations, Hermes agent tracking, and website payment controls are only available on Enterprise.</p>
        </div>
      </div>
    </section>

    <section v-if="isLoading" class="rounded-2xl border border-foreground/10 bg-background-card p-8 text-center">
      <Loader2 class="mx-auto h-7 w-7 animate-spin text-primary" />
      <p class="mt-4 text-[10px] font-black uppercase tracking-widest text-foreground/45">Loading website builder tools</p>
    </section>

    <template v-else>
      <section class="grid gap-5 xl:grid-cols-[19rem_1fr]">
        <aside class="rounded-2xl border border-foreground/10 bg-background-card p-5 xl:sticky xl:top-24 xl:self-start">
          <label class="mb-3 block text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Website assistant</label>
          <div class="relative">
            <select v-model="selectedAssistantId" class="w-full cursor-pointer appearance-none rounded-xl border border-foreground/10 bg-background px-4 py-3 pr-10 text-sm font-bold text-foreground focus:border-primary/40 focus:outline-none">
              <option v-for="assistant in assistants" :key="assistant.id" :value="assistant.id" class="bg-background">{{ assistant.name }}</option>
            </select>
            <ChevronDown class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
          </div>

          <div v-if="selectedAssistant" class="mt-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
            <Bot class="h-5 w-5 text-primary" />
            <p class="mt-3 text-sm font-black text-foreground">{{ selectedAssistant.name }}</p>
            <p class="mt-1 text-[10px] font-black uppercase tracking-widest text-foreground/45">{{ selectedAssistant.default_language || 'English' }} assistant</p>
            <div class="mt-4 grid grid-cols-2 gap-2">
              <div class="rounded-xl bg-foreground/5 p-3"><p class="text-lg font-black text-foreground">{{ websiteRequests.length }}</p><p class="text-[9px] font-black uppercase tracking-widest text-foreground/40">Requests</p></div>
              <div class="rounded-xl bg-foreground/5 p-3"><p class="text-lg font-black text-foreground">{{ persistedJobs.length }}</p><p class="text-[9px] font-black uppercase tracking-widest text-foreground/40">Jobs</p></div>
            </div>
          </div>

          <div class="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
            <p class="text-[10px] font-black uppercase tracking-widest text-primary">Hermes agent</p>
            <p class="mt-2 text-sm font-black text-foreground">{{ hermesConnected ? 'Connected' : builderConfigured ? 'Configured, health pending' : 'Not configured' }}</p>
            <p class="mt-1 text-xs font-medium leading-relaxed text-foreground/50">{{ hermesStatus?.hermes?.worker || 'No worker name reported yet' }}</p>
          </div>
        </aside>

        <main class="space-y-5">
          <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div v-for="card in readinessCards" :key="card.title" class="rounded-2xl border border-foreground/10 bg-background-card p-5">
              <div class="flex items-start justify-between gap-3">
                <div :class="['flex h-11 w-11 items-center justify-center rounded-2xl', card.ready ? 'bg-primary text-black' : 'bg-foreground/5 text-foreground/35']"><component :is="card.icon" class="h-5 w-5" /></div>
                <span :class="['rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest', card.ready ? 'bg-primary/10 text-primary' : 'bg-foreground/5 text-foreground/35']">{{ card.ready ? 'Ready' : 'Setup' }}</span>
              </div>
              <h2 class="mt-4 text-sm font-black text-foreground">{{ card.title }}</h2>
              <p class="mt-2 min-h-16 text-xs font-medium leading-relaxed text-foreground/50">{{ card.desc }}</p>
            </div>
          </section>

          <section class="rounded-2xl border border-foreground/10 bg-background-card p-5">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Connected Hermes agent</p>
                <h2 class="mt-1 text-lg font-black tracking-tight text-foreground">Private website execution status</h2>
                <p class="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-foreground/55">This shows whether the selected assistant has a configured website execution agent and whether its health endpoint is responding.</p>
              </div>
              <span :class="['inline-flex h-9 items-center rounded-full px-3 text-[10px] font-black uppercase tracking-widest', hermesConnected ? 'bg-primary/10 text-primary' : 'bg-orange-500/10 text-orange-500']">{{ hermesConnected ? 'Connected' : 'Needs attention' }}</span>
            </div>
            <div class="mt-5 grid gap-3 lg:grid-cols-3">
              <div class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-foreground/40">Base URL</p>
                <p class="mt-2 break-all text-xs font-bold text-foreground/70">{{ hermesStatus?.hermes?.baseUrl || websiteControl?.base_url || 'Not set' }}</p>
              </div>
              <div class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-foreground/40">Jobs endpoint</p>
                <p class="mt-2 break-all text-xs font-bold text-foreground/70">{{ hermesStatus?.hermes?.jobsUrl || websiteControl?.jobs_url || 'Not set' }}</p>
              </div>
              <div class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-foreground/40">Webhook</p>
                <p class="mt-2 text-xs font-bold text-foreground/70">{{ hermesStatus?.hermes?.webhookConfigured || websiteControl?.webhook_url ? 'Configured' : 'Not configured' }}</p>
              </div>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <span v-for="capability in hermesCapabilities" :key="capability" class="rounded-full border border-primary/15 bg-primary/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary">{{ capability }}</span>
            </div>
          </section>

          <section class="rounded-2xl border border-foreground/10 bg-background-card p-5">
            <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Website requests</p>
                <h2 class="mt-1 text-lg font-black tracking-tight text-foreground">Requested websites from conversations</h2>
                <p class="mt-1 text-sm font-medium text-foreground/50">Derived from recent conversations and media uploads until dedicated project tables are added.</p>
              </div>
              <span class="text-[10px] font-black uppercase tracking-widest text-foreground/40">{{ websiteRequests.length }} found</span>
            </div>

            <div v-if="websiteRequests.length" class="space-y-3">
              <div v-for="(request, index) in websiteRequests.slice(0, 12)" :key="request.key" class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
                <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="text-sm font-black text-foreground">Website request #{{ index + 1 }}</p>
                      <span class="rounded-full bg-primary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-primary">{{ request.status }}</span>
                    </div>
                    <p class="mt-2 text-sm font-medium leading-relaxed text-foreground/60">{{ request.summary }}</p>
                    <p v-if="request.lastAssistantNote" class="mt-2 text-xs font-medium leading-relaxed text-foreground/40">Latest assistant note: {{ request.lastAssistantNote }}</p>
                  </div>
                  <div class="flex shrink-0 gap-2 text-center">
                    <div class="rounded-xl bg-foreground/5 px-3 py-2"><p class="text-sm font-black text-foreground">{{ request.assetsCount }}</p><p class="text-[9px] font-black uppercase tracking-widest text-foreground/35">Assets</p></div>
                    <div class="rounded-xl bg-foreground/5 px-3 py-2"><p class="text-sm font-black text-foreground">{{ request.messageCount }}</p><p class="text-[9px] font-black uppercase tracking-widest text-foreground/35">Msgs</p></div>
                  </div>
                </div>
                <p class="mt-3 text-[10px] font-black uppercase tracking-widest text-foreground/35">{{ formatDate(request.createdAt) }}</p>
              </div>
            </div>
            <div v-else class="rounded-2xl border border-dashed border-foreground/10 bg-foreground/[0.02] p-8 text-center">
              <MessageCircle class="mx-auto h-10 w-10 text-foreground/20" />
              <h3 class="mt-4 text-base font-black text-foreground">No website requests detected yet</h3>
              <p class="mx-auto mt-2 max-w-lg text-sm font-medium leading-relaxed text-foreground/50">When customers ask for websites or send website images through connected channels, those requests will appear here.</p>
            </div>
          </section>

          <section class="rounded-2xl border border-foreground/10 bg-background-card p-5">
            <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Website jobs</p>
                <h2 class="mt-1 text-lg font-black tracking-tight text-foreground">Build, update, preview, and deploy tracking</h2>
                <p class="mt-1 text-sm font-medium text-foreground/50">This will show persisted job history once ReplySuite-side Hermes project/job tables are added.</p>
              </div>
              <span class="text-[10px] font-black uppercase tracking-widest text-foreground/40">{{ persistedJobs.length }} tracked</span>
            </div>

            <div v-if="persistedJobs.length" class="overflow-x-auto rounded-2xl border border-foreground/10">
              <table class="min-w-full divide-y divide-foreground/10 text-left">
                <thead class="bg-foreground/[0.03]">
                  <tr>
                    <th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/45">Project</th>
                    <th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/45">Type</th>
                    <th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/45">Status</th>
                    <th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/45">Preview</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-foreground/10">
                  <tr v-for="job in persistedJobs" :key="`${job.project}-${job.createdAt}-${job.type}`" class="bg-background-card/60">
                    <td class="px-4 py-3 text-sm font-bold text-foreground">{{ job.project }}</td>
                    <td class="px-4 py-3 text-xs font-black uppercase tracking-wider text-foreground/50">{{ job.type }}</td>
                    <td class="px-4 py-3"><span class="rounded-full bg-primary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-primary">{{ job.status }}</span></td>
                    <td class="px-4 py-3">
                      <a v-if="job.previewUrl" :href="job.previewUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-xs font-black text-primary">Open <ExternalLink class="h-3 w-3" /></a>
                      <span v-else class="text-xs font-medium text-foreground/35">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="rounded-2xl border border-dashed border-foreground/10 bg-foreground/[0.02] p-8 text-center">
              <CircleDashed class="mx-auto h-10 w-10 text-foreground/20" />
              <h3 class="mt-4 text-base font-black text-foreground">No persisted website jobs yet</h3>
              <p class="mx-auto mt-2 max-w-xl text-sm font-medium leading-relaxed text-foreground/50">The current control route can send jobs, but durable project/job/event tables are still needed for complete history. Until then, this page shows configuration, conversations, and detected requests.</p>
            </div>
          </section>

          <section class="rounded-2xl border border-foreground/10 bg-background-card p-5">
            <div class="mb-4">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Bot working status</p>
              <h2 class="mt-1 text-lg font-black tracking-tight text-foreground">All assistants and website builder readiness</h2>
            </div>
            <div class="grid gap-3 lg:grid-cols-2">
              <div v-for="bot in botWorkRows" :key="bot.name" :class="['rounded-2xl border p-4', bot.isSelected ? 'border-primary/25 bg-primary/[0.04]' : 'border-foreground/10 bg-foreground/[0.02]']">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-black text-foreground">{{ bot.name }}</p>
                    <p class="mt-1 text-[10px] font-black uppercase tracking-widest text-foreground/40">{{ bot.language }} assistant</p>
                  </div>
                  <Bot class="h-5 w-5 text-primary" />
                </div>
                <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div class="rounded-xl bg-foreground/5 p-3"><component :is="bot.builderReady ? CheckCircle2 : Clock3" :class="['h-4 w-4', bot.builderReady ? 'text-primary' : 'text-foreground/30']" /><p class="mt-2 text-[9px] font-black uppercase tracking-widest text-foreground/40">Builder</p></div>
                  <div class="rounded-xl bg-foreground/5 p-3"><component :is="bot.paymentReady ? CheckCircle2 : Clock3" :class="['h-4 w-4', bot.paymentReady ? 'text-primary' : 'text-foreground/30']" /><p class="mt-2 text-[9px] font-black uppercase tracking-widest text-foreground/40">Payment</p></div>
                  <div class="rounded-xl bg-foreground/5 p-3"><p class="text-sm font-black text-foreground">{{ bot.requestCount }}</p><p class="mt-1 text-[9px] font-black uppercase tracking-widest text-foreground/40">Requests</p></div>
                  <div class="rounded-xl bg-foreground/5 p-3"><p class="text-sm font-black text-foreground">{{ bot.mediaCount }}</p><p class="mt-1 text-[9px] font-black uppercase tracking-widest text-foreground/40">Assets</p></div>
                </div>
              </div>
            </div>
          </section>

          <section class="rounded-2xl border border-primary/15 bg-primary/[0.04] p-5">
            <div class="flex items-start gap-3">
              <ShieldCheck class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p class="text-sm font-medium leading-relaxed text-foreground/60">Website work remains Enterprise-only. Customers should hear simple terms like website draft, preview link, advance payment, and final handover; internal execution details stay inside this operator page.</p>
            </div>
          </section>
        </main>
      </section>
    </template>
  </div>
</template>
