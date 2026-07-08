<script setup lang="ts">
import {
  Bot,
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Globe2,
  Loader2,
  Save,
  Search,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth", layout: "dashboard" });
useHead({ title: "Assistant Tools | ReplySuite" });

const route = useRoute();
const { userId } = useAuth();
const { canUseBusinessTools } = usePlanAccess();
const supabase = useSupabaseClient();
const notify = useNotify();

const isLoading = ref(true);
const isSaving = ref(false);
const isCheckingGoogle = ref(false);
const assistants = ref<any[]>([]);
const selectedAssistantId = ref("");
const appointmentsEnabled = ref(false);
const depositsEnabled = ref(false);
const bookingMode = ref<"appointments" | "bookings" | "mixed">("mixed");
const confirmationMode = ref<"instant" | "manual">("manual");
const googleCalendarStatus = ref<any>(null);
const toolSearch = ref("");
const toolStatusFilter = ref("all");
const toolCategoryFilter = ref("all");

const isPremium = canUseBusinessTools;

const selectedAssistant = computed(
  () =>
    assistants.value.find(
      (assistant) => assistant.id === selectedAssistantId.value,
    ) || null,
);
const selectedConfig = computed(
  () => selectedAssistant.value?.tools_config || {},
);
const selectedSchedulingConfig = computed(
  () => selectedConfig.value?.scheduling || {},
);
const googleMapping = computed(
  () => googleCalendarStatus.value?.mapping || null,
);
const googleCalendarConnected = computed(() =>
  Boolean(
    googleCalendarStatus.value?.connected &&
    googleMapping.value?.chatbot_id === selectedAssistantId.value &&
    googleMapping.value?.sync_status === "connected",
  ),
);
const googleCalendarLabel = computed(
  () =>
    googleMapping.value?.calendar_summary ||
    googleCalendarStatus.value?.connection?.google_email ||
    "Connected calendar",
);
const calendarSetupLink = computed(() =>
  selectedAssistantId.value
    ? `/dashboard/appointments/settings?chatbotId=${selectedAssistantId.value}`
    : "/dashboard/appointments/settings",
);
const websiteBuilderLink = computed(() =>
  selectedAssistantId.value
    ? `/dashboard/agents/tools/website-builder?chatbotId=${selectedAssistantId.value}`
    : "/dashboard/agents/tools/website-builder",
);

const toolRows = computed(() => [
  {
    id: "appointments",
    name: "Appointments & bookings",
    category: "Booking",
    status: appointmentsEnabled.value ? "Enabled" : "Disabled",
    tone: appointmentsEnabled.value ? "active" : "disabled",
    connectedData: `${bookingMode.value} · ${confirmationMode.value} approval`,
    action: appointmentsEnabled.value ? "Disable" : "Enable",
    icon: CalendarDays,
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    category: "Booking",
    status: isCheckingGoogle.value
      ? "Checking"
      : googleCalendarConnected.value
        ? "Connected"
        : appointmentsEnabled.value
          ? "Attention"
          : "Paused",
    tone: isCheckingGoogle.value
      ? "pending"
      : googleCalendarConnected.value
        ? "active"
        : appointmentsEnabled.value
          ? "attention"
          : "disabled",
    connectedData: googleCalendarConnected.value
      ? googleCalendarLabel.value
      : appointmentsEnabled.value
        ? "Calendar mapping required"
        : "Enable bookings first",
    action: "Manage",
    icon: CalendarCheck2,
  },
  {
    id: "deposits",
    name: "Booking deposit checkout",
    category: "Payments",
    status: appointmentsEnabled.value
      ? depositsEnabled.value
        ? "Enabled"
        : "Disabled"
      : "Unavailable",
    tone: appointmentsEnabled.value
      ? depositsEnabled.value
        ? "active"
        : "disabled"
      : "locked",
    connectedData: depositsEnabled.value
      ? "MTN/Airtel mobile checkout"
      : appointmentsEnabled.value
        ? "No deposit checkout"
        : "Requires bookings enabled",
    action: depositsEnabled.value ? "Disable" : "Enable",
    icon: CreditCard,
  },
  {
    id: "website_builder",
    name: "Website builder",
    category: "Websites",
    status: isPremium.value ? "Ready" : "Locked",
    tone: isPremium.value ? "active" : "locked",
    connectedData: isPremium.value
      ? "Enterprise Ready workspace"
      : "Plan upgrade required",
    action: isPremium.value ? "Open" : "Upgrade",
    icon: Globe2,
  },
]);

const toolCategories = computed(() => [
  "all",
  ...Array.from(new Set(toolRows.value.map((row) => row.category))),
]);
const toolStatuses = computed(() => [
  "all",
  ...Array.from(new Set(toolRows.value.map((row) => row.status))),
]);
const filteredToolRows = computed(() => {
  const query = toolSearch.value.trim().toLowerCase();
  return toolRows.value.filter((row) => {
    const matchesSearch =
      !query ||
      [row.name, row.category, row.status, row.connectedData]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesStatus =
      toolStatusFilter.value === "all" || row.status === toolStatusFilter.value;
    const matchesCategory =
      toolCategoryFilter.value === "all" ||
      row.category === toolCategoryFilter.value;
    return matchesSearch && matchesStatus && matchesCategory;
  });
});

const toolStats = computed(() => {
  const rows = toolRows.value;
  const enabledCount = rows.filter((row) => row.status === "Enabled").length;
  const usedCount = rows.filter((row) =>
    ["Connected", "Ready"].includes(row.status),
  ).length;
  const actionCount = rows.filter((row) =>
    ["attention", "pending"].includes(row.tone),
  ).length;
  const otherCount = rows.length - enabledCount - usedCount - actionCount;

  return [
    {
      label: "Enabled tools",
      value: enabledCount,
      detail: "Turned on for this assistant",
      tone: "active",
      icon: CalendarCheck2,
    },
    {
      label: "Used tools",
      value: usedCount,
      detail: "Connected or ready to open",
      tone: usedCount > 0 ? "active" : "disabled",
      icon: CalendarDays,
    },
    {
      label: "Needs action",
      value: actionCount,
      detail: "Checking or needs setup",
      tone: actionCount > 0 ? "attention" : "disabled",
      icon: CreditCard,
    },
    {
      label: "Other tools",
      value: otherCount,
      detail: "Disabled, paused, or locked",
      tone: otherCount > 0 ? "locked" : "disabled",
      icon: Globe2,
    },
  ];
});

const statusDotClass = (tone: string) =>
  ({
    active: "bg-emerald-400 shadow-emerald-400/30",
    pending: "bg-sky-400 shadow-sky-400/30",
    attention: "bg-orange-400 shadow-orange-400/30",
    locked: "bg-red-400 shadow-red-400/30",
    disabled: "bg-foreground/25 shadow-foreground/10",
  })[tone] || "bg-foreground/25";

const statCardClass = (tone: string) =>
  ({
    active: "border-emerald-400/20 bg-emerald-400/[0.04]",
    pending: "border-sky-400/20 bg-sky-400/[0.04]",
    attention: "border-orange-400/20 bg-orange-400/[0.04]",
    locked: "border-red-400/20 bg-red-400/[0.04]",
    disabled: "border-foreground/10 bg-foreground/[0.02]",
  })[tone] || "border-foreground/10 bg-foreground/[0.02]";

const hasChanges = computed(() => {
  const enabledTools = Array.isArray(selectedAssistant.value?.enabled_tools)
    ? selectedAssistant.value.enabled_tools
    : [];
  const currentAppointments = enabledTools.includes("appointments");
  const currentDeposits =
    currentAppointments && enabledTools.includes("payments");
  return (
    currentAppointments !== appointmentsEnabled.value ||
    currentDeposits !== depositsEnabled.value ||
    (selectedSchedulingConfig.value?.mode || "mixed") !== bookingMode.value ||
    (selectedSchedulingConfig.value?.confirmation_mode || "manual") !==
      confirmationMode.value
  );
});

const getAuthHeaders = async () => {
  const { data: sessionData } = await (supabase as any).auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
};

const fetchGoogleStatus = async () => {
  if (!selectedAssistantId.value) {
    googleCalendarStatus.value = null;
    return;
  }
  isCheckingGoogle.value = true;
  try {
    googleCalendarStatus.value = await $fetch("/api/google/calendar/status", {
      query: { chatbotId: selectedAssistantId.value },
      headers: await getAuthHeaders(),
    });
  } catch (err) {
    console.error("Failed to load Google Calendar mapping:", err);
    googleCalendarStatus.value = null;
  } finally {
    isCheckingGoogle.value = false;
  }
};

const syncSelection = () => {
  const assistant = selectedAssistant.value;
  const enabledTools = Array.isArray(assistant?.enabled_tools)
    ? assistant.enabled_tools
    : [];
  appointmentsEnabled.value = enabledTools.includes("appointments");
  depositsEnabled.value =
    appointmentsEnabled.value && enabledTools.includes("payments");
  bookingMode.value = (assistant?.tools_config?.scheduling?.mode ||
    "mixed") as any;
  confirmationMode.value = (assistant?.tools_config?.scheduling
    ?.confirmation_mode || "manual") as any;
  void fetchGoogleStatus();
};

const fetchAssistants = async () => {
  if (!userId.value) return;
  isLoading.value = true;
  try {
    const { data, error } = await supabase
      .from("chatbots")
      .select(
        "id, name, default_language, enabled_tools, tools_config, created_at",
      )
      .eq("user_id", userId.value)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    assistants.value = data || [];
    const requestedAssistantId =
      typeof route.query.id === "string"
        ? route.query.id
        : typeof route.query.chatbotId === "string"
          ? route.query.chatbotId
          : "";
    if (
      requestedAssistantId &&
      assistants.value.some(
        (assistant) => assistant.id === requestedAssistantId,
      )
    )
      selectedAssistantId.value = requestedAssistantId;
    else if (!selectedAssistantId.value && assistants.value.length > 0)
      selectedAssistantId.value = assistants.value[0].id;
    syncSelection();
  } catch (err) {
    console.error("Failed to load assistants:", err);
    notify.error("Failed to load assistants.");
  } finally {
    isLoading.value = false;
  }
};

const enableAppointments = () => {
  if (!isPremium.value)
    return notify.warn("Upgrade your plan to enable booking tools.");
  appointmentsEnabled.value = !appointmentsEnabled.value;
  if (!appointmentsEnabled.value) depositsEnabled.value = false;
};

const toggleDeposits = () => {
  if (!isPremium.value)
    return notify.warn("Upgrade your plan to enable deposit checkout.");
  if (!appointmentsEnabled.value)
    return notify.warn(
      "Enable appointments and bookings before deposit checkout.",
    );
  depositsEnabled.value = !depositsEnabled.value;
};

const handleToolAction = (toolId: string) => {
  if (toolId === "appointments") return enableAppointments();
  if (toolId === "deposits") return toggleDeposits();
  if (toolId === "google_calendar") return navigateTo(calendarSetupLink.value);
  if (toolId === "website_builder")
    return navigateTo(
      isPremium.value ? websiteBuilderLink.value : "/dashboard/pricing",
    );
};

const saveTools = async () => {
  if (!selectedAssistant.value || isSaving.value) return;
  if ((appointmentsEnabled.value || depositsEnabled.value) && !isPremium.value)
    return notify.warn("Upgrade your plan to save assistant business tools.");
  isSaving.value = true;
  try {
    const nextTools = appointmentsEnabled.value
      ? ["appointments", ...(depositsEnabled.value ? ["payments"] : [])]
      : [];
    const nextToolsConfig = {
      ...(selectedAssistant.value.tools_config || {}),
      scheduling: {
        ...(selectedAssistant.value.tools_config?.scheduling || {}),
        mode: bookingMode.value,
        confirmation_mode: confirmationMode.value,
        provider: "google_calendar",
        google_calendar_required: true,
      },
    };
    const { error } = await supabase
      .from("chatbots")
      .update({ enabled_tools: nextTools, tools_config: nextToolsConfig })
      .eq("id", selectedAssistant.value.id)
      .eq("user_id", userId.value);
    if (error) throw error;
    assistants.value = assistants.value.map((assistant) =>
      assistant.id === selectedAssistant.value.id
        ? {
            ...assistant,
            enabled_tools: nextTools,
            tools_config: nextToolsConfig,
          }
        : assistant,
    );
    notify.success(
      "Tools saved. Connect Google Calendar before confirming real bookings.",
    );
  } catch (err: any) {
    console.error("Failed to save tools:", err);
    notify.error(err?.message || "Failed to save tools.");
  } finally {
    isSaving.value = false;
  }
};

watch(selectedAssistantId, syncSelection);
onMounted(fetchAssistants);
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-5 pb-20 pt-3 lg:pb-12">
    <section
      class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6"
    >
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <p class="dashboard-eyebrow text-primary/80">Assistant tools</p>
          <h1 class="dashboard-section-title mt-2">Tools</h1>
          <p class="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/65">
            Enable appointment, calendar, checkout, and website-builder actions
            for one assistant at a time.
          </p>
        </div>
        <NuxtLink to="/dashboard/agents" class="dashboard-header-action-btn">
          <Bot class="h-3.5 w-3.5" />
          Assistants
        </NuxtLink>
      </div>
    </section>

    <section
      v-if="isLoading"
      class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
    >
      <div
        class="flex flex-col gap-2 border-b border-foreground/10 p-3 lg:flex-row lg:items-center"
      >
        <Skeleton height="2.5rem" radius="0.75rem" class="lg:w-64" />
        <div class="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
          <Skeleton height="2.5rem" radius="0.75rem" class="sm:w-64" />
          <Skeleton height="2.5rem" radius="0.75rem" class="sm:w-36" />
          <Skeleton height="2.5rem" radius="0.75rem" class="sm:w-40" />
          <Skeleton height="2.5rem" radius="0.75rem" class="sm:w-20" />
        </div>
      </div>
      <div
        class="grid gap-2 border-b border-foreground/10 p-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div
          v-for="card in 4"
          :key="`stat-skeleton-${card}`"
          class="rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.02] p-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1 space-y-2">
              <Skeleton width="62%" height="0.65rem" radius="999px" />
              <Skeleton width="32%" height="1.4rem" radius="999px" />
              <Skeleton width="78%" height="0.65rem" radius="999px" />
            </div>
            <Skeleton width="2rem" height="2rem" radius="0.7rem" />
          </div>
        </div>
      </div>
      <div class="overflow-hidden">
        <div class="hidden md:block">
          <div
            class="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr] gap-4 border-b border-foreground/10 px-4 py-3"
          >
            <Skeleton
              v-for="column in 5"
              :key="`head-${column}`"
              height="0.75rem"
              radius="999px"
            />
          </div>
          <div
            v-for="row in 6"
            :key="`tool-skeleton-${row}`"
            class="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr] gap-4 border-b border-foreground/10 px-4 py-3 last:border-b-0"
          >
            <div class="flex items-center gap-3">
              <Skeleton width="2.25rem" height="2.25rem" radius="0.75rem" />
              <div class="min-w-0 flex-1 space-y-2">
                <Skeleton height="0.85rem" radius="999px" />
                <Skeleton width="55%" height="0.65rem" radius="999px" />
              </div>
            </div>
            <Skeleton height="0.9rem" radius="999px" class="self-center" />
            <Skeleton height="0.9rem" radius="999px" class="self-center" />
            <Skeleton height="0.9rem" radius="999px" class="self-center" />
            <Skeleton height="2rem" radius="0.6rem" class="self-center" />
          </div>
        </div>
        <div class="grid gap-2 p-3 md:hidden">
          <div
            v-for="row in 4"
            :key="`mobile-tool-skeleton-${row}`"
            class="rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.02] p-3"
          >
            <div class="flex items-start gap-3">
              <Skeleton width="2.25rem" height="2.25rem" radius="0.75rem" />
              <div class="min-w-0 flex-1 space-y-2">
                <Skeleton height="0.85rem" radius="999px" />
                <Skeleton width="50%" height="0.65rem" radius="999px" />
                <Skeleton width="82%" height="0.65rem" radius="999px" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      v-else-if="assistants.length === 0"
      class="rounded-[0.39rem] border border-dashed border-foreground/10 bg-background-card/45 p-10 text-center shadow-sm shadow-black/5"
    >
      <Bot class="mx-auto mb-5 h-12 w-12 text-foreground/15" />
      <h2 class="text-xl font-bold text-foreground">
        Create an assistant first
      </h2>
      <p
        class="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-foreground/50"
      >
        Tools are assigned to an assistant. Create one, then return here to
        enable appointment and booking actions.
      </p>
      <NuxtLink
        to="/dashboard/agents"
        class="mt-6 inline-flex rounded-[0.39rem] bg-primary px-5 py-2.5 text-xs font-bold text-black transition hover:bg-primary-accent"
        >Open assistants</NuxtLink
      >
    </section>

    <div v-else>
      <main class="min-w-0">
        <section
          class="min-w-0 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
        >
          <div
            class="flex flex-col gap-2 border-b border-foreground/10 p-3 xl:flex-row xl:items-center"
          >
            <div class="relative w-full xl:w-64 xl:shrink-0">
              <select
                v-model="selectedAssistantId"
                class="h-10 w-full cursor-pointer appearance-none rounded-[0.39rem] border border-foreground/10 bg-background px-3 pr-9 text-sm font-bold text-foreground focus:border-primary/40 focus:outline-none"
              >
                <option
                  v-for="assistant in assistants"
                  :key="assistant.id"
                  :value="assistant.id"
                  class="bg-background"
                >
                  {{ assistant.name }}
                </option>
              </select>
              <ChevronDown
                class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50"
              />
            </div>
            <div
              class="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1fr)_auto_auto_auto] xl:justify-end"
            >
              <label class="relative block min-w-0">
                <Search
                  class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35"
                />
                <input
                  v-model="toolSearch"
                  type="search"
                  placeholder="Search tools or status"
                  class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background py-2 pl-9 pr-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/40"
                />
              </label>
              <select
                v-model="toolStatusFilter"
                class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-semibold text-foreground/60 outline-none focus:border-primary/40 lg:w-36"
              >
                <option
                  v-for="status in toolStatuses"
                  :key="status"
                  :value="status"
                >
                  {{ status === "all" ? "All status" : status }}
                </option>
              </select>
              <select
                v-model="toolCategoryFilter"
                class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-semibold text-foreground/60 outline-none focus:border-primary/40 lg:w-44"
              >
                <option
                  v-for="category in toolCategories"
                  :key="category"
                  :value="category"
                >
                  {{ category === "all" ? "All categories" : category }}
                </option>
              </select>
              <button
                @click="saveTools"
                :disabled="!hasChanges || isSaving"
                class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-4 text-xs font-bold text-black transition hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
              >
                <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
                <Save v-else class="h-4 w-4" />
                Save
              </button>
            </div>
          </div>

          <div
            class="grid gap-2 border-b border-foreground/10 p-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <article
              v-for="stat in toolStats"
              :key="stat.label"
              :class="[
                'rounded-[0.39rem] border p-3 transition',
                statCardClass(stat.tone),
              ]"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-xs font-medium text-foreground/45">
                    {{ stat.label }}
                  </p>
                  <p
                    class="mt-1 text-2xl font-bold leading-none text-foreground"
                  >
                    {{ stat.value }}
                  </p>
                  <p
                    class="mt-2 truncate text-xs font-semibold text-foreground/45"
                  >
                    {{ stat.detail }}
                  </p>
                </div>
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.39rem] bg-background text-foreground/55 ring-1 ring-foreground/10"
                >
                  <component :is="stat.icon" class="h-4 w-4" />
                </div>
              </div>
            </article>
          </div>

          <div class="hidden overflow-x-auto md:block">
            <table class="w-full min-w-[760px] text-left">
              <thead
                class="sticky top-0 z-10 bg-background-card text-xs font-semibold text-foreground/40"
              >
                <tr class="border-b border-foreground/10">
                  <th class="px-4 py-3">Tool name</th>
                  <th class="px-4 py-3">Category</th>
                  <th class="px-4 py-3">Status</th>
                  <th class="px-4 py-3">Connected data</th>
                  <th class="px-4 py-3 text-right">Quick actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-foreground/10">
                <tr
                  v-for="row in filteredToolRows"
                  :key="row.id"
                  class="group transition hover:bg-primary/[0.03]"
                >
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div
                        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.39rem] bg-foreground/5 text-foreground/50"
                      >
                        <component :is="row.icon" class="h-4 w-4" />
                      </div>
                      <div class="min-w-0">
                        <p class="truncate text-sm font-bold text-foreground">
                          {{ row.name }}
                        </p>
                        <p class="text-xs font-medium text-foreground/40">
                          {{ row.category }} tool
                        </p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-xs font-bold text-foreground/55">
                    {{ row.category }}
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex items-center gap-2 text-xs font-bold text-foreground/70"
                      ><span
                        :class="[
                          'h-2 w-2 rounded-full shadow-md',
                          statusDotClass(row.tone),
                        ]"
                      />{{ row.status }}</span
                    >
                  </td>
                  <td class="max-w-[16rem] px-4 py-3">
                    <p
                      class="truncate text-xs font-semibold text-foreground/50"
                    >
                      {{ row.connectedData }}
                    </p>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      type="button"
                      class="rounded-[0.39rem] border border-foreground/10 bg-foreground/5 px-3 py-2 text-xs font-bold text-foreground/60 transition hover:border-primary/30 hover:text-primary"
                      @click.stop="handleToolAction(row.id)"
                    >
                      {{ row.action }}
                    </button>
                  </td>
                </tr>
                <tr v-if="filteredToolRows.length === 0">
                  <td
                    colspan="5"
                    class="px-4 py-8 text-center text-xs font-bold text-foreground/45"
                  >
                    No tools match the current filters.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="grid gap-2 p-3 md:hidden">
            <article
              v-for="row in filteredToolRows"
              :key="`mobile-${row.id}`"
              class="rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.02] p-3"
            >
              <div class="flex items-start gap-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.39rem] bg-foreground/5 text-foreground/55"
                >
                  <component :is="row.icon" class="h-4 w-4" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-bold text-foreground">
                        {{ row.name }}
                      </p>
                      <p class="mt-1 text-xs font-medium text-foreground/40">
                        {{ row.category }}
                      </p>
                    </div>
                    <span
                      class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-foreground/10 bg-background px-2 py-1 text-xs font-bold text-foreground/60"
                    >
                      <span
                        :class="[
                          'h-1.5 w-1.5 rounded-full shadow-md',
                          statusDotClass(row.tone),
                        ]"
                      />
                      {{ row.status }}
                    </span>
                  </div>
                  <p
                    class="mt-3 line-clamp-2 text-xs font-semibold leading-relaxed text-foreground/50"
                  >
                    {{ row.connectedData }}
                  </p>
                  <button
                    type="button"
                    class="mt-3 inline-flex h-9 w-full items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-foreground/5 px-3 text-xs font-bold text-foreground/65 transition hover:border-primary/30 hover:text-primary"
                    @click="handleToolAction(row.id)"
                  >
                    {{ row.action }}
                  </button>
                </div>
              </div>
            </article>
            <div
              v-if="filteredToolRows.length === 0"
              class="rounded-[0.39rem] border border-dashed border-foreground/10 p-6 text-center text-xs font-bold text-foreground/45"
            >
              No tools match the current filters.
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>
