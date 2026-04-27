import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    // Parse botId filter if provided
    const { botId } = await req.json().catch(() => ({}))

    // 1. Fetch Chatbots for scope
    let chatbotQuery = supabaseClient
      .from('chatbots')
      .select('id, name')
      .eq('user_id', user.id)
    
    if (botId && botId !== 'all') {
      chatbotQuery = chatbotQuery.eq('id', botId)
    }

    const { data: chatbots, error: botError } = await chatbotQuery
    if (botError) throw botError

    const botIds = chatbots?.map(b => b.id) || []

    if (botIds.length === 0) {
      return new Response(JSON.stringify({ 
        summary: { totalSessions: 0, totalMessages: 0, botMessages: 0, userMessages: 0, successRate: 0, activeTriggers: 0 },
        channels: { whatsapp: 0, web: 0, instagram: 0 },
        chatbots: [],
        timeline: []
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Aggregate Sessions and Messages
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: sessions, error: sessionError } = await supabaseClient
      .from('chat_sessions')
      .select(`
        id, 
        chatbot_id, 
        created_at, 
        metadata,
        chat_messages (role)
      `)
      .in('chatbot_id', botIds)
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (sessionError) throw sessionError

    // 3. Process Data
    const summary = {
      totalSessions: sessions.length,
      totalMessages: 0,
      botMessages: 0,
      userMessages: 0,
      successRate: 0,
      activeTriggers: 0 // Placeholder or query from triggers table
    }

    const channelCounts = { whatsapp: 0, web: 0, instagram: 0 }
    const timelineMap = new Map()
    const botStats = new Map()

    // Initialize bot stats
    chatbots.forEach(b => botStats.set(b.id, { id: b.id, name: b.name, sessions: 0, messages: 0 }))

    sessions.forEach(session => {
      // Timeline
      const date = session.created_at.split('T')[0]
      timelineMap.set(date, (timelineMap.get(date) || 0) + 1)

      // Channels
      const type = (session.metadata?.type || 'web').toLowerCase()
      if (type.includes('whatsapp')) channelCounts.whatsapp++
      else if (type.includes('instagram')) channelCounts.instagram++
      else channelCounts.web++

      // Messages
      const messages = session.chat_messages || []
      summary.totalMessages += messages.length
      
      let sessionBotMessages = 0
      let sessionUserMessages = 0

      messages.forEach((m: any) => {
        if (m.role === 'assistant' || m.role === 'bot') {
          summary.botMessages++
          sessionBotMessages++
        } else {
          summary.userMessages++
          sessionUserMessages++
        }
      })

      // Bot specific stats
      const stats = botStats.get(session.chatbot_id)
      if (stats) {
        stats.sessions++
        stats.messages += messages.length
      }
    })

    // Calculate success rate (sessions with at least one bot message)
    const successfulSessions = sessions.filter(s => 
      s.chat_messages?.some((m: any) => m.role === 'assistant' || m.role === 'bot')
    ).length
    summary.successRate = sessions.length > 0 ? Math.round((successfulSessions / sessions.length) * 100) : 0

    // Fetch active triggers count if applicable
    const [triggerCountRes, dataSourceCountRes, whatsappCountRes] = await Promise.all([
      supabaseClient
        .from('instagram_comment_triggers')
        .select('*', { count: 'exact', head: true })
        .in('chatbot_id', botIds)
        .eq('is_active', true),
      supabaseClient
        .from('data_sources')
        .select('*', { count: 'exact', head: true })
        .in('chatbot_id', botIds),
      supabaseClient
        .from('whatsapp_accounts')
        .select('*', { count: 'exact', head: true })
        .in('chatbot_id', botIds)
    ])
    
    summary.activeTriggers = triggerCountRes.count || 0
    summary.totalDataSources = dataSourceCountRes.count || 0
    summary.totalWhatsappAccounts = whatsappCountRes.count || 0

    // Format results
    const timeline = Array.from(timelineMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const result = {
      summary,
      channels: channelCounts,
      chatbots: Array.from(botStats.values()),
      timeline
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

