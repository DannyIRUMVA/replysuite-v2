export default defineNuxtRouteMiddleware(async (to, from) => {
  const auth = useAuth()
  const user = auth.user
  const membership = auth.membership

  // 1. Mandatory Login for dashboard & verify
  if (!user.value && (to.path.startsWith('/dashboard') || to.path === '/verify')) {
    return navigateTo('/login')
  }

  // 1.5. Mandatory Verification
  if (user.value && to.path.startsWith('/dashboard')) {
    let verified = auth.isVerified.value
    
    // Double check DB if reactive state is still loading
    if (!verified && auth.userId.value) {
      const supabase = useSupabaseClient()
      const { data } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', auth.userId.value)
        .single()
      
      verified = data?.is_verified || false
    }

    if (!verified) {
      return navigateTo('/verify')
    }
  }

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

  // 3. Keep logged-in users inside the dashboard layout
  if (user.value && to.path === '/pricing') {
    return navigateTo('/dashboard/pricing')
  }
})
