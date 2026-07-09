<script setup lang="ts">
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  ExternalLink,
  GitBranch,
  HelpCircle,
  MessageSquare,
  Plug,
  Sparkles,
  Zap,
  TrendingUp,
} from "lucide-vue-next";
import CustomSelect from "~~/app/components/CustomSelect.vue";
const { openFeedback } = useFeedback();
const { userId } = useAuth();
const route = useRoute();
const supabase = useSupabaseClient();
const isStatusPopoverOpen = ref(false);
const statusPopoverRef = ref<HTMLElement | null>(null);

// Dynamic Header Content
const isAnalyticsPage = computed(() => route.path === "/dashboard/analytics");
const isConversationsPage = computed(
  () => route.path === "/dashboard/conversations",
);
const isWebsiteIntegrationPage = computed(
  () => route.path === "/dashboard/integrations/website",
);
const isToolsPage = computed(() => route.path === "/dashboard/agents/tools");
const isSkillsPage = computed(() => route.path === "/dashboard/agents/skills");
const isAgentTrainingPage = computed(
  () => route.path === "/dashboard/agents/training",
);
const isInstagramFlowPage = computed(() =>
  route.path.startsWith("/dashboard/flows/"),
);
const showPageContext = computed(
  () =>
    route.path !== "/dashboard" &&
    !isAnalyticsPage.value &&
    !isConversationsPage.value &&
    !isWebsiteIntegrationPage.value &&
    !isToolsPage.value &&
    !isSkillsPage.value &&
    !isAgentTrainingPage.value,
);

const analyticsBotId = useState<string>(
  "dashboard-analytics-selected-bot-id",
  () => "all",
);
const analyticsBotOptions = useState<Array<{ label: string; value: string }>>(
  "dashboard-analytics-bot-options",
  () => [{ label: "All chatbots", value: "all" }],
);
const conversationsBotId = useState<string>("selected-chatbot-id", () => "");
const conversationsBotOptions = useState<
  Array<{ label: string; value: string }>
>("dashboard-conversations-bot-options", () => []);
const websiteBotId = useState<string>(
  "dashboard-website-selected-bot-id",
  () => "",
);
const websiteBotOptions = useState<Array<{ label: string; value: string }>>(
  "dashboard-website-bot-options",
  () => [],
);
const toolsBotId = useState<string>(
  "dashboard-tools-selected-bot-id",
  () => "",
);
const toolsBotOptions = useState<Array<{ label: string; value: string }>>(
  "dashboard-tools-bot-options",
  () => [],
);
const skillsBotId = useState<string>(
  "dashboard-skills-selected-bot-id",
  () => "",
);
const skillsBotOptions = useState<Array<{ label: string; value: string }>>(
  "dashboard-skills-bot-options",
  () => [],
);
const trainingBotId = useState<string>(
  "dashboard-training-selected-bot-id",
  () => "",
);
const trainingBotOptions = useState<Array<{ label: string; value: string }>>(
  "dashboard-training-bot-options",
  () => [],
);

watch(trainingBotId, (botId, previousBotId) => {
  if (!isAgentTrainingPage.value || !botId || botId === previousBotId) return;
  if (String(route.query.id || "") === botId) return;
  navigateTo({
    path: "/dashboard/agents/training",
    query: { ...route.query, id: botId },
  });
});
const instagramFlowAccountId = useState<string>(
  "dashboard-instagram-flow-account-id",
  () => "",
);
const instagramFlowPostUrl = useState<string>(
  "dashboard-instagram-flow-post-url",
  () => "",
);
const instagramFlowSummary = useState<string>(
  "dashboard-instagram-flow-summary",
  () => "Automation canvas",
);

const { data: headerStats } = useAsyncData(
  "dashboard-header-status-pills",
  async () => {
    if (!userId.value) return { assistants: 0, conversations: 0, channels: 0 };

    const { data: bots } = await supabase
      .from("chatbots")
      .select("id")
      .eq("user_id", userId.value)
      .is("deleted_at", null);

    const botIds = (bots || []).map((bot: any) => bot.id).filter(Boolean);

    const [sessionsRes, whatsappRes, instagramRes] = await Promise.all([
      botIds.length
        ? supabase
            .from("chat_sessions")
            .select("id", { count: "exact", head: true })
            .in("chatbot_id", botIds)
        : Promise.resolve({ count: 0 }),
      supabase
        .from("whatsapp_accounts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId.value),
      supabase
        .from("instagram_accounts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId.value),
    ]);

    return {
      assistants: bots?.length || 0,
      conversations: sessionsRes.count || 0,
      channels: (whatsappRes.count || 0) + (instagramRes.count || 0),
    };
  },
  { watch: [userId], server: false },
);

const dashboardPills = computed(() => [
  {
    label: "Assistants ready",
    value: headerStats.value?.assistants || 0,
    icon: Bot,
  },
  {
    label: "Customer chats",
    value: headerStats.value?.conversations || 0,
    icon: MessageSquare,
  },
  {
    label: "Channels connected",
    value: headerStats.value?.channels || 0,
    icon: Plug,
  },
]);

const assistantCount = computed(() => headerStats.value?.assistants || 0);

const closeStatusPopover = (event?: MouseEvent) => {
  if (!isStatusPopoverOpen.value) return;
  const target = event?.target as Node | null;
  if (target && statusPopoverRef.value?.contains(target)) return;
  isStatusPopoverOpen.value = false;
};

onMounted(() => document.addEventListener("click", closeStatusPopover));
onBeforeUnmount(() =>
  document.removeEventListener("click", closeStatusPopover),
);
watch(
  () => route.fullPath,
  () => {
    isStatusPopoverOpen.value = false;
  },
);

const pageContext = computed(() => {
  const path = route.path;
  if (path === "/dashboard")
    return {
      title: "Dashboard",
      subtitle: "Track your assistants, replies, and recent activity.",
    };
  if (path.startsWith("/dashboard/settings"))
    return {
      title: "Settings",
      subtitle: "Manage your account, billing, and workspace preferences.",
    };
  if (path.includes("/dashboard/agents/training"))
    return {
      title: "Assistant training",
      subtitle: "Select an assistant and manage its knowledge sources.",
    };
  if (path === "/dashboard/agents/skills")
    return {
      title: "Assistant Skills",
      subtitle:
        "Assign behavior skills for website, WhatsApp, Instagram, support, and booking conversations.",
    };
  if (path.includes("/dashboard/agents"))
    return {
      title: "Assistants",
      subtitle: "Create, configure, and manage your AI assistants.",
    };
  if (path.includes("/dashboard/analytics"))
    return {
      title: "Analytics",
      subtitle: "Review conversations, usage, and performance trends.",
    };
  if (path === "/dashboard/flows")
    return {
      title: "Flows",
      subtitle:
        "Review channel triggers, assistants, replies, and delivery paths.",
    };
  if (isInstagramFlowPage.value)
    return {
      title: "Flow builder",
      subtitle:
        "Build the path from channel trigger to assistant reply and continued conversation.",
    };
  if (path.includes("/dashboard/integrations/instagram"))
    return {
      title: "Instagram",
      subtitle: "Manage comment replies and comment-to-DM automations.",
    };
  if (path.includes("/dashboard/integrations/whatsapp"))
    return {
      title: "WhatsApp",
      subtitle: "Connect your business number and manage WhatsApp AI support.",
    };
  if (path.includes("/dashboard/conversations"))
    return {
      title: "Conversations",
      subtitle: "Browse and review customer conversations.",
    };
  if (path.includes("/dashboard/pricing"))
    return {
      title: "Pricing",
      subtitle: "Choose the plan that fits your current stage.",
    };
  return { title: "Dashboard", subtitle: "Welcome back to ReplySuite." };
});
</script>

<template>
  <header
    class="flex flex-col md:flex-row md:items-center justify-between gap-1.5 mb-0"
  >
    <!-- Brand (Mobile Only) -->
    <div class="flex md:hidden items-center justify-between w-full mb-1">
      <div class="flex items-center gap-3">
        <div
          class="h-[1.625rem] w-[1.625rem] bg-gradient-to-tr from-primary to-primary-accent rounded-lg flex items-center justify-center shadow-lg shadow-primary/20"
        >
          <Zap class="text-black w-3.5 h-3.5 fill-current" />
        </div>
        <span class="text-sm font-bold">ReplySuite</span>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center justify-center p-2.5 text-foreground/45 transition hover:text-primary active:scale-95"
          aria-label="Share feedback"
          @click="openFeedback('Dashboard Header')"
        >
          <HelpCircle class="w-4 h-4" />
        </button>
        <NuxtLink
          to="/dashboard/pricing"
          class="dashboard-header-action-btn !p-2.5"
          aria-label="Upgrade plan"
        >
          <TrendingUp class="w-4 h-4" />
        </NuxtLink>
      </div>
    </div>

    <div
      class="min-h-[2rem] flex-1 animate-in fade-in slide-in-from-left-4 duration-500"
    >
      <template v-if="isInstagramFlowPage">
        <div class="flex min-w-0 items-center gap-2">
          <NuxtLink
            to="/dashboard/flows"
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.03] text-foreground/55 transition hover:border-primary/30 hover:text-primary"
            aria-label="Back to flows"
            title="Back to flows"
          >
            <ArrowLeft class="h-4 w-4" />
          </NuxtLink>
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] bg-primary/10 text-primary ring-1 ring-primary/15"
          >
            <GitBranch class="h-4 w-4" />
          </div>
          <div class="min-w-0">
            <h1
              class="truncate text-base font-bold leading-tight text-foreground md:text-lg"
            >
              Conversation path
            </h1>
            <p
              class="mt-0.5 truncate text-[10px] font-medium text-foreground/50 md:text-[11px]"
            >
              {{
                instagramFlowSummary ||
                "Comment trigger → assistant reply → continued customer conversation."
              }}
            </p>
          </div>
        </div>
      </template>
      <template
        v-else-if="
          isAnalyticsPage ||
          isConversationsPage ||
          isWebsiteIntegrationPage ||
          isToolsPage ||
          isSkillsPage ||
          isAgentTrainingPage
        "
      >
        <div class="flex w-full items-center gap-2 md:max-w-xs">
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] bg-primary/10 text-primary ring-1 ring-primary/15"
          >
            <Bot class="h-4 w-4" />
          </div>
          <div
            class="min-w-0 flex-1 [&_button]:!rounded-[0.39rem] [&_button]:!px-3 [&_button]:!py-2 [&_button]:!text-xs [&_button]:!shadow-none"
          >
            <CustomSelect
              v-if="isAnalyticsPage"
              v-model="analyticsBotId"
              :options="analyticsBotOptions"
              placeholder="Select assistant"
            />
            <CustomSelect
              v-else-if="isConversationsPage"
              v-model="conversationsBotId"
              :options="conversationsBotOptions"
              placeholder="Select assistant"
            />
            <CustomSelect
              v-else-if="isWebsiteIntegrationPage"
              v-model="websiteBotId"
              :options="websiteBotOptions"
              placeholder="Select website assistant"
            />
            <CustomSelect
              v-else-if="isToolsPage"
              v-model="toolsBotId"
              :options="toolsBotOptions"
              placeholder="Select assistant"
            />
            <CustomSelect
              v-else-if="isAgentTrainingPage"
              v-model="trainingBotId"
              :options="trainingBotOptions"
              placeholder="Select assistant"
            />
            <CustomSelect
              v-else
              v-model="skillsBotId"
              :options="skillsBotOptions"
              placeholder="Select assistant"
            />
          </div>
        </div>
      </template>
      <template v-else-if="showPageContext">
        <h1
          class="text-base md:text-lg font-black text-foreground leading-tight"
        >
          {{ pageContext.title }}
        </h1>
        <p
          class="text-foreground/50 text-[10px] md:text-[11px] font-medium mt-0.5"
        >
          {{ pageContext.subtitle }}
        </p>
      </template>
      <div v-else ref="statusPopoverRef" class="relative hidden md:block">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-[0.39rem] bg-foreground/[0.035] px-2.5 py-1.5 text-[11px] font-semibold tracking-normal text-foreground/60 transition hover:bg-foreground/[0.055] hover:text-foreground"
          aria-haspopup="dialog"
          :aria-expanded="isStatusPopoverOpen"
          @click.stop="isStatusPopoverOpen = !isStatusPopoverOpen"
        >
          <Plug class="h-3.5 w-3.5 text-primary/75" />
          <span
            ><strong class="font-black tabular-nums text-foreground">{{
              assistantCount
            }}</strong>
            assistants</span
          >
          <ChevronDown
            :class="[
              'h-3.5 w-3.5 text-foreground/35 transition-transform',
              isStatusPopoverOpen ? 'rotate-180' : '',
            ]"
          />
        </button>

        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="-translate-y-1 opacity-0 scale-95"
          enter-to-class="translate-y-0 opacity-100 scale-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="translate-y-0 opacity-100 scale-100"
          leave-to-class="-translate-y-1 opacity-0 scale-95"
        >
          <div
            v-if="isStatusPopoverOpen"
            class="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-64 origin-top-left rounded-[0.39rem] border border-foreground/10 bg-background-card p-2 shadow-xl shadow-black/10"
            @click.stop
          >
            <p class="dashboard-eyebrow px-2 pb-2 pt-1">Workspace live</p>
            <div class="space-y-1">
              <div
                v-for="pill in dashboardPills"
                :key="pill.label"
                class="flex items-center justify-between gap-3 rounded-[0.35rem] bg-background/45 px-3 py-2"
              >
                <div class="flex items-center gap-2">
                  <component :is="pill.icon" class="h-4 w-4 text-primary/75" />
                  <span class="text-xs font-medium text-foreground/60">{{
                    pill.label
                  }}</span>
                </div>
                <span class="text-sm font-black tabular-nums text-foreground">{{
                  pill.value
                }}</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <div
      v-if="isInstagramFlowPage"
      class="hidden items-center justify-end gap-2.5 border-t border-foreground/5 pt-1.5 sm:flex md:border-t-0 md:pt-0"
    >
      <NuxtLink
        :to="`/dashboard/integrations/instagram/setup?accountId=${instagramFlowAccountId}`"
        class="inline-flex h-8 w-8 items-center justify-center rounded-[0.39rem] bg-primary text-black transition hover:bg-primary-accent"
        aria-label="New flow"
        title="New flow"
      >
        <Zap class="h-3.5 w-3.5" />
      </NuxtLink>
      <a
        v-if="instagramFlowPostUrl"
        :href="instagramFlowPostUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex h-8 w-8 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.03] text-foreground/55 transition hover:border-primary/30 hover:text-primary"
        aria-label="Open post"
        title="Open post"
      >
        <ExternalLink class="h-3.5 w-3.5" />
      </a>
      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-[0.39rem] border border-primary/15 bg-primary/10 text-primary"
        aria-label="ReplySuite Flow"
        title="ReplySuite Flow"
      >
        <Sparkles class="h-3.5 w-3.5" />
      </button>
      <ThemeSwitcher />
    </div>
    <div
      v-else
      class="hidden items-center justify-end gap-2.5 border-t border-foreground/5 pt-1.5 sm:flex md:border-t-0 md:pt-0"
    >
      <button
        type="button"
        class="dashboard-action-label inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-foreground/45 transition hover:text-primary active:scale-95 whitespace-nowrap"
        @click="openFeedback('Dashboard Header')"
      >
        <span>Feedback</span>
        <HelpCircle class="w-3 h-3" />
      </button>
      <NuxtLink
        to="/dashboard/pricing"
        class="dashboard-header-action-btn whitespace-nowrap"
      >
        <span>Upgrade Plan</span>
        <TrendingUp class="w-3 h-3" />
      </NuxtLink>
      <ThemeSwitcher />
    </div>
  </header>
</template>
