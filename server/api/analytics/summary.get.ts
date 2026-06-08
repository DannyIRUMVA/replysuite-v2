import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const userId = user.id
  const query = getQuery(event)
  const filterBotId = typeof query.chatbotId === 'string' ? query.chatbotId : undefined
  const channelFilter = query.channel === 'whatsapp' || query.channel === 'web' || query.channel === 'instagram' ? query.channel : 'all'

  const { data: botsData } = await supabase
    .from('chatbots')
    .select('id, name')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const allBots = botsData || []
  const allBotIds = allBots.map((bot: any) => bot.id)

  if (allBotIds.length === 0) {
    return emptyResponse(allBots)
  }

  const hasValidBotFilter = Boolean(filterBotId && allBotIds.includes(filterBotId))
  const activeBotIds = hasValidBotFilter && filterBotId ? [filterBotId] : allBotIds
  const activeBots = hasValidBotFilter
    ? allBots.filter((bot: any) => bot.id === filterBotId)
    : allBots
  const botNameById = new Map(allBots.map((bot: any) => [bot.id, bot.name]))

  const { data: rawSessionsData } = await supabase
    .from('chat_sessions')
    .select('id, chatbot_id, created_at, metadata')
    .in('chatbot_id', activeBotIds)
    .order('created_at', { ascending: false })

  const rawSessions = rawSessionsData || []
  const allScopedWhatsappSessions = rawSessions.filter((session: any) => getSessionChannel(session) === 'whatsapp').length
  const allScopedInstagramSessions = rawSessions.filter((session: any) => getSessionChannel(session) === 'instagram').length
  const allScopedWebSessions = rawSessions.length - allScopedWhatsappSessions - allScopedInstagramSessions
  const sessions = channelFilter === 'all'
    ? rawSessions
    : rawSessions.filter((session: any) => getSessionChannel(session) === channelFilter)
  const sessionIds = sessions.map((session: any) => session.id)

  const [messagesRes, whatsappAccountsRes, instagramAccountsRes, dataSourcesRes, whatsappJobsRes, instagramJobsRes] = await Promise.all([
    sessionIds.length > 0
      ? supabase
        .from('chat_messages')
        .select('role, content, created_at, session_id')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),

    supabase
      .from('whatsapp_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('chatbot_id', activeBotIds),

    supabase
      .from('instagram_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),

    supabase
      .from('data_sources')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('chatbot_id', activeBotIds),

    supabase
      .from('whatsapp_message_jobs')
      .select('status, created_at')
      .in('chatbot_id', activeBotIds),

    supabase
      .from('instagram_message_jobs')
      .select('status, created_at')
      .in('chatbot_id', activeBotIds),
  ])

  const messages = messagesRes.data || []
  const messagesBySession = groupMessagesBySession(messages)

  const totalSessions = sessions.length
  const totalMessages = messages.length
  const userMessages = messages.filter((message: any) => message.role === 'user').length
  const botMessages = messages.filter((message: any) => message.role === 'assistant').length

  const allJobs = channelFilter === 'web'
    ? []
    : channelFilter === 'whatsapp'
      ? (whatsappJobsRes.data || [])
      : channelFilter === 'instagram'
        ? (instagramJobsRes.data || [])
        : [...(whatsappJobsRes.data || []), ...(instagramJobsRes.data || [])]
  const totalJobs = allJobs.length
  const sentJobs = allJobs.filter((job: any) => ['sent', 'completed', 'delivered'].includes(job.status)).length
  const failedJobs = allJobs.filter((job: any) => job.status === 'failed').length
  const successRate = totalJobs > 0 ? Math.round((sentJobs / totalJobs) * 100) : 100

  const timeline = buildTimeline(sessions, 14)

  const topAgents = activeBots
    .map((bot: any) => ({
      name: bot.name,
      id: bot.id,
      count: sessions.filter((session: any) => session.chatbot_id === bot.id).length,
    }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5)

  const filteredWhatsappSessions = sessions.filter((session: any) => getSessionChannel(session) === 'whatsapp').length
  const filteredInstagramSessions = sessions.filter((session: any) => getSessionChannel(session) === 'instagram').length
  const filteredWebSessions = totalSessions - filteredWhatsappSessions - filteredInstagramSessions

  const conversations = sessions
    .map((session: any) => {
      const sessionMessages = messagesBySession.get(session.id) || []
      const lastMessage = sessionMessages[sessionMessages.length - 1]
      const userCount = sessionMessages.filter((message: any) => message.role === 'user').length
      const botCount = sessionMessages.filter((message: any) => message.role === 'assistant').length

      return {
        id: session.id,
        chatbotId: session.chatbot_id,
        chatbotName: botNameById.get(session.chatbot_id) || 'Unknown chatbot',
        channel: getSessionChannel(session),
        createdAt: session.created_at,
        lastMessageAt: lastMessage?.created_at || session.created_at,
        messageCount: sessionMessages.length,
        userMessages: userCount,
        botMessages: botCount,
        preview: truncatePreview(lastMessage?.content || ''),
      }
    })
    .sort((a: any, b: any) => new Date(b.lastMessageAt || b.createdAt || 0).getTime() - new Date(a.lastMessageAt || a.createdAt || 0).getTime())

  return {
    summary: {
      totalSessions,
      totalMessages,
      userMessages,
      botMessages,
      totalAgents: activeBots.length,
      totalWhatsappAccounts: whatsappAccountsRes.count || 0,
      totalInstagramAccounts: instagramAccountsRes.count || 0,
      totalDataSources: dataSourcesRes.count || 0,
      sentJobs,
      failedJobs,
      successRate,
    },
    timeline,
    topAgents,
    chatbots: allBots,
    channels: channelFilter === 'all'
      ? { whatsapp: allScopedWhatsappSessions, instagram: allScopedInstagramSessions, web: allScopedWebSessions }
      : { whatsapp: filteredWhatsappSessions, instagram: filteredInstagramSessions, web: filteredWebSessions },
    conversations,
    filters: {
      chatbotId: hasValidBotFilter ? filterBotId : 'all',
      channel: channelFilter,
    },
  }
})

function getSessionChannel(session: any): 'whatsapp' | 'web' | 'instagram' {
  const channel = String(session?.metadata?.channel || session?.metadata?.type || 'web').toLowerCase()
  if (channel === 'whatsapp') return 'whatsapp'
  if (channel === 'instagram') return 'instagram'
  return 'web'
}

function groupMessagesBySession(messages: any[]) {
  const grouped = new Map<string, any[]>()
  for (const message of messages) {
    if (!message.session_id) continue
    const existing = grouped.get(message.session_id) || []
    existing.push(message)
    grouped.set(message.session_id, existing)
  }
  return grouped
}

function truncatePreview(content: string) {
  const clean = String(content || '').replace(/\s+/g, ' ').trim()
  return clean.length > 120 ? `${clean.slice(0, 120)}…` : clean
}

function buildTimeline(sessions: any[], days: number) {
  const result: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const count = sessions.filter((session) => session.created_at && session.created_at.startsWith(dateStr)).length
    result.push({ date: dateStr, count })
  }
  return result
}

function emptyResponse(bots: any[]) {
  return {
    summary: {
      totalSessions: 0,
      totalMessages: 0,
      userMessages: 0,
      botMessages: 0,
      totalAgents: bots.length,
      totalWhatsappAccounts: 0,
      totalInstagramAccounts: 0,
      totalDataSources: 0,
      sentJobs: 0,
      failedJobs: 0,
      successRate: 100,
    },
    timeline: buildTimeline([], 14),
    topAgents: bots.map((bot: any) => ({ name: bot.name, id: bot.id, count: 0 })),
    chatbots: bots,
    channels: { whatsapp: 0, instagram: 0, web: 0 },
    conversations: [],
    filters: { chatbotId: 'all', channel: 'all' },
  }
}
