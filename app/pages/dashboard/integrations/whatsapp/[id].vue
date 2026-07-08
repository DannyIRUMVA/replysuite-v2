<script setup lang="ts">
import {
  ArrowLeft,
  Activity,
  Bot,
  CheckCircle2,
  Clock3,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Trash2,
  Zap
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const route = useRoute()
const accountId = route.params.id as string
const { setInteracting, planSlug, userId } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()
const isLocked = computed(() => planSlug.value === 'starter' || !planSlug.value)

const waAccount = ref<any>(null)
const isLoading = ref(true)
const isUpdating = ref(false)

const { data: agentsData } = useAsyncData('agents-list-whatsapp-config', async () => {
  if (!userId.value) return []
  const { data } = await supabase
    .from('chatbots')
    .select('id, name')
    .eq('user_id', userId.value)
    .is('deleted_at', null)
    .order('name')
  return data || []
}, { watch: [userId], server: false })
const agents = computed(() => agentsData.value || [])

const selectedAssistantName = computed(() => {
  const agent = agents.value.find((item: any) => item.id === waAccount.value?.chatbot_id)
  return agent?.name || null
})

const isLive = computed(() => waAccount.value?.status === 'deployed' || waAccount.value?.status === 'active')
const isPending = computed(() => !isLive.value)

const statusLabel = computed(() => {
  if (isLive.value) return 'Live'
  if (waAccount.value?.status === 'failed') return 'Needs attention'
  return 'Pending setup'
})

const statusDetail = computed(() => {
  if (isLive.value) return 'AI replies can run on this WhatsApp number.'
  if (waAccount.value?.status === 'failed') return 'ReplySuite needs to review this connection before it can go live.'
  return 'ReplySuite is finishing the technical WhatsApp setup for this number.'
})

const statusToneClass = computed(() => {
  if (isLive.value) return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
  if (waAccount.value?.status === 'failed') return 'border-red-400/20 bg-red-400/10 text-red-300'
  return 'border-amber-400/20 bg-amber-400/10 text-amber-300'
})

const statusIcon = computed(() => {
  if (isLive.value) return CheckCircle2
  if (waAccount.value?.status === 'failed') return HelpCircle
  return Clock3
})

const connectionHealth = computed(() => [
  {
    label: 'Number received',
    value: waAccount.value?.phone_number || '—',
    detail: 'Saved for connection setup',
    done: Boolean(waAccount.value?.phone_number),
    icon: Smartphone,
  },
  {
    label: 'Reply assistant',
    value: selectedAssistantName.value || 'Not selected',
    detail: selectedAssistantName.value ? 'Assigned to this line' : 'Choose who should reply',
    done: Boolean(waAccount.value?.chatbot_id),
    icon: Bot,
  },
  {
    label: 'Technical setup',
    value: isLive.value ? 'Complete' : 'In progress',
    detail: isLive.value ? 'Connection is ready' : 'ReplySuite is handling this step',
    done: isLive.value,
    icon: ShieldCheck,
  },
])

const fetchAccount = async () => {
  if (isLocked.value || !userId.value) {
    isLoading.value = false
    return
  }

  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', userId.value)
      .single()

    if (error) throw error
    waAccount.value = data
  } catch (err: any) {
    notify.error('Failed to load WhatsApp number.')
    navigateTo('/dashboard/integrations/whatsapp')
  } finally {
    isLoading.value = false
  }
}

const updateMapping = async (chatbotId: string | null) => {
  if (isUpdating.value || !userId.value) return

  if (chatbotId && !agents.value.some((agent: any) => agent.id === chatbotId)) {
    notify.error('Choose one of your own assistants for this WhatsApp number.')
    return
  }

  isUpdating.value = true
  try {
    const { error } = await supabase
      .from('whatsapp_accounts')
      .update({ chatbot_id: chatbotId, updated_at: new Date().toISOString() })
      .eq('id', accountId)
      .eq('user_id', userId.value)

    if (error) throw error
    notify.success('Reply assistant updated.')
    await fetchAccount()
  } catch (err: any) {
    notify.error(err?.message || 'Could not update the reply assistant.')
  } finally {
    isUpdating.value = false
  }
}

const deleteAccount = async () => {
  if (!(await notify.confirm('Disconnect this number?'))) return
  if (!userId.value) return
  const { error } = await supabase.from('whatsapp_accounts').delete().eq('id', accountId).eq('user_id', userId.value)
  if (!error) {
    notify.success('Disconnected successfully.')
    navigateTo('/dashboard/integrations/whatsapp')
  }
}

onMounted(fetchAccount)

useHead({
  title: computed(() => waAccount.value ? `${waAccount.value.phone_number} | WhatsApp` : 'WhatsApp number')
})
</script>

<template>
  <WhatsAppUpgradeGate
    v-if="isLocked"
    title="Upgrade to manage WhatsApp"
    description="Upgrade to manage WhatsApp numbers and let your assistant reply from approved lines."
    back-to="/dashboard"
    back-label="Back to dashboard"
  />

  <div v-else class="w-full space-y-5 pb-24 pt-3 lg:pb-7">
    <NuxtLink to="/dashboard/integrations/whatsapp" class="dashboard-action-label inline-flex items-center gap-1.5 text-foreground/45 transition hover:text-primary">
      <ArrowLeft class="h-3.5 w-3.5" />
      Back to WhatsApp
    </NuxtLink>

    <template v-if="isLoading">
      <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
        <Skeleton width="10rem" height="0.8rem" class="mb-3" />
        <Skeleton width="18rem" height="1.3rem" class="mb-5" />
        <Skeleton height="14rem" radius="0.39rem" />
      </section>
    </template>

    <main v-else-if="waAccount" class="space-y-5">
      <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0">
            <p class="dashboard-eyebrow text-primary/80">WhatsApp number</p>
            <div class="mt-2 flex flex-wrap items-center gap-3">
              <h1 class="dashboard-section-title truncate">{{ waAccount.phone_number }}</h1>
              <span :class="['inline-flex items-center gap-1.5 rounded-[0.35rem] border px-2.5 py-1 text-[11px] font-bold', statusToneClass]">
                <component :is="statusIcon" class="h-3.5 w-3.5" />
                {{ statusLabel }}
              </span>
            </div>
            <p class="dashboard-muted mt-2 max-w-2xl">{{ statusDetail }}</p>
          </div>

          <button type="button" class="dashboard-action-label inline-flex w-fit items-center justify-center gap-1.5 rounded-[0.39rem] border border-red-400/20 bg-red-400/10 px-3 py-2 text-red-300 transition hover:bg-red-400/15" @click="deleteAccount">
            <Trash2 class="h-3.5 w-3.5" />
            Disconnect
          </button>
        </div>
      </section>

      <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
          <div class="mb-5">
            <p class="dashboard-eyebrow text-primary/80">Reply assistant</p>
            <h2 class="dashboard-section-title mt-2">Choose who replies</h2>
            <p class="dashboard-muted mt-1">This assistant will handle incoming WhatsApp conversations once the number is live.</p>
          </div>

          <div class="space-y-4">
            <div>
              <label class="dashboard-eyebrow mb-2 block">Assigned assistant</label>
              <select
                :value="waAccount.chatbot_id || ''"
                class="w-full cursor-pointer rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 py-2.5 text-sm font-semibold text-foreground outline-none transition focus:border-primary/40"
                :disabled="isUpdating"
                @focus="setInteracting(true)"
                @blur="setInteracting(false)"
                @change="(event: any) => updateMapping(event.target.value || null)"
              >
                <option value="" class="bg-background">No assistant selected</option>
                <option v-for="agent in agents" :key="agent.id" :value="agent.id" class="bg-background">{{ agent.name }}</option>
              </select>
            </div>

            <div :class="['rounded-[0.39rem] border p-3', waAccount.chatbot_id ? 'border-emerald-400/20 bg-emerald-400/10' : 'border-amber-400/20 bg-amber-400/10']">
              <div class="flex items-start gap-2.5">
                <MessageSquare :class="['mt-0.5 h-4 w-4 shrink-0', waAccount.chatbot_id ? 'text-emerald-300' : 'text-amber-300']" />
                <div>
                  <p class="text-sm font-bold text-foreground">{{ waAccount.chatbot_id ? 'Assistant assigned' : 'Assistant needed' }}</p>
                  <p class="dashboard-muted mt-0.5">{{ waAccount.chatbot_id ? 'ReplySuite knows which assistant should answer on this number.' : 'Choose an assistant before this number goes live.' }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside class="space-y-3 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
          <div>
            <p class="dashboard-eyebrow text-primary/80">Connection health</p>
            <h2 class="dashboard-section-title mt-2">Setup progress</h2>
            <p class="dashboard-muted mt-1">ReplySuite handles the technical steps behind the scenes.</p>
          </div>

          <div class="space-y-2">
            <div v-for="item in connectionHealth" :key="item.label" class="rounded-[0.39rem] border border-foreground/10 bg-background/35 p-3">
              <div class="flex items-start gap-2.5">
                <div :class="['flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] ring-1', item.done ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20' : 'bg-amber-400/10 text-amber-300 ring-amber-400/20']">
                  <component :is="item.icon" class="h-4 w-4" />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-bold text-foreground">{{ item.value }}</p>
                  <p class="mt-0.5 text-[11px] font-semibold text-foreground/55">{{ item.label }}</p>
                  <p class="dashboard-muted mt-0.5">{{ item.detail }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="isPending" class="rounded-[0.39rem] border border-primary/15 bg-primary/5 p-3">
            <div class="flex items-start gap-2">
              <Zap class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p class="dashboard-muted">This number is saved. ReplySuite will finish the manual connection setup and update the status when it is live.</p>
            </div>
          </div>

          <div v-else class="rounded-[0.39rem] border border-emerald-400/20 bg-emerald-400/10 p-3">
            <div class="flex items-start gap-2">
              <Activity class="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <p class="dashboard-muted">This WhatsApp line is live and ready for assistant replies.</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>
