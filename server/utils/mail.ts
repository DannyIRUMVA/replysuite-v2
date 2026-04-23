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
        email: config.smtpFrom,
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
export async function sendVerificationEmail(email: string, token: string) {
  const config = useRuntimeConfig()
  const verifyUrl = `${config.public.siteUrl}/api/auth/verify?token=${token}`
  
  const text = `
    Verify your ReplySuite account.
    Please copy and paste the following link into your browser to verify your email address:
    ${verifyUrl}

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
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background: #000000; padding: 40px; text-align: center; }
        .content { padding: 40px; }
        .button { display: inline-block; background-color: #EAB308; color: #000000; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; transition: transform 0.2s; }
        .footer { padding: 40px; text-align: center; font-size: 12px; color: #6b7280; background: #f9fafb; border-top: 1px solid #e5e7eb; }
        .link { color: #EAB308; text-decoration: none; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://replysuite.app/logo-white.png" alt="ReplySuite" style="height: 32px; width: auto;">
        </div>
        <div class="content">
          <h1 style="margin-top: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.02em;">Activate your intelligence.</h1>
          <p>Thank you for joining ReplySuite. You are one step away from deploying high-performance AI across your digital channels.</p>
          <div style="margin: 40px 0; text-align: center;">
            <a href="${verifyUrl}" class="button">Verify Email Address</a>
          </div>
          <p style="font-size: 14px; color: #4b5563;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size: 13px; word-break: break-all;"><a href="${verifyUrl}" class="link">${verifyUrl}</a></p>
        </div>
        <div class="footer">
          <p>&copy; 2026 ReplySuite Automation. All rights reserved.</p>
          <p>123 Digital Way, Suite 100, AI City, 90210</p>
          <p>You received this email because you signed up for ReplySuite.</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  return sendMail({
    to: email,
    subject: 'Action Required: Verify your ReplySuite Account',
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

