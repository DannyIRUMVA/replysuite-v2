import { randomUUID } from 'node:crypto'
import { getQuery, setCookie } from 'h3'
import { getAuthenticatedUserId } from '~~/server/utils/auth'
import { GOOGLE_CALENDAR_SCOPES, assertGoogleCalendarConfig, encodeGoogleOAuthState } from '~~/server/utils/google-calendar'

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)
  const config = useRuntimeConfig(event)
  assertGoogleCalendarConfig(config)

  const query = getQuery(event)
  const chatbotId = typeof query.chatbotId === 'string' ? query.chatbotId : ''
  const nonce = randomUUID()
  const state = await encodeGoogleOAuthState({ userId, chatbotId, nonce, ts: Date.now() }, config.googleTokenEncryptionKey as string)

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

  return { url: url.toString() }
})
