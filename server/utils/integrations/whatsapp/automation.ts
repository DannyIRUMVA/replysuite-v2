import { searchKnowledge, getLowIntentDirectReply } from "../../ai";
import { runAgentCycle } from "../../agent/engine";
import { buildAssistantSkillsPrompt } from "../../agent/skills";
import { buildChatbotLanguagePolicy } from "../../language-policy";
import {
  buildConversationSettingsPrompt,
  buildConversationStatePrompt,
  getConversationStateFromMetadata,
  mergeMetadataWithState,
  normalizeConversationSettings,
  updateConversationState,
} from "../../conversation-intelligence";
import {
  safeLoadContactMemory,
  safeUpsertContactMemory,
} from "../../contact-memory";
import {
  storeWhatsappImageWithMediaWorker,
  toCustomerSafeMediaContext,
} from "./media";

const normalizeWhatsappMessageIds = (metadata: any) => {
  const ids = metadata?.whatsapp_message_ids;
  return Array.isArray(ids) ? ids.filter(Boolean).map(String) : [];
};

const mergeWhatsappSessionMetadata = (
  metadata: any,
  updates: Record<string, any>,
) => ({
  ...(metadata || {}),
  type: "whatsapp",
  channel: "whatsapp",
  ...updates,
});

const parseCatalogSkuMeta = (product: any) => {
  try {
    return product?.sku ? JSON.parse(product.sku) : {};
  } catch {
    return {};
  }
};

const catalogProductIsPaid = (product: any) => {
  const meta = parseCatalogSkuMeta(product);
  if (typeof meta?.is_paid === "boolean") return meta.is_paid;
  return Number(product?.price || 0) > 0;
};

const catalogProductPriceLabel = (product: any) => {
  if (!catalogProductIsPaid(product)) return "Free";
  return `${Number(product?.price || 0).toLocaleString("en-US")} ${product?.currency || "RWF"}`;
};

const catalogProductSalesNotes = (product: any) =>
  String(parseCatalogSkuMeta(product)?.sales_notes || "");
const normalizePhoneForPaypack = (phone: string) =>
  String(phone || "")
    .trim()
    .replace("+250", "0")
    .replace(/^250/, "0");
const makeShortCode = (length = 8) => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
};
const getPublicSiteUrl = () => {
  const config = useRuntimeConfig();
  const candidate = String(
    process.env.REPLYSUITE_DELIVERY_SITE_URL ||
      (config as any).public?.siteUrl ||
      process.env.NUXT_PUBLIC_SITE_URL ||
      "https://replysuite.app",
  ).replace(/\/+$/, "");
  if (
    !candidate ||
    /localhost|127\.0\.0\.1|\.ngrok-free\.app|\.ngrok\.io/i.test(candidate)
  ) {
    return "https://replysuite.app";
  }
  return candidate;
};
const ensureWhatsappBusinessDeliveryLinks = async (
  supabase: any,
  chatbotId: string,
  orderId: string,
) => {
  const { data: existing } = await supabase
    .from("business_delivery_links")
    .select("short_code")
    .eq("chatbot_id", chatbotId)
    .eq("order_id", orderId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (existing?.length) return existing;

  const { data: order } = await supabase
    .from("business_orders")
    .select("id, customer_phone, payment_status")
    .eq("id", orderId)
    .eq("chatbot_id", chatbotId)
    .maybeSingle();
  if (!order || order.payment_status !== "paid") return [];

  const { data: items } = await supabase
    .from("business_order_items")
    .select("product_id, metadata")
    .eq("order_id", orderId);
  const rows = (items || [])
    .map((item: any) => ({
      chatbot_id: chatbotId,
      order_id: orderId,
      product_id: item.product_id || null,
      customer_phone: order.customer_phone || null,
      short_code: makeShortCode(8),
      file_key: String(item.metadata?.file_key || "").replace(/^\/+/, ""),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      max_downloads: 3,
      status: "active",
    }))
    .filter((row: any) => row.file_key);
  if (!rows.length) return [];
  const { data: created } = await supabase
    .from("business_delivery_links")
    .insert(rows)
    .select("short_code");
  return created || [];
};
const catalogProductDeliveryReady = (product: any) => {
  const meta = parseCatalogSkuMeta(product) || {};
  return Boolean(
    meta.delivery_url ||
    meta.file_key ||
    meta.r2_key ||
    product?.delivery_url ||
    product?.file_key,
  );
};

const buildDigitalProductSalesPrompt = (products: any[], toolsConfig: any) => {
  if (!products.length) return "";
  const businessFlow = toolsConfig?.business_flow || {};
  const productLines = products
    .map((product: any, index: number) => {
      const notes = catalogProductSalesNotes(product);
      return `${index + 1}. ${product.name}
   - Price: ${catalogProductPriceLabel(product)}
   - Description: ${product.description || "Digital product"}
   - Delivery link: ${catalogProductDeliveryReady(product) ? "ready; only share after confirmed payment for paid products" : "not configured"}
   - Sales notes: ${notes || "Explain benefits clearly and sell naturally."}`;
    })
    .join("\n");

  return `
[DIGITAL PRODUCT SALES MODE]
You are selling connected digital products for this WhatsApp assistant. Treat this as your primary job.
Business flow: ${businessFlow?.name || "Digital product sales"}
Business description: ${businessFlow?.description || "Sell the connected digital product and deliver after payment."}

Connected products:
${productLines}

Strict behavior rules:
1. Only talk about the connected product(s), their benefits, price, payment, order, and delivery. If the customer asks about unrelated topics, politely redirect to the product.
2. Never say you do not have product information when a connected product is listed above.
3. When the customer asks about buying, price, payment, or says they want it, clearly state the exact product and price, then use get_business_products and create_business_order.
4. For paid products, use request_business_payment only after/with a valid business order. Do not invent another amount.
5. After payment checks as paid with check_business_payment, send only the short protected /d delivery link. Never send the raw file URL.
6. Keep WhatsApp replies short, warm, sales-focused, and Kinyarwanda-first when the customer writes Kinyarwanda.
7. Good default pitch: explain that The Art of Prompting is a practical bilingual English + Kinyarwanda PDF for learning better AI/ChatGPT prompts for business, school, content creation, and customer support.
`;
};

const buildRecentCommercePrompt = (
  orders: any[],
  paymentsByTarget: Record<string, any[]>,
) => {
  if (!orders.length) return "";
  const lines = orders
    .map((order: any, index: number) => {
      const payments = paymentsByTarget[order.id] || [];
      const paymentLines = payments.length
        ? payments
            .map(
              (payment: any) =>
                `payment_id=${payment.id}, status=${payment.status}, amount=${payment.amount} ${payment.currency || "RWF"}, phone=${payment.phone || "unknown"}`,
            )
            .join("; ")
        : "no payment request yet";
      return `${index + 1}. order_id=${order.id}, status=${order.status}, payment_status=${order.payment_status}, total=${Number(order.total_amount || 0).toLocaleString("en-US")} ${order.currency || "RWF"}, phone=${order.customer_phone || "not captured"}, payments: ${paymentLines}`;
    })
    .join("\n");

  return `
[RECENT COMMERCE STATE]
Use these existing order/payment records before creating anything new:
${lines}

Commerce continuity rules:
1. If the customer sends a phone number and there is an existing unpaid/pending order with no payment yet, request payment for that existing order. Do not create another order.
2. If the customer says they paid, says "narishyuye", asks for the link, or asks about payment status, check the existing payment/order status. Do not create a new order and do not request a second payment.
3. If a payment is still pending, tell the customer payment is still pending and ask them to confirm on the phone, then check again later.
4. Only deliver the paid product link when an existing payment/order is confirmed paid.
`;
};

const buildSchoolTutorPrompt = (toolsConfig: any, activeSession: any) => {
  const school = toolsConfig?.school_flow || {};
  const price = Number(school.price || 1000).toLocaleString("en-US");
  const currency = school.currency || "RWF";
  const duration = Number(school.duration_minutes || 30);
  const defaultQuestions = Number(school.default_question_count || 10);
  const quizMode = school.quiz_delivery_mode || "let_student_choose";
  const activeLine = activeSession
    ? `Active paid school session: status=${activeSession.status}, expires_at=${activeSession.expires_at || "unknown"}.`
    : "No active paid school session is confirmed in this prompt.";

  return `
[SCHOOL AI TUTOR MODE]
You are a paid school AI tutor. All learning stays inside this chat; never send an external school session link.
${activeLine}
Default plan: ${duration} minutes for ${price} ${currency}.
Quiz defaults: ${defaultQuestions} questions, delivery mode=${quizMode}.

School tutor rules:
1. If there is no active paid session, explain the tutor session price/duration and ask for MTN/Airtel number to pay. Use list_school_tutor_plans, create_school_tutor_session, request_school_tutor_payment, then check_school_tutor_payment.
2. Time starts when payment is confirmed. If time expires, stop tutoring and ask the student to pay for another session to continue.
3. During an active paid session, answer questions using the trained school content and continue naturally in chat.
4. Quiz mode supports one_by_one and all_at_once. If the student wants all questions, give numbered questions and wait for all numbered answers before marking.
5. After answers, mark, give score, correct answers, and improvements. Keep Kinyarwanda-first when the student writes Kinyarwanda.
6. Do not expose internal IDs, database names, payment providers, or backend details.
`;
};

const buildProductOnlyGreeting = (
  products: any[],
  activeLanguageName: string | null,
  defaultLanguage: string | null,
) => {
  const product = products[0];
  if (!product) return "";
  const isKinyarwandaFirst = String(activeLanguageName || defaultLanguage || "")
    .toLowerCase()
    .includes("kinyarwanda");
  if (isKinyarwandaFirst) {
    return `Muraho! Mfasha kugurisha *${product.name}* — PDF iri mu Cyongereza n’Ikinyarwanda. Igiciro ni *${catalogProductPriceLabel(product)}*.\n\nIyi guide igufasha kwandika prompts nziza za AI/ChatGPT. Wifuza kuyigura?`;
  }
  return `Hi! I help sell *${product.name}*, a bilingual English + Kinyarwanda PDF. Price: *${catalogProductPriceLabel(product)}*.\n\nIt helps you write better AI/ChatGPT prompts. Would you like to buy it?`;
};

export const processWhatsappMessage = async (
  supabase: any,
  messageData: any,
) => {
  const {
    phone_number_id,
    from_number,
    text,
    customer_name,
    message_id,
    media,
  } = messageData;
  let chatSession: any = null;
  let sessionMetadata: any = null;
  let inboundAlreadyRecorded = false;
  let inboundRecorded = false;
  let storedMediaAsset: any = null;

  console.log(
    `\n🚀 [WhatsApp Automation] START: Processing message from ${customer_name} (${from_number})`,
  );
  console.log(`   📝 Text: "${text}"`);

  // 1. Get WhatsApp Account
  const { data: waAccount } = await supabase
    .from("whatsapp_accounts")
    .select("*")
    .eq("phone_number_id", phone_number_id)
    .single();

  if (!waAccount) {
    console.error(
      `❌ [WhatsApp Auth] ERROR: Account not found for phone_number_id: ${phone_number_id}`,
    );
    return;
  }

  if (!waAccount.chatbot_id) {
    console.error(
      `❌ [WhatsApp Auth] WARNING: No chatbot assigned to WA number ${waAccount.phone_number}`,
    );
    return;
  }

  // Ensure node is active/deployed
  if (waAccount.status !== "active" && waAccount.status !== "deployed") {
    console.warn(
      `⚠️ [WhatsApp Auth] SKIPPING: Account ${waAccount.phone_number} is currently ${waAccount.status}`,
    );
    return;
  }
  console.log(
    `   ✅ Account Found: ${waAccount.phone_number} (Status: ${waAccount.status})`,
  );

  // Persist inbound WhatsApp messages before AI generation so conversations are not lost
  // when plan limits, provider errors, or Meta retries interrupt the reply path.
  try {
    const { data: existingSessions } = await supabase
      .from("chat_sessions")
      .select("id, metadata")
      .eq("chatbot_id", waAccount.chatbot_id)
      .contains("metadata", { phone: from_number })
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingSessions && existingSessions.length > 0) {
      chatSession = existingSessions[0];
      sessionMetadata = chatSession.metadata || {};
    } else {
      const initialMetadata = mergeWhatsappSessionMetadata(null, {
        phone: from_number,
        username: customer_name,
        whatsapp_phone_number_id: phone_number_id,
        whatsapp_message_ids: [],
      });

      const { data: newSession, error: sessErr } = await supabase
        .from("chat_sessions")
        .insert({ chatbot_id: waAccount.chatbot_id, metadata: initialMetadata })
        .select("id, metadata")
        .single();

      if (sessErr) throw sessErr;
      chatSession = newSession;
      sessionMetadata = newSession?.metadata || initialMetadata;
    }

    const recordedMessageIds = normalizeWhatsappMessageIds(sessionMetadata);
    inboundAlreadyRecorded =
      !!message_id && recordedMessageIds.includes(String(message_id));

    if (inboundAlreadyRecorded) {
      console.warn(
        `⚠️ [WhatsApp Automation] Duplicate inbound message skipped: ${message_id}`,
      );
      return;
    }

    const { error: inboundErr } = await supabase
      .from("chat_messages")
      .insert({ session_id: chatSession.id, role: "user", content: text });

    if (inboundErr) throw inboundErr;
    inboundRecorded = true;

    const nextMessageIds = message_id
      ? [...recordedMessageIds, String(message_id)].slice(-50)
      : recordedMessageIds;

    sessionMetadata = mergeWhatsappSessionMetadata(sessionMetadata, {
      phone: from_number,
      username: customer_name,
      whatsapp_phone_number_id: phone_number_id,
      last_inbound_at: new Date().toISOString(),
      last_inbound_text: text,
      whatsapp_message_ids: nextMessageIds,
    });

    if (media?.id && waAccount?.access_token) {
      try {
        storedMediaAsset = await storeWhatsappImageWithMediaWorker({
          event: (messageData as any)._event,
          accessToken: waAccount.access_token,
          chatbotId: waAccount.chatbot_id,
          sessionId: chatSession.id,
          messageId: message_id,
          media,
        });
      } catch (mediaErr: any) {
        console.warn(
          "[WhatsApp Media] Failed to store inbound media:",
          mediaErr?.message || mediaErr,
        );
      }
    }

    if (storedMediaAsset) {
      const mediaAssets = Array.isArray(sessionMetadata.media_assets)
        ? sessionMetadata.media_assets
        : [];
      sessionMetadata = mergeWhatsappSessionMetadata(sessionMetadata, {
        media_assets: [
          ...mediaAssets,
          {
            type: storedMediaAsset.type,
            url: storedMediaAsset.url,
            mime_type: storedMediaAsset.mimeType,
            caption: storedMediaAsset.caption,
            size: storedMediaAsset.size,
            usage_hint: storedMediaAsset.usageHint,
            created_at: new Date().toISOString(),
          },
        ].slice(-20),
        last_media_asset: {
          type: storedMediaAsset.type,
          url: storedMediaAsset.url,
          mime_type: storedMediaAsset.mimeType,
          caption: storedMediaAsset.caption,
          usage_hint: storedMediaAsset.usageHint,
        },
      });
    }

    await supabase
      .from("chat_sessions")
      .update({ metadata: sessionMetadata })
      .eq("id", chatSession.id);

    console.log(
      `   ✅ Inbound WhatsApp message recorded in Session: ${chatSession.id}`,
    );
  } catch (err) {
    console.error("❌ [WhatsApp Debug] Failed to record inbound message:", err);
  }

  if (sessionMetadata?.human_takeover?.enabled) {
    console.log(
      `   ⏸️ [WhatsApp Automation] Human takeover active for Session: ${chatSession?.id}. AI reply skipped.`,
    );
    return;
  }

  // 2. Check User Plan & Limits
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, user_memberships(plans(*))")
    .eq("id", waAccount.user_id)
    .single();

  const plan = profile?.user_memberships?.[0]?.plans || {
    name: "None",
    max_replies_per_month: 0,
    has_auto_comment: false,
  };

  // Count current assistant replies this month across the user's chatbots.
  // This keeps WhatsApp and website replies on one consistent usage source of truth.
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { data: userChatbots } = await supabase
    .from("chatbots")
    .select("id")
    .eq("user_id", waAccount.user_id)
    .is("deleted_at", null);

  const userChatbotIds = (userChatbots || []).map((bot: any) => bot.id);

  let replyCount = 0;
  if (userChatbotIds.length > 0) {
    const { count } = await supabase
      .from("chat_messages")
      .select("id, chat_sessions!inner(chatbot_id)", {
        count: "exact",
        head: true,
      })
      .in("chat_sessions.chatbot_id", userChatbotIds)
      .eq("role", "assistant")
      .gte("created_at", startOfMonth.toISOString());

    replyCount = count || 0;
  }

  if (
    plan.max_replies_per_month !== -1 &&
    replyCount >= (plan.max_replies_per_month || 0)
  ) {
    console.warn(
      `⚠️ [WhatsApp Automation] LIMIT REACHED: ${replyCount}/${plan.max_replies_per_month} replies used this month.`,
    );
    return;
  }
  console.log(
    `   📊 Plan Check: ${plan.name} (${replyCount}/${plan.max_replies_per_month === -1 ? "∞" : plan.max_replies_per_month})`,
  );

  // 3. RAG / Data Retrieval Pipeline
  let contextText = "";
  let baseInstructions = "";
  let conversationSettings = normalizeConversationSettings(null);
  let chatbotDefaultLanguage: string | null = null;
  let chatbotIdentity: any = null;
  let activeLanguageName: string | null = null;

  console.log(
    `   🧠 Initiating AI Pipeline for chatbot: ${waAccount.chatbot_id}`,
  );
  try {
    const { data: chatbot } = await supabase
      .from("chatbots")
      .select("*")
      .eq("id", waAccount.chatbot_id)
      .single();

    chatbotIdentity = chatbot;
    baseInstructions =
      chatbot?.system_prompt ||
      `You are a helpful AI assistant connected over WhatsApp.`;
    conversationSettings = normalizeConversationSettings(
      chatbot?.tools_config?.conversation_settings,
    );
    chatbotDefaultLanguage = chatbot?.default_language || null;

    // RAG Search
    const contextResults = await searchKnowledge(
      supabase,
      waAccount.chatbot_id,
      text,
      6,
    );
    if (contextResults && contextResults.length > 0) {
      console.log(`   📚 Context Retrieved: ${contextResults.length} chunks`);
      contextText = contextResults
        .map((r: any, index: number) => {
          const sourceLabel =
            [r.title, r.url].filter(Boolean).join(" · ") ||
            r.sourceType ||
            "Knowledge Source";
          return `[Source ${index + 1}: ${sourceLabel}]\n${r.content}`;
        })
        .join("\n\n---\n\n");
    }
  } catch (err) {
    console.error("❌ [WhatsApp AI Error] RAG Retrieval Failed:", err);
  }

  // 4. Generate AI Reply (Agentic Loop)
  const conversationBehavior = buildConversationSettingsPrompt(
    conversationSettings,
    "whatsapp",
  );

  let contactMemory: any = null;

  const systemPromptBase = `
    ${baseInstructions}

    [CONVERSATION BEHAVIOR]
    ${conversationBehavior}
  `;

  let replyText = "";
  try {
    const { data: chatbot } = await supabase
      .from("chatbots")
      .select("enabled_tools, tools_config")
      .eq("id", waAccount.chatbot_id)
      .single();

    const { data: catalogProducts } = await supabase
      .from("chatbot_catalog")
      .select(
        "id, name, description, category, price, currency, sku, is_available",
      )
      .eq("chatbot_id", waAccount.chatbot_id)
      .eq("is_available", true)
      .order("created_at", { ascending: false });

    const connectedProducts = catalogProducts || [];
    const enabledTools = Array.isArray(chatbot?.enabled_tools)
      ? chatbot.enabled_tools.map((tool: any) => String(tool))
      : [];
    const schoolTutorMode = Boolean(
      chatbot?.tools_config?.school_flow?.enabled ||
      chatbot?.tools_config?.school_flow?.paid_session_enabled ||
      enabledTools.some((tool: string) =>
        ["school", "tutor", "school_tutor"].includes(tool),
      ),
    );
    let activeSchoolSession: any = null;
    let expiredSchoolSession: any = null;

    const productSalesMode = Boolean(
      connectedProducts.length > 0 &&
      (chatbot?.tools_config?.business_flow?.product_delivery_enabled ||
        chatbot?.tools_config?.products?.enabled ||
        chatbot?.tools_config?.product_delivery?.enabled ||
        enabledTools.some((tool: string) =>
          ["products", "catalog", "product_delivery"].includes(tool),
        )),
    );

    // Find existing session to get history
    let messagesHistory: any[] = [];

    const { data: existingSessions } = await supabase
      .from("chat_sessions")
      .select("id, metadata")
      .eq("chatbot_id", waAccount.chatbot_id)
      .contains("metadata", { phone: from_number })
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingSessions && existingSessions.length > 0) {
      chatSession = existingSessions[0];
      sessionMetadata = chatSession.metadata || null;

      const { data: history } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("session_id", chatSession.id)
        .order("created_at", { ascending: true })
        .limit(20);

      if (history && history.length > 0) {
        messagesHistory = history.map((msg) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        }));
      }
    }

    if (conversationSettings.contactMemoryEnabled) {
      contactMemory = await safeLoadContactMemory(
        supabase,
        waAccount.chatbot_id,
        "whatsapp",
        from_number,
      );
    }

    const sessionState = conversationSettings.sessionMemoryEnabled
      ? getConversationStateFromMetadata(sessionMetadata)
      : {};

    if (schoolTutorMode && chatSession?.id) {
      try {
        const { data: schoolSessions } = await supabase
          .from("school_tutor_sessions")
          .select(
            "id, status, payment_status, started_at, expires_at, duration_minutes, student_phone, metadata, created_at",
          )
          .eq("chatbot_id", waAccount.chatbot_id)
          .eq("chat_session_id", chatSession.id)
          .in("status", ["active", "pending_payment"])
          .order("created_at", { ascending: false })
          .limit(3);
        const latestActive = (schoolSessions || []).find(
          (session: any) => session.status === "active",
        );
        if (
          latestActive?.expires_at &&
          new Date(latestActive.expires_at).getTime() <= Date.now()
        ) {
          expiredSchoolSession = latestActive;
          await supabase
            .from("school_tutor_sessions")
            .update({
              status: "expired",
              completed_at: new Date().toISOString(),
            })
            .eq("id", latestActive.id);
        } else if (latestActive) {
          activeSchoolSession = latestActive;
        }
      } catch (err: any) {
        console.warn(
          "[WhatsApp School] Failed to load tutor session state:",
          err?.message || err,
        );
      }
    }

    let recentCommercePrompt = "";
    let recentOrders: any[] = [];
    let paymentsByTarget: Record<string, any[]> = {};
    if ((productSalesMode || connectedProducts.length > 0) && chatSession?.id) {
      try {
        const phoneVariants = Array.from(
          new Set(
            [
              from_number,
              normalizePhoneForPaypack(from_number),
              from_number?.startsWith("250")
                ? `0${String(from_number).slice(3)}`
                : null,
              from_number?.startsWith("0")
                ? `250${String(from_number).slice(1)}`
                : null,
            ]
              .filter(Boolean)
              .map(String),
          ),
        );

        const [sessionOrdersResult, phoneOrdersResult] = await Promise.all([
          supabase
            .from("business_orders")
            .select(
              "id, chat_session_id, customer_phone, total_amount, currency, status, payment_status, metadata, created_at",
            )
            .eq("chatbot_id", waAccount.chatbot_id)
            .eq("chat_session_id", chatSession.id)
            .order("created_at", { ascending: false })
            .limit(5),
          phoneVariants.length
            ? supabase
                .from("business_orders")
                .select(
                  "id, chat_session_id, customer_phone, total_amount, currency, status, payment_status, metadata, created_at",
                )
                .eq("chatbot_id", waAccount.chatbot_id)
                .in("customer_phone", phoneVariants)
                .order("created_at", { ascending: false })
                .limit(5)
            : Promise.resolve({ data: [] }),
        ]);

        const orderMap = new Map<string, any>();
        for (const order of [
          ...(sessionOrdersResult.data || []),
          ...(phoneOrdersResult.data || []),
        ]) {
          orderMap.set(order.id, order);
        }
        recentOrders = Array.from(orderMap.values()).slice(0, 5);
        const orderIds = recentOrders.map((order: any) => order.id);
        if (orderIds.length) {
          const { data: payments } = await supabase
            .from("business_payments")
            .select(
              "id, order_id, amount, currency, customer_phone, status, created_at",
            )
            .eq("chatbot_id", waAccount.chatbot_id)
            .in("order_id", orderIds)
            .order("created_at", { ascending: false });
          paymentsByTarget = (payments || []).reduce(
            (acc: Record<string, any[]>, payment: any) => {
              const targetId = payment.order_id || payment.target_id;
              acc[targetId] ||= [];
              acc[targetId].push({
                ...payment,
                target_id: targetId,
                phone: payment.customer_phone || payment.phone,
              });
              return acc;
            },
            {},
          );
        }
        recentCommercePrompt = buildRecentCommercePrompt(
          recentOrders,
          paymentsByTarget,
        );
      } catch (err: any) {
        console.warn(
          "[WhatsApp Commerce] Failed to load recent order/payment context:",
          err?.message || err,
        );
      }
    }

    const languagePolicy = await buildChatbotLanguagePolicy({
      supabase,
      chatbot: chatbotIdentity || {
        id: waAccount.chatbot_id,
        default_language: chatbotDefaultLanguage,
      },
      userMessage: text,
      sessionPreferredLanguage:
        sessionState.preferredLanguage ||
        contactMemory?.memory?.preferredLanguage ||
        null,
    });
    activeLanguageName = languagePolicy.activeLanguage.name;

    const systemPrompt = `${systemPromptBase}

[LANGUAGE POLICY]
${languagePolicy.prompt}

[SESSION STATE]
${buildConversationStatePrompt(sessionState, contactMemory)}

[ASSIGNED ASSISTANT SKILLS]
${buildAssistantSkillsPrompt((chatbot as any)?.tools_config)}

${productSalesMode ? buildDigitalProductSalesPrompt(connectedProducts, (chatbot as any)?.tools_config) : ""}

${schoolTutorMode ? buildSchoolTutorPrompt((chatbot as any)?.tools_config, activeSchoolSession) : ""}

${recentCommercePrompt}

[ADDITIONAL CONTEXT FROM KNOWLEDGE BASE]
${productSalesMode ? "Use knowledge only when it supports the connected product sale. Do not drift away from the connected product.\n\n" : ""}${contextText || "No specific background knowledge found for this query."}

[WHATSAPP MEDIA CONTEXT]
${storedMediaAsset ? toCustomerSafeMediaContext(storedMediaAsset) : "No stored customer image is attached to this turn."}

IMPORTANT INSTRUCTIONS:
1. Format specifically for WhatsApp. You can use standard formatting like *bold* or _italics_ natively.
2. Do not include markdown headers (#) or markdown horizontal lines (---).
3. Prioritize [ADDITIONAL CONTEXT] for factual accuracy over base instructions.`;

    // Use the persisted inbound message for context. If recording failed, still include
    // the current text so the assistant can answer.
    const latestUserMessage = [...messagesHistory]
      .reverse()
      .find((msg: any) => msg.role === "user");
    if (!latestUserMessage || latestUserMessage.content !== text) {
      messagesHistory.push({ role: "user", content: text });
    }

    const normalizedLowIntentText = String(text || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const isKinyarwandaFirst = String(
      activeLanguageName || chatbotDefaultLanguage || "",
    )
      .toLowerCase()
      .includes("kinyarwanda");
    const directSchoolExpiryReply =
      schoolTutorMode && expiredSchoolSession
        ? `Igihe cya session yawe yo kwiga cyarangiye. Kugira ukomeze kwiga, wakwishyura indi session ya tutor. Ohereza nimero ya *MTN/Airtel* ukoresha, woherezwe payment.`
        : "";
    const englishLowIntentReply = getLowIntentDirectReply(
      text,
      Boolean(sessionState.greeted),
    );
    const kinyarwandaLowIntentReply =
      isKinyarwandaFirst &&
      (/^(muraho|amakuru|amakuru yanyu|bite|mwaramutse|mwiriwe|hi|hello|hey|good morning|good afternoon|good evening)$/.test(
        normalizedLowIntentText,
      ) ||
        englishLowIntentReply)
        ? /^(thanks|thank you|thx)$/.test(normalizedLowIntentText)
          ? "Murakoze — hari ikindi nabafasha?"
          : /^(ok|okay|okey|k|cool|great|nice|yes|yeah|yep|sure)$/.test(
                normalizedLowIntentText,
              )
            ? "Yego — ni iki kindi nabafasha?"
            : sessionState.greeted
              ? "Nafasha nte uyu munsi?"
              : "Muraho! Nafasha nte uyu munsi?"
        : null;
    const directLowIntentReply = schoolTutorMode
      ? ""
      : productSalesMode && (kinyarwandaLowIntentReply || englishLowIntentReply)
        ? buildProductOnlyGreeting(
            connectedProducts,
            activeLanguageName,
            chatbotDefaultLanguage,
          )
        : kinyarwandaLowIntentReply || englishLowIntentReply;

    const recentCommercePayments = recentOrders
      .flatMap((order: any) =>
        (paymentsByTarget[order.id] || []).map((payment: any) => ({
          ...payment,
          order,
        })),
      )
      .sort(
        (a: any, b: any) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime(),
      );
    const paymentCheckIntent =
      (productSalesMode || connectedProducts.length > 0) &&
      /\b(narishyuye|narishuye|nishyuye|nishyuyeho|paid|payee|payment|kwishyura|kwishura|link|pdf)\b/.test(
        normalizedLowIntentText,
      ) &&
      (recentCommercePayments.length > 0 || recentOrders.length > 0);
    let directCommerceReply = "";
    if (paymentCheckIntent) {
      const latestPayment = recentCommercePayments[0];
      if (latestPayment) {
        const status = String(latestPayment.status || "pending").toLowerCase();
        if (status === "paid") {
          await supabase
            .from("business_orders")
            .update({ payment_status: "paid", status: "completed" })
            .eq("id", latestPayment.order.id)
            .eq("chatbot_id", waAccount.chatbot_id);
          const deliveryLinks = await ensureWhatsappBusinessDeliveryLinks(
            supabase,
            waAccount.chatbot_id,
            latestPayment.order.id,
          );
          const linksText = deliveryLinks
            .map((link: any) => `${getPublicSiteUrl()}/d/${link.short_code}`)
            .join("\n");
          directCommerceReply = linksText
            ? `Murakoze kwishyura *${Number(latestPayment.amount || 0).toLocaleString("en-US")} ${latestPayment.currency || "RWF"}*. Dore link ya PDF:\n\n${linksText}`
            : "Murakoze kwishyura. Payment yemejwe, ariko link ya PDF ntibashije kuyibona muri system. Tugiye kugufasha.";
        } else {
          directCommerceReply = `Ndacyareba ubwishyu bwa *${Number(latestPayment.amount || 0).toLocaleString("en-US")} ${latestPayment.currency || "RWF"}* kuri *${latestPayment.phone || "nimero watanze"}*, buracyagaragara nka *${status || "pending"}*.\n\nNyamuneka banza wemeze ubutumwa kuri telefoni yawe, hanyuma wongere umbwire ngo *narishyuye*.`;
        }
      } else {
        const latestOrder = recentOrders[0];
        directCommerceReply = latestOrder?.customer_phone
          ? `Commande ya *The Art of Prompting PDF* irahari ku *${Number(latestOrder.total_amount || 0).toLocaleString("en-US")} ${latestOrder.currency || "RWF"}*, ariko nta payment request ndabona. Ongera umpe nimero ya MTN/Airtel dukoreshe.`
          : "Commande ya *The Art of Prompting PDF* irahari. Nyamuneka ohereza nimero ya MTN/Airtel ukoresha kugira woherezwe payment ya *1,000 RWF*.";
      }
    }

    if (directCommerceReply) {
      replyText = directCommerceReply;
    } else if (directSchoolExpiryReply) {
      replyText = directSchoolExpiryReply;
    } else if (directLowIntentReply) {
      replyText = directLowIntentReply;
    } else {
      replyText = await runAgentCycle(messagesHistory, {
        systemPrompt,
        chatbotId: waAccount.chatbot_id,
        enabledTools: Array.from(
          new Set([
            ...(chatbot?.enabled_tools || []),
            ...(productSalesMode ? ["products", "payments"] : []),
            ...(schoolTutorMode ? ["school", "tutor", "payments"] : []),
          ]),
        ),
        event: (messageData as any)._event,
        context: {
          platform: "whatsapp",
          sessionId: chatSession?.id || null,
          customerPhone: from_number,
          whatsappToken: waAccount.access_token,
          phoneId: phone_number_id,
          mediaAssets: storedMediaAsset ? [storedMediaAsset] : [],
        },
      });
    }

    console.log(
      `   🤖 AI Response Generated: "${replyText.substring(0, 50)}..."`,
    );
  } catch (err) {
    console.error("❌ [WhatsApp AI Error] Agent cycle failed:", err);
    return;
  }

  // 5. Save Conversation History for UI/Analytics
  if (replyText) {
    console.log(`\n[WhatsApp Debug] Saving chat into chat_sessions...`);
    try {
      if (!chatSession) {
        const fallbackMetadata = mergeWhatsappSessionMetadata(null, {
          phone: from_number,
          username: customer_name,
          whatsapp_phone_number_id: phone_number_id,
          whatsapp_message_ids: message_id ? [String(message_id)] : [],
        });

        const { data: newSession, error: sessErr } = await supabase
          .from("chat_sessions")
          .insert({
            chatbot_id: waAccount.chatbot_id,
            metadata: fallbackMetadata,
          })
          .select("id, metadata")
          .single();

        if (sessErr) {
          console.error(
            "❌ Failed to insert new WhatsApp chat_sessions:",
            sessErr,
          );
          throw sessErr;
        }
        chatSession = newSession;
        sessionMetadata = newSession?.metadata || fallbackMetadata;
      }

      const messagesToInsert = [
        ...(!inboundRecorded
          ? [{ session_id: chatSession.id, role: "user", content: text }]
          : []),
        { session_id: chatSession.id, role: "assistant", content: replyText },
      ];

      const { error: msgErr } = await supabase
        .from("chat_messages")
        .insert(messagesToInsert);

      if (msgErr) {
        console.error("❌ Failed to insert WhatsApp chat_messages:", msgErr);
        throw msgErr;
      }

      if (conversationSettings.sessionMemoryEnabled) {
        const nextState = updateConversationState({
          existingState: getConversationStateFromMetadata(sessionMetadata),
          userMessage: text,
          assistantReply: replyText,
          customerName,
          customerPhone: from_number,
          defaultLanguage: activeLanguageName || chatbotDefaultLanguage,
        });

        sessionMetadata = mergeMetadataWithState(sessionMetadata, nextState);
        await supabase
          .from("chat_sessions")
          .update({ metadata: sessionMetadata })
          .eq("id", chatSession.id);

        if (conversationSettings.contactMemoryEnabled) {
          await safeUpsertContactMemory(supabase, {
            chatbot_id: waAccount.chatbot_id,
            channel: "whatsapp",
            contact_key: from_number,
            display_name: customer_name,
            preferred_language: nextState.preferredLanguage || null,
            memory: {
              lastIntent: nextState.currentIntent || null,
              phone: nextState.collected?.phone || from_number,
              name: nextState.collected?.name || customer_name,
              preferredLanguage: nextState.preferredLanguage || null,
              notes: nextState.openQuestion || null,
            },
          });
        }
      }

      console.log(
        `   ✅ Chat history securely appended to Session: ${chatSession.id}`,
      );
    } catch (err) {
      console.error("❌ [WhatsApp Debug] Database Insertion Error:", err);
    }
  }

  // 6. Push Message natively to WhatsApp Meta Graph API
  const isError = false;
  let apiResponse = null;
  console.log(`   📲 Transmitting payload back to Meta WhatsApp API...`);
  try {
    const fwReq = await fetch(
      `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${waAccount.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: from_number,
          type: "text",
          text: { body: replyText },
        }),
      },
    );

    apiResponse = await fwReq.json();
    if (apiResponse.error) {
      console.error(`   ❌ [WhatsApp Send Error]:`, apiResponse.error);
      throw new Error(apiResponse.error.message);
    }
    console.log(
      `   ✅ Message successfully dispatched by WhatsApp. Message ID: ${apiResponse?.messages?.[0]?.id}`,
    );
  } catch (err) {
    apiResponse = { error: err };
  }

  // 7. Log Analytic Usage Metric Job
  await supabase.from("whatsapp_message_jobs").insert({
    whatsapp_account_id: waAccount.id,
    from_number: from_number,
    chatbot_id: waAccount.chatbot_id,
    status: apiResponse?.error ? "failed" : "sent",
    payload: apiResponse,
  });

  console.log(
    `🏁 [WhatsApp Automation] FINISHED: Successfully processed hook from ${from_number}\n`,
  );
};
