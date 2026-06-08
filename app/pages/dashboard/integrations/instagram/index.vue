<script setup lang="ts">
import {
  Bot,
  Instagram,
  MoreVertical,
  Plus,
  Send,
  Settings,
  Trash2,
  Zap
} from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
useHead({ title: 'Instagram Channels' })

const { plan, isLoading: isPlanLoading } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()
const isLocked = computed(() => !(plan.value as any)?.instagram_access)
const openActionMenuId = ref<string | null>(null)
const actionMenuPosition = ref({ top: 0, left: 0 })
const hasMounted = ref(false)
const oauthLoading = ref(false)

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

const totalTriggers = computed(() => (accounts.value || []).reduce((sum: number, account: any) => sum + (account.posts || []).reduce((inner: number, post: any) => inner + (post.triggers?.length || 0), 0), 0))
const totalSent = computed(() => (accounts.value || []).reduce((sum: number, account: any) => sum + (account.jobs || []).filter((job: any) => job.status === 'sent').length, 0))

const toggleActionMenu = (accountId: string, event: MouseEvent) => {
  if (openActionMenuId.value === accountId) {
    openActionMenuId.value = null
    return
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const menuWidth = 208
  actionMenuPosition.value = {
    top: rect.bottom + 8,
    left: Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)),
  }
  openActionMenuId.value = accountId
}

const disconnectAccount = async (id: string) => {
  if (!(await notify.confirm('Disconnect this Instagram account and its post automations?'))) return
  try {
    await instagramApiFetch(`/api/instagram/${id}`, { method: 'DELETE' })
    notify.success('Instagram account disconnected.')
    openActionMenuId.value = null
    await refresh()
  } catch (error: any) {
    notify.error(error?.data?.statusMessage || error?.message || 'Failed to disconnect Instagram.')
  }
}

const firstTrigger = (account: any) => account.posts?.flatMap((post: any) => post.triggers || [])?.[0]
const modeLabel = (trigger: any) => {
  if (!trigger) return 'No automation'
  if (trigger.reply_in_comment && trigger.reply_in_dm) return 'Comment + DM'
  if (trigger.reply_in_comment) return 'Comment reply'
  if (trigger.reply_in_dm) return 'Comment-to-DM'
  return 'Paused'
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

  <div v-else class="w-full space-y-6 pb-20 pt-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Instagram Channel</p>
        <h1 class="mt-1 text-2xl font-black tracking-tight text-foreground">Post comment automation</h1>
        <p class="mt-1 max-w-2xl text-sm text-foreground/55">Connect an Instagram business account, select a post, and choose whether ReplySuite replies publicly, sends a private DM, or does both.</p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" @click="startInstagramOAuth" :disabled="oauthLoading" class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/10 transition-all hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-60">
          <Instagram class="h-4 w-4" />
          {{ oauthLoading ? 'Opening Instagram...' : 'Add Instagram Account' }}
        </button>
        <NuxtLink to="/dashboard/integrations/instagram/setup" class="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-foreground/60 transition-all hover:bg-foreground/[0.06] hover:text-foreground">
          <Plus class="h-4 w-4" />
          Continue setup
        </NuxtLink>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div v-for="stat in [
        { label: 'Accounts', value: accounts?.length || 0, icon: Instagram },
        { label: 'Sent Actions', value: totalSent, icon: Send }
      ]" :key="stat.label" class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
            <component :is="stat.icon" class="h-5 w-5 text-primary" />
          </div>
          <div>
            <p class="text-[9px] font-black uppercase tracking-widest text-foreground/45">{{ stat.label }}</p>
            <p class="mt-0.5 text-xl font-black text-foreground">{{ stat.value }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!hasMounted || isLoading" class="rounded-[24px] border border-foreground/10 bg-foreground/[0.02] p-8">
      <div class="h-4 w-48 animate-pulse rounded bg-foreground/10" />
      <div class="mt-6 grid gap-3">
        <div v-for="item in 3" :key="item" class="h-20 animate-pulse rounded-2xl bg-foreground/5" />
      </div>
    </div>

    <div v-else-if="accounts?.length" class="overflow-hidden rounded-[24px] border border-foreground/10 bg-background shadow-[0_18px_50px_rgba(0,0,0,0.05)]">
      <div class="flex items-center justify-between border-b border-foreground/5 p-5">
        <div>
          <h3 class="text-sm font-black uppercase tracking-widest text-foreground">Instagram accounts</h3>
          <p class="mt-1 text-xs text-foreground/50">{{ totalTriggers }} active post trigger{{ totalTriggers === 1 ? '' : 's' }} configured.</p>
        </div>
      </div>

      <div class="divide-y divide-foreground/5">
        <div v-for="account in accounts" :key="account.id" class="flex flex-col gap-4 p-5 transition-colors hover:bg-foreground/[0.025] lg:flex-row lg:items-center lg:justify-between">
          <div class="flex min-w-0 items-center gap-3">
            <img :src="`/api/instagram/${account.id}/profile-picture`" :alt="`@${account.username}`" class="h-11 w-11 rounded-xl border border-primary/15 bg-primary/10 object-cover" />
            <div class="min-w-0">
              <NuxtLink :to="`/dashboard/integrations/instagram/${account.id}`" class="truncate text-sm font-black text-foreground hover:text-primary">@{{ account.username }}</NuxtLink>
              <p class="mt-1 max-w-lg truncate font-mono text-[10px] text-foreground/40">IG {{ account.instagram_account_id }} · Page {{ account.platform_id || 'not set' }}</p>
            </div>
          </div>

          <div class="grid gap-2 text-[11px] font-bold text-foreground/55 sm:grid-cols-2 lg:min-w-[300px]">
            <div class="rounded-xl border border-foreground/10 bg-foreground/[0.02] px-3 py-2">
              <span class="block text-[8px] font-black uppercase tracking-widest text-foreground/35">Mode</span>
              {{ modeLabel(firstTrigger(account)) }}
            </div>
            <div class="rounded-xl border border-foreground/10 bg-foreground/[0.02] px-3 py-2">
              <span class="block text-[8px] font-black uppercase tracking-widest text-foreground/35">Assistant</span>
              {{ firstTrigger(account)?.chatbots?.name || 'Not mapped' }}
            </div>
          </div>

          <div class="flex items-center justify-end gap-2">
            <button type="button" @click="startInstagramOAuth" :disabled="oauthLoading" class="inline-flex items-center justify-center rounded-xl border border-primary/20 bg-primary/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60">
              Reconnect
            </button>
            <NuxtLink :to="`/dashboard/integrations/instagram/setup?accountId=${account.id}`" class="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-primary-accent">
              Continue
            </NuxtLink>
            <button @click.stop="toggleActionMenu(account.id, $event)" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/5 text-foreground/50 transition-all hover:bg-foreground/10 hover:text-foreground" aria-label="Instagram actions">
              <MoreVertical class="h-4 w-4" />
            </button>
            <Teleport to="body">
              <div v-if="openActionMenuId === account.id" class="fixed z-[120] w-52 overflow-hidden rounded-2xl border border-foreground/10 bg-background p-1.5 shadow-2xl shadow-black/15" :style="{ top: `${actionMenuPosition.top}px`, left: `${actionMenuPosition.left}px` }" @click.stop>
                <NuxtLink :to="`/dashboard/integrations/instagram/setup?accountId=${account.id}`" @click="openActionMenuId = null" class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-primary transition-all hover:bg-primary/10">
                  <Plus class="h-3.5 w-3.5" /> Continue setup
                </NuxtLink>
                <button type="button" @click="openActionMenuId = null; startInstagramOAuth()" class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-foreground/60 transition-all hover:bg-foreground/5 hover:text-foreground">
                  <Settings class="h-3.5 w-3.5" /> Reconnect
                </button>
                <NuxtLink :to="`/dashboard/integrations/instagram/${account.id}`" @click="openActionMenuId = null" class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-foreground/60 transition-all hover:bg-foreground/5 hover:text-foreground">
                  <Settings class="h-3.5 w-3.5" /> Manage
                </NuxtLink>
                <button @click="disconnectAccount(account.id)" class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-red-400 transition-all hover:bg-red-400/10">
                  <Trash2 class="h-3.5 w-3.5" /> Disconnect
                </button>
              </div>
            </Teleport>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center rounded-[24px] border border-dashed border-foreground/10 bg-foreground/[0.01] px-6 py-16 text-center">
      <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <Instagram class="h-9 w-9 text-primary" />
      </div>
      <h3 class="text-xl font-black uppercase tracking-tight text-foreground">No Instagram posts connected</h3>
      <p class="mt-3 max-w-md text-sm leading-6 text-foreground/50">Start by authorizing your Instagram business account, then pick a post for comment reply, comment-to-DM, or both.</p>
      <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="button" @click="startInstagramOAuth" :disabled="oauthLoading" class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/10 transition-all hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-60">
          <Zap class="h-4 w-4" />
          {{ oauthLoading ? 'Opening Instagram...' : 'Add Instagram Account' }}
        </button>
      </div>
      <p v-if="accountsError" class="mt-4 max-w-lg rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs font-bold leading-5 text-red-300">
        Could not load connected Instagram accounts. Refresh the page or sign in again on this domain.
      </p>
    </div>
  </div>
</template>
