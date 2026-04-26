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
      text: options.text || options.subject, // Fallback to subject if no text provided
      from: {
        name: config.smtpFromName || 'ReplySuite',
        email: config.smtpFrom || 'no-reply@replysuite.app',
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
    console.error('[SendPulse] API Error:', {
      status: response.status,
      result,
      to: options.to,
      from: config.smtpFrom
    })
    throw new Error(`SendPulse API error: ${JSON.stringify(result)}`)
  }

  console.log(`[SendPulse] Email sent successfully to ${options.to}`)
  return { success: true, result }
}

/**
 * Specific sender for verification emails
 */
export async function sendVerificationEmail(email: string, code: string) {
  const config = useRuntimeConfig()

  const text = `
    Verify your ReplySuite account.
    Your verification code is: ${code}
    
    Please enter this code on the verification screen to activate your account.
    This code will expire in 24 hours.

    ReplySuite | Trainable AI for reply
    123 Digital Way, Suite 100, AI City, 90210
  `

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Inter', -apple-system, blinkmacsystemfont, 'Segoe UI', roboto, helvetica, arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f9fafb; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .header { background: #000000; padding: 40px; text-align: center; }
        .content { padding: 48px; text-align: center; }
        .code-box { background: #f3f4f6; border: 2px dashed #e5e7eb; border-radius: 16px; padding: 24px; margin: 32px 0; }
        .code { font-family: 'Monaco', 'Consolas', monospace; font-size: 42px; font-weight: 900; letter-spacing: 0.2em; color: #000000; margin: 0; }
        .footer { padding: 40px; text-align: center; font-size: 12px; color: #6b7280; background: #f9fafb; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://replysuite.app/logo-white.png" alt="ReplySuite" style="height: 32px; width: auto;">
        </div>
        <div class="content">
          <h1 style="margin-top: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.02em; color: #000000;">Finalize your activation.</h1>
          <p style="color: #4b5563; font-size: 16px;">Thank you for joining ReplySuite. Enter the following 6-digit code to verify your identity and unlock your AI dashboard.</p>
          
          <div class="code-box">
            <h2 class="code">${code}</h2>
          </div>
          
          <p style="font-size: 14px; color: #9ca3af;">This code expires in 24 hours. If you did not request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; 2026 ReplySuite Automation. All rights reserved.</p>
          <p>Deploy high-performance AI agents natively on WhatsApp and Web.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendMail({
    to: email,
    subject: `[${code}] Verify your ReplySuite Account`,
    text,
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

