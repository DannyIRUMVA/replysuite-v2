const getPlanPriority = (slug?: string | null) => {
  const normalized = String(slug || '').toLowerCase()
  if (['enterprise-ready', 'enterprise'].includes(normalized)) return 4
  if (normalized === 'gold') return 3
  if (normalized === 'silver') return 2
  if (normalized === 'starter') return 1
  return 0
}

const isTrialingMembership = (membership: any) => {
  const status = String(membership?.status || '').toLowerCase()
  const provider = String(membership?.provider || '').toLowerCase()
  return status === 'trialing' || provider === 'trial'
}

const isMembershipCurrentlyUsable = (membership: any, now = Date.now()) => {
  if (!membership || membership?.is_active === false) return false
  const status = String(membership?.status || '').toLowerCase()
  if (['expired', 'canceled', 'past_due'].includes(status)) return false
  const rawEnd = isTrialingMembership(membership)
    ? (membership?.trial_ends_at || membership?.ends_at)
    : (membership?.ends_at || membership?.trial_ends_at)
  if (!rawEnd) return true
  const endTime = new Date(rawEnd).getTime()
  return Number.isFinite(endTime) ? endTime > now : true
}

const selectBestPlanSlug = (memberships: any[] = []) => memberships
  .filter((membership) => isMembershipCurrentlyUsable(membership))
  .map((membership) => String((membership?.plans as any)?.internal_slug || '').toLowerCase())
  .sort((a, b) => getPlanPriority(b) - getPlanPriority(a))[0] || ''

const loadActiveMemberships = async (supabase: ReturnType<typeof useSupabaseClient>, userId: string, includePlans = false) => {
  const selectWithTrial = includePlans
    ? 'is_active, ends_at, trial_ends_at, status, provider, plans(internal_slug)'
    : 'id, is_active, ends_at, trial_ends_at, status, provider'
  const selectLegacy = includePlans
    ? 'is_active, ends_at, plans(internal_slug)'
    : 'id, is_active, ends_at'

  const primary = await supabase
    .from('user_memberships')
    .select(selectWithTrial)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!primary.error) return { data: primary.data || [], error: null }

  const fallback = await supabase
    .from('user_memberships')
    .select(selectLegacy)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (fallback.error) {
    console.warn('[Auth Middleware] Membership lookup failed:', fallback.error.message || primary.error.message)
    return { data: [], error: fallback.error }
  }

  return { data: fallback.data || [], error: null }
}

const onboardingStepCodes = ['verify_account', 'company_profile', 'choose_plan', 'create_chatbot', 'choose_channel']

export default defineNuxtRouteMiddleware(async (to, from) => {
  const auth = useAuth()
  const user = auth.user
  const forceOnboarding = useState<boolean>('dashboard-force-onboarding', () => false)
  const onboardingChecked = useState<boolean>('dashboard-force-onboarding-checked', () => false)
  const onboardingDismissed = useState<boolean>('dashboard-onboarding-dismissed', () => false)

  // 1. Mandatory Login for dashboard & verify
  if (!user.value && (to.path.startsWith('/dashboard') || to.path === '/verify')) {
    const supabase = useSupabaseClient()
    const { data: sessionData } = await supabase.auth.getSession()

    if (!sessionData?.session?.user) {
      forceOnboarding.value = false
      onboardingChecked.value = false
      onboardingDismissed.value = false
      return navigateTo({
        path: '/login',
        query: to.fullPath && to.fullPath !== '/dashboard' ? { redirect: to.fullPath } : undefined,
      })
    }
  }

  // 1.5. Verification is now handled inside the dashboard onboarding modal.
  // Keep /verify available as a fallback page, but do not force redirect away from dashboard.
  const previewOnboarding = user.value && to.path.startsWith('/dashboard') && ['1', 'true', 'yes'].includes(String(to.query.onboarding || '').toLowerCase())

  // 2. Mandatory Pricing for new users
  // If authenticated, trying to reach dashboard, and has NO membership/plan currently loaded
  if (user.value && to.path.startsWith('/dashboard') && to.path !== '/dashboard/pricing' && !previewOnboarding) {
    let hasMembership = !!auth.membership.value

    // If reactivity hasn't resolved the membership yet, double-check the DB
    if (!hasMembership && auth.userId.value) {
      const supabase = useSupabaseClient()
      const { data, error } = await loadActiveMemberships(supabase, auth.userId.value)
      hasMembership = error ? true : data.some((membership: any) => isMembershipCurrentlyUsable(membership))
    }

    if (!hasMembership) {
      return navigateTo('/dashboard/pricing')
    }
  }

  // 2.2. Plan feature gates.
  if (user.value && to.path.startsWith('/dashboard') && to.path !== '/dashboard/pricing' && auth.userId.value) {
    const normalize = (value: unknown) => String(value || '').toLowerCase()
    let slug = normalize(auth.planSlug.value)

    if (!slug) {
      const supabase = useSupabaseClient()
      const { data, error } = await loadActiveMemberships(supabase, auth.userId.value, true)
      if (error) return
      slug = selectBestPlanSlug(data || [])
    }

    const isGoldOrEnterprise = ['gold', 'enterprise-ready', 'enterprise'].includes(slug)
    const isEnterprise = ['enterprise-ready', 'enterprise'].includes(slug)

    if (to.path.startsWith('/dashboard/integrations/instagram') && !isGoldOrEnterprise) {
      return navigateTo('/dashboard/pricing')
    }

    if (to.path.startsWith('/dashboard/orders')) {
      return navigateTo(isEnterprise ? '/dashboard/appointments' : '/dashboard/pricing')
    }

    if (to.path.startsWith('/dashboard/appointments') && !isEnterprise) {
      return navigateTo('/dashboard/pricing')
    }

    if (to.path.startsWith('/dashboard/agents/tools/website-builder') && !isEnterprise) {
      return navigateTo('/dashboard/pricing')
    }
  }

  // 2.5. Dashboard onboarding check
  if (user.value && to.path.startsWith('/dashboard') && auth.userId.value) {
    if (previewOnboarding) {
      forceOnboarding.value = true
      onboardingChecked.value = true
      onboardingDismissed.value = false
    }

    try {
      const supabase = useSupabaseClient()

      let verified = auth.isVerified.value
      if (!verified) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_verified')
          .eq('id', auth.userId.value)
          .maybeSingle()

        verified = !!profile?.is_verified
      }

      if (verified && !previewOnboarding) {
        forceOnboarding.value = false
        onboardingChecked.value = true
        onboardingDismissed.value = true
        return
      }

      const [onboardingRes, botsRes, profileRes, stepsRes] = await Promise.all([
        supabase
          .from('user_onboarding')
          .select('step_code, completed')
          .eq('user_id', auth.userId.value),
        supabase
          .from('chatbots')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', auth.userId.value)
          .is('deleted_at', null),
        supabase
          .from('profiles')
          .select('company_name, contact_email')
          .eq('id', auth.userId.value)
          .maybeSingle(),
        supabase
          .from('onboarding_steps')
          .select('code')
          .in('code', onboardingStepCodes),
      ])

      const onboardingRows = onboardingRes.data || []
      const rowsByCode = onboardingRows.reduce((acc: Record<string, boolean>, row: any) => {
        if (row?.step_code) acc[row.step_code] = !!row.completed
        return acc
      }, {})
      const hasChatbot = (botsRes.count || 0) > 0
      const hasCompanyProfile = Boolean(String(profileRes.data?.company_name || '').trim() && String(profileRes.data?.contact_email || '').trim())
      const hasPlan = Boolean(auth.planSlug.value)

      const inferredCompletion: Record<string, boolean> = {
        verify_account: verified,
        company_profile: hasCompanyProfile,
        choose_plan: hasPlan,
        create_chatbot: hasChatbot,
        choose_channel: false,
      }
      const supportedStepCodes = stepsRes.data?.map((step: any) => step.code).filter(Boolean) || ['verify_account', 'create_chatbot']
      const needsOnboarding = supportedStepCodes.some((code) => rowsByCode[code] ?? !inferredCompletion[code])

      forceOnboarding.value = previewOnboarding || (!verified && needsOnboarding)
      onboardingChecked.value = true

      if (forceOnboarding.value) {
        onboardingDismissed.value = false
      }
    } catch (error) {
      console.error('[Auth Middleware] Failed to evaluate onboarding state:', error)
      forceOnboarding.value = false
      onboardingChecked.value = false
      onboardingDismissed.value = false
    }
  } else {
    forceOnboarding.value = false
    onboardingChecked.value = false
    onboardingDismissed.value = false
  }

  // 3. Keep logged-in users inside the dashboard layout
  if (user.value && to.path === '/pricing') {
    return navigateTo('/dashboard/pricing')
  }
})
