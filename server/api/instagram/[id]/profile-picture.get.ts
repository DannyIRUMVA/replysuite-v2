import { serverSupabaseServiceRole } from '#supabase/server'
import { isUuid } from '~~/server/utils/public-chatbot'

const svgFallback = (username = 'IG') => {
  const label = String(username || 'IG').replace(/^@/, '').slice(0, 2).toUpperCase() || 'IG'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#D4AF37"/><stop offset="1" stop-color="#F3D36B"/></linearGradient></defs><rect width="96" height="96" rx="24" fill="url(#g)"/><text x="48" y="55" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="800" fill="#0B0B0B">${label}</text></svg>`
}

export default defineEventHandler(async (event) => {
  const accountId = getRouterParam(event, 'id') || ''
  if (!isUuid(accountId)) throw createError({ statusCode: 400, statusMessage: 'Invalid Instagram account ID.' })

  const supabase = serverSupabaseServiceRole(event)
  const { data: account } = await supabase
    .from('instagram_accounts')
    .select('username, profile_picture')
    .eq('id', accountId)
    .maybeSingle()

  const fallback = svgFallback(account?.username)

  if (!account?.profile_picture) {
    setHeader(event, 'content-type', 'image/svg+xml; charset=utf-8')
    setHeader(event, 'cache-control', 'public, max-age=300')
    return fallback
  }

  try {
    const response = await fetch(account.profile_picture)

    if (!response.ok) {
      // Instagram profile picture URLs can expire or reject server-side proxy fetches.
      // A 403 is expected in that case, so avoid noisy stack traces during normal dashboard loads.
      if (response.status !== 403) {
        console.warn(`[Instagram Profile Picture] Falling back to generated avatar. Profile image returned ${response.status}`)
      }
      setHeader(event, 'content-type', 'image/svg+xml; charset=utf-8')
      setHeader(event, 'cache-control', 'public, max-age=1800, stale-while-revalidate=3600')
      return fallback
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const bytes = await response.arrayBuffer()
    setHeader(event, 'content-type', contentType)
    setHeader(event, 'cache-control', 'public, max-age=1800')
    return new Uint8Array(bytes)
  } catch (error: any) {
    console.warn('[Instagram Profile Picture] Falling back to generated avatar.', error?.message || error)
    setHeader(event, 'content-type', 'image/svg+xml; charset=utf-8')
    setHeader(event, 'cache-control', 'public, max-age=1800, stale-while-revalidate=3600')
    return fallback
  }
})
