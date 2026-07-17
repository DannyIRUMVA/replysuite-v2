<script setup lang="ts">
import {
  ArrowLeft,
  ShoppingBag,
  CreditCard,
  MessageCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Truck,
  Copy,
  RefreshCw,
  Ban,
  CalendarPlus,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth", layout: "dashboard" });
const route = useRoute();
const supabase = useSupabaseClient() as any;
const notify = useNotify();
const { userId } = useAuth();
const order = ref<any>(null);
const items = ref<any[]>([]);
const payments = ref<any[]>([]);
const deliveryLinks = ref<any[]>([]);
const deliveryEvents = ref<any[]>([]);
const isLoading = ref(true);
const isUpdating = ref("");
const isUpdatingLink = ref("");
useHead({ title: "Order Detail | ReplySuite" });

const fetchData = async () => {
  if (!userId.value) return;
  isLoading.value = true;
  const { data } = await supabase
    .from("business_orders")
    .select("*, chatbot:chatbots!inner(id,name,user_id)")
    .eq("id", route.params.id)
    .eq("chatbot.user_id", userId.value)
    .maybeSingle();
  order.value = data;
  if (data?.id) {
    const [
      { data: itemRows },
      { data: payRows },
      { data: linkRows },
      { data: eventRows },
    ] = await Promise.all([
      supabase
        .from("business_order_items")
        .select("*")
        .eq("order_id", data.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("business_payments")
        .select("*")
        .eq("order_id", data.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("business_delivery_links")
        .select("*")
        .eq("order_id", data.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("business_delivery_events")
        .select("*")
        .eq("order_id", data.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    items.value = itemRows || [];
    payments.value = payRows || [];
    deliveryLinks.value = linkRows || [];
    deliveryEvents.value = eventRows || [];
  }
  isLoading.value = false;
};

const updateStatus = async (status: string) => {
  if (!order.value?.id) return;
  const labels: Record<string, string> = {
    confirmed: "Confirm this order?",
    preparing: "Move this order to preparing?",
    ready: "Mark this order as ready?",
    out_for_delivery: "Mark this order as out for delivery?",
    completed: "Mark this order as completed?",
    cancelled: "Cancel this order?",
  };
  if (!(await notify.confirm(labels[status] || `Move order to ${status}?`)))
    return;
  isUpdating.value = status;
  try {
    const { error } = await supabase
      .from("business_orders")
      .update({ status })
      .eq("id", order.value.id);
    if (error) throw error;
    notify.success("Order status updated.");
    await fetchData();
  } catch (err: any) {
    notify.error(
      err?.data?.statusMessage || err?.message || "Could not update order.",
    );
  } finally {
    isUpdating.value = "";
  }
};

const randomShortCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((value) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[value % 32])
    .join("");

const publicDeliveryUrl = (shortCode: string) => {
  if (!import.meta.client) return `/d/${shortCode}`;
  return `${window.location.origin}/d/${shortCode}`;
};

const copyDeliveryLink = async (link: any) => {
  if (!link?.short_code || !import.meta.client) return;
  await navigator.clipboard.writeText(publicDeliveryUrl(link.short_code));
  notify.success("Protected link copied.");
};

const revokeDeliveryLink = async (link: any) => {
  if (!link?.id) return;
  if (!(await notify.confirm(`Revoke /d/${link.short_code}?`))) return;
  isUpdatingLink.value = link.id;
  try {
    const { error } = await supabase
      .from("business_delivery_links")
      .update({ status: "revoked" })
      .eq("id", link.id)
      .eq("order_id", order.value.id);
    if (error) throw error;
    notify.success("Delivery link revoked.");
    await fetchData();
  } catch (err: any) {
    notify.error(err?.message || "Could not revoke delivery link.");
  } finally {
    isUpdatingLink.value = "";
  }
};

const extendDeliveryLink = async (link: any) => {
  if (!link?.id) return;
  isUpdatingLink.value = link.id;
  try {
    const base = link.expires_at ? new Date(link.expires_at) : new Date();
    const expiresAt = new Date(
      Math.max(base.getTime(), Date.now()) + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { error } = await supabase
      .from("business_delivery_links")
      .update({ expires_at: expiresAt, status: "active" })
      .eq("id", link.id)
      .eq("order_id", order.value.id);
    if (error) throw error;
    notify.success("Delivery link extended by 7 days.");
    await fetchData();
  } catch (err: any) {
    notify.error(err?.message || "Could not extend delivery link.");
  } finally {
    isUpdatingLink.value = "";
  }
};

const increaseMaxDownloads = async (link: any) => {
  if (!link?.id) return;
  isUpdatingLink.value = link.id;
  try {
    const { error } = await supabase
      .from("business_delivery_links")
      .update({ max_downloads: Number(link.max_downloads || 0) + 1 })
      .eq("id", link.id)
      .eq("order_id", order.value.id);
    if (error) throw error;
    notify.success("Max downloads increased.");
    await fetchData();
  } catch (err: any) {
    notify.error(err?.message || "Could not update downloads.");
  } finally {
    isUpdatingLink.value = "";
  }
};

const regenerateDeliveryLink = async (link: any) => {
  if (!link?.id || !order.value?.id) return;
  if (!(await notify.confirm(`Generate a fresh /d link for this order?`)))
    return;
  isUpdatingLink.value = link.id;
  try {
    const { error: revokeError } = await supabase
      .from("business_delivery_links")
      .update({ status: "revoked" })
      .eq("id", link.id)
      .eq("order_id", order.value.id);
    if (revokeError) throw revokeError;
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { error } = await supabase.from("business_delivery_links").insert({
      chatbot_id: order.value.chatbot_id,
      order_id: order.value.id,
      product_id: link.product_id,
      customer_phone: order.value.customer_phone,
      short_code: randomShortCode(),
      status: "active",
      file_key: link.file_key,
      expires_at: expiresAt,
      max_downloads: 3,
      download_count: 0,
    });
    if (error) throw error;
    notify.success("Fresh protected link generated.");
    await fetchData();
  } catch (err: any) {
    notify.error(err?.message || "Could not regenerate delivery link.");
  } finally {
    isUpdatingLink.value = "";
  }
};

onMounted(fetchData);
watch(() => userId.value, fetchData);
const formatMoney = (amount: number | string | null, currency = "RWF") =>
  `${Number(amount || 0).toLocaleString()} ${currency}`;
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const statusLabel = (value: string) => value?.replaceAll("_", " ") || "unknown";
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 pb-20">
    <NuxtLink
      to="/dashboard/orders"
      class="inline-flex items-center gap-2 text-xs font-bold text-foreground/55 transition hover:text-foreground"
      ><ArrowLeft class="h-4 w-4" /> Back to orders</NuxtLink
    >
    <div
      v-if="isLoading"
      class="h-64 animate-pulse rounded-2xl bg-foreground/5"
    />
    <div
      v-else-if="!order"
      class="rounded-2xl border border-foreground/8 bg-background-card p-10 text-center text-sm text-foreground/55"
    >
      Order not found.
    </div>
    <template v-else>
      <div
        class="rounded-2xl border border-foreground/8 bg-background-card p-6"
      >
        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
        >
          <div>
            <p
              class="text-[10px] font-black uppercase tracking-[0.22em] text-primary"
            >
              Order
            </p>
            <h1 class="mt-2 text-2xl font-black tracking-tight text-foreground">
              {{ order.customer_name || order.customer_phone || "Customer" }}
            </h1>
            <p class="mt-2 text-sm text-foreground/55">
              {{ order.chatbot?.name }} · {{ formatDate(order.created_at) }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-if="['draft', 'pending_payment', 'paid'].includes(order.status)"
              class="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-black text-white disabled:opacity-50"
              :disabled="!!isUpdating"
              @click="updateStatus('completed')"
            >
              <Loader2
                v-if="isUpdating === 'completed'"
                class="h-4 w-4 animate-spin"
              /><CheckCircle2 v-else class="h-4 w-4" /> Complete
            </button>
            <button
              v-if="
                !['completed', 'cancelled', 'refunded'].includes(order.status)
              "
              class="inline-flex h-10 items-center gap-2 rounded-xl border border-red-500/20 px-4 text-xs font-black text-red-500 disabled:opacity-50"
              :disabled="!!isUpdating"
              @click="updateStatus('cancelled')"
            >
              <XCircle class="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>
      </div>
      <div class="grid gap-4 lg:grid-cols-3">
        <section
          class="rounded-2xl border border-foreground/8 bg-background-card p-5 lg:col-span-2"
        >
          <div class="mb-4 flex items-center gap-2">
            <ShoppingBag class="h-5 w-5 text-primary" />
            <h2 class="text-sm font-black">Items</h2>
          </div>
          <div class="divide-y divide-foreground/8">
            <div
              v-for="item in items"
              :key="item.id"
              class="flex items-center justify-between gap-3 py-3"
            >
              <div>
                <p class="text-sm font-black text-foreground">
                  {{ item.name }}
                </p>
                <p class="text-xs text-foreground/45">
                  Qty {{ item.quantity }}
                </p>
              </div>
              <p class="text-sm font-black">
                {{
                  formatMoney(
                    item.line_total || item.unit_price * item.quantity,
                    order.currency,
                  )
                }}
              </p>
            </div>
            <p
              v-if="items.length === 0"
              class="py-6 text-xs text-foreground/45"
            >
              No item rows saved.
            </p>
          </div>
          <div class="mt-5 border-t border-foreground/8 pt-4 text-sm">
            <div class="flex justify-between">
              <span class="text-foreground/45">Subtotal</span
              ><strong>{{
                formatMoney(order.subtotal, order.currency)
              }}</strong>
            </div>
            <div class="mt-4 flex justify-between text-lg">
              <span class="font-black">Total</span
              ><strong>{{
                formatMoney(order.total_amount, order.currency)
              }}</strong>
            </div>
          </div>
        </section>
        <section
          class="rounded-2xl border border-foreground/8 bg-background-card p-5"
        >
          <div class="mb-4 flex items-center gap-2">
            <CreditCard class="h-5 w-5 text-primary" />
            <h2 class="text-sm font-black">Status</h2>
          </div>
          <dl class="space-y-4">
            <div>
              <dt
                class="text-[10px] font-bold uppercase tracking-widest text-foreground/40"
              >
                Order
              </dt>
              <dd class="mt-1 text-sm font-bold capitalize">
                {{ statusLabel(order.status) }}
              </dd>
            </div>
            <div>
              <dt
                class="text-[10px] font-bold uppercase tracking-widest text-foreground/40"
              >
                Payment
              </dt>
              <dd class="mt-1 text-sm font-bold capitalize">
                {{ statusLabel(order.payment_status) }}
              </dd>
            </div>
            <div>
              <dt
                class="text-[10px] font-bold uppercase tracking-widest text-foreground/40"
              >
                Channel
              </dt>
              <dd class="mt-1 text-sm font-bold capitalize">
                {{ order.source_channel }}
              </dd>
            </div>
            <div>
              <dt
                class="text-[10px] font-bold uppercase tracking-widest text-foreground/40"
              >
                Customer phone
              </dt>
              <dd class="mt-1 text-sm font-bold">
                {{ order.customer_phone || "—" }}
              </dd>
            </div>
          </dl>
          <div class="mt-4 space-y-2">
            <div
              v-for="payment in payments"
              :key="payment.id"
              class="rounded-xl border border-foreground/8 p-3 text-xs text-foreground/55"
            >
              {{ payment.status }} · {{ payment.provider_ref || payment.id }}
            </div>
            <p v-if="payments.length === 0" class="text-xs text-foreground/40">
              No payment requests yet.
            </p>
          </div>
        </section>
      </div>
      <section
        class="rounded-2xl border border-foreground/8 bg-background-card p-5"
      >
        <div class="mb-4 flex items-center gap-2">
          <Truck class="h-5 w-5 text-primary" />
          <h2 class="text-sm font-black">Protected delivery links</h2>
        </div>
        <div class="space-y-2">
          <div
            v-for="link in deliveryLinks"
            :key="link.id"
            class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-3 text-xs text-foreground/55 shadow-sm shadow-black/5"
          >
            <div
              class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
            >
              <div class="min-w-0 space-y-1">
                <strong class="font-mono text-primary"
                  >/d/{{ link.short_code }}</strong
                >
                <div class="flex flex-wrap gap-2 text-[11px]">
                  <span class="capitalize">{{ link.status }}</span>
                  <span
                    >{{ link.download_count }}/{{
                      link.max_downloads
                    }}
                    downloads</span
                  >
                  <span>expires {{ formatDate(link.expires_at) }}</span>
                  <span class="truncate">{{ link.file_key }}</span>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  class="inline-flex h-8 items-center gap-1 rounded-[0.39rem] border border-foreground/10 px-2 font-bold text-foreground/60 hover:text-foreground"
                  @click="copyDeliveryLink(link)"
                >
                  <Copy class="h-3.5 w-3.5" /> Copy
                </button>
                <button
                  class="inline-flex h-8 items-center gap-1 rounded-[0.39rem] border border-foreground/10 px-2 font-bold text-foreground/60 hover:text-foreground disabled:opacity-50"
                  :disabled="isUpdatingLink === link.id"
                  @click="extendDeliveryLink(link)"
                >
                  <CalendarPlus class="h-3.5 w-3.5" /> +7d
                </button>
                <button
                  class="inline-flex h-8 items-center gap-1 rounded-[0.39rem] border border-foreground/10 px-2 font-bold text-foreground/60 hover:text-foreground disabled:opacity-50"
                  :disabled="isUpdatingLink === link.id"
                  @click="increaseMaxDownloads(link)"
                >
                  +1 download
                </button>
                <button
                  class="inline-flex h-8 items-center gap-1 rounded-[0.39rem] border border-foreground/10 px-2 font-bold text-foreground/60 hover:text-foreground disabled:opacity-50"
                  :disabled="isUpdatingLink === link.id"
                  @click="regenerateDeliveryLink(link)"
                >
                  <RefreshCw class="h-3.5 w-3.5" /> Regenerate
                </button>
                <button
                  v-if="link.status !== 'revoked'"
                  class="inline-flex h-8 items-center gap-1 rounded-[0.39rem] border border-red-500/20 px-2 font-bold text-red-500 disabled:opacity-50"
                  :disabled="isUpdatingLink === link.id"
                  @click="revokeDeliveryLink(link)"
                >
                  <Ban class="h-3.5 w-3.5" /> Revoke
                </button>
              </div>
            </div>
          </div>
          <p
            v-if="deliveryLinks.length === 0"
            class="text-xs text-foreground/40"
          >
            No delivery links generated yet.
          </p>
        </div>
        <div class="mt-5 border-t border-foreground/8 pt-4">
          <h3
            class="mb-3 text-xs font-black uppercase tracking-[0.18em] text-foreground/40"
          >
            Delivery events
          </h3>
          <div class="space-y-2">
            <div
              v-for="event in deliveryEvents"
              :key="event.id"
              class="rounded-[0.39rem] border border-foreground/10 px-3 py-2 text-xs text-foreground/55"
            >
              <strong class="capitalize text-foreground">{{
                event.event_type
              }}</strong>
              <span class="ml-2">{{ formatDate(event.created_at) }}</span>
            </div>
            <p
              v-if="deliveryEvents.length === 0"
              class="text-xs text-foreground/40"
            >
              No delivery events recorded yet.
            </p>
          </div>
        </div>
      </section>
      <NuxtLink
        v-if="order.chat_session_id"
        :to="`/dashboard/conversations?session=${order.chat_session_id}`"
        class="inline-flex items-center gap-2 rounded-xl border border-foreground/10 px-4 py-3 text-xs font-bold text-foreground/60 hover:text-foreground"
        ><MessageCircle class="h-4 w-4" /> Open conversation</NuxtLink
      >
    </template>
  </div>
</template>
