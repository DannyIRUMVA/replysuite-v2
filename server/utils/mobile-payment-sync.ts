import {
  ensureBusinessDeliveryLinks,
  publicDeliveryLinks,
} from "~~/server/utils/agent/handlers";

const normalizeText = (value: unknown, maxLength = 500) =>
  String(value || "")
    .trim()
    .slice(0, maxLength);

const uniq = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const deepRefs = (value: any): string[] => {
  if (!value || typeof value !== "object") return [];
  const direct = [
    value.ref,
    value.reference,
    value.provider_ref,
    value.providerRef,
    value.transaction_ref,
    value.transactionRef,
    value.transaction_id,
    value.transactionId,
    value.id,
  ].map((item) => normalizeText(item, 160));
  return uniq([
    ...direct,
    ...deepRefs(value.data),
    ...deepRefs(value.payment),
    ...deepRefs(value.transaction),
    ...deepRefs(value.event),
  ]);
};

export const extractMobilePaymentRefs = (payload: any) => deepRefs(payload);

export const normalizeMobilePaymentStatus = (payload: any) => {
  const raw = normalizeText(
    payload?.status ||
      payload?.payment_status ||
      payload?.state ||
      payload?.data?.status ||
      payload?.payment?.status ||
      payload?.transaction?.status,
    80,
  ).toLowerCase();
  if (
    [
      "paid",
      "completed",
      "complete",
      "success",
      "successful",
      "succeeded",
      "processed",
      "approved",
    ].includes(raw)
  )
    return "paid";
  if (
    ["failed", "failure", "error", "errored", "rejected", "declined"].includes(
      raw,
    )
  )
    return "failed";
  if (["cancelled", "canceled", "cancel"].includes(raw)) return "cancelled";
  if (["expired", "timeout", "timed_out"].includes(raw)) return "expired";
  if (["refunded", "refund"].includes(raw)) return "refunded";
  return raw || "pending";
};

const firstMaybeSingle = async (queries: Promise<any>[]) => {
  for (const query of queries) {
    const { data, error } = await query;
    if (!error && data) return data;
  }
  return null;
};

const findBusinessPayment = async (
  supabase: any,
  refs: string[],
  payload: any,
) => {
  for (const ref of refs) {
    const found = await firstMaybeSingle([
      supabase
        .from("business_payments")
        .select("*")
        .eq("provider_ref", ref)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("business_payments")
        .select("*")
        .contains("raw_response", { transaction_ref: ref })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (found) return found;
  }

  const orderId = normalizeText(
    payload?.order_id ||
      payload?.orderId ||
      payload?.target_id ||
      payload?.targetId,
    120,
  );
  const targetType = normalizeText(
    payload?.target_type || payload?.targetType,
    80,
  ).toLowerCase();
  if (orderId && ["", "order", "business_order"].includes(targetType)) {
    const { data } = await supabase
      .from("business_payments")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  return null;
};

const findSchoolPayment = async (
  supabase: any,
  refs: string[],
  payload: any,
) => {
  for (const ref of refs) {
    const found = await firstMaybeSingle([
      supabase
        .from("school_tutor_payments")
        .select("*")
        .eq("provider_ref", ref)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("school_tutor_payments")
        .select("*")
        .contains("raw_response", { transaction_ref: ref })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (found) return found;
  }

  const schoolSessionId = normalizeText(
    payload?.school_session_id ||
      payload?.schoolSessionId ||
      payload?.session_id ||
      payload?.sessionId ||
      payload?.target_id ||
      payload?.targetId,
    120,
  );
  const targetType = normalizeText(
    payload?.target_type || payload?.targetType,
    80,
  ).toLowerCase();
  if (
    schoolSessionId &&
    ["school_tutor_session", "school_session", "tutor_session"].includes(
      targetType,
    )
  ) {
    const { data } = await supabase
      .from("school_tutor_payments")
      .select("*")
      .eq("school_session_id", schoolSessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  return null;
};

const updateBusinessPayment = async (
  event: any,
  supabase: any,
  payment: any,
  status: string,
  payload: any,
) => {
  const update: any = {
    status,
    raw_response: {
      ...(payment.raw_response || {}),
      latest_webhook: payload,
      latest_webhook_at: new Date().toISOString(),
    },
  };
  if (status === "paid") update.paid_at = new Date().toISOString();

  await supabase.from("business_payments").update(update).eq("id", payment.id);

  let deliveryLinks: string[] = [];
  if (status === "paid") {
    await supabase
      .from("business_orders")
      .update({ payment_status: "paid", status: "completed" })
      .eq("id", payment.order_id)
      .eq("chatbot_id", payment.chatbot_id);
    deliveryLinks = publicDeliveryLinks(
      await ensureBusinessDeliveryLinks(
        event,
        payment.chatbot_id,
        payment.order_id,
      ),
    );
  } else if (["failed", "cancelled", "expired", "refunded"].includes(status)) {
    await supabase
      .from("business_orders")
      .update({ payment_status: status === "refunded" ? "refunded" : "failed" })
      .eq("id", payment.order_id)
      .eq("chatbot_id", payment.chatbot_id);
  }

  return {
    type: "business_order",
    payment_id: payment.id,
    order_id: payment.order_id,
    status,
    delivery_links: deliveryLinks,
  };
};

const updateSchoolPayment = async (
  supabase: any,
  payment: any,
  status: string,
  payload: any,
) => {
  const update: any = {
    status,
    raw_response: {
      ...(payment.raw_response || {}),
      latest_webhook: payload,
      latest_webhook_at: new Date().toISOString(),
    },
  };
  if (status === "paid") update.paid_at = new Date().toISOString();

  await supabase
    .from("school_tutor_payments")
    .update(update)
    .eq("id", payment.id);

  let schoolSession: any = null;
  if (status === "paid") {
    const { data: session } = await supabase
      .from("school_tutor_sessions")
      .select("id, status, duration_minutes, started_at, expires_at")
      .eq("id", payment.school_session_id)
      .eq("chatbot_id", payment.chatbot_id)
      .maybeSingle();
    if (session && session.status !== "active") {
      const startedAt = new Date();
      const expiresAt = new Date(
        startedAt.getTime() +
          Number(session.duration_minutes || 30) * 60 * 1000,
      );
      const { data: updated } = await supabase
        .from("school_tutor_sessions")
        .update({
          payment_status: "paid",
          status: "active",
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq("id", session.id)
        .select("id, status, started_at, expires_at, duration_minutes")
        .single();
      schoolSession = updated;
    } else schoolSession = session;
  } else if (["failed", "cancelled", "expired", "refunded"].includes(status)) {
    await supabase
      .from("school_tutor_sessions")
      .update({ payment_status: status === "refunded" ? "refunded" : "failed" })
      .eq("id", payment.school_session_id)
      .eq("chatbot_id", payment.chatbot_id);
  }

  return {
    type: "school_tutor_session",
    payment_id: payment.id,
    school_session_id: payment.school_session_id,
    status,
    school_session: schoolSession,
  };
};

export const syncMobilePaymentWebhook = async (
  event: any,
  supabase: any,
  payload: any,
) => {
  const refs = extractMobilePaymentRefs(payload);
  const status = normalizeMobilePaymentStatus(payload);
  const results: any[] = [];

  const businessPayment = await findBusinessPayment(supabase, refs, payload);
  if (businessPayment) {
    results.push(
      await updateBusinessPayment(
        event,
        supabase,
        businessPayment,
        status,
        payload,
      ),
    );
  }

  const schoolPayment = await findSchoolPayment(supabase, refs, payload);
  if (schoolPayment) {
    results.push(
      await updateSchoolPayment(supabase, schoolPayment, status, payload),
    );
  }

  return {
    status,
    refs,
    matched: results.length,
    results,
  };
};
