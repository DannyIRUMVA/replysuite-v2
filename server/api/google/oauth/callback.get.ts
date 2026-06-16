import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, deleteCookie, getCookie, getQuery, sendRedirect } from 'h3'
import { assertGoogleCalendarConfig, decodeGoogleOAuthState, encryptGoogleTokenPayload, exchangeGoogleCodeForTokens, fetchGoogleCalendarList, fetchGoogleUserInfo, isMissingGoogleCalendarSchemaError } from '~~/server/utils/google-calendar'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const config = useRuntimeConfig(event)
  const siteUrl = (config.public?.siteUrl as string) || '/'

  if (query.error) {
    return sendRedirect(event, `/dashboard/appointments/settings?google=error&reason=${encodeURIComponent(String(query.error))}`, 302)
  }

  const code = typeof query.code === 'string' ? query.code : ''
  const stateValue = typeof query.state === 'string' ? query.state : ''
  if (!code || !stateValue) throw createError({ statusCode: 400, statusMessage: 'Missing Google OAuth code or state.' })

  assertGoogleCalendarConfig(config)

  const state = await decodeGoogleOAuthState(stateValue, config.googleTokenEncryptionKey as string)
  const userId = typeof state?.userId === 'string' ? state.userId : ''
  if (!userId) throw createError({ statusCode: 400, statusMessage: 'Missing Google OAuth user context.' })
  if (!state?.ts || Date.now() - Number(state.ts) > 10 * 60 * 1000) {
    throw createError({ statusCode: 400, statusMessage: 'Google OAuth connection expired. Please try again.' })
  }

  const expectedNonce = getCookie(event, 'replysuite_google_oauth_nonce')
  deleteCookie(event, 'replysuite_google_oauth_nonce', { path: '/' })

  if (!expectedNonce || state?.nonce !== expectedNonce) {
    throw createError({ statusCode: 400, statusMessage: 'Google OAuth state mismatch. Please try connecting again.' })
  }

  const tokens = await exchangeGoogleCodeForTokens(config, code)
  const accessToken = tokens.access_token as string
  if (!accessToken) throw createError({ statusCode: 502, statusMessage: 'Google did not return an access token.' })

  let calendars: any[] = []
  try {
    calendars = await fetchGoogleCalendarList(accessToken)
  } catch (err: any) {
    const reason = err?.statusMessage || err?.message || 'Google Calendar connection failed.'
    const redirect = new URL('/dashboard/appointments/settings', siteUrl.startsWith('http') ? siteUrl : 'http://localhost:3000')
    redirect.searchParams.set('google', 'error')
    redirect.searchParams.set('reason', reason)
    const stateChatbotId = typeof state?.chatbotId === 'string' ? state.chatbotId : ''
    if (stateChatbotId) redirect.searchParams.set('chatbotId', stateChatbotId)
    return sendRedirect(event, redirect.pathname + redirect.search, 302)
  }

  const googleUser = await fetchGoogleUserInfo(accessToken).catch(() => null)
  const primaryCalendar = calendars.find((calendar: any) => calendar.primary) || calendars[0] || null
  const expiresAt = tokens.expires_in ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString() : null
  const admin = serverSupabaseServiceRole(event) as any

  const redirectToSettings = (google: 'connected' | 'error', reason?: string) => {
    const redirect = new URL('/dashboard/appointments/settings', siteUrl.startsWith('http') ? siteUrl : 'http://localhost:3000')
    redirect.searchParams.set('google', google)
    if (reason) redirect.searchParams.set('reason', reason)
    const stateChatbotId = typeof state?.chatbotId === 'string' ? state.chatbotId : ''
    if (stateChatbotId) redirect.searchParams.set('chatbotId', stateChatbotId)
    return sendRedirect(event, redirect.pathname + redirect.search, 302)
  }

  const { data: existing, error: existingError } = await admin
    .from('google_connections')
    .select('id, encrypted_refresh_token')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError) {
    if (isMissingGoogleCalendarSchemaError(existingError)) {
      return redirectToSettings('error', 'Google Calendar database tables are not installed yet. Apply the Google Calendar migration, then connect again.')
    }
    throw createError({ statusCode: 500, statusMessage: existingError.message })
  }

  const encryptedAccessToken = await encryptGoogleTokenPayload(config, tokens.access_token)
  const encryptedRefreshToken = tokens.refresh_token
    ? await encryptGoogleTokenPayload(config, tokens.refresh_token)
    : existing?.encrypted_refresh_token || null

  const connectionPayload = {
    user_id: userId,
    google_account_id: googleUser?.id || primaryCalendar?.id || null,
    google_email: googleUser?.email || (String(primaryCalendar?.id || '').includes('@') ? primaryCalendar.id : null),
    encrypted_access_token: encryptedAccessToken,
    encrypted_refresh_token: encryptedRefreshToken,
    scopes: typeof tokens.scope === 'string' ? tokens.scope.split(' ') : [],
    expires_at: expiresAt,
    status: 'connected',
    updated_at: new Date().toISOString(),
  }

  const { data: connection, error: connectionError } = existing?.id
    ? await admin.from('google_connections').update(connectionPayload).eq('id', existing.id).select('id').single()
    : await admin.from('google_connections').insert(connectionPayload).select('id').single()

  if (connectionError) {
    if (isMissingGoogleCalendarSchemaError(connectionError)) {
      return redirectToSettings('error', 'Google Calendar database tables are not installed yet. Apply the Google Calendar migration, then connect again.')
    }
    throw createError({ statusCode: 500, statusMessage: connectionError.message })
  }

  const chatbotId = typeof state?.chatbotId === 'string' ? state.chatbotId : ''
  if (chatbotId && primaryCalendar) {
    const { data: bot } = await admin
      .from('chatbots')
      .select('id')
      .eq('id', chatbotId)
      .eq('user_id', userId)
      .maybeSingle()

    if (bot) {
      const mappingPayload = {
        user_id: userId,
        chatbot_id: chatbotId,
        google_connection_id: connection.id,
        calendar_id: primaryCalendar.id,
        calendar_summary: primaryCalendar.summary || 'Primary calendar',
        calendar_timezone: primaryCalendar.timeZone || 'Africa/Kigali',
        sync_status: 'connected',
        updated_at: new Date().toISOString(),
      }
      const { error: mappingError } = await admin
        .from('chatbot_google_calendars')
        .upsert(mappingPayload, { onConflict: 'chatbot_id' })

      if (mappingError) {
        if (isMissingGoogleCalendarSchemaError(mappingError)) {
          return redirectToSettings('error', 'Google Calendar chatbot mapping table is not installed yet. Apply the Google Calendar migration, then connect again.')
        }
        throw createError({ statusCode: 500, statusMessage: mappingError.message })
      }
    }
  }

  return redirectToSettings('connected')
})
