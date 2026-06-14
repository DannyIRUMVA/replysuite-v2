<script setup lang="ts">
import { ArrowLeft, Bot, CheckCircle2, Instagram, Loader2, MessageCircle, RefreshCcw, Save, Send, Trash2 } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
useHead({ title: 'Instagram Configuration' })

const route = useRoute()
const accountId = route.params.id as string
const { canUseInstagramWorkflow } = usePlanAccess()
const supabase = useSupabaseClient()
const notify = useNotify()
const isLocked = computed(() => !canUseInstagramWorkflow.value)
const canPublicComment = canUseInstagramWorkflow
const isSaving = ref(false)
const isTesting = ref(false)
const testResult = ref<any>(null)

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

const { data: accounts, pending: isLoading, refresh } = await useAsyncData(`instagram-account-${accountId}`, async () => {
  return await instagramApiFetch<any[]>('/api/instagram/accounts')
}, { server: false, default: () => [] })

const account = computed(() => (accounts.value || []).find((item: any) => item.id === accountId) || null)
const post = computed(() => (account.value?.posts || []).find((item: any) => item.triggers?.length) || account.value?.posts?.[0] || null)
const trigger = computed(() => post.value?.triggers?.[0] || null)
const comments = computed(() => post.value?.comments || [])

const form = reactive({
  triggerId: '',
  postId: '',
  chatbotId: '',
  keywords: '',
  replyInComment: false,
  replyInDm: true,
  dmTemplate: '',
  isActive: true,
})

const { data: agents } = await useAsyncData('instagram-config-agents', async () => {
  const { data } = await supabase
    .from('chatbots')
    .select('id, name')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  return data || []
})

watch([account, post, trigger], () => {
  if (!post.value || !trigger.value) return
  form.triggerId = trigger.value.id
  form.postId = post.value.id
  form.chatbotId = trigger.value.chatbot_id || agents.value?.[0]?.id || ''
  form.keywords = Array.isArray(trigger.value.keywords) ? trigger.value.keywords.join(', ') : ''
  form.replyInComment = Boolean(trigger.value.reply_in_comment && canPublicComment.value)
  form.replyInDm = Boolean(trigger.value.reply_in_dm)
  form.dmTemplate = trigger.value.dm_template || ''
  form.isActive = Boolean(trigger.value.is_active)
}, { immediate: true })

watch(canPublicComment, (allowed) => {
  if (!allowed) form.replyInComment = false
})

const save = async () => {
  if (!form.triggerId || !form.postId || !form.chatbotId) {
    notify.warn('This account needs a post trigger and assistant mapping.')
    return
  }
  if (!form.replyInComment && !form.replyInDm) {
    notify.warn('Enable at least one reply mode.')
    return
  }

  isSaving.value = true
  try {
    await instagramApiFetch(`/api/instagram/${accountId}`, {
      method: 'PATCH',
      body: {
        triggerId: form.triggerId,
        postId: form.postId,
        chatbotId: form.chatbotId,
        keywords: form.keywords,
        replyInComment: form.replyInComment,
        replyInDm: form.replyInDm,
        dmTemplate: form.dmTemplate,
        isActive: form.isActive,
      }
    })
    notify.success('Instagram automation updated. Testing matching comments now.')
    await refresh()
    await testRule()
  } catch (error: any) {
    notify.error(error?.data?.statusMessage || error?.message || 'Failed to update Instagram automation.')
  } finally {
    isSaving.value = false
  }
}

const disconnect = async () => {
  if (!(await notify.confirm('Disconnect this Instagram account and delete its post automations?'))) return
  try {
    await instagramApiFetch(`/api/instagram/${accountId}`, { method: 'DELETE' })
    notify.success('Instagram account disconnected.')
    navigateTo('/dashboard/integrations/instagram')
  } catch (error: any) {
    notify.error(error?.data?.statusMessage || error?.message || 'Failed to disconnect Instagram.')
  }
}

const testRule = async () => {
  if (!form.postId) {
    notify.warn('No selected post to test.')
    return
  }

  isTesting.value = true
  testResult.value = null
  try {
    const response = await instagramApiFetch<any>(`/api/instagram/${accountId}/sync-comments`, {
      method: 'POST',
      body: { postId: form.postId },
    })
    testResult.value = response
    notify.success(`Checked ${response?.found || 0} comment${response?.found === 1 ? '' : 's'} on this post.`)
    await refresh()
  } catch (error: any) {
    notify.error(error?.data?.statusMessage || error?.message || 'Failed to test Instagram rule.')
  } finally {
    isTesting.value = false
  }
}

const jobStats = computed(() => {
  const jobs = account.value?.jobs || []
  return {
    sent: jobs.filter((job: any) => job.status === 'sent').length,
    failed: jobs.filter((job: any) => job.status === 'failed').length,
    commentReplies: jobs.filter((job: any) => job.payload?.action_type === 'comment_reply').length,
    dmReplies: jobs.filter((job: any) => job.payload?.action_type === 'comment_to_dm').length,
  }
})
</script>

<template>
  <WhatsAppUpgradeGate
    v-if="isLocked"
    title="Upgrade to manage Instagram"
    description="Instagram management requires a plan with Instagram automation access."
    back-to="/dashboard"
    back-label="Back to dashboard"
  />

  <div v-else class="w-full space-y-8 pb-20">
    <NuxtLink to="/dashboard/integrations/instagram" class="dashboard-back-link group mb-2">
      <ArrowLeft class="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
      Back to Instagram
    </NuxtLink>

    <div v-if="isLoading" class="space-y-4">
      <div class="h-28 animate-pulse rounded-[24px] bg-foreground/5" />
      <div class="h-80 animate-pulse rounded-[24px] bg-foreground/5" />
    </div>

    <main v-else-if="account" class="space-y-8">
      <section class="flex flex-col gap-5 rounded-[24px] border border-foreground/10 bg-foreground/[0.03] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-4">
          <img :src="`/api/instagram/${account.id}/profile-picture`" alt="" class="h-14 w-14 rounded-2xl border border-primary/15 bg-primary/10 object-cover" />
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Instagram account</p>
            <h1 class="mt-1 text-2xl font-black tracking-tight text-foreground">@{{ account.username }}</h1>
            <p class="mt-1 font-mono text-[11px] text-foreground/40">{{ account.instagram_account_id }}</p>
          </div>
        </div>
        <button @click="disconnect" class="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-400 transition-all hover:bg-red-400 hover:text-white">
          <Trash2 class="h-4 w-4" /> Disconnect
        </button>
      </section>

      <div class="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div class="space-y-8">
          <section class="rounded-[24px] border border-foreground/10 bg-background p-6 sm:p-8">
          <div class="mb-8 flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10">
              <Bot class="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 class="text-lg font-black uppercase tracking-tight text-foreground">Post automation</h2>
              <p class="text-xs text-foreground/50">Configure how this specific Instagram post responds to comments.</p>
            </div>
          </div>

          <div v-if="post && trigger" class="space-y-5">
            <div class="flex gap-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
              <div class="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.04]">
                <img :src="`/api/instagram/${account.id}/posts/${post.id}/asset`" :alt="post.caption || 'Instagram post asset'" class="h-full w-full object-cover" loading="lazy" />
                <span v-if="post.media_type" class="absolute bottom-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-white">{{ post.media_type }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] font-black uppercase tracking-widest text-foreground/40">Connected post</p>
                <p class="mt-1 truncate font-mono text-xs font-bold text-foreground">{{ post.id }}</p>
                <a v-if="post.permalink" :href="post.permalink" target="_blank" class="mt-2 inline-block text-xs font-bold text-primary hover:underline">Open on Instagram</a>
                <p v-if="post.caption" class="mt-3 line-clamp-3 text-xs leading-5 text-foreground/55">{{ post.caption }}</p>
              </div>
            </div>

            <label class="block space-y-2">
              <span class="text-[10px] font-black uppercase tracking-widest text-foreground/50">Assistant</span>
              <select v-model="form.chatbotId" class="w-full rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3 text-sm font-bold outline-none transition-all focus:border-primary/50">
                <option v-for="agent in agents" :key="agent.id" :value="agent.id">{{ agent.name }}</option>
              </select>
            </label>

            <label class="block space-y-2">
              <span class="text-[10px] font-black uppercase tracking-widest text-foreground/50">Keywords</span>
              <input v-model="form.keywords" class="w-full rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3 text-sm font-bold outline-none transition-all focus:border-primary/50" placeholder="Leave empty for all comments" />
            </label>

            <div class="grid gap-3 sm:grid-cols-2">
              <label class="flex cursor-pointer items-start gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4" :class="!canPublicComment ? 'opacity-50' : ''">
                <input v-model="form.replyInComment" :disabled="!canPublicComment" type="checkbox" class="mt-1 h-4 w-4 accent-primary" />
                <span>
                  <span class="block text-xs font-black uppercase tracking-widest text-foreground">Comment reply</span>
                  <span class="mt-1 block text-xs leading-5 text-foreground/50">Reply publicly under matching comments.</span>
                </span>
              </label>
              <label class="flex cursor-pointer items-start gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
                <input v-model="form.replyInDm" type="checkbox" class="mt-1 h-4 w-4 accent-primary" />
                <span>
                  <span class="block text-xs font-black uppercase tracking-widest text-foreground">Comment-to-DM</span>
                  <span class="mt-1 block text-xs leading-5 text-foreground/50">Send a private reply to the commenter.</span>
                </span>
              </label>
            </div>

            <label class="block space-y-2">
              <span class="text-[10px] font-black uppercase tracking-widest text-foreground/50">DM template</span>
              <textarea v-model="form.dmTemplate" rows="4" class="w-full rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3 text-sm font-bold outline-none transition-all focus:border-primary/50" placeholder="Leave empty for AI-generated DMs. Use {{comment}} for the comment text." />
            </label>

            <label class="flex cursor-pointer items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
              <input v-model="form.isActive" type="checkbox" class="h-4 w-4 accent-primary" />
              <span class="text-xs font-black uppercase tracking-widest text-foreground">Automation active</span>
            </label>

            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button @click="testRule" :disabled="isTesting || !form.postId" class="inline-flex items-center justify-center gap-3 rounded-[1.25rem] border border-primary/20 bg-primary/10 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/15 disabled:opacity-50">
                <Loader2 v-if="isTesting" class="h-4 w-4 animate-spin" />
                <RefreshCcw v-else class="h-4 w-4" />
                Test comments
              </button>
              <button @click="save" :disabled="isSaving" class="inline-flex items-center justify-center gap-3 rounded-[1.25rem] bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/10 transition-all hover:bg-primary-accent disabled:opacity-50">
                <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
                <Save v-else class="h-4 w-4" />
                Save Automation
              </button>
            </div>

            <div v-if="testResult" class="space-y-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-xs font-bold leading-5 text-foreground/60">
              <p>Test checked {{ testResult.found || 0 }} comment{{ testResult.found === 1 ? '' : 's' }}, processed {{ testResult.processed || 0 }}, sent {{ testResult.sent || 0 }}, failed {{ testResult.failed || 0 }}.</p>
              <div v-if="testResult.deliveries?.length" class="space-y-2">
                <div v-for="delivery in testResult.deliveries" :key="delivery.id" class="rounded-xl border border-foreground/10 bg-background/70 p-3">
                  <div class="flex items-center justify-between gap-3">
                    <span class="font-black uppercase tracking-widest text-foreground/45">{{ delivery.action || 'action' }}</span>
                    <span class="rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest" :class="delivery.status === 'sent' ? 'bg-emerald-400/10 text-emerald-500' : 'bg-red-400/10 text-red-500'">{{ delivery.status }}</span>
                  </div>
                  <p v-if="delivery.error" class="mt-2 text-red-500">{{ delivery.error }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="rounded-2xl border border-dashed border-foreground/10 p-8 text-center">
            <MessageCircle class="mx-auto h-8 w-8 text-foreground/35" />
            <h3 class="mt-4 text-sm font-black uppercase tracking-widest text-foreground">No post trigger found</h3>
            <p class="mt-2 text-xs text-foreground/50">Connect a post again from setup to create the missing trigger.</p>
          </div>
        </section>

        <section class="rounded-[24px] border border-foreground/10 bg-background p-6 sm:p-8">
          <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-lg font-black uppercase tracking-tight text-foreground">Post comments</h2>
              <p class="text-xs text-foreground/50">Comments saved for the selected post rule.</p>
            </div>
            <button @click="testRule" :disabled="isTesting || !form.postId" class="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/15 disabled:opacity-50">
              <Loader2 v-if="isTesting" class="h-4 w-4 animate-spin" />
              <RefreshCcw v-else class="h-4 w-4" />
              Test / refresh
            </button>
          </div>

          <div v-if="comments.length" class="space-y-3">
            <div v-for="comment in comments" :key="comment.id" class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-xs font-black text-foreground">{{ comment.commenter_username ? `@${comment.commenter_username}` : 'Instagram user' }}</p>
                  <p class="mt-1 text-sm font-bold leading-6 text-foreground/75">{{ comment.comment_text }}</p>
                </div>
                <span class="shrink-0 rounded-full bg-foreground/5 px-2.5 py-1 text-[10px] font-black text-foreground/40">Saved</span>
              </div>
              <p class="mt-2 truncate font-mono text-[10px] text-foreground/35">{{ comment.comment_id }}</p>
            </div>
          </div>

          <div v-else class="rounded-2xl border border-dashed border-foreground/10 bg-foreground/[0.02] p-6 text-center">
            <MessageCircle class="mx-auto h-7 w-7 text-foreground/30" />
            <p class="mt-3 text-sm font-black text-foreground">No comments saved yet</p>
            <p class="mt-1 text-xs leading-5 text-foreground/50">Click test / refresh to pull comments from Instagram and run the rule.</p>
          </div>
        </section>

        </div>

        <aside class="space-y-4">
          <div class="rounded-[24px] border border-foreground/10 bg-foreground/[0.03] p-6">
            <h3 class="text-[11px] font-black uppercase tracking-widest text-foreground">Delivery stats</h3>
            <div class="mt-5 grid grid-cols-2 gap-3">
              <div class="rounded-2xl border border-foreground/10 bg-background p-4">
                <CheckCircle2 class="mb-3 h-5 w-5 text-emerald-400" />
                <p class="text-[10px] font-black uppercase tracking-widest text-foreground/40">Sent</p>
                <p class="mt-1 text-xl font-black">{{ jobStats.sent }}</p>
              </div>
              <div class="rounded-2xl border border-foreground/10 bg-background p-4">
                <MessageCircle class="mb-3 h-5 w-5 text-primary" />
                <p class="text-[10px] font-black uppercase tracking-widest text-foreground/40">Comments</p>
                <p class="mt-1 text-xl font-black">{{ jobStats.commentReplies }}</p>
              </div>
              <div class="rounded-2xl border border-foreground/10 bg-background p-4">
                <Send class="mb-3 h-5 w-5 text-primary" />
                <p class="text-[10px] font-black uppercase tracking-widest text-foreground/40">DMs</p>
                <p class="mt-1 text-xl font-black">{{ jobStats.dmReplies }}</p>
              </div>
              <div class="rounded-2xl border border-foreground/10 bg-background p-4">
                <Trash2 class="mb-3 h-5 w-5 text-red-400" />
                <p class="text-[10px] font-black uppercase tracking-widest text-foreground/40">Failed</p>
                <p class="mt-1 text-xl font-black">{{ jobStats.failed }}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>

    <div v-else class="rounded-[24px] border border-foreground/10 bg-foreground/[0.02] p-10 text-center">
      <Instagram class="mx-auto h-10 w-10 text-foreground/30" />
      <h2 class="mt-4 text-lg font-black uppercase tracking-tight text-foreground">Instagram account not found</h2>
      <NuxtLink to="/dashboard/integrations/instagram" class="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black">Back to Instagram</NuxtLink>
    </div>
  </div>
</template>
