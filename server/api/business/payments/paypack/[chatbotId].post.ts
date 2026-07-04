import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { encryptSecret } from '~~/server/utils/crypto/secrets'
import { isUuid } from '~~/server/utils/public-chatbot'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const chatbotId = String(getRouterParam(event, 'chatbotId') || '')
  if (!isUuid(chatbotId)) throw createError({ statusCode: 400, statusMessage: 'Invalid chatbot id' })

  const body = await readBody(event)
  const clientId = typeof body?.clientId === 'string' ? body.clientId.trim() : ''
  const clientSecret = typeof body?.clientSecret === 'string' ? body.clientSecret.trim() : ''
  const isActive = body?.isActive !== false

  if (!clientId || !clientSecret) {
    throw createError({ statusCode: 400, statusMessage: 'Client ID and client secret are required.' })
  }

  const config = useRuntimeConfig()
  if (!config.paypackSecretEncryptionKey || String(config.paypackSecretEncryptionKey).length < 24) {
    throw createError({ statusCode: 503, statusMessage: 'Mobile payment secret encryption key is not configured.' })
  }

  const userScoped = await serverSupabaseClient(event) as any
  const { data: chatbot, error: chatbotError } = await userScoped
    .from('chatbots')
    .select('id')
    .eq('id', chatbotId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (chatbotError || !chatbot) throw createError({ statusCode: 404, statusMessage: 'Assistant not found' })

  const encrypted = await encryptSecret(clientSecret, config.paypackSecretEncryptionKey)
  const admin = serverSupabaseServiceRole(event) as any
  const { error } = await admin
    .from('chatbot_payment_providers')
    .upsert({
      chatbot_id: chatbotId,
      provider: 'paypack',
      client_id: clientId,
      encrypted_client_secret: encrypted,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'chatbot_id,provider' })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Remove legacy plaintext credentials if they were previously saved in chatbots.tools_config.
  const { data: current } = await admin.from('chatbots').select('tools_config').eq('id', chatbotId).maybeSingle()
  const nextConfig = { ...(current?.tools_config || {}) }
  delete nextConfig.paypack_client_id
  delete nextConfig.paypack_client_secret
  await admin.from('chatbots').update({ tools_config: nextConfig }).eq('id', chatbotId)

  return { success: true, configured: true }
})
