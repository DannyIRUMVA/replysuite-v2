import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  // Use supabase.auth.getUser() — reliably resolves user from session cookie
  // serverSupabaseUser() can return a user object with undefined id in PKCE flow
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { accountId, after } = getQuery(event)
  if (!accountId) throw createError({ statusCode: 400, statusMessage: 'Missing accountId' })

  console.log(`[Posts API] user.id=${user.id}, querying accountId=${accountId}, after=${after}`)

  // 1. Get the account and token (scoped to the authenticated user)
  const { data: account, error: accError } = await supabase
    .from('instagram_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single()

  if (accError || !account) {
    console.error(`[Posts API] Account not found. DB error:`, accError?.message, `| accountId=${accountId}, userId=${user.id}`)
    throw createError({ statusCode: 404, statusMessage: 'Instagram account not found' })
  }

  try {
    // 2. Fetch posts from Meta Graph API
    const igId = account.instagram_account_id
    const token = account.access_token

    if (!igId || !token) {
      throw createError({ statusCode: 400, statusMessage: 'Account not fully configured' })
    }

    let url = `https://graph.facebook.com/v21.0/${igId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${token}`
    if (after) {
      url += `&after=${after}`
    }

    const response = await fetch(url)
    const data = await response.json()

    if (data.error) {
      console.error('[Meta API Error]', data.error)
      throw new Error(data.error.message)
    }

    return { 
      success: true, 
      data: data.data || [],
      paging: data.paging || null 
    }

  } catch (err: any) {
    console.error('[Instagram Posts Error]', err)
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to fetch posts from Instagram' })
  }
})
