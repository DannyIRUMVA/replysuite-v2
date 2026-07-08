<script setup lang="ts">
import {
  ArrowLeft,
  HelpCircle,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Zap
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { setInteracting, planSlug } = useAuth()
const notify = useNotify()
const isLocked = computed(() => planSlug.value === 'starter' || !planSlug.value)

const manualPhone = ref('')
const manualPhoneId = ref('')
const manualWabaId = ref('')
const manualToken = ref('')
const isSubmittingManual = ref(false)
const manualGuideUrl = 'https://docs.replysuite.com/integrations/whatsapp'

const submitManualSetup = async () => {
  if (!manualPhone.value || !manualPhoneId.value || !manualWabaId.value || !manualToken.value) {
    notify.warn('Please fill in all required WhatsApp setup fields.')
    return
  }

  isSubmittingManual.value = true
  try {
    const response: any = await $fetch('/api/whatsapp/connect', {
      method: 'POST',
      body: {
        phone_number: manualPhone.value,
        phone_number_id: manualPhoneId.value,
        waba_id: manualWabaId.value,
        accessToken: manualToken.value
      }
    })

    notify.success(response.message || 'WhatsApp connected successfully!')
    navigateTo('/dashboard/integrations/whatsapp')
  } catch (err: any) {
    console.error('Manual activation error:', err)
    notify.error(`WhatsApp connection failed: ${err.data?.statusMessage || err.message}`)
  } finally {
    isSubmittingManual.value = false
  }
}

const requirements = [
  'Verified Meta Business Account',
  'WhatsApp Business API enabled',
  'System user access token',
  'Clean phone number ready for connection'
]
</script>

<template>
  <WhatsAppUpgradeGate
    v-if="isLocked"
    title="Upgrade before connecting WhatsApp"
    description="Upgrade to connect WhatsApp business numbers and let your assistant reply from approved lines."
    back-to="/dashboard/integrations/website"
    back-label="Back to website integration"
  />

  <div v-else class="mx-auto w-full max-w-5xl space-y-5 pb-24 pt-3 lg:pb-7">
    <NuxtLink to="/dashboard/integrations/whatsapp" class="dashboard-action-label inline-flex items-center gap-1.5 text-foreground/45 transition hover:text-primary">
      <ArrowLeft class="h-3.5 w-3.5" />
      Back to WhatsApp
    </NuxtLink>

    <section class="rounded-[0.39rem] border border-amber-400/20 bg-amber-400/10 p-4 shadow-sm shadow-black/5">
      <div class="flex items-start gap-3">
        <ShieldCheck class="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <div>
          <p class="text-base font-bold text-foreground">Waiting for Meta verification</p>
          <p class="mt-1 max-w-3xl text-sm leading-relaxed text-foreground/65">WhatsApp self-serve setup is still pending Meta verification. This advanced form is available for prepared connection details, but most users should wait until verification is complete and the guided setup is enabled.</p>
        </div>
      </div>
    </section>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
        <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="dashboard-eyebrow text-primary/80">WhatsApp setup</p>
            <h1 class="dashboard-section-title mt-2">Connect a business number</h1>
            <p class="mt-1 max-w-2xl text-sm leading-relaxed text-foreground/65">Enter the approved WhatsApp connection details for this line. ReplySuite will save the connection and return you to the WhatsApp channel.</p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.39rem] bg-primary/10 text-primary ring-1 ring-primary/15">
            <Smartphone class="h-5 w-5" />
          </div>
        </div>

        <div class="grid gap-4">
          <div>
            <label class="mb-2 block text-sm font-bold text-foreground/75">WhatsApp Business Account ID</label>
            <input
              v-model="manualWabaId"
              type="text"
              placeholder="Paste the approved business account ID"
              class="w-full rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3.5 py-3 text-[15px] font-semibold text-foreground outline-none transition placeholder:text-foreground/35 focus:border-primary/40"
              @focus="setInteracting(true)"
              @blur="setInteracting(false)"
            />
          </div>

          <div>
            <label class="mb-2 block text-sm font-bold text-foreground/75">Phone number ID</label>
            <input
              v-model="manualPhoneId"
              type="text"
              placeholder="Paste the approved phone number ID"
              class="w-full rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3.5 py-3 text-[15px] font-semibold text-foreground outline-none transition placeholder:text-foreground/35 focus:border-primary/40"
              @focus="setInteracting(true)"
              @blur="setInteracting(false)"
            />
          </div>

          <div>
            <label class="mb-2 block text-sm font-bold text-foreground/75">Display phone number</label>
            <input
              v-model="manualPhone"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              placeholder="+250 7xx xxx xxx"
              class="w-full rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3.5 py-3 text-[15px] font-semibold text-foreground outline-none transition placeholder:text-foreground/35 focus:border-primary/40"
              @focus="setInteracting(true)"
              @blur="setInteracting(false)"
            />
          </div>

          <div>
            <label class="mb-2 block text-sm font-bold text-foreground/75">Permanent access token</label>
            <input
              v-model="manualToken"
              type="password"
              autocomplete="off"
              placeholder="Paste the system user token"
              class="w-full rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3.5 py-3 text-[15px] font-semibold text-foreground outline-none transition placeholder:text-foreground/35 focus:border-primary/40"
              @focus="setInteracting(true)"
              @blur="setInteracting(false)"
              @keydown.enter.prevent="submitManualSetup"
            />
          </div>
        </div>

        <div class="mt-5 flex flex-col gap-3 border-t border-foreground/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-1.5 rounded-[0.39rem] bg-primary px-4 py-3 text-sm font-bold text-black shadow-sm shadow-primary/10 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            :disabled="isSubmittingManual"
            @click="submitManualSetup"
          >
            <Loader2 v-if="isSubmittingManual" class="h-3.5 w-3.5 animate-spin" />
            <MessageSquare v-else class="h-3.5 w-3.5" />
            Verify and connect
          </button>

          <a :href="manualGuideUrl" target="_blank" rel="noopener noreferrer" class="dashboard-action-label inline-flex items-center justify-center gap-1.5 rounded-[0.39rem] border border-foreground/10 bg-background/55 px-3 py-2.5 text-foreground/55 transition hover:border-primary/20 hover:text-primary">
            <HelpCircle class="h-3.5 w-3.5" />
            Help guide
          </a>
        </div>
      </section>

      <aside class="space-y-3 rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
        <div>
          <p class="dashboard-eyebrow text-primary/80">Connection readiness</p>
          <h2 class="dashboard-section-title mt-2">Before you connect</h2>
          <p class="mt-1 text-sm leading-relaxed text-foreground/65">Use this form only when the required WhatsApp setup details are already prepared.</p>
        </div>

        <div class="space-y-2">
          <div v-for="req in requirements" :key="req" class="rounded-[0.39rem] border border-foreground/10 bg-background/35 p-3">
            <div class="flex items-start gap-2.5">
              <div class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
              <p class="text-sm font-semibold leading-relaxed text-foreground/65">{{ req }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-[0.39rem] border border-primary/15 bg-primary/5 p-3">
          <div class="flex items-start gap-2.5">
            <Zap class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p class="text-sm font-bold text-foreground">Guided setup coming next</p>
              <p class="mt-1 text-sm leading-relaxed text-foreground/65">After Meta verification, ReplySuite will replace this advanced path with a cleaner guided connection flow.</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
