import { serverSupabaseUser } from '#supabase/server'

const INSTAGRAM_BUSINESS_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
  'instagram_business_content_publish',
  'instagram_business_manage_insights',
]

const resolveRedirectUri = (event: any) => {
  const config = useRuntimeConfig(event)
  const configured = String(config.instagramRedirectUri || '').trim()
  if (configured) return configured

  const siteUrl = String(config.public?.siteUrl || '').trim().replace(/\/$/, '')
  if (siteUrl) return `${siteUrl}/api/instagram/oauth/callback`

  return `${getRequestURL(event).origin}/api/instagram/oauth/callback`
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in before connecting Instagram.' })
  }

  const config = useRuntimeConfig(event)
  const clientId = String(config.instagramClientId || '').trim()
  if (!clientId) {
    throw createError({ statusCode: 500, statusMessage: 'Instagram app ID is not configured.' })
  }

  const state = crypto.randomUUID()
  setCookie(event, 'rs_ig_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/instagram/oauth',
    maxAge: 10 * 60,
  })

  const redirectUri = resolveRedirectUri(event)
  const authorizeUrl = new URL('https://www.instagram.com/oauth/authorize')
  authorizeUrl.searchParams.set('force_reauth', 'true')
  authorizeUrl.searchParams.set('client_id', clientId)
  authorizeUrl.searchParams.set('redirect_uri', redirectUri)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('scope', INSTAGRAM_BUSINESS_SCOPES.join(','))
  authorizeUrl.searchParams.set('state', state)

  return sendRedirect(event, authorizeUrl.toString(), 302)
})
