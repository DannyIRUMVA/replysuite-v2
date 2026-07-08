<script setup lang="ts">
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Settings,
  Search,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth", layout: "dashboard" });
useHead({ title: "Appointments | ReplySuite" });

const supabase = useSupabaseClient() as any;
const { userId } = useAuth();
const statusFilter = ref("all");
const search = ref("");
const isLoading = ref(true);
const appointments = ref<any[]>([]);

const statusTabs = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "pending_payment", label: "Payment" },
  { id: "approved", label: "Approved" },
  { id: "completed", label: "Completed" },
];

const fetchAppointments = async () => {
  if (!userId.value) return;
  isLoading.value = true;
  try {
    let query = supabase
      .from("chatbot_appointments")
      .select(
        "*, chatbot:chatbots!inner(id,name,user_id), service:appointment_services(name,duration_minutes)",
      )
      .eq("chatbot.user_id", userId.value)
      .order("appointment_start", { ascending: true })
      .limit(100);

    if (statusFilter.value !== "all")
      query = query.eq("status", statusFilter.value);
    const { data, error } = await query;
    if (error) throw error;
    appointments.value = data || [];
  } catch (err) {
    console.error("[Appointments] Failed to load:", err);
    appointments.value = [];
  } finally {
    isLoading.value = false;
  }
};

watch([statusFilter, userId], fetchAppointments);
onMounted(fetchAppointments);

const filteredAppointments = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return appointments.value;
  return appointments.value.filter((item) =>
    [
      item.customer_name,
      item.customer_phone,
      item.customer_email,
      item.chatbot?.name,
      item.service?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term),
  );
});

const counts = computed(() => ({
  total: appointments.value.length,
  pending: appointments.value.filter((item) =>
    ["pending", "pending_payment", "paid_pending_approval"].includes(
      item.status,
    ),
  ).length,
  approved: appointments.value.filter((item) => item.status === "approved")
    .length,
  paid: appointments.value.filter((item) => item.payment_status === "paid")
    .length,
}));

const formatDateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Time not set";

const statusClass = (status: string) => {
  if (status === "approved" || status === "completed")
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-500";
  if (status === "cancelled" || status === "rejected" || status === "no_show")
    return "border-red-500/20 bg-red-500/10 text-red-500";
  if (status === "pending_payment" || status === "paid_pending_approval")
    return "border-orange-500/20 bg-orange-500/10 text-orange-500";
  return "border-primary/20 bg-primary/10 text-primary";
};
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-5 pb-20 pt-3 lg:pb-12">
    <section
      class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6"
    >
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div class="min-w-0">
          <p class="dashboard-eyebrow text-primary/80">Business</p>
          <h1 class="dashboard-section-title mt-2">Bookings</h1>
          <p class="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/65">
            Review appointment requests created by your assistants across
            website chat, WhatsApp, Instagram, and test conversations.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <NuxtLink
            to="/dashboard/appointments/settings"
            class="inline-flex h-10 items-center gap-2 rounded-[0.39rem] border border-foreground/10 px-4 text-xs font-bold text-foreground/65 transition hover:border-primary/30 hover:text-foreground"
          >
            <Settings class="h-4 w-4" /> Settings
          </NuxtLink>
          <NuxtLink
            to="/dashboard/agents/tools"
            class="inline-flex h-10 items-center gap-2 rounded-[0.39rem] bg-primary px-4 text-xs font-bold text-black shadow-sm shadow-primary/10 transition hover:bg-primary-accent"
          >
            <Plus class="h-4 w-4" /> Enable tools
          </NuxtLink>
        </div>
      </div>
    </section>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <article
        class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5"
      >
        <p class="text-xs font-medium text-foreground/45">Total bookings</p>
        <p class="mt-2 text-2xl font-bold leading-none text-foreground">
          {{ counts.total }}
        </p>
      </article>
      <article
        class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5"
      >
        <p class="text-xs font-medium text-foreground/45">Needs review</p>
        <p class="mt-2 text-2xl font-bold leading-none text-foreground">
          {{ counts.pending }}
        </p>
      </article>
      <article
        class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5"
      >
        <p class="text-xs font-medium text-foreground/45">Approved</p>
        <p class="mt-2 text-2xl font-bold leading-none text-foreground">
          {{ counts.approved }}
        </p>
      </article>
      <article
        class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5"
      >
        <p class="text-xs font-medium text-foreground/45">Paid deposits</p>
        <p class="mt-2 text-2xl font-bold leading-none text-foreground">
          {{ counts.paid }}
        </p>
      </article>
    </div>

    <section
      class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5 sm:p-5"
    >
      <div
        class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
      >
        <div
          class="flex gap-1 overflow-x-auto rounded-[0.39rem] border border-foreground/10 bg-background p-1"
        >
          <button
            v-for="tab in statusTabs"
            :key="tab.id"
            class="shrink-0 rounded-[0.39rem] px-3 py-2 text-xs font-bold transition"
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
            class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary/40"
            placeholder="Search appointments"
          />
        </label>
      </div>

      <div v-if="isLoading" class="grid gap-3">
        <div
          v-for="i in 4"
          :key="i"
          class="h-20 animate-pulse rounded-[0.39rem] bg-foreground/5"
        />
      </div>
      <div
        v-else-if="filteredAppointments.length === 0"
        class="rounded-[0.39rem] border border-dashed border-foreground/10 py-14 text-center"
      >
        <Calendar class="mx-auto h-10 w-10 text-foreground/20" />
        <h3 class="mt-4 text-sm font-bold text-foreground">
          No appointments yet
        </h3>
        <p
          class="mx-auto mt-2 max-w-md text-xs leading-relaxed text-foreground/50"
        >
          Enable appointments on an assistant and let customers request a time
          from chat.
        </p>
      </div>
      <div v-else class="divide-y divide-foreground/10">
        <NuxtLink
          v-for="item in filteredAppointments"
          :key="item.id"
          :to="`/dashboard/appointments/${item.id}`"
          class="grid gap-3 py-4 transition hover:bg-foreground/[0.015] sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-bold text-foreground">
                {{ item.customer_name || "Unnamed customer" }}
              </p>
              <span
                class="rounded-full border px-2 py-0.5 text-xs font-bold"
                :class="statusClass(item.status)"
                >{{ item.status?.replaceAll("_", " ") }}</span
              >
              <span
                v-if="
                  item.payment_status && item.payment_status !== 'not_required'
                "
                class="rounded-full border border-foreground/10 px-2 py-0.5 text-xs font-bold text-foreground/45"
                >{{ item.payment_status }}</span
              >
            </div>
            <p class="mt-1 text-xs text-foreground/50">
              {{ item.service?.name || "General appointment" }} ·
              {{ item.chatbot?.name }}
            </p>
            <p class="mt-1 flex items-center gap-1 text-xs text-foreground/45">
              <Clock class="h-3.5 w-3.5" />
              {{
                formatDateTime(item.appointment_start || item.appointment_time)
              }}
            </p>
          </div>
          <div
            class="flex items-center gap-2 text-xs text-foreground/45 sm:justify-end"
          >
            <CheckCircle2
              v-if="item.status === 'approved'"
              class="h-4 w-4 text-emerald-500"
            />
            <XCircle
              v-else-if="['cancelled', 'rejected'].includes(item.status)"
              class="h-4 w-4 text-red-500"
            />
            <AlertCircle v-else class="h-4 w-4 text-primary" />
            {{ item.source_channel || "web" }}
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
