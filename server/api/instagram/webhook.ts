import { defineEventHandler, readBody, getQuery } from 'h3'
import { processInstagramComment } from '../../utils/automation'

export default defineEventHandler(async (event) => {
  // 1. GET Request: Webhook Verification
  if (event.node.req.method === 'GET') {
    const query = getQuery(event)
    const mode = query['hub.mode']
    const token = query['hub.verify_token']
    const challenge = query['hub.challenge']

    // Replace 'your_verify_token' with a config value
    if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
      console.log('Webhook Verified!')
      return challenge
    }
    return 'Verification failed'
  }

  // 2. POST Request: Handle Notifications
  if (event.node.req.method === 'POST') {
    const body = await readBody(event)

    // Check if it's an Instagram notification
    if (body.object === 'instagram' || body.object === 'page') {
      for (const entry of body.entry) {
        for (const change of (entry.changes || [])) {
          if (change.field === 'comments') {
            const commentData = change.value
            // Inject recipient_id if it's coming from entry.id (IG Page ID)
            commentData.recipient_id = entry.id
            
            console.log('New Instagram Comment:', commentData.text)
            
            // Trigger Automation Logic (Background)
            event.waitUntil(processInstagramComment(commentData).catch(err => {
              console.error('[Webhook Background Error]', err)
            }))
          }
        }
      }
    }

    return { status: 'received' }
  }
})
