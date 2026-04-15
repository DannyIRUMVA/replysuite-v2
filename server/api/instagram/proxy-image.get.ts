/**
 * Image proxy for Instagram CDN URLs.
 * 
 * Instagram media URLs (scontent*.cdninstagram.com) can fail to load in the browser
 * due to Hotlink Protection or expiration. This proxy fetches them server-side.
 *
 * Usage: /api/instagram/proxy-image?url=<encoded_instagram_url>
 */
export default defineEventHandler(async (event) => {
  const { url } = getQuery(event)

  if (!url || typeof url !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing url parameter' })
  }

  // Only allow proxying from known Instagram/Meta CDN domains for security
  const allowedDomains = [
    'cdninstagram.com',
    'fbcdn.net',
    'scontent.cdninstagram.com',
  ]

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid URL' })
  }

  const isAllowed = allowedDomains.some(d => parsedUrl.hostname.endsWith(d))
  if (!isAllowed) {
    throw createError({ statusCode: 403, statusMessage: 'Domain not allowed' })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ReplySuite/1.0)',
      }
    })

    if (!response.ok) {
      throw createError({ statusCode: response.status, statusMessage: 'Upstream error' })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = await response.arrayBuffer()

    setResponseHeaders(event, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*',
    })

    return new Uint8Array(buffer)
  } catch (err: any) {
    console.error('[Image Proxy Error]', err)
    throw createError({ statusCode: 502, statusMessage: 'Failed to fetch image' })
  }
})
