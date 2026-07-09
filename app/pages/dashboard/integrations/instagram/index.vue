<script setup lang="ts">
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GitBranch,
  Instagram,
  MessageCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  Trash2,
  X,
  Zap,
} from "lucide-vue-next";
import Skeleton from "~~/app/components/Skeleton.vue";

definePageMeta({ middleware: "auth", layout: "dashboard" });
useHead({ title: "Instagram | ReplySuite" });

const { isLoading: isPlanLoading } = useAuth();
const { canUseInstagramWorkflow } = usePlanAccess();
const supabase = useSupabaseClient();
const notify = useNotify();
const isLocked = computed(() => !canUseInstagramWorkflow.value);
const hasMounted = ref(false);
const oauthLoading = ref(false);
const showAccountsModal = ref(false);
const currentPage = ref(1);
const pageSize = 5;
const automationSearch = ref("");
const statusFilter = ref("all");
const modeFilter = ref("all");
const accountFilter = ref("all");

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
});

const startInstagramOAuth = async () => {
  try {
    oauthLoading.value = true;
    const response = await instagramApiFetch<{ url: string }>(
      "/api/instagram/oauth/start",
      { method: "POST" },
    );
    if (response?.url) window.location.href = response.url;
  } catch (error: any) {
    notify.error(
      error?.data?.statusMessage ||
        error?.message ||
        "Sign in again before connecting Instagram.",
    );
  } finally {
    oauthLoading.value = false;
  }
};

const {
  data: accounts,
  pending: isLoading,
  error: accountsError,
  refresh,
} = await useAsyncData(
  "instagram-accounts-list",
  async () => {
    return await instagramApiFetch<any[]>("/api/instagram/accounts");
  },
  { server: false, default: () => [] },
);

const sentCount = (automation: any) =>
  automation.jobs.filter((job: any) => job.status === "sent").length;
const failedCount = (automation: any) =>
  automation.jobs.filter((job: any) => job.status === "failed").length;

const modeLabel = (trigger: any) => {
  if (!trigger) return "No automation";
  if (trigger.reply_in_comment && trigger.reply_in_dm)
    return "Comment reply + DM";
  if (trigger.reply_in_comment) return "Comment reply";
  if (trigger.reply_in_dm) return "Comment-to-DM";
  return "Paused";
};

const keywordsLabel = (trigger: any) => {
  const keywords = Array.isArray(trigger?.keywords)
    ? trigger.keywords.filter(Boolean)
    : [];
  return keywords.length ? keywords.join(", ") : "All comments";
};

const postLabel = (post: any) => {
  const caption = String(post?.caption || "").trim();
  return caption || post?.permalink || post?.id || "Instagram post";
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

const latestJobTime = (automation: any) => {
  const dates = (automation.jobs || [])
    .map((job: any) => job.updated_at || job.created_at || job.sent_at)
    .filter(Boolean)
    .sort();
  return (
    dates.at(-1) ||
    automation.trigger?.updated_at ||
    automation.post?.updated_at
  );
};

const automations = computed(() => {
  return (accounts.value || []).flatMap((account: any) => {
    return (account.posts || []).flatMap((post: any) => {
      return (post.triggers || []).map((trigger: any) => ({
        id: trigger.id,
        account,
        post,
        trigger,
        jobs: (account.jobs || []).filter(
          (job: any) =>
            job.trigger_id === trigger.id || job.triggerId === trigger.id,
        ),
      }));
    });
  });
});

const accountOptions = computed(() => [
  "all",
  ...(accounts.value || [])
    .map((account: any) => account.username)
    .filter(Boolean),
]);
const modeOptions = computed(() => [
  "all",
  ...Array.from(
    new Set(
      automations.value.map((automation: any) => modeLabel(automation.trigger)),
    ),
  ),
]);
const filteredAutomations = computed(() => {
  const query = automationSearch.value.trim().toLowerCase();
  return automations.value.filter((automation: any) => {
    const status = automation.trigger?.is_active ? "Active" : "Paused";
    const mode = modeLabel(automation.trigger);
    const username = automation.account?.username || "";
    const matchesSearch =
      !query ||
      [
        postLabel(automation.post),
        keywordsLabel(automation.trigger),
        mode,
        username,
        automation.trigger?.chatbots?.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesStatus =
      statusFilter.value === "all" || status === statusFilter.value;
    const matchesMode = modeFilter.value === "all" || mode === modeFilter.value;
    const matchesAccount =
      accountFilter.value === "all" || username === accountFilter.value;
    return matchesSearch && matchesStatus && matchesMode && matchesAccount;
  });
});

const instagramStats = computed(() => {
  const rules = automations.value;
  const activeRules = rules.filter(
    (item: any) => item.trigger?.is_active,
  ).length;
  const sent = rules.reduce(
    (sum: number, item: any) => sum + sentCount(item),
    0,
  );
  const failed = rules.reduce(
    (sum: number, item: any) => sum + failedCount(item),
    0,
  );
  return [
    {
      label: "Accounts",
      value: accounts.value?.length || 0,
      detail: "Connected profiles",
      tone: "primary",
      icon: Instagram,
    },
    {
      label: "Rules",
      value: activeRules,
      detail: "Active comment workflows",
      tone: activeRules > 0 ? "green" : "primary",
      icon: Zap,
    },
    {
      label: "Sent",
      value: sent,
      detail: "Automated replies and DMs",
      tone: "amber",
      icon: Send,
    },
    {
      label: "Failed",
      value: failed,
      detail: "Needs review",
      tone: failed > 0 ? "red" : "primary",
      icon: AlertCircle,
    },
  ];
});

const pageCount = computed(() =>
  Math.max(1, Math.ceil(filteredAutomations.value.length / pageSize)),
);
const paginatedAutomations = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredAutomations.value.slice(start, start + pageSize);
});
const pageStart = computed(() =>
  filteredAutomations.value.length ? (currentPage.value - 1) * pageSize + 1 : 0,
);
const pageEnd = computed(() =>
  Math.min(currentPage.value * pageSize, filteredAutomations.value.length),
);

const statCardClass = (tone: string) =>
  ({
    primary: "bg-primary/10 text-primary ring-primary/15",
    green: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/15",
    amber: "bg-amber-400/10 text-amber-400 ring-amber-400/15",
    red: "bg-red-400/10 text-red-400 ring-red-400/15",
  })[tone] || "bg-foreground/5 text-foreground/60 ring-foreground/10";

const statusPillClass = (active: boolean) =>
  active
    ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-700 dark:text-emerald-200"
    : "border-foreground/10 bg-foreground/[0.03] text-foreground/55";
const statusDotClass = (active: boolean) =>
  active
    ? "bg-emerald-400 shadow-emerald-400/30"
    : "bg-foreground/25 shadow-foreground/10";

const resetFilters = () => {
  automationSearch.value = "";
  statusFilter.value = "all";
  modeFilter.value = "all";
  accountFilter.value = "all";
  currentPage.value = 1;
};

watch([automationSearch, statusFilter, modeFilter, accountFilter], () => {
  currentPage.value = 1;
});
watch(filteredAutomations, () => {
  if (currentPage.value > pageCount.value) currentPage.value = pageCount.value;
  if (currentPage.value < 1) currentPage.value = 1;
});

const goToPage = (page: number) => {
  currentPage.value = Math.min(Math.max(page, 1), pageCount.value);
};

const disconnectAccount = async (id: string) => {
  if (
    !(await notify.confirm(
      "Disconnect this Instagram account and its post automations?",
    ))
  )
    return;
  try {
    await instagramApiFetch(`/api/instagram/${id}`, { method: "DELETE" });
    notify.success("Instagram account disconnected.");
    await refresh();
  } catch (error: any) {
    notify.error(
      error?.data?.statusMessage ||
        error?.message ||
        "Failed to disconnect Instagram.",
    );
  }
};
</script>

<template>
  <WhatsAppUpgradeGate
    v-if="hasMounted && isLocked && !isPlanLoading && !accounts?.length"
    title="Upgrade to unlock Instagram"
    description="Instagram post automation is available on plans with Instagram access. Connect posts, reply to comments, and send comment-to-DM responses from your trained assistants."
    back-to="/dashboard"
    back-label="Back to dashboard"
  />

  <div v-else class="mx-auto max-w-7xl space-y-4 pb-24 pt-5 lg:pb-12 lg:pt-6">
    <section class="space-y-3 pt-4 lg:pt-6">
      <div
        class="flex flex-col gap-3 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-3 shadow-sm shadow-black/5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15"
          >
            <Instagram class="h-5 w-5" />
          </div>
          <div>
            <p class="text-sm font-bold text-foreground">
              Instagram automation
            </p>
            <p class="mt-0.5 text-xs font-medium text-foreground/50">
              Manage comment replies and comment-to-DM rules for connected
              posts.
            </p>
          </div>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] border border-primary/20 bg-primary/10 px-3 text-xs font-bold text-primary transition hover:bg-primary/15"
            @click="showAccountsModal = true"
          >
            <Instagram class="h-3.5 w-3.5" />
            {{ accounts?.length || 0 }} account{{
              (accounts?.length || 0) === 1 ? "" : "s"
            }}
          </button>
          <NuxtLink
            to="/dashboard/integrations/instagram/setup"
            class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-3 text-xs font-bold text-black transition hover:bg-primary-accent"
          >
            <Plus class="h-3.5 w-3.5" />
            New automation
          </NuxtLink>
        </div>
      </div>

      <div
        v-if="!hasMounted || isLoading"
        class="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <article
          v-for="card in 4"
          :key="`instagram-stat-skeleton-${card}`"
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

      <div v-else class="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <article
          v-for="stat in instagramStats"
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
      class="min-w-0 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
    >
      <div class="space-y-3 border-b border-foreground/10 p-3">
        <div
          class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h2 class="text-sm font-bold text-foreground">Automation rules</h2>
            <p class="mt-0.5 text-xs font-medium text-foreground/45">
              {{ filteredAutomations.length }} / {{ automations.length }} rules
              shown
            </p>
          </div>
          <div class="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
            <label class="relative block sm:w-64">
              <Search
                class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35"
              />
              <input
                v-model="automationSearch"
                type="search"
                placeholder="Search posts, keywords, assistant"
                class="h-10 w-full rounded-[0.39rem] border border-foreground/10 bg-background py-2 pl-9 pr-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/40"
              />
            </label>
            <select
              v-model="statusFilter"
              class="h-10 rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-bold text-foreground/60 outline-none focus:border-primary/40"
            >
              <option value="all">All status</option>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
            </select>
            <select
              v-model="modeFilter"
              class="h-10 rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-bold text-foreground/60 outline-none focus:border-primary/40"
            >
              <option v-for="mode in modeOptions" :key="mode" :value="mode">
                {{ mode === "all" ? "All modes" : mode }}
              </option>
            </select>
            <select
              v-model="accountFilter"
              class="h-10 rounded-[0.39rem] border border-foreground/10 bg-background px-3 text-xs font-bold text-foreground/60 outline-none focus:border-primary/40"
            >
              <option
                v-for="account in accountOptions"
                :key="account"
                :value="account"
              >
                {{ account === "all" ? "All accounts" : `@${account}` }}
              </option>
            </select>
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-foreground/5 px-3 text-xs font-bold text-foreground/55 transition hover:border-primary/30 hover:text-primary"
              @click="resetFilters"
            >
              <RotateCcw class="h-3.5 w-3.5" />
              Reset
            </button>
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-foreground/5 px-3 text-xs font-bold text-foreground/55 transition hover:border-primary/30 hover:text-primary"
              @click="refresh()"
            >
              <RefreshCw class="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div v-if="!hasMounted || isLoading" class="overflow-x-auto p-3">
        <table
          class="w-full min-w-[980px] border-separate border-spacing-y-2 text-left"
        >
          <thead class="text-[11px] font-bold text-foreground/35">
            <tr>
              <th class="px-[0.9rem] py-3">Post</th>
              <th class="px-[0.9rem] py-3">Account</th>
              <th class="px-[0.9rem] py-3">Mode</th>
              <th class="px-[0.9rem] py-3">Status</th>
              <th class="px-[0.9rem] py-3">Results</th>
              <th class="px-[0.9rem] py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in 5" :key="`instagram-row-skeleton-${row}`">
              <td
                class="rounded-l-[0.39rem] bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05]"
              >
                <div class="flex items-center gap-3">
                  <Skeleton width="2.75rem" height="2.75rem" radius="0.39rem" />
                  <div class="min-w-0 flex-1 space-y-2">
                    <Skeleton width="72%" height="0.8rem" radius="999px" />
                    <Skeleton width="52%" height="0.65rem" radius="999px" />
                  </div>
                </div>
              </td>
              <td
                class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05]"
              >
                <Skeleton width="6rem" height="1.35rem" radius="999px" />
              </td>
              <td
                class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05]"
              >
                <Skeleton width="8rem" height="1.35rem" radius="999px" />
              </td>
              <td
                class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05]"
              >
                <Skeleton width="5rem" height="1.35rem" radius="999px" />
              </td>
              <td
                class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05]"
              >
                <Skeleton width="8rem" height="0.75rem" radius="999px" />
              </td>
              <td
                class="rounded-r-[0.39rem] bg-background/45 px-[0.9rem] py-3 text-right ring-1 ring-inset ring-foreground/[0.05]"
              >
                <Skeleton
                  width="8rem"
                  height="2rem"
                  radius="0.39rem"
                  class="ml-auto"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="automations.length" class="overflow-x-auto p-3">
        <table
          class="w-full min-w-[980px] border-separate border-spacing-y-2 text-left"
        >
          <thead class="text-[11px] font-bold text-foreground/35">
            <tr>
              <th class="px-[0.9rem] py-3">Post</th>
              <th class="px-[0.9rem] py-3">Account</th>
              <th class="px-[0.9rem] py-3">Mode</th>
              <th class="px-[0.9rem] py-3">Status</th>
              <th class="px-[0.9rem] py-3">Results</th>
              <th class="px-[0.9rem] py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="automation in paginatedAutomations"
              :key="automation.id"
              class="group"
            >
              <td
                class="rounded-l-[0.39rem] bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
              >
                <div class="flex min-w-0 items-center gap-3">
                  <div
                    class="relative h-11 w-11 shrink-0 overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.04]"
                  >
                    <img
                      :src="`/api/instagram/${automation.account.id}/posts/${automation.post.id}/asset`"
                      :alt="postLabel(automation.post)"
                      class="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div class="min-w-0">
                    <p
                      class="max-w-[18rem] truncate text-sm font-bold text-foreground"
                    >
                      {{ postLabel(automation.post) }}
                    </p>
                    <p
                      class="mt-1 max-w-[18rem] truncate text-xs font-medium text-foreground/40"
                    >
                      Keyword: {{ keywordsLabel(automation.trigger) }}
                    </p>
                  </div>
                </div>
              </td>
              <td
                class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
              >
                <span
                  class="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-2 py-1 text-xs font-bold text-foreground/55"
                >
                  <Instagram class="h-3 w-3" />
                  @{{ automation.account.username }}
                </span>
              </td>
              <td
                class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
              >
                <div class="space-y-1">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary"
                  >
                    <MessageSquare class="h-3 w-3" />
                    {{ modeLabel(automation.trigger) }}
                  </span>
                  <p
                    class="max-w-[12rem] truncate text-[11px] font-semibold text-foreground/40"
                  >
                    {{ automation.trigger.chatbots?.name || "Not mapped" }}
                  </p>
                </div>
              </td>
              <td
                class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
              >
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold',
                    statusPillClass(Boolean(automation.trigger.is_active)),
                  ]"
                >
                  <span
                    :class="[
                      'h-1.5 w-1.5 rounded-full shadow-sm',
                      statusDotClass(Boolean(automation.trigger.is_active)),
                    ]"
                  />
                  {{ automation.trigger.is_active ? "Active" : "Paused" }}
                </span>
              </td>
              <td
                class="bg-background/45 px-[0.9rem] py-3 ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
              >
                <div class="text-xs font-bold text-foreground/55">
                  <span class="text-emerald-500"
                    >{{ sentCount(automation) }} sent</span
                  >
                  <span class="mx-1 text-foreground/25">/</span>
                  <span
                    :class="
                      failedCount(automation) > 0
                        ? 'text-red-400'
                        : 'text-foreground/35'
                    "
                  >
                    {{ failedCount(automation) }} failed
                  </span>
                  <p class="mt-1 text-[11px] font-semibold text-foreground/35">
                    Last: {{ formatDate(latestJobTime(automation)) }}
                  </p>
                </div>
              </td>
              <td
                class="rounded-r-[0.39rem] bg-background/45 px-[0.9rem] py-3 text-right ring-1 ring-inset ring-foreground/[0.05] transition group-hover:bg-primary/[0.035]"
              >
                <div class="inline-flex items-center gap-2">
                  <NuxtLink
                    :to="`/dashboard/integrations/instagram/${automation.account.id}`"
                    class="inline-flex h-9 items-center justify-center gap-1.5 rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.03] px-3 text-xs font-bold text-foreground/60 transition hover:border-primary/30 hover:text-primary"
                  >
                    <Settings class="h-3.5 w-3.5" />
                    Manage
                  </NuxtLink>
                  <NuxtLink
                    :to="`/dashboard/flows/${automation.account.id}?channel=instagram`"
                    class="inline-flex h-9 items-center justify-center gap-1.5 rounded-[0.39rem] bg-primary px-3 text-xs font-bold text-black transition hover:bg-primary-accent"
                  >
                    <GitBranch class="h-3.5 w-3.5" />
                    Flow
                  </NuxtLink>
                  <a
                    v-if="automation.post.permalink"
                    :href="automation.post.permalink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.03] text-foreground/50 transition hover:border-primary/30 hover:text-primary"
                    aria-label="Open Instagram post"
                  >
                    <ExternalLink class="h-3.5 w-3.5" />
                  </a>
                </div>
              </td>
            </tr>
            <tr v-if="filteredAutomations.length === 0">
              <td
                colspan="6"
                class="px-[0.9rem] py-8 text-center text-xs font-bold text-foreground/45"
              >
                No automations match the current filters.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="flex flex-col items-center px-6 py-14 text-center">
        <div
          class="mb-5 flex h-14 w-14 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15"
        >
          <MessageCircle class="h-7 w-7" />
        </div>
        <h3 class="text-lg font-bold text-foreground">No automations yet</h3>
        <p
          class="mt-3 max-w-md text-sm font-medium leading-6 text-foreground/50"
        >
          Create a post rule to reply to comments, send a DM to the commenter,
          or do both.
        </p>
        <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <NuxtLink
            to="/dashboard/integrations/instagram/setup"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-4 text-xs font-bold text-black transition hover:bg-primary-accent"
          >
            <Zap class="h-4 w-4" />
            Create automation
          </NuxtLink>
          <button
            type="button"
            :disabled="oauthLoading"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.03] px-4 text-xs font-bold text-foreground/60 transition hover:bg-foreground/[0.06] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            @click="startInstagramOAuth"
          >
            <Instagram class="h-4 w-4" />
            {{ oauthLoading ? "Opening Instagram…" : "Connect account" }}
          </button>
        </div>
        <p
          v-if="accountsError"
          class="mt-4 max-w-lg rounded-[0.39rem] border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs font-bold leading-5 text-red-300"
        >
          Could not load Instagram automations. Refresh the page or sign in
          again.
        </p>
      </div>

      <div
        v-if="automations.length || !hasMounted || isLoading"
        class="border-t border-foreground/10 px-3 py-3"
      >
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-xs font-semibold text-foreground/45">
            Showing {{ pageStart }}-{{ pageEnd }} of
            {{ filteredAutomations.length }} rules
          </p>
          <div class="flex items-center gap-2">
            <span
              class="inline-flex h-9 items-center rounded-[0.39rem] border border-foreground/10 bg-background px-2 text-xs font-bold text-foreground/45"
            >
              5 / page
            </span>
            <div
              class="inline-flex items-center overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background"
            >
              <button
                type="button"
                :disabled="currentPage === 1"
                class="inline-flex h-9 items-center gap-1 px-3 text-xs font-bold text-foreground/55 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                @click="goToPage(currentPage - 1)"
              >
                <ChevronLeft class="h-3.5 w-3.5" />
                Prev
              </button>
              <span
                class="border-x border-foreground/10 px-3 text-xs font-bold text-foreground/45"
              >
                {{ currentPage }} / {{ pageCount }}
              </span>
              <button
                type="button"
                :disabled="currentPage === pageCount"
                class="inline-flex h-9 items-center gap-1 px-3 text-xs font-bold text-foreground/55 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                @click="goToPage(currentPage + 1)"
              >
                Next
                <ChevronRight class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="showAccountsModal"
        class="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
        @click.self="showAccountsModal = false"
      >
        <div
          class="max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background shadow-xl shadow-black/20"
        >
          <div
            class="flex flex-col gap-3 border-b border-foreground/10 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex items-start gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15"
              >
                <Instagram class="h-5 w-5" />
              </div>
              <div>
                <p class="text-sm font-bold text-foreground">
                  Connected accounts
                </p>
                <p class="mt-0.5 text-xs font-medium text-foreground/45">
                  {{ accounts?.length || 0 }} Instagram account{{
                    (accounts?.length || 0) === 1 ? "" : "s"
                  }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                :disabled="oauthLoading"
                class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-3 text-xs font-bold text-black transition hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-60"
                @click="startInstagramOAuth"
              >
                <Plus class="h-3.5 w-3.5" />
                {{ oauthLoading ? "Opening…" : "Connect" }}
              </button>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.03] text-foreground/50 transition hover:bg-foreground/[0.06] hover:text-foreground"
                aria-label="Close accounts modal"
                @click="showAccountsModal = false"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>

          <div class="max-h-[62vh] overflow-y-auto p-4">
            <div v-if="accounts?.length" class="space-y-2">
              <div
                v-for="account in accounts"
                :key="account.id"
                class="flex flex-col gap-3 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="flex min-w-0 items-center gap-3">
                  <img
                    :src="`/api/instagram/${account.id}/profile-picture`"
                    :alt="`@${account.username}`"
                    class="h-10 w-10 rounded-[0.39rem] border border-primary/15 bg-primary/10 object-cover"
                  />
                  <div class="min-w-0">
                    <p class="truncate text-sm font-bold text-foreground">
                      @{{ account.username }}
                    </p>
                    <p
                      class="mt-1 max-w-lg truncate text-xs font-medium text-foreground/45"
                    >
                      {{ account.posts?.length || 0 }} synced post{{
                        (account.posts?.length || 0) === 1 ? "" : "s"
                      }}
                    </p>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-2 sm:justify-end">
                  <NuxtLink
                    :to="`/dashboard/integrations/instagram/${account.id}`"
                    class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.03] px-3 text-xs font-bold text-foreground/60 transition hover:border-primary/30 hover:text-primary"
                    @click="showAccountsModal = false"
                  >
                    <Settings class="h-3.5 w-3.5" />
                    Manage
                  </NuxtLink>
                  <NuxtLink
                    :to="`/dashboard/integrations/instagram/setup?accountId=${account.id}`"
                    class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-3 text-xs font-bold text-black transition hover:bg-primary-accent"
                    @click="showAccountsModal = false"
                  >
                    <Plus class="h-3.5 w-3.5" />
                    Setup
                  </NuxtLink>
                  <button
                    type="button"
                    :disabled="oauthLoading"
                    class="inline-flex h-9 items-center justify-center gap-2 rounded-[0.39rem] border border-primary/20 bg-primary/10 px-3 text-xs font-bold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                    @click="startInstagramOAuth"
                  >
                    <Instagram class="h-3.5 w-3.5" />
                    Reconnect
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-[0.39rem] border border-red-400/20 bg-red-400/10 text-red-400 transition hover:bg-red-400/15"
                    aria-label="Disconnect Instagram account"
                    @click="disconnectAccount(account.id)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div
              v-else
              class="flex flex-col items-center justify-center rounded-[0.39rem] border border-dashed border-foreground/10 px-6 py-10 text-center"
            >
              <Instagram class="mb-3 h-10 w-10 text-primary" />
              <p class="text-sm font-bold text-foreground">
                No accounts connected
              </p>
              <p
                class="mt-2 max-w-sm text-xs font-medium leading-5 text-foreground/50"
              >
                Connect an Instagram business account before creating
                automations.
              </p>
              <button
                type="button"
                :disabled="oauthLoading"
                class="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-4 text-xs font-bold text-black transition hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-60"
                @click="startInstagramOAuth"
              >
                <Instagram class="h-4 w-4" />
                {{ oauthLoading ? "Opening Instagram…" : "Connect account" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
