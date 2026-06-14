<script setup lang="ts">
import { ArrowLeft, Calendar, CreditCard, MessageCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
const route = useRoute()
const supabase = useSupabaseClient() as any
const notify = useNotify()
const { userId } = useAuth()
const appointment = ref<any>(null)
const payments = ref<any[]>([])
const events = ref<any[]>([])
const isLoading = ref(true)
const isUpdating = ref('')
useHead({ title: 'Appointment Detail | ReplySuite' })

const fetchData = async () => {
  if (!userId.value) return
  isLoading.value = true
  const { data } = await supabase
    .from('chatbot_appointments')
    .select('*, chatbot:chatbots!inner(id,name,user_id), service:appointment_services(name,duration_minutes), staff:appointment_staff(name)')
    .eq('id', route.params.id)
    .eq('chatbot.user_id', userId.value)
    .maybeSingle()
  appointment.value = data
  if (data?.id) {
    const [{ data: payRows }, { data: eventRows }] = await Promise.all([
      supabase.from('chatbot_payments').select('*').eq('target_type', 'appointment').eq('target_id', data.id).order('created_at', { ascending: false }),
      supabase.from('appointment_status_events').select('*').eq('appointment_id', data.id).order('created_at', { ascending: false }),
    ])
    payments.value = payRows || []
    events.value = eventRows || []
  }
  isLoading.value = false
}

const updateStatus = async (status: string) => {
  if (!appointment.value?.id) return
  const labels: Record<string, string> = {
    approved: 'Approve this appointment?',
    rejected: 'Reject this appointment?',
    completed: 'Mark this appointment as completed?',
    no_show: 'Mark this customer as no-show?',
    cancelled: 'Cancel this appointment?',
  }
  if (!(await notify.confirm(labels[status] || `Move appointment to ${status}?`))) return
  isUpdating.value = status
  try {
    await $fetch(`/api/business/appointments/${appointment.value.id}/status`, { method: 'POST', body: { status } })
    notify.success('Appointment status updated.')
    await fetchData()
  } catch (err: any) {
    notify.error(err?.data?.statusMessage || err?.message || 'Could not update appointment.')
  } finally {
    isUpdating.value = ''
  }
}

onMounted(fetchData)
watch(() => userId.value, fetchData)
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value)) : 'Not set'
const statusLabel = (value: string) => value?.replaceAll('_', ' ') || 'unknown'
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 pb-20">
    <NuxtLink to="/dashboard/appointments" class="inline-flex items-center gap-2 text-xs font-bold text-foreground/55 transition hover:text-foreground"><ArrowLeft class="h-4 w-4" /> Back to appointments</NuxtLink>
    <div v-if="isLoading" class="h-64 animate-pulse rounded-2xl bg-foreground/5" />
    <div v-else-if="!appointment" class="rounded-2xl border border-foreground/8 bg-background-card p-10 text-center text-sm text-foreground/55">Appointment not found.</div>
    <template v-else>
      <div class="rounded-2xl border border-foreground/8 bg-background-card p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Appointment</p>
            <h1 class="mt-2 text-2xl font-black tracking-tight text-foreground">{{ appointment.customer_name || 'Unnamed customer' }}</h1>
            <p class="mt-2 text-sm text-foreground/55">{{ appointment.service?.name || 'General appointment' }} · {{ appointment.chatbot?.name }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button v-if="['pending','paid_pending_approval'].includes(appointment.status)" class="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-black text-white disabled:opacity-50" :disabled="!!isUpdating" @click="updateStatus('approved')"><Loader2 v-if="isUpdating === 'approved'" class="h-4 w-4 animate-spin" /><CheckCircle2 v-else class="h-4 w-4" /> Approve</button>
            <button v-if="['pending','paid_pending_approval'].includes(appointment.status)" class="inline-flex h-10 items-center gap-2 rounded-xl border border-red-500/20 px-4 text-xs font-black text-red-500 disabled:opacity-50" :disabled="!!isUpdating" @click="updateStatus('rejected')"><XCircle class="h-4 w-4" /> Reject</button>
            <button v-if="appointment.status === 'approved'" class="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-black disabled:opacity-50" :disabled="!!isUpdating" @click="updateStatus('completed')">Complete</button>
            <button v-if="appointment.status === 'approved'" class="inline-flex h-10 items-center gap-2 rounded-xl border border-foreground/10 px-4 text-xs font-black text-foreground/65 disabled:opacity-50" :disabled="!!isUpdating" @click="updateStatus('no_show')">No-show</button>
          </div>
        </div>
      </div>
      <div class="grid gap-4 lg:grid-cols-3">
        <section class="rounded-2xl border border-foreground/8 bg-background-card p-5 lg:col-span-2">
          <div class="mb-4 flex items-center gap-2"><Calendar class="h-5 w-5 text-primary" /><h2 class="text-sm font-black">Booking details</h2></div>
          <dl class="grid gap-4 sm:grid-cols-2">
            <div><dt class="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Time</dt><dd class="mt-1 text-sm font-bold">{{ formatDate(appointment.appointment_start || appointment.appointment_time) }}</dd></div>
            <div><dt class="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Status</dt><dd class="mt-1 text-sm font-bold capitalize">{{ statusLabel(appointment.status) }}</dd></div>
            <div><dt class="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Phone</dt><dd class="mt-1 text-sm font-bold">{{ appointment.customer_phone || '—' }}</dd></div>
            <div><dt class="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Staff</dt><dd class="mt-1 text-sm font-bold">{{ appointment.staff?.name || 'Any available staff' }}</dd></div>
            <div><dt class="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Channel</dt><dd class="mt-1 text-sm font-bold capitalize">{{ appointment.source_channel }}</dd></div>
            <div><dt class="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Email</dt><dd class="mt-1 text-sm font-bold">{{ appointment.customer_email || '—' }}</dd></div>
          </dl>
          <p v-if="appointment.notes" class="mt-5 rounded-xl border border-foreground/8 bg-foreground/[0.02] p-4 text-sm text-foreground/60">{{ appointment.notes }}</p>
        </section>
        <section class="rounded-2xl border border-foreground/8 bg-background-card p-5">
          <div class="mb-4 flex items-center gap-2"><CreditCard class="h-5 w-5 text-primary" /><h2 class="text-sm font-black">Payment</h2></div>
          <p class="text-2xl font-black">{{ Number(appointment.deposit_amount || 0).toLocaleString() }} {{ appointment.currency }}</p>
          <p class="mt-1 text-xs capitalize text-foreground/45">{{ statusLabel(appointment.payment_status) }}</p>
          <div class="mt-4 space-y-2">
            <div v-for="payment in payments" :key="payment.id" class="rounded-xl border border-foreground/8 p-3 text-xs text-foreground/55">{{ payment.status }} · {{ payment.provider_ref || payment.id }}</div>
            <p v-if="payments.length === 0" class="text-xs text-foreground/40">No payment requests yet.</p>
          </div>
        </section>
      </div>
      <section class="rounded-2xl border border-foreground/8 bg-background-card p-5">
        <h2 class="mb-4 text-sm font-black">Timeline</h2>
        <div class="space-y-2">
          <div v-for="event in events" :key="event.id" class="rounded-xl border border-foreground/8 p-3 text-xs text-foreground/55"><strong class="capitalize text-foreground">{{ statusLabel(event.status_to) }}</strong><span v-if="event.status_from"> from {{ statusLabel(event.status_from) }}</span> · {{ formatDate(event.created_at) }}</div>
          <p v-if="events.length === 0" class="text-xs text-foreground/40">No status events yet.</p>
        </div>
      </section>
      <NuxtLink v-if="appointment.session_id" :to="`/dashboard/conversations?session=${appointment.session_id}`" class="inline-flex items-center gap-2 rounded-xl border border-foreground/10 px-4 py-3 text-xs font-bold text-foreground/60 hover:text-foreground"><MessageCircle class="h-4 w-4" /> Open conversation</NuxtLink>
    </template>
  </div>
</template>
