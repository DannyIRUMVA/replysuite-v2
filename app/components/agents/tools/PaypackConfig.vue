<script setup lang="ts">
import { CreditCard, Loader2, ShieldCheck } from 'lucide-vue-next'

const props = defineProps<{
  chatbotId: string
  modelValue: Record<string, any>
}>()

const notify = useNotify()
const isLoading = ref(false)
const isSaving = ref(false)
const configured = ref(false)
const clientId = ref('')
const clientSecret = ref('')

const loadConfig = async () => {
  if (!props.chatbotId) return
  isLoading.value = true
  try {
    const data: any = await $fetch(`/api/business/payments/paypack/${props.chatbotId}`)
    configured.value = Boolean(data?.configured)
    clientId.value = data?.clientId || props.modelValue?.paypack_client_id || ''
  } catch (err) {
    console.warn('[Paypack] Could not load saved provider config:', err)
  } finally {
    isLoading.value = false
  }
}

const saveConfig = async () => {
  if (!clientId.value.trim() || !clientSecret.value.trim()) {
    notify.warn('Add both Paypack client ID and client secret.')
    return
  }
  isSaving.value = true
  try {
    await $fetch(`/api/business/payments/paypack/${props.chatbotId}`, {
      method: 'POST',
      body: {
        clientId: clientId.value.trim(),
        clientSecret: clientSecret.value.trim(),
        isActive: true,
      },
    })
    configured.value = true
    clientSecret.value = ''
    notify.success('Paypack payment setup saved securely.')
  } catch (err: any) {
    notify.error(err?.data?.statusMessage || err?.message || 'Unable to save Paypack setup.')
  } finally {
    isSaving.value = false
  }
}

watch(() => props.chatbotId, loadConfig)
onMounted(loadConfig)
</script>

<template>
  <section class="glass-card p-6 sm:p-8">
    <div class="mb-6 flex items-start justify-between gap-3">
      <div>
        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Payment add-on</p>
        <h3 class="mt-1 text-base font-black text-foreground">Paypack setup</h3>
        <p class="mt-1 text-xs leading-relaxed text-foreground/55">Used only for order totals or appointment deposits.</p>
      </div>
      <CreditCard class="h-5 w-5 text-primary/70" />
    </div>

    <div v-if="isLoading" class="flex items-center gap-2 rounded-2xl border border-foreground/8 bg-foreground/[0.02] p-4 text-xs text-foreground/50">
      <Loader2 class="h-4 w-4 animate-spin" /> Loading payment setup...
    </div>

    <div v-else class="space-y-4">
      <div v-if="configured" class="flex items-start gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
        <ShieldCheck class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <div>
          <p class="text-xs font-black text-emerald-500">Paypack is configured</p>
          <p class="mt-1 text-[10px] leading-relaxed text-foreground/45">Client secret is stored server-side and is never sent back to the browser.</p>
        </div>
      </div>

      <label class="block space-y-2">
        <span class="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/45">Application Client ID</span>
        <input v-model="clientId" type="password" autocomplete="off" class="w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-xs text-foreground outline-none transition focus:border-primary/50" placeholder="pp_..." />
      </label>

      <label class="block space-y-2">
        <span class="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/45">Application Client Secret</span>
        <input v-model="clientSecret" type="password" autocomplete="new-password" class="w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-xs text-foreground outline-none transition focus:border-primary/50" placeholder="Enter secret to save or rotate" />
      </label>

      <button type="button" class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-black transition hover:brightness-95 disabled:opacity-50" :disabled="isSaving" @click="saveConfig">
        <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
        {{ configured ? 'Rotate Paypack secret' : 'Save Paypack setup' }}
      </button>

      <p class="rounded-xl border border-orange-500/10 bg-orange-500/5 p-3 text-[10px] leading-relaxed text-orange-500/75">
        Payment prompts are only created after the assistant has a real order or appointment ID. The server validates ownership and amount before contacting Paypack.
      </p>
    </div>
  </section>
</template>
