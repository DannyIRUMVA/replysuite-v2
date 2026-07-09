<script setup lang="ts">
import {
  Activity,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Edit3,
  Globe,
  Loader2,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-vue-next";
import Skeleton from "~~/app/components/Skeleton.vue";
import {
  chatbotLanguageOptions,
  getChatbotLanguageCode,
  normalizeChatbotLanguageName,
} from "~~/app/utils/chatbotLanguages";

definePageMeta({ middleware: "auth", layout: "dashboard" });
useHead({ title: "Assistants | ReplySuite" });

const { userId, limits, isLoading: authLoading } = useAuth();
const supabase = useSupabaseClient();
const notify = useNotify();

const isCreating = ref(false);
const showCreateModal = ref(false);
const openActionMenuId = ref<string | null>(null);
const actionMenuPosition = ref({ top: 0, left: 0 });
const agentSearch = ref("");
const agentStatusFilter = ref("all");
const agentChannelFilter = ref("all");
const agentPage = ref(1);
const agentPageSize = ref(5);

const newAgent = ref({
  name: "",
  system_prompt: "",
  default_language: "English",
});

const languageOptions = chatbotLanguageOptions;

const getAgentStatus = (
  agent: any,
  dataSourceCount: number,
  whatsappLiveCount: number,
) => {
  const allowedDomains = Array.isArray(agent.allowed_domains)
    ? agent.allowed_domains
    : [];
  const hasWebsiteConnection = !!agent.is_public || allowedDomains.length > 0;

  if (hasWebsiteConnection && whatsappLiveCount > 0) {
    return { label: "Live on Web + WhatsApp", tone: "live", pulse: true };
  }
  if (whatsappLiveCount > 0) {
    return { label: "Live on WhatsApp", tone: "live", pulse: true };
  }
  if (hasWebsiteConnection) {
    return { label: "Live on Web", tone: "web", pulse: true };
  }
  if (dataSourceCount > 0) {
    return { label: "Trained", tone: "ready", pulse: false };
  }
  return { label: "Draft", tone: "draft", pulse: false };
};

const {
  data: pageData,
  pending: dataLoading,
  refresh: refreshAgents,
} = useAsyncData(
  "agents-data",
  async () => {
    if (!userId.value) {
      return {
        agents: [],
        stats: {
          totalChats: 0,
          totalDataSources: 0,
          liveWebAgents: 0,
          liveWhatsappAgents: 0,
        },
      };
    }

    const { data: agents, error: agentsError } = await supabase
      .from("chatbots")
      .select("*, data_sources(count)")
      .is("deleted_at", null)
      .eq("user_id", userId.value)
      .order("created_at", { ascending: false });

    if (agentsError) throw agentsError;

    const agentIds = (agents || []).map((agent: any) => agent.id);
    let sessionRows: any[] = [];
    let whatsappAccounts: any[] = [];

    if (agentIds.length > 0) {
      const [{ data: sessionsData }, { data: whatsappData }] =
        await Promise.all([
          supabase
            .from("chat_sessions")
            .select("id, chatbot_id")
            .in("chatbot_id", agentIds),
          supabase
            .from("whatsapp_accounts")
            .select("id, chatbot_id, status")
            .in("chatbot_id", agentIds),
        ]);

      sessionRows = sessionsData || [];
      whatsappAccounts = whatsappData || [];
    }

    const interactionCountByAgent = sessionRows.reduce(
      (acc: Record<string, number>, row: any) => {
        if (!row.chatbot_id) return acc;
        acc[row.chatbot_id] = (acc[row.chatbot_id] || 0) + 1;
        return acc;
      },
      {},
    );

    const whatsappLiveCountByAgent = whatsappAccounts.reduce(
      (acc: Record<string, number>, row: any) => {
        if (!row.chatbot_id) return acc;
        if (!["active", "deployed"].includes(row.status)) return acc;
        acc[row.chatbot_id] = (acc[row.chatbot_id] || 0) + 1;
        return acc;
      },
      {},
    );

    const normalizedAgents = (agents || []).map((agent: any) => {
      const dataSourceCount = Array.isArray(agent.data_sources)
        ? (agent.data_sources[0]?.count ?? 0)
        : 0;
      const whatsappLiveCount = whatsappLiveCountByAgent[agent.id] || 0;
      const allowedDomains = Array.isArray(agent.allowed_domains)
        ? agent.allowed_domains
        : [];
      const webConnected = !!agent.is_public || allowedDomains.length > 0;
      const status = getAgentStatus(agent, dataSourceCount, whatsappLiveCount);

      return {
        ...agent,
        data_source_count: dataSourceCount,
        interaction_count: interactionCountByAgent[agent.id] || 0,
        whatsapp_live_count: whatsappLiveCount,
        web_connected: webConnected,
        status,
      };
    });

    return {
      agents: normalizedAgents,
      stats: {
        totalChats: sessionRows.length,
        totalDataSources: normalizedAgents.reduce(
          (sum: number, agent: any) => sum + agent.data_source_count,
          0,
        ),
        liveWebAgents: normalizedAgents.filter(
          (agent: any) => agent.web_connected,
        ).length,
        liveWhatsappAgents: normalizedAgents.filter(
          (agent: any) => agent.whatsapp_live_count > 0,
        ).length,
      },
    };
  },
  { watch: [userId] },
);

const agents = computed(() => pageData.value?.agents || []);
const stats = computed(
  () =>
    pageData.value?.stats || {
      totalChats: 0,
      totalDataSources: 0,
      liveWebAgents: 0,
      liveWhatsappAgents: 0,
    },
);
const isLoading = computed(() => authLoading.value || dataLoading.value);
const canCreateAgent = computed(
  () => agents.value.length < (limits.value.maxAgents || 1),
);

const fleetStats = computed(() => [
  {
    label: "Assistants",
    value: agents.value.length.toString().padStart(2, "0"),
    detail: "Active workspace assistants",
    tone: "primary",
    icon: Bot,
  },
  {
    label: "Plan use",
    value: `${agents.value.length} / ${limits.value.maxAgents ?? "∞"}`,
    detail: "Assistant capacity",
    tone: "amber",
    icon: Sparkles,
  },
  {
    label: "Chats",
    value: stats.value.totalChats.toLocaleString(),
    detail: "Customer conversations",
    tone: "green",
    icon: MessageSquare,
  },
  {
    label: "Sources",
    value: stats.value.totalDataSources.toLocaleString(),
    detail: "Training data sources",
    tone: "violet",
    icon: Database,
  },
]);

const agentStatuses = computed(() => [
  "all",
  ...Array.from(new Set(agents.value.map((agent: any) => agent.status.label))),
]);
const agentChannels = ["all", "Website", "WhatsApp", "No channel"];
const filteredAgents = computed(() => {
  const query = agentSearch.value.trim().toLowerCase();
  return agents.value.filter((agent: any) => {
    const matchesSearch =
      !query ||
      [
        agent.name,
        agent.system_prompt,
        agent.default_language,
        agent.status.label,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesStatus =
      agentStatusFilter.value === "all" ||
      agent.status.label === agentStatusFilter.value;
    const matchesChannel =
      agentChannelFilter.value === "all" ||
      (agentChannelFilter.value === "Website" && agent.web_connected) ||
      (agentChannelFilter.value === "WhatsApp" &&
        agent.whatsapp_live_count > 0) ||
      (agentChannelFilter.value === "No channel" &&
        !agent.web_connected &&
        agent.whatsapp_live_count === 0);
    return matchesSearch && matchesStatus && matchesChannel;
  });
});
const agentTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredAgents.value.length / agentPageSize.value)),
);
const paginatedAgents = computed(() => {
  const start = (agentPage.value - 1) * agentPageSize.value;
  return filteredAgents.value.slice(start, start + agentPageSize.value);
});
const agentPageStart = computed(() =>
  filteredAgents.value.length === 0
    ? 0
    : (agentPage.value - 1) * agentPageSize.value + 1,
);
const agentPageEnd = computed(() =>
  Math.min(agentPage.value * agentPageSize.value, filteredAgents.value.length),
);

const statCardClass = (tone: string) =>
  ({
    primary: "bg-primary/10 text-primary ring-primary/15",
    green: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/15",
    amber: "bg-amber-400/10 text-amber-400 ring-amber-400/15",
    violet: "bg-violet-400/10 text-violet-400 ring-violet-400/15",
  })[tone] || "bg-foreground/5 text-foreground/60 ring-foreground/10";

const statusPillClass = (tone: string) =>
  ({
    live: "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-700 dark:text-emerald-200",
    web: "border-sky-400/20 bg-sky-400/[0.06] text-sky-700 dark:text-sky-200",
    ready: "border-primary/20 bg-primary/10 text-primary",
    draft: "border-foreground/10 bg-foreground/[0.03] text-foreground/55",
  })[tone] || "border-foreground/10 bg-foreground/[0.03] text-foreground/55";

const statusDotClass = (tone: string) =>
  ({
    live: "bg-emerald-400 shadow-emerald-400/30",
    web: "bg-sky-400 shadow-sky-400/30",
    ready: "bg-primary shadow-primary/30",
    draft: "bg-foreground/25 shadow-foreground/10",
  })[tone] || "bg-foreground/25";

const resetAgentFilters = () => {
  agentSearch.value = "";
  agentStatusFilter.value = "all";
  agentChannelFilter.value = "all";
  agentPage.value = 1;
};

const toggleActionMenu = (agentId: string, event: MouseEvent) => {
  if (openActionMenuId.value === agentId) {
    openActionMenuId.value = null;
    return;
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const menuWidth = 208;
  actionMenuPosition.value = {
    top: rect.bottom + 8,
    left: Math.max(
      12,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12),
    ),
  };
  openActionMenuId.value = agentId;
};

const handleCreate = async () => {
  if (!userId.value || !newAgent.value.name) return;
  if (!canCreateAgent.value) {
    notify.warn(
      `You've reached the limit of ${limits.value.maxAgents} assistants for your current plan.`,
    );
    return;
  }

  isCreating.value = true;
  try {
    const { data, error } = await supabase
      .from("chatbots")
      .insert({
        user_id: userId.value,
        name: newAgent.value.name,
        system_prompt: newAgent.value.system_prompt,
        default_language: normalizeChatbotLanguageName(
          newAgent.value.default_language,
        ),
      })
      .select()
      .single();

    if (error) throw error;
    if (data) {
      const primaryCode = getChatbotLanguageCode(
        newAgent.value.default_language,
      );
      const languageRows = Array.from(new Set([primaryCode, "en"])).map(
        (code) => ({
          chatbot_id: data.id,
          language_code: code,
          is_primary: code === primaryCode,
          is_fallback: code === "en",
          is_enabled: true,
        }),
      );

      const { error: languageError } = await (supabase as any)
        .from("chatbot_languages")
        .upsert(languageRows, { onConflict: "chatbot_id,language_code" });

      if (languageError) {
        console.warn(
          "[Languages] New assistant language mapping will sync after migration deployment:",
          languageError,
        );
      }

      await refreshAgents();
      showCreateModal.value = false;
      newAgent.value = {
        name: "",
        system_prompt: "",
        default_language: "English",
      };
    }
  } catch (err) {
    console.error("Error creating assistant:", err);
    notify.error("Failed to create assistant");
  } finally {
    isCreating.value = false;
  }
};

const handleDelete = async (id: string) => {
  if (
    !(await notify.confirm("Are you sure you want to delete this assistant?"))
  )
    return;

  const { error } = await supabase
    .from("chatbots")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (!error) await refreshAgents();
};

watch(
  [agentSearch, agentStatusFilter, agentChannelFilter, agentPageSize],
  () => {
    agentPage.value = 1;
  },
);
watch(agentTotalPages, (total) => {
  if (agentPage.value > total) agentPage.value = total;
});
watch(
  () => agents.value.length,
  () => {
    if (agentPage.value > agentTotalPages.value) {
      agentPage.value = agentTotalPages.value;
    }
  },
);
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-4 pb-24 pt-5 lg:pb-12 lg:pt-6">
    <section
      v-if="isLoading"
      class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
    >
      <div
        class="grid gap-2 border-b border-foreground/10 p-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div
          v-for="card in 4"
          :key="`agent-stat-skeleton-${card}`"
          class="rounded-[0.39rem] bg-background/45 p-3"
        >
          <div class="flex items-center gap-2.5">
            <Skeleton width="3.25rem" height="3.25rem" radius="0.39rem" />
            <div class="min-w-0 flex-1 space-y-2">
              <Skeleton width="42%" height="1rem" radius="999px" />
              <Skeleton width="58%" height="0.7rem" radius="999px" />
              <Skeleton width="76%" height="0.6rem" radius="999px" />
            </div>
          </div>
        </div>
      </div>
      <div class="overflow-x-auto p-3">
        <table class="w-full min-w-[980px] text-left">
          <thead class="text-xs font-semibold text-foreground/40">
            <tr class="border-b border-foreground/10">
              <th class="px-[0.9rem] py-3">Assistant</th>
              <th class="px-[0.9rem] py-3">Status</th>
              <th class="px-[0.9rem] py-3">Channels</th>
              <th class="px-[0.9rem] py-3">Language</th>
              <th class="px-[0.9rem] py-3">Chats</th>
              <th class="px-[0.9rem] py-3">Training</th>
              <th class="px-[0.9rem] py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-foreground/10">
            <tr v-for="row in 5" :key="`agents-table-skeleton-${row}`">
              <td class="px-[0.9rem] py-3">
                <div class="flex items-center gap-3">
                  <Skeleton width="2.25rem" height="2.25rem" radius="0.39rem" />
                  <div class="min-w-0 flex-1 space-y-2">
                    <Skeleton width="62%" height="0.8rem" radius="999px" />
                    <Skeleton width="88%" height="0.65rem" radius="999px" />
                  </div>
                </div>
              </td>
              <td class="px-[0.9rem] py-3">
                <Skeleton height="1.35rem" radius="999px" />
              </td>
              <td class="px-[0.9rem] py-3">
                <Skeleton height="1.35rem" radius="999px" />
              </td>
              <td class="px-[0.9rem] py-3">
                <Skeleton height="0.8rem" radius="999px" />
              </td>
              <td class="px-[0.9rem] py-3">
                <Skeleton height="0.8rem" radius="999px" />
              </td>
              <td class="px-[0.9rem] py-3">
                <Skeleton height="2rem" radius="0.39rem" />
              </td>
              <td class="px-[0.9rem] py-3">
                <Skeleton height="2rem" radius="0.39rem" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-else class="space-y-4">
      <section class="space-y-3 pt-4 lg:pt-6">
        <div
          class="flex flex-col gap-3 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-3 shadow-sm shadow-black/5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15"
            >
              <Bot class="h-5 w-5" />
            </div>
            <div>
              <p class="text-sm font-bold text-foreground">
                Assistant workspace
              </p>
              <p class="mt-0.5 text-xs font-medium text-foreground/50">
                Create, train, configure, and connect assistants from one table.
              </p>
            </div>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <NuxtLink
              to="/dashboard/agents/training"
              class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-foreground/5 px-3 text-xs font-bold text-foreground/65 transition hover:border-primary/30 hover:text-primary"
            >
              <Database class="h-3.5 w-3.5" />
              Train
            </NuxtLink>
            <button
              type="button"
              :disabled="!canCreateAgent"
              :class="[
                'inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-45',
                canCreateAgent
                  ? 'bg-primary text-black hover:bg-primary-accent'
                  : 'border border-foreground/10 bg-foreground/5 text-foreground/45',
              ]"
              @click="canCreateAgent ? (showCreateModal = true) : null"
            >
              <Plus class="h-3.5 w-3.5" />
              {{ canCreateAgent ? "Create assistant" : "Limit reached" }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <article
            v-for="stat in fleetStats"
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
              <p class="mt-1 truncate text-sm font-semibold text-foreground/75">
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
      </section>

      <section
        class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
      >
        <div class="space-y-3 border-b border-foreground/10 p-3">
          <div
            class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <h2 class="text-sm font-bold text-foreground">Assistant list</h2>
              <p class="mt-0.5 text-xs font-medium text-foreground/45">
                {{ filteredAgents.length }} / {{ agents.length }} assistants
                shown
              </p>
            </div>
            <div class="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
              <label class="relative block sm:w-64">
                <Search
                  class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35"
                />
                <input
                  v-model="agentSearch"
                  type="search"
                  placeholder="Search assistants"
                  class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background py-2 pl-9 pr-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/40"
                />
              </label>
              <select
                v-model="agentStatusFilter"
                class="h-10 rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-bold text-foreground/60 outline-none focus:border-primary/40"
              >
                <option
                  v-for="status in agentStatuses"
                  :key="status"
                  :value="status"
                >
                  {{ status === "all" ? "All status" : status }}
                </option>
              </select>
              <select
                v-model="agentChannelFilter"
                class="h-10 rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-bold text-foreground/60 outline-none focus:border-primary/40"
              >
                <option
                  v-for="channel in agentChannels"
                  :key="channel"
                  :value="channel"
                >
                  {{ channel === "all" ? "All channels" : channel }}
                </option>
              </select>
              <button
                type="button"
                class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-foreground/5 px-3 text-xs font-bold text-foreground/55 transition hover:border-primary/30 hover:text-primary"
                @click="resetAgentFilters"
              >
                <RotateCcw class="h-3.5 w-3.5" />
                Reset
              </button>
              <NuxtLink
                to="/dashboard/pricing"
                class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-foreground/5 px-3 text-xs font-bold text-foreground/55 transition hover:border-primary/30 hover:text-primary"
              >
                <Sparkles class="h-3.5 w-3.5" />
                Plan
              </NuxtLink>
            </div>
          </div>
        </div>

        <div v-if="agents.length === 0" class="p-8 text-center">
          <div
            class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[0.39rem] border border-primary/10 bg-primary/5 text-primary"
          >
            <Bot class="h-7 w-7" />
          </div>
          <h3 class="text-lg font-bold text-foreground">No assistants yet</h3>
          <p
            class="mx-auto mt-2 max-w-sm text-sm font-medium leading-relaxed text-foreground/50"
          >
            Create your first assistant to start handling website, WhatsApp, and
            Instagram conversations.
          </p>
          <button
            type="button"
            class="mt-5 inline-flex h-10 items-center gap-2 rounded-[0.39rem] bg-primary px-4 text-xs font-bold text-black transition hover:bg-primary-accent"
            @click="showCreateModal = true"
          >
            <Plus class="h-4 w-4" />
            Create assistant
          </button>
        </div>

        <div v-else class="overflow-x-auto p-3">
          <table
            class="w-full min-w-[980px] border-separate border-spacing-y-2 text-left"
          >
            <thead class="text-[11px] font-bold text-foreground/35">
              <tr>
                <th class="px-[0.9rem] py-3">Assistant</th>
                <th class="px-[0.9rem] py-3">Status</th>
                <th class="px-[0.9rem] py-3">Channels</th>
                <th class="px-[0.9rem] py-3">Language</th>
                <th class="px-[0.9rem] py-3">Chats</th>
                <th class="px-[0.9rem] py-3">Training</th>
                <th class="px-[0.9rem] py-3">Created</th>
                <th class="px-[0.9rem] py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="agent in paginatedAgents"
                :key="agent.id"
                class="group"
              >
                <td
                  class="rounded-l-[0.39rem] bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                >
                  <div class="flex min-w-0 items-center gap-3">
                    <div
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15"
                    >
                      <Bot class="h-4 w-4" />
                    </div>
                    <div class="min-w-0">
                      <NuxtLink
                        :to="`/dashboard/agents/${agent.id}`"
                        class="block max-w-[15rem] truncate text-sm font-bold text-foreground transition hover:text-primary"
                      >
                        {{ agent.name }}
                      </NuxtLink>
                      <p
                        class="mt-1 max-w-[20rem] truncate text-xs font-medium text-foreground/40"
                      >
                        {{
                          agent.system_prompt ||
                          "No assistant instructions configured yet."
                        }}
                      </p>
                    </div>
                  </div>
                </td>
                <td
                  class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                >
                  <span
                    :class="[
                      'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold',
                      statusPillClass(agent.status.tone),
                    ]"
                  >
                    <span
                      :class="[
                        'h-1.5 w-1.5 rounded-full shadow-sm',
                        statusDotClass(agent.status.tone),
                        agent.status.pulse ? 'animate-pulse' : '',
                      ]"
                    />
                    {{ agent.status.label }}
                  </span>
                </td>
                <td
                  class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                >
                  <div class="flex max-w-[12rem] gap-1 overflow-hidden">
                    <span
                      v-if="agent.web_connected"
                      class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground/5 px-2 py-1 text-[11px] font-semibold text-foreground/45"
                    >
                      <Globe class="h-3 w-3" />
                      Website
                    </span>
                    <span
                      v-if="agent.whatsapp_live_count > 0"
                      class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground/5 px-2 py-1 text-[11px] font-semibold text-foreground/45"
                    >
                      <MessageCircle class="h-3 w-3" />
                      WhatsApp
                    </span>
                    <span
                      v-if="
                        !agent.web_connected && agent.whatsapp_live_count === 0
                      "
                      class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground/5 px-2 py-1 text-[11px] font-semibold text-foreground/35"
                    >
                      <Bot class="h-3 w-3" />
                      None
                    </span>
                  </div>
                </td>
                <td
                  class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                >
                  <div
                    class="inline-flex items-center gap-2 text-xs font-bold text-foreground/60"
                  >
                    <Globe class="h-3.5 w-3.5 text-foreground/35" />
                    {{ agent.default_language || "English" }}
                  </div>
                </td>
                <td
                  class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                >
                  <div
                    class="inline-flex items-center gap-2 text-xs font-bold text-foreground/65"
                  >
                    <Activity class="h-3.5 w-3.5 text-foreground/35" />
                    {{ agent.interaction_count.toLocaleString() }}
                  </div>
                </td>
                <td
                  class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                >
                  <NuxtLink
                    :to="`/dashboard/agents/training?id=${agent.id}`"
                    class="inline-flex items-center gap-2 rounded-[0.39rem] border border-primary/15 bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition hover:border-primary/25 hover:bg-primary/15"
                  >
                    <Database class="h-3.5 w-3.5" />
                    Train
                  </NuxtLink>
                </td>
                <td
                  class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                >
                  <div
                    class="inline-flex items-center gap-2 text-xs font-bold text-foreground/50"
                  >
                    <Clock class="h-3.5 w-3.5 text-foreground/30" />
                    {{ new Date(agent.created_at).toLocaleDateString() }}
                  </div>
                </td>
                <td
                  class="rounded-r-[0.39rem] bg-background/45 px-[0.9rem] py-3 text-right ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
                >
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-foreground/5 text-foreground/50 transition hover:bg-foreground/10 hover:text-foreground"
                    title="Assistant actions"
                    aria-label="Assistant actions"
                    @click.stop="toggleActionMenu(agent.id, $event)"
                  >
                    <MoreVertical class="h-4 w-4" />
                  </button>

                  <Teleport to="body">
                    <div
                      v-if="openActionMenuId === agent.id"
                      class="fixed z-[120] w-52 overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background p-1.5 text-left shadow-xl shadow-black/15"
                      :style="{
                        top: `${actionMenuPosition.top}px`,
                        left: `${actionMenuPosition.left}px`,
                      }"
                      @click.stop
                    >
                      <NuxtLink
                        :to="`/dashboard/agents/skills?id=${agent.id}`"
                        class="flex items-center gap-3 rounded-[0.39rem] px-3 py-2.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                        @click="openActionMenuId = null"
                      >
                        <Sparkles class="h-3.5 w-3.5" />
                        Skills
                      </NuxtLink>
                      <NuxtLink
                        :to="`/dashboard/agents/tools?id=${agent.id}`"
                        class="flex items-center gap-3 rounded-[0.39rem] px-3 py-2.5 text-xs font-semibold text-foreground/70 transition hover:bg-foreground/5 hover:text-foreground"
                        @click="openActionMenuId = null"
                      >
                        <CalendarDays class="h-3.5 w-3.5" />
                        Tools
                      </NuxtLink>
                      <NuxtLink
                        :to="`/dashboard/agents/${agent.id}`"
                        class="flex items-center gap-3 rounded-[0.39rem] px-3 py-2.5 text-xs font-semibold text-foreground/70 transition hover:bg-foreground/5 hover:text-foreground"
                        @click="openActionMenuId = null"
                      >
                        <Edit3 class="h-3.5 w-3.5" />
                        Configure
                      </NuxtLink>
                      <button
                        type="button"
                        class="flex w-full items-center gap-3 rounded-[0.39rem] px-3 py-2.5 text-left text-xs font-semibold text-red-400 transition hover:bg-red-400/10"
                        @click="
                          openActionMenuId = null;
                          handleDelete(agent.id);
                        "
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </Teleport>
                </td>
              </tr>
              <tr v-if="filteredAgents.length === 0">
                <td
                  colspan="8"
                  class="px-[0.9rem] py-8 text-center text-xs font-bold text-foreground/45"
                >
                  No assistants match the current filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="agents.length > 0"
          class="border-t border-foreground/10 px-3 py-3"
        >
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-xs font-semibold text-foreground/45">
              Showing {{ agentPageStart }}-{{ agentPageEnd }} of
              {{ filteredAgents.length }} assistants
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <select
                v-model.number="agentPageSize"
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
                  :disabled="agentPage <= 1"
                  class="inline-flex h-9 items-center gap-1 px-3 text-xs font-bold text-foreground/55 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                  @click="agentPage = Math.max(1, agentPage - 1)"
                >
                  <ChevronLeft class="h-3.5 w-3.5" />
                  Prev
                </button>
                <span
                  class="border-x border-foreground/10 px-3 text-xs font-bold text-foreground/45"
                >
                  {{ agentPage }} / {{ agentTotalPages }}
                </span>
                <button
                  type="button"
                  :disabled="agentPage >= agentTotalPages"
                  class="inline-flex h-9 items-center gap-1 px-3 text-xs font-bold text-foreground/55 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                  @click="agentPage = Math.min(agentTotalPages, agentPage + 1)"
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

    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
    >
      <div
        class="absolute inset-0 bg-background/80 backdrop-blur-sm"
        @click="showCreateModal = false"
      ></div>

      <div
        class="relative w-full max-w-lg overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background shadow-xl shadow-black/15"
      >
        <div class="border-b border-foreground/10 p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15"
              >
                <Bot class="h-5 w-5" />
              </div>
              <div>
                <h3 class="text-base font-bold text-foreground">
                  Create assistant
                </h3>
                <p class="mt-0.5 text-xs font-medium text-foreground/45">
                  Start with a name, behavior notes, and language.
                </p>
              </div>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-[0.39rem] text-foreground/45 transition hover:bg-foreground/5 hover:text-foreground"
              @click="showCreateModal = false"
            >
              <Plus class="h-5 w-5 rotate-45" />
            </button>
          </div>
        </div>

        <div class="space-y-4 p-4">
          <div>
            <label class="mb-2 block text-xs font-bold text-foreground/50">
              Assistant name
            </label>
            <input
              v-model="newAgent.name"
              placeholder="e.g. Sales assistant"
              class="h-11 w-full rounded-[0.39rem] border border-foreground/10 bg-foreground/5 px-3 text-sm font-semibold text-foreground outline-none transition placeholder:text-foreground/25 focus:border-primary/45"
            />
          </div>

          <div>
            <label class="mb-2 block text-xs font-bold text-foreground/50">
              Assistant instructions
            </label>
            <textarea
              v-model="newAgent.system_prompt"
              rows="5"
              placeholder="Describe how this assistant should behave..."
              class="w-full resize-none rounded-[0.39rem] border border-foreground/10 bg-foreground/5 px-3 py-3 text-sm font-medium text-foreground outline-none transition placeholder:text-foreground/25 focus:border-primary/45"
            ></textarea>
          </div>

          <div>
            <label class="mb-2 block text-xs font-bold text-foreground/50">
              Default language
            </label>
            <CustomSelect
              v-model="newAgent.default_language"
              :options="languageOptions"
              placeholder="Select language"
            />
          </div>
        </div>

        <div class="flex gap-2 border-t border-foreground/10 p-4">
          <button
            type="button"
            class="inline-flex h-10 flex-1 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-foreground/5 text-xs font-bold text-foreground/55 transition hover:text-foreground"
            @click="showCreateModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="isCreating || !newAgent.name"
            class="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[0.39rem] bg-primary text-xs font-bold text-black transition hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-50"
            @click="handleCreate"
          >
            <Loader2 v-if="isCreating" class="h-4 w-4 animate-spin" />
            <Plus v-else class="h-4 w-4" />
            Create assistant
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
