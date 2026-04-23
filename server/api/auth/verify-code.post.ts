import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { syncUserToPolar } from '~~/server/utils/polar'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const userId = (user as any).id || (user as any).sub
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid user token'
    })
  }

  const body = await readBody(event)
  const { code } = body

  if (!code || typeof code !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Verification code is required'
    })
  }

  const client = serverSupabaseServiceRole(event)

  const cleanCode = code.trim()

  // 1. Find the verification record
  const { data: verifyRecord, error: fetchError } = await client
    .from('user_verifications')
    .select('*')
    .eq('user_id', userId)
    .eq('token', cleanCode)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()

  if (fetchError || !verifyRecord) {
    console.error('[Verify Code] Fetch Error or Not Found:', fetchError, 'Code:', cleanCode)
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or expired verification code'
    })
  }

  // 2. Check expiry
  if (new Date(verifyRecord.expires_at) < new Date()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Verification code has expired'
    })
  }

  // 3. Update Profile status
  const { error: profileError } = await client
    .from('profiles')
    .update({ is_verified: true })
    .eq('id', userId)

  if (profileError) {
    console.error('[Verify Code] Profile Update Error:', profileError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal processing error'
    })
  }

  // 3.5 Sync to Polar for monitoring
  try {
    const customer = await syncUserToPolar(event, userId, user.email!)
    if (customer) {
      console.log(`[Verify Code] Linked Polar Customer ${customer.id} to user ${userId}`)
    }
  } catch (err) {
    console.error('[Verify Code] Polar Sync Error:', err)
  }

  // 4. Update Verification record
  await client
    .from('user_verifications')
    .update({ 
      status: 'completed',
      verified_at: new Date().toISOString()
    })
    .eq('id', verifyRecord.id)

  // 5. Track Activity
  await trackActivity(event, {
    userId: userId,
    type: 'EMAIL_VERIFIED',
    meta: { tokenId: verifyRecord.id }
  })

  return { success: true }
})
