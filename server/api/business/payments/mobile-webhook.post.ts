import { serverSupabaseServiceRole } from "#supabase/server";
import { syncMobilePaymentWebhook } from "~~/server/utils/mobile-payment-sync";

const normalizeSecret = (value: unknown) => String(value || "").trim();

const constantTimeEqual = (a: string, b: string) => {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++)
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
};

const configuredWebhookSecret = (event: any) => {
  const config = useRuntimeConfig(event);
  return normalizeSecret(
    (config as any).replySuiteMobilePaymentWebhookSecret ||
      process.env.REPLYSUITE_MOBILE_PAYMENT_WEBHOOK_SECRET ||
      process.env.REPLYSUITE_MOBILE_PAYMENT_WORKER_SECRET ||
      "",
  );
};

const requestSecret = (event: any) => {
  const authorization = getHeader(event, "authorization") || "";
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim();
  return normalizeSecret(
    getHeader(event, "x-replysuite-webhook-secret") ||
      getHeader(event, "x-payment-webhook-secret") ||
      "",
  );
};

export default defineEventHandler(async (event) => {
  const expected = configuredWebhookSecret(event);
  if (!expected) {
    throw createError({
      statusCode: 503,
      statusMessage: "Mobile payment webhook is not configured.",
    });
  }

  const provided = requestSecret(event);
  if (!constantTimeEqual(provided, expected)) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const payload = await readBody(event).catch(() => null);
  if (!payload || typeof payload !== "object") {
    throw createError({ statusCode: 400, statusMessage: "Invalid payload" });
  }

  const supabase = serverSupabaseServiceRole(event);
  const result = await syncMobilePaymentWebhook(event, supabase, payload);

  if (!result.matched) {
    return {
      success: true,
      matched: 0,
      status: result.status,
      refs: result.refs,
      message:
        "Webhook accepted but no matching Business/School payment was found.",
    };
  }

  return {
    success: true,
    ...result,
  };
});
