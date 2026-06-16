import { randomUUID } from 'node:crypto'
import { serverSupabaseUser } from '#supabase/server'
import { createError, getQuery, sendRedirect, setCookie } from 'h3'
import { GOOGLE_CALENDAR_SCOPES, assertGoogleCalendarConfig, encodeGoogleOAuthState } from '~~/server/utils/google-calendar'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  const userId = (user as any)?.id
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Sign in before connecting Google Calendar.' })

  const config = useRuntimeConfig(event)
  assertGoogleCalendarConfig(config)

  const query = getQuery(event)
  const chatbotId = typeof query.chatbotId === 'string' ? query.chatbotId : ''
  const nonce = randomUUID()
  const state = encodeGoogleOAuthState({ userId, chatbotId, nonce, ts: Date.now() })

  setCookie(event, 'replysuite_google_oauth_nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  })

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', config.googleClientId as string)
  url.searchParams.set('redirect_uri', config.googleRedirectUri as string)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_CALENDAR_SCOPES.join(' '))
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('state', state)

  return sendRedirect(event, url.toString(), 302)
})
