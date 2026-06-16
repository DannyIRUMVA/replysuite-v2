import { serverSupabaseServiceRole } from '#supabase/server'
import { decryptSecret } from '~~/server/utils/crypto/secrets'
import { checkGoogleCalendarFreeBusy, createGoogleCalendarEvent, getGoogleCalendarBookingConnection } from '~~/server/utils/google-calendar'

type ToolContext = {
  platform?: 'web' | 'whatsapp' | 'instagram' | 'dashboard' | 'test'
  sessionId?: string | null
  messageId?: string | null
  phoneId?: string
  whatsappToken?: string
  customerPhone?: string
}

const toNumber = (value: any, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizePhoneForPaypack = (phone: string) => String(phone || '').trim().replace('+250', '0').replace(/^250/, '0')
const normalizeText = (value: any) => String(value || '').trim()
const normalizeChannel = (context?: ToolContext) => context?.platform || 'web'
const normalizeTime = (value: string) => {
  const trimmed = normalizeText(value)
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed
  if (/^\d{1}:\d{2}$/.test(trimmed)) return `0${trimmed}`
  return trimmed
}
const getIsoRangeForBooking = (date: string, time: string, durationMinutes = 30, timezone = 'Africa/Kigali') => {
  const normalizedTime = normalizeTime(time)
  const offset = timezone === 'Africa/Kigali' ? '+02:00' : ''
  const start = new Date(`${date}T${normalizedTime}:00${offset}`)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
  return { start, end, normalizedTime, timezone }
}
const toGoogleLocalDateTime = (value: Date, timezone = 'Africa/Kigali') => {
  const local = timezone === 'Africa/Kigali' ? new Date(value.getTime() + 2 * 60 * 60 * 1000) : value
  return local.toISOString().slice(0, 19)
}

const getAdmin = (event: any) => serverSupabaseServiceRole(event) as any

const safeJson = (value: any) => {
  try {
    return JSON.parse(JSON.stringify(value ?? {}))
  } catch {
    return { value: String(value) }
  }
}

const logToolEvent = async (
  event: any,
  chatbotId: string,
  toolName: string,
  args: any,
  result: any,
  context?: ToolContext,
  target?: { type?: string | null; id?: string | null },
) => {
  try {
    const supabase = getAdmin(event)
    await supabase.from('chatbot_tool_events').insert({
      chatbot_id: chatbotId,
      session_id: context?.sessionId || null,
      message_id: context?.messageId || null,
      tool_name: toolName,
      target_type: target?.type || null,
      target_id: target?.id || null,
      arguments: safeJson(args),
      result: safeJson(result),
      status: result?.error ? 'error' : 'success',
      error_message: result?.error || null,
    })
  } catch (err: any) {
    console.warn('[Agent Tool Events] Failed to log tool event:', err?.message || err)
  }
}

const getChatbotToolConfig = async (event: any, chatbotId: string) => {
  const { data } = await getAdmin(event)
    .from('chatbots')
    .select('tools_config')
    .eq('id', chatbotId)
    .maybeSingle()
  return data?.tools_config || {}
}

const getPaymentCredentials = async (event: any, chatbotId: string) => {
  const supabase = getAdmin(event)

  // Production credentials live in chatbot_payment_providers only.
  // Do not read legacy plaintext tools_config secrets for payment execution.
  const { data: provider } = await supabase
    .from('chatbot_payment_providers')
    .select('client_id, encrypted_client_secret')
    .eq('chatbot_id', chatbotId)
    .eq('provider', 'paypack')
    .eq('is_active', true)
    .maybeSingle()

  if (provider?.client_id && provider?.encrypted_client_secret) {
    const config = useRuntimeConfig()
    return {
      clientId: provider.client_id,
      clientSecret: await decryptSecret(provider.encrypted_client_secret, config.paypackSecretEncryptionKey || ''),
      source: 'chatbot_payment_providers',
    }
  }

  return {
    clientId: '',
    clientSecret: '',
    source: 'chatbot_payment_providers',
  }
}

export const getMenuHandler = async (event: any, chatbotId: string, args: any, context?: ToolContext) => {
  const disabledResult = { error: 'Orders are disabled. Use appointments and bookings instead.' }
  await logToolEvent(event, chatbotId, 'get_menu', args, disabledResult, context)
  return disabledResult

  const supabase = getAdmin(event)
  let query = supabase
    .from('chatbot_catalog')
    .select('id, name, description, category, price, currency, image_url, sku, is_available')
    .eq('chatbot_id', chatbotId)
    .eq('is_available', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (args?.category) query = query.ilike('category', `%${args.category}%`)

  const { data, error } = await query
  const result = error ? { error: error.message } : { items: data || [] }
  await logToolEvent(event, chatbotId, 'get_menu', args, result, context)
  return result
}

const resolveCatalogItems = async (event: any, chatbotId: string, items: any[] = []) => {
  const { data: products, error } = await getAdmin(event)
    .from('chatbot_catalog')
    .select('id, name, description, price, currency, is_available')
    .eq('chatbot_id', chatbotId)
    .eq('is_available', true)

  if (error) return { error: error.message, orderItems: [], total: 0, currency: 'RWF' }
  if (!products?.length) return { error: 'Catalog is empty. Add products before taking orders.', orderItems: [], total: 0, currency: 'RWF' }

  let total = 0
  const missing: string[] = []
  const orderItems = items.map((item: any) => {
    const ident = normalizeText(item.product_name_or_id || item.product_id || item.catalog_item_id || item.name).toLowerCase()
    const qty = Math.max(1, Math.floor(toNumber(item.qty ?? item.quantity, 1)))
    const product = products.find((prod: any) => prod.id?.toLowerCase() === ident || prod.name?.toLowerCase() === ident)
    if (!product) {
      missing.push(ident || 'unknown item')
      return null
    }
    const price = toNumber(product.price)
    const lineTotal = price * qty
    total += lineTotal
    return {
      catalog_item_id: product.id,
      name: product.name,
      description: product.description,
      price,
      currency: product.currency || 'RWF',
      qty,
      notes: item.notes || null,
      line_total: lineTotal,
    }
  }).filter(Boolean)

  return {
    error: missing.length ? `Some items were not found in the catalog: ${missing.join(', ')}` : null,
    orderItems,
    total,
    currency: orderItems[0]?.currency || 'RWF',
  }
}

export const createOrderHandler = async (event: any, chatbotId: string, args: any, context?: ToolContext) => {
  const disabledResult = { error: 'Orders are disabled. Use appointments and bookings instead.' }
  await logToolEvent(event, chatbotId, 'create_order', args, disabledResult, context)
  return disabledResult

  const items = Array.isArray(args?.items) ? args.items : []
  if (!items.length) {
    const result = { error: 'Choose at least one catalog item before creating an order.' }
    await logToolEvent(event, chatbotId, 'create_order', args, result, context)
    return result
  }

  const resolved = await resolveCatalogItems(event, chatbotId, items)
  if (resolved.error) {
    const result = { error: resolved.error }
    await logToolEvent(event, chatbotId, 'create_order', args, result, context)
    return result
  }

  const config = await getChatbotToolConfig(event, chatbotId)
  const orderConfig = config?.orders || {}
  const paymentRequired = Boolean(orderConfig.payment_required || orderConfig.paymentRequired)
  const deliveryFee = args?.order_type === 'delivery' ? toNumber(orderConfig.delivery_fee || orderConfig.deliveryFee, 0) : 0
  const subtotal = resolved.total
  const totalAmount = subtotal + deliveryFee
  const status = paymentRequired ? 'pending_payment' : 'pending'
  const paymentStatus = paymentRequired ? 'unpaid' : 'not_required'

  const supabase = getAdmin(event)
  const { data: order, error } = await supabase
    .from('chatbot_orders')
    .insert({
      chatbot_id: chatbotId,
      session_id: context?.sessionId || null,
      customer_phone: args?.customer_phone || args?.phone || null,
      customer_name: args?.customer_name || args?.name || null,
      customer_email: args?.customer_email || args?.email || null,
      order_type: args?.order_type || 'pickup',
      delivery_address: args?.delivery_address || null,
      subtotal,
      delivery_fee: deliveryFee,
      tax_amount: 0,
      total_amount: totalAmount,
      currency: resolved.currency,
      status,
      payment_status: paymentStatus,
      source_channel: normalizeChannel(context),
      metadata: { created_by: 'agent_tool' },
    })
    .select('id, total_amount, currency, status, payment_status')
    .single()

  if (error) {
    const result = { error: error.message }
    await logToolEvent(event, chatbotId, 'create_order', args, result, context)
    return result
  }

  const itemRows = resolved.orderItems.map((item: any) => ({
    order_id: order.id,
    catalog_item_id: item.catalog_item_id,
    name: item.name,
    unit_price: item.price,
    quantity: item.qty,
    notes: item.notes,
    line_total: item.line_total,
  }))
  await supabase.from('chatbot_order_items').insert(itemRows)
  await supabase.from('order_status_events').insert({ order_id: order.id, status_to: status, note: 'Created by chatbot.' })

  const result = {
    order_id: order.id,
    total: Number(order.total_amount),
    currency: order.currency,
    status: order.status,
    payment_status: order.payment_status,
    message: paymentRequired
      ? 'Order created. Payment is required before confirmation.'
      : 'Order created and waiting for staff confirmation.',
  }
  await logToolEvent(event, chatbotId, 'create_order', args, result, context, { type: 'order', id: order.id })
  return result
}

export const placeOrderHandler = createOrderHandler

export const confirmOrderHandler = async (event: any, chatbotId: string, args: any, context?: ToolContext) => {
  const disabledResult = { error: 'Orders are disabled. Use appointments and bookings instead.' }
  await logToolEvent(event, chatbotId, 'confirm_order', args, disabledResult, context)
  return disabledResult

  const orderId = args?.order_id || args?.target_id
  if (!orderId) {
    const result = { error: 'order_id is required.' }
    await logToolEvent(event, chatbotId, 'confirm_order', args, result, context)
    return result
  }

  const supabase = getAdmin(event)
  const { data: order, error: loadError } = await supabase
    .from('chatbot_orders')
    .select('id, status, payment_status')
    .eq('id', orderId)
    .eq('chatbot_id', chatbotId)
    .maybeSingle()

  if (loadError || !order) {
    const result = { error: 'Order not found for this assistant.' }
    await logToolEvent(event, chatbotId, 'confirm_order', args, result, context)
    return result
  }

  const nextStatus = order.payment_status === 'unpaid' || order.payment_status === 'pending' ? 'pending_payment' : 'confirmed'
  const { error } = await supabase.from('chatbot_orders').update({ status: nextStatus }).eq('id', order.id)
  if (!error) await supabase.from('order_status_events').insert({ order_id: order.id, status_from: order.status, status_to: nextStatus, note: 'Confirmed by chatbot flow.' })

  const result = error ? { error: error.message } : { order_id: order.id, status: nextStatus, message: `Order is now ${nextStatus}.` }
  await logToolEvent(event, chatbotId, 'confirm_order', args, result, context, { type: 'order', id: order.id })
  return result
}

export const cancelOrderHandler = async (event: any, chatbotId: string, args: any, context?: ToolContext) => {
  const disabledResult = { error: 'Orders are disabled. Use appointments and bookings instead.' }
  await logToolEvent(event, chatbotId, 'cancel_order', args, disabledResult, context)
  return disabledResult

  const orderId = args?.order_id || args?.target_id
  const supabase = getAdmin(event)
  const { data: order } = await supabase.from('chatbot_orders').select('id, status').eq('id', orderId).eq('chatbot_id', chatbotId).maybeSingle()
  if (!order) {
    const result = { error: 'Order not found for this assistant.' }
    await logToolEvent(event, chatbotId, 'cancel_order', args, result, context)
    return result
  }
  const { error } = await supabase.from('chatbot_orders').update({ status: 'cancelled' }).eq('id', order.id)
  if (!error) await supabase.from('order_status_events').insert({ order_id: order.id, status_from: order.status, status_to: 'cancelled', note: args?.reason || 'Cancelled by customer.' })
  const result = error ? { error: error.message } : { order_id: order.id, status: 'cancelled' }
  await logToolEvent(event, chatbotId, 'cancel_order', args, result, context, { type: 'order', id: order.id })
  return result
}

export const listAppointmentServicesHandler = async (event: any, chatbotId: string, args: any, context?: ToolContext) => {
  const { data, error } = await getAdmin(event)
    .from('appointment_services')
    .select('id, name, description, duration_minutes, price, currency')
    .eq('chatbot_id', chatbotId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const result = error ? { error: error.message } : { services: data || [] }
  await logToolEvent(event, chatbotId, 'list_appointment_services', args, result, context)
  return result
}

export const checkAppointmentAvailabilityHandler = async (event: any, chatbotId: string, args: any, context?: ToolContext) => {
  const date = normalizeText(args?.date)
  const time = normalizeText(args?.time)
  if (!date) {
    const result = { error: 'date is required in YYYY-MM-DD format.' }
    await logToolEvent(event, chatbotId, 'check_appointment_availability', args, result, context)
    return result
  }

  const serviceId = args?.service_id || null
  let durationMinutes = 60
  if (serviceId) {
    const { data: service } = await getAdmin(event)
      .from('appointment_services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .eq('chatbot_id', chatbotId)
      .maybeSingle()
    if (service?.duration_minutes) durationMinutes = Number(service.duration_minutes)
  }

  const timezone = args?.timezone || 'Africa/Kigali'
  const { start, end, normalizedTime } = time
    ? getIsoRangeForBooking(date, time, durationMinutes, timezone)
    : { start: new Date(`${date}T00:00:00${timezone === 'Africa/Kigali' ? '+02:00' : ''}`), end: new Date(`${date}T23:59:59${timezone === 'Africa/Kigali' ? '+02:00' : ''}`), normalizedTime: '' }

  const google = await getGoogleCalendarBookingConnection(event, chatbotId)
  if (!google.error && google.mapping?.calendar_id) {
    try {
      const freeBusy = await checkGoogleCalendarFreeBusy(google.accessToken, google.mapping.calendar_id, start.toISOString(), end.toISOString(), google.mapping.calendar_timezone || timezone)
      const result = {
        available: freeBusy.available,
        date,
        time: normalizedTime || null,
        provider: 'google_calendar',
        message: freeBusy.available ? 'This time is available on Google Calendar.' : 'That time is already busy on Google Calendar.',
      }
      await logToolEvent(event, chatbotId, 'check_appointment_availability', args, result, context)
      return result
    } catch (err: any) {
      const result = { error: err?.statusMessage || err?.message || 'Google Calendar availability check failed.' }
      await logToolEvent(event, chatbotId, 'check_appointment_availability', args, result, context)
      return result
    }
  }

  const { data: overlapping, error } = await getAdmin(event)
    .from('chatbot_appointments')
    .select('id')
    .eq('chatbot_id', chatbotId)
    .in('status', ['pending', 'pending_payment', 'paid_pending_approval', 'approved', 'rescheduled'])
    .gte('appointment_start', start.toISOString())
    .lte('appointment_start', end.toISOString())
    .limit(1)

  const available = !error && (!overlapping || overlapping.length === 0)
  const result = error
    ? { error: error.message }
    : { available, date, time: normalizedTime || null, provider: 'replysuite', message: available ? 'This time appears available.' : 'That time already has an appointment.' }
  await logToolEvent(event, chatbotId, 'check_appointment_availability', args, result, context)
  return result
}

export const requestAppointmentHandler = async (event: any, chatbotId: string, args: any, context?: ToolContext) => {
  const date = normalizeText(args?.date)
  const time = normalizeText(args?.time)
  const name = normalizeText(args?.name || args?.customer_name)
  const phone = normalizeText(args?.phone || args?.customer_phone)

  if (!date || !time || !name || !phone) {
    const result = { error: 'date, time, customer name, and phone are required before requesting an appointment.' }
    await logToolEvent(event, chatbotId, 'request_appointment', args, result, context)
    return result
  }

  const config = await getChatbotToolConfig(event, chatbotId)
  const appointmentConfig = config?.appointments || {}
  const depositRequired = Boolean(appointmentConfig.payment_required || appointmentConfig.deposit_required || appointmentConfig.paymentRequired)
  const depositAmount = toNumber(appointmentConfig.deposit_amount || appointmentConfig.depositAmount, 0)
  const approvalMode = appointmentConfig.approval_mode || appointmentConfig.approvalMode || 'manual'
  const serviceId = args?.service_id || null
  let durationMinutes = 30
  let serviceName = ''
  if (serviceId) {
    const { data: service } = await getAdmin(event)
      .from('appointment_services')
      .select('name, duration_minutes, price, currency')
      .eq('id', serviceId)
      .eq('chatbot_id', chatbotId)
      .maybeSingle()
    if (service?.duration_minutes) durationMinutes = Number(service.duration_minutes)
    if (service?.name) serviceName = service.name
  }

  const timezone = args?.timezone || appointmentConfig.timezone || 'Africa/Kigali'
  const { start, end, normalizedTime } = getIsoRangeForBooking(date, time, durationMinutes, timezone)

  const google = await getGoogleCalendarBookingConnection(event, chatbotId)
  let googleEvent: any = null
  if (!google.error && google.mapping?.calendar_id) {
    try {
      const freeBusy = await checkGoogleCalendarFreeBusy(google.accessToken, google.mapping.calendar_id, start.toISOString(), end.toISOString(), google.mapping.calendar_timezone || timezone)
      if (!freeBusy.available) {
        const result = { error: 'That time is already busy on Google Calendar. Please choose another time.' }
        await logToolEvent(event, chatbotId, 'request_appointment', args, result, context)
        return result
      }
      googleEvent = await createGoogleCalendarEvent(google.accessToken, google.mapping.calendar_id, {
        summary: `${serviceName || 'Booking'} — ${name}`,
        description: [
          `Created by ReplySuite chatbot ${chatbotId}`,
          `Customer: ${name}`,
          `Phone: ${phone}`,
          args?.email || args?.customer_email ? `Email: ${args?.email || args?.customer_email}` : '',
          args?.notes ? `Notes: ${args.notes}` : '',
        ].filter(Boolean).join('\n'),
        start: { dateTime: toGoogleLocalDateTime(start, google.mapping.calendar_timezone || timezone), timeZone: google.mapping.calendar_timezone || timezone },
        end: { dateTime: toGoogleLocalDateTime(end, google.mapping.calendar_timezone || timezone), timeZone: google.mapping.calendar_timezone || timezone },
        reminders: { useDefault: true },
        extendedProperties: { private: { replysuite_chatbot_id: chatbotId } },
      })
    } catch (err: any) {
      const result = { error: err?.statusMessage || err?.message || 'Google Calendar booking failed.' }
      await logToolEvent(event, chatbotId, 'request_appointment', args, result, context)
      return result
    }
  }
  const status = depositRequired && depositAmount > 0
    ? 'pending_payment'
    : approvalMode === 'auto'
      ? 'approved'
      : 'pending'
  const paymentStatus = depositRequired && depositAmount > 0 ? 'unpaid' : 'not_required'

  const supabase = getAdmin(event)
  const { data, error } = await supabase
    .from('chatbot_appointments')
    .insert({
      chatbot_id: chatbotId,
      session_id: context?.sessionId || null,
      service_id: serviceId,
      staff_id: args?.staff_id || null,
      customer_name: name,
      customer_phone: phone,
      customer_email: args?.email || args?.customer_email || null,
      appointment_start: start.toISOString(),
      appointment_end: end.toISOString(),
      appointment_time: start.toISOString(),
      timezone,
      status,
      payment_status: paymentStatus,
      deposit_required: depositRequired,
      deposit_amount: depositAmount,
      currency: appointmentConfig.currency || 'RWF',
      notes: args?.notes || null,
      source_channel: normalizeChannel(context),
      external_provider: googleEvent ? 'google_calendar' : null,
      external_calendar_id: googleEvent ? google.mapping.calendar_id : null,
      external_event_id: googleEvent?.id || null,
      external_event_etag: googleEvent?.etag || null,
      sync_status: googleEvent ? 'synced' : null,
      last_synced_at: googleEvent ? new Date().toISOString() : null,
      metadata: { created_by: 'agent_tool', google_event_html_link: googleEvent?.htmlLink || null },
    })
    .select('id, status, payment_status, appointment_start, appointment_end, deposit_amount, currency, external_event_id')
    .single()

  if (error) {
    const result = { error: error.message }
    await logToolEvent(event, chatbotId, 'request_appointment', args, result, context)
    return result
  }

  await supabase.from('appointment_status_events').insert({ appointment_id: data.id, status_to: status, note: 'Requested by chatbot.' })

  const result = {
    status: data.status,
    payment_status: data.payment_status,
    appointment_start: data.appointment_start,
    appointment_end: data.appointment_end,
    deposit_amount: Number(data.deposit_amount || 0),
    currency: data.currency || 'RWF',
    calendar_synced: Boolean(googleEvent),
    message: depositRequired && depositAmount > 0
      ? 'Appointment request saved. A deposit is required before confirmation.'
      : googleEvent
        ? 'Booking saved and added to Google Calendar.'
        : approvalMode === 'auto'
          ? 'Appointment booked successfully.'
          : 'Appointment request saved. The team will confirm it.',
  }
  await logToolEvent(event, chatbotId, 'request_appointment', args, result, context, { type: 'appointment', id: data.id })
  return result
}

export const appointmentHandler = requestAppointmentHandler

export const rescheduleAppointmentHandler = async (event: any, chatbotId: string, args: any, context?: ToolContext) => {
  const appointmentId = args?.appointment_id || args?.target_id
  const date = normalizeText(args?.date)
  const time = normalizeText(args?.time)
  if (!appointmentId || !date || !time) {
    const result = { error: 'appointment_id, date, and time are required.' }
    await logToolEvent(event, chatbotId, 'reschedule_appointment', args, result, context)
    return result
  }

  const supabase = getAdmin(event)
  const { data: current } = await supabase
    .from('chatbot_appointments')
    .select('id, status, appointment_start, appointment_end')
    .eq('id', appointmentId)
    .eq('chatbot_id', chatbotId)
    .maybeSingle()

  if (!current) {
    const result = { error: 'Appointment not found for this assistant.' }
    await logToolEvent(event, chatbotId, 'reschedule_appointment', args, result, context)
    return result
  }

  const start = new Date(`${date}T${time}:00`)
  const oldStart = current.appointment_start ? new Date(current.appointment_start) : null
  const oldEnd = current.appointment_end ? new Date(current.appointment_end) : null
  const duration = oldStart && oldEnd ? Math.max(30, Math.round((oldEnd.getTime() - oldStart.getTime()) / 60000)) : 30
  const end = new Date(start.getTime() + duration * 60 * 1000)

  const { error } = await supabase
    .from('chatbot_appointments')
    .update({ appointment_start: start.toISOString(), appointment_end: end.toISOString(), appointment_time: start.toISOString(), status: 'rescheduled' })
    .eq('id', appointmentId)
    .eq('chatbot_id', chatbotId)

  if (!error) await supabase.from('appointment_status_events').insert({ appointment_id: appointmentId, status_from: current.status, status_to: 'rescheduled', note: args?.reason || 'Rescheduled by customer.' })
  const result = error ? { error: error.message } : { status: 'rescheduled', appointment_start: start.toISOString(), message: 'Appointment rescheduled successfully.' }
  await logToolEvent(event, chatbotId, 'reschedule_appointment', args, result, context, { type: 'appointment', id: appointmentId })
  return result
}

export const cancelAppointmentHandler = async (event: any, chatbotId: string, args: any, context?: ToolContext) => {
  const appointmentId = args?.appointment_id || args?.target_id
  const supabase = getAdmin(event)
  const { data: current } = await supabase.from('chatbot_appointments').select('id, status').eq('id', appointmentId).eq('chatbot_id', chatbotId).maybeSingle()
  if (!current) {
    const result = { error: 'Appointment not found for this assistant.' }
    await logToolEvent(event, chatbotId, 'cancel_appointment', args, result, context)
    return result
  }
  const { error } = await supabase.from('chatbot_appointments').update({ status: 'cancelled' }).eq('id', appointmentId).eq('chatbot_id', chatbotId)
  if (!error) await supabase.from('appointment_status_events').insert({ appointment_id: appointmentId, status_from: current.status, status_to: 'cancelled', note: args?.reason || 'Cancelled by customer.' })
  const result = error ? { error: error.message } : { status: 'cancelled', message: 'Appointment cancelled successfully.' }
  await logToolEvent(event, chatbotId, 'cancel_appointment', args, result, context, { type: 'appointment', id: appointmentId })
  return result
}

const loadPayableTarget = async (event: any, chatbotId: string, args: any) => {
  const supabase = getAdmin(event)
  const targetType = args?.target_type || 'appointment'
  const targetId = args?.target_id || args?.appointment_id

  if (!targetId || targetType !== 'appointment') {
    return { error: 'Payments are only available for appointment or booking deposits.' }
  }

  const { data: appointment } = await supabase
    .from('chatbot_appointments')
    .select('id, deposit_required, deposit_amount, currency, payment_status, status')
    .eq('id', targetId)
    .eq('chatbot_id', chatbotId)
    .maybeSingle()
  if (!appointment) return { error: 'Appointment not found for this assistant.' }
  if (appointment.payment_status === 'paid') return { error: 'This appointment payment is already complete.' }
  const amount = Number(appointment.deposit_required ? appointment.deposit_amount : 0)
  if (!amount || amount <= 0) return { error: 'This appointment does not have a payable deposit amount configured.' }
  return { targetType, targetId, amount, currency: appointment.currency || 'RWF', record: appointment }
}

export const paypackHandler = async (event: any, chatbotId: string, args: any, context?: ToolContext) => {
  const phone = normalizeText(args?.phone || args?.customer_phone)
  if (!phone) {
    const result = { error: 'Customer phone is required to request payment.' }
    await logToolEvent(event, chatbotId, 'request_payment', args, result, context)
    return result
  }

  const target = await loadPayableTarget(event, chatbotId, args)
  if (target.error) {
    const result = { error: target.error }
    await logToolEvent(event, chatbotId, 'request_payment', args, result, context)
    return result
  }

  const credentials = await getPaymentCredentials(event, chatbotId)
  if (!credentials.clientId || !credentials.clientSecret) {
    const result = { error: 'Paypack is not configured for this assistant.' }
    await logToolEvent(event, chatbotId, 'request_payment', args, result, context, { type: target.targetType, id: target.targetId })
    return result
  }

  const { data: existingPayment } = await getAdmin(event)
    .from('chatbot_payments')
    .select('id, status')
    .eq('chatbot_id', chatbotId)
    .eq('target_type', target.targetType)
    .eq('target_id', target.targetId)
    .in('status', ['pending', 'paid'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingPayment?.status === 'paid') {
    const result = { error: 'This target is already paid.' }
    await logToolEvent(event, chatbotId, 'request_payment', args, result, context, { type: target.targetType, id: target.targetId })
    return result
  }
  if (existingPayment?.status === 'pending') {
    const result = { error: 'A payment request is already pending for this target.', payment_id: existingPayment.id }
    await logToolEvent(event, chatbotId, 'request_payment', args, result, context, { type: target.targetType, id: target.targetId })
    return result
  }

  const authRes = await fetch('https://payments.paypack.rw/api/auth/agents/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: credentials.clientId, client_secret: credentials.clientSecret }),
  })
  const authData: any = await authRes.json().catch(() => ({}))
  if (!authRes.ok || !authData.access) {
    const result = { error: 'Paypack authentication failed.', details: authData }
    await logToolEvent(event, chatbotId, 'request_payment', args, result, context, { type: target.targetType, id: target.targetId })
    return result
  }

  const cashinRes = await fetch('https://payments.paypack.rw/api/transactions/cashin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authData.access}`,
    },
    body: JSON.stringify({ amount: target.amount, number: normalizePhoneForPaypack(phone) }),
  })
  const cashinData: any = await cashinRes.json().catch(() => ({}))

  if (!cashinRes.ok || !cashinData.ref) {
    const result = { error: 'Failed to initiate payment.', details: cashinData }
    await logToolEvent(event, chatbotId, 'request_payment', args, result, context, { type: target.targetType, id: target.targetId })
    return result
  }

  const supabase = getAdmin(event)
  const { data: payment } = await supabase
    .from('chatbot_payments')
    .insert({
      chatbot_id: chatbotId,
      target_type: target.targetType,
      target_id: target.targetId,
      provider: 'paypack',
      provider_ref: cashinData.ref,
      amount: target.amount,
      currency: target.currency,
      phone,
      status: 'pending',
      raw_response: cashinData,
    })
    .select('id')
    .single()

  await supabase.from('chatbot_appointments').update({ payment_status: 'pending', status: 'pending_payment' }).eq('id', target.targetId)
  if (payment?.id) await supabase.from('payment_status_events').insert({ payment_id: payment.id, status_to: 'pending', raw_event: cashinData })

  const result = {
    success: true,
    payment_id: payment?.id,
    target_type: target.targetType,
    target_id: target.targetId,
    amount: target.amount,
    currency: target.currency,
    ref: cashinData.ref,
    message: 'Payment prompt sent to the customer phone.',
  }
  await logToolEvent(event, chatbotId, 'request_payment', args, result, context, { type: target.targetType, id: target.targetId })
  return result
}

export const checkPaymentStatusHandler = async (event: any, chatbotId: string, args: any, context?: ToolContext) => {
  const supabase = getAdmin(event)
  let query = supabase.from('chatbot_payments').select('*').eq('chatbot_id', chatbotId)
  if (args?.payment_id) query = query.eq('id', args.payment_id)
  else if (args?.target_id || args?.appointment_id) {
    query = query
      .eq('target_type', 'appointment')
      .eq('target_id', args?.target_id || args?.appointment_id)
      .order('created_at', { ascending: false })
  } else {
    const result = { error: 'payment_id or target_id is required.' }
    await logToolEvent(event, chatbotId, 'check_payment_status', args, result, context)
    return result
  }

  const { data, error } = await query.limit(1).maybeSingle()
  const result = error ? { error: error.message } : data ? { payment: data, status: data.status } : { error: 'Payment not found.' }
  await logToolEvent(event, chatbotId, 'check_payment_status', args, result, context, data ? { type: data.target_type, id: data.target_id } : undefined)
  return result
}

export const sendWhatsAppMenuHandler = async (event: any, chatbotId: string, args: any, context?: ToolContext) => {
  if (!context || context.platform !== 'whatsapp') {
    return { error: 'This tool is only available for WhatsApp interactions.' }
  }

  const { phoneId, whatsappToken, customerPhone } = context
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: customerPhone,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: args.header || 'Menu' },
      body: { text: args.body || 'Please select an option below.' },
      footer: { text: 'Powered by ReplySuite' },
      action: {
        button: args.button_text || 'View Options',
        sections: [{
          title: args.section_title || 'Options',
          rows: (args.options || []).map((opt: any) => ({ id: opt.id, title: opt.title, description: opt.description })),
        }],
      },
    },
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${whatsappToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data: any = await res.json()
    if (data.error) throw new Error(data.error.message)
    const result = { success: true, message: 'Interactive menu sent successfully.' }
    await logToolEvent(event, chatbotId, 'send_whatsapp_menu', args, result, context)
    return result
  } catch (err: any) {
    console.error('[WhatsApp Menu Tool Error]', err.message)
    const result = { error: err.message }
    await logToolEvent(event, chatbotId, 'send_whatsapp_menu', args, result, context)
    return result
  }
}
