import { serverSupabaseServiceRole } from "#supabase/server";
import { getAuthenticatedUserId } from "~~/server/utils/auth";
import { isUuid } from "~~/server/utils/public-chatbot";

const clampInt = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const normalizeMetadata = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};

const getSessionContact = (metadata: Record<string, any>) => {
  if (metadata.instagram_username)
    return `@${String(metadata.instagram_username).replace(/^@/, "")}`;
  if (metadata.instagram_sender_id)
    return `IG ${String(metadata.instagram_sender_id).slice(-8)}`;
  if (metadata.instagram_contact_key)
    return String(metadata.instagram_contact_key);
  return "Instagram user";
};

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event);
  const accountId = getRouterParam(event, "id") || "";
  if (!isUuid(accountId))
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid Instagram account ID.",
    });

  const query = getQuery(event);
  const page = clampInt(query.page, 1, 1, 10_000);
  const perPage = clampInt(query.perPage || query.per_page, 10, 5, 50);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const supabase = serverSupabaseServiceRole(event);

  const { data: account, error: accountError } = await supabase
    .from("instagram_accounts")
    .select("id, user_id")
    .eq("id", accountId)
    .maybeSingle();

  if (accountError) throw accountError;
  if (!account || account.user_id !== userId) {
    throw createError({
      statusCode: 404,
      statusMessage: "Instagram account not found.",
    });
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("chat_sessions")
    .select("id, chatbot_id, created_at, metadata, chatbots(name)")
    .contains("metadata", { instagram_account_id: accountId })
    .order("created_at", { ascending: false })
    .limit(500);

  if (sessionsError) throw sessionsError;

  const sessionRows = sessions || [];
  const sessionIds = sessionRows
    .map((session: any) => session.id)
    .filter(Boolean);
  if (!sessionIds.length) {
    return { page, perPage, total: 0, totalPages: 1, messages: [] };
  }

  const sessionsById = new Map<string, any>();
  for (const session of sessionRows) sessionsById.set(session.id, session);

  const {
    data: messages,
    error: messagesError,
    count,
  } = await supabase
    .from("chat_messages")
    .select("id, session_id, role, content, created_at", { count: "exact" })
    .in("session_id", sessionIds)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (messagesError) throw messagesError;

  const normalizedMessages = (messages || []).map((message: any) => {
    const session = sessionsById.get(message.session_id) || {};
    const metadata = normalizeMetadata(session.metadata);
    const chatbot = Array.isArray(session.chatbots)
      ? session.chatbots[0]
      : session.chatbots;

    return {
      id: message.id,
      sessionId: message.session_id,
      role: message.role,
      content: message.content,
      createdAt: message.created_at,
      contact: getSessionContact(metadata),
      assistantName: chatbot?.name || "Assistant",
      source: metadata.source || "instagram_dm",
      botPaused: Boolean(metadata?.human_takeover?.enabled),
      lastInboundAt: metadata.last_inbound_at || null,
    };
  });

  const total = count || 0;
  return {
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    messages: normalizedMessages,
  };
});
