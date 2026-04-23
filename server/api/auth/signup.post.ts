import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {

  const body = await readBody(event)
  const { 
    email, 
    password, 
    fullName, 
    companyName, 
    phone, 
    industry 
  } = body

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and password are required',
    })
  }

  const supabase = await serverSupabaseClient(event)

  // 1. Create the user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName
      }
    }
  })

  if (authError) {
    throw createError({
      statusCode: authError.status || 400,
      statusMessage: authError.message,
    })
  }

  const userId = authData.user?.id
  if (!userId) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create user',
    })
  }

  // 1.5 Create Profile Record (Defensive insert)
  const serviceClient = serverSupabaseServiceRole(event)
  const { error: profileError } = await serviceClient
    .from('profiles')
    .upsert({
      id: userId,
      full_name: fullName,
      company_name: companyName,
      phone: phone,
      bio: industry, // Using bio for industry for now
      contact_email: email,
      is_verified: false
    })

  if (profileError) {
    console.error('[Signup] Profile Error:', profileError)
  }

  // 2. Generate custom verification code (6 digits)
  const token = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24)

  // 3. Store in user_verifications (using service role)
  const { error: dbError } = await serviceClient
    .from('user_verifications')
    .insert({
      user_id: userId,
      verification_type: 'email',
      token,
      expires_at: expiresAt.toISOString(),
      status: 'pending'
    })

  if (dbError) {
    console.error('[Signup] DB Error:', dbError)
  }

  // 4. Send the SendPulse email
  try {
    await sendVerificationEmail(email, token)
  } catch (emailError) {
    console.error('[Signup] Email Send Failure:', emailError)
  }

  // 5. Track Activity
  await trackActivity(event, {
    userId,
    type: 'SIGNUP_INITIATED',
    meta: { email }
  })

  return { 
    success: true, 
    message: 'Check your email for link.' 
  }
})

