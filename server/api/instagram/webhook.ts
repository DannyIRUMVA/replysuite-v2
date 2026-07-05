import { serverSupabaseServiceRole } from '#supabase/server'
import { processInstagramComment, processInstagramMessage } from '../../utils/integrations/instagram/automation'

const timingSafeEqualHex = (left: string, right: string) => {
  if (left.length !== right.length) return false
  let result = 0
  for (let i = 0; i < left.length; i++) result |= left.charCodeAt(i) ^ right.charCodeAt(i)
  return result === 0
}

const verifyMetaSignature = async (rawBody: string, signature: string | undefined, appSecret: string | undefined) => {
  if (!appSecret) return true
  if (!signature) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digestBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const digest = 'sha256=' + Array.from(new Uint8Array(digestBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return timingSafeEqualHex(signature, digest)
}

const extractInstagramMessageEvents = (body: any) => {
  const events: any[] = []
  const ignoredMessages: string[] = []

  for (const entry of body?.entry || []) {
    const igUserId = entry?.id ? String(entry.id) : null

    for (const messageEvent of entry?.messaging || []) {
      const senderId = messageEvent?.sender?.id ? String(messageEvent.sender.id) : null
      const recipientId = messageEvent?.recipient?.id ? String(messageEvent.recipient.id) : igUserId
      const messageText = messageEvent?.message?.text ? String(messageEvent.message.text).trim() : ''
      const messageId = messageEvent?.message?.mid ? String(messageEvent.message.mid) : null

      if (!senderId || !recipientId || !messageText) {
        ignoredMessages.push(`sender=${Boolean(senderId)} recipient=${Boolean(recipientId)} text=${Boolean(messageText)}`)
        continue
      }

      if (messageEvent?.message?.is_echo) {
        ignoredMessages.push('echo=true')
        continue
      }

      events.push({
        igUserId,
        senderId,
        recipientId,
        messageText,
        messageId,
        timestamp: messageEvent?.timestamp || null,
        raw: messageEvent,
      })
    }
  }

  return { events, ignoredMessages }
}

const extractInstagramCommentEvents = (body: any) => {
  const events: any[] = []
  const ignoredChanges: string[] = []

  for (const entry of body?.entry || []) {
    const igUserId = entry?.id ? String(entry.id) : null

    for (const change of entry?.changes || []) {
      const field = String(change?.field || '').toLowerCase()
      if (!['comments', 'comment'].includes(field)) continue

      const value = change?.value || {}
      const commentId = value.id || value.comment_id
      const mediaId = value.media?.id || value.media_id || value.post_id
      const commentText = value.text || value.comment_text || value.message

      if (!commentId || !mediaId || !commentText) {
        ignoredChanges.push(`field=${field || 'unknown'} comment=${Boolean(commentId)} media=${Boolean(mediaId)} text=${Boolean(commentText)}`)
        continue
      }

      events.push({
        igUserId,
        mediaId: String(mediaId),
        commentId: String(commentId),
        commentText: String(commentText),
        commenterId: value.from?.id ? String(value.from.id) : value.commenter_asid ? String(value.commenter_asid) : null,
        commenterUsername: value.from?.username || value.username || null,
        raw: value,
      })
    }
  }

  return { events, ignoredChanges }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (event.node.req.method === 'GET') {
    const query = getQuery(event)
    const mode = query['hub.mode']
    const token = query['hub.verify_token']
    const challenge = query['hub.challenge']

    if (mode === 'subscribe' && token === config.instagramVerifyToken) {
      console.log('[Instagram Webhook] Verification successful')
      return challenge
    }

    console.warn('[Instagram Webhook] Verification failed')
    return 'Verification failed'
  }

  if (event.node.req.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }

  const signature = getHeader(event, 'x-hub-signature-256')
  const rawBody = await readRawBody(event)
  const rawText = rawBody?.toString() || '{}'

  const signatureOk = await verifyMetaSignature(rawText, signature, config.instagramClientSecret)
  if (!signatureOk) {
    console.error('[Instagram Webhook] Invalid or missing X-Hub-Signature-256')
    return { status: 'unauthorized' }
  }

  const body = JSON.parse(rawText)
  const { events: commentEvents, ignoredChanges } = extractInstagramCommentEvents(body)
  const { events: messageEvents, ignoredMessages } = extractInstagramMessageEvents(body)

  console.log('[Instagram Webhook] POST received', {
    object: body?.object || null,
    entries: Array.isArray(body?.entry) ? body.entry.length : 0,
    commentEvents: commentEvents.length,
    messageEvents: messageEvents.length,
    ignoredChanges: ignoredChanges.slice(0, 5),
    ignoredMessages: ignoredMessages.slice(0, 5),
  })

  const supabase = commentEvents.length || messageEvents.length ? serverSupabaseServiceRole(event) : null

  for (const instagramEvent of commentEvents) {
    instagramEvent.event = event
    const job = processInstagramComment(supabase, instagramEvent).catch((error: any) => {
      console.error('[Instagram Webhook Comment Background Error]', error?.message || error)
    })
    if (typeof event.waitUntil === 'function') event.waitUntil(job)
    else await job
  }

  for (const instagramEvent of messageEvents) {
    instagramEvent.event = event
    const job = processInstagramMessage(supabase, instagramEvent).catch((error: any) => {
      console.error('[Instagram Webhook DM Background Error]', error?.message || error)
    })
    if (typeof event.waitUntil === 'function') event.waitUntil(job)
    else await job
  }

  return { status: 'received', commentEvents: commentEvents.length, messageEvents: messageEvents.length }
})
