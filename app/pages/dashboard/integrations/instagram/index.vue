<script setup lang="ts">
import {
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

const { plan, isLoading: isPlanLoading } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()
const isLocked = computed(() => !(plan.value as any)?.instagram_access)
const hasMounted = ref(false)
const oauthLoading = ref(false)
const showAccountsModal = ref(false)

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

  <div v-else class="w-full space-y-5 pb-20 pt-5">
    <div class="flex flex-col gap-4 rounded-[24px] border border-foreground/10 bg-foreground/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Instagram</p>
        <h1 class="mt-1 text-2xl font-black tracking-tight text-foreground">Automations</h1>
        <p class="mt-1 max-w-2xl text-sm text-foreground/55">Manage comment reply and comment-to-DM rules created for your Instagram posts.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" @click="showAccountsModal = true" class="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/15">
          <Instagram class="h-4 w-4" />
          {{ accounts?.length || 0 }} connected account{{ (accounts?.length || 0) === 1 ? '' : 's' }}
        </button>
        <NuxtLink to="/dashboard/integrations/instagram/setup" class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/10 transition-all hover:bg-primary-accent">
          <Plus class="h-4 w-4" />
          New automation
        </NuxtLink>
      </div>
    </div>

    <div v-if="!hasMounted || isLoading" class="rounded-[24px] border border-foreground/10 bg-foreground/[0.02] p-8">
      <div class="h-4 w-48 animate-pulse rounded bg-foreground/10" />
      <div class="mt-6 grid gap-3">
        <div v-for="item in 3" :key="item" class="h-24 animate-pulse rounded-2xl bg-foreground/5" />
      </div>
    </div>

    <div v-else-if="automations.length" class="overflow-hidden rounded-[24px] border border-foreground/10 bg-background shadow-[0_18px_50px_rgba(0,0,0,0.05)]">
      <div class="flex flex-col gap-2 border-b border-foreground/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-sm font-black uppercase tracking-widest text-foreground">Created automations</h2>
          <p class="mt-1 text-xs text-foreground/50">{{ automations.length }} rule{{ automations.length === 1 ? '' : 's' }} ready for comment tracking.</p>
        </div>
        <button type="button" @click="refresh()" class="self-start rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/50 transition-all hover:bg-foreground/10 hover:text-foreground sm:self-auto">
          Refresh
        </button>
      </div>

      <div class="divide-y divide-foreground/5">
        <article v-for="automation in automations" :key="automation.id" class="grid gap-4 p-5 transition-colors hover:bg-foreground/[0.025] xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div class="min-w-0 space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                <CheckCircle2 v-if="automation.trigger.is_active" class="h-3.5 w-3.5" />
                {{ automation.trigger.is_active ? 'Active' : 'Paused' }}
              </span>
              <span class="rounded-full border border-foreground/10 bg-foreground/[0.03] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-foreground/50">{{ modeLabel(automation.trigger) }}</span>
              <span class="rounded-full border border-foreground/10 bg-foreground/[0.03] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-foreground/50">@{{ automation.account.username }}</span>
            </div>

            <div>
              <h3 class="line-clamp-1 text-base font-black text-foreground">{{ postLabel(automation.post) }}</h3>
              <p class="mt-1 text-xs font-semibold text-foreground/50">Keyword: <span class="text-foreground/70">{{ keywordsLabel(automation.trigger) }}</span></p>
            </div>

            <div class="grid gap-2 text-[11px] font-bold text-foreground/55 sm:grid-cols-3">
              <div class="rounded-xl border border-foreground/10 bg-foreground/[0.02] px-3 py-2">
                <span class="block text-[8px] font-black uppercase tracking-widest text-foreground/35">Assistant</span>
                {{ automation.trigger.chatbots?.name || 'Not mapped' }}
              </div>
              <div class="rounded-xl border border-foreground/10 bg-foreground/[0.02] px-3 py-2">
                <span class="block text-[8px] font-black uppercase tracking-widest text-foreground/35">Sent</span>
                {{ sentCount(automation) }} action{{ sentCount(automation) === 1 ? '' : 's' }}
              </div>
              <div class="rounded-xl border border-foreground/10 bg-foreground/[0.02] px-3 py-2">
                <span class="block text-[8px] font-black uppercase tracking-widest text-foreground/35">Failed</span>
                {{ failedCount(automation) }} action{{ failedCount(automation) === 1 ? '' : 's' }}
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 xl:justify-end">
            <NuxtLink :to="`/dashboard/integrations/instagram/${automation.account.id}`" class="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-foreground/60 transition-all hover:bg-foreground/[0.06] hover:text-foreground">
              <Settings class="h-4 w-4" />
              Manage
            </NuxtLink>
            <NuxtLink :to="`/dashboard/integrations/instagram/setup?accountId=${automation.account.id}`" class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-primary-accent">
              <Zap class="h-4 w-4" />
              Edit setup
            </NuxtLink>
            <a v-if="automation.post.permalink" :href="automation.post.permalink" target="_blank" rel="noopener noreferrer" class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.03] text-foreground/50 transition-all hover:bg-foreground/[0.06] hover:text-foreground" aria-label="Open Instagram post">
              <ExternalLink class="h-4 w-4" />
            </a>
          </div>
        </article>
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
          <div class="flex items-center justify-between gap-3 border-b border-foreground/10 p-5">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Connected accounts</p>
              <h2 class="mt-1 text-lg font-black text-foreground">{{ accounts?.length || 0 }} Instagram account{{ (accounts?.length || 0) === 1 ? '' : 's' }}</h2>
            </div>
            <button type="button" @click="showAccountsModal = false" class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.03] text-foreground/50 transition-all hover:bg-foreground/[0.06] hover:text-foreground" aria-label="Close accounts modal">
              <X class="h-4 w-4" />
            </button>
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
