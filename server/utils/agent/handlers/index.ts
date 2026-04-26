import { serverSupabaseServiceRole } from '#supabase/server'

export const getMenuHandler = async (event: any, chatbotId: string, args: any) => {
  const supabase = serverSupabaseServiceRole(event)
  let query = supabase.from('chatbot_catalog').select('*').eq('chatbot_id', chatbotId).eq('is_available', true)
  
  if (args.category) {
    query = query.ilike('category', args.category)
  }

  const { data, error } = await query
  if (error) return { error: error.message }
  return { items: data }
}

export const placeOrderHandler = async (event: any, chatbotId: string, args: any) => {
  const supabase = serverSupabaseServiceRole(event)
  
  // The AI might pass the UUID or the exact text Name (since the LLM forgets the UUID in chat history)
  // Fetch the catalog for this chatbot to match items safely without triggering Postgres UUID syntax errors
  const { data: allProducts } = await supabase
    .from('chatbot_catalog')
    .select('id, name, price')
    .eq('chatbot_id', chatbotId)

  if (!allProducts || allProducts.length === 0) return { error: 'Products not found or catalog empty' }

  let total = 0
  const orderItems = args.items.map((item: any) => {
    const ident = String(item.product_name_or_id || item.product_id).toLowerCase().trim()
    const p = allProducts.find(prod => prod.id.toLowerCase() === ident || prod.name.toLowerCase() === ident)
    
    if (p) {
      total += p.price * item.qty
      return { ...p, qty: item.qty }
    }
    return null
  }).filter(Boolean)

  const { data: order, error } = await supabase
    .from('chatbot_orders')
    .insert({
      chatbot_id: chatbotId,
      customer_phone: args.customer_phone,
      customer_name: args.customer_name,
      items: orderItems,
      total_amount: total,
      status: 'pending'
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { order_id: order.id, total, message: 'Order placed successfully. Please proceed to payment.' }
}

export const paypackHandler = async (event: any, chatbotId: string, args: any) => {
  const config = useRuntimeConfig()
  const { data: chatbot } = await serverSupabaseServiceRole(event)
    .from('chatbots')
    .select('tools_config')
    .eq('id', chatbotId)
    .single()

  const { paypack_client_id, paypack_client_secret } = chatbot?.tools_config || {}
  
  if (!paypack_client_id || !paypack_client_secret) {
    return { error: 'Paypack not configured for this chatbot.' }
  }

  // Edge-compatible Paypack request (raw fetch)
  // 1. Get Access Token
  const authRes = await fetch('https://payments.paypack.rw/api/auth/agents/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: paypack_client_id, client_secret: paypack_client_secret })
  })
  const authData: any = await authRes.json()
  if (!authData.access) return { error: 'Paypack authentication failed' }

  // 2. Trigger Cashin
  const cashinRes = await fetch('https://payments.paypack.rw/api/transactions/cashin', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.access}`
    },
    body: JSON.stringify({
      amount: args.amount,
      number: args.phone.replace('+250', '0').replace(/^250/, '0'),
    })
  })
  const cashinData: any = await cashinRes.json()
  
  if (cashinData.ref) {
    // Update order with payment ref
    await serverSupabaseServiceRole(event)
      .from('chatbot_orders')
      .update({ payment_ref: cashinData.ref, payment_provider: 'paypack' })
      .eq('id', args.order_id)

    return { success: true, ref: cashinData.ref, message: 'Payment prompt sent to phone.' }
  }

  return { error: 'Failed to initiate payment', details: cashinData }
}

export const appointmentHandler = async (event: any, chatbotId: string, args: any) => {
  const supabase = serverSupabaseServiceRole(event)
  const timestamp = `${args.date}T${args.time}:00Z`

  const { data, error } = await supabase
    .from('chatbot_appointments')
    .insert({
      chatbot_id: chatbotId,
      customer_name: args.name,
      customer_phone: args.phone,
      appointment_time: timestamp,
      status: 'pending'
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { appointment_id: data.id, message: `Appointment scheduled for ${args.date} at ${args.time}.` }
}

export const invoiceHandler = async (event: any, chatbotId: string, args: any) => {
  const supabase = serverSupabaseServiceRole(event)
  
  // Get order details
  const { data: order } = await supabase
    .from('chatbot_orders')
    .select('*')
    .eq('id', args.order_id)
    .single()

  if (!order) return { error: 'Order not found' }

  const invoiceNumber = `INV-${Math.floor(Date.now() / 1000)}`
  
  const { data: invoice, error } = await supabase
    .from('chatbot_invoices')
    .insert({
      order_id: order.id,
      chatbot_id: chatbotId,
      invoice_number: invoiceNumber,
      total_amount: order.total_amount,
      status: 'issued'
    })
    .select()
    .single()

  if (error) return { error: error.message }
  
  const config = useRuntimeConfig()
  const publicUrl = `${config.public.siteUrl}/invoice/${invoice.id}`
  
  return { invoice_id: invoice.id, invoice_number: invoiceNumber, public_url: publicUrl }
}

export const sendWhatsAppMenuHandler = async (event: any, chatbotId: string, args: any, context?: any) => {
  if (!context || context.platform !== 'whatsapp') {
    return { error: 'This tool is only available for WhatsApp interactions.' }
  }

  const { phoneId, whatsappToken, customerPhone } = context
  
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: customerPhone,
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: args.header || "Menu"
      },
      body: {
        text: args.body || "Please select an option below."
      },
      footer: {
        text: "Powered by ReplySuite"
      },
      action: {
        button: args.button_text || "View Options",
        sections: [
          {
            title: args.section_title || "Options",
            rows: args.options.map((opt: any) => ({
              id: opt.id,
              title: opt.title,
              description: opt.description
            }))
          }
        ]
      }
    }
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    const data: any = await res.json()
    if (data.error) throw new Error(data.error.message)
    
    return { success: true, message: 'Interactive menu sent successfully.' }
  } catch (err: any) {
    console.error('[WhatsApp Menu Tool Error]', err.message)
    return { error: err.message }
  }
}
