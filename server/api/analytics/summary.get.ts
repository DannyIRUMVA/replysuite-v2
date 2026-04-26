import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // ── Auth ─────────────────────────────────────────────────
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const userId = user.id

  // Optional chatbot filter from query string
  const query = getQuery(event)
  const filterBotId = query.chatbotId as string | undefined

  // ── Step 1: get user's chatbot IDs ───────────────────────
  const { data: botsData } = await supabase
    .from('chatbots')
    .select('id, name')
    .eq('user_id', userId)
    .is('deleted_at', null)

  const allBots = botsData || []
  const allBotIds = allBots.map((b: any) => b.id)

  if (allBotIds.length === 0) {
    return emptyResponse(allBots)
  }

  // If user selected a specific bot, scope to that; otherwise all bots
  const activeBotIds = filterBotId && allBotIds.includes(filterBotId)
    ? [filterBotId]
    : allBotIds

  // ── Step 2: get session IDs for active bots ──────────────
  const { data: sessionsData } = await supabase
    .from('chat_sessions')
    .select('id, chatbot_id, created_at, metadata')
    .in('chatbot_id', activeBotIds)

  const sessions = sessionsData || []
  const sessionIds = sessions.map((s: any) => s.id)

  // ── Step 3: parallel fetches ─────────────────────────────
  const [
    messagesRes,
    whatsappAccountsRes,
    dataSourcesRes,
    whatsappJobsRes,
  ] = await Promise.all([
    sessionIds.length > 0
      ? supabase.from('chat_messages').select('role, created_at, session_id').in('session_id', sessionIds)
      : Promise.resolve({ data: [] }),

    supabase.from('whatsapp_accounts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('data_sources').select('id', { count: 'exact', head: true }).eq('user_id', userId),

    supabase.from('whatsapp_message_jobs').select('status, created_at').in('chatbot_id', activeBotIds),
  ])

  const messages = messagesRes.data || []

  // ── Step 4: compute metrics ──────────────────────────────
  const totalSessions = sessions.length
  const totalMessages = messages.length
  const userMessages = messages.filter((m: any) => m.role === 'user').length
  const botMessages = messages.filter((m: any) => m.role === 'assistant').length

  const allJobs = [
    ...(whatsappJobsRes.data || []).map((j: any) => ({ ...j, channel: 'whatsapp' })),
  ]
  const totalJobs = allJobs.length
  const sentJobs = allJobs.filter((j: any) => ['sent', 'completed', 'delivered'].includes(j.status)).length
  const failedJobs = allJobs.filter((j: any) => j.status === 'failed').length
  const successRate = totalJobs > 0 ? Math.round((sentJobs / totalJobs) * 100) : 100


  // ── Step 5: timeline (14 days) ───────────────────────────
  const timeline = buildTimeline(sessions, 14)

  // ── Step 6: top agents by session count ──────────────────
  const topAgents = allBots
    .map((bot: any) => ({
      name: bot.name,
      id: bot.id,
      count: sessions.filter((s: any) => s.chatbot_id === bot.id).length,
    }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5)

  // ── Step 7: channel breakdown ─────────────────────────────
  const whatsappSessions = sessions.filter((s: any) => s.metadata?.type === 'whatsapp').length
  const webSessions = totalSessions - whatsappSessions

  return {
    summary: {
      totalSessions,
      totalMessages,
      userMessages,
      botMessages,
      totalAgents: allBots.length,
      totalWhatsappAccounts: whatsappAccountsRes.count || 0,
      totalDataSources: dataSourcesRes.count || 0,
      sentJobs,
      failedJobs,
      successRate,
    },
    timeline,
    topAgents,
    chatbots: allBots,
    channels: {
      whatsapp: whatsappSessions,
      web: webSessions,
    },
  }
})

// ── Helpers ───────────────────────────────────────────────────
function buildTimeline(sessions: any[], days: number) {
  const result: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const count = sessions.filter(s => s.created_at && s.created_at.startsWith(dateStr)).length
    result.push({ date: dateStr, count })
  }
  return result
}

function emptyResponse(bots: any[]) {
  return {
    summary: {
      totalSessions: 0, totalMessages: 0, userMessages: 0, botMessages: 0,
      totalAgents: bots.length, totalWhatsappAccounts: 0,
      totalDataSources: 0, sentJobs: 0, failedJobs: 0, successRate: 100,
    },
    timeline: buildTimeline([], 14),
    topAgents: bots.map((b: any) => ({ name: b.name, id: b.id, count: 0 })),
    chatbots: bots,
    channels: { whatsapp: 0, web: 0 },
  }
}
