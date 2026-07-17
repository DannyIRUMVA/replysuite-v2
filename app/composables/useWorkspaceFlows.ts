import { computed } from "vue";

interface WorkspaceChatbot {
  id: string;
  name: string | null;
  enabled_tools?: string[] | null;
  tools_config?: Record<string, any> | null;
  data_sources?: Array<{ count?: number | null }> | null;
}

const normalizeList = (value: unknown) =>
  Array.isArray(value) ? value.filter(Boolean).map((item) => String(item)) : [];

const normalizeText = (value: unknown) => String(value || "").trim();

const textBlob = (...values: unknown[]) =>
  values
    .map((value) => {
      try {
        return typeof value === "string" ? value : JSON.stringify(value || "");
      } catch {
        return String(value || "");
      }
    })
    .join(" ")
    .toLowerCase();

const formatConfigLabel = (value: string) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const paymentToolSet = new Set([
  "payments",
  "request_payment",
  "check_payment_status",
]);
const productDeliveryToolSet = new Set([
  "orders",
  "products",
  "catalog",
  "product_delivery",
  "deliver_product",
]);

const schoolPattern =
  /\b(school|student|students|class|classes|course|courses|module|modules|university|college|lesson|lessons|tutor|tutoring|teacher|revision|exam|exams|learn|learning|education|session|sessions)\b/;

export const useWorkspaceFlows = () => {
  const supabase = useSupabaseClient();
  const { userId } = useAuth();

  const instagramApiFetch = async <T>(url: string, options: any = {}) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return await $fetch<T>(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  };

  const { data: instagramAccounts, pending: loadingInstagram } = useAsyncData(
    "workspace-flows-instagram-accounts",
    async () => await instagramApiFetch<any[]>("/api/instagram/accounts"),
    { server: false, default: () => [] },
  );

  const { data: whatsappAccounts, pending: loadingWhatsapp } = useAsyncData(
    "workspace-flows-whatsapp-accounts",
    async () => {
      if (!userId.value) return [];
      const { data } = await supabase
        .from("whatsapp_accounts")
        .select(
          "id, chatbot_id, phone_number, status, created_at, chatbots(id, name)",
        )
        .eq("user_id", userId.value)
        .order("created_at", { ascending: false });
      return data || [];
    },
    { server: false, watch: [userId], default: () => [] },
  );

  const { data: chatbots, pending: loadingChatbots } = useAsyncData(
    "workspace-flows-chatbots",
    async () => {
      if (!userId.value) return [];
      const { data } = await supabase
        .from("chatbots")
        .select(
          "id, name, enabled_tools, tools_config, created_at, data_sources(count)",
        )
        .eq("user_id", userId.value)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      return (data || []) as WorkspaceChatbot[];
    },
    { server: false, watch: [userId], default: () => [] },
  );

  const { data: catalogItems, pending: loadingCatalog } = useAsyncData(
    "workspace-flows-product-catalog",
    async () => {
      if (!userId.value) return [];
      const { data, error } = await supabase
        .from("chatbot_catalog")
        .select("chatbot_id")
        .eq("is_available", true);
      if (error) {
        console.warn("Could not load legacy product catalog readiness:", error);
        return [];
      }
      return data || [];
    },
    { server: false, watch: [userId], default: () => [] },
  );

  const { data: businessProducts, pending: loadingBusinessProducts } =
    useAsyncData(
      "workspace-flows-business-products",
      async () => {
        if (!userId.value) return [];
        const { data, error } = await supabase
          .from("business_products")
          .select("chatbot_id")
          .eq("is_active", true);
        if (error) {
          console.warn("Could not load business product readiness:", error);
          return [];
        }
        return data || [];
      },
      { server: false, watch: [userId], default: () => [] },
    );

  const { data: schoolTutorPlans, pending: loadingSchoolPlans } = useAsyncData(
    "workspace-flows-school-tutor-plans",
    async () => {
      if (!userId.value) return [];
      const { data, error } = await supabase
        .from("school_tutor_plans")
        .select("chatbot_id")
        .eq("is_active", true);
      if (error) {
        console.warn("Could not load school tutor plan readiness:", error);
        return [];
      }
      return data || [];
    },
    { server: false, watch: [userId], default: () => [] },
  );

  const botById = computed(() => {
    const map = new Map<string, WorkspaceChatbot>();
    for (const bot of chatbots.value || []) map.set(bot.id, bot);
    return map;
  });

  const buildCountByBotId = (items: any[] | null | undefined) => {
    const map = new Map<string, number>();
    for (const item of items || []) {
      const chatbotId = String((item as any)?.chatbot_id || "");
      if (!chatbotId) continue;
      map.set(chatbotId, (map.get(chatbotId) || 0) + 1);
    }
    return map;
  };

  const catalogCountByBotId = computed(() =>
    buildCountByBotId(catalogItems.value),
  );
  const businessProductCountByBotId = computed(() =>
    buildCountByBotId(businessProducts.value),
  );
  const schoolPlanCountByBotId = computed(() =>
    buildCountByBotId(schoolTutorPlans.value),
  );

  const botTools = (bot?: WorkspaceChatbot | null) =>
    normalizeList(bot?.enabled_tools);
  const botSkills = (bot?: WorkspaceChatbot | null) =>
    normalizeList(bot?.tools_config?.assistant_skills);
  const botTrainingCount = (bot?: WorkspaceChatbot | null) =>
    Array.isArray(bot?.data_sources)
      ? Number(bot.data_sources[0]?.count || 0)
      : 0;
  const hasPayment = (bot?: WorkspaceChatbot | null) => {
    const config = bot?.tools_config || {};
    return Boolean(
      botTools(bot).some((tool) => paymentToolSet.has(tool)) ||
      config.website_payment?.enabled ||
      config.business_flow?.payment_required ||
      config.school_flow?.payment_enabled,
    );
  };
  const productCatalogCount = (bot?: WorkspaceChatbot | null) =>
    bot?.id
      ? (businessProductCountByBotId.value.get(bot.id) || 0) +
        (catalogCountByBotId.value.get(bot.id) || 0)
      : 0;
  const schoolPlanCount = (bot?: WorkspaceChatbot | null) =>
    bot?.id ? schoolPlanCountByBotId.value.get(bot.id) || 0 : 0;
  const hasProductDelivery = (bot?: WorkspaceChatbot | null) => {
    const tools = botTools(bot);
    const config = bot?.tools_config || {};
    return Boolean(
      productCatalogCount(bot) > 0 ||
      tools.some((tool) => productDeliveryToolSet.has(tool)) ||
      config.business_flow?.product_delivery_enabled ||
      config.orders?.enabled ||
      config.orders?.delivery_enabled ||
      config.orders?.deliveryEnabled ||
      config.products?.enabled ||
      config.products?.delivery_enabled ||
      config.product_delivery?.enabled,
    );
  };
  const businessName = (bot?: WorkspaceChatbot | null) =>
    normalizeText(bot?.tools_config?.business_flow?.name || bot?.name || "");
  const businessDescription = (bot?: WorkspaceChatbot | null) =>
    normalizeText(bot?.tools_config?.business_flow?.description || "");
  const hasBusinessSignal = (bot?: WorkspaceChatbot | null) =>
    hasPayment(bot) && hasProductDelivery(bot);
  const hasSchoolSignal = (bot?: WorkspaceChatbot | null) =>
    schoolPlanCount(bot) > 0 ||
    botTools(bot).some((tool) =>
      ["school", "tutor", "school_tutor"].includes(tool),
    ) ||
    Boolean(bot?.tools_config?.school_flow?.enabled) ||
    schoolPattern.test(textBlob(bot?.name, botSkills(bot), bot?.tools_config));

  const instagramFlows = computed(() =>
    (instagramAccounts.value || []).flatMap((account: any) =>
      (account.posts || []).flatMap((post: any) =>
        (post.triggers || []).map((trigger: any) => {
          const bot = botById.value.get(trigger.chatbot_id) || null;
          return {
            id: trigger.id,
            routeId: account.id,
            channelType: "instagram",
            channel: "Instagram",
            source: trigger.reply_in_dm
              ? "Instagram comment-to-DM"
              : "Instagram comment",
            title: String(
              post?.caption || post?.permalink || post?.id || "Instagram post",
            ),
            trigger:
              Array.isArray(trigger.keywords) && trigger.keywords.length
                ? trigger.keywords.filter(Boolean).join(", ")
                : "All comments",
            mode:
              trigger.reply_in_comment && trigger.reply_in_dm
                ? "Comment reply + DM"
                : trigger.reply_in_dm
                  ? "Comment-to-DM"
                  : trigger.reply_in_comment
                    ? "Comment reply"
                    : "Paused",
            assistant:
              bot?.name || trigger.chatbots?.name || "Assistant not set",
            chatbotId: trigger.chatbot_id,
            tools: botTools(bot),
            skills: botSkills(bot),
            trainingCount: botTrainingCount(bot),
            paymentEnabled: hasPayment(bot),
            businessReady: Boolean(
              trigger.chatbot_id &&
              trigger.reply_in_dm &&
              hasBusinessSignal(bot),
            ),
            schoolReady: Boolean(trigger.chatbot_id && hasSchoolSignal(bot)),
            productDelivery: hasProductDelivery(bot),
            paidSession:
              schoolPattern.test(textBlob(bot?.tools_config)) &&
              hasPayment(bot),
            active: Boolean(trigger.is_active),
          };
        }),
      ),
    ),
  );

  const whatsappFlows = computed(() =>
    (whatsappAccounts.value || [])
      .filter((account: any) => account.chatbot_id)
      .map((account: any) => {
        const bot = botById.value.get(account.chatbot_id) || null;
        return {
          id: account.id,
          routeId: account.id,
          channelType: "whatsapp",
          channel: "WhatsApp",
          source: "WhatsApp message/keyword",
          title: account.phone_number || "WhatsApp number",
          trigger: "Inbound messages",
          mode: "Message-to-assistant",
          assistant: bot?.name || account.chatbots?.name || "Assistant not set",
          chatbotId: account.chatbot_id,
          tools: botTools(bot),
          skills: botSkills(bot),
          trainingCount: botTrainingCount(bot),
          paymentEnabled: hasPayment(bot),
          businessReady: Boolean(account.chatbot_id && hasBusinessSignal(bot)),
          schoolReady: Boolean(account.chatbot_id && hasSchoolSignal(bot)),
          productDelivery: hasProductDelivery(bot),
          paidSession:
            schoolPattern.test(textBlob(bot?.tools_config)) && hasPayment(bot),
          active: account.status === "active" || account.status === "deployed",
        };
      }),
  );

  const channelFlows = computed(() => [
    ...instagramFlows.value,
    ...whatsappFlows.value,
  ]);

  const workspaceFlows = computed(() => {
    const grouped = new Map<string, any>();
    for (const flow of channelFlows.value) {
      if (!flow.chatbotId) continue;
      const current = grouped.get(flow.chatbotId) || {
        id: flow.chatbotId,
        routeId: flow.routeId,
        assistant: flow.assistant,
        title:
          businessName(botById.value.get(flow.chatbotId)) || flow.assistant,
        description: businessDescription(botById.value.get(flow.chatbotId)),
        channels: new Set<string>(),
        channelTypes: new Set<string>(),
        routeIdsByChannel: {} as Record<string, string>,
        flowIdsByChannel: {} as Record<string, string>,
        sources: [] as string[],
        tools: flow.tools,
        skills: flow.skills,
        trainingCount: flow.trainingCount,
        paymentEnabled: false,
        businessReady: false,
        schoolReady: false,
        productDelivery: false,
        paidSession: false,
        active: false,
      };
      current.channels.add(flow.channel);
      current.channelTypes.add(flow.channelType);
      current.routeIdsByChannel[flow.channelType] = flow.routeId;
      if (
        !current.flowIdsByChannel[flow.channelType] ||
        flow.businessReady ||
        flow.schoolReady
      ) {
        current.flowIdsByChannel[flow.channelType] = flow.id;
      }
      current.sources.push(flow.source);
      current.routeId =
        current.routeIdsByChannel.instagram || current.routeId || flow.routeId;
      current.paymentEnabled = current.paymentEnabled || flow.paymentEnabled;
      current.businessReady = current.businessReady || flow.businessReady;
      current.schoolReady = current.schoolReady || flow.schoolReady;
      current.productDelivery = current.productDelivery || flow.productDelivery;
      current.paidSession = current.paidSession || flow.paidSession;
      current.active = current.active || flow.active;
      current.trainingCount = Math.max(
        current.trainingCount,
        flow.trainingCount || 0,
      );
      grouped.set(flow.chatbotId, current);
    }

    return Array.from(grouped.values()).map((flow) => ({
      ...flow,
      channels: Array.from(flow.channels),
      channelTypes: Array.from(flow.channelTypes),
      sources: Array.from(new Set(flow.sources)),
      tools: flow.tools.map(formatConfigLabel),
      skills: flow.skills.map(formatConfigLabel),
    }));
  });

  const businessFlows = computed(() =>
    workspaceFlows.value.filter((flow: any) => flow.businessReady),
  );
  const schoolFlows = computed(() =>
    workspaceFlows.value.filter((flow: any) => flow.schoolReady),
  );

  const isLoading = computed(
    () =>
      loadingInstagram.value ||
      loadingWhatsapp.value ||
      loadingChatbots.value ||
      loadingCatalog.value ||
      loadingBusinessProducts.value ||
      loadingSchoolPlans.value,
  );

  return {
    channelFlows,
    workspaceFlows,
    businessFlows,
    schoolFlows,
    isLoading,
    formatConfigLabel,
  };
};
