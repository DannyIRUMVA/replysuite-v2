<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
  Instagram,
  MessageCircle,
  Plus,
  Settings,
  Trash2,
  X,
  Zap
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
useHead({ title: 'Instagram Automations' })

const { isLoading: isPlanLoading } = useAuth()
const { canUseInstagramWorkflow } = usePlanAccess()
const supabase = useSupabaseClient()
const notify = useNotify()
const isLocked = computed(() => !canUseInstagramWorkflow.value)
const hasMounted = ref(false)
const oauthLoading = ref(false)
const showAccountsModal = ref(false)
const currentPage = ref(1)
const pageSize = 5

const instagramApiFetch = async <T>(url: string, options: any = {}) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return await $fetch<T>(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

onMounted(() => {
  hasMounted.value = true
})

const startInstagramOAuth = async () => {
  try {
    oauthLoading.value = true
    const response = await instagramApiFetch<{ url: string }>('/api/instagram/oauth/start', { method: 'POST' })
    if (response?.url) window.location.href = response.url
  } catch (error: any) {
    notify.error(error?.data?.statusMessage || error?.message || 'Sign in again before connecting Instagram.')
  } finally {
    oauthLoading.value = false
  }
}

const { data: accounts, pending: isLoading, error: accountsError, refresh } = await useAsyncData('instagram-accounts-list', async () => {
  return await instagramApiFetch<any[]>('/api/instagram/accounts')
}, { server: false, default: () => [] })

const automations = computed(() => {
  return (accounts.value || []).flatMap((account: any) => {
    return (account.posts || []).flatMap((post: any) => {
      return (post.triggers || []).map((trigger: any) => ({
        id: trigger.id,
        account,
        post,
        trigger,
        jobs: (account.jobs || []).filter((job: any) => job.trigger_id === trigger.id || job.triggerId === trigger.id),
      }))
    })
  })
})

const pageCount = computed(() => Math.max(1, Math.ceil(automations.value.length / pageSize)))
const paginatedAutomations = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return automations.value.slice(start, start + pageSize)
})
const pageStart = computed(() => automations.value.length ? ((currentPage.value - 1) * pageSize) + 1 : 0)
const pageEnd = computed(() => Math.min(currentPage.value * pageSize, automations.value.length))

watch(automations, () => {
  if (currentPage.value > pageCount.value) currentPage.value = pageCount.value
  if (currentPage.value < 1) currentPage.value = 1
})

const goToPage = (page: number) => {
  currentPage.value = Math.min(Math.max(page, 1), pageCount.value)
}

const sentCount = (automation: any) => automation.jobs.filter((job: any) => job.status === 'sent').length
const failedCount = (automation: any) => automation.jobs.filter((job: any) => job.status === 'failed').length

const modeLabel = (trigger: any) => {
  if (!trigger) return 'No automation'
  if (trigger.reply_in_comment && trigger.reply_in_dm) return 'Comment reply + DM'
  if (trigger.reply_in_comment) return 'Comment reply'
  if (trigger.reply_in_dm) return 'Comment-to-DM'
  return 'Paused'
}

const keywordsLabel = (trigger: any) => {
  const keywords = Array.isArray(trigger?.keywords) ? trigger.keywords.filter(Boolean) : []
  return keywords.length ? keywords.join(', ') : 'All comments'
}

const postLabel = (post: any) => {
  const caption = String(post?.caption || '').trim()
  return caption || post?.permalink || post?.id || 'Instagram post'
}

const formatDate = (value?: string) => {
  if (!value) return 'Not yet'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date(value))
}

const disconnectAccount = async (id: string) => {
  if (!(await notify.confirm('Disconnect this Instagram account and its post automations?'))) return
  try {
    await instagramApiFetch(`/api/instagram/${id}`, { method: 'DELETE' })
    notify.success('Instagram account disconnected.')
    await refresh()
  } catch (error: any) {
    notify.error(error?.data?.statusMessage || error?.message || 'Failed to disconnect Instagram.')
  }
}
</script>

<template>
  <WhatsAppUpgradeGate
    v-if="isLocked && !isPlanLoading && !(accounts?.length)"
    title="Upgrade to unlock Instagram"
    description="Instagram post automation is available on plans with Instagram access. Connect posts, reply to comments, and send comment-to-DM responses from your trained assistants."
    back-to="/dashboard"
    back-label="Back to dashboard"
  />

  <div v-else class="w-full space-y-4 pb-20 pt-4">
    <div class="flex flex-col gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Instagram</p>
        <h1 class="mt-1 text-xl font-black tracking-tight text-foreground sm:text-2xl">Automations</h1>
        <p class="mt-1 max-w-2xl text-xs leading-5 text-foreground/55 sm:text-sm">Manage comment reply and comment-to-DM rules created for your Instagram posts.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" @click="showAccountsModal = true" class="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/15 sm:px-4 sm:py-2.5">
          <Instagram class="h-4 w-4" />
          {{ accounts?.length || 0 }} connected account{{ (accounts?.length || 0) === 1 ? '' : 's' }}
        </button>
        <NuxtLink to="/dashboard/integrations/instagram/setup" class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/10 transition-all hover:bg-primary-accent sm:px-4 sm:py-2.5">
          <Plus class="h-4 w-4" />
          New automation
        </NuxtLink>
      </div>
    </div>

    <div v-if="!hasMounted || isLoading" class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5">
      <div class="h-4 w-48 animate-pulse rounded bg-foreground/10" />
      <div class="mt-6 grid gap-3">
        <div v-for="item in 5" :key="item" class="h-20 animate-pulse rounded-xl bg-foreground/5" />
      </div>
    </div>

    <div v-else-if="automations.length" class="overflow-hidden rounded-2xl border border-foreground/10 bg-background shadow-[0_12px_34px_rgba(0,0,0,0.04)]">
      <div class="flex flex-col gap-3 border-b border-foreground/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-xs font-black uppercase tracking-widest text-foreground sm:text-sm">Created automations</h2>
          <p class="mt-1 text-xs text-foreground/50">Showing {{ pageStart }}-{{ pageEnd }} of {{ automations.length }} rule{{ automations.length === 1 ? '' : 's' }}.</p>
        </div>
        <button type="button" @click="refresh()" class="self-start rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/50 transition-all hover:bg-foreground/10 hover:text-foreground sm:self-auto">
          Refresh
        </button>
      </div>

      <div class="divide-y divide-foreground/5">
        <article v-for="automation in paginatedAutomations" :key="automation.id" class="grid gap-3 p-3 transition-colors hover:bg-foreground/[0.025] sm:p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div class="grid min-w-0 grid-cols-[56px_minmax(0,1fr)] gap-3 sm:grid-cols-[64px_minmax(0,1fr)]">
            <div class="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-foreground/10 bg-foreground/[0.04] sm:h-16 sm:w-16">
              <img :src="`/api/instagram/${automation.account.id}/posts/${automation.post.id}/asset`" :alt="postLabel(automation.post)" class="h-full w-full object-cover" loading="lazy" />
              <span v-if="automation.post.media_type" class="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[6px] font-black uppercase tracking-widest text-white">{{ automation.post.media_type }}</span>
            </div>

            <div class="min-w-0 space-y-2">
              <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                <span class="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
                  <CheckCircle2 v-if="automation.trigger.is_active" class="h-3 w-3" />
                  {{ automation.trigger.is_active ? 'Active' : 'Paused' }}
                </span>
                <span class="rounded-full border border-foreground/10 bg-foreground/[0.03] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-foreground/50">{{ modeLabel(automation.trigger) }}</span>
                <span class="rounded-full border border-foreground/10 bg-foreground/[0.03] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-foreground/50">@{{ automation.account.username }}</span>
              </div>

              <div class="min-w-0">
                <h3 class="line-clamp-1 text-sm font-black text-foreground sm:text-base">{{ postLabel(automation.post) }}</h3>
                <p class="mt-0.5 truncate text-[11px] font-semibold text-foreground/50">Keyword: <span class="text-foreground/70">{{ keywordsLabel(automation.trigger) }}</span></p>
              </div>

              <div class="grid gap-1.5 text-[10px] font-bold text-foreground/55 sm:grid-cols-3">
                <div class="min-w-0 rounded-lg border border-foreground/10 bg-foreground/[0.02] px-2 py-1.5">
                  <span class="block text-[7px] font-black uppercase tracking-widest text-foreground/35">Assistant</span>
                  <span class="block truncate">{{ automation.trigger.chatbots?.name || 'Not mapped' }}</span>
                </div>
                <div class="rounded-lg border border-foreground/10 bg-foreground/[0.02] px-2 py-1.5">
                  <span class="block text-[7px] font-black uppercase tracking-widest text-foreground/35">Sent</span>
                  {{ sentCount(automation) }}
                </div>
                <div class="rounded-lg border border-foreground/10 bg-foreground/[0.02] px-2 py-1.5">
                  <span class="block text-[7px] font-black uppercase tracking-widest text-foreground/35">Failed</span>
                  {{ failedCount(automation) }}
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 pl-[68px] sm:pl-20 lg:justify-end lg:pl-0">
            <NuxtLink :to="`/dashboard/integrations/instagram/${automation.account.id}`" class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-foreground/60 transition-all hover:bg-foreground/[0.06] hover:text-foreground">
              <Settings class="h-3.5 w-3.5" />
              Manage
            </NuxtLink>
            <NuxtLink :to="`/dashboard/integrations/instagram/setup?accountId=${automation.account.id}`" class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[9px] font-black uppercase tracking-widest text-black transition-all hover:bg-primary-accent">
              <Zap class="h-3.5 w-3.5" />
              Edit
            </NuxtLink>
            <a v-if="automation.post.permalink" :href="automation.post.permalink" target="_blank" rel="noopener noreferrer" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/[0.03] text-foreground/50 transition-all hover:bg-foreground/[0.06] hover:text-foreground" aria-label="Open Instagram post">
              <ExternalLink class="h-3.5 w-3.5" />
            </a>
          </div>
        </article>
      </div>

      <div class="flex flex-col gap-3 border-t border-foreground/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-xs font-semibold text-foreground/45">Page {{ currentPage }} of {{ pageCount }} · 5 automations per page</p>
        <div class="flex items-center gap-2">
          <button type="button" @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 text-[9px] font-black uppercase tracking-widest text-foreground/55 transition-all hover:bg-foreground/[0.06] disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronLeft class="h-3.5 w-3.5" /> Prev
          </button>
          <button v-for="page in pageCount" :key="page" type="button" @click="goToPage(page)" class="hidden h-9 min-w-9 rounded-lg border px-3 text-[10px] font-black transition-all sm:inline-flex sm:items-center sm:justify-center" :class="page === currentPage ? 'border-primary/30 bg-primary text-black' : 'border-foreground/10 bg-foreground/[0.03] text-foreground/55 hover:bg-foreground/[0.06]'">
            {{ page }}
          </button>
          <button type="button" @click="goToPage(currentPage + 1)" :disabled="currentPage === pageCount" class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 text-[9px] font-black uppercase tracking-widest text-foreground/55 transition-all hover:bg-foreground/[0.06] disabled:cursor-not-allowed disabled:opacity-40">
            Next <ChevronRight class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center rounded-[24px] border border-dashed border-foreground/10 bg-foreground/[0.01] px-6 py-16 text-center">
      <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <MessageCircle class="h-9 w-9 text-primary" />
      </div>
      <h3 class="text-xl font-black uppercase tracking-tight text-foreground">No automations yet</h3>
      <p class="mt-3 max-w-md text-sm leading-6 text-foreground/50">Create a post rule to reply to comments, send a DM to the commenter, or do both.</p>
      <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <NuxtLink to="/dashboard/integrations/instagram/setup" class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/10 transition-all hover:bg-primary-accent">
          <Zap class="h-4 w-4" />
          Create automation
        </NuxtLink>
        <button type="button" @click="startInstagramOAuth" :disabled="oauthLoading" class="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-6 py-3 text-[11px] font-black uppercase tracking-widest text-foreground/60 transition-all hover:bg-foreground/[0.06] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60">
          <Instagram class="h-4 w-4" />
          {{ oauthLoading ? 'Opening Instagram...' : 'Connect account' }}
        </button>
      </div>
      <p v-if="accountsError" class="mt-4 max-w-lg rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs font-bold leading-5 text-red-300">
        Could not load Instagram automations. Refresh the page or sign in again on this domain.
      </p>
    </div>

    <Teleport to="body">
      <div v-if="showAccountsModal" class="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center" @click.self="showAccountsModal = false">
        <div class="max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-[26px] border border-foreground/10 bg-background shadow-2xl shadow-black/25">
          <div class="flex flex-col gap-3 border-b border-foreground/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Connected accounts</p>
              <h2 class="mt-1 text-lg font-black text-foreground">{{ accounts?.length || 0 }} Instagram account{{ (accounts?.length || 0) === 1 ? '' : 's' }}</h2>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" @click="startInstagramOAuth" :disabled="oauthLoading" class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-60 sm:px-4">
                <Plus class="h-3.5 w-3.5" />
                {{ oauthLoading ? 'Opening...' : 'Connect another' }}
              </button>
              <button type="button" @click="showAccountsModal = false" class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.03] text-foreground/50 transition-all hover:bg-foreground/[0.06] hover:text-foreground" aria-label="Close accounts modal">
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>

          <div class="max-h-[62vh] overflow-y-auto p-4">
            <div v-if="accounts?.length" class="space-y-3">
              <div v-for="account in accounts" :key="account.id" class="flex flex-col gap-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex min-w-0 items-center gap-3">
                  <img :src="`/api/instagram/${account.id}/profile-picture`" :alt="`@${account.username}`" class="h-11 w-11 rounded-xl border border-primary/15 bg-primary/10 object-cover" />
                  <div class="min-w-0">
                    <p class="truncate text-sm font-black text-foreground">@{{ account.username }}</p>
                    <p class="mt-1 max-w-lg truncate font-mono text-[10px] text-foreground/40">IG {{ account.instagram_account_id }} · {{ account.posts?.length || 0 }} synced post{{ (account.posts?.length || 0) === 1 ? '' : 's' }}</p>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-2 sm:justify-end">
                  <NuxtLink :to="`/dashboard/integrations/instagram/${account.id}`" @click="showAccountsModal = false" class="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/60 transition-all hover:bg-foreground/[0.06] hover:text-foreground">
                    <Settings class="h-3.5 w-3.5" /> Manage
                  </NuxtLink>
                  <NuxtLink :to="`/dashboard/integrations/instagram/setup?accountId=${account.id}`" @click="showAccountsModal = false" class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-primary-accent">
                    <Plus class="h-3.5 w-3.5" /> Setup
                  </NuxtLink>
                  <button type="button" @click="startInstagramOAuth" :disabled="oauthLoading" class="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60">
                    <Instagram class="h-3.5 w-3.5" /> Reconnect
                  </button>
                  <button type="button" @click="disconnectAccount(account.id)" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/10 text-red-400 transition-all hover:bg-red-400/15" aria-label="Disconnect Instagram account">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-foreground/10 px-6 py-10 text-center">
              <Instagram class="mb-3 h-10 w-10 text-primary" />
              <p class="text-sm font-black uppercase tracking-widest text-foreground">No accounts connected</p>
              <p class="mt-2 max-w-sm text-xs leading-5 text-foreground/50">Connect an Instagram business account before creating automations.</p>
              <button type="button" @click="startInstagramOAuth" :disabled="oauthLoading" class="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-60">
                <Instagram class="h-4 w-4" />
                {{ oauthLoading ? 'Opening Instagram...' : 'Connect account' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
