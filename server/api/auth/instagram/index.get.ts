import { defineEventHandler, sendRedirect, getRequestURL, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const requestUrl = getRequestURL(event)

  // Robust protocol detection for proxies/tunnels
  const protocol = event.headers.get('x-forwarded-proto') || requestUrl.protocol.replace(':', '')
  const clientId = config.instagramClientId?.toString().replace(/['" ]/g, '')
  // Dynamically determine redirect URI
  const redirectUri = `https://32b2-2c0f-eb68-6cd-a00-7d94-d226-b994-28ae.ngrok-free.app/api/auth/instagram/callback`

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

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`

  return sendRedirect(event, authUrl)
})

