export default defineNuxtRouteMiddleware(async (to, from) => {
  const auth = useAuth()
  const user = auth.user
  const forceOnboarding = useState<boolean>('dashboard-force-onboarding', () => false)
  const onboardingChecked = useState<boolean>('dashboard-force-onboarding-checked', () => false)
  const onboardingDismissed = useState<boolean>('dashboard-onboarding-dismissed', () => false)

  // 1. Mandatory Login for dashboard & verify
  if (!user.value && (to.path.startsWith('/dashboard') || to.path === '/verify')) {
    forceOnboarding.value = false
    onboardingChecked.value = false
    onboardingDismissed.value = false
    return navigateTo('/login')
  }

  // 1.5. Verification is now handled inside the dashboard onboarding modal.
  // Keep /verify available as a fallback page, but do not force redirect away from dashboard.

  // 2. Mandatory Pricing for new users
  // If authenticated, trying to reach dashboard, and has NO membership/plan currently loaded
  if (user.value && to.path.startsWith('/dashboard') && to.path !== '/dashboard/pricing') {
    let hasMembership = !!auth.membership.value

    // If reactivity hasn't resolved the membership yet, double-check the DB
    if (!hasMembership && auth.userId.value) {
      const supabase = useSupabaseClient()
      const { data } = await supabase
        .from('user_memberships')
        .select('id')
        .eq('user_id', auth.userId.value)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      hasMembership = !!data
    }

    if (!hasMembership) {
      return navigateTo('/dashboard/pricing')
    }
  }

  // 2.5. Dashboard onboarding check
  if (user.value && to.path.startsWith('/dashboard') && auth.userId.value) {
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

      const [onboardingRes, botsRes] = await Promise.all([
        supabase
          .from('user_onboarding')
          .select('step_code, completed')
          .eq('user_id', auth.userId.value),
        supabase
          .from('chatbots')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', auth.userId.value)
          .is('deleted_at', null),
      ])

      const onboardingRows = onboardingRes.data || []
      const verifyStep = onboardingRows.find((row: any) => row.step_code === 'verify_account')
      const chatbotStep = onboardingRows.find((row: any) => row.step_code === 'create_chatbot')
      const hasChatbot = (botsRes.count || 0) > 0

      const verifyComplete = verifyStep ? !!verifyStep.completed : verified
      // Database-controlled onboarding flag:
      // user_onboarding.completed = true  -> do not show onboarding
      // user_onboarding.completed = false -> show onboarding, even if the user already has chatbots
      const chatbotComplete = chatbotStep ? !!chatbotStep.completed : hasChatbot

      forceOnboarding.value = !(verifyComplete && chatbotComplete)
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
