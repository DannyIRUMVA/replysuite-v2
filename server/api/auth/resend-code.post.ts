import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { sendVerificationEmail } from '~~/server/utils/mail'

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

  const serviceClient = serverSupabaseServiceRole(event)

  // 1. Invalidate any existing pending tokens for this user
  await serviceClient
    .from('user_verifications')
    .update({ status: 'invalidated' })
    .eq('user_id', userId)
    .eq('verification_type', 'email')
    .eq('status', 'pending')

  // 2. Generate new 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24)

  // 3. Store new code
  const { error: dbError } = await serviceClient
    .from('user_verifications')
    .insert({
      user_id: userId,
      verification_type: 'email',
      token: code,
      expires_at: expiresAt.toISOString(),
      status: 'pending'
    })

  if (dbError) {
    console.error('[Resend Code] DB Error:', dbError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate code'
    })
  }

  // 4. Send email
  try {
    await sendVerificationEmail(user.email!, code)
  } catch (err) {
    console.error('[Resend Code] Email Error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send email'
    })
  }

  return { success: true }
})
