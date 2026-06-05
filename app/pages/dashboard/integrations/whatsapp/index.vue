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

const { planSlug } = useAuth()
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
    if (isLocked.value) return []
    const { data } = await supabase
        .from('whatsapp_accounts')
        .select('*, chatbots(name)')
        .order('created_at', { ascending: false })
    return data || []
}, { watch: [isLocked] })

const linkedAssistantCount = computed(() => (accounts.value || []).filter((item: any) => item.chatbots?.name).length)

const deleteAccount = async (id: string) => {
    if (!(await notify.confirm('Disconnect this number?'))) return
    const { error } = await supabase.from('whatsapp_accounts').delete().eq('id', id)
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
    description="Starter includes website automation only. Upgrade your plan to connect WhatsApp, manage numbers, and unlock AI replies on your business line."
    back-to="/dashboard"
    back-label="Back to dashboard"
  />

  <div v-else class="w-full space-y-6 pb-20 pt-5">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div
        v-for="stat in [
          { label: 'Connected Numbers', value: accounts?.length || 0, icon: Zap },
          { label: 'Linked Assistants', value: linkedAssistantCount, icon: MessageSquare },
          { label: 'WhatsApp API', value: 'V21.0', icon: ShieldCheck }
        ]"
        :key="stat.label"
        class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"
      >
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

    <div v-if="isLoading" class="overflow-hidden rounded-[24px] border border-foreground/10 bg-foreground/[0.01]">
      <div class="border-b border-foreground/5 p-5">
        <div class="h-4 w-40 animate-pulse rounded bg-foreground/10" />
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[920px] text-left">
          <thead class="bg-foreground/[0.02]">
            <tr>
              <th v-for="heading in ['Number', 'Status', 'Connected Assistant', 'Asset Reference', 'Created', 'Actions']" :key="heading" class="px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40" :class="heading === 'Actions' ? 'text-right' : ''">
                {{ heading }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-foreground/5">
            <tr v-for="i in 4" :key="i">
              <td v-for="j in 6" :key="j" class="px-5 py-4">
                <div class="h-4 animate-pulse rounded bg-foreground/10" :class="j === 1 ? 'w-36' : j === 6 ? 'ml-auto w-9' : 'w-24'" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else-if="accounts && accounts.length > 0" class="overflow-hidden rounded-[24px] border border-foreground/10 bg-background shadow-[0_18px_50px_rgba(0,0,0,0.05)]">
      <div class="flex flex-col gap-2 border-b border-foreground/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-sm font-black uppercase tracking-widest text-foreground">WhatsApp connections</h3>
          <p class="mt-1 text-xs text-foreground/50">Number, assistant link, and setup status in one clean table.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full border border-foreground/10 bg-foreground/[0.02] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-foreground/45">
            {{ accounts.length }} total
          </span>
          <NuxtLink
            to="/dashboard/integrations/whatsapp/setup"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/10 transition-all hover:bg-primary-accent"
          >
            <Plus class="h-3.5 w-3.5" />
            Connect Number
          </NuxtLink>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[920px] text-left">
          <thead class="bg-foreground/[0.02]">
            <tr>
              <th class="px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">Number</th>
              <th class="px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">Status</th>
              <th class="px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">Connected Assistant</th>
              <th class="px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">Asset Reference</th>
              <th class="px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">Created</th>
              <th class="px-5 py-3 text-right text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-foreground/5">
            <tr v-for="wa in accounts" :key="wa.id" class="transition-colors hover:bg-foreground/[0.025]">
              <td class="px-5 py-4 align-middle">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
                    <Smartphone class="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <NuxtLink :to="`/dashboard/integrations/whatsapp/${wa.id}`" class="text-sm font-black tracking-tight text-foreground transition-colors hover:text-primary">
                      {{ wa.phone_number }}
                    </NuxtLink>
                    <p class="mt-1 text-[10px] font-bold uppercase tracking-widest text-foreground/35">Business number</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4 align-middle">
                <span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest" :class="wa.status === 'deployed' || wa.status === 'active' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-orange-500/20 bg-orange-500/10 text-orange-400'">
                  <span class="h-1.5 w-1.5 rounded-full" :class="wa.status === 'deployed' || wa.status === 'active' ? 'bg-emerald-400' : 'bg-orange-400'" />
                  {{ wa.status || 'Pending' }}
                </span>
              </td>
              <td class="px-5 py-4 align-middle">
                <div class="inline-flex items-center gap-2 text-[12px] font-bold" :class="wa.chatbots?.name ? 'text-foreground/75' : 'text-foreground/35'">
                  <MessageSquare class="h-3.5 w-3.5 text-primary" />
                  {{ wa.chatbots?.name || 'No assistant connected' }}
                </div>
              </td>
              <td class="px-5 py-4 align-middle">
                <p class="max-w-[180px] truncate font-mono text-[11px] text-foreground/45" :title="wa.waba_id">
                  {{ wa.waba_id || '—' }}
                </p>
              </td>
              <td class="px-5 py-4 align-middle">
                <p class="text-[12px] font-bold text-foreground/55">
                  {{ new Date(wa.created_at).toLocaleDateString() }}
                </p>
              </td>
              <td class="px-5 py-4 align-middle">
                <div class="flex justify-end">
                  <button
                    @click.stop="toggleActionMenu(wa.id, $event)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/5 text-foreground/50 transition-all hover:bg-foreground/10 hover:text-foreground"
                    title="WhatsApp actions"
                    aria-label="WhatsApp actions"
                  >
                    <MoreVertical class="h-4 w-4" />
                  </button>

                  <Teleport to="body">
                    <div
                      v-if="openActionMenuId === wa.id"
                      class="fixed z-[120] w-52 overflow-hidden rounded-2xl border border-foreground/10 bg-background p-1.5 text-left shadow-2xl shadow-black/15"
                      :style="{ top: `${actionMenuPosition.top}px`, left: `${actionMenuPosition.left}px` }"
                      @click.stop
                    >
                      <NuxtLink
                        :to="`/dashboard/integrations/whatsapp/${wa.id}`"
                        @click="openActionMenuId = null"
                        class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-primary transition-all hover:bg-primary/10"
                      >
                        <Settings class="h-3.5 w-3.5" />
                        Manage
                      </NuxtLink>
                      <button
                        @click="openActionMenuId = null; deleteAccount(wa.id)"
                        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-red-400 transition-all hover:bg-red-400/10"
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
    </div>

    <div v-else class="flex flex-col items-center rounded-[24px] border border-dashed border-foreground/10 bg-foreground/[0.01] px-6 py-16 text-center">
      <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-foreground/5">
        <Smartphone class="h-9 w-9 text-foreground/50" />
      </div>
      <h3 class="text-xl font-black uppercase tracking-tight text-foreground">No WhatsApp numbers connected</h3>
      <p class="mt-3 max-w-md text-sm leading-6 text-foreground/50">Connect your first WhatsApp business number and choose which assistant should reply from it.</p>
      <NuxtLink to="/dashboard/integrations/whatsapp/setup" class="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/10 transition-all hover:bg-primary-accent">
        <Plus class="h-4 w-4" />
        Connect WhatsApp
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[28px];
}
</style>
