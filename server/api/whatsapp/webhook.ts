import { processWhatsappMessage } from '../../utils/integrations/whatsapp/automation'
import { extractWhatsappMedia } from '../../utils/integrations/whatsapp/media'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  // 1. GET Request: Webhook Challenge Verification (Meta setup)
  if (event.node.req.method === 'GET') {
    const query = getQuery(event)
    const mode = query['hub.mode']
    const token = query['hub.verify_token']
    const challenge = query['hub.challenge']

    if (mode === 'subscribe' && token === config.whatsappVerifyToken) {
      console.log('[WhatsApp Webhook] Verification Successful')
      return challenge
    }
    
    console.warn('[WhatsApp Webhook] Verification Failed: Check your Verify Token in the Meta App portal.')
    return 'Verification failed'
  }

  // 2. POST Request: Handle Incoming WhatsApp Messages
  if (event.node.req.method === 'POST') {
    const signature = getHeader(event, 'x-hub-signature-256')
    const rawBody = await readRawBody(event)
    
    // Security verification (X-Hub-Signature-256 validation).
    // Keep WhatsApp and Instagram webhook secrets separate. Do not validate
    // WhatsApp payloads with the Instagram app secret.
    const metaSecret = config.whatsappAppSecret
    if (!metaSecret) {
      console.warn('[WhatsApp Webhook] WHATSAPP_APP_SECRET is not configured; skipping WhatsApp signature validation.')
    }
    if (metaSecret) { 
      if (!signature) {
        console.error('[WhatsApp Webhook] Missing X-Hub-Signature-256 header')
        return { status: 'unauthorized', error: 'Missing signature' }
      }

      try {
        const encoder = new TextEncoder()
        const keyData = encoder.encode(metaSecret)
        const bodyData = encoder.encode(rawBody || '')
        
        const key = await crypto.subtle.importKey(
          'raw', 
          keyData,
          { name: 'HMAC', hash: 'SHA-256' },
          false, 
          ['sign']
        )
        
        const hmacBuffer = await crypto.subtle.sign('HMAC', key, bodyData)
        const hmacArray = Array.from(new Uint8Array(hmacBuffer))
        const digest = 'sha256=' + hmacArray.map(b => b.toString(16).padStart(2, '0')).join('')

        if (signature !== digest) {
          console.error('[WhatsApp Webhook] Invalid Signature detected')
          return { status: 'unauthorized', error: 'Invalid signature' }
        }
      } catch (err: any) {
        console.error('[WhatsApp Webhook] Crypto Failure:', err.message)
      }
    }

    const body = JSON.parse(rawBody?.toString() || '{}')

    // Parse the payload safely expecting the WhatsApp API format
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of (entry.changes || [])) {
          if (change.field === 'messages') {
            const val = change.value
            
            // Check if there's actually a message (could be a status update: Read/Delivered)
            if (val.messages && val.messages.length > 0) {
              const msg = val.messages[0]
              
              const text =
                msg.type === 'text'
                  ? msg.text?.body
                  : msg.type === 'interactive'
                    ? (msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id)
                    : msg.type === 'button'
                      ? (msg.button?.text || msg.button?.payload)
                      : msg[msg.type]?.caption || `[${msg.type || 'unknown'} message received]`

              const media = extractWhatsappMedia(msg)
              const messageData = {
                waba_id: val.metadata.display_phone_number,
                phone_number_id: val.metadata.phone_number_id,
                from_number: msg.from,
                text,
                message_id: msg.id,
                customer_name: val.contacts?.[0]?.profile?.name || msg.from,
                message_type: msg.type,
                media,
                _event: event
              }
              
              console.log(`[WhatsApp Webhook] Incoming ${messageData.message_type} message to ${messageData.phone_number_id} from ${messageData.from_number}: "${messageData.text}"`)
              
              // Throw it to the background automation worker when the runtime supports it.
              // Some Nitro/Pages contexts do not expose event.waitUntil directly, so never
              // let background scheduling failure turn Meta's webhook acknowledgement into a 500.
              const supabase = serverSupabaseServiceRole(event)
              const job = processWhatsappMessage(supabase, messageData).catch(err => {
                console.error('[WhatsApp Webhook Background Error]', err)
              })
              const cloudflareCtx = (event as any).context?.cloudflare?.ctx
              if (typeof (event as any).waitUntil === 'function') {
                ;(event as any).waitUntil(job)
              } else if (typeof cloudflareCtx?.waitUntil === 'function') {
                cloudflareCtx.waitUntil(job)
              } else {
                await job
              }
            }
          }
        }
      }
    }

    // Always 200 OK to acknowledge receipt, otherwise Meta will retry and rate-limit
    return { status: 'received' }
  }
})
