export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  
  const { rating, message, source } = body

  if (!message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Message is required',
    })
  }

  const slackUrl = config.slackWebhookUrl

  if (!slackUrl) {
    console.error('Slack Webhook URL is missing')
    return { success: false, message: 'Internal Server Error' }
  }

  const stars = '⭐'.repeat(rating || 5)

  const payload = {
    text: `*New Feedback: ${stars}*`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*New Feedback from ReplySuite (${source || 'Unknown Source'})*`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Rating:*\n${stars} (${rating}/5)`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Feedback:*\n${message}`,
        },
      },
      {
        type: 'divider',
      },
    ],
  }

  try {
    await $fetch(slackUrl, {
      method: 'POST',
      body: payload,
    })
    return { success: true }
  } catch (err) {
    console.error('Failed to send feedback to Slack:', err)
    return { success: false, message: 'Failed to send feedback' }
  }
})
