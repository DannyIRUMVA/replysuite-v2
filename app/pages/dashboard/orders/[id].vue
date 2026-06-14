<script setup lang="ts">
import { ArrowLeft, ShoppingBag, CreditCard, MessageCircle, Loader2, CheckCircle2, XCircle, Truck } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
const route = useRoute()
const supabase = useSupabaseClient() as any
const notify = useNotify()
const { userId } = useAuth()
const order = ref<any>(null)
const items = ref<any[]>([])
const payments = ref<any[]>([])
const events = ref<any[]>([])
const isLoading = ref(true)
const isUpdating = ref('')
useHead({ title: 'Order Detail | ReplySuite' })

const fetchData = async () => {
  if (!userId.value) return
  isLoading.value = true
  const { data } = await supabase
    .from('chatbot_orders')
    .select('*, chatbot:chatbots!inner(id,name,user_id)')
    .eq('id', route.params.id)
    .eq('chatbot.user_id', userId.value)
    .maybeSingle()
  order.value = data
  if (data?.id) {
    const [{ data: itemRows }, { data: payRows }, { data: eventRows }] = await Promise.all([
      supabase.from('chatbot_order_items').select('*').eq('order_id', data.id).order('created_at', { ascending: true }),
      supabase.from('chatbot_payments').select('*').eq('target_type', 'order').eq('target_id', data.id).order('created_at', { ascending: false }),
      supabase.from('order_status_events').select('*').eq('order_id', data.id).order('created_at', { ascending: false }),
    ])
    items.value = itemRows || []
    payments.value = payRows || []
    events.value = eventRows || []
  }
  isLoading.value = false
}

const updateStatus = async (status: string) => {
  if (!order.value?.id) return
  const labels: Record<string, string> = {
    confirmed: 'Confirm this order?',
    preparing: 'Move this order to preparing?',
    ready: 'Mark this order as ready?',
    out_for_delivery: 'Mark this order as out for delivery?',
    completed: 'Mark this order as completed?',
    cancelled: 'Cancel this order?',
  }
  if (!(await notify.confirm(labels[status] || `Move order to ${status}?`))) return
  isUpdating.value = status
  try {
    await $fetch(`/api/business/orders/${order.value.id}/status`, { method: 'POST', body: { status } })
    notify.success('Order status updated.')
    await fetchData()
  } catch (err: any) {
    notify.error(err?.data?.statusMessage || err?.message || 'Could not update order.')
  } finally {
    isUpdating.value = ''
  }
}

onMounted(fetchData)
watch(() => userId.value, fetchData)
const formatMoney = (amount: number | string | null, currency = 'RWF') => `${Number(amount || 0).toLocaleString()} ${currency}`
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value)) : '—'
const statusLabel = (value: string) => value?.replaceAll('_', ' ') || 'unknown'
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 pb-20">
    <NuxtLink to="/dashboard/orders" class="inline-flex items-center gap-2 text-xs font-bold text-foreground/55 transition hover:text-foreground"><ArrowLeft class="h-4 w-4" /> Back to orders</NuxtLink>
    <div v-if="isLoading" class="h-64 animate-pulse rounded-2xl bg-foreground/5" />
    <div v-else-if="!order" class="rounded-2xl border border-foreground/8 bg-background-card p-10 text-center text-sm text-foreground/55">Order not found.</div>
    <template v-else>
      <div class="rounded-2xl border border-foreground/8 bg-background-card p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Order</p>
            <h1 class="mt-2 text-2xl font-black tracking-tight text-foreground">{{ order.customer_name || order.customer_phone || 'Customer' }}</h1>
            <p class="mt-2 text-sm text-foreground/55">{{ order.chatbot?.name }} · {{ formatDate(order.created_at) }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button v-if="['draft','pending','paid_pending_approval'].includes(order.status)" class="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-black text-white disabled:opacity-50" :disabled="!!isUpdating" @click="updateStatus('confirmed')"><Loader2 v-if="isUpdating === 'confirmed'" class="h-4 w-4 animate-spin" /><CheckCircle2 v-else class="h-4 w-4" /> Confirm</button>
            <button v-if="order.status === 'confirmed'" class="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-black disabled:opacity-50" :disabled="!!isUpdating" @click="updateStatus('preparing')">Preparing</button>
            <button v-if="order.status === 'preparing'" class="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-black disabled:opacity-50" :disabled="!!isUpdating" @click="updateStatus('ready')">Ready</button>
            <button v-if="order.status === 'ready' && order.order_type === 'delivery'" class="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-black disabled:opacity-50" :disabled="!!isUpdating" @click="updateStatus('out_for_delivery')"><Truck class="h-4 w-4" /> Delivering</button>
            <button v-if="['ready','out_for_delivery'].includes(order.status)" class="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-black text-white disabled:opacity-50" :disabled="!!isUpdating" @click="updateStatus('completed')">Complete</button>
            <button v-if="!['completed','cancelled','refunded'].includes(order.status)" class="inline-flex h-10 items-center gap-2 rounded-xl border border-red-500/20 px-4 text-xs font-black text-red-500 disabled:opacity-50" :disabled="!!isUpdating" @click="updateStatus('cancelled')"><XCircle class="h-4 w-4" /> Cancel</button>
          </div>
        </div>
      </div>
      <div class="grid gap-4 lg:grid-cols-3">
        <section class="rounded-2xl border border-foreground/8 bg-background-card p-5 lg:col-span-2">
          <div class="mb-4 flex items-center gap-2"><ShoppingBag class="h-5 w-5 text-primary" /><h2 class="text-sm font-black">Items</h2></div>
          <div class="divide-y divide-foreground/8">
            <div v-for="item in items" :key="item.id" class="flex items-center justify-between gap-3 py-3">
              <div><p class="text-sm font-black text-foreground">{{ item.name }}</p><p class="text-xs text-foreground/45">Qty {{ item.quantity }}</p></div>
              <p class="text-sm font-black">{{ formatMoney(item.line_total || (item.unit_price * item.quantity), order.currency) }}</p>
            </div>
            <p v-if="items.length === 0" class="py-6 text-xs text-foreground/45">No item rows saved.</p>
          </div>
          <div class="mt-5 border-t border-foreground/8 pt-4 text-sm">
            <div class="flex justify-between"><span class="text-foreground/45">Subtotal</span><strong>{{ formatMoney(order.subtotal, order.currency) }}</strong></div>
            <div class="mt-2 flex justify-between"><span class="text-foreground/45">Delivery</span><strong>{{ formatMoney(order.delivery_fee, order.currency) }}</strong></div>
            <div class="mt-4 flex justify-between text-lg"><span class="font-black">Total</span><strong>{{ formatMoney(order.total_amount, order.currency) }}</strong></div>
          </div>
        </section>
        <section class="rounded-2xl border border-foreground/8 bg-background-card p-5">
          <div class="mb-4 flex items-center gap-2"><CreditCard class="h-5 w-5 text-primary" /><h2 class="text-sm font-black">Status</h2></div>
          <dl class="space-y-4">
            <div><dt class="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Order</dt><dd class="mt-1 text-sm font-bold capitalize">{{ statusLabel(order.status) }}</dd></div>
            <div><dt class="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Payment</dt><dd class="mt-1 text-sm font-bold capitalize">{{ statusLabel(order.payment_status) }}</dd></div>
            <div><dt class="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Channel</dt><dd class="mt-1 text-sm font-bold capitalize">{{ order.source_channel }}</dd></div>
            <div><dt class="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Type</dt><dd class="mt-1 text-sm font-bold capitalize">{{ statusLabel(order.order_type) }}</dd></div>
          </dl>
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
      <NuxtLink v-if="order.session_id" :to="`/dashboard/conversations?session=${order.session_id}`" class="inline-flex items-center gap-2 rounded-xl border border-foreground/10 px-4 py-3 text-xs font-bold text-foreground/60 hover:text-foreground"><MessageCircle class="h-4 w-4" /> Open conversation</NuxtLink>
    </template>
  </div>
</template>
