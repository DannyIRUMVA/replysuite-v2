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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Get current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    // 2. Fetch User's Instagram Accounts to scope analytics
    const { data: accounts } = await supabaseClient
      .from('instagram_accounts')
      .select('id')
      .eq('user_id', user.id)

    const accountIds = (accounts || []).map(a => a.id)

    if (accountIds.length === 0) {
      return new Response(JSON.stringify({ 
        summary: { total: 0, sent: 0, failed: 0, successRate: 0 },
        timeline: [],
        topTriggers: []
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Aggregate Data
    // We want: Total stats, Timeline (30 days), and Top Triggers
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [summaryRes, timelineRes, triggerRes] = await Promise.all([
      // Summary Stats
      supabaseClient
        .from('instagram_message_jobs')
        .select('status')
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
    ])

    // Process Summary
    const jobs = summaryRes.data || []
    const total = jobs.length
    const sent = jobs.filter(j => j.status === 'sent').length
    const failed = total - sent
    const successRate = total > 0 ? ((sent / total) * 100).toFixed(1) : 0

    // Process Timeline (Fallback if RPC doesn't exist yet, we aggregate manually for MVP)
    let timeline = timelineRes.data
    if (!timeline) {
      const dailyMap = new Map()
      jobs.forEach(j => {
        const date = j.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
        dailyMap.set(date, (dailyMap.get(date) || 0) + 1)
      })
      timeline = Array.from(dailyMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    // Process Top Triggers
    const triggerMap = new Map()
    triggerRes.data?.forEach(j => {
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
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
