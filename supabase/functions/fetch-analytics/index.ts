import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No Authorization header provided')
    }

    // 1. Manually decode JWT to get User ID
    // Format: Bearer <token>
    const token = authHeader.replace('Bearer ', '')
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) {
      throw new Error('Invalid JWT format')
    }
    
    // Use Deno's atob for base64 decoding
    const decodedPayload = JSON.parse(atob(payloadBase64))
    const userId = decodedPayload.sub
    
    if (!userId) {
      throw new Error('User ID (sub) not found in JWT')
    }

    console.log('[Fetch-Analytics] Extracted User ID:', userId)

    // 2. Initialize Service Role Client for DB operations
    // We use service role to ensure aggregation queries work reliably
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // 3. Fetch User's Instagram Accounts to scope analytics
    const { data: accounts, error: accountError } = await supabaseClient
      .from('instagram_accounts')
      .select('id')
      .eq('user_id', userId)
      
    if (accountError) {
      console.error('[Fetch-Analytics] DB Error fetching accounts:', accountError.message)
      throw accountError
    }

    const accountIds = (accounts || []).map(a => a.id)
    console.log('[Fetch-Analytics] Found accounts:', accountIds.length)

    if (accountIds.length === 0) {
      return new Response(JSON.stringify({ 
        summary: { total: 0, sent: 0, failed: 0, successRate: 0 },
        timeline: [],
        topTriggers: []
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 4. Aggregate Data
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [summaryRes, timelineRes, triggerRes] = await Promise.all([
      // Summary Stats
      supabaseClient
        .from('instagram_message_jobs')
        .select('status, created_at')
        .in('instagram_account_id', accountIds)
        .gte('created_at', thirtyDaysAgo.toISOString()),

      // Timeline Data (for the chart)
      supabaseClient.rpc('get_daily_analytics', { 
        acc_ids: accountIds, 
        days_count: 30 
      }),

      // Top Triggers
      supabaseClient
        .from('instagram_message_jobs')
        .select('trigger_id, instagram_comment_triggers(keywords)')
        .in('instagram_account_id', accountIds)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('trigger_id', 'is', null)
    ])

    // Check for query errors
    if (summaryRes.error) throw summaryRes.error
    
    // Process Summary
    const jobs = summaryRes.data || []
    const total = jobs.length
    const sent = jobs.filter(j => j.status === 'sent').length
    const failed = total - sent
    const successRate = total > 0 ? Number(((sent / total) * 100).toFixed(1)) : 0

    // Process Timeline
    let timeline = (timelineRes.data || []).map((d: any) => ({
      date: d.date,
      count: Number(d.count) || 0
    }))

    if (timeline.length === 0) {
      const dailyMap = new Map()
      jobs.forEach(j => {
        const date = j.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
        dailyMap.set(date, (dailyMap.get(date) || 0) + 1)
      })
      timeline = Array.from(dailyMap.entries())
        .map(([date, count]) => ({ date, count: Number(count) }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    // Process Top Triggers
    const triggerMap = new Map()
    triggerRes.data?.forEach((j: any) => {
      if (!j.trigger_id) return
      const name = j.instagram_comment_triggers?.keywords?.join(', ') || 'Global Rule'
      const entry = triggerMap.get(j.trigger_id) || { name, count: 0 }
      entry.count++
      triggerMap.set(j.trigger_id, entry)
    })

    const topTriggers = Array.from(triggerMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return new Response(
      JSON.stringify({
        summary: { total, sent, failed, successRate },
        timeline,
        topTriggers
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[Fetch-Analytics] Error:', error.message)
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.details || null
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
