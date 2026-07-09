<script setup lang="ts">
import {
  Bot,
  Briefcase,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Globe2,
  GraduationCap,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Settings2,
} from "lucide-vue-next";
import Skeleton from "~~/app/components/Skeleton.vue";

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
const selectedAssistantId = useState<string>(
  "dashboard-tools-selected-bot-id",
  () => "",
);
const toolsBotOptions = useState<Array<{ label: string; value: string }>>(
  "dashboard-tools-bot-options",
  () => [],
);
const appointmentsEnabled = ref(false);
const depositsEnabled = ref(false);
const bookingMode = ref<"appointments" | "bookings" | "mixed">("mixed");
const confirmationMode = ref<"instant" | "manual">("manual");
const googleCalendarStatus = ref<any>(null);
const toolSearch = ref("");
const toolCategoryFilter = ref("all");
const toolStatusFilter = ref("all");
const toolGroupFilter = ref("all");
const toolActionFilter = ref("all");
const toolPage = ref(1);
const toolPageSize = ref(5);

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

const bookingModeOptions = [
  {
    value: "appointments",
    label: "Appointments",
    description:
      "Business meetings, project reviews, staff time, and consultations.",
  },
  {
    value: "bookings",
    label: "Bookings",
    description: "Services, rooms, calls, seats, tables, and reserved slots.",
  },
  {
    value: "mixed",
    label: "Both",
    description: "Bookings and appointments in one assistant flow.",
  },
] as const;

const confirmationModeOptions = [
  {
    value: "manual",
    label: "Manual approval",
    description: "Review requests before confirming.",
  },
  {
    value: "instant",
    label: "Instant confirmation",
    description: "Confirm available slots automatically.",
  },
] as const;

const toolRows = computed(() => [
  {
    id: "bookings",
    name: "Bookings",
    category: "Bookings",
    group: "Business",
    status: isPremium.value ? "Available" : "Locked",
    tone: isPremium.value ? "active" : "locked",
    description:
      "Book a service, room, call, seat, table, or reserved slot from the business workspace.",
    connectedData: "Open the bookings workspace",
    requirement: "Business workspace",
    action: isPremium.value ? "Open" : "Upgrade",
    route: isPremium.value ? "/dashboard/appointments" : "/dashboard/pricing",
    icon: CalendarDays,
  },
  {
    id: "appointments",
    name: "Appointments",
    category: "Appointments",
    group: "Business",
    status: !isPremium.value
      ? "Locked"
      : appointmentsEnabled.value
        ? "On"
        : "Off",
    tone: !isPremium.value
      ? "locked"
      : appointmentsEnabled.value
        ? "active"
        : "disabled",
    description:
      "Set appointments for business meetings, project reviews, consultations, staff schedules, and follow-ups.",
    connectedData: appointmentsEnabled.value
      ? `${confirmationMode.value === "manual" ? "manual approval" : "instant confirmation"}${googleCalendarConnected.value ? ` · ${googleCalendarLabel.value}` : ""}`
      : "Not enabled for this assistant",
    requirement: "Availability and calendar setup stay inside appointments",
    action: appointmentsEnabled.value ? "Disable" : "Enable",
    icon: CalendarCheck2,
  },
  {
    id: "localpayment",
    name: "Local payment",
    category: "Payments",
    group: "Business",
    status: !isPremium.value
      ? "Locked"
      : !appointmentsEnabled.value
        ? "Waiting"
        : depositsEnabled.value
          ? "Configured"
          : "Admin setup",
    tone: !isPremium.value
      ? "locked"
      : !appointmentsEnabled.value
        ? "disabled"
        : depositsEnabled.value
          ? "active"
          : "attention",
    description:
      "Admin-configured MTN/Airtel mobile payment for booking payments, scoped to an account and assistant.",
    connectedData: depositsEnabled.value
      ? "Local payment configured for this account and assistant"
      : appointmentsEnabled.value
        ? "Local payment configuration required"
        : "Enable appointments before local payment setup",
    requirement: "Local payment config per account and assistant",
    action: !appointmentsEnabled.value ? "Enable appointments" : "Configure",
    icon: CreditCard,
  },
  {
    id: "pdf_designer",
    name: "PDF designer",
    category: "Documents",
    group: "Creation",
    status: "Available",
    tone: "active",
    description:
      "Create polished PDF documents with designed sections, service summaries, offers, and branded handouts.",
    connectedData: "Design-ready PDF builder",
    requirement: "Dashboard tool",
    action: "Create",
    route: "/dashboard/agents/tools/pdf-designer",
    icon: FileText,
  },
  {
    id: "website_builder",
    name: "Website builder",
    category: "Websites",
    group: "Creation",
    status: isPremium.value ? "Available" : "Locked",
    tone: isPremium.value ? "active" : "locked",
    description:
      "Create and update customer websites from this assistant when Enterprise controls are available.",
    connectedData: isPremium.value
      ? "Ready to open for this assistant"
      : "Plan upgrade required",
    requirement: "Enterprise workspace",
    action: isPremium.value ? "Open" : "Upgrade",
    route: isPremium.value ? websiteBuilderLink.value : "/dashboard/pricing",
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
const toolGroups = computed(() => [
  "all",
  ...Array.from(new Set(toolRows.value.map((row) => row.group))),
]);
const toolActions = computed(() => [
  "all",
  ...Array.from(new Set(toolRows.value.map((row) => row.action))),
]);
const filteredToolRows = computed(() => {
  const query = toolSearch.value.trim().toLowerCase();
  return toolRows.value.filter((row) => {
    const matchesSearch =
      !query ||
      [
        row.name,
        row.category,
        row.group,
        row.status,
        row.action,
        row.description,
        row.connectedData,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesCategory =
      toolCategoryFilter.value === "all" ||
      row.category === toolCategoryFilter.value;
    const matchesStatus =
      toolStatusFilter.value === "all" || row.status === toolStatusFilter.value;
    const matchesGroup =
      toolGroupFilter.value === "all" || row.group === toolGroupFilter.value;
    const matchesAction =
      toolActionFilter.value === "all" || row.action === toolActionFilter.value;
    return (
      matchesSearch &&
      matchesCategory &&
      matchesStatus &&
      matchesGroup &&
      matchesAction
    );
  });
});

const toolTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredToolRows.value.length / toolPageSize.value)),
);
const paginatedToolRows = computed(() => {
  const start = (toolPage.value - 1) * toolPageSize.value;
  return filteredToolRows.value.slice(start, start + toolPageSize.value);
});
const toolPageStart = computed(() =>
  filteredToolRows.value.length === 0
    ? 0
    : (toolPage.value - 1) * toolPageSize.value + 1,
);
const toolPageEnd = computed(() =>
  Math.min(toolPage.value * toolPageSize.value, filteredToolRows.value.length),
);
const resetToolFilters = () => {
  toolSearch.value = "";
  toolCategoryFilter.value = "all";
  toolStatusFilter.value = "all";
  toolGroupFilter.value = "all";
  toolActionFilter.value = "all";
  toolPage.value = 1;
};

const botTrackingRows = computed(() =>
  toolRows.value.filter((row) =>
    ["On", "Connected", "Configured"].includes(row.status),
  ),
);

const toolStats = computed(() => {
  const rows = toolRows.value;
  const usedCount = rows.filter((row) =>
    ["On", "Connected", "Available", "Configured"].includes(row.status),
  ).length;
  const disabledCount = rows.filter((row) =>
    ["Off", "Waiting", "Locked"].includes(row.status),
  ).length;
  const configureCount = rows.filter((row) =>
    ["Needs setup", "Checking", "Admin setup"].includes(row.status),
  ).length;

  return [
    {
      label: "Tools",
      value: rows.length,
      detail: "Available for this assistant",
      tone: "primary",
      icon: Settings2,
    },
    {
      label: "Used tools",
      value: usedCount,
      detail: "On, connected, configured, or available",
      tone: usedCount > 0 ? "green" : "primary",
      icon: CheckCircle2,
    },
    {
      label: "Disabled",
      value: disabledCount,
      detail: "Off, waiting, or locked",
      tone: disabledCount > 0 ? "red" : "primary",
      icon: CalendarDays,
    },
    {
      label: "Configure",
      value: configureCount,
      detail: "Needs setup or checking",
      tone: configureCount > 0 ? "amber" : "primary",
      icon: CalendarCheck2,
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

const statusPillClass = (tone: string) =>
  ({
    active:
      "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-700 dark:text-emerald-200",
    pending:
      "border-sky-400/20 bg-sky-400/[0.06] text-sky-700 dark:text-sky-200",
    attention:
      "border-orange-400/20 bg-orange-400/[0.06] text-orange-700 dark:text-orange-200",
    locked:
      "border-red-400/20 bg-red-400/[0.06] text-red-700 dark:text-red-200",
    disabled: "border-foreground/10 bg-foreground/[0.03] text-foreground/55",
  })[tone] || "border-foreground/10 bg-foreground/[0.03] text-foreground/55";

const statCardClass = (tone: string) =>
  ({
    primary: "bg-primary/10 text-primary ring-primary/15",
    blue: "bg-sky-400/10 text-sky-400 ring-sky-400/15",
    green: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/15",
    amber: "bg-amber-400/10 text-amber-400 ring-amber-400/15",
    red: "bg-red-400/10 text-red-400 ring-red-400/15",
    pink: "bg-pink-400/10 text-pink-400 ring-pink-400/15",
    violet: "bg-violet-400/10 text-violet-400 ring-violet-400/15",
  })[tone] || "bg-foreground/5 text-foreground/60 ring-foreground/10";

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
    console.error("Failed to load appointment calendar mapping:", err);
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
    toolsBotOptions.value = assistants.value.map((assistant) => ({
      label: assistant.name || "Untitled assistant",
      value: assistant.id,
    }));
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
    else if (
      !selectedAssistantId.value ||
      !assistants.value.some(
        (assistant) => assistant.id === selectedAssistantId.value,
      )
    )
      selectedAssistantId.value = assistants.value[0]?.id || "";
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

const handleToolAction = (toolId: string) => {
  if (toolId === "appointments") return enableAppointments();
  if (toolId === "localpayment") {
    if (!appointmentsEnabled.value) return enableAppointments();
    return navigateTo(calendarSetupLink.value);
  }
  const row = toolRows.value.find((item) => item.id === toolId);
  if (row?.route) return navigateTo(row.route);
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
      "Tools saved. Manage calendar setup from appointments settings.",
    );
  } catch (err: any) {
    console.error("Failed to save tools:", err);
    notify.error(err?.message || "Failed to save tools.");
  } finally {
    isSaving.value = false;
  }
};

watch(selectedAssistantId, syncSelection);
watch(
  [
    toolSearch,
    toolCategoryFilter,
    toolStatusFilter,
    toolGroupFilter,
    toolActionFilter,
    toolPageSize,
  ],
  () => {
    toolPage.value = 1;
  },
);
watch(toolTotalPages, (total) => {
  if (toolPage.value > total) toolPage.value = total;
});
onMounted(fetchAssistants);
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-4 pb-24 pt-5 lg:pb-12 lg:pt-6">
    <div v-if="isLoading" class="space-y-4">
      <section class="space-y-3 pt-4 lg:pt-6">
        <div
          class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]"
        >
          <div class="grid grid-cols-2 gap-3">
            <article
              v-for="card in 4"
              :key="`tool-stat-skeleton-${card}`"
              class="flex items-center gap-2.5 rounded-[0.39rem] bg-background/45 py-3 pl-3 pr-2"
            >
              <Skeleton width="3.25rem" height="3.25rem" radius="0.39rem" />
              <div class="min-w-0 flex-1 space-y-2">
                <Skeleton width="34%" height="1.1rem" radius="999px" />
                <Skeleton width="58%" height="0.8rem" radius="999px" />
                <Skeleton width="78%" height="0.65rem" radius="999px" />
              </div>
            </article>
          </div>

          <aside
            class="relative overflow-hidden rounded-[0.39rem] bg-background-card/75 p-4 shadow-sm shadow-black/5 ring-1 ring-foreground/[0.06]"
          >
            <div
              class="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl"
            ></div>
            <div class="relative z-10 space-y-3">
              <div class="mb-1 flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1 space-y-2">
                  <Skeleton width="5.5rem" height="0.65rem" radius="999px" />
                  <Skeleton width="8rem" height="0.9rem" radius="999px" />
                  <Skeleton width="62%" height="0.7rem" radius="999px" />
                </div>
                <Skeleton width="2.5rem" height="2.5rem" radius="0.39rem" />
              </div>
              <div
                v-for="row in 3"
                :key="`tracked-tool-skeleton-${row}`"
                class="flex items-center justify-between gap-3 rounded-[0.39rem] bg-background/45 p-3 ring-1 ring-foreground/[0.05]"
              >
                <div class="flex min-w-0 flex-1 items-center gap-3">
                  <Skeleton width="2rem" height="2rem" radius="0.35rem" />
                  <div class="min-w-0 flex-1 space-y-2">
                    <Skeleton width="54%" height="0.75rem" radius="999px" />
                    <Skeleton width="78%" height="0.6rem" radius="999px" />
                  </div>
                </div>
                <Skeleton width="4.5rem" height="1.3rem" radius="999px" />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section
        class="min-w-0 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
      >
        <div class="space-y-3 border-b border-foreground/10 p-3">
          <div
            class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <div class="space-y-2">
              <Skeleton width="6.5rem" height="0.9rem" radius="999px" />
              <Skeleton width="12rem" height="0.65rem" radius="999px" />
            </div>
            <div class="flex flex-wrap gap-2 lg:justify-end">
              <Skeleton width="6.25rem" height="2.25rem" radius="0.39rem" />
              <Skeleton width="5.75rem" height="2.25rem" radius="0.39rem" />
            </div>
          </div>
          <div class="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
            <Skeleton width="16rem" height="2.5rem" radius="0.39rem" />
            <Skeleton width="7rem" height="2.5rem" radius="0.39rem" />
            <Skeleton width="8.5rem" height="2.5rem" radius="0.39rem" />
            <Skeleton width="7.5rem" height="2.5rem" radius="0.39rem" />
            <Skeleton width="7rem" height="2.5rem" radius="0.39rem" />
            <Skeleton width="5.5rem" height="2.5rem" radius="0.39rem" />
          </div>
        </div>

        <div class="overflow-x-auto p-3">
          <table
            class="w-full min-w-[920px] border-separate border-spacing-y-2 text-left"
          >
            <thead class="text-[11px] font-bold text-foreground/35">
              <tr>
                <th class="px-[0.9rem] py-3">Tool</th>
                <th class="px-[0.9rem] py-3">Group</th>
                <th class="px-[0.9rem] py-3">Category</th>
                <th class="px-[0.9rem] py-3">Status</th>
                <th class="px-[0.9rem] py-3">State</th>
                <th class="px-[0.9rem] py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in 5"
                :key="`tool-row-skeleton-${row}`"
                class="group"
              >
                <td
                  class="rounded-l-[0.39rem] bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05]"
                >
                  <div class="flex items-center gap-3">
                    <Skeleton
                      width="2.25rem"
                      height="2.25rem"
                      radius="0.39rem"
                    />
                    <div class="min-w-0 flex-1 space-y-2">
                      <Skeleton width="54%" height="0.8rem" radius="999px" />
                      <Skeleton width="92%" height="0.65rem" radius="999px" />
                    </div>
                  </div>
                </td>
                <td
                  class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05]"
                >
                  <Skeleton width="5.75rem" height="1.35rem" radius="999px" />
                </td>
                <td
                  class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05]"
                >
                  <Skeleton width="6.5rem" height="1.35rem" radius="999px" />
                </td>
                <td
                  class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05]"
                >
                  <Skeleton width="5.5rem" height="1.35rem" radius="999px" />
                </td>
                <td
                  class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05]"
                >
                  <div class="space-y-2">
                    <Skeleton width="88%" height="0.7rem" radius="999px" />
                    <Skeleton width="58%" height="0.6rem" radius="999px" />
                  </div>
                </td>
                <td
                  class="rounded-r-[0.39rem] bg-background/45 px-[0.9rem] py-3 text-right ring-1 ring-inset ring-foreground/[0.05]"
                >
                  <Skeleton
                    width="5.75rem"
                    height="2rem"
                    radius="0.39rem"
                    class="ml-auto"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="border-t border-foreground/10 px-3 py-3">
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <Skeleton width="10rem" height="0.75rem" radius="999px" />
            <div class="flex items-center gap-2">
              <Skeleton width="5.25rem" height="2.25rem" radius="0.39rem" />
              <Skeleton width="12rem" height="2.25rem" radius="0.39rem" />
            </div>
          </div>
        </div>
      </section>
    </div>

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
        Tools are assigned to an assistant. Create one, then return to enable
        bookings, calendar, checkout, and website actions.
      </p>
      <NuxtLink
        to="/dashboard/agents"
        class="mt-6 inline-flex rounded-[0.39rem] bg-primary px-5 py-2.5 text-xs font-bold text-black transition hover:bg-primary-accent"
      >
        Open assistants
      </NuxtLink>
    </section>

    <div v-else class="space-y-4">
      <section class="space-y-3 pt-4 lg:pt-6">
        <div
          v-if="hasChanges"
          class="flex flex-col gap-3 rounded-[0.39rem] border border-primary/15 bg-primary/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-start gap-3">
            <div
              class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.39rem] border border-primary/20 bg-primary/10 text-primary"
            >
              <Settings2 class="h-4 w-4" />
            </div>
            <div>
              <p class="text-sm font-bold text-foreground">Unsaved changes</p>
              <p class="mt-0.5 text-xs font-medium text-foreground/55">
                Save changes to apply this tool setup to
                {{ selectedAssistant?.name || "this assistant" }}.
              </p>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-bold text-foreground/65 transition hover:border-primary/30 hover:text-primary"
              @click="syncSelection"
            >
              <RotateCcw class="h-3.5 w-3.5" />
              Discard
            </button>
            <button
              type="button"
              :disabled="isSaving"
              class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-3 text-xs font-bold text-black transition hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-50"
              @click="saveTools"
            >
              <Loader2 v-if="isSaving" class="h-3.5 w-3.5 animate-spin" />
              <Save v-else class="h-3.5 w-3.5" />
              Save
            </button>
          </div>
        </div>

        <div
          class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]"
        >
          <div class="grid grid-cols-2 gap-3">
            <article
              v-for="stat in toolStats"
              :key="stat.label"
              class="group flex items-center gap-2.5 rounded-[0.39rem] bg-background/45 py-3 pl-3 pr-2 transition hover:bg-foreground/[0.035]"
            >
              <div
                :class="[
                  'flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-[0.39rem] ring-1 transition group-hover:scale-105',
                  statCardClass(stat.tone),
                ]"
              >
                <component :is="stat.icon" class="h-7 w-7" />
              </div>
              <div class="min-w-0">
                <p
                  class="text-xl font-bold leading-none tabular-nums text-foreground"
                >
                  {{ stat.value }}
                </p>
                <p
                  class="mt-1 truncate text-sm font-semibold text-foreground/75"
                >
                  {{ stat.label }}
                </p>
                <p
                  class="mt-0.5 truncate text-[11px] font-semibold text-foreground/50"
                >
                  {{ stat.detail }}
                </p>
              </div>
            </article>
          </div>

          <aside
            class="relative overflow-hidden rounded-[0.39rem] bg-background-card/75 p-4 shadow-sm shadow-black/5 ring-1 ring-foreground/[0.06]"
          >
            <div
              class="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl"
            ></div>
            <div class="relative z-10">
              <div class="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p class="dashboard-eyebrow text-primary/80">Bot tracking</p>
                  <h2 class="text-sm font-bold text-foreground">
                    Tools used by bot
                  </h2>
                  <p
                    class="mt-1 truncate text-xs font-medium text-foreground/50"
                  >
                    {{ selectedAssistant?.name || "Selected assistant" }}
                  </p>
                </div>
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15"
                >
                  <Bot class="h-5 w-5" />
                </div>
              </div>

              <div v-if="botTrackingRows.length" class="space-y-2">
                <div
                  v-for="row in botTrackingRows"
                  :key="`tracked-${row.id}`"
                  class="flex items-center justify-between gap-3 rounded-[0.39rem] bg-background/45 p-3 ring-1 ring-foreground/[0.05]"
                >
                  <div class="flex min-w-0 items-center gap-3">
                    <div
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] bg-primary/10 text-primary ring-1 ring-primary/15"
                    >
                      <component :is="row.icon" class="h-4 w-4" />
                    </div>
                    <div class="min-w-0">
                      <p class="truncate text-sm font-bold text-foreground">
                        {{ row.name }}
                      </p>
                      <p
                        class="truncate text-[11px] font-medium text-foreground/45"
                      >
                        {{ row.connectedData }}
                      </p>
                    </div>
                  </div>
                  <span
                    :class="[
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold',
                      statusPillClass(row.tone),
                    ]"
                  >
                    <span
                      :class="[
                        'h-1.5 w-1.5 rounded-full shadow-sm',
                        statusDotClass(row.tone),
                      ]"
                    />
                    {{ row.status }}
                  </span>
                </div>
              </div>

              <div
                v-else
                class="rounded-[0.39rem] border border-dashed border-foreground/[0.08] bg-background/35 p-5 text-center"
              >
                <Settings2 class="mx-auto mb-3 h-8 w-8 text-foreground/20" />
                <p class="text-sm font-bold text-foreground">
                  No tools used yet
                </p>
                <p class="mt-1 text-xs text-foreground/45">
                  Enable bookings or configure services to start tracking tool
                  use.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section
        class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
      >
        <div class="border-b border-foreground/10 p-4 sm:p-5">
          <div
            class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <div class="flex items-center gap-2">
                <p class="text-sm font-bold text-foreground">Tool table</p>
                <span
                  class="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[11px] font-bold text-foreground/45"
                >
                  {{ filteredToolRows.length }} / {{ toolRows.length }}
                </span>
              </div>
              <p
                class="mt-1 max-w-2xl text-xs font-medium leading-relaxed text-foreground/50"
              >
                Review assistant actions, workspace links, setup state, and
                creation tools.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <NuxtLink
                to="/dashboard/business"
                class="group inline-flex h-9 items-center gap-2 rounded-[0.39rem] border border-amber-400/15 bg-amber-400/[0.06] px-3 text-xs font-bold text-amber-500 transition hover:border-amber-400/30 hover:bg-amber-400/10"
              >
                <Briefcase class="h-3.5 w-3.5" />
                Business
                <ChevronRight
                  class="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                />
              </NuxtLink>
              <NuxtLink
                to="/dashboard/school/ai-tutor"
                class="group inline-flex h-9 items-center gap-2 rounded-[0.39rem] border border-violet-400/15 bg-violet-400/[0.06] px-3 text-xs font-bold text-violet-400 transition hover:border-violet-400/30 hover:bg-violet-400/10"
              >
                <GraduationCap class="h-3.5 w-3.5" />
                School
                <ChevronRight
                  class="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                />
              </NuxtLink>
            </div>
          </div>
        </div>

        <div class="border-b border-foreground/10 p-3">
          <div
            class="grid gap-2 lg:grid-cols-[minmax(14rem,1fr)_repeat(4,minmax(8rem,auto))_auto]"
          >
            <label class="relative block min-w-0">
              <Search
                class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35"
              />
              <input
                v-model="toolSearch"
                type="search"
                placeholder="Search tools, workspace, setup, or action"
                class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background py-2 pl-9 pr-3 text-sm font-semibold text-foreground outline-none transition placeholder:text-foreground/35 focus:border-primary/40"
              />
            </label>
            <select
              v-model="toolGroupFilter"
              class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-semibold text-foreground/60 outline-none focus:border-primary/40"
            >
              <option v-for="group in toolGroups" :key="group" :value="group">
                {{ group === "all" ? "All groups" : group }}
              </option>
            </select>
            <select
              v-model="toolCategoryFilter"
              class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-semibold text-foreground/60 outline-none focus:border-primary/40"
            >
              <option
                v-for="category in toolCategories"
                :key="category"
                :value="category"
              >
                {{ category === "all" ? "All categories" : category }}
              </option>
            </select>
            <select
              v-model="toolStatusFilter"
              class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-semibold text-foreground/60 outline-none focus:border-primary/40"
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
              v-model="toolActionFilter"
              class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-semibold text-foreground/60 outline-none focus:border-primary/40"
            >
              <option
                v-for="action in toolActions"
                :key="action"
                :value="action"
              >
                {{ action === "all" ? "All actions" : action }}
              </option>
            </select>
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-foreground/5 px-3 text-xs font-bold text-foreground/55 transition hover:border-primary/30 hover:text-primary"
              @click="resetToolFilters"
            >
              Reset
            </button>
          </div>
        </div>

        <div class="hidden overflow-x-auto p-3 md:block">
          <table
            class="w-full min-w-[960px] border-separate border-spacing-y-2 text-left"
          >
            <thead class="text-[11px] font-bold text-foreground/35">
              <tr>
                <th class="px-[0.9rem] py-3">Tool</th>
                <th class="px-[0.9rem] py-3">Group</th>
                <th class="px-[0.9rem] py-3">Category</th>
                <th class="px-[0.9rem] py-3">Status</th>
                <th class="px-[0.9rem] py-3">State</th>
                <th class="px-[0.9rem] py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in paginatedToolRows" :key="row.id" class="group">
                <td
                  class="rounded-l-[0.39rem] bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.39rem] bg-foreground/5 text-foreground/50 transition group-hover:text-primary"
                    >
                      <component :is="row.icon" class="h-4 w-4" />
                    </div>
                    <div class="min-w-0">
                      <p class="truncate text-sm font-bold text-foreground">
                        {{ row.name }}
                      </p>
                      <p
                        class="max-w-[18rem] truncate text-xs font-medium text-foreground/40"
                      >
                        {{ row.description }}
                      </p>
                    </div>
                  </div>
                </td>
                <td
                  class="bg-background/45 px-[0.9rem] py-3 text-xs font-bold text-foreground/45 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                >
                  {{ row.group }}
                </td>
                <td
                  class="bg-background/45 px-[0.9rem] py-3 text-xs font-bold text-foreground/55 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                >
                  {{ row.category }}
                </td>
                <td
                  class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                >
                  <span
                    :class="[
                      'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold',
                      statusPillClass(row.tone),
                    ]"
                  >
                    <span
                      :class="[
                        'h-1.5 w-1.5 rounded-full shadow-sm',
                        statusDotClass(row.tone),
                      ]"
                    />
                    {{ row.status }}
                  </span>
                </td>
                <td
                  class="max-w-[15rem] bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                >
                  <p class="truncate text-xs font-semibold text-foreground/55">
                    {{ row.connectedData }}
                  </p>
                </td>
                <td
                  class="rounded-r-[0.39rem] bg-background/45 px-[0.9rem] py-3 text-right ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                >
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
                  colspan="6"
                  class="px-[0.9rem] py-8 text-center text-xs font-bold text-foreground/45"
                >
                  No tools match the current filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid gap-2 p-3 md:hidden">
          <article
            v-for="row in paginatedToolRows"
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
                      {{ row.group }} · {{ row.category }}
                    </p>
                  </div>
                  <span
                    :class="[
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-bold',
                      statusPillClass(row.tone),
                    ]"
                  >
                    <span
                      :class="[
                        'h-1.5 w-1.5 rounded-full shadow-sm',
                        statusDotClass(row.tone),
                      ]"
                    />
                    {{ row.status }}
                  </span>
                </div>
                <p
                  class="mt-3 line-clamp-2 text-xs font-medium leading-relaxed text-foreground/55"
                >
                  {{ row.description }}
                </p>
                <p
                  class="mt-2 truncate text-xs font-semibold text-foreground/45"
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
        </div>
        <div class="border-t border-foreground/10 px-3 py-3">
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-xs font-semibold text-foreground/45">
              Showing {{ toolPageStart }}-{{ toolPageEnd }} of
              {{ filteredToolRows.length }} tools
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <select
                v-model.number="toolPageSize"
                class="h-9 rounded-[0.39rem] border border-foreground/10 bg-background px-2 text-xs font-bold text-foreground/55 outline-none focus:border-primary/40"
              >
                <option :value="5">5 / page</option>
                <option :value="10">10 / page</option>
                <option :value="20">20 / page</option>
              </select>
              <div
                class="inline-flex items-center overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background"
              >
                <button
                  type="button"
                  :disabled="toolPage <= 1"
                  class="inline-flex h-9 items-center gap-1 px-3 text-xs font-bold text-foreground/55 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                  @click="toolPage = Math.max(1, toolPage - 1)"
                >
                  <ChevronLeft class="h-3.5 w-3.5" />
                  Prev
                </button>
                <span
                  class="border-x border-foreground/10 px-3 text-xs font-bold text-foreground/45"
                >
                  {{ toolPage }} / {{ toolTotalPages }}
                </span>
                <button
                  type="button"
                  :disabled="toolPage >= toolTotalPages"
                  class="inline-flex h-9 items-center gap-1 px-3 text-xs font-bold text-foreground/55 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                  @click="toolPage = Math.min(toolTotalPages, toolPage + 1)"
                >
                  Next
                  <ChevronRight class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
