import { serverSupabaseServiceRole } from '#supabase/server'
import { getAuthenticatedUserId } from '~~/server/utils/auth'

const normalizeText = (value: unknown, maxLength: number) => {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  if (!normalized) return null
  return normalized.slice(0, maxLength)
}

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)
  const body = await readBody(event)

  const profile = {
    id: userId,
    full_name: normalizeText(body?.full_name, 160),
    company_name: normalizeText(body?.company_name, 180),
    bio: normalizeText(body?.bio, 1200),
    website: normalizeText(body?.website, 300),
    contact_email: normalizeText(body?.contact_email, 254),
    phone: normalizeText(body?.phone, 80),
    country: normalizeText(body?.country, 120),
    timezone: normalizeText(body?.timezone, 120),
    avatar_url: normalizeText(body?.avatar_url, 500),
  }

  const supabase = serverSupabaseServiceRole(event)
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[Profile] Failed to save profile:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save profile. Please try again.',
    })
  }

  return {
    success: true,
    profile: data,
  }
})
