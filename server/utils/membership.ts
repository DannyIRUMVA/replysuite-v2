const normalizePlanSlug = (value: unknown) => String(value || '').trim().toLowerCase()

export const getPlanPriority = (slug?: string | null) => {
  const normalized = normalizePlanSlug(slug)
  if (['enterprise-ready', 'enterprise'].includes(normalized)) return 4
  if (normalized === 'gold') return 3
  if (normalized === 'silver') return 2
  if (normalized === 'starter') return 1
  return 0
}

export const isPaidPlanSlug = (slug?: string | null) => {
  const normalized = normalizePlanSlug(slug)
  return ['silver', 'gold', 'enterprise-ready', 'enterprise'].includes(normalized)
}

export const isTrialingMembership = (membership: any) => {
  const status = String(membership?.status || '').toLowerCase()
  const provider = String(membership?.provider || '').toLowerCase()
  return status === 'trialing' || provider === 'trial' || Boolean(membership?.trial_started_at || membership?.trial_ends_at)
}

export const getMembershipEndTime = (membership: any) => {
  const raw = membership?.trial_ends_at || membership?.ends_at
  if (!raw) return null
  const time = new Date(raw).getTime()
  return Number.isFinite(time) ? time : null
}

export const isMembershipCurrentlyUsable = (membership: any, now = Date.now()) => {
  if (!membership || membership?.is_active === false) return false
  const status = String(membership?.status || '').toLowerCase()
  if (['expired', 'canceled', 'past_due'].includes(status)) return false
  const endsAt = getMembershipEndTime(membership)
  if (endsAt && endsAt <= now) return false
  return true
}

export const selectBestMembership = (memberships: any[] = [], now = Date.now()) => memberships
  .filter((membership) => isMembershipCurrentlyUsable(membership, now))
  .sort((a, b) => {
    const priorityDiff = getPlanPriority(b?.plans?.internal_slug) - getPlanPriority(a?.plans?.internal_slug)
    if (priorityDiff !== 0) return priorityDiff
    const aStart = new Date(a?.starts_at || a?.created_at || 0).getTime()
    const bStart = new Date(b?.starts_at || b?.created_at || 0).getTime()
    return bStart - aStart
  })[0] || null

export const selectBestPlanSlug = (memberships: any[] = [], fallback = 'starter') => {
  const selected = selectBestMembership(memberships)
  return normalizePlanSlug(selected?.plans?.internal_slug) || fallback
}

export const getTrialDaysLeft = (membership: any) => {
  const endsAt = getMembershipEndTime(membership)
  if (!endsAt) return null
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 86_400_000))
}
