<script setup lang="ts">
import { ArrowLeft, ArrowRight, Bot, Building2, CalendarCheck2, CalendarDays, Check, ChevronDown, Clock3, CreditCard, Crown, Globe2, Hotel, Loader2, RefreshCcw, Save, Settings2, ShieldCheck, Stethoscope, XCircle } from 'lucide-vue-next'

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
  <div class="w-full overflow-x-hidden space-y-5 pb-24">
    <NuxtLink to="/dashboard/agents" class="dashboard-back-link group">
      <ArrowLeft class="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
      Back to Assistants
    </NuxtLink>

    <section class="overflow-hidden rounded-[1.75rem] border border-foreground/10 bg-background-card p-5 shadow-sm md:p-7">
      <div class="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <span class="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">Tools</span>
          <h1 class="mt-4 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">Enable Google Calendar bookings.</h1>
          <p class="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-foreground/55">Tools are actions your assistant can perform. ReplySuite now focuses on one business action tool: appointments and bookings powered by Google Calendar, with cancellation, rescheduling, and optional deposit checkout.</p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <NuxtLink :to="selectedAssistant ? `/dashboard/agents/skills?id=${selectedAssistant.id}` : '/dashboard/agents/skills'" class="inline-flex items-center justify-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/65 transition hover:bg-foreground/10 hover:text-foreground">
            Open skills
            <ArrowRight class="h-4 w-4" />
          </NuxtLink>
          <NuxtLink :to="isPremium ? websiteBuilderLink : '/dashboard/pricing'" class="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-primary transition hover:bg-primary/15">
            Website builder
            <Crown class="h-4 w-4" />
          </NuxtLink>
          <NuxtLink :to="calendarSetupLink" class="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-primary transition hover:bg-primary/15">
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

    <div v-else class="grid gap-5 xl:grid-cols-[19rem_1fr]">
      <aside class="rounded-2xl border border-foreground/10 bg-background-card p-5 xl:sticky xl:top-24 xl:self-start">
        <label class="mb-3 block text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Assistant</label>
        <div class="relative">
          <select v-model="selectedAssistantId" class="w-full cursor-pointer appearance-none rounded-xl border border-foreground/10 bg-background px-4 py-3 pr-10 text-sm font-bold text-foreground focus:border-primary/40 focus:outline-none">
            <option v-for="assistant in assistants" :key="assistant.id" :value="assistant.id" class="bg-background">{{ assistant.name }}</option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
        </div>

        <div v-if="selectedAssistant" class="mt-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
          <p class="text-sm font-bold text-foreground">{{ selectedAssistant.name }}</p>
          <p class="mt-1 text-[10px] font-bold uppercase tracking-widest text-foreground/45">{{ selectedAssistant.default_language || 'English' }} assistant</p>
          <div class="mt-4 grid grid-cols-2 gap-2">
            <div class="rounded-xl bg-foreground/5 p-3"><p class="text-lg font-black text-foreground">{{ toolStatusLabel }}</p><p class="text-[9px] font-black uppercase tracking-widest text-foreground/40">Bookings</p></div>
            <div class="rounded-xl bg-foreground/5 p-3"><p class="text-lg font-black text-foreground">{{ depositStatusLabel }}</p><p class="text-[9px] font-black uppercase tracking-widest text-foreground/40">Deposits</p></div>
          </div>
          <div v-if="googleCalendarConnected" class="mt-3 rounded-xl border border-primary/15 bg-primary/10 p-3">
            <p class="text-[9px] font-black uppercase tracking-widest text-primary">Google Calendar connected</p>
            <p class="mt-1 truncate text-xs font-bold text-foreground">{{ googleCalendarLabel }}</p>
            <p class="mt-1 truncate text-[10px] font-medium text-foreground/45">Chatbot ID: {{ selectedAssistant.id }}</p>
          </div>
        </div>

        <button @click="saveTools" :disabled="!hasChanges || isSaving" class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Save tools
        </button>
      </aside>

      <main class="space-y-5">
        <section v-if="!isPremium" class="rounded-2xl border border-primary/15 bg-primary/[0.05] p-5">
          <p class="text-xs font-black uppercase tracking-widest text-primary">Enterprise booking tools</p>
          <p class="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-foreground/60">Google Calendar appointments, bookings, cancellation, rescheduling, and booking deposits are available on Enterprise.</p>
          <NuxtLink to="/dashboard/pricing" class="mt-4 inline-flex rounded-xl bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black">Upgrade to Enterprise</NuxtLink>
        </section>

        <section class="rounded-2xl border border-primary/15 bg-background-card p-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-start gap-4">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Globe2 class="h-6 w-6" /></div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-lg font-black tracking-tight text-foreground">Enterprise website builder</h2>
                  <span class="rounded-full bg-primary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-primary">Enterprise only</span>
                </div>
                <p class="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-foreground/55">Open the website builder control room for requested websites, private build jobs, bot working status, media assets, advance-payment readiness, and the connected website execution agent.</p>
              </div>
            </div>
            <NuxtLink :to="isPremium ? websiteBuilderLink : '/dashboard/pricing'" class="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[10px] font-black uppercase tracking-widest text-black transition hover:opacity-90">
              {{ isPremium ? 'Open builder' : 'Upgrade' }}
              <ArrowRight class="h-4 w-4" />
            </NuxtLink>
          </div>
        </section>

        <section class="rounded-2xl border border-foreground/10 bg-background-card p-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="flex items-start gap-4">
              <div :class="['flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', appointmentsEnabled ? 'bg-primary text-black' : 'bg-foreground/5 text-foreground/45']"><CalendarDays class="h-6 w-6" /></div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-lg font-black tracking-tight text-foreground">Appointments & bookings</h2>
                  <span :class="['rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest', appointmentsEnabled ? 'bg-primary/10 text-primary' : 'bg-foreground/5 text-foreground/40']">{{ appointmentsEnabled ? 'Enabled' : 'Disabled' }}</span>
                </div>
                <p class="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-foreground/55">One booking tool for clinics, service businesses, guest houses, hotels, restaurants, lounges, and venues. The assistant can collect booking details, request appointments, and use Google Calendar actions after this chatbot has a connected calendar.</p>
                <p v-if="isCheckingGoogle" class="mt-2 text-xs font-black uppercase tracking-widest text-foreground/40">Checking calendar mapping…</p>
                <p v-else-if="!appointmentsEnabled" class="mt-2 text-xs font-bold leading-relaxed text-foreground/40">Enable this tool to configure booking flow, confirmation mode, deposits, and calendar-backed actions.</p>
              </div>
            </div>
            <button type="button" class="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-5 text-[10px] font-black uppercase tracking-widest text-black transition hover:opacity-90 disabled:opacity-50" :disabled="!isPremium" @click="enableAppointments">
              {{ appointmentsEnabled ? 'Disable tool' : 'Enable tool' }}
            </button>
          </div>

          <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div v-for="capability in activeCapabilities" :key="capability.label" class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
              <component :is="capability.icon" :class="['h-5 w-5', capability.enabled ? 'text-primary' : 'text-foreground/25']" />
              <p class="mt-3 text-xs font-black uppercase tracking-wider text-foreground">{{ capability.label }}</p>
              <p :class="['mt-1 text-[10px] font-black uppercase tracking-widest', capability.enabled ? 'text-primary' : 'text-foreground/35']">{{ capability.enabled ? 'Ready' : 'Off' }}</p>
            </div>
          </div>
        </section>

        <section v-if="!appointmentsEnabled" class="rounded-2xl border border-dashed border-foreground/10 bg-background-card p-6 text-center">
          <CalendarDays class="mx-auto h-10 w-10 text-foreground/20" />
          <h2 class="mt-4 text-lg font-black tracking-tight text-foreground">Booking settings are paused</h2>
          <p class="mx-auto mt-2 max-w-2xl text-sm font-medium leading-relaxed text-foreground/50">Turn on Appointments & bookings above before editing booking flow, confirmation mode, deposit checkout, or calendar behavior. Saved settings stay preserved while the tool is disabled.</p>
        </section>

        <template v-else>
        <section class="rounded-2xl border border-foreground/10 bg-background-card p-5">
          <div class="mb-4">
            <h2 class="text-lg font-black tracking-tight text-foreground">Choose the booking flow</h2>
            <p class="mt-1 text-sm font-medium text-foreground/50">This changes how the assistant frames questions. Calendar availability and event creation only turn on after the selected chatbot has a connected Google Calendar.</p>
          </div>
          <div class="grid gap-3 lg:grid-cols-3">
            <button v-for="mode in modeCards" :key="mode.id" type="button" :class="['rounded-2xl border p-4 text-left transition', bookingMode === mode.id ? 'border-primary/40 bg-primary/10 shadow-sm shadow-primary/5' : 'border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.04]']" @click="bookingMode = mode.id as any">
              <div class="flex items-start gap-3">
                <div :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', bookingMode === mode.id ? 'bg-primary text-black' : 'bg-foreground/5 text-foreground/50']"><component :is="mode.icon" class="h-5 w-5" /></div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-black text-foreground">{{ mode.title }}</p>
                    <Check v-if="bookingMode === mode.id" class="ml-auto h-4 w-4 text-primary" />
                  </div>
                  <p class="mt-2 text-xs font-medium leading-relaxed text-foreground/50">{{ mode.desc }}</p>
                </div>
              </div>
              <div class="mt-4 flex flex-wrap gap-1.5">
                <span v-for="example in mode.examples" :key="example" class="rounded-full bg-foreground/5 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-foreground/45">{{ example }}</span>
              </div>
            </button>
          </div>
        </section>

        <section class="grid gap-5 lg:grid-cols-2">
          <div class="rounded-2xl border border-foreground/10 bg-background-card p-5">
            <h2 class="text-lg font-black tracking-tight text-foreground">Confirmation mode</h2>
            <p class="mt-1 text-sm font-medium leading-relaxed text-foreground/50">Choose whether normal bookings can be confirmed immediately after Google Calendar availability is checked, or whether staff must approve first.</p>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" :class="['rounded-2xl border p-4 text-left transition', confirmationMode === 'manual' ? 'border-primary/40 bg-primary/10' : 'border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.04]']" @click="confirmationMode = 'manual'">
                <ShieldCheck class="h-5 w-5 text-primary" />
                <p class="mt-3 text-sm font-black text-foreground">Manual approval</p>
                <p class="mt-1 text-xs font-medium text-foreground/50">Safest for clinics, hotels, events, private rooms, and high-value bookings.</p>
              </button>
              <button type="button" :class="['rounded-2xl border p-4 text-left transition', confirmationMode === 'instant' ? 'border-primary/40 bg-primary/10' : 'border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.04]']" @click="confirmationMode = 'instant'">
                <CalendarCheck2 class="h-5 w-5 text-primary" />
                <p class="mt-3 text-sm font-black text-foreground">Instant when available</p>
                <p class="mt-1 text-xs font-medium text-foreground/50">Useful for standard table reservations or simple service slots.</p>
              </button>
            </div>
          </div>

          <div class="rounded-2xl border border-foreground/10 bg-background-card p-5">
            <h2 class="text-lg font-black tracking-tight text-foreground">Optional deposits</h2>
            <p class="mt-1 text-sm font-medium leading-relaxed text-foreground/50">MTN/Airtel mobile payment remains contextual checkout only. The assistant can request deposits only for existing appointment or booking records verified by the server.</p>
            <button type="button" :disabled="!isPremium || !appointmentsEnabled" :class="['mt-4 flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50', depositsEnabled ? 'border-primary/40 bg-primary/10' : 'border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.04]']" @click="toggleDeposits">
              <div :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', depositsEnabled ? 'bg-primary text-black' : 'bg-foreground/5 text-foreground/50']"><CreditCard class="h-5 w-5" /></div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2"><p class="text-sm font-black text-foreground">Booking deposit checkout</p><Check v-if="depositsEnabled" class="ml-auto h-4 w-4 text-primary" /></div>
                <p class="mt-1 text-xs font-medium leading-relaxed text-foreground/50">Enable only when your team needs deposits for appointments, rooms, tables, or private bookings.</p>
              </div>
            </button>
          </div>
        </section>

        </template>

        <section v-if="appointmentsEnabled && googleCalendarConnected" class="rounded-2xl border border-primary/15 bg-primary/[0.04] p-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Connected Google Calendar</p>
              <h2 class="mt-1 text-base font-black text-foreground">{{ googleCalendarLabel }}</h2>
              <p class="mt-1 max-w-3xl text-sm font-medium leading-relaxed text-foreground/55">This calendar is mapped to chatbot ID <span class="font-black text-foreground/75">{{ selectedAssistantId }}</span>. ReplySuite will use it for availability checks and event sync when booking actions run.</p>
            </div>
            <NuxtLink :to="calendarSetupLink" class="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-5 text-[10px] font-black uppercase tracking-widest text-primary transition hover:bg-primary/15">
              Manage calendar
              <ArrowRight class="h-4 w-4" />
            </NuxtLink>
          </div>
        </section>

        <section v-else-if="appointmentsEnabled" class="rounded-2xl border border-orange-500/15 bg-orange-500/[0.04] p-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-orange-500">Calendar not connected</p>
              <h2 class="mt-1 text-base font-black text-foreground">Connect Google Calendar for this chatbot before live confirmations.</h2>
              <p class="mt-1 max-w-3xl text-sm font-medium leading-relaxed text-foreground/55">The tools page will only show a connected Google Calendar after the selected chatbot has a saved calendar mapping. Current chatbot ID: <span class="font-black text-foreground/75">{{ selectedAssistantId }}</span>.</p>
            </div>
            <NuxtLink :to="calendarSetupLink" class="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-orange-500/25 bg-orange-500/10 px-5 text-[10px] font-black uppercase tracking-widest text-orange-500 transition hover:bg-orange-500/15">
              Connect calendar
              <ArrowRight class="h-4 w-4" />
            </NuxtLink>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>
