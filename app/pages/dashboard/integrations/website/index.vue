<script setup lang="ts">
import {
  ArrowLeft,
  Check,
  ChevronDown,
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
const selectedChatbotId = ref('')
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

    if (!selectedChatbotId.value && chatbots.value.length > 0) {
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
</script>

<template>
  <div class="w-full space-y-6 pb-20">
    <NuxtLink to="/dashboard" class="dashboard-back-link group mb-2">
      <ArrowLeft class="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
      Back to Overview
    </NuxtLink>

    <section class="glass-card p-6 md:p-7">
      <div class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <span class="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
            Website integration
          </span>
          <h1 class="mt-4 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            Connect your chatbot to your website.
          </h1>
          <p class="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-foreground/55">
            Choose an assistant, approve your domain, save, then copy the embed script into your site.
          </p>
        </div>

        <div class="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
          <div class="rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-primary">
            {{ domainCount }} / {{ maxWebsiteDomains }} domains
          </div>
          <div
            class="rounded-xl border px-4 py-2"
            :class="isConnectionActive ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-foreground/10 bg-foreground/5 text-foreground/60'"
          >
            {{ isConnectionActive ? 'Active' : 'Draft' }}
          </div>
        </div>
      </div>
    </section>

    <div v-if="!isVerified" class="glass-card flex flex-col items-center border-primary/20 bg-primary/5 p-10 text-center">
      <ShieldCheck class="mb-5 h-12 w-12 text-primary opacity-40" />
      <h2 class="mb-3 text-xl font-black text-foreground">Verification Required</h2>
      <p class="mb-6 max-w-sm text-xs font-bold uppercase tracking-widest text-foreground/50">
        Please verify your account to unlock external embeddings and website access.
      </p>
      <NuxtLink to="/dashboard/settings" class="rounded-xl bg-primary px-7 py-3 text-xs font-bold uppercase tracking-widest text-black transition-all hover:scale-105">
        Go to settings
      </NuxtLink>
    </div>

    <div v-else-if="isLoading" class="grid gap-5 lg:grid-cols-2">
      <section class="glass-card p-6">
        <Skeleton width="180px" height="12px" class="mb-5" />
        <Skeleton height="180px" radius="1rem" />
      </section>
      <section class="glass-card p-6">
        <Skeleton width="180px" height="12px" class="mb-5" />
        <Skeleton height="180px" radius="1rem" />
      </section>
    </div>

    <div v-else class="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <section class="glass-card space-y-6 p-6 md:p-7">
        <div>
          <label class="mb-3 block text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Assistant</label>
          <div class="relative max-w-xl">
            <select
              v-model="selectedChatbotId"
              class="w-full cursor-pointer appearance-none rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-3 pr-11 text-sm font-bold text-foreground transition-all focus:border-primary/40 focus:outline-none"
            >
              <option v-for="bot in chatbots" :key="bot.id" :value="bot.id" class="bg-background">{{ bot.name }}</option>
            </select>
            <ChevronDown class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
            <div v-if="chatbots.length === 0" class="absolute inset-0 flex items-center rounded-xl bg-background/90 px-4 backdrop-blur-sm">
              <NuxtLink to="/dashboard/agents" class="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                Create your first assistant to continue
              </NuxtLink>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Plan limit</p>
              <p class="mt-1 text-sm font-bold text-foreground">{{ currentPlanLabel }} allows {{ maxWebsiteDomains }} domain{{ maxWebsiteDomains === 1 ? '' : 's' }} per assistant.</p>
            </div>
            <NuxtLink to="/dashboard/pricing" class="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
              Upgrade plan
            </NuxtLink>
          </div>
        </div>

        <div class="space-y-4">
          <label class="block text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Approved domains</label>
          <div class="flex flex-col gap-3 sm:flex-row">
            <input
              v-model="newDomainInput"
              type="text"
              class="flex-1 rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-3 text-sm text-foreground transition-colors placeholder:text-foreground/35 focus:border-primary/40 focus:outline-none"
              placeholder="example.com"
              @keydown.enter.prevent="addDomain"
            />
            <button
              @click="addDomain"
              :disabled="hasReachedLimit"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-foreground transition-all hover:bg-foreground/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus class="h-4 w-4" />
              Add
            </button>
          </div>

          <div class="space-y-2">
            <div
              v-for="domain in connectionForm.allowedDomains"
              :key="domain"
              class="flex items-center gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3"
            >
              <Globe class="h-4 w-4 shrink-0 text-primary" />
              <span class="flex-1 text-sm font-medium text-foreground">{{ domain }}</span>
              <button
                @click="removeDomain(domain)"
                class="rounded-lg p-2 text-foreground/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
                aria-label="Remove domain"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>

            <div v-if="connectionForm.allowedDomains.length === 0" class="rounded-xl border border-dashed border-foreground/10 bg-foreground/[0.02] p-5 text-center">
              <p class="text-[10px] font-black uppercase tracking-widest text-foreground/45">
                Add at least one production domain to activate the connection.
              </p>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Localhost testing</p>
            <p class="mt-1 text-sm font-medium leading-relaxed text-foreground/55">
              Keep enabled while testing locally. You can turn it off after the connection is active.
            </p>
          </div>

          <button
            @click="localhostTestingEnabled = !localhostTestingEnabled"
            :disabled="!canDisableLocalhost"
            :class="[
              'h-8 w-14 shrink-0 rounded-full p-1 transition-all',
              localhostTestingEnabled ? 'bg-primary' : 'bg-foreground/10',
              !canDisableLocalhost ? 'cursor-not-allowed opacity-60' : ''
            ]"
            aria-label="Toggle localhost testing"
          >
            <div :class="['h-6 w-6 rounded-full bg-white transition-all', localhostTestingEnabled ? 'translate-x-6' : 'translate-x-0']" />
          </button>
        </div>

        <button
          @click="saveConnection"
          :disabled="!selectedChatbotId || isSaving || domainCount === 0"
          class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-[11px] font-black uppercase tracking-widest text-black transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
          <Check v-else class="h-4 w-4" />
          {{ isConnectionActive ? 'Update connection' : 'Activate connection' }}
        </button>
      </section>

      <section class="glass-card space-y-6 p-6 md:p-7">
        <div class="flex items-start gap-4">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Code2 class="h-5 w-5" />
          </div>
          <div>
            <h2 class="text-xl font-black tracking-tight text-foreground">Embed script</h2>
            <p class="mt-1 text-sm font-medium leading-relaxed text-foreground/55">
              Paste this snippet before the closing body tag on your approved website.
            </p>
          </div>
        </div>

        <div class="relative flex items-center gap-4 overflow-x-auto rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4">
          <pre class="flex-1 whitespace-pre-wrap break-all text-[11px] leading-relaxed text-foreground/60">{{ scriptTag }}</pre>
          <button
            @click="copyText(scriptTag, 'Embed script')"
            class="shrink-0 rounded-xl bg-foreground/5 p-3 text-foreground/50 transition-all hover:bg-foreground/10 hover:text-foreground"
            aria-label="Copy embed script"
          >
            <component :is="copiedType === 'Embed script' ? Check : Copy" class="h-4 w-4" />
          </button>
        </div>

        <div v-if="selectedChatbot" class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
          <p class="mb-4 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Launcher preview</p>
          <div class="flex items-center gap-4">
            <div
              class="flex h-12 w-12 items-center justify-center shadow-xl"
              :style="{
                backgroundColor: selectedChatbot.launcher_color || selectedChatbot.primary_color || '#D4AF37',
                borderRadius: selectedChatbot.launcher_style === 'circle' ? '50%' : selectedChatbot.launcher_style === 'square' ? '0px' : selectedChatbot.launcher_style === 'rounded-square' ? '12px' : '9999px'
              }"
            >
              <component :is="launcherIconsMap[selectedChatbot.launcher_icon] || MessageSquare" class="h-6 w-6 text-black" />
            </div>
            <div>
              <p class="text-sm font-bold text-foreground">{{ selectedChatbot.name }}</p>
              <p class="mt-1 text-xs font-medium text-foreground/50">This launcher appears after the script loads on an approved domain.</p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
          <div class="flex items-start gap-3">
            <Shield class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p class="text-xs font-medium leading-relaxed text-foreground/55">
              Only domains saved on this page can use the public widget for this assistant. Localhost is for testing only.
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[20px] border border-foreground/10 bg-foreground/[0.03] backdrop-blur-xl;
}
</style>
