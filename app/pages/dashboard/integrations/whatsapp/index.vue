<script setup lang="ts">
import {
  Plus,
  MessageSquare,
  Smartphone,
  ShieldCheck,
  Zap,
  Settings,
  MoreVertical,
  Trash2
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { planSlug, userId } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()
const isLocked = computed(() => planSlug.value === 'starter' || !planSlug.value)
const openActionMenuId = ref<string | null>(null)
const actionMenuPosition = ref({ top: 0, left: 0 })

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

const { data: accounts, pending: isLoading, refresh } = useAsyncData('whatsapp-accounts-list', async () => {
  if (isLocked.value || !userId.value) return []
  const { data } = await supabase
    .from('whatsapp_accounts')
    .select('*, chatbots(name)')
    .eq('user_id', userId.value)
    .order('created_at', { ascending: false })
  return data || []
}, { watch: [isLocked, userId] })

const accountList = computed(() => accounts.value || [])
const linkedAssistantCount = computed(() => accountList.value.filter((item: any) => item.chatbots?.name).length)
const liveNumberCount = computed(() => accountList.value.filter((item: any) => item.status === 'deployed' || item.status === 'active').length)
const needsSetupCount = computed(() => Math.max(0, accountList.value.length - liveNumberCount.value))

const whatsappStats = computed(() => [
  {
    label: 'Connected numbers',
    value: accountList.value.length,
    detail: accountList.value.length === 1 ? 'Business line' : 'Business lines',
    icon: Smartphone,
    tone: 'primary',
  },
  {
    label: 'AI-ready',
    value: liveNumberCount.value,
    detail: 'Ready to receive chats',
    icon: ShieldCheck,
    tone: liveNumberCount.value > 0 ? 'green' : 'muted',
  },
  {
    label: 'Linked assistants',
    value: linkedAssistantCount.value,
    detail: 'Assigned reply logic',
    icon: MessageSquare,
    tone: 'blue',
  },
  {
    label: 'Needs setup',
    value: needsSetupCount.value,
    detail: needsSetupCount.value > 0 ? 'Review pending lines' : 'Everything looks ready',
    icon: Zap,
    tone: needsSetupCount.value > 0 ? 'amber' : 'muted',
  },
])

const metricToneClass = (tone: string) => ({
  primary: 'bg-primary/10 text-primary ring-primary/15',
  blue: 'bg-sky-400/10 text-sky-400 ring-sky-400/15',
  green: 'bg-emerald-400/10 text-emerald-400 ring-emerald-400/15',
  amber: 'bg-amber-400/10 text-amber-400 ring-amber-400/15',
  muted: 'bg-foreground/5 text-foreground/45 ring-foreground/10',
}[tone] || 'bg-foreground/5 text-foreground/45 ring-foreground/10')

const statusToneClass = (status?: string | null) => {
  const isLive = status === 'deployed' || status === 'active'
  return isLive
    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
    : 'border-amber-400/20 bg-amber-400/10 text-amber-300'
}

const statusDotClass = (status?: string | null) => {
  const isLive = status === 'deployed' || status === 'active'
  return isLive ? 'bg-emerald-300' : 'bg-amber-300'
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const deleteAccount = async (id: string) => {
  if (!(await notify.confirm('Disconnect this number?'))) return
  if (!userId.value) return
  const { error } = await supabase.from('whatsapp_accounts').delete().eq('id', id).eq('user_id', userId.value)
  if (!error) {
    notify.success('Disconnected.')
    refresh()
  }
}
</script>

<template>
  <WhatsAppUpgradeGate
    v-if="isLocked"
    title="Upgrade to unlock WhatsApp"
    description="Upgrade to connect WhatsApp business numbers and let your assistant reply from approved lines."
    back-to="/dashboard"
    back-label="Back to dashboard"
  />

  <div v-else class="w-full space-y-5 pb-24 pt-3 lg:pb-7">
    <section class="rounded-[0.39rem] p-5 sm:p-6">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="stat in whatsappStats" :key="stat.label" class="group flex items-center gap-2.5 rounded-[0.39rem] bg-background/45 py-3 pl-3 pr-2 transition hover:bg-foreground/[0.035]">
          <div :class="['flex h-[2.85rem] w-[2.85rem] shrink-0 items-center justify-center rounded-[0.39rem] ring-1 transition group-hover:scale-105', metricToneClass(stat.tone)]">
            <component :is="stat.icon" class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <p class="truncate text-base font-bold leading-none tracking-tight text-foreground">{{ stat.value }}</p>
            <p class="mt-1 truncate text-sm font-semibold text-foreground/75">{{ stat.label }}</p>
            <p class="mt-0.5 truncate text-[11px] font-semibold text-foreground/50">{{ stat.detail }}</p>
          </div>
        </div>
      </div>
    </section>

    <section v-if="isLoading" class="overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5">
      <div class="flex flex-col gap-2 border-b border-foreground/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton width="9rem" height="0.8rem" class="mb-2" />
          <Skeleton width="17rem" height="0.7rem" />
        </div>
        <Skeleton width="7rem" height="2rem" radius="0.39rem" />
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left">
          <thead class="bg-foreground/[0.02]">
            <tr>
              <th v-for="heading in ['Number', 'Status', 'Assistant', 'Created', 'Actions']" :key="heading" class="px-3 py-2.5 text-[11px] font-bold text-foreground/45" :class="heading === 'Actions' ? 'text-right' : ''">
                {{ heading }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-foreground/5">
            <tr v-for="i in 4" :key="i">
              <td v-for="j in 5" :key="j" class="px-3 py-3">
                <div class="h-4 animate-pulse rounded bg-foreground/10" :class="j === 1 ? 'w-36' : j === 5 ? 'ml-auto w-8' : 'w-24'" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else-if="accountList.length > 0" class="overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5">
      <div class="flex flex-col gap-3 border-b border-foreground/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="dashboard-eyebrow text-primary/80">WhatsApp channel</p>
          <h2 class="dashboard-section-title mt-2">WhatsApp numbers</h2>
          <p class="dashboard-muted mt-1">Manage connected business numbers and assigned assistants.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-[0.35rem] border border-foreground/10 bg-background/45 px-2.5 py-1.5 text-[11px] font-bold text-foreground/50">
            {{ accountList.length }} total
          </span>
          <NuxtLink to="/dashboard/integrations/whatsapp/setup" class="dashboard-action-label inline-flex items-center justify-center gap-1.5 rounded-[0.39rem] bg-primary px-3 py-2 text-black shadow-sm shadow-primary/10 transition hover:brightness-95">
            <Plus class="h-3.5 w-3.5" />
            Connect number
          </NuxtLink>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left">
          <thead class="bg-foreground/[0.02]">
            <tr>
              <th class="px-3 py-2.5 text-[11px] font-bold text-foreground/45">Number</th>
              <th class="px-3 py-2.5 text-[11px] font-bold text-foreground/45">Status</th>
              <th class="px-3 py-2.5 text-[11px] font-bold text-foreground/45">Assistant</th>
              <th class="px-3 py-2.5 text-[11px] font-bold text-foreground/45">Created</th>
              <th class="px-3 py-2.5 text-right text-[11px] font-bold text-foreground/45">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-foreground/5">
            <tr v-for="wa in accountList" :key="wa.id" class="transition-colors hover:bg-foreground/[0.025]">
              <td class="px-3 py-3 align-middle">
                <div class="flex items-center gap-2.5">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Smartphone class="h-4 w-4" />
                  </div>
                  <div class="min-w-0">
                    <NuxtLink :to="`/dashboard/integrations/whatsapp/${wa.id}`" class="truncate text-sm font-bold tracking-tight text-foreground transition-colors hover:text-primary">
                      {{ wa.phone_number }}
                    </NuxtLink>
                    <p class="mt-0.5 text-[11px] font-semibold text-foreground/40">Business number</p>
                  </div>
                </div>
              </td>
              <td class="px-3 py-3 align-middle">
                <span :class="['inline-flex items-center gap-1.5 rounded-[0.35rem] border px-2 py-1 text-[11px] font-bold capitalize', statusToneClass(wa.status)]">
                  <span :class="['h-1.5 w-1.5 rounded-full', statusDotClass(wa.status)]" />
                  {{ wa.status || 'Pending' }}
                </span>
              </td>
              <td class="px-3 py-3 align-middle">
                <div class="inline-flex max-w-[16rem] items-center gap-2 text-xs font-semibold" :class="wa.chatbots?.name ? 'text-foreground/70' : 'text-foreground/35'">
                  <MessageSquare class="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span class="truncate">{{ wa.chatbots?.name || 'No assistant connected' }}</span>
                </div>
              </td>
              <td class="px-3 py-3 align-middle">
                <p class="text-xs font-semibold text-foreground/50">{{ formatDate(wa.created_at) }}</p>
              </td>
              <td class="px-3 py-3 align-middle">
                <div class="flex justify-end">
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-[0.39rem] border border-foreground/10 bg-background/55 text-foreground/45 transition hover:border-primary/20 hover:text-primary"
                    title="WhatsApp actions"
                    aria-label="WhatsApp actions"
                    @click.stop="toggleActionMenu(wa.id, $event)"
                  >
                    <MoreVertical class="h-4 w-4" />
                  </button>

                  <Teleport to="body">
                    <div
                      v-if="openActionMenuId === wa.id"
                      class="fixed z-[120] w-52 overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background-card p-1.5 text-left shadow-xl shadow-black/15"
                      :style="{ top: `${actionMenuPosition.top}px`, left: `${actionMenuPosition.left}px` }"
                      @click.stop
                    >
                      <NuxtLink
                        :to="`/dashboard/integrations/whatsapp/${wa.id}`"
                        class="flex items-center gap-2 rounded-[0.35rem] px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
                        @click="openActionMenuId = null"
                      >
                        <Settings class="h-3.5 w-3.5" />
                        Manage
                      </NuxtLink>
                      <button
                        type="button"
                        class="flex w-full items-center gap-2 rounded-[0.35rem] px-3 py-2 text-left text-xs font-semibold text-red-400 transition hover:bg-red-400/10"
                        @click="openActionMenuId = null; deleteAccount(wa.id)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                        Disconnect
                      </button>
                    </div>
                  </Teleport>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else class="flex flex-col items-center rounded-[0.39rem] border border-dashed border-foreground/10 bg-background-card/45 px-5 py-10 text-center shadow-sm shadow-black/5">
      <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15">
        <Smartphone class="h-6 w-6" />
      </div>
      <h2 class="text-base font-bold tracking-tight text-foreground">No WhatsApp numbers connected</h2>
      <p class="dashboard-muted mt-2 max-w-md">Connect a business number and choose which assistant should reply from it.</p>
      <NuxtLink to="/dashboard/integrations/whatsapp/setup" class="dashboard-action-label mt-5 inline-flex items-center gap-1.5 rounded-[0.39rem] bg-primary px-4 py-2.5 text-black shadow-sm shadow-primary/10 transition hover:brightness-95">
        <Plus class="h-3.5 w-3.5" />
        Connect number
      </NuxtLink>
    </section>
  </div>
</template>
