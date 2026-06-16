<script setup lang="ts">
import { Calendar, Plus, Trash2, Loader2, ArrowLeft, Users, Clock } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
useHead({ title: 'Appointment Settings | ReplySuite' })

const supabase = useSupabaseClient() as any
const route = useRoute()
const notify = useNotify()
const { userId } = useAuth()
const isLoading = ref(true)
const isSavingService = ref(false)
const isSavingStaff = ref(false)
const isSavingRule = ref(false)
const googleCalendarConnected = ref(false)
const googleCalendarStatus = ref<any>(null)
const isCheckingGoogle = ref(false)
const chatbots = ref<any[]>([])
const services = ref<any[]>([])
const staff = ref<any[]>([])
const rules = ref<any[]>([])
const selectedChatbotId = ref('')
const serviceDraft = ref({ name: '', description: '', duration_minutes: 30, price: 0, currency: 'RWF' })
const staffDraft = ref({ name: '', role: '', phone: '', email: '' })
const ruleDraft = ref({ staff_id: '', weekday: 1, start_time: '09:00', end_time: '17:00', timezone: 'Africa/Kigali' })

const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const selectedBot = computed(() => chatbots.value.find((bot) => bot.id === selectedChatbotId.value))
const googleCalendarLabel = computed(() => googleCalendarStatus.value?.mapping?.calendar_summary || googleCalendarStatus.value?.connection?.google_email || 'Google Calendar')

const fetchGoogleStatus = async () => {
  if (!selectedChatbotId.value) return
  isCheckingGoogle.value = true
  try {
    const status = await $fetch('/api/google/calendar/status', { query: { chatbotId: selectedChatbotId.value } })
    googleCalendarStatus.value = status
    googleCalendarConnected.value = Boolean((status as any)?.connected)
  } catch (err) {
    console.error('Failed to check Google Calendar status:', err)
    googleCalendarStatus.value = null
    googleCalendarConnected.value = false
  } finally {
    isCheckingGoogle.value = false
  }
}

const connectGoogleCalendar = async () => {
  if (!selectedChatbotId.value) return notify.warn('Choose an assistant before connecting Google Calendar.')
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token
    const res = await $fetch<{ url: string }>('/api/google/oauth/start', {
      method: 'POST',
      query: { chatbotId: selectedChatbotId.value },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })
    window.location.href = res.url
  } catch (err: any) {
    notify.error(err?.data?.statusMessage || err?.message || 'Could not start Google Calendar connection.')
  }
}

const fetchData = async () => {
  if (!userId.value) return
  isLoading.value = true
  try {
    const { data: bots } = await supabase.from('chatbots').select('id,name,enabled_tools').eq('user_id', userId.value).is('deleted_at', null).order('created_at', { ascending: false })
    chatbots.value = bots || []
    selectedChatbotId.value ||= chatbots.value.find((bot) => (bot.enabled_tools || []).includes('appointments'))?.id || chatbots.value[0]?.id || ''
    await fetchSetup()
  } finally {
    isLoading.value = false
  }
}

const fetchSetup = async () => {
  if (!selectedChatbotId.value) return
  await fetchGoogleStatus()
  const [{ data: serviceRows }, { data: staffRows }, { data: ruleRows }] = await Promise.all([
    supabase.from('appointment_services').select('*').eq('chatbot_id', selectedChatbotId.value).order('sort_order', { ascending: true }),
    supabase.from('appointment_staff').select('*').eq('chatbot_id', selectedChatbotId.value).order('created_at', { ascending: true }),
    supabase.from('appointment_availability_rules').select('*, staff:appointment_staff(name)').eq('chatbot_id', selectedChatbotId.value).order('weekday', { ascending: true }).order('start_time', { ascending: true }),
  ])
  services.value = serviceRows || []
  staff.value = staffRows || []
  rules.value = ruleRows || []
}

watch(selectedChatbotId, fetchSetup)
onMounted(async () => {
  if (route.query.google === 'connected') notify.success('Google Calendar connected.')
  if (route.query.google === 'error') notify.error(`Google Calendar connection failed: ${route.query.reason || 'Unknown error'}`)
  await fetchData()
})

const addService = async () => {
  if (!selectedChatbotId.value || !serviceDraft.value.name.trim()) return notify.warn('Choose an assistant and add a service name.')
  isSavingService.value = true
  try {
    const { error } = await supabase.from('appointment_services').insert({ chatbot_id: selectedChatbotId.value, ...serviceDraft.value, name: serviceDraft.value.name.trim() })
    if (error) throw error
    notify.success('Appointment service added.')
    serviceDraft.value = { name: '', description: '', duration_minutes: 30, price: 0, currency: 'RWF' }
    await fetchSetup()
  } catch (err: any) { notify.error(err.message || 'Could not add service.') }
  finally { isSavingService.value = false }
}

const addStaff = async () => {
  if (!selectedChatbotId.value || !staffDraft.value.name.trim()) return notify.warn('Add a staff/team member name.')
  isSavingStaff.value = true
  try {
    const { error } = await supabase.from('appointment_staff').insert({ chatbot_id: selectedChatbotId.value, ...staffDraft.value, name: staffDraft.value.name.trim() })
    if (error) throw error
    notify.success('Staff member added.')
    staffDraft.value = { name: '', role: '', phone: '', email: '' }
    await fetchSetup()
  } catch (err: any) { notify.error(err.message || 'Could not add staff.') }
  finally { isSavingStaff.value = false }
}

const addRule = async () => {
  if (!selectedChatbotId.value) return notify.warn('Choose an assistant first.')
  isSavingRule.value = true
  try {
    const payload = { chatbot_id: selectedChatbotId.value, ...ruleDraft.value, staff_id: ruleDraft.value.staff_id || null }
    const { error } = await supabase.from('appointment_availability_rules').insert(payload)
    if (error) throw error
    notify.success('Availability rule added.')
    await fetchSetup()
  } catch (err: any) { notify.error(err.message || 'Could not add availability.') }
  finally { isSavingRule.value = false }
}

const removeRow = async (table: string, id: string, message: string) => {
  if (!(await notify.confirm(message))) return
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) notify.error(error.message)
  else { notify.success('Removed.'); await fetchSetup() }
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 pb-20">
    <NuxtLink to="/dashboard/appointments" class="inline-flex items-center gap-2 text-xs font-bold text-foreground/55 transition hover:text-foreground"><ArrowLeft class="h-4 w-4" /> Back to appointments</NuxtLink>
    <div>
      <p class="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Scheduling setup</p>
      <h1 class="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">Appointment settings</h1>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/58">Connect Google Calendar, then set services, staff, and availability before your assistant requests an appointment or booking. Works for lounges, clinics, salons, offices, schools, agencies, studios, and service desks.</p>
    </div>

    <section class="rounded-2xl border border-primary/15 bg-primary/[0.04] p-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-start gap-4">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-black"><Calendar class="h-5 w-5" /></div>
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Google Calendar required</p>
            <h2 class="mt-1 text-base font-black text-foreground">Bookings are managed from your connected Google Calendar.</h2>
            <p class="mt-1 max-w-3xl text-sm font-medium leading-relaxed text-foreground/55">The assistant will use Google Calendar free/busy checks before confirming slots, then create, reschedule, or cancel calendar events server-side. ReplySuite keeps the customer record and audit trail.</p>
            <p v-if="googleCalendarConnected" class="mt-2 text-xs font-black uppercase tracking-widest text-primary">Connected: {{ googleCalendarLabel }}</p>
            <p v-else-if="isCheckingGoogle" class="mt-2 text-xs font-black uppercase tracking-widest text-foreground/45">Checking Google connection…</p>
          </div>
        </div>
        <button type="button" class="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 px-5 text-[10px] font-black uppercase tracking-widest text-primary transition hover:bg-primary/15" @click="connectGoogleCalendar">
          {{ googleCalendarConnected ? 'Google connected' : 'Connect Google Calendar' }}
        </button>
      </div>
    </section>

    <section class="rounded-2xl border border-foreground/8 bg-background-card p-5">
      <label class="mb-2 block text-[10px] font-black uppercase tracking-widest text-foreground/45">Assistant</label>
      <select v-model="selectedChatbotId" class="h-11 w-full rounded-xl border border-foreground/10 bg-background px-3 text-sm outline-none focus:border-primary/40">
        <option v-for="bot in chatbots" :key="bot.id" :value="bot.id">{{ bot.name }}{{ (bot.enabled_tools || []).includes('appointments') ? '' : ' — appointments not enabled' }}</option>
      </select>
      <p v-if="selectedBot && !(selectedBot.enabled_tools || []).includes('appointments')" class="mt-3 rounded-xl border border-orange-500/15 bg-orange-500/5 p-3 text-xs text-orange-500/75">This assistant can store scheduling setup, but customers cannot book until Appointments & bookings is enabled on the assistant Tools page.</p>
    </section>

    <div v-if="isLoading" class="h-48 animate-pulse rounded-2xl bg-foreground/5" />
    <template v-else>
      <section class="rounded-2xl border border-foreground/8 bg-background-card p-5">
        <div class="mb-5 flex items-center gap-3"><Calendar class="h-5 w-5 text-primary" /><h2 class="text-sm font-black text-foreground">Services customers can book</h2></div>
        <div class="grid gap-3 lg:grid-cols-12">
          <input v-model="serviceDraft.name" class="h-11 rounded-xl border border-foreground/10 bg-background px-3 text-sm outline-none focus:border-primary/40 lg:col-span-3" placeholder="Consultation" />
          <input v-model="serviceDraft.description" class="h-11 rounded-xl border border-foreground/10 bg-background px-3 text-sm outline-none focus:border-primary/40 lg:col-span-4" placeholder="Short description" />
          <input v-model.number="serviceDraft.duration_minutes" type="number" class="h-11 rounded-xl border border-foreground/10 bg-background px-3 text-sm outline-none focus:border-primary/40 lg:col-span-2" placeholder="30" />
          <input v-model.number="serviceDraft.price" type="number" class="h-11 rounded-xl border border-foreground/10 bg-background px-3 text-sm outline-none focus:border-primary/40 lg:col-span-2" placeholder="Price" />
          <button class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-black disabled:opacity-50 lg:col-span-1" :disabled="isSavingService" @click="addService"><Loader2 v-if="isSavingService" class="h-4 w-4 animate-spin" /><Plus v-else class="h-4 w-4" /></button>
        </div>
        <div class="mt-5 divide-y divide-foreground/8">
          <div v-if="services.length === 0" class="rounded-2xl border border-dashed border-foreground/10 py-10 text-center text-xs text-foreground/45">No services yet.</div>
          <div v-for="service in services" :key="service.id" class="flex items-center justify-between gap-3 py-3">
            <div><p class="text-sm font-black text-foreground">{{ service.name }}</p><p class="text-xs text-foreground/45">{{ service.duration_minutes }} min · {{ Number(service.price || 0).toLocaleString() }} {{ service.currency }}</p></div>
            <button class="rounded-lg p-2 text-foreground/35 transition hover:bg-red-500/10 hover:text-red-500" @click="removeRow('appointment_services', service.id, 'Remove this appointment service?')"><Trash2 class="h-4 w-4" /></button>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-foreground/8 bg-background-card p-5">
        <div class="mb-5 flex items-center gap-3"><Users class="h-5 w-5 text-primary" /><h2 class="text-sm font-black text-foreground">Staff or teams</h2></div>
        <div class="grid gap-3 lg:grid-cols-12">
          <input v-model="staffDraft.name" class="h-11 rounded-xl border border-foreground/10 bg-background px-3 text-sm outline-none focus:border-primary/40 lg:col-span-3" placeholder="Staff/team name" />
          <input v-model="staffDraft.role" class="h-11 rounded-xl border border-foreground/10 bg-background px-3 text-sm outline-none focus:border-primary/40 lg:col-span-3" placeholder="Role" />
          <input v-model="staffDraft.phone" class="h-11 rounded-xl border border-foreground/10 bg-background px-3 text-sm outline-none focus:border-primary/40 lg:col-span-2" placeholder="Phone" />
          <input v-model="staffDraft.email" class="h-11 rounded-xl border border-foreground/10 bg-background px-3 text-sm outline-none focus:border-primary/40 lg:col-span-3" placeholder="Email" />
          <button class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-black disabled:opacity-50 lg:col-span-1" :disabled="isSavingStaff" @click="addStaff"><Loader2 v-if="isSavingStaff" class="h-4 w-4 animate-spin" /><Plus v-else class="h-4 w-4" /></button>
        </div>
        <div class="mt-5 divide-y divide-foreground/8">
          <div v-if="staff.length === 0" class="rounded-2xl border border-dashed border-foreground/10 py-10 text-center text-xs text-foreground/45">No staff yet. Availability can still apply to anyone.</div>
          <div v-for="member in staff" :key="member.id" class="flex items-center justify-between gap-3 py-3">
            <div><p class="text-sm font-black text-foreground">{{ member.name }}</p><p class="text-xs text-foreground/45">{{ member.role || 'Team member' }} · {{ member.phone || member.email || 'No contact' }}</p></div>
            <button class="rounded-lg p-2 text-foreground/35 transition hover:bg-red-500/10 hover:text-red-500" @click="removeRow('appointment_staff', member.id, 'Remove this staff member?')"><Trash2 class="h-4 w-4" /></button>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-foreground/8 bg-background-card p-5">
        <div class="mb-5 flex items-center gap-3"><Clock class="h-5 w-5 text-primary" /><h2 class="text-sm font-black text-foreground">Availability rules</h2></div>
        <div class="grid gap-3 lg:grid-cols-12">
          <select v-model="ruleDraft.staff_id" class="h-11 rounded-xl border border-foreground/10 bg-background px-3 text-sm outline-none focus:border-primary/40 lg:col-span-3"><option value="">Any staff</option><option v-for="member in staff" :key="member.id" :value="member.id">{{ member.name }}</option></select>
          <select v-model.number="ruleDraft.weekday" class="h-11 rounded-xl border border-foreground/10 bg-background px-3 text-sm outline-none focus:border-primary/40 lg:col-span-2"><option v-for="(day, idx) in weekdayLabels" :key="day" :value="idx">{{ day }}</option></select>
          <input v-model="ruleDraft.start_time" type="time" class="h-11 rounded-xl border border-foreground/10 bg-background px-3 text-sm outline-none focus:border-primary/40 lg:col-span-2" />
          <input v-model="ruleDraft.end_time" type="time" class="h-11 rounded-xl border border-foreground/10 bg-background px-3 text-sm outline-none focus:border-primary/40 lg:col-span-2" />
          <input v-model="ruleDraft.timezone" class="h-11 rounded-xl border border-foreground/10 bg-background px-3 text-sm outline-none focus:border-primary/40 lg:col-span-2" />
          <button class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-black disabled:opacity-50 lg:col-span-1" :disabled="isSavingRule" @click="addRule"><Loader2 v-if="isSavingRule" class="h-4 w-4 animate-spin" /><Plus v-else class="h-4 w-4" /></button>
        </div>
        <div class="mt-5 divide-y divide-foreground/8">
          <div v-if="rules.length === 0" class="rounded-2xl border border-dashed border-foreground/10 py-10 text-center text-xs text-foreground/45">No availability yet. The assistant will collect preferred times instead of promising slots.</div>
          <div v-for="rule in rules" :key="rule.id" class="flex items-center justify-between gap-3 py-3">
            <div><p class="text-sm font-black text-foreground">{{ weekdayLabels[rule.weekday] }} · {{ rule.start_time }}–{{ rule.end_time }}</p><p class="text-xs text-foreground/45">{{ rule.staff?.name || 'Any staff' }} · {{ rule.timezone }}</p></div>
            <button class="rounded-lg p-2 text-foreground/35 transition hover:bg-red-500/10 hover:text-red-500" @click="removeRow('appointment_availability_rules', rule.id, 'Remove this availability rule?')"><Trash2 class="h-4 w-4" /></button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
