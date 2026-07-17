<script setup lang="ts">
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Instagram,
  Loader2,
  MessageCircle,
  MessageSquareText,
  PlayCircle,
  RefreshCcw,
  Save,
  Send,
  Trash2,
} from "lucide-vue-next";

definePageMeta({ middleware: "auth", layout: "dashboard" });
useHead({ title: "Instagram account | ReplySuite" });

const route = useRoute();
const accountId = route.params.id as string;
const { canUseInstagramWorkflow } = usePlanAccess();
const supabase = useSupabaseClient();
const notify = useNotify();
const isLocked = computed(() => !canUseInstagramWorkflow.value);
const canPublicComment = canUseInstagramWorkflow;
const isSaving = ref(false);
const isTesting = ref(false);
const isContinuingSessionId = ref("");
const testResult = ref<any>(null);
const messagesPage = ref(1);
const messagesPerPage = ref(10);
const commentsPage = ref(1);
const commentsPerPage = ref(8);

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

const {
  data: accounts,
  pending: isLoading,
  refresh,
} = await useAsyncData(
  `instagram-account-${accountId}`,
  async () => {
    return await instagramApiFetch<any[]>("/api/instagram/accounts");
  },
  { server: false, default: () => [] },
);

const {
  data: messageFeed,
  pending: isLoadingMessages,
  refresh: refreshMessages,
} = await useAsyncData(
  `instagram-account-messages-${accountId}`,
  async () => {
    return await instagramApiFetch<any>(
      `/api/instagram/${accountId}/messages`,
      {
        query: {
          page: messagesPage.value,
          perPage: messagesPerPage.value,
        },
      },
    );
  },
  {
    server: false,
    default: () => ({
      messages: [],
      page: 1,
      perPage: 10,
      total: 0,
      totalPages: 1,
    }),
    watch: [messagesPage, messagesPerPage],
  },
);

const account = computed(
  () =>
    (accounts.value || []).find((item: any) => item.id === accountId) || null,
);
const post = computed(
  () =>
    (account.value?.posts || []).find((item: any) => item.triggers?.length) ||
    account.value?.posts?.[0] ||
    null,
);
const trigger = computed(() => post.value?.triggers?.[0] || null);
const comments = computed(() => post.value?.comments || []);

const form = reactive({
  triggerId: "",
  postId: "",
  chatbotId: "",
  keywords: "",
  replyInComment: false,
  replyInDm: true,
  useBotForDm: true,
  dmTemplate: "",
  isActive: true,
});

const { data: agents } = await useAsyncData(
  "instagram-config-agents",
  async () => {
    const { data } = await supabase
      .from("chatbots")
      .select("id, name")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    return data || [];
  },
);

watch(
  [account, post, trigger],
  () => {
    if (!post.value || !trigger.value) return;
    form.triggerId = trigger.value.id;
    form.postId = post.value.id;
    form.chatbotId = trigger.value.chatbot_id || agents.value?.[0]?.id || "";
    form.keywords = Array.isArray(trigger.value.keywords)
      ? trigger.value.keywords.join(", ")
      : "";
    form.replyInComment = Boolean(
      trigger.value.reply_in_comment && canPublicComment.value,
    );
    form.replyInDm = Boolean(trigger.value.reply_in_dm);
    form.dmTemplate = trigger.value.dm_template || "";
    form.useBotForDm = !form.dmTemplate;
    form.isActive = Boolean(trigger.value.is_active);
  },
  { immediate: true },
);

watch(canPublicComment, (allowed) => {
  if (!allowed) form.replyInComment = false;
});

watch(
  () => form.useBotForDm,
  (useBot) => {
    if (useBot) form.dmTemplate = "";
  },
);

watch(messagesPerPage, () => {
  messagesPage.value = 1;
});

watch(commentsPerPage, () => {
  commentsPage.value = 1;
});

const save = async () => {
  if (!form.triggerId || !form.postId || !form.chatbotId) {
    notify.warn("This account needs a post trigger and assistant mapping.");
    return;
  }
  if (!form.replyInComment && !form.replyInDm) {
    notify.warn("Enable at least one reply mode.");
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
        dmTemplate: form.useBotForDm ? "" : form.dmTemplate,
        isActive: form.isActive,
      },
    });
    notify.success(
      "Instagram automation updated. Testing matching comments now.",
    );
    await refresh();
    await refreshMessages();
    await testRule();
  } catch (error: any) {
    notify.error(
      error?.data?.statusMessage ||
        error?.message ||
        "Failed to update Instagram automation.",
    );
  } finally {
    isSaving.value = false;
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

const testRule = async () => {
  if (!form.postId) {
    notify.warn("No selected post to test.");
    return;
  }

  isTesting.value = true;
  testResult.value = null;
  try {
    const response = await instagramApiFetch<any>(
      `/api/instagram/${accountId}/sync-comments`,
      {
        method: "POST",
        body: { postId: form.postId },
      },
    );
    testResult.value = response;
    notify.success(
      `Checked ${response?.found || 0} comment${response?.found === 1 ? "" : "s"} on this post.`,
    );
    await refresh();
    await refreshMessages();
  } catch (error: any) {
    notify.error(
      error?.data?.statusMessage ||
        error?.message ||
        "Failed to test Instagram rule.",
    );
  } finally {
    isTesting.value = false;
  }
};

const paginatedComments = computed(() => {
  const start = (commentsPage.value - 1) * commentsPerPage.value;
  return comments.value.slice(start, start + commentsPerPage.value);
});
const commentsTotal = computed(() => comments.value.length);
const commentsTotalPages = computed(() =>
  Math.max(1, Math.ceil(commentsTotal.value / commentsPerPage.value)),
);
const commentsShowingStart = computed(() =>
  commentsTotal.value
    ? (commentsPage.value - 1) * commentsPerPage.value + 1
    : 0,
);
const commentsShowingEnd = computed(() =>
  Math.min(commentsPage.value * commentsPerPage.value, commentsTotal.value),
);
const setCommentsPage = (page: number) => {
  commentsPage.value = Math.min(Math.max(1, page), commentsTotalPages.value);
};

const instagramMessages = computed(() => messageFeed.value?.messages || []);
const messagesTotal = computed(() => Number(messageFeed.value?.total || 0));
const messagesTotalPages = computed(() =>
  Math.max(1, Number(messageFeed.value?.totalPages || 1)),
);
const messagesShowingStart = computed(() =>
  messagesTotal.value
    ? (messagesPage.value - 1) * messagesPerPage.value + 1
    : 0,
);
const messagesShowingEnd = computed(() =>
  Math.min(messagesPage.value * messagesPerPage.value, messagesTotal.value),
);

const setMessagesPage = (page: number) => {
  messagesPage.value = Math.min(Math.max(1, page), messagesTotalPages.value);
};

const useBotInsteadOfDefaultMessage = () => {
  form.useBotForDm = true;
  form.dmTemplate = "";
  notify.success("The selected assistant will write Instagram DMs now.");
};

const allowBotToContinue = async (sessionId: string) => {
  if (!sessionId) return;
  isContinuingSessionId.value = sessionId;
  try {
    await instagramApiFetch(`/api/conversations/${sessionId}/takeover`, {
      method: "POST",
      body: { enabled: false },
    });
    notify.success("Bot continuation enabled for this Instagram DM.");
    await refreshMessages();
  } catch (error: any) {
    notify.error(
      error?.data?.statusMessage ||
        error?.message ||
        "Failed to allow the bot to continue.",
    );
  } finally {
    isContinuingSessionId.value = "";
  }
};

const formatMessageTime = (value?: string) => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
};

const messageRoleLabel = (role?: string) => {
  if (role === "assistant") return "Bot";
  if (role === "user") return "User";
  return role || "Message";
};

const jobStats = computed(() => {
  const jobs = account.value?.jobs || [];
  return {
    sent: jobs.filter((job: any) => job.status === "sent").length,
    failed: jobs.filter((job: any) => job.status === "failed").length,
    commentReplies: jobs.filter(
      (job: any) => job.payload?.action_type === "comment_reply",
    ).length,
    dmReplies: jobs.filter(
      (job: any) => job.payload?.action_type === "comment_to_dm",
    ).length,
  };
});

const deliveryActionLabel = (value?: string) => {
  if (value === "comment_reply") return "Comment reply";
  if (value === "comment_to_dm") return "Comment-to-DM";
  return "Delivery";
};
</script>

<template>
  <WhatsAppUpgradeGate
    v-if="isLocked"
    title="Upgrade to manage Instagram"
    description="Instagram management requires a plan with Instagram automation access."
    back-to="/dashboard"
    back-label="Back to dashboard"
  />

  <div v-else class="mx-auto max-w-7xl space-y-5 pb-20 pt-3 lg:pb-12">
    <section
      class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6"
    >
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div class="min-w-0">
          <NuxtLink
            to="/dashboard/integrations/instagram"
            class="dashboard-back-link group mb-3 inline-flex"
          >
            <ArrowLeft
              class="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1"
            />
            Back to Instagram
          </NuxtLink>
          <div v-if="account" class="flex min-w-0 items-center gap-3">
            <img
              :src="`/api/instagram/${account.id}/profile-picture`"
              alt=""
              class="h-12 w-12 rounded-[0.39rem] border border-primary/15 bg-primary/10 object-cover"
            />
            <div class="min-w-0">
              <p class="dashboard-eyebrow text-primary/80">Instagram account</p>
              <h1 class="dashboard-section-title mt-2 truncate">
                @{{ account.username }}
              </h1>
              <p class="mt-1 text-sm text-foreground/55">
                Manage post comment replies and comment-to-DM automation.
              </p>
            </div>
          </div>
          <div v-else>
            <p class="dashboard-eyebrow text-primary/80">Instagram account</p>
            <h1 class="dashboard-section-title mt-2">Configuration</h1>
          </div>
        </div>
        <div v-if="account" class="flex flex-wrap items-center gap-2">
          <NuxtLink
            :to="`/dashboard/flows/${account.id}?channel=instagram`"
            class="inline-flex items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-4 py-2.5 text-xs font-bold text-black shadow-sm shadow-primary/10 transition hover:bg-primary-accent"
          >
            <GitBranch class="h-4 w-4" /> Flow
          </NuxtLink>
          <button
            @click="disconnect"
            class="inline-flex items-center justify-center gap-2 rounded-[0.39rem] border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-xs font-bold text-red-400 transition hover:bg-red-400 hover:text-white"
          >
            <Trash2 class="h-4 w-4" /> Disconnect
          </button>
        </div>
      </div>
    </section>

    <div v-if="isLoading" class="space-y-3">
      <div
        class="h-24 animate-pulse rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
      />
      <div
        class="h-80 animate-pulse rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
      />
    </div>

    <main v-else-if="account" class="space-y-5">
      <div class="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div class="space-y-5">
          <section
            class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6"
          >
            <div class="mb-5 flex items-center gap-3">
              <div
                class="flex h-11 w-11 items-center justify-center rounded-[0.39rem] border border-primary/15 bg-primary/10"
              >
                <Bot class="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 class="text-lg font-bold tracking-tight text-foreground">
                  Post automation
                </h2>
                <p class="text-xs text-foreground/50">
                  Configure how this specific Instagram post responds to
                  comments.
                </p>
              </div>
            </div>

            <div v-if="post && trigger" class="space-y-5">
              <div
                class="flex gap-4 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4"
              >
                <div
                  class="relative h-24 w-24 shrink-0 overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.04]"
                >
                  <img
                    :src="`/api/instagram/${account.id}/posts/${post.id}/asset`"
                    :alt="post.caption || 'Instagram post asset'"
                    class="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <span
                    v-if="post.media_type"
                    class="absolute bottom-1.5 left-1.5 rounded-[0.39rem] bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white"
                    >{{ post.media_type }}</span
                  >
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-bold text-foreground/40">Post</p>
                  <a
                    v-if="post.permalink"
                    :href="post.permalink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mt-2 inline-block text-xs font-bold text-primary hover:underline"
                    >Open on Instagram</a
                  >
                  <p
                    v-if="post.caption"
                    class="mt-3 line-clamp-3 text-xs leading-5 text-foreground/55"
                  >
                    {{ post.caption }}
                  </p>
                </div>
              </div>

              <label class="block space-y-2">
                <span class="text-xs font-bold text-foreground/50"
                  >Assistant</span
                >
                <select
                  v-model="form.chatbotId"
                  class="w-full rounded-[0.39rem] border border-foreground/10 bg-background-card/45 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-primary/50"
                >
                  <option
                    v-for="agent in agents"
                    :key="agent.id"
                    :value="agent.id"
                  >
                    {{ agent.name }}
                  </option>
                </select>
              </label>

              <label class="block space-y-2">
                <span class="text-xs font-bold text-foreground/50"
                  >Keywords</span
                >
                <input
                  v-model="form.keywords"
                  class="w-full rounded-[0.39rem] border border-foreground/10 bg-background-card/45 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-primary/50"
                  placeholder="Leave empty for all comments"
                />
              </label>

              <div class="grid gap-3 sm:grid-cols-2">
                <label
                  class="flex cursor-pointer items-start gap-3 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4"
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
                      >Comment reply</span
                    >
                    <span
                      class="mt-1 block text-xs leading-5 text-foreground/50"
                      >Reply publicly under matching comments.</span
                    >
                  </span>
                </label>
                <label
                  class="flex cursor-pointer items-start gap-3 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4"
                >
                  <input
                    v-model="form.replyInDm"
                    type="checkbox"
                    class="mt-1 h-4 w-4 accent-primary"
                  />
                  <span>
                    <span class="block text-xs font-bold text-foreground"
                      >Comment-to-DM</span
                    >
                    <span
                      class="mt-1 block text-xs leading-5 text-foreground/50"
                      >Send a private reply to the commenter.</span
                    >
                  </span>
                </label>
              </div>

              <div
                class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4"
              >
                <div
                  class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <label class="flex cursor-pointer items-start gap-3">
                    <input
                      v-model="form.useBotForDm"
                      type="checkbox"
                      class="mt-1 h-4 w-4 accent-primary"
                    />
                    <span>
                      <span class="block text-xs font-bold text-foreground"
                        >Bot continues in Instagram DMs</span
                      >
                      <span
                        class="mt-1 block max-w-xl text-xs leading-5 text-foreground/50"
                      >
                        Use the selected assistant for comment-to-DM and future
                        DM replies instead of a fixed default message.
                      </span>
                    </span>
                  </label>
                  <button
                    v-if="form.dmTemplate"
                    type="button"
                    @click="useBotInsteadOfDefaultMessage"
                    class="inline-flex items-center justify-center gap-2 rounded-[0.39rem] border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/15"
                  >
                    <PlayCircle class="h-3.5 w-3.5" />
                    Use bot instead
                  </button>
                </div>
              </div>

              <label
                class="block space-y-2"
                :class="form.useBotForDm ? 'opacity-55' : ''"
              >
                <span class="text-xs font-bold text-foreground/50"
                  >Default DM message</span
                >
                <textarea
                  v-model="form.dmTemplate"
                  :disabled="form.useBotForDm"
                  rows="4"
                  class="w-full rounded-[0.39rem] border border-foreground/10 bg-background-card/45 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="Only use this when you want a fixed message. Leave disabled for bot-generated DMs."
                />
                <span class="block text-xs leading-5 text-foreground/45">
                  When bot continuation is enabled, ReplySuite ignores this
                  default message and lets the selected assistant write replies.
                </span>
              </label>

              <label
                class="flex cursor-pointer items-center gap-3 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4"
              >
                <input
                  v-model="form.isActive"
                  type="checkbox"
                  class="h-4 w-4 accent-primary"
                />
                <span class="text-xs font-bold text-foreground"
                  >Automation active</span
                >
              </label>

              <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  @click="testRule"
                  :disabled="isTesting || !form.postId"
                  class="inline-flex items-center justify-center gap-3 rounded-[0.39rem] border border-primary/20 bg-primary/10 px-5 py-3 text-xs font-bold text-primary transition-all hover:bg-primary/15 disabled:opacity-50"
                >
                  <Loader2 v-if="isTesting" class="h-4 w-4 animate-spin" />
                  <RefreshCcw v-else class="h-4 w-4" />
                  Test comments
                </button>
                <button
                  @click="save"
                  :disabled="isSaving"
                  class="inline-flex items-center justify-center gap-3 rounded-[0.39rem] bg-primary px-6 py-3 text-xs font-bold text-black shadow-sm shadow-primary/10 transition-all hover:bg-primary-accent disabled:opacity-50"
                >
                  <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
                  <Save v-else class="h-4 w-4" />
                  Save automation
                </button>
              </div>

              <div
                v-if="testResult"
                class="space-y-3 rounded-[0.39rem] border border-primary/15 bg-primary/5 p-4 text-xs font-bold leading-5 text-foreground/60"
              >
                <p>
                  Test checked {{ testResult.found || 0 }} comment{{
                    testResult.found === 1 ? "" : "s"
                  }}, processed {{ testResult.processed || 0 }}, sent
                  {{ testResult.sent || 0 }}, failed
                  {{ testResult.failed || 0 }}.
                </p>
                <div v-if="testResult.deliveries?.length" class="space-y-2">
                  <div
                    v-for="delivery in testResult.deliveries"
                    :key="delivery.id"
                    class="rounded-[0.39rem] border border-foreground/10 bg-background/70 p-3"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <span class="font-bold text-foreground/45">{{
                        deliveryActionLabel(delivery.action)
                      }}</span>
                      <span
                        class="rounded-full px-2 py-1 text-xs font-bold"
                        :class="
                          delivery.status === 'sent'
                            ? 'bg-emerald-400/10 text-emerald-500'
                            : 'bg-red-400/10 text-red-500'
                        "
                        >{{ delivery.status }}</span
                      >
                    </div>
                    <p v-if="delivery.error" class="mt-2 text-red-500">
                      {{ delivery.error }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else
              class="rounded-[0.39rem] border border-dashed border-foreground/10 p-6 text-center"
            >
              <MessageCircle class="mx-auto h-8 w-8 text-foreground/35" />
              <h3 class="mt-4 text-sm font-bold text-foreground">
                No post rule found
              </h3>
              <p class="mt-2 text-xs text-foreground/50">
                Create a post rule from setup to continue.
              </p>
            </div>
          </section>

          <section
            class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6"
          >
            <div
              class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 class="text-lg font-bold tracking-tight text-foreground">
                  Instagram DM messages
                </h2>
                <p class="text-xs text-foreground/50">
                  Recent Instagram conversation messages for this account.
                </p>
              </div>
              <button
                @click="refreshMessages()"
                :disabled="isLoadingMessages"
                class="inline-flex items-center justify-center gap-2 rounded-[0.39rem] border border-primary/20 bg-primary/10 px-4 py-2.5 text-xs font-bold text-primary transition-all hover:bg-primary/15 disabled:opacity-50"
              >
                <Loader2
                  v-if="isLoadingMessages"
                  class="h-4 w-4 animate-spin"
                />
                <RefreshCcw v-else class="h-4 w-4" />
                Refresh messages
              </button>
            </div>

            <div
              v-if="instagramMessages.length"
              class="overflow-hidden rounded-[0.39rem] border border-foreground/10"
            >
              <div class="overflow-x-auto">
                <table
                  class="min-w-full divide-y divide-foreground/10 text-left"
                >
                  <thead class="bg-foreground/[0.03]">
                    <tr>
                      <th
                        class="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/40"
                      >
                        Contact
                      </th>
                      <th
                        class="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/40"
                      >
                        Message
                      </th>
                      <th
                        class="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/40"
                      >
                        Assistant
                      </th>
                      <th
                        class="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/40"
                      >
                        Time
                      </th>
                      <th
                        class="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/40"
                      >
                        Bot control
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    class="divide-y divide-foreground/10 bg-background-card/20"
                  >
                    <tr
                      v-for="message in instagramMessages"
                      :key="message.id"
                      class="transition hover:bg-foreground/[0.025]"
                    >
                      <td class="whitespace-nowrap px-4 py-3 align-top">
                        <p class="text-xs font-bold text-foreground">
                          {{ message.contact }}
                        </p>
                        <span
                          class="mt-1 inline-flex rounded-[0.39rem] px-2 py-0.5 text-[10px] font-bold"
                          :class="
                            message.role === 'assistant'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-foreground/5 text-foreground/45'
                          "
                        >
                          {{ messageRoleLabel(message.role) }}
                        </span>
                      </td>
                      <td class="min-w-[260px] px-4 py-3 align-top">
                        <p
                          class="line-clamp-2 text-xs font-semibold leading-5 text-foreground/70"
                        >
                          {{ message.content || "—" }}
                        </p>
                      </td>
                      <td class="whitespace-nowrap px-4 py-3 align-top">
                        <p class="text-xs font-bold text-foreground/60">
                          {{ message.assistantName }}
                        </p>
                        <p
                          class="mt-1 text-[10px] font-bold text-foreground/35"
                        >
                          {{ message.source }}
                        </p>
                      </td>
                      <td class="whitespace-nowrap px-4 py-3 align-top">
                        <p class="text-xs font-bold text-foreground/45">
                          {{ formatMessageTime(message.createdAt) }}
                        </p>
                      </td>
                      <td
                        class="whitespace-nowrap px-4 py-3 text-right align-top"
                      >
                        <button
                          v-if="message.botPaused"
                          @click="allowBotToContinue(message.sessionId)"
                          :disabled="
                            isContinuingSessionId === message.sessionId
                          "
                          class="inline-flex items-center justify-center gap-2 rounded-[0.39rem] border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-500 transition hover:bg-emerald-400/15 disabled:opacity-50"
                        >
                          <Loader2
                            v-if="isContinuingSessionId === message.sessionId"
                            class="h-3.5 w-3.5 animate-spin"
                          />
                          <PlayCircle v-else class="h-3.5 w-3.5" />
                          Allow bot to continue
                        </button>
                        <span
                          v-else
                          class="inline-flex items-center gap-1.5 rounded-[0.39rem] bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-500"
                        >
                          <CheckCircle2 class="h-3.5 w-3.5" />
                          Bot active
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div
                class="flex flex-col gap-3 border-t border-foreground/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p class="text-xs font-bold text-foreground/45">
                  Showing {{ messagesShowingStart }}-{{ messagesShowingEnd }} of
                  {{ messagesTotal }}
                </p>
                <div class="flex items-center gap-2">
                  <select
                    v-model.number="messagesPerPage"
                    class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 px-3 py-2 text-xs font-bold outline-none"
                  >
                    <option :value="5">5 / page</option>
                    <option :value="10">10 / page</option>
                    <option :value="20">20 / page</option>
                  </select>
                  <button
                    @click="setMessagesPage(messagesPage - 1)"
                    :disabled="messagesPage <= 1"
                    class="inline-flex items-center gap-1 rounded-[0.39rem] border border-foreground/10 px-3 py-2 text-xs font-bold text-foreground/60 disabled:opacity-40"
                  >
                    <ChevronLeft class="h-3.5 w-3.5" />
                    Previous
                  </button>
                  <span class="text-xs font-bold text-foreground/45">
                    Page {{ messagesPage }} / {{ messagesTotalPages }}
                  </span>
                  <button
                    @click="setMessagesPage(messagesPage + 1)"
                    :disabled="messagesPage >= messagesTotalPages"
                    class="inline-flex items-center gap-1 rounded-[0.39rem] border border-foreground/10 px-3 py-2 text-xs font-bold text-foreground/60 disabled:opacity-40"
                  >
                    Next
                    <ChevronRight class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div
              v-else
              class="rounded-[0.39rem] border border-dashed border-foreground/10 bg-background-card/45 p-5 text-center"
            >
              <MessageSquareText class="mx-auto h-7 w-7 text-foreground/30" />
              <p class="mt-3 text-sm font-bold text-foreground">
                No Instagram DM messages yet
              </p>
              <p class="mt-1 text-xs leading-5 text-foreground/50">
                When people reply in DM, ReplySuite will show the conversation
                messages here.
              </p>
            </div>
          </section>
        </div>

        <aside class="space-y-4">
          <div
            class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5"
          >
            <h3 class="text-xs font-bold text-foreground">Delivery stats</h3>
            <div class="mt-5 grid grid-cols-2 gap-3">
              <div
                class="rounded-[0.39rem] border border-foreground/10 bg-background p-4"
              >
                <CheckCircle2 class="mb-3 h-5 w-5 text-emerald-400" />
                <p class="text-xs font-bold text-foreground/40">Sent</p>
                <p class="mt-1 text-xl font-bold">{{ jobStats.sent }}</p>
              </div>
              <div
                class="rounded-[0.39rem] border border-foreground/10 bg-background p-4"
              >
                <MessageCircle class="mb-3 h-5 w-5 text-primary" />
                <p class="text-xs font-bold text-foreground/40">Comments</p>
                <p class="mt-1 text-xl font-bold">
                  {{ jobStats.commentReplies }}
                </p>
              </div>
              <div
                class="rounded-[0.39rem] border border-foreground/10 bg-background p-4"
              >
                <Send class="mb-3 h-5 w-5 text-primary" />
                <p class="text-xs font-bold text-foreground/40">DMs</p>
                <p class="mt-1 text-xl font-bold">{{ jobStats.dmReplies }}</p>
              </div>
              <div
                class="rounded-[0.39rem] border border-foreground/10 bg-background p-4"
              >
                <Trash2 class="mb-3 h-5 w-5 text-red-400" />
                <p class="text-xs font-bold text-foreground/40">Failed</p>
                <p class="mt-1 text-xl font-bold">{{ jobStats.failed }}</p>
              </div>
            </div>
          </div>

          <div
            class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-xs font-bold text-foreground">Post comments</h3>
                <p class="mt-1 text-xs leading-5 text-foreground/45">
                  Saved comments for this post rule.
                </p>
              </div>
              <button
                @click="testRule"
                :disabled="isTesting || !form.postId"
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.39rem] border border-primary/20 bg-primary/10 text-primary transition hover:bg-primary/15 disabled:opacity-50"
                title="Test / refresh comments"
              >
                <Loader2 v-if="isTesting" class="h-3.5 w-3.5 animate-spin" />
                <RefreshCcw v-else class="h-3.5 w-3.5" />
              </button>
            </div>

            <div v-if="paginatedComments.length" class="mt-4 space-y-2">
              <div
                v-for="comment in paginatedComments"
                :key="comment.id"
                class="rounded-[0.39rem] border border-foreground/10 bg-background/70 p-3"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs font-bold text-foreground">
                      {{
                        comment.commenter_username
                          ? `@${comment.commenter_username}`
                          : "Instagram user"
                      }}
                    </p>
                    <p
                      class="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-foreground/65"
                    >
                      {{ comment.comment_text }}
                    </p>
                  </div>
                  <span
                    class="shrink-0 rounded-[0.39rem] bg-foreground/5 px-2 py-0.5 text-[10px] font-bold text-foreground/40"
                    >Saved</span
                  >
                </div>
              </div>

              <div class="border-t border-foreground/10 pt-3">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[10px] font-bold text-foreground/40">
                    {{ commentsShowingStart }}-{{ commentsShowingEnd }} of
                    {{ commentsTotal }}
                  </p>
                  <select
                    v-model.number="commentsPerPage"
                    class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 px-2 py-1.5 text-[10px] font-bold outline-none"
                  >
                    <option :value="5">5</option>
                    <option :value="8">8</option>
                    <option :value="12">12</option>
                  </select>
                </div>
                <div class="mt-2 flex items-center justify-between gap-2">
                  <button
                    @click="setCommentsPage(commentsPage - 1)"
                    :disabled="commentsPage <= 1"
                    class="inline-flex items-center gap-1 rounded-[0.39rem] border border-foreground/10 px-2 py-1.5 text-[10px] font-bold text-foreground/55 disabled:opacity-40"
                  >
                    <ChevronLeft class="h-3 w-3" />
                    Prev
                  </button>
                  <span class="text-[10px] font-bold text-foreground/40">
                    Page {{ commentsPage }} / {{ commentsTotalPages }}
                  </span>
                  <button
                    @click="setCommentsPage(commentsPage + 1)"
                    :disabled="commentsPage >= commentsTotalPages"
                    class="inline-flex items-center gap-1 rounded-[0.39rem] border border-foreground/10 px-2 py-1.5 text-[10px] font-bold text-foreground/55 disabled:opacity-40"
                  >
                    Next
                    <ChevronRight class="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            <div
              v-else
              class="mt-4 rounded-[0.39rem] border border-dashed border-foreground/10 bg-background/70 p-4 text-center"
            >
              <MessageCircle class="mx-auto h-6 w-6 text-foreground/30" />
              <p class="mt-2 text-xs font-bold text-foreground">
                No comments saved yet
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>

    <div
      v-else
      class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-10 text-center"
    >
      <Instagram class="mx-auto h-10 w-10 text-foreground/30" />
      <h2 class="mt-4 text-lg font-bold tracking-tight text-foreground">
        Instagram account not found
      </h2>
      <NuxtLink
        to="/dashboard/integrations/instagram"
        class="mt-6 inline-flex rounded-[0.39rem] bg-primary px-5 py-3 text-xs font-bold text-black"
        >Back to Instagram</NuxtLink
      >
    </div>
  </div>
</template>
