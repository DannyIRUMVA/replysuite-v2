<script setup lang="ts">
import { chatbotLanguageNames, getChatbotLanguageCode, normalizeChatbotLanguageName } from '~~/app/utils/chatbotLanguages'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Globe,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-vue-next'

const supabase = useSupabaseClient()
const route = useRoute()
const { user, userId, profile, planSlug, isVerified, refreshAuth, isTrialing } = useAuth()
const forceOnboarding = useState<boolean>('dashboard-force-onboarding', () => false)
const onboardingChecked = useState<boolean>('dashboard-force-onboarding-checked', () => false)
const onboardingDismissed = useState<boolean>('dashboard-onboarding-dismissed', () => false)
const onboardingNavigationLocked = useState<boolean>('dashboard-onboarding-navigation-locked', () => false)

const onboardingStepCodes = ['verify_account', 'company_profile', 'choose_plan', 'create_chatbot', 'choose_channel'] as const
type StepCode = typeof onboardingStepCodes[number]
type SetupStep = 'verify' | 'company' | 'trial' | 'chatbot' | 'integration' | 'done'

const verificationCode = ref('')
const verifyError = ref('')
const verifying = ref(false)
const resendLoading = ref(false)
const resendSuccess = ref(false)

const isSavingCompany = ref(false)
const companyError = ref('')
const companySavedThisSession = ref(false)
const isCreating = ref(false)
const createError = ref('')
const isStartingTrial = ref(false)
const trialError = ref('')
const createdAgentId = ref<string | null>(null)
const selectedIntegration = ref<'website' | 'whatsapp' | null>(null)
const manualStep = ref<SetupStep | null>(null)
const draftStatus = ref('')
let draftSaveTimer: ReturnType<typeof setTimeout> | null = null
const ensuringRows = ref(false)
const syncingSteps = reactive<Record<StepCode, boolean>>({
  verify_account: false,
  company_profile: false,
  choose_plan: false,
  create_chatbot: false,
  choose_channel: false,
})

const companyDraft = ref({ full_name: '', company_name: '', contact_email: '', website: '', country: '' })
const agentDraft = ref({ name: '', system_prompt: '', default_language: 'English' })

const languageOptions = chatbotLanguageNames
const isPaidPlan = computed(() => !!planSlug.value && planSlug.value !== 'starter')
const canUseWhatsApp = computed(() => isPaidPlan.value)

const trialPlans = [
  { id: 'silver', name: 'Silver', description: 'Website and WhatsApp automation for a focused launch.' },
  { id: 'gold', name: 'Gold', description: 'Adds Instagram workflows for social conversations.' },
  { id: 'enterprise-ready', name: 'Enterprise Ready', description: 'Full channel, booking, and business-tool trial.' },
]

const integrationOptions = computed(() => [
  { id: 'website' as const, title: 'Website widget', description: 'Train the assistant, then install it on your website.', icon: Globe, available: true, to: '/dashboard/integrations/website' },
  { id: 'whatsapp' as const, title: 'WhatsApp automation', description: canUseWhatsApp.value ? 'Connect WhatsApp after training for inbox automation.' : 'Upgrade to unlock WhatsApp automation.', icon: MessageCircle, available: canUseWhatsApp.value, to: '/dashboard/integrations/whatsapp' },
])

const isOnboardingPreview = computed(() => ['1', 'true', 'yes'].includes(String(route.query.onboarding || '').toLowerCase()))

const { data: onboardingState, pending, refresh } = useAsyncData('dashboard-onboarding-modal', async () => {
  if (!userId.value) return { botId: null, botCount: 0, onboarding: [], stepCodes: [] }

  const [botsRes, onboardingRes, stepsRes] = await Promise.all([
    supabase.from('chatbots').select('id, created_at').eq('user_id', userId.value).is('deleted_at', null).order('created_at', { ascending: true }).limit(1),
    supabase.from('user_onboarding').select('id, step_code, completed, completed_at').eq('user_id', userId.value),
    supabase.from('onboarding_steps').select('code').in('code', [...onboardingStepCodes]),
  ])

  return {
    botId: botsRes.data?.[0]?.id || null,
    botCount: botsRes.data?.length || 0,
    onboarding: onboardingRes.data || [],
    stepCodes: stepsRes.data?.map((step: any) => step.code).filter(Boolean) || [],
  }
}, { watch: [userId, () => isVerified.value, () => route.path] })

const onboardingRows = computed(() => onboardingState.value?.onboarding || [])
const supportedStepCodes = computed(() => new Set<string>(onboardingState.value?.stepCodes?.length ? onboardingState.value.stepCodes : ['verify_account', 'create_chatbot']))
const canPersistStep = (stepCode: StepCode) => supportedStepCodes.value.has(stepCode)
const activeBotId = computed(() => createdAgentId.value || onboardingState.value?.botId || null)
const onboardingByCode = computed(() => onboardingRows.value.reduce((acc, row: any) => {
  if (row?.step_code) acc[row.step_code] = row
  return acc
}, {} as Record<string, any>))
const hasAllRequiredRows = computed(() => [...supportedStepCodes.value].every((stepCode) => !!onboardingByCode.value[stepCode]))
const completedSteps = computed(() => new Set(onboardingRows.value.filter((row: any) => row.completed && row.step_code).map((row: any) => row.step_code as string)))

const companyComplete = computed(() => Boolean(
  String(profile.value?.company_name || companyDraft.value.company_name || '').trim() &&
  String(profile.value?.contact_email || companyDraft.value.contact_email || '').trim()
))
const needsVerify = computed(() => {
  if (!userId.value || pending.value || ensuringRows.value) return false
  if (isVerified.value) return false
  const row = onboardingByCode.value.verify_account
  return row ? !row.completed : true
})
const needsCompanyProfile = computed(() => {
  if (!userId.value || pending.value || ensuringRows.value) return false
  const row = onboardingByCode.value.company_profile
  return row ? !row.completed : !companyComplete.value
})
const needsChoosePlan = computed(() => {
  if (!userId.value || pending.value || ensuringRows.value) return false
  if (planSlug.value) return false
  const row = onboardingByCode.value.choose_plan
  return row ? !row.completed : true
})
const needsCreateChatbot = computed(() => {
  if (!userId.value || pending.value || ensuringRows.value) return false
  if (activeBotId.value || onboardingState.value?.botCount) return false
  const row = onboardingByCode.value.create_chatbot
  return row ? !row.completed : true
})
const needsChooseChannel = computed(() => {
  if (!userId.value || pending.value || ensuringRows.value) return false
  const row = onboardingByCode.value.choose_channel
  return row ? !row.completed : true
})
const isOnboardingRoute = computed(() => {
  const path = route.path
  return path.startsWith('/dashboard') && !path.startsWith('/dashboard/pricing') && !path.startsWith('/dashboard/billing') && !path.startsWith('/dashboard/settings/billing')
})
const shouldShow = computed(() => {
  if (!isOnboardingRoute.value) return false
  if (createdAgentId.value) return true
  if (!userId.value || pending.value || ensuringRows.value) return false
  if (!hasAllRequiredRows.value && !isOnboardingPreview.value) return false

  const firstSetupNeeded = needsVerify.value || needsCompanyProfile.value || needsChoosePlan.value || needsCreateChatbot.value || needsChooseChannel.value
  if (!onboardingChecked.value && !firstSetupNeeded && !forceOnboarding.value && !isOnboardingPreview.value) return false
  return !onboardingDismissed.value && (forceOnboarding.value || isOnboardingPreview.value || firstSetupNeeded)
})

const currentStep = computed<SetupStep>(() => {
  if (needsVerify.value) return 'verify'
  if (needsCompanyProfile.value) return 'company'
  if (needsChoosePlan.value) return 'trial'
  if (needsCreateChatbot.value) return 'chatbot'
  if (activeBotId.value && selectedIntegration.value) return 'done'
  if (activeBotId.value || (!needsCreateChatbot.value && needsChooseChannel.value)) return 'integration'
  return 'done'
})

const draftStorageKey = computed(() => userId.value ? `replysuite:onboarding-draft:${userId.value}` : 'replysuite:onboarding-draft')
const setupIncomplete = computed(() => needsVerify.value || needsCompanyProfile.value || needsChoosePlan.value || needsCreateChatbot.value || needsChooseChannel.value || !!createdAgentId.value)
const stepOrder: SetupStep[] = ['verify', 'company', 'trial', 'chatbot', 'integration', 'done']

const isStepAccessible = (step: SetupStep) => {
  if (step === 'verify') return needsVerify.value || isVerified.value || completedSteps.value.has('verify_account')
  if (step === 'company') return !needsVerify.value
  if (step === 'trial') return !needsVerify.value && companyComplete.value
  if (step === 'chatbot') return !needsVerify.value && companyComplete.value && (completedSteps.value.has('choose_plan') || !!planSlug.value || !needsChoosePlan.value)
  if (step === 'integration' || step === 'done') return !!activeBotId.value || completedSteps.value.has('create_chatbot')
  return false
}

const activeStep = computed<SetupStep>(() => {
  if (manualStep.value && isStepAccessible(manualStep.value)) return manualStep.value
  return currentStep.value
})

const activeStepIndex = computed(() => Math.max(0, stepOrder.indexOf(activeStep.value)))
const canGoBack = computed(() => stepOrder.slice(0, activeStepIndex.value).some((step) => isStepAccessible(step)))
const canGoNext = computed(() => {
  if (activeStep.value === 'verify') return !needsVerify.value || verificationCode.value.trim().length >= 6
  if (activeStep.value === 'company') return !!companyDraft.value.company_name.trim() && !!companyDraft.value.contact_email.trim() && !isSavingCompany.value
  if (activeStep.value === 'trial') return isVerified.value && !isStartingTrial.value
  if (activeStep.value === 'chatbot') return !!agentDraft.value.name.trim() && !isCreating.value
  if (activeStep.value === 'integration') return !!selectedIntegration.value
  return true
})

const activeStepLabel = computed(() => ({
  verify: 'Verify email',
  company: 'Business profile',
  trial: 'Choose access',
  chatbot: 'Create assistant',
  integration: 'Choose channel',
  done: 'Train and test',
} as Record<SetupStep, string>)[activeStep.value] || 'Setup')

watch(profile, (value: any) => {
  if (!value) return
  companyDraft.value = {
    full_name: value.full_name || companyDraft.value.full_name || '',
    company_name: value.company_name || companyDraft.value.company_name || '',
    contact_email: value.contact_email || user.value?.email || companyDraft.value.contact_email || '',
    website: value.website || companyDraft.value.website || '',
    country: value.country || companyDraft.value.country || '',
  }
}, { immediate: true })

watch(companyDraft, () => {
  if (!agentDraft.value.name.trim() && companyDraft.value.company_name.trim()) {
    agentDraft.value.name = `${companyDraft.value.company_name.trim()} Assistant`
  }
}, { deep: true })

const ensureOnboardingRows = async () => {
  if (!userId.value || pending.value || ensuringRows.value) return
  const missingSteps = onboardingStepCodes.filter((stepCode) => canPersistStep(stepCode) && !onboardingByCode.value[stepCode])
  if (!missingSteps.length) return

  ensuringRows.value = true
  try {
    const payload = missingSteps.map((stepCode) => ({
      user_id: userId.value,
      step_code: stepCode,
      completed: stepCode === 'verify_account' ? isVerified.value : stepCode === 'company_profile' ? companyComplete.value : false,
      completed_at: (stepCode === 'verify_account' && isVerified.value) || (stepCode === 'company_profile' && companyComplete.value) ? new Date().toISOString() : null,
    }))
    const { error } = await supabase.from('user_onboarding').insert(payload)
    if (error) throw error
    await refresh()
  } catch (error) {
    console.error('[Onboarding] Failed to ensure onboarding rows:', error)
  } finally {
    ensuringRows.value = false
  }
}

const syncStep = async (stepCode: StepCode) => {
  if (!userId.value || syncingSteps[stepCode] || completedSteps.value.has(stepCode) || !canPersistStep(stepCode)) return

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
        const { error } = await supabase.from('user_onboarding').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', existing.id)
        if (error) throw error
      }
    } else {
      const { error } = await supabase.from('user_onboarding').insert({ user_id: userId.value, step_code: stepCode, completed: true, completed_at: new Date().toISOString() })
      if (error) throw error
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

watch([isVerified, completedSteps, companyComplete, planSlug, () => onboardingState.value?.botId, () => onboardingState.value?.botCount], async ([verified, steps]) => {
  if (!userId.value || pending.value) return
  const completed = steps as Set<string>
  if (verified && !completed.has('verify_account')) await syncStep('verify_account')
  if (companyComplete.value && !completed.has('company_profile')) await syncStep('company_profile')
  if (planSlug.value && !completed.has('choose_plan')) await syncStep('choose_plan')
  if ((onboardingState.value?.botId || onboardingState.value?.botCount) && !completed.has('create_chatbot')) await syncStep('create_chatbot')
}, { immediate: true })

watch([shouldShow, needsVerify, needsCompanyProfile, needsChoosePlan, needsCreateChatbot, needsChooseChannel, setupIncomplete, onboardingDismissed, isOnboardingPreview], ([open, verifyNeeded, companyNeeded, planNeeded, chatbotNeeded, channelNeeded, incomplete, dismissed, preview]) => {
  if (process.server) return
  if (preview) {
    forceOnboarding.value = true
    onboardingDismissed.value = false
    if (!manualStep.value) manualStep.value = needsVerify.value ? 'verify' : 'company'
  } else if (verifyNeeded || companyNeeded || planNeeded || chatbotNeeded || channelNeeded) forceOnboarding.value = true
  else if (!createdAgentId.value) forceOnboarding.value = false

  onboardingNavigationLocked.value = Boolean(!open && dismissed && incomplete && isOnboardingRoute.value)
  document.documentElement.style.overflow = open ? 'hidden' : ''
  document.body.style.overflow = open ? 'hidden' : ''
}, { immediate: true })

watch(activeStep, () => {
  draftStatus.value = ''
})

watch([companyDraft, agentDraft, selectedIntegration], () => {
  if (process.server || !userId.value) return
  if (draftSaveTimer) clearTimeout(draftSaveTimer)
  draftStatus.value = 'Saving draft...'
  draftSaveTimer = setTimeout(() => saveDraft(true), 500)
}, { deep: true })

onMounted(() => {
  if (process.server) return
  try {
    const rawDraft = localStorage.getItem(draftStorageKey.value)
    if (!rawDraft) return
    const draft = JSON.parse(rawDraft)
    if (draft?.companyDraft) companyDraft.value = { ...companyDraft.value, ...draft.companyDraft }
    if (draft?.agentDraft) agentDraft.value = { ...agentDraft.value, ...draft.agentDraft }
    if (draft?.selectedIntegration === 'website' || draft?.selectedIntegration === 'whatsapp') selectedIntegration.value = draft.selectedIntegration
  } catch (error) {
    console.warn('[Onboarding] Failed to restore local draft:', error)
  }
})

onBeforeUnmount(() => {
  if (process.server) return
  if (draftSaveTimer) clearTimeout(draftSaveTimer)
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
    await $fetch('/api/auth/verify-code', { method: 'POST', body: { code: verificationCode.value.trim() } })
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

const normalizeWebsite = (value: string) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

const saveCompanyInfo = async () => {
  if (!userId.value || !companyDraft.value.company_name.trim() || !companyDraft.value.contact_email.trim()) return

  try {
    isSavingCompany.value = true
    companyError.value = ''
    const { error } = await supabase.from('profiles').update({
      full_name: companyDraft.value.full_name.trim() || null,
      company_name: companyDraft.value.company_name.trim(),
      contact_email: companyDraft.value.contact_email.trim(),
      website: normalizeWebsite(companyDraft.value.website) || null,
      country: companyDraft.value.country.trim() || null,
    }).eq('id', userId.value)
    if (error) throw error
    companySavedThisSession.value = true
    await refreshAuth()
    await syncStep('company_profile')
  } catch (error: any) {
    companyError.value = error?.message || 'Unable to save company information.'
  } finally {
    isSavingCompany.value = false
  }
}

const getWebsiteHostname = (value: string) => {
  try {
    const website = normalizeWebsite(value)
    return website ? new URL(website).hostname : ''
  } catch {
    return ''
  }
}

const buildSystemPrompt = () => {
  const purpose = agentDraft.value.system_prompt.trim() || 'Answer customer questions, qualify leads, and guide visitors to the next best action.'
  const company = companyDraft.value.company_name.trim() || profile.value?.company_name || 'the business'
  const website = normalizeWebsite(companyDraft.value.website || profile.value?.website || '')
  return [
    `You are ${agentDraft.value.name.trim()}, the AI assistant for ${company}.`,
    purpose,
    'Be concise, helpful, professional, and honest. If the knowledge base does not contain the answer, say so and suggest contacting the team.',
    website ? `Use this company website as business context: ${website}.` : '',
  ].filter(Boolean).join('\n')
}

const createChatbot = async () => {
  if (!userId.value || !agentDraft.value.name.trim()) return

  try {
    isCreating.value = true
    createError.value = ''
    const website = normalizeWebsite(companyDraft.value.website || profile.value?.website || '')
    const { data, error } = await supabase.from('chatbots').insert({
      user_id: userId.value,
      name: agentDraft.value.name.trim(),
      system_prompt: buildSystemPrompt(),
      default_language: normalizeChatbotLanguageName(agentDraft.value.default_language),
      welcome_message: `Hi! I'm ${agentDraft.value.name.trim()}. How can I help you today?`,
      allowed_domains: getWebsiteHostname(website) ? [getWebsiteHostname(website)] : [],
      is_public: true,
    }).select('id').single()
    if (error) throw error

    if (data?.id) {
      const primaryCode = getChatbotLanguageCode(agentDraft.value.default_language)
      const languageRows = Array.from(new Set([primaryCode, 'en'])).map((code) => ({
        chatbot_id: data.id,
        language_code: code,
        is_primary: code === primaryCode,
        is_fallback: code === 'en',
        is_enabled: true,
      }))
      const { error: languageError } = await (supabase as any).from('chatbot_languages').upsert(languageRows, { onConflict: 'chatbot_id,language_code' })
      if (languageError) console.warn('[Onboarding] Chatbot language mapping will sync after migration deployment:', languageError)
    }

    await syncStep('create_chatbot')
    createdAgentId.value = data?.id || null
    selectedIntegration.value = null
    await refresh()
  } catch (error: any) {
    createError.value = error?.message || 'Unable to create chatbot right now.'
  } finally {
    isCreating.value = false
  }
}

const startTrial = async (planId: string) => {
  if (isStartingTrial.value) return
  if (!isVerified.value) {
    trialError.value = 'Verify your email before starting a trial.'
    manualStep.value = 'verify'
    return
  }

  isStartingTrial.value = true
  trialError.value = ''
  try {
    await $fetch('/api/billing/trial/start', {
      method: 'POST',
      body: { planId },
    })
    await refreshAuth()
    await syncStep('choose_plan')
    await refresh()
    manualStep.value = 'chatbot'
  } catch (error: any) {
    trialError.value = error?.data?.message || error?.data?.statusMessage || error?.statusMessage || error?.message || 'Could not start your trial.'
  } finally {
    isStartingTrial.value = false
  }
}

const continueStarter = async () => {
  await syncStep('choose_plan')
  await refresh()
  manualStep.value = 'chatbot'
}

const chooseIntegration = async (integration: 'website' | 'whatsapp') => {
  if (integration === 'whatsapp' && !canUseWhatsApp.value) return
  selectedIntegration.value = integration
  await syncStep('choose_channel')
  await refresh()
  manualStep.value = 'done'
}

const saveDraft = (silent = false) => {
  if (process.server) return
  localStorage.setItem(draftStorageKey.value, JSON.stringify({
    companyDraft: companyDraft.value,
    agentDraft: agentDraft.value,
    selectedIntegration: selectedIntegration.value,
    savedAt: new Date().toISOString(),
  }))
  draftStatus.value = silent ? 'Draft autosaved' : 'Draft saved'
  window.setTimeout(() => {
    if (draftStatus.value === 'Draft autosaved' || draftStatus.value === 'Draft saved') draftStatus.value = ''
  }, 2200)
}

const goBack = () => {
  const previous = stepOrder.slice(0, activeStepIndex.value).reverse().find((step) => isStepAccessible(step))
  if (previous) manualStep.value = previous
}

const goNext = async () => {
  if (!canGoNext.value) return
  if (activeStep.value === 'verify') {
    if (needsVerify.value) await verifyAccount()
    else manualStep.value = 'company'
    return
  }
  if (activeStep.value === 'company') {
    await saveCompanyInfo()
    if (!companyError.value) manualStep.value = isTrialing.value ? 'chatbot' : 'trial'
    return
  }
  if (activeStep.value === 'trial') {
    await syncStep('choose_plan')
    manualStep.value = 'chatbot'
    return
  }
  if (activeStep.value === 'chatbot') {
    await createChatbot()
    return
  }
  if (activeStep.value === 'integration') {
    if (selectedIntegration.value) {
      await syncStep('choose_channel')
      manualStep.value = 'done'
    }
    return
  }
  openTraining()
}

const openTraining = () => {
  const id = activeBotId.value
  if (!id) return
  const integration = selectedIntegration.value || 'website'
  createdAgentId.value = null
  onboardingDismissed.value = true
  forceOnboarding.value = false
  onboardingNavigationLocked.value = false
  navigateTo(`/dashboard/agents/skills/training?id=${id}&onboarding=1&integration=${integration}&test=1`)
}

const openIntegration = () => {
  const target = integrationOptions.value.find((item) => item.id === (selectedIntegration.value || 'website'))
  createdAgentId.value = null
  onboardingDismissed.value = true
  forceOnboarding.value = false
  onboardingNavigationLocked.value = false
  navigateTo(target?.to || '/dashboard/integrations/website')
}

const closeModal = () => {
  saveDraft()
  onboardingDismissed.value = true
  onboardingNavigationLocked.value = setupIncomplete.value
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
      <div v-if="shouldShow" class="fixed inset-0 z-[500] bg-background/85 p-3 backdrop-blur-xl sm:p-5">
        <div class="flex min-h-full items-end justify-center md:items-center">
          <div class="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background-card shadow-2xl shadow-black/30 md:max-h-[78vh]">
            <main class="flex w-full flex-col overflow-y-auto p-4 md:max-h-[78vh]">
              <header class="mb-3 border-b border-foreground/10 pb-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex min-w-0 items-center gap-3">
                    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.39rem] border border-primary/20 bg-primary/10 text-primary">
                      <Loader2 v-if="verifying || isSavingCompany || isStartingTrial || isCreating" class="h-4 w-4 animate-spin" />
                      <ShieldCheck v-else-if="activeStep === 'verify'" class="h-4 w-4" />
                      <Building2 v-else-if="activeStep === 'company'" class="h-4 w-4" />
                      <Sparkles v-else-if="activeStep === 'trial'" class="h-4 w-4" />
                      <Bot v-else-if="activeStep === 'chatbot'" class="h-4 w-4" />
                      <Globe v-else-if="activeStep === 'integration'" class="h-4 w-4" />
                      <CheckCircle2 v-else class="h-4 w-4" />
                    </div>
                    <div class="min-w-0">
                      <p class="dashboard-action-label text-primary">Onboarding</p>
                      <h2 class="truncate text-base font-black tracking-tight text-foreground">{{ activeStepLabel }}</h2>
                      <p class="dashboard-muted mt-0.5">Launch your first assistant.</p>
                    </div>
                  </div>

                  <button type="button" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.39rem] border border-foreground/10 text-foreground/45 transition hover:border-foreground/20 hover:text-foreground" aria-label="Save draft and close onboarding" @click="closeModal">
                    <X class="h-4 w-4" />
                  </button>
                </div>

              </header>
              <section v-if="activeStep === 'verify'" class="mx-auto max-w-2xl">
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Step 1</p>
                <h3 class="mt-2 text-2xl font-black tracking-tight text-foreground">Verify your email</h3>
                <p class="mt-2 text-sm leading-relaxed text-foreground/60">Enter the 6-digit code sent to <span class="font-bold text-foreground">{{ user?.email }}</span>.</p>

                <div class="mt-6 rounded-[0.39rem] border border-foreground/8 bg-background/70 p-5">
                  <label class="mb-3 block text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Verification code</label>
                  <input v-model="verificationCode" type="text" maxlength="6" inputmode="numeric" placeholder="000000" class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-5 py-4 text-center font-mono text-2xl tracking-[0.45em] text-foreground outline-none transition placeholder:text-foreground/10 focus:border-primary/50" @keyup.enter="verifyAccount" />
                  <p v-if="verifyError" class="mt-4 rounded-[0.39rem] border border-red-400/10 bg-red-400/5 p-4 text-sm font-semibold text-red-400">{{ verifyError }}</p>
                  <div class="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button type="button" class="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-5 text-sm font-black text-black transition hover:brightness-95 disabled:opacity-50" :disabled="verifying || verificationCode.trim().length < 6" @click="verifyAccount">
                      <Loader2 v-if="verifying" class="h-4 w-4 animate-spin" />
                      {{ verifying ? 'Verifying...' : 'Verify account' }}
                    </button>
                    <button type="button" class="inline-flex h-12 flex-1 items-center justify-center rounded-[0.39rem] border border-foreground/10 px-5 text-sm font-bold text-foreground/60 transition hover:border-foreground/20 hover:text-foreground disabled:opacity-50" :disabled="resendLoading" @click="resendVerification">
                      {{ resendLoading ? 'Sending...' : resendSuccess ? 'Code sent' : 'Resend code' }}
                    </button>
                  </div>
                </div>
              </section>

              <section v-else-if="activeStep === 'company'" class="mx-auto max-w-3xl">
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Step 2</p>
                <h3 class="mt-2 text-2xl font-black tracking-tight text-foreground">Tell us about your company</h3>
                <p class="mt-2 text-sm leading-relaxed text-foreground/60">This information helps prefill your chatbot behavior and integration setup.</p>

                <div class="mt-6 grid gap-4 rounded-[0.39rem] border border-foreground/8 bg-background/70 p-5 sm:grid-cols-2">
                  <label class="space-y-2">
                    <span class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Your name</span>
                    <input v-model="companyDraft.full_name" class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50" placeholder="Jane Doe" />
                  </label>
                  <label class="space-y-2">
                    <span class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Company name</span>
                    <input v-model="companyDraft.company_name" class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50" placeholder="Acme Ltd" />
                  </label>
                  <label class="space-y-2">
                    <span class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Contact email</span>
                    <input v-model="companyDraft.contact_email" type="email" class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50" placeholder="support@company.com" />
                  </label>
                  <label class="space-y-2">
                    <span class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Website</span>
                    <input v-model="companyDraft.website" class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50" placeholder="https://company.com" />
                  </label>
                  <label class="space-y-2 sm:col-span-2">
                    <span class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Country / market</span>
                    <input v-model="companyDraft.country" class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50" placeholder="Rwanda, United States, Global..." />
                  </label>
                  <p v-if="companyError" class="rounded-[0.39rem] border border-red-400/10 bg-red-400/5 p-4 text-sm font-semibold text-red-400 sm:col-span-2">{{ companyError }}</p>
                  <button type="button" class="inline-flex h-12 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-5 text-sm font-black text-black transition hover:brightness-95 disabled:opacity-50 sm:col-span-2" :disabled="isSavingCompany || !companyDraft.company_name.trim() || !companyDraft.contact_email.trim()" @click="goNext">
                    <Loader2 v-if="isSavingCompany" class="h-4 w-4 animate-spin" />
                    {{ isSavingCompany ? 'Saving...' : 'Save and continue' }}
                    <ArrowRight v-if="!isSavingCompany" class="h-4 w-4" />
                  </button>
                </div>
              </section>

              <section v-else-if="activeStep === 'trial'" class="mx-auto max-w-3xl">
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Step 3</p>
                <h3 class="mt-2 text-2xl font-black tracking-tight text-foreground">Start a 3-day trial</h3>
                <p class="mt-2 text-sm leading-relaxed text-foreground/60">Create and train your assistant first. Pay only when you are ready to keep it live.</p>

                <div class="mt-6 grid gap-3">
                  <button
                    v-for="plan in trialPlans"
                    :key="plan.id"
                    type="button"
                    class="rounded-[0.39rem] border border-foreground/10 bg-background/70 p-4 text-left transition hover:border-primary/30 hover:bg-primary/[0.035] disabled:cursor-wait disabled:opacity-60"
                    :disabled="isStartingTrial || !isVerified"
                    @click="startTrial(plan.id)"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="text-base font-black text-foreground">{{ plan.name }}</p>
                        <p class="mt-1 text-sm leading-relaxed text-foreground/55">{{ plan.description }}</p>
                      </div>
                      <span class="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-primary">3 days</span>
                    </div>
                  </button>
                </div>

                <p v-if="trialError" class="mt-4 rounded-[0.39rem] border border-red-400/10 bg-red-400/5 p-4 text-sm font-semibold text-red-400">{{ trialError }}</p>

                <button type="button" class="mt-4 inline-flex h-12 w-full items-center justify-center rounded-[0.39rem] border border-foreground/10 px-5 text-sm font-bold text-foreground/60 transition hover:border-foreground/20 hover:text-foreground" @click="continueStarter">
                  Continue with Free Starter
                </button>
              </section>

              <section v-else-if="activeStep === 'chatbot'" class="mx-auto max-w-3xl">
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Step 4</p>
                <h3 class="mt-2 text-2xl font-black tracking-tight text-foreground">Create your chatbot</h3>
                <p class="mt-2 text-sm leading-relaxed text-foreground/60">Add a name and basic prompt. You will train it right after setup.</p>

                <div class="mt-6 rounded-[0.39rem] border border-foreground/8 bg-background/70 p-5">
                  <div class="grid gap-4">
                    <label class="space-y-2">
                      <span class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Chatbot name</span>
                      <input v-model="agentDraft.name" maxlength="80" class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50" placeholder="Company Assistant" />
                    </label>
                    <label class="space-y-2">
                      <span class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Basic prompt</span>
                      <textarea v-model="agentDraft.system_prompt" rows="5" class="w-full resize-none rounded-[0.39rem] border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50" placeholder="Help visitors answer FAQs, qualify leads, and explain our services." />
                    </label>
                    <label class="space-y-2">
                      <span class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Default language</span>
                      <select v-model="agentDraft.default_language" class="w-full rounded-[0.39rem] border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50">
                        <option v-for="language in languageOptions" :key="language" :value="language">{{ language }}</option>
                      </select>
                    </label>
                  </div>
                  <p v-if="createError" class="mt-4 rounded-[0.39rem] border border-red-400/10 bg-red-400/5 p-4 text-sm font-semibold text-red-400">{{ createError }}</p>
                  <button type="button" class="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-5 text-sm font-black text-black transition hover:brightness-95 disabled:opacity-50" :disabled="isCreating || !agentDraft.name.trim()" @click="createChatbot">
                    <Loader2 v-if="isCreating" class="h-4 w-4 animate-spin" />
                    {{ isCreating ? 'Creating...' : 'Create chatbot' }}
                    <ArrowRight v-if="!isCreating" class="h-4 w-4" />
                  </button>
                </div>
              </section>

              <section v-else-if="activeStep === 'integration'" class="mx-auto max-w-3xl">
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Step 5</p>
                <h3 class="mt-2 text-2xl font-black tracking-tight text-foreground">Which integration do you need first?</h3>
                <p class="mt-2 text-sm leading-relaxed text-foreground/60">We will start with training, then send you to the channel setup you choose.</p>

                <div class="mt-6 grid gap-4 sm:grid-cols-2">
                  <button v-for="option in integrationOptions" :key="option.id" type="button" class="rounded-[0.39rem] border p-5 text-left transition-all" :class="option.available ? 'border-foreground/10 bg-background/70 hover:border-primary/30' : 'cursor-not-allowed border-foreground/5 bg-foreground/[0.02] opacity-60'" :disabled="!option.available" @click="chooseIntegration(option.id)">
                    <div class="mb-4 flex h-11 w-11 items-center justify-center rounded-[0.39rem] border border-primary/20 bg-primary/10 text-primary">
                      <component :is="option.icon" class="h-5 w-5" />
                    </div>
                    <p class="text-base font-black text-foreground">{{ option.title }}</p>
                    <p class="mt-2 text-sm leading-relaxed text-foreground/55">{{ option.description }}</p>
                    <span class="mt-4 inline-flex rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em]" :class="option.available ? 'bg-primary/10 text-primary' : 'bg-foreground/5 text-foreground/40'">
                      {{ option.available ? 'Select' : 'Locked on free' }}
                    </span>
                  </button>
                </div>
              </section>

              <section v-else class="mx-auto flex min-h-[440px] max-w-2xl flex-col items-center justify-center text-center">
                <div class="mb-5 flex h-20 w-20 items-center justify-center rounded-[0.39rem] border border-primary/20 bg-primary/10 text-primary shadow-lg shadow-primary/10">
                  <CheckCircle2 class="h-9 w-9" />
                </div>
                <p class="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Final step</p>
                <h3 class="mt-3 text-2xl font-black tracking-tight text-foreground">Train and test your assistant</h3>
                <p class="mt-3 max-w-xl text-sm leading-relaxed text-foreground/60">
                  Add knowledge from your website, PDF, or business notes, then test replies on the selected assistant before connecting {{ selectedIntegration === 'whatsapp' ? 'WhatsApp' : 'website' }}.
                </p>

                <div class="mt-7 w-full max-w-sm">
                  <button type="button" class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-5 text-sm font-black text-black transition hover:brightness-95" @click="openTraining">
                    Go to training and test
                    <ArrowRight class="h-4 w-4" />
                  </button>
                </div>
              </section>

              <div class="mt-4 flex flex-col gap-3 border-t border-foreground/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-h-5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/45">
                  {{ draftStatus || 'Draft autosaves' }}
                </div>
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.39rem] border border-foreground/10 px-4 text-xs font-black text-foreground/60 transition hover:border-foreground/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35" :disabled="!canGoBack" @click="goBack">
                    <ArrowLeft class="h-4 w-4" />
                    Back
                  </button>
                  <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-5 text-xs font-black text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45" :disabled="!canGoNext || verifying || isSavingCompany || isStartingTrial || isCreating" @click="goNext">
                    <Loader2 v-if="verifying || isSavingCompany || isStartingTrial || isCreating" class="h-4 w-4 animate-spin" />
                    <span>{{ activeStep === 'done' ? 'Go to training' : 'Next' }}</span>
                    <ArrowRight v-if="!(verifying || isSavingCompany || isStartingTrial || isCreating)" class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
