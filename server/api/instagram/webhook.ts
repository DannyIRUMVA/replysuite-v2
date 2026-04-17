import { processInstagramComment } from '../../utils/automation'
import { serverSupabaseServiceRole } from '#supabase/server'
import crypto from 'crypto'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  // 1. GET Request: Webhook Verification
  if (event.node.req.method === 'GET') {
    const query = getQuery(event)
    const mode = query['hub.mode']
    const token = query['hub.verify_token']
    const challenge = query['hub.challenge']

    // Security: Only verify if mode is subscribe
    if (mode === 'subscribe' && token === config.instagramVerifyToken) {
      console.log('[Webhook] Verification Successful')
      return challenge
    }
    
    console.warn('[Webhook] Verification Failed: check tokens')
    return 'Verification failed'
  }

  // 2. POST Request: Handle Notifications
  if (event.node.req.method === 'POST') {
    const signature = event.node.req.headers['x-hub-signature-256'] as string
    const rawBody = await readRawBody(event)
    
    // Verify Signature (Recommended by Meta for Production)
    if (config.instagramClientSecret) {
      if (!signature) {
        console.error('[Webhook] Missing X-Hub-Signature-256 header')
        return { status: 'unauthorized', error: 'Missing signature' }
      }

      const hmac = crypto.createHmac('sha256', config.instagramClientSecret || '')
      hmac.update(rawBody || '')
      const digest = 'sha256=' + hmac.digest('hex')

      if (signature !== digest) {
        console.error('[Webhook] Invalid Signature detected')
        return { status: 'unauthorized', error: 'Invalid signature' }
      }
    }

    const body = JSON.parse(rawBody?.toString() || '{}')

    // Check if it's an Instagram notification
    if (body.object === 'instagram' || body.object === 'page') {
      for (const entry of body.entry) {
        for (const change of (entry.changes || [])) {
          if (change.field === 'comments') {
            const val = change.value
            
            // Normalize data for the automation engine
            const commentData = {
              instagram_post_id: val.media?.id || val.id, // Fallback to val.id if media is missing
              comment_id: val.id,
              text: val.text,
              from: val.from,
              recipient_id: entry.id // The IG Page ID
            }
            
            console.log(`[Webhook] New Comment on post ${commentData.instagram_post_id}: ${commentData.text}`)
            
            // Trigger Automation Logic (Background)
            const supabase = serverSupabaseServiceRole(event)
            event.waitUntil(processInstagramComment(supabase, commentData).catch(err => {
              console.error('[Webhook Background Error]', err)
            }))
          }
        }
      }
    }

    return { status: 'received' }
  }
})
