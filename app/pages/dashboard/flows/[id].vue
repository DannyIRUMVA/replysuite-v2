<script setup lang="ts">
import {
  Bot,
  BrainCircuit,
  GitBranch,
  Instagram,
  Loader2,
  MessageCircle,
  MessageSquare,
  PlayCircle,
  Plus,
  Smartphone,
  RefreshCcw,
  Save,
  Send,
  Sparkles,
  Trash2,
  Wrench,
  X,
  Zap,
} from "lucide-vue-next";
import Skeleton from "~~/app/components/Skeleton.vue";

const FLOW_NODES = [
  "post",
  "trigger",
  "assistant",
  "skills",
  "tools",
  "publicReply",
  "dmReply",
  "conversation",
  "delivery",
] as const;
type FlowNode = (typeof FLOW_NODES)[number];

definePageMeta({ middleware: "auth", layout: "dashboard" });
useHead({ title: "Flow builder | ReplySuite" });

const route = useRoute();
const accountId = route.params.id as string;
const flowChannelType = computed<"instagram" | "whatsapp">(() =>
  route.query.channel === "whatsapp" ? "whatsapp" : "instagram",
);
const flowChannelName = computed(() =>
  flowChannelType.value === "whatsapp" ? "WhatsApp" : "Instagram",
);
const flowChannelIcon = computed(() =>
  flowChannelType.value === "whatsapp" ? Smartphone : Instagram,
);
const { canUseInstagramWorkflow } = usePlanAccess();
const supabase = useSupabaseClient();
const notify = useNotify();

const isLocked = computed(
  () => flowChannelType.value === "instagram" && !canUseInstagramWorkflow.value,
);
const canPublicComment = computed(
  () => flowChannelType.value === "instagram" && canUseInstagramWorkflow.value,
);
const hasMounted = ref(false);
const selectedRuleId = ref("");
const selectedNode = ref<FlowNode>("trigger");
const isInspectorOpen = ref(false);
const isFlowPickerOpen = ref(false);
const isTestConsoleOpen = ref(false);
const isCanvasPanelOpen = ref(true);
const isNodePaletteOpen = ref(false);
const isSaving = ref(false);
const isTesting = ref(false);
const testResult = ref<any>(null);
const isSidebarCollapsed = useState<boolean>(
  "dashboard-sidebar-collapsed",
  () => false,
);
const sidebarCollapsedStorageKey = "replysuite:dashboard-sidebar-collapsed";
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

const form = reactive({
  triggerId: "",
  postId: "",
  chatbotId: "",
  keywords: "",
  replyInComment: false,
  replyInDm: true,
  dmTemplate: "",
  isActive: true,
});

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

onMounted(() => {
  hasMounted.value = true;
  instagramFlowAccountId.value = accountId;
  if (!isSidebarCollapsed.value) isSidebarCollapsed.value = true;
  if (import.meta.client) {
    localStorage.setItem(sidebarCollapsedStorageKey, "true");
  }
});

onBeforeUnmount(() => {
  stopCanvasInteractions();
  instagramFlowPostUrl.value = "";
  instagramFlowSummary.value = "Automation canvas";
});

const {
  data: accounts,
  pending: isLoadingInstagram,
  refresh,
} = await useAsyncData(
  `instagram-flow-account-${accountId}`,
  async () => await instagramApiFetch<any[]>("/api/instagram/accounts"),
  { server: false, default: () => [] },
);

const { data: whatsappAccounts, pending: isLoadingWhatsapp } =
  await useAsyncData(
    `whatsapp-flow-account-${accountId}`,
    async () => {
      if (flowChannelType.value !== "whatsapp") return [];
      const { data } = await supabase
        .from("whatsapp_accounts")
        .select(
          "id, chatbot_id, phone_number, status, created_at, chatbots(id, name)",
        )
        .eq("id", accountId);
      return data || [];
    },
    { server: false, default: () => [], watch: [() => flowChannelType.value] },
  );

const isLoading = computed(
  () => isLoadingInstagram.value || isLoadingWhatsapp.value,
);

const { data: agents } = await useAsyncData(
  "instagram-flow-agents",
  async () => {
    const { data } = await supabase
      .from("chatbots")
      .select("id, name, enabled_tools, tools_config")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    return data || [];
  },
  { server: false, default: () => [] },
);

const account = computed(() => {
  if (flowChannelType.value === "whatsapp") {
    return (
      (whatsappAccounts.value || []).find(
        (item: any) => item.id === accountId,
      ) || null
    );
  }
  return (
    (accounts.value || []).find((item: any) => item.id === accountId) || null
  );
});

const automations = computed(() => {
  const currentAccount = account.value;
  if (!currentAccount) return [];

  if (flowChannelType.value === "whatsapp") {
    return [
      {
        id: currentAccount.id,
        account: currentAccount,
        post: {
          id: currentAccount.id,
          caption: currentAccount.phone_number || "WhatsApp number",
        },
        trigger: {
          id: currentAccount.id,
          chatbot_id: currentAccount.chatbot_id,
          keywords: ["Inbound messages"],
          reply_in_comment: false,
          reply_in_dm: true,
          is_active:
            currentAccount.status === "active" ||
            currentAccount.status === "deployed",
          chatbots: currentAccount.chatbots,
        },
        jobs: [],
        comments: [],
      },
    ];
  }

  return (currentAccount.posts || []).flatMap((post: any) =>
    (post.triggers || []).map((trigger: any) => ({
      id: trigger.id,
      account: currentAccount,
      post,
      trigger,
      jobs: (currentAccount.jobs || []).filter(
        (job: any) =>
          job.trigger_id === trigger.id || job.triggerId === trigger.id,
      ),
      comments: post.comments || [],
    })),
  );
});

const postLabel = (post: any) => {
  const caption = String(post?.caption || "").trim();
  return caption || post?.permalink || post?.id || "Instagram post";
};

const keywordsLabel = (trigger: any) => {
  const keywords = Array.isArray(trigger?.keywords)
    ? trigger.keywords.filter(Boolean)
    : [];
  return keywords.length ? keywords.join(", ") : "All comments";
};

const modeLabel = (trigger: any) => {
  if (!trigger) return "No reply action";
  if (trigger.reply_in_comment && trigger.reply_in_dm) return "Comment + DM";
  if (trigger.reply_in_comment) return "Comment reply";
  if (trigger.reply_in_dm) return "DM reply";
  return "No reply action";
};

const formatDate = (value?: string) => {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(value));
};

const selectedAutomation = computed(
  () =>
    automations.value.find(
      (automation: any) => automation.id === selectedRuleId.value,
    ) ||
    automations.value[0] ||
    null,
);
const selectedPost = computed(() => selectedAutomation.value?.post || null);
const selectedTrigger = computed(
  () => selectedAutomation.value?.trigger || null,
);
const selectedJobs = computed(() => selectedAutomation.value?.jobs || []);
const selectedComments = computed(
  () => selectedAutomation.value?.comments || [],
);

const sentCount = computed(
  () => selectedJobs.value.filter((job: any) => job.status === "sent").length,
);
const failedCount = computed(
  () => selectedJobs.value.filter((job: any) => job.status === "failed").length,
);
const commentReplyCount = computed(
  () =>
    selectedJobs.value.filter(
      (job: any) => job.payload?.action_type === "comment_reply",
    ).length,
);
const dmReplyCount = computed(
  () =>
    selectedJobs.value.filter(
      (job: any) => job.payload?.action_type === "comment_to_dm",
    ).length,
);
const continuedDmCount = computed(
  () =>
    selectedJobs.value.filter(
      (job: any) => job.payload?.action_type === "direct_message",
    ).length,
);

const latestJobTime = computed(() => {
  const dates = selectedJobs.value
    .map((job: any) => job.updated_at || job.created_at || job.sent_at)
    .filter(Boolean)
    .sort();
  return (
    dates.at(-1) ||
    selectedTrigger.value?.updated_at ||
    selectedPost.value?.updated_at
  );
});

const selectedAssistant = computed(
  () =>
    (agents.value || []).find((agent: any) => agent.id === form.chatbotId) ||
    null,
);
const assistantName = computed(
  () =>
    selectedTrigger.value?.chatbots?.name ||
    selectedAssistant.value?.name ||
    "Choose assistant",
);
const assistantTools = computed(() =>
  Array.isArray(selectedAssistant.value?.enabled_tools)
    ? selectedAssistant.value.enabled_tools.filter(Boolean)
    : [],
);
const assistantSkills = computed(() =>
  Array.isArray(selectedAssistant.value?.tools_config?.assistant_skills)
    ? selectedAssistant.value.tools_config.assistant_skills.filter(Boolean)
    : [],
);
const formatConfigLabel = (value: string) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
const configListSummary = (items: string[], empty: string) =>
  items.length ? items.slice(0, 2).map(formatConfigLabel).join(", ") : empty;

const nodeSummary = computed<Record<FlowNode, string>>(() => ({
  post:
    flowChannelType.value === "whatsapp"
      ? selectedPost.value
        ? postLabel(selectedPost.value)
        : "WhatsApp business number"
      : selectedPost.value
        ? postLabel(selectedPost.value)
        : "Choose a synced post",
  trigger: selectedTrigger.value
    ? flowChannelType.value === "whatsapp"
      ? `WhatsApp · message/keyword · ${keywordsLabel(selectedTrigger.value)}`
      : `${flowChannelName.value} · ${form.replyInDm ? "comment-to-DM" : "comment keyword"} · ${keywordsLabel(selectedTrigger.value)}`
    : flowChannelType.value === "whatsapp"
      ? "WhatsApp message or keyword"
      : "Instagram comment or comment-to-DM",
  assistant: assistantName.value,
  skills: configListSummary(assistantSkills.value, "No skills connected"),
  tools: configListSummary(assistantTools.value, "No tools connected"),
  publicReply: form.replyInComment
    ? "Public comment is on"
    : "Public comment is off",
  dmReply:
    flowChannelType.value === "whatsapp"
      ? "WhatsApp reply is on"
      : form.replyInDm
        ? "Private DM is on"
        : "Private DM is off",
  conversation: form.replyInDm
    ? "Assistant continues when the customer replies"
    : "Turn on DM reply to continue privately",
  delivery: `${sentCount.value} sent / ${failedCount.value} failed`,
}));

const flowNodes = computed(() =>
  [
    {
      id: "post" as FlowNode,
      label: flowChannelType.value === "whatsapp" ? "Source" : "Post",
      description:
        flowChannelType.value === "whatsapp"
          ? "WhatsApp number receiving messages"
          : "Instagram post being watched",
      icon: flowChannelIcon.value,
      tone: flowChannelType.value === "whatsapp" ? "emerald" : "pink",
      enabled: Boolean(selectedPost.value),
    },
    {
      id: "trigger" as FlowNode,
      label: "Channels",
      description:
        flowChannelType.value === "whatsapp"
          ? "WhatsApp message or keyword"
          : form.replyInDm
            ? "Instagram comment-to-DM"
            : "Instagram comment keyword",
      icon: flowChannelIcon.value,
      tone: flowChannelType.value === "whatsapp" ? "emerald" : "pink",
      enabled: Boolean(selectedTrigger.value && form.isActive),
    },
    {
      id: "assistant" as FlowNode,
      label: "Assistant",
      description: "ReplySuite assistant drafts the response",
      icon: Bot,
      tone: "violet",
      enabled: Boolean(form.chatbotId),
    },
    {
      id: "skills" as FlowNode,
      label: "Skills",
      description: "Assistant behavior skills available in this path",
      icon: BrainCircuit,
      tone: "sky",
      enabled: assistantSkills.value.length > 0,
    },
    {
      id: "tools" as FlowNode,
      label: "Tools",
      description: "Connected tools the assistant can use",
      icon: Wrench,
      tone: "amber",
      enabled: assistantTools.value.length > 0,
    },
    {
      id: "publicReply" as FlowNode,
      label: "Public reply",
      description: "Reply under matching comments",
      icon: MessageSquare,
      tone: "sky",
      enabled: Boolean(form.replyInComment),
    },
    {
      id: "dmReply" as FlowNode,
      label:
        flowChannelType.value === "whatsapp" ? "WhatsApp reply" : "DM reply",
      description:
        flowChannelType.value === "whatsapp"
          ? "Send the assistant response in WhatsApp"
          : "Send the first private message",
      icon: Send,
      tone: "emerald",
      enabled: Boolean(form.replyInDm),
    },
    {
      id: "conversation" as FlowNode,
      label: "Continue conversation",
      description: "Bot keeps helping after the first DM",
      icon: Sparkles,
      tone: "lime",
      enabled: Boolean(form.replyInDm && form.chatbotId),
    },
    {
      id: "delivery" as FlowNode,
      label: "Delivery",
      description:
        flowChannelType.value === "whatsapp"
          ? "Recent messages and results"
          : "Recent comments and results",
      icon: PlayCircle,
      tone: "slate",
      enabled: sentCount.value > 0 || failedCount.value > 0,
    },
  ].filter(
    (node) =>
      (node.id !== "skills" || assistantSkills.value.length > 0) &&
      (node.id !== "tools" || assistantTools.value.length > 0) &&
      (node.id !== "publicReply" || flowChannelType.value === "instagram"),
  ),
);

const selectedNodeMeta = computed(() =>
  flowNodes.value.find((node) => node.id === selectedNode.value),
);
const addableNodeOptions = computed(() =>
  flowNodes.value.filter(
    (node) => node.id !== "post" && node.id !== "delivery",
  ),
);

const statusPillClass = (active: boolean) =>
  active
    ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-700 dark:text-emerald-200"
    : "border-foreground/10 bg-foreground/[0.03] text-foreground/55";

type NodeTone =
  "pink" | "amber" | "violet" | "sky" | "emerald" | "lime" | "slate";

const nodeShellClass = (tone: NodeTone, selected: boolean) => {
  if (selected) {
    return {
      pink: "bg-pink-400/[0.08] ring-pink-400/35",
      amber: "bg-amber-400/[0.08] ring-amber-400/35",
      violet: "bg-violet-400/[0.08] ring-violet-400/35",
      sky: "bg-sky-400/[0.08] ring-sky-400/35",
      emerald: "bg-emerald-400/[0.08] ring-emerald-400/35",
      lime: "bg-primary/[0.08] ring-primary/35",
      slate: "bg-foreground/[0.06] ring-foreground/20",
    }[tone];
  }
  return {
    pink: "bg-background-card ring-pink-400/15 hover:bg-pink-400/[0.04] hover:ring-pink-400/30",
    amber:
      "bg-background-card ring-amber-400/15 hover:bg-amber-400/[0.04] hover:ring-amber-400/30",
    violet:
      "bg-background-card ring-violet-400/15 hover:bg-violet-400/[0.04] hover:ring-violet-400/30",
    sky: "bg-background-card ring-sky-400/15 hover:bg-sky-400/[0.04] hover:ring-sky-400/30",
    emerald:
      "bg-background-card ring-emerald-400/15 hover:bg-emerald-400/[0.04] hover:ring-emerald-400/30",
    lime: "bg-background-card ring-primary/15 hover:bg-primary/[0.04] hover:ring-primary/30",
    slate:
      "bg-background-card ring-foreground/10 hover:bg-foreground/[0.04] hover:ring-foreground/20",
  }[tone];
};

const nodeIconClass = (tone: NodeTone, enabled: boolean) => {
  if (!enabled) return "bg-foreground/5 text-foreground/35 ring-foreground/10";
  return {
    pink: "bg-pink-400/10 text-pink-400 ring-pink-400/20",
    amber: "bg-amber-400/10 text-amber-400 ring-amber-400/20",
    violet: "bg-violet-400/10 text-violet-400 ring-violet-400/20",
    sky: "bg-sky-400/10 text-sky-400 ring-sky-400/20",
    emerald: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20",
    lime: "bg-primary/10 text-primary ring-primary/20",
    slate: "bg-foreground/5 text-foreground/55 ring-foreground/15",
  }[tone];
};

const nodeAccentClass = (tone: NodeTone, enabled = true) => {
  if (!enabled) return "bg-foreground/20";
  return {
    pink: "bg-pink-400",
    amber: "bg-amber-400",
    violet: "bg-violet-400",
    sky: "bg-sky-400",
    emerald: "bg-emerald-400",
    lime: "bg-primary",
    slate: "bg-foreground/45",
  }[tone];
};

const NODE_WIDTH = 144;
const NODE_HEIGHT = 68;
const CONNECTOR_GAP = 0;
const canvasRef = ref<HTMLElement | null>(null);
const dragMoved = ref(false);
const canvasPan = reactive({ x: 0, y: 0 });
const activeCanvasPan = ref<{
  startX: number;
  startY: number;
  originX: number;
  originY: number;
} | null>(null);
const activeDrag = ref<{
  id: FlowNode;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
} | null>(null);

const nodePositions = reactive<Record<FlowNode, { x: number; y: number }>>({
  post: { x: 80, y: 145 },
  trigger: { x: 255, y: 145 },
  assistant: { x: 430, y: 145 },
  skills: { x: 605, y: 65 },
  tools: { x: 605, y: 225 },
  publicReply: { x: 780, y: 75 },
  dmReply: { x: 780, y: 215 },
  conversation: { x: 955, y: 215 },
  delivery: { x: 1130, y: 145 },
});

const canvasWidth = computed(
  () =>
    Math.max(
      ...flowNodes.value.map((node) => nodePositions[node.id].x + NODE_WIDTH),
    ) + 96,
);
const canvasHeight = computed(
  () =>
    Math.max(
      ...flowNodes.value.map((node) => nodePositions[node.id].y + NODE_HEIGHT),
    ) + 96,
);
const canvasStyle = computed(() => ({
  minWidth: `${canvasWidth.value}px`,
  minHeight: `${canvasHeight.value}px`,
  transform: `translate3d(${canvasPan.x}px, ${canvasPan.y}px, 0)`,
}));
const nodePositionStyle = (id: FlowNode) => ({
  left: `${nodePositions[id].x}px`,
  top: `${nodePositions[id].y}px`,
});
const flowConnectorLines = computed(() =>
  flowNodes.value.slice(0, -1).map((node, index) => {
    const id = node.id;
    const nextId = flowNodes.value[index + 1].id;
    const from = nodePositions[id];
    const to = nodePositions[nextId];
    const fromCenterX = from.x + NODE_WIDTH / 2;
    const fromCenterY = from.y + NODE_HEIGHT / 2;
    const toCenterX = to.x + NODE_WIDTH / 2;
    const toCenterY = to.y + NODE_HEIGHT / 2;
    const deltaX = toCenterX - fromCenterX;
    const deltaY = toCenterY - fromCenterY;
    const useHorizontalSides = Math.abs(deltaX) >= Math.abs(deltaY);

    const startX = useHorizontalSides
      ? deltaX >= 0
        ? from.x + NODE_WIDTH + CONNECTOR_GAP
        : from.x - CONNECTOR_GAP
      : fromCenterX;
    const startY = useHorizontalSides
      ? fromCenterY
      : deltaY >= 0
        ? from.y + NODE_HEIGHT + CONNECTOR_GAP
        : from.y - CONNECTOR_GAP;
    const endX = useHorizontalSides
      ? deltaX >= 0
        ? to.x - CONNECTOR_GAP
        : to.x + NODE_WIDTH + CONNECTOR_GAP
      : toCenterX;
    const endY = useHorizontalSides
      ? toCenterY
      : deltaY >= 0
        ? to.y - CONNECTOR_GAP
        : to.y + NODE_HEIGHT + CONNECTOR_GAP;

    const isStraight = useHorizontalSides
      ? Math.abs(startY - endY) < 2
      : Math.abs(startX - endX) < 2;
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    return {
      id: `${id}-${nextId}`,
      d: useHorizontalSides
        ? isStraight
          ? `M ${startX} ${startY} H ${endX}`
          : `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`
        : isStraight
          ? `M ${startX} ${startY} V ${endY}`
          : `M ${startX} ${startY} V ${midY} H ${endX} V ${endY}`,
    };
  }),
);

const stopCanvasPan = () => {
  if (!import.meta.client) return;
  activeCanvasPan.value = null;
  window.removeEventListener("pointermove", handleCanvasPointerMove);
  window.removeEventListener("pointerup", stopCanvasPan);
  window.removeEventListener("pointercancel", stopCanvasPan);
};

const handleCanvasPointerMove = (event: PointerEvent) => {
  if (!activeCanvasPan.value) return;
  canvasPan.x = Math.round(
    activeCanvasPan.value.originX +
      event.clientX -
      activeCanvasPan.value.startX,
  );
  canvasPan.y = Math.round(
    activeCanvasPan.value.originY +
      event.clientY -
      activeCanvasPan.value.startY,
  );
};

const startCanvasPan = (event: PointerEvent) => {
  if (event.button !== 0) return;
  activeCanvasPan.value = {
    startX: event.clientX,
    startY: event.clientY,
    originX: canvasPan.x,
    originY: canvasPan.y,
  };
  window.addEventListener("pointermove", handleCanvasPointerMove);
  window.addEventListener("pointerup", stopCanvasPan);
  window.addEventListener("pointercancel", stopCanvasPan);
};

const stopNodeDrag = () => {
  if (!import.meta.client) return;
  activeDrag.value = null;
  window.removeEventListener("pointermove", handleNodePointerMove);
  window.removeEventListener("pointerup", stopNodeDrag);
  window.removeEventListener("pointercancel", stopNodeDrag);
};

const handleNodePointerMove = (event: PointerEvent) => {
  if (!activeDrag.value) return;
  const nextX =
    activeDrag.value.originX + event.clientX - activeDrag.value.startX;
  const nextY =
    activeDrag.value.originY + event.clientY - activeDrag.value.startY;
  if (
    Math.abs(event.clientX - activeDrag.value.startX) > 3 ||
    Math.abs(event.clientY - activeDrag.value.startY) > 3
  ) {
    dragMoved.value = true;
  }
  nodePositions[activeDrag.value.id].x = Math.max(12, Math.round(nextX));
  nodePositions[activeDrag.value.id].y = Math.max(12, Math.round(nextY));
};

const startNodeDrag = (event: PointerEvent, id: FlowNode) => {
  if (event.button !== 0) return;
  selectedNode.value = id;
  dragMoved.value = false;
  activeDrag.value = {
    id,
    startX: event.clientX,
    startY: event.clientY,
    originX: nodePositions[id].x,
    originY: nodePositions[id].y,
  };
  window.addEventListener("pointermove", handleNodePointerMove);
  window.addEventListener("pointerup", stopNodeDrag);
  window.addEventListener("pointercancel", stopNodeDrag);
};

const openNode = (id: FlowNode) => {
  selectedNode.value = id;
  isInspectorOpen.value = true;
};

const handleNodeClick = (id: FlowNode) => {
  if (dragMoved.value) {
    dragMoved.value = false;
    return;
  }
  openNode(id);
};

const addNodeFromPanel = (id: FlowNode) => {
  isNodePaletteOpen.value = false;
  openNode(id);
};

const stopCanvasInteractions = () => {
  stopNodeDrag();
  stopCanvasPan();
};

onBeforeRouteLeave(() => {
  stopCanvasInteractions();
});

const selectAutomation = (id: string) => {
  selectedRuleId.value = id;
  selectedNode.value = "trigger";
  isFlowPickerOpen.value = false;
  testResult.value = null;
};

watch(
  selectedAutomation,
  (automation: any) => {
    if (!automation) return;
    const trigger = automation.trigger;
    form.triggerId = trigger?.id || "";
    form.postId = automation.post?.id || "";
    form.chatbotId = trigger?.chatbot_id || agents.value?.[0]?.id || "";
    form.keywords = Array.isArray(trigger?.keywords)
      ? trigger.keywords.join(", ")
      : "";
    form.replyInComment = Boolean(
      trigger?.reply_in_comment && canPublicComment.value,
    );
    form.replyInDm = Boolean(trigger?.reply_in_dm);
    form.dmTemplate = trigger?.dm_template || "";
    form.isActive = Boolean(trigger?.is_active);
  },
  { immediate: true },
);

watch(
  automations,
  (items: any[]) => {
    if (!items.length) return;
    if (
      !selectedRuleId.value ||
      !items.some((item: any) => item.id === selectedRuleId.value)
    ) {
      selectedRuleId.value = items[0].id;
    }
  },
  { immediate: true },
);

watch(canPublicComment, (allowed) => {
  if (!allowed) form.replyInComment = false;
});

watch(
  [account, selectedPost, selectedTrigger],
  () => {
    instagramFlowAccountId.value = accountId;
    instagramFlowPostUrl.value = selectedPost.value?.permalink || "";
    instagramFlowSummary.value = selectedTrigger.value
      ? `${flowChannelName.value} · ${keywordsLabel(selectedTrigger.value)} → ${assistantName.value}`
      : `${flowChannelName.value} message or keyword → assistant reply → continued conversation`;
  },
  { immediate: true },
);

const saveFlow = async () => {
  if (!form.triggerId || !form.postId || !form.chatbotId) {
    notify.warn("This flow needs a post, trigger, and assistant.");
    return;
  }
  if (!form.replyInComment && !form.replyInDm) {
    notify.warn("Enable public reply, DM reply, or both.");
    return;
  }

  isSaving.value = true;
  try {
    await instagramApiFetch(`/api/instagram/${accountId}`, {
      method: "PATCH",
      body: {
        triggerId: form.triggerId,
        postId: form.postId,
        chatbotId: form.chatbotId,
        keywords: form.keywords,
        replyInComment: form.replyInComment,
        replyInDm: form.replyInDm,
        dmTemplate: form.dmTemplate,
        isActive: form.isActive,
      },
    });
    notify.success("Instagram flow saved.");
    await refresh();
  } catch (error: any) {
    notify.error(
      error?.data?.statusMessage ||
        error?.message ||
        "Failed to save Instagram flow.",
    );
  } finally {
    isSaving.value = false;
  }
};

const testFlow = async () => {
  if (!form.postId) {
    notify.warn("Choose a post before testing this flow.");
    return;
  }

  isTesting.value = true;
  testResult.value = null;
  try {
    const response = await instagramApiFetch<any>(
      `/api/instagram/${accountId}/sync-comments`,
      { method: "POST", body: { postId: form.postId } },
    );
    testResult.value = response;
    notify.success(
      `Checked ${response?.found || 0} comment${response?.found === 1 ? "" : "s"}.`,
    );
    await refresh();
  } catch (error: any) {
    notify.error(
      error?.data?.statusMessage ||
        error?.message ||
        "Failed to test Instagram flow.",
    );
  } finally {
    isTesting.value = false;
  }
};

const disconnect = async () => {
  if (
    !(await notify.confirm(
      "Disconnect this Instagram account and delete its post automations?",
    ))
  )
    return;
  try {
    await instagramApiFetch(`/api/instagram/${accountId}`, {
      method: "DELETE",
    });
    notify.success("Instagram account disconnected.");
    navigateTo("/dashboard/integrations/instagram");
  } catch (error: any) {
    notify.error(
      error?.data?.statusMessage ||
        error?.message ||
        "Failed to disconnect Instagram.",
    );
  }
};

const deliveryActionLabel = (value?: string) => {
  if (value === "comment_reply") return "Public comment";
  if (value === "comment_to_dm") return "First DM";
  if (value === "direct_message") return "Continued DM";
  return "Delivery";
};
</script>

<template>
  <WhatsAppUpgradeGate
    v-if="hasMounted && isLocked"
    title="Upgrade to manage Instagram flows"
    description="Instagram comment and DM automation requires a plan with Instagram access."
    back-to="/dashboard/integrations/instagram"
    back-label="Back to Instagram"
  />

  <div
    v-else
    class="-mx-3 -mt-2 min-h-[calc(100vh-4.5rem)] bg-[radial-gradient(circle_at_1px_1px,rgba(120,120,120,0.16)_1px,transparent_0)] bg-[length:18px_18px] px-3 pb-24 pt-3 sm:-mx-5 sm:px-5 md:-mx-6 md:px-6 xl:-mx-8 xl:px-8 2xl:-mx-10 2xl:px-10 lg:pb-12"
  >
    <div v-if="!hasMounted || isLoading" class="space-y-3">
      <section class="overflow-hidden rounded-[0.39rem] bg-transparent">
        <div
          class="relative min-h-[42rem] overflow-hidden p-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:p-5 [&::-webkit-scrollbar]:hidden"
        >
          <div class="absolute left-3 top-3 z-20 flex flex-col gap-2">
            <Skeleton height="2.25rem" width="2.25rem" radius="0.39rem" />
            <Skeleton height="2.25rem" width="2.25rem" radius="0.39rem" />
            <Skeleton height="2.25rem" width="2.25rem" radius="0.39rem" />
          </div>
          <div
            class="absolute right-3 top-3 z-20 w-72 rounded-[0.39rem] border border-foreground/10 bg-background-card/75 p-2 shadow-xl shadow-black/10 backdrop-blur"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="space-y-1">
                <Skeleton height="0.75rem" width="5.5rem" radius="0.25rem" />
                <Skeleton height="0.65rem" width="9rem" radius="0.25rem" />
              </div>
              <div class="flex gap-1">
                <Skeleton height="2rem" width="2rem" radius="0.39rem" />
                <Skeleton height="2rem" width="2rem" radius="0.39rem" />
              </div>
            </div>
          </div>
          <div
            class="absolute left-24 top-40 h-px w-[52rem] bg-foreground/10"
          />
          <div
            class="absolute left-[45rem] top-40 h-32 w-px bg-foreground/10"
          />
          <div class="absolute left-20 top-36 grid grid-cols-4 gap-8">
            <Skeleton
              v-for="item in 4"
              :key="item"
              height="4.25rem"
              width="9rem"
              radius="0.39rem"
            />
          </div>
          <div class="absolute left-[38rem] top-64 flex gap-8">
            <Skeleton height="4.25rem" width="9rem" radius="0.39rem" />
            <Skeleton height="4.25rem" width="9rem" radius="0.39rem" />
          </div>
        </div>
      </section>
    </div>

    <div v-else-if="account" class="space-y-3">
      <main class="grid gap-3 xl:grid-cols-[minmax(0,1fr)]">
        <section class="overflow-hidden rounded-[0.39rem] bg-transparent">
          <div
            class="relative min-h-[42rem] overflow-hidden p-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:p-5 [&::-webkit-scrollbar]:hidden"
          >
            <div class="absolute left-3 top-3 z-20 flex flex-col gap-2">
              <div class="relative">
                <button
                  type="button"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background-card/90 text-foreground/60 shadow-sm shadow-black/5 backdrop-blur transition hover:border-primary/30 hover:text-primary"
                  aria-label="Switch flow"
                  title="Switch flow"
                  @click="isFlowPickerOpen = !isFlowPickerOpen"
                >
                  <GitBranch class="h-4 w-4" />
                </button>
                <div
                  v-if="isFlowPickerOpen"
                  class="absolute left-[calc(100%+0.5rem)] top-0 z-30 w-72 rounded-[0.39rem] border border-foreground/10 bg-background-card/95 p-2 shadow-xl shadow-black/10 backdrop-blur"
                >
                  <div
                    class="mb-2 flex items-center justify-between gap-2 px-1"
                  >
                    <p class="text-xs font-bold text-foreground">Flows</p>
                    <NuxtLink
                      :to="`/dashboard/integrations/instagram/setup?accountId=${accountId}`"
                      class="inline-flex h-7 w-7 items-center justify-center rounded-[0.39rem] bg-primary text-black"
                      aria-label="New flow"
                      title="New flow"
                      @click="stopCanvasInteractions"
                    >
                      <Zap class="h-3.5 w-3.5" />
                    </NuxtLink>
                  </div>
                  <div class="max-h-72 space-y-1 overflow-y-auto">
                    <button
                      v-for="automation in automations"
                      :key="automation.id"
                      type="button"
                      :class="[
                        'flex w-full items-center gap-2 rounded-[0.39rem] border p-2 text-left transition',
                        selectedRuleId === automation.id
                          ? 'border-primary/30 bg-primary/[0.08] text-primary'
                          : 'border-foreground/10 bg-background/45 text-foreground/60 hover:border-primary/25 hover:text-primary',
                      ]"
                      @click="selectAutomation(automation.id)"
                    >
                      <component
                        :is="flowChannelIcon"
                        class="h-4 w-4 shrink-0"
                      />
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-xs font-bold">{{
                          postLabel(automation.post)
                        }}</span>
                        <span
                          class="mt-0.5 block truncate text-[11px] font-semibold opacity-70"
                          >{{ modeLabel(automation.trigger) }}</span
                        >
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background-card/90 text-foreground/60 shadow-sm shadow-black/5 backdrop-blur transition hover:border-primary/30 hover:text-primary"
                aria-label="Open test console"
                title="Open test console"
                @click="isTestConsoleOpen = true"
              >
                <PlayCircle class="h-4 w-4" />
              </button>
              <button
                type="button"
                :disabled="isSaving"
                class="inline-flex h-9 w-9 items-center justify-center rounded-[0.39rem] bg-primary text-black shadow-sm shadow-black/5 transition hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Save flow"
                title="Save flow"
                @click="saveFlow"
              >
                <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
                <Save v-else class="h-4 w-4" />
              </button>
            </div>

            <div
              v-if="isCanvasPanelOpen"
              class="absolute right-3 top-3 z-20 w-72 rounded-[0.39rem] border border-foreground/10 bg-background-card/95 p-2 shadow-xl shadow-black/10 backdrop-blur"
              @pointerdown.stop
            >
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs font-bold text-foreground">Flow nodes</p>
                  <p
                    class="mt-0.5 truncate text-[11px] font-semibold text-foreground/45"
                  >
                    Add or configure a guided step.
                  </p>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-[0.39rem] bg-primary text-black transition hover:bg-primary-accent"
                    aria-label="Add node"
                    title="Add node"
                    @click="isNodePaletteOpen = !isNodePaletteOpen"
                  >
                    <Plus class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.03] text-foreground/50 transition hover:text-primary"
                    aria-label="Close panel"
                    title="Close panel"
                    @click="isCanvasPanelOpen = false"
                  >
                    <X class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div
                v-if="isNodePaletteOpen"
                class="mt-2 space-y-1 border-t border-foreground/10 pt-2"
              >
                <button
                  v-for="node in addableNodeOptions"
                  :key="node.id"
                  type="button"
                  class="flex w-full items-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-background/45 p-2 text-left transition hover:border-primary/25 hover:bg-primary/[0.04]"
                  @click="addNodeFromPanel(node.id)"
                >
                  <span
                    :class="[
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] ring-1',
                      nodeIconClass(node.tone, node.enabled),
                    ]"
                  >
                    <component :is="node.icon" class="h-4 w-4" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span
                      class="block truncate text-xs font-bold text-foreground"
                    >
                      {{ node.label }}
                    </span>
                    <span
                      class="mt-0.5 block truncate text-[10px] font-semibold text-foreground/45"
                    >
                      {{ node.description }}
                    </span>
                  </span>
                </button>
              </div>
            </div>

            <button
              v-else
              type="button"
              class="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-[0.39rem] bg-primary text-black shadow-sm shadow-black/5 transition hover:bg-primary-accent"
              aria-label="Open node panel"
              title="Open node panel"
              @pointerdown.stop
              @click="
                isCanvasPanelOpen = true;
                isNodePaletteOpen = true;
              "
            >
              <Plus class="h-4 w-4" />
            </button>

            <div
              v-if="selectedAutomation"
              ref="canvasRef"
              :class="[
                'relative w-full touch-none overflow-visible px-3 pt-12 transition-[box-shadow] sm:pt-0',
                activeCanvasPan ? 'cursor-grabbing' : 'cursor-grab',
              ]"
              :style="canvasStyle"
              @pointerdown.self="startCanvasPan"
            >
              <svg
                class="pointer-events-none absolute left-0 top-0 z-0 overflow-visible"
                :width="canvasWidth"
                :height="canvasHeight"
                :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"
                aria-hidden="true"
              >
                <path
                  v-for="line in flowConnectorLines"
                  :key="line.id"
                  :d="line.d"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="square"
                  stroke-linejoin="miter"
                  stroke-width="1.5"
                  class="text-foreground/16"
                />
              </svg>

              <button
                v-for="node in flowNodes"
                :key="node.id"
                type="button"
                :aria-label="node.label"
                :title="`${node.label}: ${nodeSummary[node.id]}`"
                :style="nodePositionStyle(node.id)"
                :class="[
                  'group absolute z-10 flex h-[4.25rem] w-36 cursor-grab items-center gap-2 rounded-[0.39rem] px-2.5 pl-3 text-left shadow-sm shadow-black/5 ring-1 transition hover:-translate-y-0.5 active:cursor-grabbing',
                  nodeShellClass(node.tone, selectedNode === node.id),
                ]"
                @pointerdown.stop="startNodeDrag($event, node.id)"
                @click="handleNodeClick(node.id)"
              >
                <span
                  :class="[
                    'absolute inset-y-2 left-1 w-0.5 rounded-full',
                    nodeAccentClass(node.tone, node.enabled),
                  ]"
                  aria-hidden="true"
                />
                <span
                  :class="[
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] ring-1 transition group-hover:scale-105',
                    nodeIconClass(node.tone, node.enabled),
                  ]"
                >
                  <component :is="node.icon" class="h-4 w-4" />
                </span>
                <span class="min-w-0 flex-1">
                  <span
                    class="block truncate text-xs font-bold text-foreground"
                  >
                    {{ node.label }}
                  </span>
                  <span
                    class="mt-0.5 block truncate text-[10px] font-semibold text-foreground/45"
                  >
                    {{ nodeSummary[node.id] }}
                  </span>
                </span>
              </button>
            </div>

            <div
              v-else
              class="flex min-h-[28rem] flex-col items-center justify-center rounded-[0.39rem] border border-dashed border-foreground/10 bg-background/45 p-8 text-center"
            >
              <GitBranch class="h-10 w-10 text-foreground/30" />
              <h3 class="mt-4 text-sm font-bold text-foreground">
                No flow yet
              </h3>
              <p class="mt-2 max-w-sm text-xs leading-5 text-foreground/50">
                Create a channel automation to see the conversation path here.
              </p>
              <NuxtLink
                :to="`/dashboard/integrations/instagram/setup?accountId=${accountId}`"
                class="mt-5 inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-3 text-xs font-bold text-black"
                @click="stopCanvasInteractions"
              >
                <Zap class="h-3.5 w-3.5" />
                Create flow
              </NuxtLink>
            </div>
          </div>
        </section>
      </main>

      <Teleport to="body">
        <div
          v-if="isInspectorOpen"
          class="fixed inset-0 z-[260] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
          @click.self="isInspectorOpen = false"
        >
          <aside
            class="max-h-[86vh] w-full max-w-md overflow-y-auto rounded-[0.39rem] border border-foreground/10 bg-background-card shadow-xl shadow-black/20"
          >
            <div
              class="flex items-center gap-2 border-b border-foreground/10 p-3"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15"
              >
                <component
                  :is="selectedNodeMeta?.icon || Bot"
                  class="h-4 w-4"
                />
              </div>
              <div class="min-w-0">
                <h2 class="truncate text-sm font-bold text-foreground">
                  {{ selectedNodeMeta?.label || "Inspector" }}
                </h2>
                <p class="truncate text-xs font-medium text-foreground/45">
                  {{
                    selectedNodeMeta
                      ? nodeSummary[selectedNodeMeta.id]
                      : "Edit flow"
                  }}
                </p>
              </div>
              <button
                type="button"
                class="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.03] text-foreground/50 transition hover:text-primary"
                aria-label="Close inspector"
                @click="isInspectorOpen = false"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <div class="space-y-4 p-3">
              <div v-if="selectedNode === 'post'" class="space-y-3">
                <div
                  v-if="flowChannelType === 'whatsapp'"
                  class="rounded-[0.39rem] border border-emerald-400/15 bg-emerald-400/[0.05] p-3"
                >
                  <div class="flex items-center gap-2">
                    <span
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.39rem] bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/15"
                    >
                      <Smartphone class="h-4 w-4" />
                    </span>
                    <div class="min-w-0">
                      <p class="truncate text-xs font-bold text-foreground">
                        {{ postLabel(selectedPost) }}
                      </p>
                      <p class="mt-0.5 text-xs font-medium text-foreground/45">
                        Messages and keywords from this WhatsApp number start
                        the flow.
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  v-else-if="selectedPost"
                  class="overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background/45"
                >
                  <img
                    :src="`/api/instagram/${accountId}/posts/${selectedPost.id}/asset`"
                    :alt="postLabel(selectedPost)"
                    class="h-44 w-full object-cover"
                    loading="lazy"
                  />
                  <div class="p-3">
                    <p
                      class="line-clamp-3 text-xs font-semibold leading-5 text-foreground/65"
                    >
                      {{ postLabel(selectedPost) }}
                    </p>
                  </div>
                </div>
              </div>

              <div v-else-if="selectedNode === 'trigger'" class="space-y-3">
                <label class="block space-y-2">
                  <span class="text-xs font-bold text-foreground/55"
                    >Keywords</span
                  >
                  <input
                    v-model="form.keywords"
                    class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-sm font-semibold outline-none transition focus:border-primary/40"
                    :placeholder="
                      flowChannelType === 'whatsapp'
                        ? 'Leave empty for all messages'
                        : 'Leave empty for all comments'
                    "
                  />
                </label>
                <label
                  class="flex cursor-pointer items-center justify-between rounded-[0.39rem] border border-foreground/10 bg-background/45 p-3"
                >
                  <span>
                    <span class="block text-xs font-bold text-foreground"
                      >Flow active</span
                    >
                    <span class="mt-1 block text-xs text-foreground/45">{{
                      flowChannelType === "whatsapp"
                        ? "Watch matching messages."
                        : "Watch matching comments."
                    }}</span>
                  </span>
                  <input
                    v-model="form.isActive"
                    type="checkbox"
                    class="h-4 w-4 accent-primary"
                  />
                </label>
              </div>

              <div v-else-if="selectedNode === 'assistant'" class="space-y-3">
                <div>
                  <p class="text-xs font-bold text-foreground/55">
                    All assistants
                  </p>
                  <p
                    class="mt-1 text-xs font-medium leading-5 text-foreground/45"
                  >
                    Pick the bot that should write replies and continue the
                    conversation for this channel.
                  </p>
                </div>
                <div v-if="agents?.length" class="space-y-2">
                  <button
                    v-for="agent in agents"
                    :key="agent.id"
                    type="button"
                    :class="[
                      'flex w-full items-center gap-3 rounded-[0.39rem] border p-3 text-left transition',
                      form.chatbotId === agent.id
                        ? 'border-primary/35 bg-primary/[0.08] ring-1 ring-primary/15'
                        : 'border-foreground/10 bg-background/45 hover:border-primary/25 hover:bg-primary/[0.035]',
                    ]"
                    @click="form.chatbotId = agent.id"
                  >
                    <span
                      :class="[
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.39rem] ring-1',
                        form.chatbotId === agent.id
                          ? 'bg-primary/10 text-primary ring-primary/15'
                          : 'bg-foreground/5 text-foreground/45 ring-foreground/10',
                      ]"
                    >
                      <Bot class="h-4 w-4" />
                    </span>
                    <span class="min-w-0 flex-1">
                      <span
                        class="block truncate text-xs font-bold text-foreground"
                        >{{ agent.name }}</span
                      >
                      <span
                        class="mt-0.5 block text-[11px] font-semibold text-foreground/40"
                      >
                        {{
                          form.chatbotId === agent.id
                            ? "Selected bot"
                            : "Available bot"
                        }}
                      </span>
                    </span>
                  </button>
                </div>
                <div
                  v-else
                  class="rounded-[0.39rem] border border-dashed border-foreground/10 bg-background/45 p-4 text-center"
                >
                  <Bot class="mx-auto h-7 w-7 text-foreground/30" />
                  <p class="mt-3 text-xs font-bold text-foreground">
                    No assistants found
                  </p>
                  <p class="mt-1 text-xs leading-5 text-foreground/45">
                    Create an assistant before assigning this flow.
                  </p>
                </div>
              </div>

              <div v-else-if="selectedNode === 'skills'" class="space-y-3">
                <div
                  class="rounded-[0.39rem] border border-sky-400/15 bg-sky-400/[0.05] p-3"
                >
                  <p class="text-xs font-bold text-foreground">
                    Assistant skills
                  </p>
                  <p
                    class="mt-1 text-xs font-medium leading-5 text-foreground/50"
                  >
                    Skills change how this assistant behaves once the channel
                    trigger reaches the bot.
                  </p>
                </div>
                <div v-if="assistantSkills.length" class="space-y-2">
                  <div
                    v-for="skill in assistantSkills"
                    :key="skill"
                    class="flex items-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-background/45 p-2"
                  >
                    <span
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] bg-sky-400/10 text-sky-400 ring-1 ring-sky-400/15"
                    >
                      <BrainCircuit class="h-4 w-4" />
                    </span>
                    <span class="text-xs font-bold text-foreground">{{
                      formatConfigLabel(skill)
                    }}</span>
                  </div>
                </div>
                <div
                  v-else
                  class="rounded-[0.39rem] border border-dashed border-foreground/10 bg-background/45 p-4 text-center"
                >
                  <BrainCircuit class="mx-auto h-7 w-7 text-foreground/30" />
                  <p class="mt-3 text-xs font-bold text-foreground">
                    No skills connected
                  </p>
                  <p class="mt-1 text-xs leading-5 text-foreground/45">
                    Add skills from Assistant Skills to show them on this
                    canvas.
                  </p>
                </div>
              </div>

              <div v-else-if="selectedNode === 'tools'" class="space-y-3">
                <div
                  class="rounded-[0.39rem] border border-amber-400/15 bg-amber-400/[0.05] p-3"
                >
                  <p class="text-xs font-bold text-foreground">
                    Assistant tools
                  </p>
                  <p
                    class="mt-1 text-xs font-medium leading-5 text-foreground/50"
                  >
                    Tools are available while the assistant handles this channel
                    conversation.
                  </p>
                </div>
                <div v-if="assistantTools.length" class="space-y-2">
                  <div
                    v-for="tool in assistantTools"
                    :key="tool"
                    class="flex items-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-background/45 p-2"
                  >
                    <span
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/15"
                    >
                      <Wrench class="h-4 w-4" />
                    </span>
                    <span class="text-xs font-bold text-foreground">{{
                      formatConfigLabel(tool)
                    }}</span>
                  </div>
                </div>
                <div
                  v-else
                  class="rounded-[0.39rem] border border-dashed border-foreground/10 bg-background/45 p-4 text-center"
                >
                  <Wrench class="mx-auto h-7 w-7 text-foreground/30" />
                  <p class="mt-3 text-xs font-bold text-foreground">
                    No tools connected
                  </p>
                  <p class="mt-1 text-xs leading-5 text-foreground/45">
                    Enable tools from Assistant Tools to show them on this
                    canvas.
                  </p>
                </div>
              </div>

              <div v-else-if="selectedNode === 'publicReply'" class="space-y-3">
                <label
                  class="flex cursor-pointer items-start gap-3 rounded-[0.39rem] border border-foreground/10 bg-background/45 p-3"
                  :class="!canPublicComment ? 'opacity-50' : ''"
                >
                  <input
                    v-model="form.replyInComment"
                    :disabled="!canPublicComment"
                    type="checkbox"
                    class="mt-1 h-4 w-4 accent-primary"
                  />
                  <span>
                    <span class="block text-xs font-bold text-foreground"
                      >Reply publicly</span
                    >
                    <span
                      class="mt-1 block text-xs leading-5 text-foreground/45"
                    >
                      Keep public replies short and avoid personal details.
                    </span>
                  </span>
                </label>
              </div>

              <div v-else-if="selectedNode === 'dmReply'" class="space-y-3">
                <label
                  class="flex cursor-pointer items-start gap-3 rounded-[0.39rem] border border-foreground/10 bg-background/45 p-3"
                >
                  <input
                    v-model="form.replyInDm"
                    type="checkbox"
                    class="mt-1 h-4 w-4 accent-primary"
                  />
                  <span>
                    <span class="block text-xs font-bold text-foreground"
                      >Send first DM</span
                    >
                    <span
                      class="mt-1 block text-xs leading-5 text-foreground/45"
                    >
                      Start the private conversation after a matching comment.
                    </span>
                  </span>
                </label>
                <label class="block space-y-2">
                  <span class="text-xs font-bold text-foreground/55"
                    >DM template</span
                  >
                  <textarea
                    v-model="form.dmTemplate"
                    rows="5"
                    class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 py-2 text-sm font-semibold outline-none transition focus:border-primary/40"
                    placeholder="Leave empty for AI-generated DMs. Use {{comment}} for the comment text."
                  />
                </label>
              </div>

              <div
                v-else-if="selectedNode === 'conversation'"
                class="space-y-3"
              >
                <div
                  class="rounded-[0.39rem] border border-primary/15 bg-primary/5 p-3"
                >
                  <p class="text-xs font-bold text-foreground">
                    Continued DM conversation
                  </p>
                  <p
                    class="mt-2 text-xs font-medium leading-5 text-foreground/55"
                  >
                    If a customer replies after the first DM, the same assistant
                    continues the conversation with context from the trigger and
                    recent messages.
                  </p>
                </div>
                <NuxtLink
                  to="/dashboard/conversations"
                  class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.03] px-3 text-xs font-bold text-foreground/60 transition hover:border-primary/30 hover:text-primary"
                >
                  <MessageCircle class="h-3.5 w-3.5" />
                  Open Inbox
                </NuxtLink>
              </div>

              <div v-else class="space-y-3">
                <div class="grid grid-cols-2 gap-2">
                  <div
                    class="rounded-[0.39rem] border border-foreground/10 bg-background/45 p-3"
                  >
                    <p class="text-xs font-bold text-foreground/40">Sent</p>
                    <p class="mt-1 text-xl font-bold text-foreground">
                      {{ sentCount }}
                    </p>
                  </div>
                  <div
                    class="rounded-[0.39rem] border border-foreground/10 bg-background/45 p-3"
                  >
                    <p class="text-xs font-bold text-foreground/40">Failed</p>
                    <p class="mt-1 text-xl font-bold text-foreground">
                      {{ failedCount }}
                    </p>
                  </div>
                  <div
                    class="rounded-[0.39rem] border border-foreground/10 bg-background/45 p-3"
                  >
                    <p class="text-xs font-bold text-foreground/40">Comments</p>
                    <p class="mt-1 text-xl font-bold text-foreground">
                      {{ commentReplyCount }}
                    </p>
                  </div>
                  <div
                    class="rounded-[0.39rem] border border-foreground/10 bg-background/45 p-3"
                  >
                    <p class="text-xs font-bold text-foreground/40">DMs</p>
                    <p class="mt-1 text-xl font-bold text-foreground">
                      {{ dmReplyCount + continuedDmCount }}
                    </p>
                  </div>
                </div>
                <p class="text-xs font-semibold text-foreground/45">
                  Last delivery: {{ formatDate(latestJobTime) }}
                </p>
              </div>

              <div class="border-t border-foreground/10 pt-3">
                <button
                  type="button"
                  :disabled="isSaving"
                  class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-3 text-xs font-bold text-black transition hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-60"
                  @click="saveFlow"
                >
                  <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
                  <Save v-else class="h-4 w-4" />
                  Save flow
                </button>
                <button
                  type="button"
                  class="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[0.39rem] border border-red-400/20 bg-red-400/10 px-3 text-xs font-bold text-red-400 transition hover:bg-red-400/15"
                  @click="disconnect"
                >
                  <Trash2 class="h-4 w-4" />
                  Disconnect account
                </button>
              </div>
            </div>
          </aside>
        </div>
      </Teleport>

      <Teleport to="body">
        <div
          v-if="isTestConsoleOpen"
          class="fixed inset-0 z-[250] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
          @click.self="isTestConsoleOpen = false"
        >
          <section
            class="max-h-[86vh] w-full max-w-4xl overflow-y-auto rounded-[0.39rem] border border-foreground/10 bg-background-card shadow-xl shadow-black/20"
          >
            <div
              class="flex flex-col gap-3 border-b border-foreground/10 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 class="text-sm font-bold text-foreground">Test console</h2>
                <p class="mt-0.5 text-xs font-medium text-foreground/45">
                  Check recent comments, deliveries, and continued DM activity.
                </p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  :disabled="isTesting || !form.postId"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-[0.39rem] border border-primary/20 bg-primary/10 text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Run test"
                  @click="testFlow"
                >
                  <Loader2 v-if="isTesting" class="h-3.5 w-3.5 animate-spin" />
                  <RefreshCcw v-else class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.03] text-foreground/50 transition hover:text-primary"
                  aria-label="Close test console"
                  @click="isTestConsoleOpen = false"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>

            <div class="grid gap-3 p-3 lg:grid-cols-2">
              <div class="space-y-2">
                <p class="text-xs font-bold text-foreground/45">
                  Recent comments
                </p>
                <div v-if="selectedComments.length" class="space-y-2">
                  <div
                    v-for="comment in selectedComments.slice(0, 5)"
                    :key="comment.id"
                    class="rounded-[0.39rem] border border-foreground/10 bg-background/45 p-3"
                  >
                    <p class="text-xs font-bold text-foreground">
                      {{
                        comment.commenter_username
                          ? `@${comment.commenter_username}`
                          : "Instagram user"
                      }}
                    </p>
                    <p
                      class="mt-1 text-xs font-medium leading-5 text-foreground/60"
                    >
                      {{ comment.comment_text }}
                    </p>
                  </div>
                </div>
                <div
                  v-else
                  class="rounded-[0.39rem] border border-dashed border-foreground/10 bg-background/45 p-5 text-center"
                >
                  <MessageCircle class="mx-auto h-7 w-7 text-foreground/30" />
                  <p class="mt-3 text-xs font-bold text-foreground">
                    No comments saved yet
                  </p>
                  <p class="mt-1 text-xs text-foreground/45">
                    Run a test to check recent comments.
                  </p>
                </div>
              </div>

              <div class="space-y-2">
                <p class="text-xs font-bold text-foreground/45">Deliveries</p>
                <div v-if="selectedJobs.length" class="space-y-2">
                  <div
                    v-for="job in selectedJobs.slice(0, 5)"
                    :key="job.id"
                    class="rounded-[0.39rem] border border-foreground/10 bg-background/45 p-3"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <p class="text-xs font-bold text-foreground">
                        {{ deliveryActionLabel(job.payload?.action_type) }}
                      </p>
                      <span
                        :class="[
                          'rounded-full px-2 py-0.5 text-[10px] font-bold',
                          job.status === 'sent'
                            ? 'bg-emerald-400/10 text-emerald-500'
                            : job.status === 'failed'
                              ? 'bg-red-400/10 text-red-400'
                              : 'bg-foreground/5 text-foreground/45',
                        ]"
                      >
                        {{ job.status || "Queued" }}
                      </span>
                    </div>
                    <p class="mt-1 text-xs font-medium text-foreground/45">
                      {{
                        formatDate(
                          job.updated_at || job.created_at || job.sent_at,
                        )
                      }}
                    </p>
                    <p
                      v-if="job.error"
                      class="mt-2 text-xs font-bold text-red-400"
                    >
                      {{ job.error }}
                    </p>
                  </div>
                </div>
                <div
                  v-else
                  class="rounded-[0.39rem] border border-dashed border-foreground/10 bg-background/45 p-5 text-center"
                >
                  <PlayCircle class="mx-auto h-7 w-7 text-foreground/30" />
                  <p class="mt-3 text-xs font-bold text-foreground">
                    No deliveries yet
                  </p>
                  <p class="mt-1 text-xs text-foreground/45">
                    Sent comments and DMs will appear here.
                  </p>
                </div>
              </div>
            </div>

            <div
              v-if="testResult"
              class="border-t border-foreground/10 p-3 text-xs font-bold text-foreground/55"
            >
              Test checked {{ testResult.found || 0 }} comment{{
                testResult.found === 1 ? "" : "s"
              }}, processed {{ testResult.processed || 0 }}, sent
              {{ testResult.sent || 0 }}, failed {{ testResult.failed || 0 }}.
            </div>
          </section>
        </div>
      </Teleport>
    </div>

    <div
      v-else
      class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-10 text-center shadow-sm shadow-black/5"
    >
      <Instagram class="mx-auto h-10 w-10 text-foreground/30" />
      <h2 class="mt-4 text-lg font-bold text-foreground">
        Instagram account not found
      </h2>
      <NuxtLink
        to="/dashboard/integrations/instagram"
        class="mt-6 inline-flex rounded-[0.39rem] bg-primary px-5 py-3 text-xs font-bold text-black"
      >
        Back to Instagram
      </NuxtLink>
    </div>
  </div>
</template>
