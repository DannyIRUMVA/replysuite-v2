import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery } from 'h3'
import { getAuthenticatedUserId } from '~~/server/utils/auth'
import { isMissingGoogleCalendarSchemaError } from '~~/server/utils/google-calendar'

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)

  const query = getQuery(event)
  const chatbotId = typeof query.chatbotId === 'string' ? query.chatbotId : ''
  const admin = serverSupabaseServiceRole(event) as any

  const { data: connection, error: connectionError } = await admin
    .from('google_connections')
    .select('id, google_email, status, expires_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (connectionError) {
    if (isMissingGoogleCalendarSchemaError(connectionError)) {
      return {
        connected: false,
        configured: false,
        schemaReady: false,
        mapping: null,
        message: 'Google Calendar tables are not installed yet. Apply the Google Calendar migration before connecting a booking calendar.',
      }
    }
    throw createError({ statusCode: 500, statusMessage: connectionError.message })
  }

  let mapping = null
  if (chatbotId && connection?.id) {
    const { data, error } = await admin
      .from('chatbot_google_calendars')
      .select('id, chatbot_id, calendar_id, calendar_summary, calendar_timezone, sync_status, updated_at')
      .eq('user_id', userId)
      .eq('chatbot_id', chatbotId)
      .maybeSingle()
    if (error) {
      if (isMissingGoogleCalendarSchemaError(error)) {
        return {
          connected: Boolean(connection?.id && connection.status === 'connected'),
          configured: Boolean(connection?.id),
          schemaReady: false,
          connection,
          mapping: null,
          message: 'Google Calendar chatbot mapping table is not installed yet.',
        }
      }
      throw createError({ statusCode: 500, statusMessage: error.message })
    }
    mapping = data || null
  }

  return {
    connected: Boolean(connection?.id && connection.status === 'connected'),
    configured: Boolean(connection?.id),
    schemaReady: true,
    connection,
    mapping,
  }
})
