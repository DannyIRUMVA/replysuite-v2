import { defineEventHandler, sendRedirect, getRequestURL, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const config = useRuntimeConfig()
  const queryUserId = query.userId as string

  // Get current user to pass their ID in the OAuth state
  const user = await serverSupabaseUser(event)
  const targetUserId = user?.id || queryUserId

  if (!targetUserId) {
    return sendRedirect(event, '/login?error=Please login to connect Instagram')
  }

  const requestUrl = getRequestURL(event)
  const host = getHeader(event, 'x-forwarded-host') || getHeader(event, 'host') || requestUrl.host
  const proto = getHeader(event, 'x-forwarded-proto') || (requestUrl.protocol === 'https:' ? 'https' : 'http')

  const clientId = config.instagramClientId
  const redirectUri = `${proto}://${host}/api/auth/instagram/callback`


  if (!clientId) {
    throw createError({
      statusCode: 500,
      statusMessage: 'instagram client id not configured'
    })
  }

  // permissions required for comment automation and messaging
  const scopes = [
    'instagram_basic',
    'instagram_manage_comments',
    'instagram_manage_messages',
    'pages_show_list',
    'pages_read_engagement',
    'business_management'
  ].join(',')

  // Pass targetUserId in state for reliable linking during callback
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code&state=${targetUserId}`

  return sendRedirect(event, authUrl)
})

