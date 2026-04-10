/**
 * SendPulse REST API Client for Cloudflare / Nitro
 * This replaces Nodemailer because direct SMTP is not supported on Cloudflare.
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
  const now = Math.floor(Date.now() / 1000)
  
  if (cachedToken && now < tokenExpiry) {
    return cachedToken
  }

  const response = await fetch('https://api.sendpulse.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.SENDPULSE_ID,
      client_secret: process.env.SENDPULSE_SECRET,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to authenticate with SendPulse: ${error}`)
  }

  const data = (await response.json()) as SendPulseAuthResponse
  cachedToken = data.access_token
  tokenExpiry = now + data.expires_in - 60 // buffer of 1 minute
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
  const token = await getAccessToken()

  const body = {
    email: {
      subject: options.subject,
      html: options.html ? Buffer.from(options.html).toString('base64') : undefined, // Base64 encoding required for HTML
      text: options.text,
      from: {
        name: 'ReplySuite',
        email: process.env.SMTP_FROM,
      },
      to: [
        {
          email: options.to,
        },
      ],
    },
  }

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
 * Helper for internal notifications
 */
export async function sendInternalNotification(subject: string, body: string) {
  // We don't have a configured internal email in REST mode yet, 
  // so we'll look for a contact email or fallback.
  return sendMail({
    to: 'unstoppablemove7@gmail.com', // Fallback to your login email
    subject: `[ReplySuite Notification] ${subject}`,
    text: body
  })
}
