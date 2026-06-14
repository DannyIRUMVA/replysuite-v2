import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { isUuid } from '~~/server/utils/public-chatbot'

const allowedStatuses = new Set(['draft', 'pending', 'pending_payment', 'paid_pending_approval', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'refunded'])

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const id = String(getRouterParam(event, 'id') || '')
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid order id' })

  const body = await readBody(event)
  const nextStatus = typeof body?.status === 'string' ? body.status : ''
  const note = typeof body?.note === 'string' ? body.note.slice(0, 1000) : null
  if (!allowedStatuses.has(nextStatus)) throw createError({ statusCode: 400, statusMessage: 'Unsupported order status' })

  const scoped = await serverSupabaseClient(event) as any
  const { data: order, error: loadError } = await scoped
    .from('chatbot_orders')
    .select('id,status,chatbot_id,chatbot:chatbots!inner(id,user_id)')
    .eq('id', id)
    .eq('chatbot.user_id', user.id)
    .maybeSingle()

  if (loadError || !order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })

  const admin = serverSupabaseServiceRole(event) as any
  const { error: updateError } = await admin
    .from('chatbot_orders')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) throw createError({ statusCode: 500, statusMessage: updateError.message })

  await admin.from('order_status_events').insert({
    order_id: id,
    actor_user_id: user.id,
    status_from: order.status,
    status_to: nextStatus,
    note,
  })

  return { success: true, status: nextStatus }
})
