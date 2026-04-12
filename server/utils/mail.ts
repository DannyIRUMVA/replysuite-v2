/**
 * SendPulse REST API Client for Cloudflare / Nitro
 */

interface SendPulseAuthResponse {
  access_token: string
  expires_in: number
}

let cachedToken: string | null = null
let tokenExpiry = 0

/**
 * Fetches an OAuth Bearer token from SendPulse
 */
async function getAccessToken(): Promise<string> {
  const config = useRuntimeConfig()
  const now = Math.floor(Date.now() / 1000)
  
  if (cachedToken && now < tokenExpiry) {
    return cachedToken
  }

  const response = await fetch('https://api.sendpulse.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: config.sendpulseId,
      client_secret: config.sendpulseSecret,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to authenticate with SendPulse: ${error}`)
  }

  const data = (await response.json()) as SendPulseAuthResponse
  cachedToken = data.access_token
  tokenExpiry = now + data.expires_in - 60 
  return cachedToken
}

export interface MailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

/**
 * Sends an email using the SendPulse REST API
 */
export async function sendMail(options: MailOptions) {
  const config = useRuntimeConfig()
  const token = await getAccessToken()

  const body = {
    email: {
      subject: options.subject,
      html: options.html ? Buffer.from(options.html).toString('base64') : undefined,
      text: options.text,
      from: {
        name: config.smtpFromName || 'ReplySuite',
        email: config.smtpFrom,
      },
      to: [
        {
          email: options.to,
        },
      ],
    },
  }

  console.log('[SendPulse] Sending Body:', JSON.stringify(body, null, 2))

  const response = await fetch('https://api.sendpulse.com/smtp/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(`SendPulse API error: ${JSON.stringify(result)}`)
  }

  return { success: true, result }
}

/**
 * Specific sender for verification emails
 */
export async function sendVerificationEmail(email: string, token: string) {
  const config = useRuntimeConfig()
  const verifyUrl = `${config.public.siteUrl}/api/auth/verify?token=${token}`
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #333;">Verify your ReplySuite account</h1>
      <p>Thank you for signing up! Please click the button below to verify your email address.</p>
      <div style="margin: 30px 0;">
        <a href="${verifyUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email</a>
      </div>
      <p style="font-size: 14px; color: #666;">Or copy and paste this link: <br> <a href="${verifyUrl}">${verifyUrl}</a></p>
    </div>
  `
  
  return sendMail({
    to: email,
    subject: 'Verify your email - ReplySuite',
    html
  })
}

/**
 * Helper for internal notifications
 */
export async function sendInternalNotification(subject: string, body: string) {
  return sendMail({
    to: 'unstoppablemove7@gmail.com', 
    subject: `[ReplySuite Notification] ${subject}`,
    text: body
  })
}

