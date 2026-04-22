/**
 * useAuth Composable
 * Centralized source of truth for user identification and subscription state.
 */
export const useAuth = () => {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  // 1. Reactive Sanitized User ID
  const userId = computed(() => {
    // Some versions/decoders use 'id', others use 'sub' (JWT subject)
    const id = (user.value as any)?.id || (user.value as any)?.sub
    // Protect against the string 'undefined' which can appear in race conditions
    if (!id || id === 'undefined') return null
    return id
  })

  // 2. Fetch Profile & Membership (Reactive to userId)
  const { data: authData, pending: isAuthDataLoading, refresh: refreshAuth } = useAsyncData('auth-context', async () => {
    const currentId = userId.value
    if (!currentId) return null
    
    const [profileRes, membershipRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', currentId).single(),
      supabase.from('user_memberships').select('*, plans(*)').eq('user_id', currentId).eq('is_active', true).limit(1).maybeSingle()
    ])
    
    return {
      profile: profileRes.data,
      membership: membershipRes.data
    }
  }, { 
    watch: [userId], 
    immediate: true 
  })

  // 3. Derived Helper States
  const profile = computed(() => authData.value?.profile || null)
  const membership = computed(() => authData.value?.membership || null)
  const plan = computed(() => membership.value?.plans || null)
  const planSlug = computed(() => plan.value?.internal_slug || 'starter')
  
  const limits = computed(() => ({
    maxAccounts: plan.value?.max_instagram_accounts || 1,
    maxRules: plan.value?.max_triggers || 1,
    maxAgents: plan.value?.max_chatbots || 1,
    maxDms: plan.value?.max_auto_dms_per_month || 50,
    maxTrainings: planSlug.value === 'starter' ? 10 : 999999,
    maxEmbeddingMb: plan.value?.max_embedding_mb || (planSlug.value === 'starter' ? 1.0 : 5.0),
  }))

  const isLoading = computed(() => isAuthDataLoading.value)
  const isAuthenticated = computed(() => !!userId.value)

  // 4. Centralized Verification Logic (Aggressive & Robust)
  const isVerified = computed(() => {
    if (!isAuthenticated.value || !user.value) {
      return false
    }
    
    // 1. Database level (Single source of truth)
    if (profile.value?.is_verified) {
      return true
    }
    
    // 2. OAuth Markers (Google accounts are pre-verified)
    const userMeta = user.value.user_metadata || {}
    const appMeta = user.value.app_metadata || {}
    const providers = (appMeta as any).providers || []
    
    const isGoogle = 
      providers.includes('google') || 
      (appMeta as any).provider === 'google' ||
      (userMeta as any).iss === 'https://accounts.google.com' ||
      (userMeta as any).sub?.startsWith('google') ||
      (userMeta as any).provider_id?.includes('google')
    
    if (isGoogle) {
      return true
    }
    
    // 3. Email Confirmation Markers (Various Supabase versions)
    if (user.value.email_confirmed_at || (user.value as any).confirmed_at) {
      return true
    }
    
    return false
  })

  // 5. Self-Healing: Sync DB flag if markers are present
  // Use useState to persist these flags across various composable calls in the same session
  const hasSyncedVerification = useState('auth-synced', () => false)
  const isSyncing = useState('auth-syncing', () => false)
  const isInteracting = useState('auth-interacting', () => false)
  
  watch([user, profile], async ([u, p]) => {
    // Prevent server-side execution, redundant syncs, or syncs during active loading/typing
    if (process.server || isSyncing.value || hasSyncedVerification.value || isAuthDataLoading.value || isInteracting.value) return
    
    // Only attempt sync if we have a user and profile, profile says not verified, but markers say verified
    if (u && p && !p.is_verified && isVerified.value && userId.value) {
      try {
        isSyncing.value = true
        console.log('[DEBUG] Self-healing verification for:', u.email)
        
        const { error } = await supabase.from('profiles').update({ is_verified: true }).eq('id', userId.value)
        
        if (!error) {
          hasSyncedVerification.value = true
          // silent refresh - we don't want to trigger global loading for a background flag sync
          await refreshAuth()
        }
      } catch (err) {
        console.error('[AUTH] Background Sync Error:', err)
      } finally {
        isSyncing.value = false
      }
    }
  }, { immediate: true })

  const setInteracting = (state: boolean) => {
    isInteracting.value = state
  }


  /**
   * Helper to check if a specific action is allowed based on current counts.
   */
  const canAdd = (type: 'accounts' | 'rules', currentCount: number) => {
    if (type === 'accounts') return currentCount < limits.value.maxAccounts
    if (type === 'rules') return currentCount < limits.value.maxRules
    return false
  }

  return {
    user,
    userId,
    profile,
    membership,
    plan,
    planSlug,
    limits,
    isLoading,
    isAuthenticated,
    isVerified,
    canAdd,
    refreshAuth,
    setInteracting
  }
}
