import {
  serverSupabaseClient,
  serverSupabaseServiceRole,
  serverSupabaseUser,
} from "#supabase/server";
import { isUuid } from "~~/server/utils/public-chatbot";

const sanitizeString = (value: unknown, maxLength = 500) =>
  String(value || "")
    .trim()
    .slice(0, maxLength);
const normalizePhoneForPaypack = (phone: string) =>
  sanitizeString(phone, 32)
    .replace(/\s+/g, "")
    .replace(/^\+250/, "0")
    .replace(/^250/, "0");

const isValidRwandaPhone = (phone: string) => /^07[2389]\d{7}$/.test(phone);

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const body = await readBody(event);
  const chatbotId = sanitizeString(body?.chatbot_id || body?.chatbotId, 80);
  if (!isUuid(chatbotId))
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid chatbot id.",
    });

  const amount = Math.trunc(Number(body?.amount || 0));
  if (!Number.isFinite(amount) || amount < 100 || amount > 5_000_000) {
    throw createError({
      statusCode: 400,
      statusMessage: "Amount must be between 100 and 5,000,000 RWF.",
    });
  }

  const phone = normalizePhoneForPaypack(body?.phone);
  if (!isValidRwandaPhone(phone)) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid Rwanda phone number is required.",
    });
  }

  const transactionRef = sanitizeString(
    body?.transactionRef || body?.transaction_ref,
    120,
  );
  if (!/^[a-zA-Z0-9_-]{8,120}$/.test(transactionRef)) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid transaction reference is required.",
    });
  }

  const projectRef = sanitizeString(body?.project_ref || body?.projectRef, 120);
  const businessName = sanitizeString(
    body?.business_name || body?.businessName,
    160,
  );

  const supabase = (await serverSupabaseClient(event)) as any;
  const { data: chatbot, error: chatbotError } = await supabase
    .from("chatbots")
    .select("id, name, tools_config")
    .eq("id", chatbotId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (chatbotError || !chatbot)
    throw createError({
      statusCode: 404,
      statusMessage: "Assistant not found.",
    });

  const paymentConfig = chatbot.tools_config?.website_payment || {};
  const config = useRuntimeConfig();
  const configuredWorkerUrl = sanitizeString(
    (config as any).replySuiteMobilePaymentWorkerUrl ||
      process.env.REPLYSUITE_MOBILE_PAYMENT_WORKER_URL ||
      process.env.REPLYSUITE_SUBSCRIPTION_PAYMENT_WORKER_URL,
    300,
  );
  const baseUrl = String(paymentConfig.base_url || configuredWorkerUrl).replace(
    /\/+$/,
    "",
  );
  if (!paymentConfig?.enabled || !baseUrl) {
    throw createError({
      statusCode: 409,
      statusMessage: "Website payment is not configured for this assistant.",
    });
  }

  const response = await fetch(`${baseUrl}/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "ReplySuite Website Payment/1.0",
    },
    body: JSON.stringify({
      amount,
      phone,
      transactionRef,
    }),
  });

  const responseText = await response.text();
  let responseData: unknown = responseText;
  try {
    responseData = JSON.parse(responseText);
  } catch {}

  const admin = serverSupabaseServiceRole(event) as any;
  await admin.from("chatbot_tool_events").insert({
    chatbot_id: chatbotId,
    tool_name: "website_payment_request",
    target_type: "website_project",
    arguments: {
      amount,
      currency: "RWF",
      phone,
      transaction_ref: transactionRef,
      project_ref: projectRef || null,
      business_name: businessName || null,
    },
    result: {
      provider: "paypack_worker",
      ok: response.ok,
      status: response.status,
      response: responseData,
    },
    status: response.ok ? "success" : "error",
    error_message: response.ok
      ? null
      : "Website payment worker rejected the payment request.",
  });

  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: "Website payment worker rejected the payment request.",
      data: { status: response.status, response: responseData },
    });
  }

  return {
    success: true,
    paymentRequested: true,
    amount,
    currency: "RWF",
    phone,
    transactionRef,
    providerResponse: responseData,
  };
});
