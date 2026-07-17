import { TOOLS, TOOL_HANDLERS } from "./registry";
import {
  buildChatCompletionsRequests,
  type ChatCompletionsRequest,
} from "../ai-provider";
import {
  filterAgentToolsForPlan,
  getChatbotOwnerPlanSlug,
} from "../plan-access";

export interface AgentOptions {
  systemPrompt: string;
  enabledTools?: string[];
  chatbotId: string;
  event: any;
  context?: any;
}

const FEATURE_TOOL_MAP: Record<string, string[]> = {
  appointments: [
    "list_appointment_services",
    "check_appointment_availability",
    "request_appointment",
    "reschedule_appointment",
    "cancel_appointment",
  ],
  payments: [
    "request_payment",
    "check_payment_status",
    "request_business_payment",
    "check_business_payment",
    "request_school_tutor_payment",
    "check_school_tutor_payment",
  ],
  products: [
    "get_business_products",
    "create_business_order",
    "request_business_payment",
    "check_business_payment",
  ],
  catalog: ["get_business_products", "create_business_order"],
  product_delivery: [
    "get_business_products",
    "create_business_order",
    "check_business_payment",
  ],
  school: [
    "list_school_tutor_plans",
    "create_school_tutor_session",
    "request_school_tutor_payment",
    "check_school_tutor_payment",
  ],
  tutor: [
    "list_school_tutor_plans",
    "create_school_tutor_session",
    "request_school_tutor_payment",
    "check_school_tutor_payment",
  ],
};

export const runAgentCycle = async (messages: any[], options: AgentOptions) => {
  const config = useRuntimeConfig();

  const ownerPlanSlug = await getChatbotOwnerPlanSlug(
    options.event,
    options.chatbotId,
  );
  const planAllowedTools = filterAgentToolsForPlan(
    options.enabledTools,
    ownerPlanSlug,
  );

  const expandedEnabledTools = planAllowedTools
    ? planAllowedTools.flatMap(
        (feature) => FEATURE_TOOL_MAP[feature] || [feature],
      )
    : [];

  const activeTools = TOOLS.map((toolGroup) => ({
    function_declarations: toolGroup.function_declarations.filter((fd) =>
      expandedEnabledTools.includes(fd.name),
    ),
  })).filter((toolGroup) => toolGroup.function_declarations.length > 0);

  try {
    return await runGptAgent(messages, options, activeTools, config);
  } catch (error: any) {
    console.error(
      "[Agent Error] GPT agent cycle failed:",
      error?.message || error,
    );

    if (expandedEnabledTools.includes("request_appointment")) {
      return "I can still help with a booking. Please send your name, phone number, preferred date and time, and any notes such as number of guests. The team will confirm it shortly.";
    }

    return "I’m having trouble replying right now. Please send your request with your name and contact details, and the team will follow up shortly.";
  }
};

function convertSchemaToLowercase(schema: any): any {
  if (Array.isArray(schema)) return schema.map(convertSchemaToLowercase);
  if (schema !== null && typeof schema === "object") {
    const newObj: any = {};
    for (const key in schema) {
      if (key === "type" && typeof schema[key] === "string") {
        newObj[key] = schema[key].toLowerCase();
      } else {
        newObj[key] = convertSchemaToLowercase(schema[key]);
      }
    }
    return newObj;
  }
  return schema;
}

const withChatRequestOptions = (
  chatRequest: ChatCompletionsRequest,
  requestBody: any,
) => {
  const body = { ...requestBody };

  if (chatRequest.usesV1Api) {
    body.model = chatRequest.model;
  }

  if (chatRequest.maxCompletionTokens) {
    body.max_completion_tokens = chatRequest.maxCompletionTokens;
  }

  // Azure GPT-5.5 chat-completions currently rejects reasoning_effort when
  // function tools are present. Keep reasoning for non-tool turns, but omit it
  // for agent/tool loops so bookings and other tools can still execute.
  if (chatRequest.reasoningEffort && !body.tools) {
    body.reasoning_effort = chatRequest.reasoningEffort;
  }

  return body;
};

const runAgentRequestWithFallback = async (
  chatRequests: ChatCompletionsRequest[],
  requestBody: any,
) => {
  const errors: string[] = [];

  for (const chatRequest of chatRequests) {
    try {
      const response = await fetch(chatRequest.url, {
        method: "POST",
        headers: chatRequest.headers,
        body: JSON.stringify(withChatRequestOptions(chatRequest, requestBody)),
      });

      const data: any = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) {
        throw new Error(
          data?.error?.message ||
            `GPT request failed with HTTP ${response.status}`,
        );
      }

      return { data, provider: chatRequest.provider };
    } catch (error: any) {
      errors.push(`${chatRequest.provider}: ${error?.message || error}`);
      console.warn(
        `[Agent Fallback] ${chatRequest.provider} failed, trying next provider if configured:`,
        error?.message || error,
      );
    }
  }

  throw new Error(`All agent chat providers failed: ${errors.join(" | ")}`);
};

async function runGptAgent(
  messages: any[],
  options: AgentOptions,
  activeTools: any[],
  config: any,
) {
  const chatRequests = buildChatCompletionsRequests(config);

  const allFunctionDeclarations = activeTools.flatMap(
    (toolGroup: any) => toolGroup.function_declarations || [],
  );
  const gptTools = allFunctionDeclarations.map((fd: any) => ({
    type: "function",
    function: {
      name: fd.name,
      description: fd.description,
      parameters: fd.parameters
        ? convertSchemaToLowercase(fd.parameters)
        : undefined,
    },
  }));

  let finalSystemPrompt = options.systemPrompt;
  if (gptTools.length > 0) {
    const availableToolsList = allFunctionDeclarations
      .map((fd: any) => `- **${fd.name}**: ${fd.description}`)
      .join("\n");
    finalSystemPrompt += `\n\n[ACTIVATED AGENT TOOLS]
You have access to the following tools:
${availableToolsList}

CRITICAL RULES FOR TOOLS:
1. Keep responses brief and natural. Prefer short replies, but do not sound robotic.
2. Continue from the active conversation. Do not restart, re-greet, or ask again for details the user already provided in recent messages.
3. If the latest user message appears to answer a prior question, treat it as that answer and move forward.
4. If a tool requires parameters (like phone number, quantity, date, etc.) that the user still has not provided, ask for only the missing detail before trying to call the tool.
5. For digital-product sales, act like a calm professional salesperson: understand the customer need, recommend the best product from get_products, explain benefits naturally, then create_order only after the customer chooses.
6. Never reveal paid product delivery links before payment is confirmed. Free product links may be shared after create_order returns them.
7. For appointments/bookings, collect service/date/time/name/phone before request_appointment. Use availability tools before promising a slot.
8. Payments only attach to existing verified appointment/booking or order records. Paid school sessions should use a verified booking/session amount before payment. Never invent payment amounts.
9. Do not provide long explanations unless explicitly asked. Keep it snappy and natural.
10. Never show internal IDs to customers, including appointment IDs, booking IDs, calendar IDs, event IDs, payment IDs, tool IDs, UUIDs, or database references. Use a plain confirmation message instead.`;
  }

  const gptMessages = [
    { role: "system", content: finalSystemPrompt },
    ...messages.map((message) => ({
      role: message.role || "user",
      content: message.content || message.text || "",
    })),
  ];

  let iterations = 0;
  const MAX_ITERATIONS = 5;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const requestBody: any = {
      messages: gptMessages,
      tools: gptTools.length > 0 ? gptTools : undefined,
      tool_choice: gptTools.length > 0 ? "auto" : undefined,
    };

    const { data } = await runAgentRequestWithFallback(
      chatRequests,
      requestBody,
    );

    const choice = data.choices?.[0];
    const message = choice?.message;

    if (message?.tool_calls?.length) {
      gptMessages.push(message);

      for (const toolCall of message.tool_calls) {
        const { name, arguments: argsString } = toolCall.function;
        const args = JSON.parse(argsString || "{}");
        console.log(`[GPT Agent] Executing tool: ${name}`, args);

        const handler = TOOL_HANDLERS[name];
        const result = handler
          ? await handler(
              options.event,
              options.chatbotId,
              args,
              options.context,
            )
          : { error: "Tool not found" };

        gptMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    return (
      message?.content ||
      "I am sorry, I encountered an error processing your request."
    );
  }

  return "Processing limit reached.";
}
