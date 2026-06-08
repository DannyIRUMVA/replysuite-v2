import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

const resolveRedirectUri = (event: any) => {
  const config = useRuntimeConfig(event)
  const configured = String(config.instagramRedirectUri || '').trim()
  if (configured) return configured

  const siteUrl = String(config.public?.siteUrl || '').trim().replace(/\/$/, '')
  if (siteUrl) return `${siteUrl}/api/instagram/oauth/callback`

  return `${getRequestURL(event).origin}/api/instagram/oauth/callback`
}

const dashboardRedirect = (event: any, params: Record<string, string>) => {
  const target = new URL('/dashboard/integrations/instagram/setup', getRequestURL(event).origin)
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value)
  return target.pathname + target.search
}

const sanitizeErrorDetail = (value: unknown) => String(value || '')
  .replace(/[\r\n\t]+/g, ' ')
  .replace(/[?&](access_token|client_secret|code)=[^&\s]+/gi, '')
  .slice(0, 180)

const fetchJson = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init)
  const data = await response.json().catch(() => ({}))
  if (!response.ok || (data as any)?.error) {
    const message = (data as any)?.error?.message || (data as any)?.error_description || `Instagram request failed with HTTP ${response.status}`
    const error = new Error(message) as Error & { status?: number; payload?: unknown }
    error.status = response.status
    error.payload = data
    throw error
  }
  return data as any
}

const exchangeCodeForToken = async (event: any, code: string) => {
  const config = useRuntimeConfig(event)
  const clientId = String(config.instagramClientId || '').trim()
  const clientSecret = String(config.instagramClientSecret || '').trim()
  const redirectUri = resolveRedirectUri(event)

  if (!clientId || !clientSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Instagram app credentials are not configured.' })
  }

  const body = new URLSearchParams()
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)
  body.set('grant_type', 'authorization_code')
  body.set('redirect_uri', redirectUri)
  body.set('code', code)

  return await fetchJson('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
}

const exchangeForLongLivedToken = async (event: any, shortLivedToken: string) => {
  const config = useRuntimeConfig(event)
  const clientSecret = String(config.instagramClientSecret || '').trim()
  if (!clientSecret) return { access_token: shortLivedToken, expires_in: null }

  try {
    const url = new URL('https://graph.instagram.com/access_token')
    url.searchParams.set('grant_type', 'ig_exchange_token')
    url.searchParams.set('client_secret', clientSecret)
    url.searchParams.set('access_token', shortLivedToken)
    return await fetchJson(url.toString())
  } catch (error) {
    console.warn('[Instagram OAuth] Long-lived token exchange failed; storing short-lived token.', error)
    return { access_token: shortLivedToken, expires_in: null }
  }
}

const fetchInstagramProfile = async (accessToken: string, fallbackUserId?: string) => {
  const fields = 'id,user_id,username,profile_picture_url,account_type'
  const candidates = [
    `https://graph.instagram.com/v21.0/me?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`,
    `https://graph.instagram.com/me?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`,
  ]

  for (const url of candidates) {
    try {
      return await fetchJson(url)
    } catch (error) {
      console.warn('[Instagram OAuth] Profile fetch candidate failed.', error)
    }
  }

  return { id: fallbackUserId, user_id: fallbackUserId, username: fallbackUserId ? `instagram_${fallbackUserId}` : 'instagram_account' }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : ''
  const state = typeof query.state === 'string' ? query.state : ''
  const errorReason = typeof query.error_reason === 'string' ? query.error_reason : typeof query.error === 'string' ? query.error : ''
  const expectedState = getCookie(event, 'rs_ig_oauth_state')

  deleteCookie(event, 'rs_ig_oauth_state', { path: '/api/instagram/oauth' })

  if (errorReason) {
    console.warn('[Instagram OAuth] Instagram returned an OAuth error:', errorReason)
    return sendRedirect(event, dashboardRedirect(event, {
      instagram_error: errorReason,
      instagram_error_detail: sanitizeErrorDetail(query.error_description || query.error_message || errorReason),
    }), 302)
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    console.warn('[Instagram OAuth] Invalid state on callback.', { hasCode: Boolean(code), hasState: Boolean(state), hasExpectedState: Boolean(expectedState) })
    return sendRedirect(event, dashboardRedirect(event, { instagram_error: 'invalid_oauth_state' }), 302)
  }

  const user = await serverSupabaseUser(event)
  if (!user) {
    console.warn('[Instagram OAuth] Session missing on callback.')
    return sendRedirect(event, `/login?redirect=${encodeURIComponent('/dashboard/integrations/instagram/setup?instagram_error=session_expired')}`, 302)
  }

  try {
    const tokenResponse = await exchangeCodeForToken(event, code)
    const shortToken = String(tokenResponse.access_token || '')
    if (!shortToken) throw new Error('Instagram did not return an access token.')

    const longTokenResponse = await exchangeForLongLivedToken(event, shortToken)
    const accessToken = String(longTokenResponse.access_token || shortToken)
    const expiresIn = Number(longTokenResponse.expires_in || 0)
    const tokenExpiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null
    const profile = await fetchInstagramProfile(accessToken, String(tokenResponse.user_id || ''))
    const instagramAccountId = String(profile.user_id || profile.id || tokenResponse.user_id || '').trim()
    const username = String(profile.username || `instagram_${instagramAccountId}`).replace(/^@/, '')

    if (!instagramAccountId) throw new Error('Unable to identify the connected Instagram account.')

    const supabase = serverSupabaseServiceRole(event)
    const { data: existingAccount, error: existingAccountError } = await supabase
      .from('instagram_accounts')
      .select('id, user_id')
      .eq('instagram_account_id', instagramAccountId)
      .maybeSingle()

    if (existingAccountError) throw existingAccountError

    if (existingAccount?.user_id && existingAccount.user_id !== user.id) {
      console.warn('[Instagram OAuth] Reassigning existing Instagram account after successful OAuth proof.', { instagramAccountId, existingUserId: existingAccount.user_id, currentUserId: user.id })
    }

    const existing = existingAccount?.id ? { id: existingAccount.id } : null

    const payload = {
      user_id: user.id,
      instagram_account_id: instagramAccountId,
      username,
      profile_picture: profile.profile_picture_url || null,
      access_token: accessToken,
      token_expires_at: tokenExpiresAt,
      last_synced: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    let accountId = existing?.id
    if (existing) {
      const { data, error } = await supabase
        .from('instagram_accounts')
        .update(payload)
        .eq('id', existing.id)
        .select('id')
        .single()
      if (error) throw error
      accountId = data.id
    } else {
      const { data, error } = await supabase
        .from('instagram_accounts')
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select('id')
        .single()
      if (error) throw error
      accountId = data.id
    }

    return sendRedirect(event, dashboardRedirect(event, { instagram_connected: '1', accountId, username }), 302)
  } catch (error: any) {
    console.error('[Instagram OAuth] Callback failed:', error)
    return sendRedirect(event, dashboardRedirect(event, {
      instagram_error: 'oauth_callback_failed',
      instagram_error_detail: sanitizeErrorDetail(error?.message || error?.statusMessage || error?.code),
    }), 302)
  }
})
