export default defineEventHandler(() => {
  return { 
    status: 'ok', 
    message: 'WhatsApp API folder is correctly registered by Nitro.',
    timestamp: new Date().toISOString()
  }
})
