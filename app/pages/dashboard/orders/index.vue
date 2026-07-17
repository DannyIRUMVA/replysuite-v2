<script setup lang="ts">
import {
  ShoppingBag,
  Settings,
  Search,
  Plus,
  CreditCard,
  PackageCheck,
  Truck,
  Clock,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth", layout: "dashboard" });
useHead({ title: "Orders | ReplySuite" });

const supabase = useSupabaseClient() as any;
const { userId } = useAuth();
const isLoading = ref(true);
const orders = ref<any[]>([]);
const statusFilter = ref("all");
const search = ref("");

const statusTabs = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "pending_payment", label: "Payment" },
  { id: "paid", label: "Paid" },
  { id: "completed", label: "Completed" },
];

const fetchOrders = async () => {
  if (!userId.value) return;
  isLoading.value = true;
  try {
    let query = supabase
      .from("business_orders")
      .select(
        "*, chatbot:chatbots!inner(id,name,user_id), business_payments(id,status), business_delivery_links(id,short_code,status,download_count,max_downloads)",
      )
      .eq("chatbot.user_id", userId.value)
      .order("created_at", { ascending: false })
      .limit(100);
    if (statusFilter.value !== "all")
      query = query.eq("status", statusFilter.value);
    const { data, error } = await query;
    if (error) throw error;
    orders.value = data || [];
  } catch (err) {
    console.error("[Orders] Failed to load:", err);
    orders.value = [];
  } finally {
    isLoading.value = false;
  }
};

watch([statusFilter, userId], fetchOrders);
onMounted(fetchOrders);

const filteredOrders = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return orders.value;
  return orders.value.filter((item) =>
    [
      item.customer_name,
      item.customer_phone,
      item.customer_email,
      item.chatbot?.name,
      item.status,
      item.payment_status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term),
  );
});

const counts = computed(() => ({
  total: orders.value.length,
  pending: orders.value.filter((item) =>
    ["draft", "pending", "pending_payment", "paid_pending_approval"].includes(
      item.status,
    ),
  ).length,
  paid: orders.value.filter((item) => item.payment_status === "paid").length,
  completed: orders.value.filter((item) => item.status === "completed").length,
}));

const formatMoney = (amount: number | string | null, currency = "RWF") =>
  `${Number(amount || 0).toLocaleString()} ${currency}`;
const formatDate = (value: string) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const statusClass = (status: string) => {
  if (["confirmed", "preparing", "ready", "completed", "paid"].includes(status))
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-500";
  if (["cancelled", "failed"].includes(status))
    return "border-red-500/20 bg-red-500/10 text-red-500";
  if (status === "pending_payment")
    return "border-orange-500/20 bg-orange-500/10 text-orange-500";
  return "border-primary/20 bg-primary/10 text-primary";
};
</script>

<template>
  <div class="mx-auto max-w-[1400px] space-y-6 pb-20">
    <div
      class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
    >
      <div>
        <p
          class="text-[10px] font-black uppercase tracking-[0.22em] text-primary"
        >
          Business actions
        </p>
        <h1
          class="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl"
        >
          Orders
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/58">
          Manage protected Business product orders, MTN/Airtel mobile payments,
          and /d delivery links.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <NuxtLink
          to="/dashboard/orders/settings"
          class="inline-flex h-10 items-center gap-2 rounded-xl border border-foreground/10 px-4 text-xs font-bold text-foreground/65 transition hover:border-primary/30 hover:text-foreground"
        >
          <Settings class="h-4 w-4" /> Settings
        </NuxtLink>
        <NuxtLink
          to="/dashboard/business/selling"
          class="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-black transition hover:brightness-95"
        >
          <Plus class="h-4 w-4" /> Add product
        </NuxtLink>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div
        class="rounded-2xl border border-foreground/8 bg-background-card p-4"
      >
        <p
          class="text-[10px] font-bold uppercase tracking-widest text-foreground/40"
        >
          Total orders
        </p>
        <p class="mt-2 text-2xl font-black">{{ counts.total }}</p>
      </div>
      <div
        class="rounded-2xl border border-foreground/8 bg-background-card p-4"
      >
        <p
          class="text-[10px] font-bold uppercase tracking-widest text-foreground/40"
        >
          Needs action
        </p>
        <p class="mt-2 text-2xl font-black">{{ counts.pending }}</p>
      </div>
      <div
        class="rounded-2xl border border-foreground/8 bg-background-card p-4"
      >
        <p
          class="text-[10px] font-bold uppercase tracking-widest text-foreground/40"
        >
          Paid
        </p>
        <p class="mt-2 text-2xl font-black">{{ counts.paid }}</p>
      </div>
      <div
        class="rounded-2xl border border-foreground/8 bg-background-card p-4"
      >
        <p
          class="text-[10px] font-bold uppercase tracking-widest text-foreground/40"
        >
          Completed
        </p>
        <p class="mt-2 text-2xl font-black">{{ counts.completed }}</p>
      </div>
    </div>

    <section
      class="rounded-2xl border border-foreground/8 bg-background-card p-4 sm:p-5"
    >
      <div
        class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
      >
        <div
          class="flex gap-1 overflow-x-auto rounded-xl border border-foreground/8 bg-foreground/[0.02] p-1"
        >
          <button
            v-for="tab in statusTabs"
            :key="tab.id"
            class="shrink-0 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wider transition"
            :class="
              statusFilter === tab.id
                ? 'bg-primary text-black'
                : 'text-foreground/45 hover:text-foreground'
            "
            @click="statusFilter = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
        <label class="relative block w-full lg:max-w-xs">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35"
          />
          <input
            v-model="search"
            class="h-10 w-full rounded-xl border border-foreground/10 bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary/40"
            placeholder="Search orders"
          />
        </label>
      </div>

      <div v-if="isLoading" class="grid gap-3">
        <div
          v-for="i in 4"
          :key="i"
          class="h-20 animate-pulse rounded-2xl bg-foreground/5"
        />
      </div>
      <div
        v-else-if="filteredOrders.length === 0"
        class="rounded-2xl border border-dashed border-foreground/10 py-16 text-center"
      >
        <ShoppingBag class="mx-auto h-10 w-10 text-foreground/20" />
        <h3 class="mt-4 text-sm font-black text-foreground">No orders yet</h3>
        <p
          class="mx-auto mt-2 max-w-md text-xs leading-relaxed text-foreground/50"
        >
          Enable Business selling and add protected products so customers can
          order from chat.
        </p>
      </div>
      <div v-else class="divide-y divide-foreground/8">
        <NuxtLink
          v-for="item in filteredOrders"
          :key="item.id"
          :to="`/dashboard/orders/${item.id}`"
          class="grid gap-3 py-4 transition hover:bg-foreground/[0.015] lg:grid-cols-[1fr_auto_auto] lg:items-center"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-black text-foreground">
                {{ item.customer_name || item.customer_phone || "Customer" }}
              </p>
              <span
                class="rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                :class="statusClass(item.status)"
                >{{ item.status?.replaceAll("_", " ") }}</span
              >
              <span
                v-if="
                  item.payment_status && item.payment_status !== 'not_required'
                "
                class="rounded-full border border-foreground/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/45"
                >{{ item.payment_status }}</span
              >
            </div>
            <p class="mt-1 text-xs text-foreground/50">
              {{ item.chatbot?.name }} · {{ item.source_channel || "chat" }} ·
              {{ formatDate(item.created_at) }}
            </p>
            <p
              v-if="item.business_delivery_links?.length"
              class="mt-1 font-mono text-[10px] text-primary/80"
            >
              /d/{{ item.business_delivery_links[0].short_code }} ·
              {{ item.business_delivery_links[0].download_count }}/{{
                item.business_delivery_links[0].max_downloads
              }}
              downloads
            </p>
          </div>
          <div class="flex items-center gap-2 text-xs text-foreground/45">
            <CreditCard
              v-if="item.payment_status === 'paid'"
              class="h-4 w-4 text-emerald-500"
            />
            <Truck
              v-else-if="item.business_delivery_links?.length"
              class="h-4 w-4 text-primary"
            />
            <PackageCheck
              v-else-if="item.status === 'completed'"
              class="h-4 w-4 text-emerald-500"
            />
            <Clock v-else class="h-4 w-4 text-foreground/35" />
            {{ item.source_channel || "web" }}
          </div>
          <p class="text-sm font-black text-foreground lg:text-right">
            {{ formatMoney(item.total_amount, item.currency) }}
          </p>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
