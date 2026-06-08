import { serverSupabaseServiceRole } from '#supabase/server'
import { getAuthenticatedUserId } from '~~/server/utils/auth'
import { buildInstagramGraphUrl } from '~~/server/utils/integrations/instagram/config'
import { isUuid } from '~~/server/utils/public-chatbot'

const MEDIA_FIELDS = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,children{id,media_type,media_url,thumbnail_url,permalink}'

const fetchInstagramMediaPage = async (url: string, accessToken: string) => {
  const target = new URL(url)
  if (!target.searchParams.has('access_token')) target.searchParams.set('access_token', accessToken)

  const response = await fetch(target.toString())
  const data = await response.json().catch(() => ({}))

  if (!response.ok || data?.error) {
    const message = data?.error?.message || `Instagram media sync failed with HTTP ${response.status}`
    const error = new Error(message) as Error & { status?: number; payload?: unknown }
    error.status = response.status
    error.payload = data
    throw error
  }

  return data as { data?: any[]; paging?: { next?: string } }
}

const fetchInstagramMedia = async (instagramAccountId: string, accessToken: string, limit = 25) => {
  const candidates = [
    `https://graph.instagram.com/v21.0/me/media?fields=${encodeURIComponent(MEDIA_FIELDS)}&limit=${limit}`,
    `https://graph.instagram.com/me/media?fields=${encodeURIComponent(MEDIA_FIELDS)}&limit=${limit}`,
    buildInstagramGraphUrl(`${instagramAccountId}/media?fields=${encodeURIComponent(MEDIA_FIELDS)}&limit=${limit}`),
  ]

  let lastError: unknown = null
  for (const firstUrl of candidates) {
    try {
      const items: any[] = []
      let nextUrl: string | undefined = firstUrl

      while (nextUrl && items.length < limit) {
        const page = await fetchInstagramMediaPage(nextUrl, accessToken)
        items.push(...(page.data || []))
        nextUrl = page.paging?.next
      }

      return items.slice(0, limit)
    } catch (error) {
      lastError = error
      console.warn('[Instagram Sync] Media endpoint candidate failed.', error)
    }
  }

  throw lastError || new Error('Unable to fetch Instagram media.')
}

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Authentication required.' })

  const accountId = getRouterParam(event, 'id') || ''
  if (!isUuid(accountId)) throw createError({ statusCode: 400, statusMessage: 'Invalid Instagram account ID.' })

  const supabase = serverSupabaseServiceRole(event)
  const { data: account, error: accountError } = await supabase
    .from('instagram_accounts')
    .select('id, user_id, instagram_account_id, access_token')
    .eq('id', accountId)
    .eq('user_id', userId)
    .maybeSingle()

  if (accountError) throw accountError
  if (!account) throw createError({ statusCode: 404, statusMessage: 'Instagram account not found.' })
  if (!account.access_token) throw createError({ statusCode: 400, statusMessage: 'Reconnect Instagram before syncing posts.' })
  const accessToken = String(account.access_token)
  const instagramAccountId = String(account.instagram_account_id || '')

  const media = await fetchInstagramMedia(instagramAccountId, accessToken, 50)
  const now = new Date().toISOString()
  const rows = media
    .filter((item) => item?.id)
    .map((item) => ({
      id: String(item.id),
      instagram_account_id: account.id,
      caption: item.caption || null,
      media_type: item.media_type || null,
      media_url: item.media_url || item.children?.data?.[0]?.media_url || null,
      permalink: item.permalink || null,
      thumbnail_url: item.thumbnail_url || item.children?.data?.find((child: any) => child?.thumbnail_url)?.thumbnail_url || item.children?.data?.find((child: any) => child?.media_url)?.media_url || null,
      updated_at: now,
    }))

  if (rows.length) {
    const { error: upsertError } = await supabase
      .from('instagram_posts')
      .upsert(rows, { onConflict: 'id' })
    if (upsertError) throw upsertError
  }

  await supabase
    .from('instagram_accounts')
    .update({ last_synced: now, updated_at: now })
    .eq('id', account.id)

  return {
    success: true,
    synced: rows.length,
    posts: rows,
  }
})
