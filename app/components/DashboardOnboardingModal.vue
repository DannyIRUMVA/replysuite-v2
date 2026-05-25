<script setup lang="ts">
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Loader2,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-vue-next'

const supabase = useSupabaseClient()
const route = useRoute()
const { user, userId, isVerified, refreshAuth } = useAuth()
const forceOnboarding = useState<boolean>('dashboard-force-onboarding', () => false)
const onboardingChecked = useState<boolean>('dashboard-force-onboarding-checked', () => false)
const onboardingDismissed = useState<boolean>('dashboard-onboarding-dismissed', () => false)

const requiredSteps = ['verify_account', 'create_chatbot'] as const

type StepCode = typeof requiredSteps[number]

const verificationCode = ref('')
const verifyError = ref('')
const verifying = ref(false)
const resendLoading = ref(false)
const resendSuccess = ref(false)

const isCreating = ref(false)
const createError = ref('')
const createdAgentId = ref<string | null>(null)
const ensuringRows = ref(false)
const syncingSteps = reactive<Record<StepCode, boolean>>({
  verify_account: false,
  create_chatbot: false,
})

const agentDraft = ref({
  name: '',
  system_prompt: '',
  default_language: 'English',
})

const languageOptions = [
  'English',
  'Kinyarwanda',
  'French',
  'Swahili',
  'Kirundi',
  'Portuguese',
  'Spanish',
  'German',
  'Chinese',
]

const { data: onboardingState, pending, refresh } = useAsyncData('dashboard-onboarding-modal', async () => {
  if (!userId.value) {
    return {
      botCount: 0,
      onboarding: [],
    }
  }

  const [botsRes, onboardingRes] = await Promise.all([
    supabase
      .from('chatbots')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId.value)
      .is('deleted_at', null),
    supabase
      .from('user_onboarding')
      .select('id, step_code, completed, completed_at')
      .eq('user_id', userId.value),
  ])

  return {
    botCount: botsRes.count || 0,
    onboarding: onboardingRes.data || [],
  }
}, {
  watch: [userId, () => isVerified.value, () => route.path],
})

const onboardingRows = computed(() => onboardingState.value?.onboarding || [])
const onboardingByCode = computed(() => onboardingRows.value.reduce((acc, row: any) => {
  if (row?.step_code) acc[row.step_code] = row
  return acc
}, {} as Record<string, any>))
const hasAllRequiredRows = computed(() => requiredSteps.every((stepCode) => !!onboardingByCode.value[stepCode]))
const completedSteps = computed(() => new Set(
  onboardingRows.value
    .filter((row: any) => row.completed && row.step_code)
    .map((row: any) => row.step_code as string)
))

const hasChatbot = computed(() => (onboardingState.value?.botCount || 0) > 0)
const needsVerify = computed(() => {
  if (!userId.value || pending.value || ensuringRows.value) return false
  const row = onboardingByCode.value.verify_account
  return row ? !row.completed : true
})
const needsCreateChatbot = computed(() => {
  if (!userId.value || pending.value || ensuringRows.value) return false
  const row = onboardingByCode.value.create_chatbot
  return row ? !row.completed : true
})
const isDoneScreenVisible = computed(() => !!createdAgentId.value)
const shouldShow = computed(() => {
  if (isDoneScreenVisible.value) return true
  if (!userId.value || pending.value || ensuringRows.value) return false
  if (!hasAllRequiredRows.value) return false

  const isIncomplete = forceOnboarding.value || needsVerify.value || needsCreateChatbot.value
  if (!onboardingChecked.value && !isIncomplete) return false

  return !onboardingDismissed.value && isIncomplete
})

const currentStep = computed(() => {
  if (isDoneScreenVisible.value) return 'done'
  if (needsVerify.value) return 'verify'
  return 'create'
})

const stepItems = computed(() => {
  const items = [
    {
      code: 'verify_account',
      title: 'Verify account',
      description: 'Confirm your email before using the dashboard.',
      active: currentStep.value === 'verify',
      complete: isVerified.value || completedSteps.value.has('verify_account'),
    },
    {
      code: 'create_chatbot',
      title: 'Create chatbot',
      description: 'Set up your first assistant before you continue.',
      active: currentStep.value === 'create' || currentStep.value === 'done',
      complete: hasChatbot.value || completedSteps.value.has('create_chatbot') || isDoneScreenVisible.value,
    },
  ]

  return items
})

const ensureOnboardingRows = async () => {
  if (!userId.value || pending.value || ensuringRows.value) return

  const missingSteps = requiredSteps.filter((stepCode) => !onboardingByCode.value[stepCode])
  if (!missingSteps.length) return

  ensuringRows.value = true
  try {
    const payload = missingSteps.map((stepCode) => ({
      user_id: userId.value,
      step_code: stepCode,
      completed: stepCode === 'verify_account' ? isVerified.value : false,
      completed_at: stepCode === 'verify_account' && isVerified.value ? new Date().toISOString() : null,
    }))

    const { error } = await supabase
      .from('user_onboarding')
      .upsert(payload, { onConflict: 'user_id,step_code' })

    if (error) throw error

    await refresh()
  } catch (error) {
    console.error('[Onboarding] Failed to ensure onboarding rows:', error)
  } finally {
    ensuringRows.value = false
  }
}

const syncStep = async (stepCode: StepCode) => {
  if (!userId.value || syncingSteps[stepCode]) return
  if (completedSteps.value.has(stepCode)) return

  syncingSteps[stepCode] = true
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('user_onboarding')
      .select('id, completed')
      .eq('user_id', userId.value)
      .eq('step_code', stepCode)
      .limit(1)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (existing?.id) {
      if (!existing.completed) {
        const { error: updateError } = await supabase
          .from('user_onboarding')
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq('id', existing.id)

        if (updateError) throw updateError
      }
    } else {
      const { error: insertError } = await supabase
        .from('user_onboarding')
        .insert({
          user_id: userId.value,
          step_code: stepCode,
          completed: true,
          completed_at: new Date().toISOString(),
        })

      if (insertError) throw insertError
    }

    await refresh()
  } catch (error) {
    console.error(`[Onboarding] Failed to sync ${stepCode}:`, error)
  } finally {
    syncingSteps[stepCode] = false
  }
}

watch([userId, pending], async ([currentUserId, isPending]) => {
  if (!currentUserId || isPending) return
  await ensureOnboardingRows()
}, { immediate: true })

watch([isVerified, hasChatbot, completedSteps], async ([verified, chatbotExists, steps]) => {
  if (!userId.value || pending.value) return

  if (verified && !steps.has('verify_account')) {
    await syncStep('verify_account')
  }

  if (chatbotExists && !steps.has('create_chatbot')) {
    await syncStep('create_chatbot')
  }
}, { immediate: true })

watch([shouldShow, needsVerify, needsCreateChatbot], ([open, verifyNeeded, chatbotNeeded]) => {
  if (process.server) return

  if (verifyNeeded || chatbotNeeded) {
    forceOnboarding.value = true
  } else if (!isDoneScreenVisible.value) {
    forceOnboarding.value = false
  }

  document.documentElement.style.overflow = open ? 'hidden' : ''
  document.body.style.overflow = open ? 'hidden' : ''
}, { immediate: true })

onBeforeUnmount(() => {
  if (process.server) return
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
})

const resendVerification = async () => {
  try {
    resendLoading.value = true
    await $fetch('/api/auth/resend-code', { method: 'POST' })
    resendSuccess.value = true
    setTimeout(() => { resendSuccess.value = false }, 5000)
  } catch (error) {
    console.error('[Onboarding] Resend verification failed:', error)
  } finally {
    resendLoading.value = false
  }
}

const verifyAccount = async () => {
  if (verificationCode.value.trim().length < 6) return

  try {
    verifying.value = true
    verifyError.value = ''

    await $fetch('/api/auth/verify-code', {
      method: 'POST',
      body: { code: verificationCode.value.trim() },
    })

    await refreshAuth()
    await syncStep('verify_account')
    verificationCode.value = ''
    await refresh()
  } catch (error: any) {
    verifyError.value = error?.data?.statusMessage || error?.message || 'Unable to verify account.'
  } finally {
    verifying.value = false
  }
}

const createChatbot = async () => {
  if (!userId.value || !agentDraft.value.name.trim()) return

  try {
    isCreating.value = true
    createError.value = ''

    const { data, error } = await supabase
      .from('chatbots')
      .insert({
        user_id: userId.value,
        name: agentDraft.value.name.trim(),
        system_prompt: agentDraft.value.system_prompt.trim(),
        default_language: agentDraft.value.default_language,
      })
      .select('id')
      .single()

    if (error) throw error

    await syncStep('create_chatbot')
    createdAgentId.value = data?.id || null
    await refresh()
  } catch (error: any) {
    createError.value = error?.message || 'Unable to create chatbot right now.'
  } finally {
    isCreating.value = false
  }
}

const continueToDashboard = () => {
  createdAgentId.value = null
}

const openTraining = () => {
  if (!createdAgentId.value) {
    createdAgentId.value = null
    return
  }

  navigateTo(`/dashboard/agents/skills/training?id=${createdAgentId.value}`)
  createdAgentId.value = null
}

const closeModal = () => {
  onboardingDismissed.value = true
}

const signOut = async () => {
  onboardingDismissed.value = false
  forceOnboarding.value = false
  onboardingChecked.value = false
  await supabase.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="shouldShow" class="fixed inset-0 z-[500] bg-background/85 backdrop-blur-xl p-4 sm:p-6">
        <div class="flex min-h-full items-end justify-center md:items-center">
          <div class="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-foreground/10 bg-background-card shadow-2xl shadow-black/40 md:max-h-[92vh] md:flex-row">
            <div class="relative w-full border-b border-foreground/5 bg-foreground/[0.02] px-5 py-6 sm:px-7 md:w-[42%] md:border-b-0 md:border-r md:px-8 md:py-8">
              <div class="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

              <div class="mb-8 flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                    <ShieldCheck v-if="currentStep === 'verify'" class="h-5 w-5" />
                    <Bot v-else-if="currentStep === 'create'" class="h-5 w-5" />
                    <Sparkles v-else class="h-5 w-5" />
                  </div>
                  <div>
                    <p class="text-[10px] font-black uppercase tracking-[0.22em] text-foreground/40">First-time setup</p>
                    <h2 class="text-xl font-black tracking-tight text-foreground">Before you enter the dashboard</h2>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-foreground/10 text-foreground/45 transition hover:border-foreground/20 hover:text-foreground"
                    @click="closeModal"
                    aria-label="Close onboarding modal"
                  >
                    <X class="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-2xl border border-foreground/10 px-3 py-2 text-[11px] font-bold text-foreground/55 transition hover:border-foreground/20 hover:text-foreground"
                    @click="signOut"
                  >
                    <LogOut class="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>

              <div class="space-y-4">
                <div
                  v-for="(step, index) in stepItems"
                  :key="step.code"
                  class="rounded-2xl border px-4 py-4 transition-all"
                  :class="step.active ? 'border-primary/30 bg-primary/10' : 'border-foreground/8 bg-transparent'"
                >
                  <div class="flex items-start gap-3">
                    <div
                      class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-[11px] font-black uppercase tracking-wider"
                      :class="step.complete ? 'border-primary/30 bg-primary text-black' : step.active ? 'border-primary/30 bg-primary/10 text-primary' : 'border-foreground/10 bg-foreground/5 text-foreground/45'"
                    >
                      <CheckCircle2 v-if="step.complete" class="h-4 w-4" />
                      <span v-else>{{ index + 1 }}</span>
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-black tracking-tight text-foreground">{{ step.title }}</p>
                      <p class="mt-1 text-sm leading-relaxed text-foreground/55">{{ step.description }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-8 rounded-2xl border border-foreground/8 bg-background/60 p-4">
                <p class="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/40">Why this matters</p>
                <p class="mt-2 text-sm leading-relaxed text-foreground/60">
                  We only ask for two things first: verify your account and create your first chatbot. Everything else can happen later inside the dashboard.
                </p>
              </div>
            </div>

            <div class="w-full overflow-y-auto px-5 py-6 sm:px-7 md:max-h-[92vh] md:flex-1 md:px-8 md:py-8">
              <div v-if="currentStep === 'verify'" class="mx-auto flex w-full max-w-2xl flex-col justify-center">
                <div class="mb-8 max-w-xl">
                  <p class="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Step 1</p>
                  <h3 class="mt-3 text-3xl font-black tracking-tight text-foreground">Verify your email first</h3>
                  <p class="mt-3 text-sm leading-relaxed text-foreground/60 sm:text-base">
                    Enter the 6-digit code sent to <span class="font-bold text-foreground">{{ user?.email }}</span> so we know this account is ready.
                  </p>
                </div>

                <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div class="rounded-[1.75rem] border border-foreground/8 bg-background/70 p-5 sm:p-6">
                    <label class="mb-3 block text-[11px] font-black uppercase tracking-[0.18em] text-foreground/45">Verification code</label>
                    <input
                      v-model="verificationCode"
                      type="text"
                      maxlength="6"
                      inputmode="numeric"
                      placeholder="000000"
                      class="w-full rounded-2xl border border-foreground/10 bg-background px-5 py-4 text-center font-mono text-3xl tracking-[0.45em] text-foreground outline-none transition focus:border-primary/50 placeholder:text-foreground/10"
                      @keyup.enter="verifyAccount"
                    />

                    <p v-if="verifyError" class="mt-4 rounded-2xl border border-red-400/10 bg-red-400/5 p-4 text-sm font-semibold leading-relaxed text-red-400">
                      {{ verifyError }}
                    </p>

                    <div class="mt-6 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        class="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-black transition hover:brightness-95 disabled:opacity-50"
                        :disabled="verifying || verificationCode.trim().length < 6"
                        @click="verifyAccount"
                      >
                        <Loader2 v-if="verifying" class="h-4 w-4 animate-spin" />
                        <span>{{ verifying ? 'Verifying...' : 'Verify account' }}</span>
                        <ArrowRight v-if="!verifying" class="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        class="inline-flex h-14 flex-1 items-center justify-center rounded-2xl border border-foreground/10 bg-transparent px-5 text-sm font-bold text-foreground/60 transition hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
                        :disabled="resendLoading"
                        @click="resendVerification"
                      >
                        {{ resendLoading ? 'Sending code...' : resendSuccess ? 'Code sent' : 'Resend code' }}
                      </button>
                    </div>
                  </div>

                  <div class="rounded-[1.75rem] border border-foreground/8 bg-foreground/[0.02] p-5 sm:p-6">
                    <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                      <Mail class="h-5 w-5" />
                    </div>
                    <h4 class="text-lg font-black tracking-tight text-foreground">Quick check</h4>
                    <ul class="mt-4 space-y-3 text-sm leading-relaxed text-foreground/60">
                      <li>• Use the latest code from your inbox.</li>
                      <li>• If the code expired, resend a fresh one.</li>
                      <li>• Once verified, we move you straight to chatbot creation.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div v-else-if="currentStep === 'create'" class="mx-auto flex w-full max-w-3xl flex-col justify-center">
                <div class="mb-8 max-w-2xl">
                  <p class="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Step 2</p>
                  <h3 class="mt-3 text-3xl font-black tracking-tight text-foreground">Create your first chatbot</h3>
                  <p class="mt-3 text-sm leading-relaxed text-foreground/60 sm:text-base">
                    Start with a simple assistant setup now. You can train it, connect your website, and refine behavior after you enter the dashboard.
                  </p>
                </div>

                <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div class="rounded-[1.75rem] border border-foreground/8 bg-background/70 p-5 sm:p-6">
                    <div class="space-y-5">
                      <div>
                        <label class="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-foreground/45">Chatbot name</label>
                        <input
                          v-model="agentDraft.name"
                          type="text"
                          maxlength="80"
                          placeholder="e.g. ReplySuite Assistant"
                          class="w-full rounded-2xl border border-foreground/10 bg-background px-5 py-4 text-sm text-foreground outline-none transition focus:border-primary/50 placeholder:text-foreground/20"
                        />
                      </div>

                      <div>
                        <label class="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-foreground/45">What should it do?</label>
                        <textarea
                          v-model="agentDraft.system_prompt"
                          rows="5"
                          placeholder="Help visitors, answer FAQs, qualify leads, and sound professional."
                          class="w-full rounded-2xl border border-foreground/10 bg-background px-5 py-4 text-sm text-foreground outline-none transition focus:border-primary/50 placeholder:text-foreground/20 resize-none"
                        />
                      </div>

                      <div>
                        <label class="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-foreground/45">Default language</label>
                        <select
                          v-model="agentDraft.default_language"
                          class="w-full rounded-2xl border border-foreground/10 bg-background px-5 py-4 text-sm text-foreground outline-none transition focus:border-primary/50"
                        >
                          <option v-for="language in languageOptions" :key="language" :value="language">{{ language }}</option>
                        </select>
                      </div>
                    </div>

                    <p v-if="createError" class="mt-4 rounded-2xl border border-red-400/10 bg-red-400/5 p-4 text-sm font-semibold leading-relaxed text-red-400">
                      {{ createError }}
                    </p>

                    <div class="mt-6 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        class="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-black transition hover:brightness-95 disabled:opacity-50"
                        :disabled="isCreating || !agentDraft.name.trim()"
                        @click="createChatbot"
                      >
                        <Loader2 v-if="isCreating" class="h-4 w-4 animate-spin" />
                        <span>{{ isCreating ? 'Creating chatbot...' : 'Create chatbot' }}</span>
                        <ArrowRight v-if="!isCreating" class="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div class="rounded-[1.75rem] border border-foreground/8 bg-foreground/[0.02] p-5 sm:p-6">
                    <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                      <Bot class="h-5 w-5" />
                    </div>
                    <h4 class="text-lg font-black tracking-tight text-foreground">Keep it simple</h4>
                    <ul class="mt-4 space-y-3 text-sm leading-relaxed text-foreground/60">
                      <li>• Give the chatbot a clear name your team recognizes.</li>
                      <li>• Add a short purpose now, then expand in training later.</li>
                      <li>• This first assistant unlocks the rest of the dashboard flow.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div v-else class="mx-auto flex min-h-[480px] w-full max-w-2xl flex-col items-center justify-center text-center">
                <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] border border-primary/20 bg-primary/10 text-primary shadow-lg shadow-primary/10">
                  <CheckCircle2 class="h-10 w-10" />
                </div>
                <p class="text-[11px] font-black uppercase tracking-[0.22em] text-primary">Setup complete</p>
                <h3 class="mt-3 text-3xl font-black tracking-tight text-foreground">Your first chatbot is ready</h3>
                <p class="mt-4 max-w-xl text-sm leading-relaxed text-foreground/60 sm:text-base">
                  You can continue to the dashboard now, or jump straight into training so your assistant becomes useful faster.
                </p>

                <div class="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    class="inline-flex h-14 flex-1 items-center justify-center rounded-2xl border border-foreground/10 bg-transparent px-5 text-sm font-bold text-foreground/65 transition hover:border-foreground/20 hover:text-foreground"
                    @click="continueToDashboard"
                  >
                    Continue to dashboard
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-black transition hover:brightness-95"
                    @click="openTraining"
                  >
                    Open training
                    <ArrowRight class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
