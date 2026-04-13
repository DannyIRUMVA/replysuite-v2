import { defineEventHandler, getQuery, createError, sendRedirect, getRequestURL, getHeader } from 'h3'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string
  const error = query.error as string
  const state = query.state as string // This contains our user.id
  const requestUrl = getRequestURL(event)
  
  // Robust host and protocol detection for proxies/ngrok
  const host = getHeader(event, 'x-forwarded-host') || getHeader(event, 'host') || requestUrl.host
  const proto = getHeader(event, 'x-forwarded-proto') || (requestUrl.protocol === 'https:' ? 'https' : 'http')

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
  const clientId = config.instagramClientId?.toString().trim().replace(/['" ]/g, '')
  const clientSecret = config.instagramClientSecret?.toString().trim().replace(/['" ]/g, '')
  
  // Use a hardcoded or cleaned redirect URI to ensure absolute consistency with index.get.ts
  const fallbackUri = `${proto}://${host}/api/auth/instagram/callback`
  const redirectUri = (config.instagramRedirectUri || fallbackUri).trim()

  console.log('[DEBUG] Attempting token exchange with:', { clientId, redirectUri: redirectUri, code: code?.substring(0, 10) + '...' })

  const supabase = serverSupabaseServiceRole(event)
  const user = await serverSupabaseUser(event)
  
  // Sanitize state to avoid string 'undefined'
  const stateUser = (state && state !== 'undefined') ? state : null
  const targetUserId = user?.id || stateUser

  console.log('[DEBUG] User identification:', { sessionUser: user?.id, stateUser: stateUser, finalTarget: targetUserId })

  if (!targetUserId) {
    return sendRedirect(event, '/dashboard/instagram?error=Authentication expired. Please try again.')
  }

  // Enforcement: Check if user has reached their account limit
  const hasRoom = await checkLimit(event, 'accounts', targetUserId)
  if (!hasRoom) {
    return sendRedirect(event, '/dashboard/instagram?error=You have reached the maximum number of Instagram accounts allowed on your plan. Please upgrade to add more.')
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
    }).catch(err => {
      console.error('[DEBUG] Facebook Detailed Error:', err.data || err.response?._data || err.message)
      throw err
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
          user_id: targetUserId,
          instagram_account_id: instagramId,
          username: igDetails.username,
          profile_picture: igDetails.profile_picture_url,
          access_token: longLivedToken,
          platform_id: page.id, // storing the page id as platform_id for potential webhook usage
          last_synced: new Date().toISOString()
        })
      }
    }

    console.log('[DEBUG] Final accounts payload:', JSON.stringify(accountsToInsert, null, 2))

    if (accountsToInsert.length > 0) {
      const { error: dbError } = await supabase
        .from('instagram_accounts')
        .upsert(accountsToInsert, { onConflict: 'instagram_account_id' })
      
      if (dbError) {
        console.error('[DEBUG] Database Insert/Upsert Error:', dbError)
        throw dbError
      }
      console.log(`[DEBUG] Successfully upserted ${accountsToInsert.length} accounts`)
    } else {
      console.warn('[DEBUG] No Instagram accounts found to link.')
    }

    return sendRedirect(event, '/dashboard/instagram?success=true')
  } catch (err: any) {
    console.error('Instagram OAuth Error:', err)
    return sendRedirect(event, `/dashboard/instagram?error=${encodeURIComponent(err.message || 'failed to connect account')}`)
  }
})
