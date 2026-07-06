<script setup lang="ts">
import { ArrowLeft, ArrowRight, Bot, Building2, CalendarCheck2, CalendarDays, Check, ChevronDown, Clock3, CreditCard, Crown, Globe2, Hotel, Loader2, RefreshCcw, Save, Search, Settings2, ShieldCheck, Stethoscope, XCircle } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
useHead({ title: 'Assistant Tools | ReplySuite' })

const route = useRoute()
const { userId } = useAuth()
const { canUseBusinessTools } = usePlanAccess()
const supabase = useSupabaseClient()
const notify = useNotify()

const isLoading = ref(true)
const isSaving = ref(false)
const isCheckingGoogle = ref(false)
const assistants = ref<any[]>([])
const selectedAssistantId = ref('')
const appointmentsEnabled = ref(false)
const depositsEnabled = ref(false)
const bookingMode = ref<'appointments' | 'bookings' | 'mixed'>('mixed')
const confirmationMode = ref<'instant' | 'manual'>('manual')
const googleCalendarStatus = ref<any>(null)
const toolSearch = ref('')
const toolStatusFilter = ref('all')
const toolCategoryFilter = ref('all')
const selectedToolId = ref('appointments')

const isPremium = canUseBusinessTools

const selectedAssistant = computed(() => assistants.value.find((assistant) => assistant.id === selectedAssistantId.value) || null)
const toolStatusLabel = computed(() => appointmentsEnabled.value ? 'Enabled' : 'Disabled')
const depositStatusLabel = computed(() => appointmentsEnabled.value ? (depositsEnabled.value ? 'Enabled' : 'Disabled') : 'Unavailable')
const selectedConfig = computed(() => selectedAssistant.value?.tools_config || {})
const selectedSchedulingConfig = computed(() => selectedConfig.value?.scheduling || {})
const googleMapping = computed(() => googleCalendarStatus.value?.mapping || null)
const googleCalendarConnected = computed(() => Boolean(
  googleCalendarStatus.value?.connected
  && googleMapping.value?.chatbot_id === selectedAssistantId.value
  && googleMapping.value?.sync_status === 'connected'
))
const googleCalendarLabel = computed(() => googleMapping.value?.calendar_summary || googleCalendarStatus.value?.connection?.google_email || 'Connected calendar')
const calendarSetupLink = computed(() => selectedAssistantId.value ? `/dashboard/appointments/settings?chatbotId=${selectedAssistantId.value}` : '/dashboard/appointments/settings')
const websiteBuilderLink = computed(() => selectedAssistantId.value ? `/dashboard/agents/tools/website-builder?chatbotId=${selectedAssistantId.value}` : '/dashboard/agents/tools/website-builder')

const activeCapabilities = computed(() => {
  const toolOn = appointmentsEnabled.value
  return [
    { label: 'Request appointment', enabled: toolOn, icon: CalendarCheck2 },
    ...(toolOn && googleCalendarConnected.value ? [
      { label: 'Check Google Calendar availability', enabled: true, icon: Clock3 },
      { label: 'Reschedule booking', enabled: true, icon: RefreshCcw },
      { label: 'Cancel booking', enabled: true, icon: XCircle },
    ] : []),
    { label: 'Optional deposit checkout', enabled: toolOn && depositsEnabled.value, icon: CreditCard },
  ]
})

const modeCards = [
  {
    id: 'appointments',
    title: 'Appointments for clinics and service teams',
    desc: 'Best for clinics, salons, coaches, offices, schools, agencies, and people who need appointment setting, cancellation, and rescheduling.',
    icon: Stethoscope,
    examples: ['Clinic consultation', 'Salon booking', 'Office appointment'],
  },
  {
    id: 'bookings',
    title: 'Bookings for hospitality and venues',
    desc: 'Best for guest houses, hotels, lounges, restaurants, event spaces, rentals, and places that need reservation-style bookings.',
    icon: Hotel,
    examples: ['Room booking', 'Table reservation', 'Event/private section'],
  },
  {
    id: 'mixed',
    title: 'Mixed appointments and bookings',
    desc: 'Use one assistant for both service appointments and reservation requests. Google Calendar remains the source of availability.',
    icon: Building2,
    examples: ['Consultations', 'Reservations', 'Events'],
  },
]

const toolRows = computed(() => [
  {
    id: 'appointments',
    name: 'Appointments & bookings',
    category: 'Booking',
    status: appointmentsEnabled.value ? 'Enabled' : 'Disabled',
    tone: appointmentsEnabled.value ? 'active' : 'disabled',
    connectedData: `${bookingMode.value} · ${confirmationMode.value} approval`,
    action: appointmentsEnabled.value ? 'Disable' : 'Enable',
    icon: CalendarDays,
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    category: 'Booking',
    status: isCheckingGoogle.value ? 'Checking' : googleCalendarConnected.value ? 'Connected' : appointmentsEnabled.value ? 'Attention' : 'Paused',
    tone: isCheckingGoogle.value ? 'pending' : googleCalendarConnected.value ? 'active' : appointmentsEnabled.value ? 'attention' : 'disabled',
    connectedData: googleCalendarConnected.value ? googleCalendarLabel.value : appointmentsEnabled.value ? 'Calendar mapping required' : 'Enable bookings first',
    action: 'Manage',
    icon: CalendarCheck2,
  },
  {
    id: 'deposits',
    name: 'Booking deposit checkout',
    category: 'Payments',
    status: appointmentsEnabled.value ? (depositsEnabled.value ? 'Enabled' : 'Disabled') : 'Unavailable',
    tone: appointmentsEnabled.value ? (depositsEnabled.value ? 'active' : 'disabled') : 'locked',
    connectedData: depositsEnabled.value ? 'MTN/Airtel mobile checkout' : appointmentsEnabled.value ? 'No deposit checkout' : 'Requires bookings enabled',
    action: depositsEnabled.value ? 'Disable' : 'Enable',
    icon: CreditCard,
  },
  {
    id: 'website_builder',
    name: 'Enterprise website builder',
    category: 'Websites',
    status: isPremium.value ? 'Ready' : 'Locked',
    tone: isPremium.value ? 'active' : 'locked',
    connectedData: isPremium.value ? 'Assistant tool workspace' : 'Enterprise plan required',
    action: isPremium.value ? 'Open' : 'Upgrade',
    icon: Globe2,
  },
])

const toolCategories = computed(() => ['all', ...Array.from(new Set(toolRows.value.map((row) => row.category)))])
const toolStatuses = computed(() => ['all', ...Array.from(new Set(toolRows.value.map((row) => row.status)))])
const filteredToolRows = computed(() => {
  const query = toolSearch.value.trim().toLowerCase()
  return toolRows.value.filter((row) => {
    const matchesSearch = !query || [row.name, row.category, row.status, row.connectedData].join(' ').toLowerCase().includes(query)
    const matchesStatus = toolStatusFilter.value === 'all' || row.status === toolStatusFilter.value
    const matchesCategory = toolCategoryFilter.value === 'all' || row.category === toolCategoryFilter.value
    return matchesSearch && matchesStatus && matchesCategory
  })
})
const selectedTool = computed(() => toolRows.value.find((row) => row.id === selectedToolId.value) || toolRows.value[0])

const statusDotClass = (tone: string) => ({
  active: 'bg-emerald-400 shadow-emerald-400/30',
  pending: 'bg-sky-400 shadow-sky-400/30',
  attention: 'bg-orange-400 shadow-orange-400/30',
  locked: 'bg-red-400 shadow-red-400/30',
  disabled: 'bg-foreground/25 shadow-foreground/10',
}[tone] || 'bg-foreground/25')

const hasChanges = computed(() => {
  const enabledTools = Array.isArray(selectedAssistant.value?.enabled_tools) ? selectedAssistant.value.enabled_tools : []
  const currentAppointments = enabledTools.includes('appointments')
  const currentDeposits = currentAppointments && enabledTools.includes('payments')
  return currentAppointments !== appointmentsEnabled.value
    || currentDeposits !== depositsEnabled.value
    || (selectedSchedulingConfig.value?.mode || 'mixed') !== bookingMode.value
    || (selectedSchedulingConfig.value?.confirmation_mode || 'manual') !== confirmationMode.value
})

const getAuthHeaders = async () => {
  const { data: sessionData } = await (supabase as any).auth.getSession()
  const accessToken = sessionData?.session?.access_token
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
}

const fetchGoogleStatus = async () => {
  if (!selectedAssistantId.value) {
    googleCalendarStatus.value = null
    return
  }
  isCheckingGoogle.value = true
  try {
    googleCalendarStatus.value = await $fetch('/api/google/calendar/status', {
      query: { chatbotId: selectedAssistantId.value },
      headers: await getAuthHeaders(),
    })
  } catch (err) {
    console.error('Failed to load Google Calendar mapping:', err)
    googleCalendarStatus.value = null
  } finally {
    isCheckingGoogle.value = false
  }
}

const syncSelection = () => {
  const assistant = selectedAssistant.value
  const enabledTools = Array.isArray(assistant?.enabled_tools) ? assistant.enabled_tools : []
  appointmentsEnabled.value = enabledTools.includes('appointments')
  depositsEnabled.value = appointmentsEnabled.value && enabledTools.includes('payments')
  bookingMode.value = (assistant?.tools_config?.scheduling?.mode || 'mixed') as any
  confirmationMode.value = (assistant?.tools_config?.scheduling?.confirmation_mode || 'manual') as any
  void fetchGoogleStatus()
}

const fetchAssistants = async () => {
  if (!userId.value) return
  isLoading.value = true
  try {
    const { data, error } = await supabase.from('chatbots').select('id, name, default_language, enabled_tools, tools_config, created_at').eq('user_id', userId.value).is('deleted_at', null).order('created_at', { ascending: false })
    if (error) throw error
    assistants.value = data || []
    const requestedAssistantId = typeof route.query.id === 'string' ? route.query.id : typeof route.query.chatbotId === 'string' ? route.query.chatbotId : ''
    if (requestedAssistantId && assistants.value.some((assistant) => assistant.id === requestedAssistantId)) selectedAssistantId.value = requestedAssistantId
    else if (!selectedAssistantId.value && assistants.value.length > 0) selectedAssistantId.value = assistants.value[0].id
    syncSelection()
  } catch (err) {
    console.error('Failed to load assistants:', err)
    notify.error('Failed to load assistants.')
  } finally {
    isLoading.value = false
  }
}

const enableAppointments = () => {
  if (!isPremium.value) return notify.warn('Upgrade to Enterprise to enable Google Calendar booking tools.')
  appointmentsEnabled.value = !appointmentsEnabled.value
  if (!appointmentsEnabled.value) depositsEnabled.value = false
}

const toggleDeposits = () => {
  if (!isPremium.value) return notify.warn('Upgrade to Enterprise to enable deposits.')
  if (!appointmentsEnabled.value) return notify.warn('Enable appointments and bookings before deposit checkout.')
  depositsEnabled.value = !depositsEnabled.value
}

const handleToolAction = (toolId: string) => {
  selectedToolId.value = toolId
  if (toolId === 'appointments') return enableAppointments()
  if (toolId === 'deposits') return toggleDeposits()
  if (toolId === 'google_calendar') return navigateTo(calendarSetupLink.value)
  if (toolId === 'website_builder') return navigateTo(isPremium.value ? websiteBuilderLink.value : '/dashboard/pricing')
}

const saveTools = async () => {
  if (!selectedAssistant.value || isSaving.value) return
  if ((appointmentsEnabled.value || depositsEnabled.value) && !isPremium.value) return notify.warn('Upgrade to Enterprise to save AI business tools.')
  isSaving.value = true
  try {
    const nextTools = appointmentsEnabled.value ? ['appointments', ...(depositsEnabled.value ? ['payments'] : [])] : []
    const nextToolsConfig = {
      ...(selectedAssistant.value.tools_config || {}),
      scheduling: {
        ...(selectedAssistant.value.tools_config?.scheduling || {}),
        mode: bookingMode.value,
        confirmation_mode: confirmationMode.value,
        provider: 'google_calendar',
        google_calendar_required: true,
      },
    }
    const { error } = await supabase.from('chatbots').update({ enabled_tools: nextTools, tools_config: nextToolsConfig }).eq('id', selectedAssistant.value.id).eq('user_id', userId.value)
    if (error) throw error
    assistants.value = assistants.value.map((assistant) => assistant.id === selectedAssistant.value.id ? { ...assistant, enabled_tools: nextTools, tools_config: nextToolsConfig } : assistant)
    notify.success('Tools saved. Connect Google Calendar before confirming real bookings.')
  } catch (err: any) {
    console.error('Failed to save tools:', err)
    notify.error(err?.message || 'Failed to save tools.')
  } finally {
    isSaving.value = false
  }
}

watch(selectedAssistantId, syncSelection)
onMounted(fetchAssistants)
</script>

<template>
  <div class="w-full overflow-x-hidden space-y-4 pb-12 xl:max-h-[calc(100vh-5.5rem)]">
    <NuxtLink to="/dashboard/agents" class="dashboard-back-link group">
      <ArrowLeft class="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
      Back to Assistants
    </NuxtLink>

    <section class="overflow-hidden rounded-[1.5rem] border border-foreground/10 bg-background-card p-4 shadow-sm md:p-5">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <span class="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">Tools command center</span>
          <h1 class="mt-3 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">Manage assistant actions at a glance.</h1>
          <p class="mt-1 max-w-3xl text-sm font-medium leading-relaxed text-foreground/55">Compact rows show booking, calendar, payment, and website-builder readiness without long cards. Open a row to edit in the side drawer.</p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <NuxtLink :to="selectedAssistant ? `/dashboard/agents/skills?id=${selectedAssistant.id}` : '/dashboard/agents/skills'" class="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-foreground/65 transition hover:bg-foreground/10 hover:text-foreground">
            Open skills
            <ArrowRight class="h-4 w-4" />
          </NuxtLink>
          <NuxtLink :to="calendarSetupLink" class="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary transition hover:bg-primary/15">
            Calendar setup
            <Settings2 class="h-4 w-4" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <section v-if="isLoading" class="rounded-2xl border border-foreground/10 bg-background-card p-8 text-center">
      <Loader2 class="mx-auto h-7 w-7 animate-spin text-primary" />
      <p class="mt-4 text-[10px] font-black uppercase tracking-widest text-foreground/45">Loading tools</p>
    </section>

    <section v-else-if="assistants.length === 0" class="rounded-2xl border border-dashed border-foreground/10 bg-background-card p-10 text-center">
      <Bot class="mx-auto mb-5 h-12 w-12 text-foreground/15" />
      <h2 class="text-xl font-black text-foreground">Create an assistant first</h2>
      <p class="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-foreground/50">Tools are assigned to an assistant. Create one, then return here to enable appointment and booking actions.</p>
      <NuxtLink to="/dashboard/agents" class="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-black">Open assistants</NuxtLink>
    </section>

    <div v-else class="grid gap-4 xl:grid-cols-[17rem_1fr]">
      <aside class="rounded-2xl border border-foreground/10 bg-background-card p-4 xl:sticky xl:top-24 xl:self-start">
        <label class="mb-3 block text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Assistant</label>
        <div class="relative">
          <select v-model="selectedAssistantId" class="w-full cursor-pointer appearance-none rounded-xl border border-foreground/10 bg-background px-4 py-3 pr-10 text-sm font-bold text-foreground focus:border-primary/40 focus:outline-none">
            <option v-for="assistant in assistants" :key="assistant.id" :value="assistant.id" class="bg-background">{{ assistant.name }}</option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
        </div>

        <div v-if="selectedAssistant" class="mt-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
          <p class="truncate text-sm font-bold text-foreground">{{ selectedAssistant.name }}</p>
          <p class="mt-1 text-[10px] font-bold uppercase tracking-widest text-foreground/45">{{ selectedAssistant.default_language || 'English' }} assistant</p>
          <div class="mt-4 grid grid-cols-2 gap-2">
            <div class="rounded-xl bg-foreground/5 p-3"><p class="text-sm font-black text-foreground">{{ toolStatusLabel }}</p><p class="text-[9px] font-black uppercase tracking-widest text-foreground/40">Bookings</p></div>
            <div class="rounded-xl bg-foreground/5 p-3"><p class="text-sm font-black text-foreground">{{ depositStatusLabel }}</p><p class="text-[9px] font-black uppercase tracking-widest text-foreground/40">Deposits</p></div>
          </div>
        </div>

        <button @click="saveTools" :disabled="!hasChanges || isSaving" class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Save tools
        </button>
      </aside>

      <main class="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section class="min-w-0 rounded-2xl border border-foreground/10 bg-background-card shadow-sm">
          <div class="flex flex-col gap-3 border-b border-foreground/10 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 class="text-base font-black tracking-tight text-foreground">Tools table</h2>
              <p class="text-xs font-medium text-foreground/45">{{ filteredToolRows.length }} visible · row details open in the drawer</p>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row">
              <label class="relative block sm:w-64">
                <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
                <input v-model="toolSearch" type="search" placeholder="Search tools or data" class="h-10 w-full rounded-xl border border-foreground/10 bg-background py-2 pl-9 pr-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/40" />
              </label>
              <select v-model="toolStatusFilter" class="h-10 rounded-xl border border-foreground/10 bg-background px-3 text-xs font-black uppercase tracking-widest text-foreground/60 outline-none focus:border-primary/40">
                <option v-for="status in toolStatuses" :key="status" :value="status">{{ status === 'all' ? 'All status' : status }}</option>
              </select>
              <select v-model="toolCategoryFilter" class="h-10 rounded-xl border border-foreground/10 bg-background px-3 text-xs font-black uppercase tracking-widest text-foreground/60 outline-none focus:border-primary/40">
                <option v-for="category in toolCategories" :key="category" :value="category">{{ category === 'all' ? 'All categories' : category }}</option>
              </select>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full min-w-[760px] text-left">
              <thead class="sticky top-0 z-10 bg-background-card text-[10px] font-black uppercase tracking-[0.18em] text-foreground/35">
                <tr class="border-b border-foreground/10">
                  <th class="px-4 py-3">Tool name</th>
                  <th class="px-4 py-3">Category</th>
                  <th class="px-4 py-3">Status</th>
                  <th class="px-4 py-3">Connected data</th>
                  <th class="px-4 py-3 text-right">Quick actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-foreground/10">
                <tr v-for="row in filteredToolRows" :key="row.id" :class="['group cursor-pointer transition hover:bg-primary/[0.03]', selectedToolId === row.id ? 'bg-primary/[0.05]' : '']" @click="selectedToolId = row.id">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div :class="['flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', selectedToolId === row.id ? 'bg-primary text-black' : 'bg-foreground/5 text-foreground/50']"><component :is="row.icon" class="h-4 w-4" /></div>
                      <div class="min-w-0">
                        <p class="truncate text-sm font-black text-foreground">{{ row.name }}</p>
                        <p class="text-[10px] font-bold uppercase tracking-widest text-foreground/35">{{ row.id }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-xs font-bold text-foreground/55">{{ row.category }}</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center gap-2 text-xs font-black text-foreground/70"><span :class="['h-2 w-2 rounded-full shadow-md', statusDotClass(row.tone)]" />{{ row.status }}</span>
                  </td>
                  <td class="max-w-[16rem] px-4 py-3"><p class="truncate text-xs font-semibold text-foreground/50">{{ row.connectedData }}</p></td>
                  <td class="px-4 py-3 text-right">
                    <button type="button" class="rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/60 transition hover:border-primary/30 hover:text-primary" @click.stop="handleToolAction(row.id)">{{ row.action }}</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <aside class="rounded-2xl border border-foreground/10 bg-background-card p-4 shadow-sm 2xl:sticky 2xl:top-24 2xl:max-h-[calc(100vh-8rem)] 2xl:overflow-y-auto">
          <div class="flex items-start justify-between gap-3 border-b border-foreground/10 pb-4">
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Detail drawer</p>
              <h2 class="mt-1 truncate text-lg font-black text-foreground">{{ selectedTool.name }}</h2>
              <p class="mt-1 truncate text-xs font-semibold text-foreground/45">{{ selectedTool.connectedData }}</p>
            </div>
            <span :class="['mt-1 h-2.5 w-2.5 rounded-full shadow-md', statusDotClass(selectedTool.tone)]" />
          </div>

          <div v-if="selectedTool.id === 'appointments'" class="space-y-4 pt-4">
            <p class="text-sm font-medium leading-relaxed text-foreground/55">One booking action tool for clinics, service businesses, guest houses, hotels, restaurants, lounges, and venues.</p>
            <button type="button" class="inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary px-4 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-50" :disabled="!isPremium" @click="enableAppointments">{{ appointmentsEnabled ? 'Disable tool' : 'Enable tool' }}</button>
            <div class="grid gap-2">
              <div v-for="capability in activeCapabilities" :key="capability.label" class="flex items-center justify-between rounded-xl border border-foreground/10 bg-foreground/[0.02] px-3 py-2">
                <span class="text-xs font-bold text-foreground/60">{{ capability.label }}</span>
                <span :class="['text-[10px] font-black uppercase tracking-widest', capability.enabled ? 'text-primary' : 'text-foreground/35']">{{ capability.enabled ? 'Ready' : 'Off' }}</span>
              </div>
            </div>
          </div>

          <div v-else-if="selectedTool.id === 'google_calendar'" class="space-y-4 pt-4">
            <p class="text-sm font-medium leading-relaxed text-foreground/55">Calendar details stay in this drawer so the table remains compact. Connect a calendar before live confirmations.</p>
            <NuxtLink :to="calendarSetupLink" class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 text-[10px] font-black uppercase tracking-widest text-primary transition hover:bg-primary/15">Manage calendar <ArrowRight class="h-4 w-4" /></NuxtLink>
            <div class="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3">
              <p class="text-[10px] font-black uppercase tracking-widest text-foreground/35">Mapping</p>
              <p class="mt-1 truncate text-sm font-bold text-foreground">{{ googleCalendarConnected ? googleCalendarLabel : 'Not connected' }}</p>
            </div>
          </div>

          <div v-else-if="selectedTool.id === 'deposits'" class="space-y-4 pt-4">
            <p class="text-sm font-medium leading-relaxed text-foreground/55">MTN/Airtel mobile payment remains contextual checkout only. Deposits require the appointments and bookings tool first.</p>
            <button type="button" class="inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary px-4 text-[10px] font-black uppercase tracking-widest text-black disabled:cursor-not-allowed disabled:opacity-50" :disabled="!isPremium || !appointmentsEnabled" @click="toggleDeposits">{{ depositsEnabled ? 'Disable deposits' : 'Enable deposits' }}</button>
          </div>

          <div v-else class="space-y-4 pt-4">
            <p class="text-sm font-medium leading-relaxed text-foreground/55">Enterprise-only website-builder controls stay inside Assistant Tools and open in their own workspace.</p>
            <NuxtLink :to="isPremium ? websiteBuilderLink : '/dashboard/pricing'" class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[10px] font-black uppercase tracking-widest text-black transition hover:opacity-90">
              {{ isPremium ? 'Open builder' : 'Upgrade' }}
              <ArrowRight class="h-4 w-4" />
            </NuxtLink>
          </div>

          <div v-if="selectedTool.id === 'appointments' && appointmentsEnabled" class="mt-5 space-y-4 border-t border-foreground/10 pt-4">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/35">Booking flow</p>
              <div class="mt-3 grid gap-2">
                <button v-for="mode in modeCards" :key="mode.id" type="button" :class="['rounded-xl border px-3 py-2 text-left transition', bookingMode === mode.id ? 'border-primary/40 bg-primary/10' : 'border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.04]']" @click="bookingMode = mode.id as any">
                  <div class="flex items-center gap-2">
                    <component :is="mode.icon" class="h-4 w-4 text-primary" />
                    <p class="truncate text-xs font-black text-foreground">{{ mode.title }}</p>
                    <Check v-if="bookingMode === mode.id" class="ml-auto h-4 w-4 text-primary" />
                  </div>
                </button>
              </div>
            </div>

            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/35">Confirmation</p>
              <div class="mt-3 grid grid-cols-2 gap-2">
                <button type="button" :class="['rounded-xl border px-3 py-2 text-left text-xs font-black transition', confirmationMode === 'manual' ? 'border-primary/40 bg-primary/10 text-foreground' : 'border-foreground/10 bg-foreground/[0.02] text-foreground/50']" @click="confirmationMode = 'manual'">Manual</button>
                <button type="button" :class="['rounded-xl border px-3 py-2 text-left text-xs font-black transition', confirmationMode === 'instant' ? 'border-primary/40 bg-primary/10 text-foreground' : 'border-foreground/10 bg-foreground/[0.02] text-foreground/50']" @click="confirmationMode = 'instant'">Instant</button>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  </div>
</template>
