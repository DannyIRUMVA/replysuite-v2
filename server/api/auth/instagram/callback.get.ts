import { defineEventHandler, getQuery, createError, sendRedirect, getRequestURL } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string
  const error = query.error as string
  const requestUrl = getRequestURL(event)
  
  // Robust protocol detection for proxies/tunnels
  const protocol = event.headers.get('x-forwarded-proto') || requestUrl.protocol.replace(':', '')

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: `instagram auth error: ${error}`
    })
  }

  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'no code provided'
    })
  }

  const config = useRuntimeConfig()
  const clientId = config.instagramClientId?.toString().replace(/['" ]/g, '')
  const clientSecret = config.instagramClientSecret?.toString().replace(/['" ]/g, '')
  const redirectUri = config.instagramRedirectUri || `${protocol}://${requestUrl.host}/api/auth/instagram/callback`

  const supabase = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'unauthorized'
    })
  }

  try {
    // 1. Exchange code for short-lived access token
    const tokenResponse = await $fetch<{ access_token: string }>('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code
      }
    })

    const shortLivedToken = tokenResponse.access_token

    // 2. Exchange for long-lived access token
    const longLivedTokenResponse = await $fetch<{ access_token: string }>('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: clientId,
        client_secret: clientSecret,
        fb_exchange_token: shortLivedToken
      }
    })

    const longLivedToken = longLivedTokenResponse.access_token

    // 3. Get Pages linked Target User
    const pagesResponse = await $fetch<{ data: any[] }>('https://graph.facebook.com/v19.0/me/accounts', {
      params: {
        access_token: longLivedToken,
        fields: 'instagram_business_account,name,access_token'
      }
    })

    const accountsToInsert = []

    for (const page of pagesResponse.data) {
      if (page.instagram_business_account) {
        const instagramId = page.instagram_business_account.id

        // 4. Get Instagram account details
        const igDetails = await $fetch<{ username: string, profile_picture_url: string }>('https://graph.facebook.com/v19.0/' + instagramId, {
          params: {
            access_token: longLivedToken,
            fields: 'username,profile_picture_url'
          }
        })

        accountsToInsert.push({
          user_id: user.id,
          instagram_account_id: instagramId,
          username: igDetails.username,
          profile_picture: igDetails.profile_picture_url,
          access_token: longLivedToken,
          platform_id: page.id, // storing the page id as platform_id for potential webhook usage
          last_synced: new Date().toISOString()
        })
      }
    }

    if (accountsToInsert.length > 0) {
      const { error: dbError } = await supabase
        .from('instagram_accounts')
        .upsert(accountsToInsert, { onConflict: 'instagram_account_id' })

      if (dbError) throw dbError
    }

    return sendRedirect(event, '/dashboard/instagram?success=true')
  } catch (err: any) {
    console.error('Instagram OAuth Error:', err)
    return sendRedirect(event, `/dashboard/instagram?error=${encodeURIComponent(err.message || 'failed to connect account')}`)
  }
})
