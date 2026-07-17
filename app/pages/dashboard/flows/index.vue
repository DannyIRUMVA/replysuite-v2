<script setup lang="ts">
import {
  Bot,
  BrainCircuit,
  CreditCard,
  GitBranch,
  GraduationCap,
  Instagram,
  Search,
  Smartphone,
  Wrench,
  Zap,
} from "lucide-vue-next";
import Skeleton from "~~/app/components/Skeleton.vue";

interface ChatbotFlowMeta {
  id: string;
  name: string | null;
  enabled_tools?: string[] | null;
  tools_config?: Record<string, any> | null;
  data_sources?: Array<{ count?: number | null }> | null;
}

definePageMeta({ middleware: "auth", layout: "dashboard" });
useHead({ title: "Flows | ReplySuite" });

const supabase = useSupabaseClient();
const { userId } = useAuth();
const query = ref("");
const channelFilter = ref<
  "all" | "business" | "school" | "instagram" | "whatsapp"
>("all");
const rowsPerPageOptions = [5, 10, 20];
const rowsPerPage = ref(5);
const currentPage = ref(1);

const instagramApiFetch = async <T,>(url: string, options: any = {}) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return await $fetch<T>(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

const { data: instagramAccounts, pending: loadingInstagram } =
  await useAsyncData(
    "dashboard-flows-instagram-accounts",
    async () => await instagramApiFetch<any[]>("/api/instagram/accounts"),
    { server: false, default: () => [] },
  );

const { data: whatsappAccounts, pending: loadingWhatsapp } = await useAsyncData(
  "dashboard-flows-whatsapp-accounts",
  async () => {
    if (!userId.value) return [];
    const { data } = await supabase
      .from("whatsapp_accounts")
      .select(
        "id, chatbot_id, phone_number, status, created_at, chatbots(id, name)",
      )
      .eq("user_id", userId.value)
      .order("created_at", { ascending: false });
    return data || [];
  },
  { server: false, watch: [userId], default: () => [] },
);

const { data: chatbots, pending: loadingChatbots } = await useAsyncData(
  "dashboard-flows-chatbots",
  async () => {
    if (!userId.value) return [];
    const { data } = await supabase
      .from("chatbots")
      .select("id, name, enabled_tools, tools_config, data_sources(count)")
      .eq("user_id", userId.value)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    return (data || []) as ChatbotFlowMeta[];
  },
  { server: false, watch: [userId], default: () => [] },
);

const { data: catalogItems, pending: loadingCatalog } = await useAsyncData(
  "dashboard-flows-product-catalog",
  async () => {
    if (!userId.value) return [];
    const { data, error } = await supabase
      .from("chatbot_catalog")
      .select("chatbot_id")
      .eq("is_available", true);
    if (error) {
      console.warn("Could not load legacy product catalog readiness:", error);
      return [];
    }
    return data || [];
  },
  { server: false, watch: [userId], default: () => [] },
);

const { data: businessProducts, pending: loadingBusinessProducts } =
  await useAsyncData(
    "dashboard-flows-business-products",
    async () => {
      if (!userId.value) return [];
      const { data, error } = await supabase
        .from("business_products")
        .select("chatbot_id")
        .eq("is_active", true);
      if (error) {
        console.warn("Could not load business product readiness:", error);
        return [];
      }
      return data || [];
    },
    { server: false, watch: [userId], default: () => [] },
  );

const { data: schoolPlans, pending: loadingSchoolPlans } = await useAsyncData(
  "dashboard-flows-school-plans",
  async () => {
    if (!userId.value) return [];
    const { data, error } = await supabase
      .from("school_tutor_plans")
      .select("chatbot_id")
      .eq("is_active", true);
    if (error) {
      console.warn("Could not load school plan readiness:", error);
      return [];
    }
    return data || [];
  },
  { server: false, watch: [userId], default: () => [] },
);

const isLoading = computed(
  () =>
    loadingInstagram.value ||
    loadingWhatsapp.value ||
    loadingChatbots.value ||
    loadingCatalog.value ||
    loadingBusinessProducts.value ||
    loadingSchoolPlans.value,
);

const botById = computed(() => {
  const map = new Map<string, ChatbotFlowMeta>();
  for (const bot of chatbots.value || []) map.set(bot.id, bot);
  return map;
});

const formatConfigLabel = (value: string) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const botTools = (bot?: ChatbotFlowMeta | null) =>
  Array.isArray(bot?.enabled_tools) ? bot.enabled_tools.filter(Boolean) : [];
const botSkills = (bot?: ChatbotFlowMeta | null) =>
  Array.isArray(bot?.tools_config?.assistant_skills)
    ? bot.tools_config.assistant_skills.filter(Boolean)
    : [];
const botTrainingCount = (bot?: ChatbotFlowMeta | null) =>
  Array.isArray(bot?.data_sources)
    ? Number(bot.data_sources[0]?.count || 0)
    : 0;

const paymentToolSet = new Set([
  "payments",
  "request_payment",
  "check_payment_status",
]);
const productDeliveryToolSet = new Set([
  "orders",
  "products",
  "catalog",
  "product_delivery",
  "deliver_product",
]);
const workspaceTextBlob = (...values: unknown[]) =>
  values
    .map((value) => {
      try {
        return typeof value === "string" ? value : JSON.stringify(value || "");
      } catch {
        return String(value || "");
      }
    })
    .join(" ")
    .toLowerCase();
const schoolPattern =
  /\b(school|student|students|class|classes|course|courses|module|modules|university|college|lesson|lessons|tutor|tutoring|teacher|revision|exam|exams|learn|learning|education|session|sessions)\b/;
const buildCountByBotId = (items: any[] | null | undefined) => {
  const map = new Map<string, number>();
  for (const item of items || []) {
    const chatbotId = String((item as any)?.chatbot_id || "");
    if (!chatbotId) continue;
    map.set(chatbotId, (map.get(chatbotId) || 0) + 1);
  }
  return map;
};
const catalogCountByBotId = computed(() =>
  buildCountByBotId(catalogItems.value),
);
const businessProductCountByBotId = computed(() =>
  buildCountByBotId(businessProducts.value),
);
const schoolPlanCountByBotId = computed(() =>
  buildCountByBotId(schoolPlans.value),
);
const flowPaymentEnabled = (bot?: ChatbotFlowMeta | null) => {
  const config = bot?.tools_config || {};
  return Boolean(
    botTools(bot).some((tool) => paymentToolSet.has(tool)) ||
    config.website_payment?.enabled ||
    config.business_flow?.payment_required ||
    config.school_flow?.payment_enabled,
  );
};
const flowProductDeliveryEnabled = (bot?: ChatbotFlowMeta | null) => {
  const tools = botTools(bot);
  const config = bot?.tools_config || {};
  return Boolean(
    (bot?.id
      ? (businessProductCountByBotId.value.get(bot.id) || 0) +
        (catalogCountByBotId.value.get(bot.id) || 0)
      : 0) > 0 ||
    tools.some((tool) => productDeliveryToolSet.has(tool)) ||
    config.business_flow?.product_delivery_enabled ||
    config.orders?.enabled ||
    config.orders?.delivery_enabled ||
    config.orders?.deliveryEnabled ||
    config.products?.enabled ||
    config.products?.delivery_enabled ||
    config.product_delivery?.enabled,
  );
};
const flowBusinessReady = (bot?: ChatbotFlowMeta | null, trigger?: any) =>
  Boolean(
    bot &&
    flowPaymentEnabled(bot) &&
    flowProductDeliveryEnabled(bot) &&
    (!trigger || trigger.reply_in_dm),
  );
const flowSchoolReady = (bot?: ChatbotFlowMeta | null) =>
  Boolean(
    bot &&
    ((bot.id ? (schoolPlanCountByBotId.value.get(bot.id) || 0) > 0 : false) ||
      botTools(bot).some((tool) =>
        ["school", "tutor", "school_tutor"].includes(tool),
      ) ||
      bot.tools_config?.school_flow?.enabled ||
      schoolPattern.test(
        workspaceTextBlob(bot.name, botSkills(bot), bot.tools_config),
      )),
  );
const flowWorkspaceLabels = (flow: any) => {
  const labels = [];
  if (flow.businessReady) labels.push("Business");
  if (flow.schoolReady) labels.push("School");
  return labels;
};

const keywordsLabel = (trigger: any) => {
  const keywords = Array.isArray(trigger?.keywords)
    ? trigger.keywords.filter(Boolean)
    : [];
  return keywords.length ? keywords.join(", ") : "All comments";
};

const modeLabel = (trigger: any) => {
  if (!trigger) return "No automation";
  if (trigger.reply_in_comment && trigger.reply_in_dm)
    return "Comment reply + DM";
  if (trigger.reply_in_comment) return "Comment reply";
  if (trigger.reply_in_dm) return "Comment-to-DM";
  return "Paused";
};

const postLabel = (post: any) => {
  const caption = String(post?.caption || "").trim();
  return caption || post?.permalink || post?.id || "Instagram post";
};

const instagramFlows = computed(() =>
  (instagramAccounts.value || []).flatMap((account: any) =>
    (account.posts || []).flatMap((post: any) =>
      (post.triggers || []).map((trigger: any) => {
        const bot = botById.value.get(trigger.chatbot_id) || null;
        return {
          id: trigger.id,
          routeId: account.id,
          channelType: "instagram",
          channel: "Instagram",
          icon: Instagram,
          iconClass: "bg-pink-400/10 text-pink-400 ring-pink-400/20",
          source: trigger.reply_in_dm
            ? "Instagram comment-to-DM"
            : "Instagram comment",
          title: postLabel(post),
          trigger: keywordsLabel(trigger),
          mode: modeLabel(trigger),
          assistant: bot?.name || trigger.chatbots?.name || "Assistant not set",
          tools: botTools(bot),
          skills: botSkills(bot),
          trainingCount: botTrainingCount(bot),
          paymentEnabled: flowPaymentEnabled(bot),
          productDelivery: flowProductDeliveryEnabled(bot),
          businessReady: flowBusinessReady(bot, trigger),
          schoolReady: flowSchoolReady(bot),
          active: Boolean(trigger.is_active),
        };
      }),
    ),
  ),
);

const whatsappFlows = computed(() =>
  (whatsappAccounts.value || [])
    .filter((account: any) => account.chatbot_id)
    .map((account: any) => {
      const bot = botById.value.get(account.chatbot_id) || null;
      return {
        id: account.id,
        routeId: account.id,
        channelType: "whatsapp",
        channel: "WhatsApp",
        icon: Smartphone,
        iconClass: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20",
        source: "WhatsApp message/keyword",
        title: account.phone_number || "WhatsApp number",
        trigger: "Inbound messages",
        mode: "Message-to-assistant",
        assistant: bot?.name || account.chatbots?.name || "Assistant not set",
        tools: botTools(bot),
        skills: botSkills(bot),
        trainingCount: botTrainingCount(bot),
        paymentEnabled: flowPaymentEnabled(bot),
        productDelivery: flowProductDeliveryEnabled(bot),
        businessReady: flowBusinessReady(bot),
        schoolReady: flowSchoolReady(bot),
        active: account.status === "active" || account.status === "deployed",
      };
    }),
);

const allFlows = computed(() => [
  ...instagramFlows.value,
  ...whatsappFlows.value,
]);

const businessFlows = computed(() =>
  allFlows.value.filter((flow: any) => flow.businessReady),
);
const schoolFlows = computed(() =>
  allFlows.value.filter((flow: any) => flow.schoolReady),
);

const channelOptions = computed(() => [
  { label: "All", value: "all" as const, count: allFlows.value.length },
  {
    label: "Business",
    value: "business" as const,
    count: businessFlows.value.length,
  },
  {
    label: "School",
    value: "school" as const,
    count: schoolFlows.value.length,
  },
  {
    label: "Instagram",
    value: "instagram" as const,
    count: instagramFlows.value.length,
  },
  {
    label: "WhatsApp",
    value: "whatsapp" as const,
    count: whatsappFlows.value.length,
  },
]);

const filteredFlows = computed(() => {
  const search = query.value.trim().toLowerCase();
  return allFlows.value.filter((flow: any) => {
    const matchesChannel =
      channelFilter.value === "all" ||
      (channelFilter.value === "business" && flow.businessReady) ||
      (channelFilter.value === "school" && flow.schoolReady) ||
      flow.channelType === channelFilter.value;
    const workspaceLabels = flowWorkspaceLabels(flow);
    const matchesSearch =
      !search ||
      [
        flow.channel,
        flow.source,
        flow.title,
        flow.trigger,
        flow.mode,
        flow.assistant,
        workspaceLabels.join(" "),
        flow.paymentEnabled ? "payment MTN Airtel mobile payment" : "",
        flow.trainingCount ? `${flow.trainingCount} training sources` : "",
        flow.tools.map(formatConfigLabel).join(" "),
        flow.skills.map(formatConfigLabel).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    return matchesChannel && matchesSearch;
  });
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredFlows.value.length / rowsPerPage.value)),
);
const paginatedFlows = computed(() => {
  const start = (currentPage.value - 1) * rowsPerPage.value;
  return filteredFlows.value.slice(start, start + rowsPerPage.value);
});
const paginationStart = computed(() =>
  filteredFlows.value.length
    ? (currentPage.value - 1) * rowsPerPage.value + 1
    : 0,
);
const paginationEnd = computed(() =>
  Math.min(currentPage.value * rowsPerPage.value, filteredFlows.value.length),
);

watch([query, channelFilter, rowsPerPage], () => {
  currentPage.value = 1;
});
watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages;
});

const totalFlows = computed(() => allFlows.value.length);
const connectedAssistants = computed(
  () =>
    new Set(
      allFlows.value
        .map((flow: any) => flow.assistant)
        .filter((name) => name && name !== "Assistant not set"),
    ).size,
);
const totalTools = computed(() =>
  allFlows.value.reduce((sum: number, flow: any) => sum + flow.tools.length, 0),
);
const totalSkills = computed(() =>
  allFlows.value.reduce(
    (sum: number, flow: any) => sum + flow.skills.length,
    0,
  ),
);

const metricRows = computed(() => [
  {
    label: "Flows",
    value: totalFlows.value,
    detail: "Instagram and WhatsApp paths",
    icon: GitBranch,
    tone: "primary",
  },
  {
    label: "Assistants",
    value: connectedAssistants.value,
    detail: "Connected to channels",
    icon: Bot,
    tone: "violet",
  },
  {
    label: "Skills",
    value: totalSkills.value,
    detail: "Visible on flow canvas",
    icon: BrainCircuit,
    tone: "sky",
  },
  {
    label: "Tools",
    value: totalTools.value,
    detail: "Available during replies",
    icon: Wrench,
    tone: "amber",
  },
]);

const metricClass = (tone: string) =>
  ({
    primary: "bg-primary/10 text-primary ring-primary/15",
    violet: "bg-violet-400/10 text-violet-400 ring-violet-400/15",
    sky: "bg-sky-400/10 text-sky-400 ring-sky-400/15",
    amber: "bg-amber-400/10 text-amber-400 ring-amber-400/15",
  })[tone] || "bg-foreground/5 text-foreground/60 ring-foreground/10";

const visibleFlowSummary = computed(() =>
  filteredFlows.value.length
    ? `${paginationStart.value}-${paginationEnd.value} of ${filteredFlows.value.length}`
    : "0 flows",
);

const flowDetailRoute = (flow: any) => ({
  path: `/dashboard/flows/${flow.routeId}`,
  query: {
    channel: flow.channelType,
    ...(flow.channelType === "instagram" ? { flow: flow.id } : {}),
  },
});
</script>

<template>
  <div class="space-y-5 pb-24 pt-3 lg:pb-7">
    <section class="rounded-[0.39rem] p-5 sm:p-6">
      <div
        class="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <p class="dashboard-eyebrow text-primary/80">Flow command center</p>
          <h2 class="dashboard-section-title mt-2">
            Channel paths by assistant
          </h2>
          <p class="dashboard-muted mt-1">
            See every channel flow, connected assistant, and the skills or tools
            that appear in the canvas.
          </p>
        </div>
        <NuxtLink
          to="/dashboard/integrations/instagram/setup"
          class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-3 text-xs font-bold text-black transition hover:bg-primary-accent"
        >
          <Zap class="h-3.5 w-3.5" />
          New flow
        </NuxtLink>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="metric in metricRows"
          :key="metric.label"
          class="group flex items-center gap-2.5 rounded-[0.39rem] bg-background/45 py-3 pl-3 pr-2 transition hover:bg-foreground/[0.035]"
        >
          <div
            :class="[
              'flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-[0.39rem] ring-1 transition group-hover:scale-105',
              metricClass(metric.tone),
            ]"
          >
            <component :is="metric.icon" class="h-7 w-7" />
          </div>
          <div class="min-w-0">
            <p class="dashboard-metric-number leading-none">
              {{ metric.value }}
            </p>
            <p class="mt-1 truncate text-sm font-semibold text-foreground/75">
              {{ metric.label }}
            </p>
            <p
              class="mt-0.5 truncate text-[11px] font-semibold text-foreground/50"
            >
              {{ metric.detail }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section
      class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
    >
      <div
        class="flex flex-col gap-3 border-b border-foreground/10 p-3 xl:flex-row xl:items-center xl:justify-between"
      >
        <div class="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
          <div class="relative max-w-sm flex-1">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/30"
            />
            <input
              v-model="query"
              type="search"
              placeholder="Search flows, assistants, tools, skills"
              class="h-9 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-8 text-xs font-semibold outline-none transition placeholder:text-foreground/30 focus:border-primary/35"
            />
          </div>

          <div
            class="flex w-full gap-1 overflow-x-auto rounded-[0.39rem] border border-foreground/10 bg-background p-1 md:w-auto"
          >
            <button
              v-for="option in channelOptions"
              :key="option.value"
              type="button"
              :class="[
                'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[0.32rem] px-2.5 text-[11px] font-bold transition',
                channelFilter === option.value
                  ? 'bg-primary text-black shadow-sm shadow-black/10'
                  : 'text-foreground/50 hover:bg-foreground/[0.04] hover:text-foreground',
              ]"
              @click="channelFilter = option.value"
            >
              {{ option.label }}
              <span
                :class="[
                  'rounded-full px-1.5 py-px text-[10px]',
                  channelFilter === option.value
                    ? 'bg-black/10 text-black'
                    : 'bg-foreground/5 text-foreground/40',
                ]"
              >
                {{ option.count }}
              </span>
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 md:justify-end">
          <div class="text-[11px] font-bold text-foreground/45">
            {{ visibleFlowSummary }}
          </div>
          <label
            class="flex items-center gap-2 text-[11px] font-bold text-foreground/45"
          >
            <span>Rows</span>
            <select
              v-model.number="rowsPerPage"
              class="h-8 rounded-[0.39rem] border border-foreground/10 bg-background px-2 text-xs font-bold text-foreground outline-none focus:border-primary/35"
            >
              <option
                v-for="option in rowsPerPageOptions"
                :key="option"
                :value="option"
              >
                {{ option }} / page
              </option>
            </select>
          </label>
        </div>
      </div>

      <div v-if="isLoading" class="space-y-2 p-3">
        <Skeleton
          v-for="row in 5"
          :key="row"
          height="3.75rem"
          radius="0.39rem"
        />
      </div>

      <div v-else>
        <div v-if="paginatedFlows.length" class="overflow-x-auto">
          <table class="w-full min-w-[1120px] text-left">
            <thead class="border-b border-foreground/10 bg-foreground/[0.025]">
              <tr>
                <th
                  class="px-3 py-2.5 text-[11px] font-bold text-foreground/45"
                >
                  Channel
                </th>
                <th
                  class="px-3 py-2.5 text-[11px] font-bold text-foreground/45"
                >
                  Source
                </th>
                <th
                  class="px-3 py-2.5 text-[11px] font-bold text-foreground/45"
                >
                  Workspace
                </th>
                <th
                  class="px-3 py-2.5 text-[11px] font-bold text-foreground/45"
                >
                  Assistant
                </th>
                <th
                  class="px-3 py-2.5 text-[11px] font-bold text-foreground/45"
                >
                  Skills
                </th>
                <th
                  class="px-3 py-2.5 text-[11px] font-bold text-foreground/45"
                >
                  Tools
                </th>
                <th
                  class="px-3 py-2.5 text-[11px] font-bold text-foreground/45"
                >
                  Status
                </th>
                <th
                  class="px-3 py-2.5 text-right text-[11px] font-bold text-foreground/45"
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-foreground/10">
              <tr
                v-for="flow in paginatedFlows"
                :key="`${flow.channelType}-${flow.id}`"
                class="transition hover:bg-primary/[0.035]"
              >
                <td class="px-3 py-3 align-middle">
                  <div class="flex items-center gap-2">
                    <span
                      :class="[
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] ring-1',
                        flow.iconClass,
                      ]"
                    >
                      <component :is="flow.icon" class="h-4 w-4" />
                    </span>
                    <span class="text-xs font-bold text-foreground">{{
                      flow.channel
                    }}</span>
                  </div>
                </td>
                <td class="px-3 py-3 align-middle">
                  <div class="min-w-0">
                    <p
                      class="max-w-[17rem] truncate text-xs font-bold text-foreground"
                    >
                      {{ flow.title }}
                    </p>
                    <p
                      class="mt-0.5 max-w-[17rem] truncate text-[11px] font-semibold text-foreground/45"
                    >
                      {{ flow.source }} · {{ flow.trigger }}
                    </p>
                  </div>
                </td>
                <td class="px-3 py-3 align-middle">
                  <div class="flex max-w-[13rem] flex-wrap gap-1">
                    <span
                      v-if="flow.businessReady"
                      class="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400"
                    >
                      <CreditCard class="h-3 w-3" />
                      Business
                    </span>
                    <span
                      v-if="flow.schoolReady"
                      class="inline-flex items-center gap-1 rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold text-sky-400"
                    >
                      <GraduationCap class="h-3 w-3" />
                      School
                    </span>
                    <span
                      v-if="!flow.businessReady && !flow.schoolReady"
                      class="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-bold text-foreground/40"
                    >
                      General
                    </span>
                  </div>
                </td>
                <td class="px-3 py-3 align-middle">
                  <div class="flex min-w-0 items-center gap-2">
                    <span
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.35rem] bg-violet-400/10 text-violet-400 ring-1 ring-violet-400/15"
                    >
                      <Bot class="h-3.5 w-3.5" />
                    </span>
                    <div class="min-w-0">
                      <p
                        class="max-w-[12rem] truncate text-xs font-bold text-foreground"
                      >
                        {{ flow.assistant }}
                      </p>
                      <p
                        class="mt-0.5 max-w-[12rem] truncate text-[10px] font-semibold text-foreground/40"
                      >
                        {{ flow.mode }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="px-3 py-3 align-middle">
                  <div class="flex max-w-[14rem] flex-wrap gap-1">
                    <span
                      v-for="skill in flow.skills.slice(0, 2)"
                      :key="skill"
                      class="inline-flex items-center gap-1 rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold text-sky-400"
                    >
                      <BrainCircuit class="h-3 w-3" />
                      {{ formatConfigLabel(skill) }}
                    </span>
                    <span
                      v-if="flow.skills.length > 2"
                      class="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-bold text-foreground/45"
                    >
                      +{{ flow.skills.length - 2 }}
                    </span>
                    <span
                      v-if="!flow.skills.length"
                      class="text-[11px] font-semibold text-foreground/35"
                      >None</span
                    >
                  </div>
                </td>
                <td class="px-3 py-3 align-middle">
                  <div class="flex max-w-[14rem] flex-wrap gap-1">
                    <span
                      v-for="tool in flow.tools.slice(0, 2)"
                      :key="tool"
                      class="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-400"
                    >
                      <Wrench class="h-3 w-3" />
                      {{ formatConfigLabel(tool) }}
                    </span>
                    <span
                      v-if="flow.tools.length > 2"
                      class="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-bold text-foreground/45"
                    >
                      +{{ flow.tools.length - 2 }}
                    </span>
                    <span
                      v-if="!flow.tools.length"
                      class="text-[11px] font-semibold text-foreground/35"
                      >None</span
                    >
                  </div>
                </td>
                <td class="px-3 py-3 align-middle">
                  <div class="flex flex-wrap gap-1">
                    <span
                      :class="[
                        'rounded-full px-2 py-0.5 text-[10px] font-bold',
                        flow.active
                          ? 'bg-emerald-400/10 text-emerald-400'
                          : 'bg-foreground/5 text-foreground/45',
                      ]"
                    >
                      {{ flow.active ? "Active" : "Paused" }}
                    </span>
                    <span
                      v-if="flow.paymentEnabled"
                      class="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-400"
                    >
                      Payment
                    </span>
                    <span
                      v-if="flow.trainingCount"
                      class="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold text-sky-400"
                    >
                      {{ flow.trainingCount }} sources
                    </span>
                  </div>
                </td>
                <td class="px-3 py-3 text-right align-middle">
                  <NuxtLink
                    :to="flowDetailRoute(flow)"
                    class="inline-flex h-8 items-center justify-center rounded-[0.39rem] border border-primary/20 bg-primary/10 px-3 text-[11px] font-bold text-primary transition hover:bg-primary/15"
                  >
                    Open
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="p-8 text-center">
          <GitBranch class="mx-auto h-8 w-8 text-foreground/25" />
          <p class="mt-3 text-xs font-bold text-foreground">No flows found</p>
          <p class="mt-1 text-xs font-semibold text-foreground/45">
            Try another channel filter or connect an Instagram or WhatsApp
            channel.
          </p>
        </div>

        <div
          class="flex flex-col gap-3 border-t border-foreground/10 p-3 md:flex-row md:items-center md:justify-between"
        >
          <p class="text-[11px] font-bold text-foreground/45">
            Showing {{ visibleFlowSummary }}
          </p>
          <div class="flex items-center gap-2">
            <button
              type="button"
              :disabled="currentPage <= 1"
              class="h-8 rounded-[0.39rem] border border-foreground/10 px-3 text-[11px] font-bold text-foreground/55 transition hover:bg-foreground/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
              @click="currentPage = Math.max(1, currentPage - 1)"
            >
              Previous
            </button>
            <span
              class="rounded-[0.39rem] bg-foreground/[0.04] px-3 py-2 text-[11px] font-bold text-foreground/50"
            >
              Page {{ currentPage }} / {{ totalPages }}
            </span>
            <button
              type="button"
              :disabled="currentPage >= totalPages"
              class="h-8 rounded-[0.39rem] border border-foreground/10 px-3 text-[11px] font-bold text-foreground/55 transition hover:bg-foreground/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
              @click="currentPage = Math.min(totalPages, currentPage + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
