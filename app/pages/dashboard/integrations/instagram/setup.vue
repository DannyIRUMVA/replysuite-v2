<script setup lang="ts">
import { ArrowLeft, Bot, Instagram, Loader2, Sparkles } from "lucide-vue-next";

definePageMeta({ middleware: "auth", layout: "dashboard" });
useHead({ title: "Instagram setup | ReplySuite" });

const { isLoading: isPlanLoading, setInteracting } = useAuth();
const { canUseInstagramWorkflow } = usePlanAccess();
const supabase = useSupabaseClient();
const notify = useNotify();
const route = useRoute();
const isLocked = computed(() => !canUseInstagramWorkflow.value);
const canPublicComment = canUseInstagramWorkflow;

const form = reactive({
  accountId: "",
  instagramAccountId: "",
  pageId: "",
  username: "",
  accessToken: "",
  postId: "",
  permalink: "",
  caption: "",
  chatbotId: "",
  keywords: "",
  replyInComment: true,
  replyInDm: true,
  dmTemplate: "",
});

const isSubmitting = ref(false);
const isSyncingPosts = ref(false);
const isCheckingComments = ref(false);
const selectedSyncedPostId = ref("");
const autoSyncedAccountIds = ref<string[]>([]);
const oauthLoading = ref(false);

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

const { data: connectedAccounts, refresh: refreshConnectedAccounts } =
  await useAsyncData(
    "instagram-setup-connected-accounts",
    async () => {
      return await instagramApiFetch<any[]>("/api/instagram/accounts");
    },
    { server: false, default: () => [] },
  );

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

const selectedConnectedAccount = computed(() =>
  (connectedAccounts.value || []).find(
    (account: any) => account.id === form.accountId,
  ),
);
const syncedPosts = computed(() => selectedConnectedAccount.value?.posts || []);

const { data: agents } = await useAsyncData(
  "instagram-setup-agents",
  async () => {
    const { data } = await supabase
      .from("chatbots")
      .select("id, name")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (data?.length && !form.chatbotId) form.chatbotId = data[0].id;
    return data || [];
  },
);

watch(
  canPublicComment,
  (allowed) => {
    if (!allowed) form.replyInComment = false;
  },
  { immediate: true },
);

const applySelectedAccount = () => {
  selectedSyncedPostId.value = "";
  const account = selectedConnectedAccount.value;
  if (account) {
    form.instagramAccountId = account.instagram_account_id || "";
    form.username = account.username || "";
    form.pageId = account.platform_id || "";
    form.accessToken = "";
  }
};

const selectAccount = async (accountId: string) => {
  if (!accountId) return;
  form.accountId = accountId;
  await nextTick();
  applySelectedAccount();

  if (!autoSyncedAccountIds.value.includes(accountId)) {
    autoSyncedAccountIds.value = [...autoSyncedAccountIds.value, accountId];
    await syncPosts({ silent: true });
  }
};

watch(
  connectedAccounts,
  (accounts) => {
    const queryAccountId =
      typeof route.query.accountId === "string" ? route.query.accountId : "";
    if (
      queryAccountId &&
      accounts?.some((account: any) => account.id === queryAccountId)
    )
      selectAccount(queryAccountId);
  },
  { immediate: true },
);

watch(() => form.accountId, applySelectedAccount);

watch(selectedSyncedPostId, (postId) => {
  const post = syncedPosts.value.find((item: any) => item.id === postId);
  if (!post) return;
  form.postId = post.id;
  form.permalink = post.permalink || "";
  form.caption = post.caption || "";
});

const instagramErrorMessage = (code: string, detail?: string) => {
  const messages: Record<string, string> = {
    account_already_connected:
      "This Instagram account is already connected to another ReplySuite user.",
    invalid_oauth_state:
      "Instagram login session expired or was opened from another domain. Start again from this ngrok URL.",
    session_expired:
      "Your ReplySuite session expired. Sign in on this ngrok URL, then connect Instagram again.",
    oauth_callback_failed:
      "Instagram login reached ReplySuite, but saving the account failed.",
    access_denied: "Instagram authorization was cancelled or denied.",
  };
  return detail
    ? `${messages[code] || "Instagram login could not be completed."} ${detail}`
    : messages[code] || `Instagram login could not be completed: ${code}`;
};

onMounted(async () => {
  if (route.query.instagram_connected === "1") {
    notify.success(
      "Instagram account connected. Continue with the saved account below.",
    );
    await refreshConnectedAccounts();
    const queryAccountId =
      typeof route.query.accountId === "string" ? route.query.accountId : "";
    if (
      queryAccountId &&
      (connectedAccounts.value || []).some(
        (account: any) => account.id === queryAccountId,
      )
    ) {
      await selectAccount(queryAccountId);
    }
  } else if (typeof route.query.instagram_error === "string") {
    const detail =
      typeof route.query.instagram_error_detail === "string"
        ? route.query.instagram_error_detail
        : "";
    notify.error(instagramErrorMessage(route.query.instagram_error, detail));
  }
});

async function syncPosts(options: { silent?: boolean } = {}) {
  if (!form.accountId) {
    if (!options.silent)
      notify.warn("Choose a connected Instagram account first.");
    return;
  }

  isSyncingPosts.value = true;
  try {
    const response: any = await instagramApiFetch(
      `/api/instagram/${form.accountId}/sync-posts`,
      { method: "POST" },
    );
    await refreshConnectedAccounts();
    if (!options.silent) {
      notify.success(
        response?.synced
          ? `Synced ${response.synced} Instagram post${response.synced === 1 ? "" : "s"}.`
          : "No Instagram posts found to sync.",
      );
    }
  } catch (error: any) {
    notify.error(
      error?.data?.statusMessage ||
        error?.message ||
        "Failed to sync Instagram posts.",
    );
  } finally {
    isSyncingPosts.value = false;
  }
}

async function syncComments(options: { silent?: boolean } = {}) {
  if (!form.accountId || !form.postId) {
    if (!options.silent) notify.warn("Choose an account and post first.");
    return null;
  }

  isCheckingComments.value = true;
  try {
    const response: any = await instagramApiFetch(
      `/api/instagram/${form.accountId}/sync-comments`,
      {
        method: "POST",
        body: { postId: form.postId },
      },
    );
    if (!options.silent) {
      notify.success(
        `Checked ${response?.found || 0} comment${response?.found === 1 ? "" : "s"} on this post.`,
      );
    }
    return response;
  } catch (error: any) {
    const message =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to check Instagram comments.";
    if (options.silent)
      notify.warn(`Rule saved, but comment check failed: ${message}`);
    else notify.error(message);
    return null;
  } finally {
    isCheckingComments.value = false;
  }
}

const submit = async () => {
  if (!form.accountId || !form.postId || !form.chatbotId) {
    notify.warn(
      "Select a connected Instagram account, choose a synced post, and pick an assistant.",
    );
    return;
  }

  if (!form.replyInComment && !form.replyInDm) {
    notify.warn("Choose comment reply, comment-to-DM, or both.");
    return;
  }

  isSubmitting.value = true;
  try {
    const response: any = await instagramApiFetch("/api/instagram/connect", {
      method: "POST",
      body: {
        accountId: form.accountId,
        instagramAccountId: form.instagramAccountId,
        pageId: form.pageId,
        username: form.username.replace(/^@/, ""),
        accessToken: form.accessToken,
        postId: form.postId,
        permalink: form.permalink,
        caption: form.caption,
        chatbotId: form.chatbotId,
        keywords: form.keywords,
        replyInComment: form.replyInComment,
        replyInDm: form.replyInDm,
        dmTemplate: form.dmTemplate,
      },
    });

    const checked = await syncComments({ silent: true });
    notify.success(
      checked
        ? `Rule saved. Checked ${checked.found || 0} existing comment${checked.found === 1 ? "" : "s"}.`
        : response.message || "Instagram post connected.",
    );
  } catch (error: any) {
    notify.error(
      error?.data?.statusMessage || error?.message || "Instagram setup failed.",
    );
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <WhatsAppUpgradeGate
    v-if="isLocked && !isPlanLoading && !connectedAccounts?.length"
    title="Upgrade before connecting Instagram"
    description="Instagram comment reply and comment-to-DM automation require a plan with Instagram access."
    back-to="/dashboard/integrations/instagram"
    back-label="Back to Instagram"
  />

  <div v-else class="mx-auto max-w-5xl space-y-5 pb-20 pt-3 lg:pb-12">
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
          <p class="dashboard-eyebrow text-primary/80">Instagram setup</p>
          <h1 class="dashboard-section-title mt-2">Create automation</h1>
          <p class="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/65">
            Choose an account, pick a post, and decide whether your assistant
            replies in comments, DMs, or both.
          </p>
        </div>
        <button
          type="button"
          @click="startInstagramOAuth"
          :disabled="oauthLoading"
          class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-4 text-xs font-bold text-black shadow-sm shadow-primary/10 transition hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Instagram class="h-4 w-4" />
          {{ oauthLoading ? "Opening…" : "Connect account" }}
        </button>
      </div>
    </section>

    <section
      class="overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5"
    >
      <div class="border-b border-foreground/10 p-4 sm:p-5">
        <div class="grid gap-2 sm:grid-cols-3">
          <div
            class="rounded-[0.39rem] border px-3 py-3"
            :class="
              form.accountId
                ? 'border-primary/25 bg-primary/10'
                : 'border-foreground/10 bg-background/60'
            "
          >
            <p class="text-xs font-bold text-foreground/40">Step 1</p>
            <p class="mt-1 text-xs font-bold text-foreground">Account</p>
          </div>
          <div
            class="rounded-[0.39rem] border px-3 py-3"
            :class="
              selectedSyncedPostId
                ? 'border-primary/25 bg-primary/10'
                : form.accountId
                  ? 'border-primary/15 bg-primary/5'
                  : 'border-foreground/10 bg-background/60 opacity-60'
            "
          >
            <p class="text-xs font-bold text-foreground/40">Step 2</p>
            <p class="mt-1 text-xs font-bold text-foreground">Post</p>
          </div>
          <div
            class="rounded-[0.39rem] border px-3 py-3"
            :class="
              selectedSyncedPostId
                ? 'border-primary/15 bg-primary/5'
                : 'border-foreground/10 bg-background/60 opacity-60'
            "
          >
            <p class="text-xs font-bold text-foreground/40">Step 3</p>
            <p class="mt-1 text-xs font-bold text-foreground">Reply rule</p>
          </div>
        </div>
      </div>

      <div class="space-y-4 p-5 sm:p-6">
        <div
          class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5"
        >
          <div class="mb-3 flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-bold text-primary">1. Choose account</p>
              <h2 class="text-sm font-bold text-foreground">
                Saved Instagram accounts
              </h2>
            </div>
            <span
              v-if="connectedAccounts?.length"
              class="rounded-full bg-foreground/5 px-2.5 py-1 text-xs font-bold text-foreground/45"
              >{{ connectedAccounts.length }}</span
            >
          </div>

          <div v-if="connectedAccounts?.length" class="grid gap-2">
            <button
              v-for="account in connectedAccounts"
              :key="account.id"
              type="button"
              @click="selectAccount(account.id)"
              class="flex items-center gap-3 rounded-[0.39rem] border p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
              :class="
                form.accountId === account.id
                  ? 'border-primary/40 bg-primary/10 shadow-sm shadow-primary/5'
                  : 'border-foreground/10 bg-background-card/45'
              "
            >
              <img
                :src="`/api/instagram/${account.id}/profile-picture`"
                :alt="account.username"
                class="h-9 w-9 rounded-[0.39rem] border border-primary/15 bg-primary/10 object-cover"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-bold text-foreground"
                  >@{{ account.username || "instagram" }}</span
                >
                <span
                  class="mt-0.5 block truncate text-xs font-medium text-foreground/45"
                  >Connected account</span
                >
              </span>
              <Loader2
                v-if="isSyncingPosts && form.accountId === account.id"
                class="h-4 w-4 animate-spin text-primary"
              />
              <span
                v-else-if="form.accountId === account.id"
                class="rounded-full bg-primary px-2 py-1 text-xs font-bold text-black"
                >Selected</span
              >
            </button>
          </div>

          <div
            v-else
            class="rounded-[0.39rem] border border-dashed border-foreground/10 bg-background-card/45 p-5 text-center"
          >
            <Instagram class="mx-auto h-6 w-6 text-foreground/30" />
            <p class="mt-3 text-sm font-bold text-foreground">
              No account connected
            </p>
            <p class="mt-1 text-xs leading-5 text-foreground/50">
              Click connect account. Your saved account will appear here.
            </p>
          </div>
        </div>

        <div
          v-if="form.accountId"
          class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5"
        >
          <div
            class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p class="text-xs font-bold text-primary">2. Select post</p>
              <h2 class="text-sm font-bold text-foreground">
                Pick one post to monitor
              </h2>
            </div>
            <button
              type="button"
              @click="syncPosts()"
              :disabled="isSyncingPosts"
              class="inline-flex items-center justify-center gap-2 rounded-[0.39rem] border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/15 disabled:opacity-50"
            >
              <Loader2 v-if="isSyncingPosts" class="h-4 w-4 animate-spin" />
              <Sparkles v-else class="h-4 w-4" />
              Sync posts
            </button>
          </div>

          <div
            v-if="isSyncingPosts"
            class="flex items-center gap-3 rounded-[0.39rem] border border-primary/15 bg-primary/5 p-4 text-xs font-bold text-primary"
          >
            <Loader2 class="h-4 w-4 animate-spin" /> Pulling posts…
          </div>

          <div v-else-if="syncedPosts.length" class="grid gap-2">
            <button
              v-for="post in syncedPosts"
              :key="post.id"
              type="button"
              @click="selectedSyncedPostId = post.id"
              class="flex items-center gap-3 rounded-[0.39rem] border p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
              :class="
                selectedSyncedPostId === post.id
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-foreground/10 bg-background-card/45'
              "
            >
              <div
                class="relative h-14 w-14 shrink-0 overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.04]"
              >
                <img
                  :src="`/api/instagram/${form.accountId}/posts/${post.id}/asset`"
                  :alt="post.caption || 'Instagram post asset'"
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
                <span
                  v-if="post.media_type"
                  class="absolute bottom-1 left-1 rounded-[0.39rem] bg-black/70 px-1.5 py-0.5 text-xs font-bold text-white"
                  >{{ post.media_type }}</span
                >
              </div>
              <span class="min-w-0 flex-1">
                <span
                  class="line-clamp-1 text-sm font-bold leading-5 text-foreground"
                  >{{ post.caption || "Instagram post" }}</span
                >
                <span
                  class="mt-0.5 block truncate text-xs font-medium text-foreground/45"
                  >{{
                    post.permalink ? "Open from Instagram" : "Synced post"
                  }}</span
                >
              </span>
              <span
                v-if="selectedSyncedPostId === post.id"
                class="rounded-full bg-primary px-2 py-1 text-xs font-bold text-black"
                >Selected</span
              >
            </button>
          </div>

          <div
            v-else
            class="rounded-[0.39rem] border border-dashed border-foreground/10 bg-background-card/45 p-5 text-center"
          >
            <p class="text-sm font-bold text-foreground">No posts loaded</p>
            <p class="mt-1 text-xs leading-5 text-foreground/50">
              Click sync posts after choosing an account.
            </p>
          </div>
        </div>

        <div
          v-if="selectedSyncedPostId"
          class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-4 shadow-sm shadow-black/5"
        >
          <div class="mb-4">
            <p class="text-xs font-bold text-primary">3. Reply rule</p>
            <h2 class="text-sm font-bold text-foreground">
              Choose how ReplySuite responds
            </h2>
          </div>

          <div class="grid gap-3">
            <label class="space-y-1.5">
              <span
                class="flex items-center gap-2 text-xs font-bold text-foreground/50"
                ><Bot class="h-3.5 w-3.5" /> Assistant</span
              >
              <select
                v-model="form.chatbotId"
                class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-primary/50"
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

            <label class="space-y-1.5">
              <span class="text-xs font-bold text-foreground/50">Keywords</span>
              <input
                v-model="form.keywords"
                @focus="setInteracting(true)"
                @blur="setInteracting(false)"
                class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-primary/50"
                placeholder="price, info — empty means all comments"
              />
            </label>

            <div class="grid gap-2 sm:grid-cols-2">
              <label
                class="flex cursor-pointer items-start gap-3 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-3"
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
                  <span class="mt-1 block text-xs leading-5 text-foreground/50"
                    >Reply publicly under matching comments.</span
                  >
                </span>
              </label>

              <label
                class="flex cursor-pointer items-start gap-3 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-3"
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
                  <span class="mt-1 block text-xs leading-5 text-foreground/50"
                    >Send a private reply to the commenter.</span
                  >
                </span>
              </label>
            </div>

            <label class="space-y-1.5">
              <span class="text-xs font-bold text-foreground/50"
                >DM template optional</span
              >
              <textarea
                v-model="form.dmTemplate"
                @focus="setInteracting(true)"
                @blur="setInteracting(false)"
                rows="3"
                class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-primary/50"
                placeholder="Leave empty to let the assistant respond from its training."
              />
            </label>
          </div>
        </div>
      </div>

      <div
        class="flex flex-col gap-3 border-t border-foreground/10 bg-background/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <p class="text-xs font-bold leading-5 text-foreground/45">
          Save the rule, then ReplySuite checks existing comments on this post.
        </p>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            @click="syncComments()"
            :disabled="isCheckingComments || !selectedSyncedPostId"
            class="inline-flex items-center justify-center gap-2 rounded-[0.39rem] border border-primary/20 bg-primary/10 px-4 py-3 text-xs font-bold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Loader2 v-if="isCheckingComments" class="h-4 w-4 animate-spin" />
            Check comments
          </button>
          <button
            @click="submit"
            :disabled="
              isSubmitting || isCheckingComments || !selectedSyncedPostId
            "
            class="inline-flex items-center justify-center gap-3 rounded-[0.39rem] bg-primary px-5 py-3 text-xs font-bold text-black shadow-sm shadow-primary/10 transition hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin" />
            Save rule
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
