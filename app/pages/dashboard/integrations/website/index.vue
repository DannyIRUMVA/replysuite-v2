<script setup lang="ts">
import {
  Check,
  Code2,
  Copy,
  Globe,
  Info,
  Loader2,
  MessageSquare,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  Zap,
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

useHead({
  title: 'Website Integration'
})

const { isVerified, userId, limits, planSlug } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()

const chatbots = ref<any[]>([])
const selectedChatbotId = useState<string>('dashboard-website-selected-bot-id', () => '')
const websiteBotOptions = useState<Array<{ label: string; value: string }>>('dashboard-website-bot-options', () => [])
const isLoading = ref(true)
const isSaving = ref(false)
const copiedType = ref<string | null>(null)
const newDomainInput = ref('')

const connectionForm = ref({
  allowedDomains: [] as string[],
  allowLocalhostTesting: true,
})

const siteOrigin = computed(() => process.client ? window.location.origin : '')
const maxWebsiteDomains = computed(() => limits.value.maxWebsiteDomains || 1)
const currentPlanLabel = computed(() => {
  if (planSlug.value === 'enterprise-ready') return 'Enterprise Ready'
  if (planSlug.value === 'gold') return 'Gold'
  if (planSlug.value === 'silver') return 'Silver'
  return 'Starter'
})

const launcherIconsMap: Record<string, any> = {
  MessageSquare,
  Bot: MessageSquare,
  Sparkles: Zap,
  Zap,
  HelpCircle: Info,
}

const selectedChatbot = computed(() => chatbots.value.find((bot) => bot.id === selectedChatbotId.value) || null)
const domainCount = computed(() => connectionForm.value.allowedDomains.length)
const hasReachedLimit = computed(() => domainCount.value >= maxWebsiteDomains.value)
const isConnectionActive = computed(() => {
  const bot = selectedChatbot.value
  return !!bot?.is_public && connectionForm.value.allowedDomains.length > 0
})
const canDisableLocalhost = computed(() => isConnectionActive.value)
const localhostTestingEnabled = computed({
  get: () => canDisableLocalhost.value ? connectionForm.value.allowLocalhostTesting : true,
  set: (value: boolean) => {
    connectionForm.value.allowLocalhostTesting = canDisableLocalhost.value ? value : true
  }
})

const normalizeDomain = (value: string) => {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return ''
  return trimmed.replace(/^https?:\/\//, '').split('/')[0].replace(/:\d+$/, '')
}

const syncFormFromSelection = () => {
  const bot = selectedChatbot.value
  connectionForm.value.allowedDomains = Array.isArray(bot?.allowed_domains) ? [...bot.allowed_domains] : []
  connectionForm.value.allowLocalhostTesting = bot?.allow_localhost_testing ?? true
}

const copyText = async (text: string, type: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedType.value = type
    notify.success(`${type} copied to clipboard.`)
    setTimeout(() => {
      if (copiedType.value === type) copiedType.value = null
    }, 1800)
  } catch {
    notify.error('Failed to copy content.')
  }
}

const fetchChatbots = async () => {
  if (!userId.value) return

  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('chatbots')
      .select('id, name, is_public, launcher_color, launcher_icon, launcher_style, allowed_domains, primary_color')
      .eq('user_id', userId.value)
      .is('deleted_at', null)
      .order('name')

    if (error) throw error

    chatbots.value = data || []
    websiteBotOptions.value = chatbots.value.map((bot) => ({ label: bot.name || 'Untitled assistant', value: bot.id }))

    if ((!selectedChatbotId.value || !chatbots.value.some((bot) => bot.id === selectedChatbotId.value)) && chatbots.value.length > 0) {
      selectedChatbotId.value = chatbots.value[0].id
    }

    syncFormFromSelection()
  } catch (err) {
    console.error('Error fetching chatbots:', err)
    notify.error('Failed to load your website integrations.')
  } finally {
    isLoading.value = false
  }
}

const addDomain = () => {
  const normalized = normalizeDomain(newDomainInput.value)

  if (!normalized) {
    notify.warn('Enter a valid production domain first.')
    return
  }

  if (normalized === 'localhost' || normalized === '127.0.0.1') {
    notify.warn('Use the localhost testing toggle instead of adding localhost as a production domain.')
    return
  }

  if (connectionForm.value.allowedDomains.includes(normalized)) {
    notify.warn('That domain is already connected to this chatbot.')
    return
  }

  if (hasReachedLimit.value) {
    notify.warn(`${currentPlanLabel.value} allows up to ${maxWebsiteDomains.value} website domain${maxWebsiteDomains.value === 1 ? '' : 's'} per chatbot.`)
    return
  }

  connectionForm.value.allowedDomains.push(normalized)
  newDomainInput.value = ''
}

const removeDomain = (domain: string) => {
  connectionForm.value.allowedDomains = connectionForm.value.allowedDomains.filter((value) => value !== domain)
}

const saveConnection = async () => {
  if (!selectedChatbotId.value || isSaving.value) return

  if (connectionForm.value.allowedDomains.length > maxWebsiteDomains.value) {
    notify.error(`${currentPlanLabel.value} only allows ${maxWebsiteDomains.value} connected website domain${maxWebsiteDomains.value === 1 ? '' : 's'} per chatbot.`)
    return
  }

  isSaving.value = true
  try {
    const response = await $fetch('/api/integrations/website/connect', {
      method: 'POST',
      body: {
        chatbotId: selectedChatbotId.value,
        allowedDomains: connectionForm.value.allowedDomains,
        allowLocalhostTesting: localhostTestingEnabled.value,
      }
    })

    chatbots.value = chatbots.value.map((bot) => bot.id === selectedChatbotId.value
      ? {
          ...bot,
          allowed_domains: response.allowedDomains,
          allow_localhost_testing: response.allowLocalhostTesting,
          is_public: response.isPublic,
        }
      : bot)

    syncFormFromSelection()
    notify.success(response.message || 'Website connection saved.')
  } catch (err: any) {
    console.error('Failed to save website connection:', err)
    notify.error(err?.data?.message || err?.message || 'Failed to save website connection.')
  } finally {
    isSaving.value = false
  }
}

onMounted(fetchChatbots)
watch(selectedChatbotId, syncFormFromSelection)

const scriptTag = computed(() => {
  const id = selectedChatbotId.value || 'YOUR_CHATBOT_ID'
  return `<script src="${siteOrigin.value}/embed.js" data-chatbot="${id}"><\/script>`
})

const scriptTagParts = computed(() => ({
  src: `${siteOrigin.value}/embed.js`,
  chatbotId: selectedChatbotId.value || 'YOUR_CHATBOT_ID',
}))

const connectionMetrics = computed(() => [
  {
    label: 'Approved domains',
    value: `${domainCount.value} / ${maxWebsiteDomains.value}`,
    detail: `${currentPlanLabel.value} limit`,
    icon: Globe,
    tone: 'primary',
  },
  {
    label: 'Connection status',
    value: isConnectionActive.value ? 'Active' : 'Draft',
    detail: isConnectionActive.value ? 'Website chat can load' : 'Save a domain to activate',
    icon: isConnectionActive.value ? ShieldCheck : Shield,
    tone: isConnectionActive.value ? 'green' : 'muted',
  },
  {
    label: 'Assistant',
    value: selectedChatbot.value?.name || 'None',
    detail: selectedChatbot.value ? 'Controls widget replies' : 'Create or select one',
    icon: MessageSquare,
    tone: 'blue',
  },
  {
    label: 'Local testing',
    value: localhostTestingEnabled.value ? 'On' : 'Off',
    detail: localhostTestingEnabled.value ? 'Allowed for development' : 'Production domains only',
    icon: Code2,
    tone: localhostTestingEnabled.value ? 'amber' : 'muted',
  },
])

const metricToneClass = (tone: string) => ({
  primary: 'bg-primary/10 text-primary ring-primary/15',
  blue: 'bg-sky-400/10 text-sky-400 ring-sky-400/15',
  green: 'bg-emerald-400/10 text-emerald-400 ring-emerald-400/15',
  amber: 'bg-amber-400/10 text-amber-400 ring-amber-400/15',
  muted: 'bg-foreground/5 text-foreground/45 ring-foreground/10',
}[tone] || 'bg-foreground/5 text-foreground/45 ring-foreground/10')

</script>

<template>
  <div class="min-h-[calc(100vh-4.5rem)] space-y-5 pt-3 pb-24 lg:pb-0" style="zoom: 0.95">
    <section class="rounded-[0.39rem] p-5 sm:p-6">
      <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="dashboard-eyebrow text-primary/80">Website channel</p>
          <h1 class="dashboard-section-title mt-2">Connect website chat</h1>
          <p class="dashboard-muted mt-1 max-w-2xl">Approve production domains, save the channel, then install the widget script on your website.</p>
        </div>
        <NuxtLink to="/dashboard/pricing" class="dashboard-action-label inline-flex w-fit items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 py-2 text-foreground/55 transition hover:border-primary/25 hover:text-primary">
          Upgrade plan
        </NuxtLink>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="metric in connectionMetrics" :key="metric.label" class="group flex items-center gap-2.5 rounded-[0.39rem] bg-background/45 py-3 pl-3 pr-2 transition hover:bg-foreground/[0.035]">
          <div :class="['flex h-[2.85rem] w-[2.85rem] shrink-0 items-center justify-center rounded-[0.39rem] ring-1 transition group-hover:scale-105', metricToneClass(metric.tone)]">
            <component :is="metric.icon" class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <p class="truncate text-base font-bold leading-none tracking-tight text-foreground">{{ metric.value }}</p>
            <p class="mt-1 truncate text-sm font-semibold text-foreground/75">{{ metric.label }}</p>
            <p class="mt-0.5 truncate text-[11px] font-semibold text-foreground/50">{{ metric.detail }}</p>
          </div>
        </div>
      </div>
    </section>

    <section v-if="!isVerified" class="rounded-[0.39rem] border border-primary/20 bg-primary/5 p-6 text-center shadow-sm shadow-black/5">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15">
        <ShieldCheck class="h-6 w-6" />
      </div>
      <h2 class="mt-4 text-lg font-bold tracking-tight text-foreground">Verify your email to connect website chat</h2>
      <p class="dashboard-muted mx-auto mt-2 max-w-md">Account verification is required before publishing an assistant on your website.</p>
      <NuxtLink to="/dashboard/settings" class="dashboard-action-label mt-5 inline-flex items-center justify-center rounded-[0.39rem] bg-primary px-4 py-2.5 text-black transition hover:brightness-95">
        Go to settings
      </NuxtLink>
    </section>

    <template v-else-if="isLoading">
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
          <Skeleton width="9rem" height="0.8rem" class="mb-3" />
          <Skeleton width="14rem" height="1.35rem" class="mb-5" />
          <Skeleton height="18rem" radius="0.39rem" />
        </section>
        <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
          <Skeleton width="8rem" height="0.8rem" class="mb-3" />
          <Skeleton height="16rem" radius="0.39rem" />
        </section>
      </div>
    </template>

    <div v-else class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
        <div class="mb-5 flex items-end justify-between gap-3">
          <div>
            <p class="dashboard-eyebrow text-primary/80">Connection setup</p>
            <h2 class="dashboard-section-title mt-2">Approved website access</h2>
            <p class="dashboard-muted mt-1">Approve where the selected assistant widget can load.</p>
          </div>
        </div>

        <div class="space-y-5">
          <div v-if="chatbots.length === 0" class="rounded-[0.39rem] border border-primary/15 bg-primary/5 p-3">
            <p class="text-sm font-bold text-foreground">No assistant yet</p>
            <p class="dashboard-muted mt-1">Create an assistant before connecting website chat.</p>
            <NuxtLink to="/dashboard/agents" class="dashboard-action-label mt-3 inline-flex text-primary hover:underline">Create your first assistant</NuxtLink>
          </div>


          <div>
            <label class="dashboard-eyebrow mb-2 block">Approved domains</label>
            <div class="flex flex-col gap-2 sm:flex-row">
              <input v-model="newDomainInput" type="text" class="min-w-0 flex-1 rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-foreground/35 focus:border-primary/40" placeholder="example.com" @keydown.enter.prevent="addDomain" />
              <button type="button" @click="addDomain" :disabled="hasReachedLimit" class="dashboard-action-label inline-flex items-center justify-center gap-1.5 rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 py-2.5 text-foreground/60 transition hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">
                <Plus class="h-3.5 w-3.5" /> Add
              </button>
            </div>

            <div class="mt-3 overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background/35">
              <div v-for="domain in connectionForm.allowedDomains" :key="domain" class="flex items-center gap-3 border-b border-foreground/[0.06] px-3 py-2.5 last:border-b-0">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Globe class="h-4 w-4" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-bold text-foreground">{{ domain }}</p>
                  <p class="text-[11px] font-semibold text-foreground/40">Production domain</p>
                </div>
                <span class="hidden rounded-[0.3rem] border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300 sm:inline-flex">Approved</span>
                <button type="button" @click="removeDomain(domain)" class="rounded-[0.35rem] p-2 text-foreground/35 transition hover:bg-red-500/10 hover:text-red-400" aria-label="Remove domain">
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>

              <div v-if="connectionForm.allowedDomains.length === 0" class="flex min-h-[7rem] flex-col items-center justify-center p-5 text-center">
                <Globe class="mb-3 h-9 w-9 text-foreground/15" />
                <p class="text-sm font-bold text-foreground/55">No approved domains yet</p>
                <p class="dashboard-muted mt-1 max-w-sm">Add your production domain to activate website chat for this assistant.</p>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-3 rounded-[0.39rem] border border-foreground/10 bg-background/35 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-bold text-foreground">Localhost testing</p>
              <p class="dashboard-muted mt-1">Keep enabled while testing locally, then disable after launch.</p>
            </div>
            <button type="button" @click="localhostTestingEnabled = !localhostTestingEnabled" :disabled="!canDisableLocalhost" :class="['h-7 w-12 shrink-0 rounded-full p-1 transition-all', localhostTestingEnabled ? 'bg-primary' : 'bg-foreground/10', !canDisableLocalhost ? 'cursor-not-allowed opacity-60' : '']" aria-label="Toggle localhost testing">
              <div :class="['h-5 w-5 rounded-full bg-white transition-all', localhostTestingEnabled ? 'translate-x-5' : 'translate-x-0']" />
            </button>
          </div>

          <button type="button" @click="saveConnection" :disabled="!selectedChatbotId || isSaving || domainCount === 0" class="dashboard-action-label inline-flex w-full items-center justify-center gap-1.5 rounded-[0.39rem] bg-primary px-4 py-3 text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
            <Loader2 v-if="isSaving" class="h-3.5 w-3.5 animate-spin" />
            <Check v-else class="h-3.5 w-3.5" />
            Save website channel
          </button>
        </div>
      </section>

      <aside class="space-y-3 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
        <div>
          <p class="dashboard-eyebrow text-primary/80">Install widget</p>
          <h2 class="dashboard-section-title mt-2">Embed script</h2>
          <p class="dashboard-muted mt-1">Paste this before the closing body tag on an approved website.</p>
        </div>

        <div class="overflow-hidden rounded-[0.39rem] border border-primary/15 bg-gradient-to-br from-background/80 via-background-card/70 to-primary/[0.055] shadow-sm shadow-black/10">
          <div class="flex items-center justify-between gap-3 border-b border-foreground/10 bg-foreground/[0.035] px-3 py-2.5">
            <div class="flex min-w-0 items-center gap-2">
              <div class="flex items-center gap-1.5">
                <span class="h-2 w-2 rounded-full bg-red-400/80" />
                <span class="h-2 w-2 rounded-full bg-amber-300/80" />
                <span class="h-2 w-2 rounded-full bg-emerald-400/80" />
              </div>
              <span class="truncate text-[11px] font-bold text-foreground/50">widget install</span>
            </div>
            <span class="rounded-[0.3rem] border border-primary/15 bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">1 line</span>
          </div>

          <div class="relative p-3">
            <div class="pointer-events-none absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-[0.35rem] bg-primary/10 text-primary ring-1 ring-primary/15">
              <Code2 class="h-3.5 w-3.5" />
            </div>
            <pre class="max-h-40 overflow-auto rounded-[0.35rem] border border-foreground/10 bg-background/65 p-3 pr-11 text-[11px] leading-relaxed text-foreground/70 shadow-inner shadow-black/10"><code class="whitespace-pre-wrap break-all"><span class="text-primary/90">&lt;script</span> <span class="text-sky-300">src</span>=<span class="text-emerald-300">&quot;{{ scriptTagParts.src }}&quot;</span> <span class="text-sky-300">data-chatbot</span>=<span class="text-emerald-300">&quot;{{ scriptTagParts.chatbotId }}&quot;</span><span class="text-primary/90">&gt;&lt;/script&gt;</span></code></pre>
            <button type="button" @click="copyText(scriptTag, 'Embed script')" class="dashboard-action-label mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-[0.39rem] bg-primary px-3 py-2.5 text-black shadow-sm shadow-primary/10 transition hover:brightness-95 active:scale-[0.99]">
              <component :is="copiedType === 'Embed script' ? Check : Copy" class="h-3.5 w-3.5" />
              {{ copiedType === 'Embed script' ? 'Script copied' : 'Copy embed script' }}
            </button>
          </div>
        </div>

        <div v-if="selectedChatbot" class="rounded-[0.39rem] border border-foreground/10 bg-background/35 p-3">
          <p class="dashboard-eyebrow mb-3">Launcher preview</p>
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center shadow-sm ring-1 ring-black/10" :style="{ backgroundColor: selectedChatbot.launcher_color || selectedChatbot.primary_color || '#D4AF37', borderRadius: selectedChatbot.launcher_style === 'circle' ? '50%' : selectedChatbot.launcher_style === 'square' ? '0px' : selectedChatbot.launcher_style === 'rounded-square' ? '0.39rem' : '9999px' }">
              <component :is="launcherIconsMap[selectedChatbot.launcher_icon] || MessageSquare" class="h-5 w-5 text-black" />
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-bold text-foreground">{{ selectedChatbot.name }}</p>
              <p class="dashboard-muted mt-0.5">Appears after the script loads on an approved domain.</p>
            </div>
          </div>
        </div>


        <div class="rounded-[0.39rem] border border-foreground/10 bg-background/35 p-3">
          <div class="flex items-start gap-2">
            <Shield class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p class="dashboard-muted">Only approved domains can load this assistant widget. Localhost is for development testing only.</p>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
