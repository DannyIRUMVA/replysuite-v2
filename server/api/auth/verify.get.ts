import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = query.token as string

  if (!token) {
    return sendRedirect(event, '/login?error=Invalid verification link')
  }

  const client = serverSupabaseServiceRole(event)

  // 1. Find the verification record
  const { data: verifyRecord, error: fetchError } = await client
    .from('user_verifications')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (fetchError || !verifyRecord) {
    return sendRedirect(event, '/login?error=Verification link invalid or expired')
  }

  // 2. Check expiry
  if (new Date(verifyRecord.expires_at) < new Date()) {
    return sendRedirect(event, '/login?error=Verification link has expired')
  }

  // 3. Update Profile status
  const { error: profileError } = await client
    .from('profiles')
    .update({ is_verified: true })
    .eq('id', verifyRecord.user_id)

  if (profileError) {
    console.error('[Verify] Profile Update Error:', profileError)
    return sendRedirect(event, '/login?error=Internal processing error')
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
    userId: verifyRecord.user_id,
    type: 'EMAIL_VERIFIED',
    meta: { tokenId: verifyRecord.id }
  })

  // 6. Redirect to login with success
  return sendRedirect(event, '/login?verified=true')
})
