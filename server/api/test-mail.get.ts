import { defineEventHandler } from 'h3'
import { sendMail } from '../utils/mail'

export default defineEventHandler(async (event) => {
  try {
    const result = await sendMail({
      to: 'unstoppablemove7@gmail.com',
      subject: 'ReplySuite Mailer Test',
      text: 'This is a test email from the SendPulse REST API integration.',
      html: '<h1>Success!</h1><p>Your Cloudflare-compatible mailer is working.</p>'
    })

    return {
      success: true,
      message: 'Test email triggered successfully. Check your inbox (including spam).',
      result
    }
  } catch (error: any) {
    console.error('Test Mailer Error:', error)
    return {
      success: false,
      error: error.message || 'Unknown error occurred while sending test email.'
    }
  }
})
