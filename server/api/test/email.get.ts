export default defineEventHandler(async (event) => {
  try {
    const result = await sendMail({
      to: 'boyg87059@gmail.com',
      subject: 'Test Email from ReplySuite',
      text: 'This is a test email to verify SendPulse integration.',
      html: '<h1>Test</h1><p>This is a test email to verify SendPulse integration.</p>'
    })
    return { success: true, result }
  } catch (err: any) {
    return { 
      success: false, 
      error: err.message,
      stack: err.stack 
    }
  }
})
