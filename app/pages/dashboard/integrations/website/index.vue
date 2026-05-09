<script setup lang="ts">
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Globe,
  Info,
  Loader2,
  MessageSquare,
  Palette,
  Plus,
  Shield,
  ShieldCheck,
  Terminal,
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
  Bot,
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

const curlCommand = computed(() => {
  const id = selectedChatbotId.value || 'YOUR_CHATBOT_ID'
  const approvedOrigin = connectionForm.value.allowedDomains[0]
    ? `https://${connectionForm.value.allowedDomains[0]}`
    : localhostTestingEnabled.value
      ? 'http://localhost:3000'
      : siteOrigin.value

  return `curl -X POST "${siteOrigin.value}/api/public/chat" \\
  -H "Content-Type: application/json" \\
  -H "Origin: ${approvedOrigin}" \\
  -d '{
    "chatbotId": "${id}",
    "message": "Hello, how can you help me today?"
  }'`
})

const playgroundHtml = computed(() => {
  const id = selectedChatbotId.value || 'YOUR_CHATBOT_ID'
  const scriptUrl = `${siteOrigin.value}/embed.js`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ReplySuite Local Test</title>
  <script src="${scriptUrl}" data-chatbot="${id}" async><\/script>
</head>
<body style="font-family: sans-serif; background: #09090b; color: white; display: grid; place-items: center; min-height: 100vh; margin: 0;">
  <div style="text-align: center; max-width: 580px; padding: 24px;">
    <h1 style="font-size: 40px; margin-bottom: 12px;">ReplySuite widget test</h1>
    <p style="opacity: 0.7; line-height: 1.6;">Save this file as index.html and open it locally while localhost testing stays enabled for this chatbot.</p>
  </div>
</body>
</html>`
})
</script>

<template>
  <div class="w-full space-y-8 pb-20">
    <NuxtLink
      to="/dashboard"
      class="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-all text-[10px] font-black uppercase tracking-widest mb-2 group w-fit"
    >
      <ArrowLeft class="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
      Back to Overview
    </NuxtLink>

    <div v-if="!isVerified" class="glass-card p-12 border-primary/20 bg-primary/5 text-center flex flex-col items-center">
      <ShieldCheck class="w-16 h-16 text-primary mb-6 opacity-30" />
      <h2 class="text-2xl font-black mb-4 text-foreground">Verification Required</h2>
      <p class="text-foreground/50 max-w-sm mb-8 font-bold uppercase tracking-widest text-[10px]">
        Please verify your account to unlock external embeddings and API access.
      </p>
      <NuxtLink to="/dashboard/settings" class="px-8 py-3 bg-primary text-black font-bold tracking-widest text-xs uppercase rounded-xl hover:scale-105 transition-all">
        Go to settings
      </NuxtLink>
    </div>

    <div v-else-if="isLoading" class="space-y-8">
      <section class="glass-card p-8 bg-background border-foreground/5 relative overflow-hidden">
        <Skeleton width="180px" height="10px" class="mb-4" />
        <Skeleton width="320px" height="48px" radius="1rem" />
      </section>

      <div class="grid lg:grid-cols-2 gap-8">
        <section class="glass-card p-8 bg-background border-foreground/10">
          <Skeleton width="180px" height="16px" class="mb-6" />
          <Skeleton height="150px" radius="1rem" />
        </section>
        <section class="glass-card p-8 bg-background border-foreground/10">
          <Skeleton width="180px" height="16px" class="mb-6" />
          <Skeleton height="150px" radius="1rem" />
        </section>
      </div>
    </div>

    <div v-else class="space-y-8">
      <section class="glass-card p-8 bg-background border-foreground/10 relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
        <div class="relative z-10 grid lg:grid-cols-[minmax(0,1fr)_auto] gap-6 items-end">
          <div>
            <label class="block text-[11px] font-bold tracking-widest text-foreground/50 uppercase mb-4">Target Chatbot</label>
            <div class="relative max-w-md">
              <select
                v-model="selectedChatbotId"
                class="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-6 py-4 text-sm font-bold text-foreground appearance-none focus:outline-none focus:border-primary/40 transition-all cursor-pointer uppercase tracking-widest"
              >
                <option v-for="bot in chatbots" :key="bot.id" :value="bot.id" class="bg-background">{{ bot.name }}</option>
              </select>
              <ChevronDown class="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50 pointer-events-none" />
              <div v-if="chatbots.length === 0" class="absolute inset-y-0 left-0 right-0 flex items-center px-6 bg-background/80 backdrop-blur-sm rounded-xl">
                <NuxtLink to="/dashboard/agents" class="text-primary text-[10px] font-bold uppercase tracking-widest hover:underline">
                  Create your first chatbot to continue
                </NuxtLink>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
            <div class="px-4 py-2 rounded-xl border border-primary/20 bg-primary/10 text-primary">
              {{ domainCount }} / {{ maxWebsiteDomains }} domains
            </div>
            <div
              class="px-4 py-2 rounded-xl border"
              :class="isConnectionActive ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-foreground/10 bg-foreground/5 text-foreground/60'"
            >
              {{ isConnectionActive ? 'Active' : 'Draft' }}
            </div>
          </div>
        </div>
      </section>

      <div class="grid xl:grid-cols-[1.2fr_.8fr] gap-8 items-start">
        <section class="glass-card p-8 bg-background border-foreground/10 space-y-8">
          <div class="flex items-start justify-between gap-6">
            <div class="space-y-3 max-w-2xl">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                <Shield class="w-3.5 h-3.5" />
                Website connection setup
              </div>
              <h2 class="text-2xl font-black tracking-tight text-foreground">Connect this chatbot to the exact domain it will run on.</h2>
              <p class="text-sm text-foreground/55 leading-relaxed">
                This saves approved website domains in Supabase, activates public website access for the chatbot, and keeps localhost available for testing until you decide to turn it off.
              </p>
            </div>

            <button
              @click="saveConnection"
              :disabled="!selectedChatbotId || isSaving || domainCount === 0"
              class="shrink-0 px-5 py-3 rounded-xl bg-primary text-black font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
              <Check v-else class="w-4 h-4" />
              {{ isConnectionActive ? 'Update connection' : 'Activate connection' }}
            </button>
          </div>

          <div class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 flex items-start gap-4">
            <Info class="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div class="space-y-2 text-[11px] uppercase tracking-widest font-bold text-foreground/55">
              <p>
                Current plan: <span class="text-foreground">{{ currentPlanLabel }}</span>
              </p>
              <p>
                Limit per chatbot: <span class="text-foreground">{{ maxWebsiteDomains }} website domain{{ maxWebsiteDomains === 1 ? '' : 's' }}</span>
              </p>
              <p v-if="hasReachedLimit" class="text-primary">
                You have reached your current domain limit for this chatbot.
              </p>
            </div>
          </div>

          <div class="space-y-4">
            <div class="flex items-center justify-between gap-4 flex-wrap">
              <label class="block text-[10px] font-bold tracking-widest text-foreground/50 uppercase">Approved production domains</label>
              <NuxtLink to="/dashboard/pricing" class="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                Need more domains? Upgrade plan
              </NuxtLink>
            </div>

            <div class="flex flex-col md:flex-row gap-3">
              <input
                v-model="newDomainInput"
                type="text"
                class="flex-1 bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors placeholder:text-foreground/40"
                placeholder="example.com"
                @keydown.enter.prevent="addDomain"
              />
              <button
                @click="addDomain"
                :disabled="hasReachedLimit"
                class="px-5 py-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground font-black text-[10px] uppercase tracking-widest hover:bg-foreground/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                <Plus class="w-4 h-4" />
                Add domain
              </button>
            </div>

            <div class="grid gap-3">
              <div
                v-for="domain in connectionForm.allowedDomains"
                :key="domain"
                class="flex items-center gap-3 px-4 py-3 rounded-xl border border-foreground/10 bg-foreground/[0.02]"
              >
                <Globe class="w-4 h-4 text-primary shrink-0" />
                <span class="flex-1 text-sm text-foreground">{{ domain }}</span>
                <button
                  @click="removeDomain(domain)"
                  class="p-2 rounded-lg text-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>

              <div v-if="connectionForm.allowedDomains.length === 0" class="p-6 rounded-xl border border-dashed border-foreground/10 bg-foreground/[0.02] text-center">
                <p class="text-[10px] font-black uppercase tracking-widest text-foreground/50">
                  Add at least one production domain to activate this website connection.
                </p>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 flex items-start justify-between gap-6">
            <div class="space-y-2 max-w-xl">
              <p class="text-[10px] font-black uppercase tracking-widest text-foreground/60">Localhost testing</p>
              <p class="text-sm text-foreground/55 leading-relaxed">
                Localhost is automatically allowed while the connection is still being prepared. Once the connection is active, you can disable localhost access for stricter production-only enforcement.
              </p>
            </div>

            <button
              @click="localhostTestingEnabled = !localhostTestingEnabled"
              :disabled="!canDisableLocalhost"
              :class="[
                'w-14 h-8 rounded-full p-1 transition-all shrink-0',
                localhostTestingEnabled ? 'bg-primary' : 'bg-foreground/10',
                !canDisableLocalhost ? 'opacity-60 cursor-not-allowed' : ''
              ]"
            >
              <div :class="['w-6 h-6 rounded-full bg-white transition-all', localhostTestingEnabled ? 'translate-x-6' : 'translate-x-0']" />
            </button>
          </div>
        </section>

        <div class="space-y-8">
          <section class="glass-card p-8 bg-background border-foreground/10">
            <div class="flex items-center gap-4 mb-8">
              <div class="p-3 rounded-xl bg-primary/10 text-primary">
                <Code2 class="w-6 h-6" />
              </div>
              <div>
                <h3 class="text-xl font-bold tracking-tight text-foreground">Widget Embed</h3>
                <p class="text-[10px] text-foreground/50 font-bold uppercase tracking-widest leading-relaxed">
                  Add this script to your website after the connection is active.
                </p>
              </div>
            </div>

            <div class="space-y-6">
              <div class="relative flex items-center gap-4 p-5 bg-foreground/[0.03] border border-foreground/10 rounded-xl overflow-x-auto overflow-y-hidden">
                <pre class="text-foreground/55 text-[11px] flex-1 leading-relaxed">{{ scriptTag }}</pre>
                <button @click="copyText(scriptTag, 'Embed script')" class="shrink-0 p-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground/50 transition-all hover:text-foreground">
                  <component :is="copiedType === 'Embed script' ? Check : Copy" class="w-4 h-4" />
                </button>
              </div>

              <div v-if="selectedChatbot" class="p-4 bg-foreground/[0.02] border border-foreground/10 rounded-xl flex items-center gap-5">
                <div
                  class="w-12 h-12 flex items-center justify-center shadow-2xl"
                  :style="{
                    backgroundColor: selectedChatbot.launcher_color || selectedChatbot.primary_color || '#D4AF37',
                    borderRadius: selectedChatbot.launcher_style === 'circle' ? '50%' : selectedChatbot.launcher_style === 'square' ? '0px' : selectedChatbot.launcher_style === 'rounded-square' ? '12px' : '9999px'
                  }"
                >
                  <component :is="launcherIconsMap[selectedChatbot.launcher_icon] || MessageSquare" class="w-6 h-6 text-black" />
                </div>
                <div>
                  <h4 class="text-[10px] font-black uppercase tracking-widest text-foreground mb-1">Launcher preview</h4>
                  <p class="text-[9px] text-foreground/50 font-bold uppercase tracking-widest leading-relaxed">This is how your launcher will appear on the approved domain.</p>
                </div>
              </div>
            </div>
          </section>

          <section class="glass-card p-8 bg-background border-foreground/10">
            <div class="flex items-center gap-4 mb-8">
              <div class="p-3 rounded-xl bg-cyan-400/10 text-cyan-400">
                <Terminal class="w-6 h-6" />
              </div>
              <div>
                <h3 class="text-xl font-bold tracking-tight text-foreground">Connectivity test</h3>
                <p class="text-[10px] text-foreground/50 font-bold uppercase tracking-widest leading-relaxed">
                  Use an approved domain or localhost while testing is enabled.
                </p>
              </div>
            </div>

            <div class="relative flex items-center gap-4 p-5 bg-foreground/[0.03] border border-foreground/10 rounded-xl overflow-x-auto overflow-y-hidden">
              <pre class="text-foreground/55 text-[11px] flex-1 leading-loose">{{ curlCommand }}</pre>
              <button @click="copyText(curlCommand, 'CLI command')" class="shrink-0 p-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground/50 transition-all hover:text-foreground">
                <component :is="copiedType === 'CLI command' ? Check : Copy" class="w-4 h-4" />
              </button>
            </div>
          </section>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-8">
        <section class="glass-card p-8 bg-background border-foreground/10">
          <div class="flex items-center justify-between gap-4 mb-8">
            <div class="flex items-center gap-4">
              <div class="p-3 rounded-xl bg-foreground/5 text-primary">
                <Shield class="w-6 h-6" />
              </div>
              <div>
                <h3 class="text-xl font-bold tracking-tight text-foreground">Security state</h3>
                <p class="text-[10px] text-foreground/50 font-bold uppercase tracking-widest leading-relaxed">
                  Live enforcement for the selected chatbot.
                </p>
              </div>
            </div>

            <NuxtLink
              v-if="selectedChatbotId"
              :to="`/dashboard/agents/${selectedChatbotId}?tab=security`"
              class="flex items-center gap-2 px-3 py-1.5 bg-foreground/5 hover:bg-foreground/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-foreground/50 hover:text-primary transition-all border border-foreground/10"
            >
              <Palette class="w-3 h-3" />
              Advanced security
            </NuxtLink>
          </div>

          <div class="space-y-3">
            <div class="flex flex-wrap gap-2" v-if="connectionForm.allowedDomains.length > 0">
              <div
                v-for="domain in connectionForm.allowedDomains"
                :key="domain"
                class="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-bold text-primary uppercase tracking-widest"
              >
                <Globe class="w-3 h-3" />
                {{ domain }}
              </div>
            </div>
            <div v-else class="p-6 bg-foreground/[0.02] border border-dashed border-foreground/10 rounded-xl text-center">
              <p class="text-[9px] text-foreground/50 font-bold uppercase tracking-widest">No production domains connected yet.</p>
            </div>

            <div class="flex items-center gap-2 mt-4 pt-4 border-t border-foreground/5">
              <div class="w-2 h-2 rounded-full" :class="isConnectionActive ? 'bg-emerald-400 animate-pulse' : 'bg-foreground/30'" />
              <span class="text-[9px] text-foreground/50 font-bold uppercase tracking-widest">
                System status: <span class="text-foreground">{{ isConnectionActive ? 'Active domain enforcement' : 'Waiting for activation' }}</span>
              </span>
            </div>
          </div>
        </section>

        <section class="glass-card p-8 bg-background border-foreground/10 relative overflow-hidden">
          <div class="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          <div class="relative z-10">
            <div class="flex items-center gap-4 mb-8">
              <div class="p-3 rounded-xl bg-primary/10 text-primary">
                <Bot class="w-6 h-6" />
              </div>
              <div>
                <h3 class="text-xl font-bold tracking-tight text-foreground">Local sandbox</h3>
                <p class="text-[10px] text-foreground/50 font-bold uppercase tracking-widest leading-relaxed">
                  Quick local file test while localhost access stays enabled.
                </p>
              </div>
            </div>

            <div class="relative flex items-center gap-4 p-5 bg-foreground/[0.03] border border-foreground/10 rounded-xl overflow-x-auto overflow-y-hidden">
              <pre class="text-foreground/55 text-[9px] flex-1 leading-relaxed">{{ playgroundHtml }}</pre>
              <button @click="copyText(playgroundHtml, 'Sandbox HTML')" class="shrink-0 p-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground/50 transition-all hover:text-foreground">
                <component :is="copiedType === 'Sandbox HTML' ? Check : Copy" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply bg-foreground/[0.03] backdrop-blur-xl border border-foreground/10 p-8 rounded-[20px];
}
</style>
