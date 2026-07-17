import { serverSupabaseServiceRole } from "#supabase/server";
import { decryptSecret } from "~~/server/utils/crypto/secrets";
import {
  checkGoogleCalendarFreeBusy,
  createGoogleCalendarEvent,
  getGoogleCalendarBookingConnection,
} from "~~/server/utils/google-calendar";

type ToolContext = {
  platform?: "web" | "whatsapp" | "instagram" | "dashboard" | "test";
  sessionId?: string | null;
  messageId?: string | null;
  phoneId?: string;
  whatsappToken?: string;
  customerPhone?: string;
};

const toNumber = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizePhoneForPaypack = (phone: string) =>
  String(phone || "")
    .trim()
    .replace("+250", "0")
    .replace(/^250/, "0");
const normalizeText = (value: any) => String(value || "").trim();
const normalizeChannel = (context?: ToolContext) => context?.platform || "web";
const normalizeTime = (value: string) => {
  const trimmed = normalizeText(value);
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{1}:\d{2}$/.test(trimmed)) return `0${trimmed}`;
  return trimmed;
};
const getIsoRangeForBooking = (
  date: string,
  time: string,
  durationMinutes = 30,
  timezone = "Africa/Kigali",
) => {
  const normalizedTime = normalizeTime(time);
  const offset = timezone === "Africa/Kigali" ? "+02:00" : "";
  const start = new Date(`${date}T${normalizedTime}:00${offset}`);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { start, end, normalizedTime, timezone };
};
const toGoogleLocalDateTime = (value: Date, timezone = "Africa/Kigali") => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "Africa/Kigali",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(value)
      .reduce<Record<string, string>>((acc, part) => {
        if (part.type !== "literal") acc[part.type] = part.value;
        return acc;
      }, {});

    const hour = parts.hour === "24" ? "00" : parts.hour;
    return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}`;
  } catch {
    return value.toISOString().slice(0, 19);
  }
};

const getAdmin = (event: any) => serverSupabaseServiceRole(event) as any;

const safeJson = (value: any) => {
  try {
    return JSON.parse(JSON.stringify(value ?? {}));
  } catch {
    return { value: String(value) };
  }
};

const logToolEvent = async (
  event: any,
  chatbotId: string,
  toolName: string,
  args: any,
  result: any,
  context?: ToolContext,
  target?: { type?: string | null; id?: string | null },
) => {
  try {
    const supabase = getAdmin(event);
    await supabase.from("chatbot_tool_events").insert({
      chatbot_id: chatbotId,
      session_id: context?.sessionId || null,
      message_id: context?.messageId || null,
      tool_name: toolName,
      target_type: target?.type || null,
      target_id: target?.id || null,
      arguments: safeJson(args),
      result: safeJson(result),
      status: result?.error ? "error" : "success",
      error_message: result?.error || null,
    });
  } catch (err: any) {
    console.warn(
      "[Agent Tool Events] Failed to log tool event:",
      err?.message || err,
    );
  }
};

const getChatbotToolConfig = async (event: any, chatbotId: string) => {
  const { data } = await getAdmin(event)
    .from("chatbots")
    .select("tools_config")
    .eq("id", chatbotId)
    .maybeSingle();
  return data?.tools_config || {};
};

const getPaymentCredentials = async (event: any, chatbotId: string) => {
  const supabase = getAdmin(event);

  // Production credentials live in chatbot_payment_providers only.
  // Do not read legacy plaintext tools_config secrets for payment execution.
  const { data: provider } = await supabase
    .from("chatbot_payment_providers")
    .select("client_id, encrypted_client_secret")
    .eq("chatbot_id", chatbotId)
    .eq("provider", "paypack")
    .eq("is_active", true)
    .maybeSingle();

  if (provider?.client_id && provider?.encrypted_client_secret) {
    const config = useRuntimeConfig();
    return {
      clientId: provider.client_id,
      clientSecret: await decryptSecret(
        provider.encrypted_client_secret,
        config.paypackSecretEncryptionKey || "",
      ),
      source: "chatbot_payment_providers",
    };
  }

  return {
    clientId: "",
    clientSecret: "",
    source: "chatbot_payment_providers",
  };
};

const getSharedPaymentWorkerBaseUrl = async (event: any, chatbotId: string) => {
  const config = useRuntimeConfig();
  const runtimeUrl = normalizeText(
    (config as any).replySuiteMobilePaymentWorkerUrl ||
      process.env.REPLYSUITE_MOBILE_PAYMENT_WORKER_URL ||
      process.env.REPLYSUITE_SUBSCRIPTION_PAYMENT_WORKER_URL,
  );
  if (runtimeUrl) return runtimeUrl.replace(/\/+$/, "");

  const toolsConfig = await getChatbotToolConfig(event, chatbotId);
  const websitePayment = toolsConfig?.website_payment || {};
  const baseUrl = normalizeText(
    websitePayment.base_url || websitePayment.baseUrl,
  );
  return websitePayment.enabled && baseUrl ? baseUrl.replace(/\/+$/, "") : "";
};

const makePaymentTransactionRef = (chatbotId: string, target: any) =>
  `replysuite-${target.targetType}-${String(target.targetId || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 18)}-${String(chatbotId || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 10)}-${Date.now()}`
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 120);

const extractProviderRef = (value: any, fallback: string) =>
  normalizeText(
    value?.ref ||
      value?.reference ||
      value?.transactionRef ||
      value?.transaction_ref ||
      value?.data?.ref ||
      value?.data?.reference ||
      fallback,
  );

const extractPaymentTransactionRef = (payment: any) =>
  normalizeText(
    payment?.raw_response?.transaction_ref ||
      payment?.raw_response?.transactionRef ||
      payment?.raw_response?.response?.transaction_ref ||
      payment?.raw_response?.response?.transactionRef,
    160,
  );

const normalizeVerifiedPaymentStatus = (value: any) => {
  const raw = normalizeText(
    value?.status ||
      value?.payment_status ||
      value?.state ||
      value?.data?.status ||
      value?.payment?.status ||
      value?.transaction?.status ||
      value?.response?.status,
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

const verifySharedWorkerPayment = async (
  event: any,
  chatbotId: string,
  payment: any,
) => {
  const baseUrl = await getSharedPaymentWorkerBaseUrl(event, chatbotId);
  if (!baseUrl) return null;

  const providerRef = normalizeText(payment?.provider_ref, 160);
  const transactionRef = extractPaymentTransactionRef(payment);
  if (!providerRef && !transactionRef) return null;

  const body = {
    ref: providerRef || transactionRef,
    reference: providerRef || transactionRef,
    providerRef,
    provider_ref: providerRef,
    transactionRef,
    transaction_ref: transactionRef,
  };

  const endpoints = [
    {
      url: `${baseUrl}/verify`,
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "ReplySuite Payment Verify/1.0",
        },
        body: JSON.stringify(body),
      },
    },
    {
      url: `${baseUrl}/verify?ref=${encodeURIComponent(providerRef || transactionRef)}`,
      init: {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "ReplySuite Payment Verify/1.0",
        },
      },
    },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, endpoint.init as any);
      const text = await response.text();
      let data: any = text;
      try {
        data = JSON.parse(text);
      } catch {}
      if (!response.ok) continue;
      return {
        status: normalizeVerifiedPaymentStatus(data),
        response: data,
        verified_at: new Date().toISOString(),
      };
    } catch (error) {
      console.warn("[Payment Verify] Worker verify failed:", error);
    }
  }

  return null;
};

export const getMenuHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const supabase = getAdmin(event);
  let query = supabase
    .from("chatbot_catalog")
    .select(
      "id, name, description, category, price, currency, image_url, sku, is_available",
    )
    .eq("chatbot_id", chatbotId)
    .eq("is_available", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (args?.category) query = query.ilike("category", `%${args.category}%`);

  const { data, error } = await query;
  const items = (data || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    price: Number(item.price || 0),
    currency: item.currency || "RWF",
    is_paid: catalogIsPaid(item),
    sales_notes: catalogSalesNotes(item) || null,
  }));
  const result = error ? { error: error.message } : { items };
  await logToolEvent(event, chatbotId, "get_menu", args, result, context);
  return result;
};

const parseCatalogMeta = (product: any) => {
  try {
    return product?.sku ? JSON.parse(product.sku) : {};
  } catch {
    return {};
  }
};

const catalogDeliveryUrl = (product: any) =>
  normalizeText(
    product?.delivery_url || parseCatalogMeta(product).delivery_url,
  );
const catalogIsPaid = (product: any) =>
  product?.is_paid !== undefined
    ? product.is_paid !== false
    : parseCatalogMeta(product).is_paid !== false &&
      toNumber(product?.price) > 0;
const catalogSalesNotes = (product: any) =>
  normalizeText(product?.sales_notes || parseCatalogMeta(product).sales_notes);

const resolveCatalogItems = async (
  event: any,
  chatbotId: string,
  items: any[] = [],
) => {
  const { data: products, error } = await getAdmin(event)
    .from("chatbot_catalog")
    .select("id, name, description, price, currency, is_available, sku")
    .eq("chatbot_id", chatbotId)
    .eq("is_available", true);

  if (error)
    return { error: error.message, orderItems: [], total: 0, currency: "RWF" };
  if (!products?.length)
    return {
      error: "Catalog is empty. Add products before taking orders.",
      orderItems: [],
      total: 0,
      currency: "RWF",
    };

  let total = 0;
  const missing: string[] = [];
  const orderItems = items
    .map((item: any) => {
      const ident = normalizeText(
        item.product_name_or_id ||
          item.product_id ||
          item.catalog_item_id ||
          item.name,
      ).toLowerCase();
      const qty = Math.max(
        1,
        Math.floor(toNumber(item.qty ?? item.quantity, 1)),
      );
      const product = products.find(
        (prod: any) =>
          prod.id?.toLowerCase() === ident ||
          prod.name?.toLowerCase() === ident,
      );
      if (!product) {
        missing.push(ident || "unknown item");
        return null;
      }
      const price = toNumber(product.price);
      const lineTotal = price * qty;
      total += lineTotal;
      return {
        catalog_item_id: product.id,
        name: product.name,
        description: product.description,
        price,
        currency: product.currency || "RWF",
        qty,
        is_paid: catalogIsPaid(product),
        delivery_url: catalogDeliveryUrl(product) || null,
        sales_notes: catalogSalesNotes(product) || null,
        notes: item.notes || null,
        line_total: lineTotal,
      };
    })
    .filter(Boolean);

  return {
    error: missing.length
      ? `Some items were not found in the catalog: ${missing.join(", ")}`
      : null,
    orderItems,
    total,
    currency: orderItems[0]?.currency || "RWF",
  };
};

export const createOrderHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const items = Array.isArray(args?.items) ? args.items : [];
  if (!items.length) {
    const result = {
      error: "Choose at least one catalog item before creating an order.",
    };
    await logToolEvent(event, chatbotId, "create_order", args, result, context);
    return result;
  }

  const resolved = await resolveCatalogItems(event, chatbotId, items);
  if (resolved.error) {
    const result = { error: resolved.error };
    await logToolEvent(event, chatbotId, "create_order", args, result, context);
    return result;
  }

  const config = await getChatbotToolConfig(event, chatbotId);
  const orderConfig = config?.orders || {};
  const hasPaidItems = resolved.orderItems.some((item: any) => item.is_paid);
  const paymentRequired = Boolean(
    hasPaidItems &&
    (orderConfig.payment_required ?? orderConfig.paymentRequired ?? true),
  );
  const deliveryFee =
    args?.order_type === "delivery"
      ? toNumber(orderConfig.delivery_fee || orderConfig.deliveryFee, 0)
      : 0;
  const subtotal = resolved.total;
  const totalAmount = subtotal + deliveryFee;
  const status = paymentRequired ? "pending_payment" : "pending";
  const paymentStatus = paymentRequired ? "unpaid" : "not_required";

  const supabase = getAdmin(event);
  const { data: order, error } = await supabase
    .from("chatbot_orders")
    .insert({
      chatbot_id: chatbotId,
      session_id: context?.sessionId || null,
      customer_phone: args?.customer_phone || args?.phone || null,
      customer_name: args?.customer_name || args?.name || null,
      customer_email: args?.customer_email || args?.email || null,
      order_type: args?.order_type || orderConfig.order_type || "digital",
      delivery_address: args?.delivery_address || null,
      subtotal,
      delivery_fee: deliveryFee,
      tax_amount: 0,
      total_amount: totalAmount,
      currency: resolved.currency,
      status,
      payment_status: paymentStatus,
      source_channel: normalizeChannel(context),
      metadata: {
        created_by: "agent_tool",
        digital_delivery_items: resolved.orderItems.map((item: any) => ({
          catalog_item_id: item.catalog_item_id,
          name: item.name,
          is_paid: item.is_paid,
          delivery_url: item.delivery_url,
        })),
      },
    })
    .select("id, total_amount, currency, status, payment_status")
    .single();

  if (error) {
    const result = { error: error.message };
    await logToolEvent(event, chatbotId, "create_order", args, result, context);
    return result;
  }

  const itemRows = resolved.orderItems.map((item: any) => ({
    order_id: order.id,
    catalog_item_id: item.catalog_item_id,
    name: item.name,
    unit_price: item.price,
    quantity: item.qty,
    notes: item.notes,
    line_total: item.line_total,
  }));
  await supabase.from("chatbot_order_items").insert(itemRows);
  await supabase.from("order_status_events").insert({
    order_id: order.id,
    status_to: status,
    note: "Created by chatbot.",
  });

  const freeDeliveryLinks = !paymentRequired
    ? resolved.orderItems
        .filter((item: any) => item.delivery_url)
        .map((item: any) => ({ name: item.name, url: item.delivery_url }))
    : [];
  const result = {
    order_id: order.id,
    total: Number(order.total_amount),
    currency: order.currency,
    status: order.status,
    payment_status: order.payment_status,
    delivery_links: freeDeliveryLinks,
    message: paymentRequired
      ? "Order created. Ask for the customer phone number and request MTN/Airtel mobile payment before delivering the product."
      : "Order created. The product is free, so you can now share the delivery link with the customer.",
  };
  await logToolEvent(event, chatbotId, "create_order", args, result, context, {
    type: "order",
    id: order.id,
  });
  return result;
};

export const placeOrderHandler = createOrderHandler;

export const confirmOrderHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const disabledResult = {
    error: "Orders are disabled. Use appointments and bookings instead.",
  };
  await logToolEvent(
    event,
    chatbotId,
    "confirm_order",
    args,
    disabledResult,
    context,
  );
  return disabledResult;

  const orderId = args?.order_id || args?.target_id;
  if (!orderId) {
    const result = { error: "order_id is required." };
    await logToolEvent(
      event,
      chatbotId,
      "confirm_order",
      args,
      result,
      context,
    );
    return result;
  }

  const supabase = getAdmin(event);
  const { data: order, error: loadError } = await supabase
    .from("chatbot_orders")
    .select("id, status, payment_status")
    .eq("id", orderId)
    .eq("chatbot_id", chatbotId)
    .maybeSingle();

  if (loadError || !order) {
    const result = { error: "Order not found for this assistant." };
    await logToolEvent(
      event,
      chatbotId,
      "confirm_order",
      args,
      result,
      context,
    );
    return result;
  }

  const nextStatus =
    order.payment_status === "unpaid" || order.payment_status === "pending"
      ? "pending_payment"
      : "confirmed";
  const { error } = await supabase
    .from("chatbot_orders")
    .update({ status: nextStatus })
    .eq("id", order.id);
  if (!error)
    await supabase.from("order_status_events").insert({
      order_id: order.id,
      status_from: order.status,
      status_to: nextStatus,
      note: "Confirmed by chatbot flow.",
    });

  const result = error
    ? { error: error.message }
    : {
        order_id: order.id,
        status: nextStatus,
        message: `Order is now ${nextStatus}.`,
      };
  await logToolEvent(event, chatbotId, "confirm_order", args, result, context, {
    type: "order",
    id: order.id,
  });
  return result;
};

export const cancelOrderHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const disabledResult = {
    error: "Orders are disabled. Use appointments and bookings instead.",
  };
  await logToolEvent(
    event,
    chatbotId,
    "cancel_order",
    args,
    disabledResult,
    context,
  );
  return disabledResult;

  const orderId = args?.order_id || args?.target_id;
  const supabase = getAdmin(event);
  const { data: order } = await supabase
    .from("chatbot_orders")
    .select("id, status")
    .eq("id", orderId)
    .eq("chatbot_id", chatbotId)
    .maybeSingle();
  if (!order) {
    const result = { error: "Order not found for this assistant." };
    await logToolEvent(event, chatbotId, "cancel_order", args, result, context);
    return result;
  }
  const { error } = await supabase
    .from("chatbot_orders")
    .update({ status: "cancelled" })
    .eq("id", order.id);
  if (!error)
    await supabase.from("order_status_events").insert({
      order_id: order.id,
      status_from: order.status,
      status_to: "cancelled",
      note: args?.reason || "Cancelled by customer.",
    });
  const result = error
    ? { error: error.message }
    : { order_id: order.id, status: "cancelled" };
  await logToolEvent(event, chatbotId, "cancel_order", args, result, context, {
    type: "order",
    id: order.id,
  });
  return result;
};

export const listAppointmentServicesHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const { data, error } = await getAdmin(event)
    .from("appointment_services")
    .select("id, name, description, duration_minutes, price, currency")
    .eq("chatbot_id", chatbotId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const result = error ? { error: error.message } : { services: data || [] };
  await logToolEvent(
    event,
    chatbotId,
    "list_appointment_services",
    args,
    result,
    context,
  );
  return result;
};

export const checkAppointmentAvailabilityHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const date = normalizeText(args?.date);
  const time = normalizeText(args?.time);
  if (!date) {
    const result = { error: "date is required in YYYY-MM-DD format." };
    await logToolEvent(
      event,
      chatbotId,
      "check_appointment_availability",
      args,
      result,
      context,
    );
    return result;
  }

  const serviceId = args?.service_id || null;
  let durationMinutes = 60;
  if (serviceId) {
    const { data: service } = await getAdmin(event)
      .from("appointment_services")
      .select("duration_minutes")
      .eq("id", serviceId)
      .eq("chatbot_id", chatbotId)
      .maybeSingle();
    if (service?.duration_minutes)
      durationMinutes = Number(service.duration_minutes);
  }

  const timezone = args?.timezone || "Africa/Kigali";
  const { start, end, normalizedTime } = time
    ? getIsoRangeForBooking(date, time, durationMinutes, timezone)
    : {
        start: new Date(
          `${date}T00:00:00${timezone === "Africa/Kigali" ? "+02:00" : ""}`,
        ),
        end: new Date(
          `${date}T23:59:59${timezone === "Africa/Kigali" ? "+02:00" : ""}`,
        ),
        normalizedTime: "",
      };

  const { data: localOverlap, error: localOverlapError } = await getAdmin(event)
    .from("chatbot_appointments")
    .select("id")
    .eq("chatbot_id", chatbotId)
    .in("status", [
      "pending",
      "pending_payment",
      "paid_pending_approval",
      "approved",
      "rescheduled",
    ])
    .lt("appointment_start", end.toISOString())
    .gt("appointment_end", start.toISOString())
    .limit(1);

  if (!localOverlapError && localOverlap?.length) {
    const result = {
      available: false,
      date,
      time: normalizedTime || null,
      provider: "replysuite",
      message: "That time already has an appointment.",
    };
    await logToolEvent(
      event,
      chatbotId,
      "check_appointment_availability",
      args,
      result,
      context,
    );
    return result;
  }

  const google = await getGoogleCalendarBookingConnection(event, chatbotId);
  if (!google.error && google.mapping?.calendar_id) {
    try {
      const freeBusy = await checkGoogleCalendarFreeBusy(
        google.accessToken,
        google.mapping.calendar_id,
        start.toISOString(),
        end.toISOString(),
        google.mapping.calendar_timezone || timezone,
      );
      const result = {
        available: freeBusy.available,
        date,
        time: normalizedTime || null,
        provider: "google_calendar",
        message: freeBusy.available
          ? "This time is available on Google Calendar."
          : "That time is already busy on Google Calendar.",
      };
      await logToolEvent(
        event,
        chatbotId,
        "check_appointment_availability",
        args,
        result,
        context,
      );
      return result;
    } catch (err: any) {
      const result = {
        error:
          err?.statusMessage ||
          err?.message ||
          "Google Calendar availability check failed.",
      };
      await logToolEvent(
        event,
        chatbotId,
        "check_appointment_availability",
        args,
        result,
        context,
      );
      return result;
    }
  }

  const { data: overlapping, error } = await getAdmin(event)
    .from("chatbot_appointments")
    .select("id")
    .eq("chatbot_id", chatbotId)
    .in("status", [
      "pending",
      "pending_payment",
      "paid_pending_approval",
      "approved",
      "rescheduled",
    ])
    .lt("appointment_start", end.toISOString())
    .gt("appointment_end", start.toISOString())
    .limit(1);

  const available = !error && (!overlapping || overlapping.length === 0);
  const result = error
    ? { error: error.message }
    : {
        available,
        date,
        time: normalizedTime || null,
        provider: "replysuite",
        message: available
          ? "This time appears available."
          : "That time already has an appointment.",
      };
  await logToolEvent(
    event,
    chatbotId,
    "check_appointment_availability",
    args,
    result,
    context,
  );
  return result;
};

export const requestAppointmentHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const date = normalizeText(args?.date);
  const time = normalizeText(args?.time);
  const name = normalizeText(args?.name || args?.customer_name);
  const phone = normalizeText(args?.phone || args?.customer_phone);

  if (!date || !time || !name || !phone) {
    const result = {
      error:
        "date, time, customer name, and phone are required before requesting an appointment.",
    };
    await logToolEvent(
      event,
      chatbotId,
      "request_appointment",
      args,
      result,
      context,
    );
    return result;
  }

  const config = await getChatbotToolConfig(event, chatbotId);
  const appointmentConfig = config?.appointments || {};
  const depositRequired = Boolean(
    appointmentConfig.payment_required ||
    appointmentConfig.deposit_required ||
    appointmentConfig.paymentRequired,
  );
  const depositAmount = toNumber(
    appointmentConfig.deposit_amount || appointmentConfig.depositAmount,
    0,
  );
  const approvalMode =
    appointmentConfig.approval_mode ||
    appointmentConfig.approvalMode ||
    "manual";
  const serviceId = args?.service_id || null;
  let durationMinutes = 30;
  let serviceName = "";
  if (serviceId) {
    const { data: service } = await getAdmin(event)
      .from("appointment_services")
      .select("name, duration_minutes, price, currency")
      .eq("id", serviceId)
      .eq("chatbot_id", chatbotId)
      .maybeSingle();
    if (service?.duration_minutes)
      durationMinutes = Number(service.duration_minutes);
    if (service?.name) serviceName = service.name;
  }

  const timezone =
    args?.timezone || appointmentConfig.timezone || "Africa/Kigali";
  const { start, end, normalizedTime } = getIsoRangeForBooking(
    date,
    time,
    durationMinutes,
    timezone,
  );

  const { data: localOverlap, error: localOverlapError } = await getAdmin(event)
    .from("chatbot_appointments")
    .select("id")
    .eq("chatbot_id", chatbotId)
    .in("status", [
      "pending",
      "pending_payment",
      "paid_pending_approval",
      "approved",
      "rescheduled",
    ])
    .lt("appointment_start", end.toISOString())
    .gt("appointment_end", start.toISOString())
    .limit(1);

  if (localOverlapError) {
    const result = { error: localOverlapError.message };
    await logToolEvent(
      event,
      chatbotId,
      "request_appointment",
      args,
      result,
      context,
    );
    return result;
  }

  if (localOverlap?.length) {
    const result = {
      error:
        "That time already has an appointment. Please choose another time.",
    };
    await logToolEvent(
      event,
      chatbotId,
      "request_appointment",
      args,
      result,
      context,
    );
    return result;
  }

  const google = await getGoogleCalendarBookingConnection(event, chatbotId);
  let googleEvent: any = null;
  if (!google.error && google.mapping?.calendar_id) {
    try {
      const freeBusy = await checkGoogleCalendarFreeBusy(
        google.accessToken,
        google.mapping.calendar_id,
        start.toISOString(),
        end.toISOString(),
        google.mapping.calendar_timezone || timezone,
      );
      if (!freeBusy.available) {
        const result = {
          error:
            "That time is already busy on Google Calendar. Please choose another time.",
        };
        await logToolEvent(
          event,
          chatbotId,
          "request_appointment",
          args,
          result,
          context,
        );
        return result;
      }
      const eventTimezone =
        timezone || google.mapping.calendar_timezone || "Africa/Kigali";
      googleEvent = await createGoogleCalendarEvent(
        google.accessToken,
        google.mapping.calendar_id,
        {
          summary: `${serviceName || "Reservation"} — ${name}`,
          description: [
            "Created by ReplySuite.",
            `Customer: ${name}`,
            `Phone: ${phone}`,
            args?.email || args?.customer_email
              ? `Email: ${args?.email || args?.customer_email}`
              : "",
            args?.notes ? `Notes: ${args.notes}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          start: {
            dateTime: toGoogleLocalDateTime(start, eventTimezone),
            timeZone: eventTimezone,
          },
          end: {
            dateTime: toGoogleLocalDateTime(end, eventTimezone),
            timeZone: eventTimezone,
          },
          reminders: { useDefault: true },
          extendedProperties: { private: { replysuite_chatbot_id: chatbotId } },
        },
      );
    } catch (err: any) {
      const result = {
        error:
          err?.statusMessage ||
          err?.message ||
          "Google Calendar booking failed.",
      };
      await logToolEvent(
        event,
        chatbotId,
        "request_appointment",
        args,
        result,
        context,
      );
      return result;
    }
  }
  const status =
    depositRequired && depositAmount > 0
      ? "pending_payment"
      : approvalMode === "auto"
        ? "approved"
        : "pending";
  const paymentStatus =
    depositRequired && depositAmount > 0 ? "unpaid" : "not_required";

  const supabase = getAdmin(event);
  const { data, error } = await supabase
    .from("chatbot_appointments")
    .insert({
      chatbot_id: chatbotId,
      session_id: context?.sessionId || null,
      service_id: serviceId,
      staff_id: args?.staff_id || null,
      customer_name: name,
      customer_phone: phone,
      customer_email: args?.email || args?.customer_email || null,
      appointment_start: start.toISOString(),
      appointment_end: end.toISOString(),
      appointment_time: start.toISOString(),
      timezone,
      status,
      payment_status: paymentStatus,
      deposit_required: depositRequired,
      deposit_amount: depositAmount,
      currency: appointmentConfig.currency || "RWF",
      notes: args?.notes || null,
      source_channel: normalizeChannel(context),
      external_provider: googleEvent ? "google_calendar" : null,
      external_calendar_id: googleEvent ? google.mapping.calendar_id : null,
      external_event_id: googleEvent?.id || null,
      external_event_etag: googleEvent?.etag || null,
      sync_status: googleEvent ? "synced" : null,
      last_synced_at: googleEvent ? new Date().toISOString() : null,
      metadata: {
        created_by: "agent_tool",
        google_event_html_link: googleEvent?.htmlLink || null,
      },
    })
    .select(
      "id, status, payment_status, appointment_start, appointment_end, deposit_amount, currency, external_event_id",
    )
    .single();

  if (error) {
    const result = { error: error.message };
    await logToolEvent(
      event,
      chatbotId,
      "request_appointment",
      args,
      result,
      context,
    );
    return result;
  }

  await supabase.from("appointment_status_events").insert({
    appointment_id: data.id,
    status_to: status,
    note: "Requested by chatbot.",
  });

  const result = {
    status: data.status,
    payment_status: data.payment_status,
    appointment_start: data.appointment_start,
    appointment_end: data.appointment_end,
    deposit_amount: Number(data.deposit_amount || 0),
    currency: data.currency || "RWF",
    calendar_synced: Boolean(googleEvent),
    message:
      depositRequired && depositAmount > 0
        ? "Appointment request saved. A deposit is required before confirmation."
        : googleEvent
          ? "Booking saved and added to Google Calendar."
          : approvalMode === "auto"
            ? "Appointment booked successfully."
            : "Appointment request saved. The team will confirm it.",
  };
  await logToolEvent(
    event,
    chatbotId,
    "request_appointment",
    args,
    result,
    context,
    { type: "appointment", id: data.id },
  );
  return result;
};

export const appointmentHandler = requestAppointmentHandler;

export const rescheduleAppointmentHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const appointmentId = args?.appointment_id || args?.target_id;
  const date = normalizeText(args?.date);
  const time = normalizeText(args?.time);
  if (!appointmentId || !date || !time) {
    const result = { error: "appointment_id, date, and time are required." };
    await logToolEvent(
      event,
      chatbotId,
      "reschedule_appointment",
      args,
      result,
      context,
    );
    return result;
  }

  const supabase = getAdmin(event);
  const { data: current } = await supabase
    .from("chatbot_appointments")
    .select("id, status, appointment_start, appointment_end")
    .eq("id", appointmentId)
    .eq("chatbot_id", chatbotId)
    .maybeSingle();

  if (!current) {
    const result = { error: "Appointment not found for this assistant." };
    await logToolEvent(
      event,
      chatbotId,
      "reschedule_appointment",
      args,
      result,
      context,
    );
    return result;
  }

  const start = new Date(`${date}T${time}:00`);
  const oldStart = current.appointment_start
    ? new Date(current.appointment_start)
    : null;
  const oldEnd = current.appointment_end
    ? new Date(current.appointment_end)
    : null;
  const duration =
    oldStart && oldEnd
      ? Math.max(
          30,
          Math.round((oldEnd.getTime() - oldStart.getTime()) / 60000),
        )
      : 30;
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const { error } = await supabase
    .from("chatbot_appointments")
    .update({
      appointment_start: start.toISOString(),
      appointment_end: end.toISOString(),
      appointment_time: start.toISOString(),
      status: "rescheduled",
    })
    .eq("id", appointmentId)
    .eq("chatbot_id", chatbotId);

  if (!error)
    await supabase.from("appointment_status_events").insert({
      appointment_id: appointmentId,
      status_from: current.status,
      status_to: "rescheduled",
      note: args?.reason || "Rescheduled by customer.",
    });
  const result = error
    ? { error: error.message }
    : {
        status: "rescheduled",
        appointment_start: start.toISOString(),
        message: "Appointment rescheduled successfully.",
      };
  await logToolEvent(
    event,
    chatbotId,
    "reschedule_appointment",
    args,
    result,
    context,
    { type: "appointment", id: appointmentId },
  );
  return result;
};

export const cancelAppointmentHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const appointmentId = args?.appointment_id || args?.target_id;
  const supabase = getAdmin(event);
  const { data: current } = await supabase
    .from("chatbot_appointments")
    .select("id, status")
    .eq("id", appointmentId)
    .eq("chatbot_id", chatbotId)
    .maybeSingle();
  if (!current) {
    const result = { error: "Appointment not found for this assistant." };
    await logToolEvent(
      event,
      chatbotId,
      "cancel_appointment",
      args,
      result,
      context,
    );
    return result;
  }
  const { error } = await supabase
    .from("chatbot_appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
    .eq("chatbot_id", chatbotId);
  if (!error)
    await supabase.from("appointment_status_events").insert({
      appointment_id: appointmentId,
      status_from: current.status,
      status_to: "cancelled",
      note: args?.reason || "Cancelled by customer.",
    });
  const result = error
    ? { error: error.message }
    : { status: "cancelled", message: "Appointment cancelled successfully." };
  await logToolEvent(
    event,
    chatbotId,
    "cancel_appointment",
    args,
    result,
    context,
    { type: "appointment", id: appointmentId },
  );
  return result;
};

const loadPayableTarget = async (event: any, chatbotId: string, args: any) => {
  const supabase = getAdmin(event);
  const targetType = normalizeText(
    args?.target_type || "appointment",
  ).toLowerCase();
  const targetId = args?.target_id || args?.appointment_id || args?.order_id;

  if (!targetId || !["appointment", "order"].includes(targetType)) {
    return {
      error:
        "Payments are only available for verified appointment/booking or order records.",
    };
  }

  if (targetType === "order") {
    const { data: order } = await supabase
      .from("chatbot_orders")
      .select("id, total_amount, currency, payment_status, status")
      .eq("id", targetId)
      .eq("chatbot_id", chatbotId)
      .maybeSingle();
    if (!order) return { error: "Order not found for this assistant." };
    if (order.payment_status === "paid")
      return { error: "This order payment is already complete." };
    const amount = Number(order.total_amount || 0);
    if (!amount || amount <= 0)
      return { error: "This order does not have a payable amount configured." };
    return {
      targetType,
      targetId,
      amount,
      currency: order.currency || "RWF",
      record: order,
    };
  }

  const { data: appointment } = await supabase
    .from("chatbot_appointments")
    .select(
      "id, deposit_required, deposit_amount, currency, payment_status, status",
    )
    .eq("id", targetId)
    .eq("chatbot_id", chatbotId)
    .maybeSingle();
  if (!appointment)
    return { error: "Appointment not found for this assistant." };
  if (appointment.payment_status === "paid")
    return { error: "This appointment payment is already complete." };
  const amount = Number(
    appointment.deposit_required ? appointment.deposit_amount : 0,
  );
  if (!amount || amount <= 0)
    return {
      error:
        "This appointment does not have a payable deposit amount configured.",
    };
  return {
    targetType,
    targetId,
    amount,
    currency: appointment.currency || "RWF",
    record: appointment,
  };
};

export const paypackHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const phone = normalizeText(args?.phone || args?.customer_phone);
  if (!phone) {
    const result = { error: "Customer phone is required to request payment." };
    await logToolEvent(
      event,
      chatbotId,
      "request_payment",
      args,
      result,
      context,
    );
    return result;
  }

  const target = await loadPayableTarget(event, chatbotId, args);
  if (target.error) {
    const result = { error: target.error };
    await logToolEvent(
      event,
      chatbotId,
      "request_payment",
      args,
      result,
      context,
    );
    return result;
  }

  const { data: existingPayment } = await getAdmin(event)
    .from("chatbot_payments")
    .select("id, status")
    .eq("chatbot_id", chatbotId)
    .eq("target_type", target.targetType)
    .eq("target_id", target.targetId)
    .in("status", ["pending", "paid"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPayment?.status === "paid") {
    const result = { error: "This target is already paid." };
    await logToolEvent(
      event,
      chatbotId,
      "request_payment",
      args,
      result,
      context,
      { type: target.targetType, id: target.targetId },
    );
    return result;
  }
  if (existingPayment?.status === "pending") {
    const result = {
      error: "A payment request is already pending for this target.",
      payment_id: existingPayment.id,
    };
    await logToolEvent(
      event,
      chatbotId,
      "request_payment",
      args,
      result,
      context,
      { type: target.targetType, id: target.targetId },
    );
    return result;
  }

  const sharedWorkerBaseUrl = await getSharedPaymentWorkerBaseUrl(
    event,
    chatbotId,
  );
  if (sharedWorkerBaseUrl) {
    const supabase = getAdmin(event);
    const transactionRef = makePaymentTransactionRef(chatbotId, target);
    const workerRes = await fetch(`${sharedWorkerBaseUrl}/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "ReplySuite Business School Payment/1.0",
      },
      body: JSON.stringify({
        amount: target.amount,
        phone: normalizePhoneForPaypack(phone),
        transactionRef,
      }),
    });
    const workerText = await workerRes.text();
    let workerData: any = workerText;
    try {
      workerData = JSON.parse(workerText);
    } catch {}

    if (!workerRes.ok) {
      const result = {
        error: "MTN/Airtel mobile payment request failed.",
        details: workerData,
      };
      await logToolEvent(
        event,
        chatbotId,
        "request_payment",
        args,
        result,
        context,
        { type: target.targetType, id: target.targetId },
      );
      return result;
    }

    const providerRef = extractProviderRef(workerData, transactionRef);
    const { data: payment } = await supabase
      .from("chatbot_payments")
      .insert({
        chatbot_id: chatbotId,
        target_type: target.targetType,
        target_id: target.targetId,
        provider: "paypack",
        provider_ref: providerRef,
        amount: target.amount,
        currency: target.currency,
        phone,
        status: "pending",
        raw_response: {
          provider: "replysuite_mobile_payment_worker",
          transaction_ref: transactionRef,
          response: workerData,
        },
      })
      .select("id")
      .single();

    if (target.targetType === "appointment") {
      await supabase
        .from("chatbot_appointments")
        .update({ payment_status: "pending", status: "pending_payment" })
        .eq("id", target.targetId);
    } else if (target.targetType === "order") {
      await supabase
        .from("chatbot_orders")
        .update({ payment_status: "pending", status: "pending_payment" })
        .eq("id", target.targetId);
    }
    if (payment?.id) {
      await supabase.from("payment_status_events").insert({
        payment_id: payment.id,
        status_to: "pending",
        raw_event: workerData,
      });
    }

    const result = {
      success: true,
      payment_id: payment?.id,
      target_type: target.targetType,
      target_id: target.targetId,
      amount: target.amount,
      currency: target.currency,
      ref: providerRef,
      provider: "replysuite_mobile_payment_worker",
      message: "MTN/Airtel mobile payment prompt sent to the customer phone.",
    };
    await logToolEvent(
      event,
      chatbotId,
      "request_payment",
      args,
      result,
      context,
      { type: target.targetType, id: target.targetId },
    );
    return result;
  }

  const credentials = await getPaymentCredentials(event, chatbotId);
  if (!credentials.clientId || !credentials.clientSecret) {
    const result = {
      error: "Mobile payment is not configured for this assistant.",
    };
    await logToolEvent(
      event,
      chatbotId,
      "request_payment",
      args,
      result,
      context,
      { type: target.targetType, id: target.targetId },
    );
    return result;
  }

  const authRes = await fetch(
    "https://payments.paypack.rw/api/auth/agents/authorize",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }),
    },
  );
  const authData: any = await authRes.json().catch(() => ({}));
  if (!authRes.ok || !authData.access) {
    const result = {
      error: "Mobile payment authentication failed.",
      details: authData,
    };
    await logToolEvent(
      event,
      chatbotId,
      "request_payment",
      args,
      result,
      context,
      { type: target.targetType, id: target.targetId },
    );
    return result;
  }

  const cashinRes = await fetch(
    "https://payments.paypack.rw/api/transactions/cashin",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.access}`,
      },
      body: JSON.stringify({
        amount: target.amount,
        number: normalizePhoneForPaypack(phone),
      }),
    },
  );
  const cashinData: any = await cashinRes.json().catch(() => ({}));

  if (!cashinRes.ok || !cashinData.ref) {
    const result = {
      error: "Failed to initiate payment.",
      details: cashinData,
    };
    await logToolEvent(
      event,
      chatbotId,
      "request_payment",
      args,
      result,
      context,
      { type: target.targetType, id: target.targetId },
    );
    return result;
  }

  const supabase = getAdmin(event);
  const { data: payment } = await supabase
    .from("chatbot_payments")
    .insert({
      chatbot_id: chatbotId,
      target_type: target.targetType,
      target_id: target.targetId,
      provider: "paypack",
      provider_ref: cashinData.ref,
      amount: target.amount,
      currency: target.currency,
      phone,
      status: "pending",
      raw_response: cashinData,
    })
    .select("id")
    .single();

  if (target.targetType === "appointment") {
    await supabase
      .from("chatbot_appointments")
      .update({ payment_status: "pending", status: "pending_payment" })
      .eq("id", target.targetId);
  } else if (target.targetType === "order") {
    await supabase
      .from("chatbot_orders")
      .update({ payment_status: "pending", status: "pending_payment" })
      .eq("id", target.targetId);
  }
  if (payment?.id)
    await supabase.from("payment_status_events").insert({
      payment_id: payment.id,
      status_to: "pending",
      raw_event: cashinData,
    });

  const result = {
    success: true,
    payment_id: payment?.id,
    target_type: target.targetType,
    target_id: target.targetId,
    amount: target.amount,
    currency: target.currency,
    ref: cashinData.ref,
    message: "Payment prompt sent to the customer phone.",
  };
  await logToolEvent(
    event,
    chatbotId,
    "request_payment",
    args,
    result,
    context,
    { type: target.targetType, id: target.targetId },
  );
  return result;
};

export const checkPaymentStatusHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const supabase = getAdmin(event);
  let query = supabase
    .from("chatbot_payments")
    .select("*")
    .eq("chatbot_id", chatbotId);
  if (args?.payment_id) query = query.eq("id", args.payment_id);
  else if (args?.target_id || args?.appointment_id || args?.order_id) {
    query = query
      .eq(
        "target_type",
        normalizeText(
          args?.target_type || (args?.order_id ? "order" : "appointment"),
        ).toLowerCase(),
      )
      .eq(
        "target_id",
        args?.target_id || args?.appointment_id || args?.order_id,
      )
      .order("created_at", { ascending: false });
  } else {
    const result = { error: "payment_id or target_id is required." };
    await logToolEvent(
      event,
      chatbotId,
      "check_payment_status",
      args,
      result,
      context,
    );
    return result;
  }

  const { data, error } = await query.limit(1).maybeSingle();
  let deliveryLinks: any[] = [];
  if (!error && data?.status === "paid" && data?.target_type === "order") {
    const { data: order } = await supabase
      .from("chatbot_orders")
      .select("metadata")
      .eq("id", data.target_id)
      .eq("chatbot_id", chatbotId)
      .maybeSingle();
    deliveryLinks = Array.isArray(order?.metadata?.digital_delivery_items)
      ? order.metadata.digital_delivery_items
          .filter((item: any) => item?.delivery_url)
          .map((item: any) => ({ name: item.name, url: item.delivery_url }))
      : [];
  }
  const result = error
    ? { error: error.message }
    : data
      ? {
          payment: data,
          status: data.status,
          delivery_links: deliveryLinks,
          message:
            data.status === "paid" && deliveryLinks.length
              ? "Payment is confirmed. Share the delivery link with the customer."
              : undefined,
        }
      : { error: "Payment not found." };
  await logToolEvent(
    event,
    chatbotId,
    "check_payment_status",
    args,
    result,
    context,
    data ? { type: data.target_type, id: data.target_id } : undefined,
  );
  return result;
};

const makeShortCode = (length = 8) => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
};

const getPublicSiteUrl = () => {
  const config = useRuntimeConfig();
  const candidate = normalizeText(
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

const parseCatalogFileKey = (product: any) => {
  const meta = parseCatalogMeta(product);
  const raw = normalizeText(
    product?.file_key ||
      meta.file_key ||
      meta.r2_key ||
      meta.delivery_url ||
      product?.delivery_url,
  );
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const marker = "/asset/";
    const index = url.pathname.indexOf(marker);
    return decodeURIComponent(
      index >= 0
        ? url.pathname.slice(index + marker.length)
        : url.pathname.replace(/^\/+/, ""),
    );
  } catch {
    return raw.replace(/^\/+/, "");
  }
};

export const ensureBusinessDeliveryLinks = async (
  event: any,
  chatbotId: string,
  orderId: string,
) => {
  const supabase = getAdmin(event);
  const { data: existing } = await supabase
    .from("business_delivery_links")
    .select(
      "short_code, file_key, status, expires_at, download_count, max_downloads",
    )
    .eq("chatbot_id", chatbotId)
    .eq("order_id", orderId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (existing?.length) return existing;

  const { data: order } = await supabase
    .from("business_orders")
    .select("id, customer_phone, payment_status, metadata")
    .eq("id", orderId)
    .eq("chatbot_id", chatbotId)
    .maybeSingle();
  if (!order || order.payment_status !== "paid") return [];

  const { data: items } = await supabase
    .from("business_order_items")
    .select("product_id, name, metadata")
    .eq("order_id", orderId);

  const rows = (items || [])
    .map((item: any) => ({
      chatbot_id: chatbotId,
      order_id: orderId,
      product_id: item.product_id || null,
      customer_phone: order.customer_phone || null,
      short_code: makeShortCode(8),
      token_hash: null,
      file_key: normalizeText(item.metadata?.file_key),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      max_downloads: 3,
      status: "active",
    }))
    .filter((row: any) => row.file_key);

  if (!rows.length) return [];
  const { data: created } = await supabase
    .from("business_delivery_links")
    .insert(rows)
    .select(
      "short_code, file_key, status, expires_at, download_count, max_downloads",
    );
  if (created?.length) {
    await supabase.from("business_delivery_events").insert(
      created.map((link: any) => ({
        order_id: orderId,
        event_type: "created",
        metadata: { short_code: link.short_code },
      })),
    );
  }
  return created || [];
};

export const publicDeliveryLinks = (links: any[]) =>
  (links || []).map(
    (link: any) => `${getPublicSiteUrl()}/d/${link.short_code}`,
  );

export const getBusinessProductsHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const supabase = getAdmin(event);
  let query = supabase
    .from("business_products")
    .select(
      "id, name, description, category, price, currency, file_key, is_paid, sales_notes, is_active",
    )
    .eq("chatbot_id", chatbotId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (args?.category) query = query.ilike("category", `%${args.category}%`);
  const { data, error } = await query;
  if (!error && data?.length) {
    const result = {
      items: data.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        price: Number(item.price || 0),
        currency: item.currency || "RWF",
        is_paid: item.is_paid !== false,
        sales_notes: item.sales_notes || null,
      })),
    };
    await logToolEvent(
      event,
      chatbotId,
      "get_business_products",
      args,
      result,
      context,
    );
    return result;
  }

  const legacy = await getMenuHandler(event, chatbotId, args, context);
  await logToolEvent(
    event,
    chatbotId,
    "get_business_products",
    args,
    legacy,
    context,
  );
  return legacy;
};

const resolveBusinessItems = async (
  event: any,
  chatbotId: string,
  items: any[] = [],
) => {
  const supabase = getAdmin(event);
  let { data: products } = await supabase
    .from("business_products")
    .select(
      "id, name, description, price, currency, file_key, is_paid, sales_notes, is_active",
    )
    .eq("chatbot_id", chatbotId)
    .eq("is_active", true);

  if (!products?.length) {
    const { data: legacy } = await supabase
      .from("chatbot_catalog")
      .select("id, name, description, price, currency, sku, is_available")
      .eq("chatbot_id", chatbotId)
      .eq("is_available", true);
    products = (legacy || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: Number(item.price || 0),
      currency: item.currency || "RWF",
      file_key: parseCatalogFileKey(item),
      is_paid: catalogIsPaid(item),
      sales_notes: catalogSalesNotes(item),
      is_active: true,
      legacy_catalog_id: item.id,
    }));
  }

  if (!products?.length)
    return {
      error: "No business products are available.",
      orderItems: [],
      total: 0,
      currency: "RWF",
    };

  let total = 0;
  const missing: string[] = [];
  const orderItems = items
    .map((item: any) => {
      const ident = normalizeText(
        item.product_name_or_id || item.product_id || item.name,
      ).toLowerCase();
      const qty = Math.max(
        1,
        Math.floor(toNumber(item.qty ?? item.quantity, 1)),
      );
      const product = products.find(
        (prod: any) =>
          prod.id?.toLowerCase() === ident ||
          prod.name?.toLowerCase() === ident,
      );
      if (!product) {
        missing.push(ident || "unknown item");
        return null;
      }
      const price = toNumber(product.price);
      const lineTotal = price * qty;
      total += lineTotal;
      return {
        product_id: product.legacy_catalog_id ? null : product.id,
        legacy_catalog_id: product.legacy_catalog_id || null,
        name: product.name,
        description: product.description,
        unit_price: price,
        quantity: qty,
        line_total: lineTotal,
        currency: product.currency || "RWF",
        file_key: normalizeText(product.file_key),
        is_paid: product.is_paid !== false,
      };
    })
    .filter(Boolean);

  return {
    error: missing.length
      ? `Some products were not found: ${missing.join(", ")}`
      : null,
    orderItems,
    total,
    currency: orderItems[0]?.currency || "RWF",
  };
};

export const createBusinessOrderHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const items = Array.isArray(args?.items) ? args.items : [];
  if (!items.length) {
    const result = {
      error: "Choose at least one business product before creating an order.",
    };
    await logToolEvent(
      event,
      chatbotId,
      "create_business_order",
      args,
      result,
      context,
    );
    return result;
  }
  const resolved = await resolveBusinessItems(event, chatbotId, items);
  if (resolved.error) {
    const result = { error: resolved.error };
    await logToolEvent(
      event,
      chatbotId,
      "create_business_order",
      args,
      result,
      context,
    );
    return result;
  }
  const hasPaidItems = resolved.orderItems.some((item: any) => item.is_paid);
  const paymentStatus = hasPaidItems ? "unpaid" : "not_required";
  const status = hasPaidItems ? "pending_payment" : "completed";
  const supabase = getAdmin(event);
  const { data: bot } = await supabase
    .from("chatbots")
    .select("user_id")
    .eq("id", chatbotId)
    .maybeSingle();
  const { data: order, error } = await supabase
    .from("business_orders")
    .insert({
      chatbot_id: chatbotId,
      owner_id: bot?.user_id || null,
      chat_session_id: context?.sessionId || null,
      customer_phone: args?.phone || args?.customer_phone || null,
      customer_name: args?.name || args?.customer_name || null,
      customer_email: args?.email || args?.customer_email || null,
      status,
      payment_status: paymentStatus,
      subtotal: resolved.total,
      total_amount: resolved.total,
      currency: resolved.currency,
      source_channel: normalizeChannel(context),
      metadata: { created_by: "agent_tool", source: "business_flow" },
    })
    .select("id, total_amount, currency, status, payment_status")
    .single();
  if (error) {
    if (String(error.message || "").includes("business_orders")) {
      return createOrderHandler(event, chatbotId, args, context);
    }
    const result = { error: error.message };
    await logToolEvent(
      event,
      chatbotId,
      "create_business_order",
      args,
      result,
      context,
    );
    return result;
  }
  await supabase.from("business_order_items").insert(
    resolved.orderItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
      currency: item.currency,
      metadata: {
        file_key: item.file_key,
        legacy_catalog_id: item.legacy_catalog_id,
        is_paid: item.is_paid,
      },
    })),
  );
  const result = {
    success: true,
    order_id: order.id,
    target_type: "business_order",
    amount: Number(order.total_amount || 0),
    currency: order.currency || "RWF",
    payment_status: order.payment_status,
    message: hasPaidItems
      ? "Business order created. Request MTN/Airtel mobile payment next."
      : "Business order created. Free delivery can be prepared.",
  };
  await logToolEvent(
    event,
    chatbotId,
    "create_business_order",
    args,
    result,
    context,
    { type: "business_order", id: order.id },
  );
  return result;
};

export const requestBusinessPaymentHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const phone = normalizeText(args?.phone || args?.customer_phone);
  const orderId = normalizeText(args?.order_id || args?.target_id);
  if (!phone || !orderId) {
    const result = {
      error: "Business order ID and customer phone are required.",
    };
    await logToolEvent(
      event,
      chatbotId,
      "request_business_payment",
      args,
      result,
      context,
    );
    return result;
  }
  const supabase = getAdmin(event);
  const { data: order, error: orderError } = await supabase
    .from("business_orders")
    .select("id, total_amount, currency, payment_status, status")
    .eq("id", orderId)
    .eq("chatbot_id", chatbotId)
    .maybeSingle();
  if (
    orderError &&
    String(orderError.message || "").includes("business_orders")
  ) {
    return paypackHandler(
      event,
      chatbotId,
      { ...args, target_type: "order", order_id: orderId },
      context,
    );
  }
  if (!order) return { error: "Business order not found." };
  if (order.payment_status === "paid")
    return { error: "This business order is already paid." };
  const amount = Number(order.total_amount || 0);
  if (!amount)
    return { error: "This business order does not have a payable amount." };

  const { data: existingPayment } = await supabase
    .from("business_payments")
    .select("id, status")
    .eq("chatbot_id", chatbotId)
    .eq("order_id", orderId)
    .in("status", ["pending", "paid"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingPayment?.status === "pending")
    return {
      error: "A payment request is already pending for this business order.",
      payment_id: existingPayment.id,
    };
  if (existingPayment?.status === "paid")
    return {
      error: "This business order is already paid.",
      payment_id: existingPayment.id,
    };

  const sharedWorkerBaseUrl = await getSharedPaymentWorkerBaseUrl(
    event,
    chatbotId,
  );
  if (!sharedWorkerBaseUrl)
    return { error: "MTN/Airtel mobile payment is not configured." };
  const target = {
    targetType: "business_order",
    targetId: orderId,
    amount,
    currency: order.currency || "RWF",
  };
  const transactionRef = makePaymentTransactionRef(chatbotId, target);
  const workerRes = await fetch(`${sharedWorkerBaseUrl}/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "ReplySuite Business Payment/1.0",
    },
    body: JSON.stringify({
      amount,
      phone: normalizePhoneForPaypack(phone),
      transactionRef,
    }),
  });
  const workerText = await workerRes.text();
  let workerData: any = workerText;
  try {
    workerData = JSON.parse(workerText);
  } catch {}
  if (!workerRes.ok)
    return {
      error: "MTN/Airtel mobile payment request failed.",
      details: workerData,
    };
  const providerRef = extractProviderRef(workerData, transactionRef);
  const { data: payment } = await supabase
    .from("business_payments")
    .insert({
      chatbot_id: chatbotId,
      order_id: orderId,
      provider_ref: providerRef,
      amount,
      currency: order.currency || "RWF",
      customer_phone: phone,
      status: "pending",
      raw_response: {
        provider: "replysuite_mobile_payment_worker",
        transaction_ref: transactionRef,
        response: workerData,
      },
    })
    .select("id")
    .single();
  await supabase
    .from("business_orders")
    .update({
      payment_status: "pending",
      status: "pending_payment",
      customer_phone: phone,
    })
    .eq("id", orderId);
  const result = {
    success: true,
    payment_id: payment?.id,
    order_id: orderId,
    amount,
    currency: order.currency || "RWF",
    provider: "replysuite_mobile_payment_worker",
    message: "MTN/Airtel mobile payment prompt sent to the customer phone.",
  };
  await logToolEvent(
    event,
    chatbotId,
    "request_business_payment",
    args,
    result,
    context,
    { type: "business_order", id: orderId },
  );
  return result;
};

export const checkBusinessPaymentHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const supabase = getAdmin(event);
  let query = supabase
    .from("business_payments")
    .select("*")
    .eq("chatbot_id", chatbotId);
  if (args?.payment_id) query = query.eq("id", args.payment_id);
  else if (args?.order_id || args?.target_id) {
    query = query
      .eq("order_id", args.order_id || args.target_id)
      .order("created_at", { ascending: false });
  } else return { error: "payment_id or order_id is required." };

  const { data, error } = await query.limit(1).maybeSingle();
  if (error && String(error.message || "").includes("business_payments")) {
    return checkPaymentStatusHandler(
      event,
      chatbotId,
      { ...args, target_type: "order" },
      context,
    );
  }
  if (error) return { error: error.message };
  if (!data) return { error: "Business payment not found." };

  let paymentRecord = data;
  if (paymentRecord.status === "pending") {
    const verified = await verifySharedWorkerPayment(
      event,
      chatbotId,
      paymentRecord,
    );
    if (verified?.status) {
      const nextRawResponse = {
        ...(paymentRecord.raw_response || {}),
        latest_verify: verified.response,
        latest_verify_at: verified.verified_at,
      };
      const updatePayload: any = {
        raw_response: nextRawResponse,
      };
      if (
        ["paid", "failed", "cancelled", "expired", "refunded"].includes(
          verified.status,
        )
      ) {
        updatePayload.status = verified.status;
        if (verified.status === "paid")
          updatePayload.paid_at = verified.verified_at;
      }
      const { data: updatedPayment } = await supabase
        .from("business_payments")
        .update(updatePayload)
        .eq("id", paymentRecord.id)
        .select("*")
        .maybeSingle();
      if (updatedPayment) paymentRecord = updatedPayment;
    }
  }

  let links: string[] = [];
  if (paymentRecord.status === "paid") {
    await supabase
      .from("business_orders")
      .update({ payment_status: "paid", status: "completed" })
      .eq("id", paymentRecord.order_id)
      .eq("chatbot_id", chatbotId);
    links = publicDeliveryLinks(
      await ensureBusinessDeliveryLinks(
        event,
        chatbotId,
        paymentRecord.order_id,
      ),
    );
  } else if (
    ["failed", "cancelled", "expired", "refunded"].includes(
      paymentRecord.status,
    )
  ) {
    await supabase
      .from("business_orders")
      .update({
        payment_status:
          paymentRecord.status === "refunded" ? "refunded" : "failed",
      })
      .eq("id", paymentRecord.order_id)
      .eq("chatbot_id", chatbotId);
  }

  const result = {
    payment: paymentRecord,
    status: paymentRecord.status,
    delivery_links: links,
    message:
      paymentRecord.status === "paid" && links.length
        ? "Payment is confirmed. Share the short protected delivery link with the customer. Do not share raw file URLs."
        : undefined,
  };
  await logToolEvent(
    event,
    chatbotId,
    "check_business_payment",
    args,
    result,
    context,
    { type: "business_order", id: data.order_id },
  );
  return result;
};

const getDefaultSchoolPlanFromConfig = async (
  event: any,
  chatbotId: string,
) => {
  const config = await getChatbotToolConfig(event, chatbotId);
  const school = config?.school_flow || {};
  return {
    id: "default",
    name: school.plan_name || school.name || "AI Tutor Session",
    description:
      school.description ||
      "A paid chat-only tutor session using the assistant's trained school content.",
    price: toNumber(school.price, 1000),
    currency: school.currency || "RWF",
    duration_minutes: Math.max(
      1,
      Math.floor(toNumber(school.duration_minutes, 30)),
    ),
    default_question_count: Math.max(
      1,
      Math.floor(toNumber(school.default_question_count, 10)),
    ),
    allow_student_question_count: school.allow_student_question_count !== false,
    min_question_count: Math.max(
      1,
      Math.floor(toNumber(school.min_question_count, 5)),
    ),
    max_question_count: Math.max(
      1,
      Math.floor(toNumber(school.max_question_count, 20)),
    ),
    quiz_delivery_mode: school.quiz_delivery_mode || "let_student_choose",
  };
};

export const listSchoolTutorPlansHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const supabase = getAdmin(event);
  const { data, error } = await supabase
    .from("school_tutor_plans")
    .select(
      "id, name, description, price, currency, duration_minutes, default_question_count, allow_student_question_count, min_question_count, max_question_count, quiz_delivery_mode",
    )
    .eq("chatbot_id", chatbotId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  const plans =
    !error && data?.length
      ? data
      : [await getDefaultSchoolPlanFromConfig(event, chatbotId)];
  const result = { plans };
  await logToolEvent(
    event,
    chatbotId,
    "list_school_tutor_plans",
    args,
    result,
    context,
  );
  return result;
};

export const createSchoolTutorSessionHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const supabase = getAdmin(event);
  const { data: bot } = await supabase
    .from("chatbots")
    .select("user_id")
    .eq("id", chatbotId)
    .maybeSingle();
  let plan: any = null;
  if (args?.plan_id && args.plan_id !== "default") {
    const { data } = await supabase
      .from("school_tutor_plans")
      .select("*")
      .eq("id", args.plan_id)
      .eq("chatbot_id", chatbotId)
      .maybeSingle();
    plan = data;
  }
  if (!plan) plan = await getDefaultSchoolPlanFromConfig(event, chatbotId);

  const { data: session, error } = await supabase
    .from("school_tutor_sessions")
    .insert({
      chatbot_id: chatbotId,
      owner_id: bot?.user_id || null,
      plan_id: plan.id === "default" ? null : plan.id,
      chat_session_id: context?.sessionId || null,
      student_name: args?.student_name || args?.name || null,
      student_phone:
        args?.student_phone || args?.phone || context?.customerPhone || null,
      student_email: args?.student_email || args?.email || null,
      status: "pending_payment",
      payment_status: "unpaid",
      duration_minutes: plan.duration_minutes || 30,
      metadata: {
        plan_name: plan.name,
        default_question_count: plan.default_question_count,
        allow_student_question_count: plan.allow_student_question_count,
        min_question_count: plan.min_question_count,
        max_question_count: plan.max_question_count,
        quiz_delivery_mode: plan.quiz_delivery_mode,
      },
    })
    .select("id, status, payment_status, duration_minutes")
    .single();
  if (error) return { error: error.message };
  const result = {
    success: true,
    school_session_id: session.id,
    amount: Number(plan.price || 0),
    currency: plan.currency || "RWF",
    duration_minutes: session.duration_minutes,
    message:
      "School tutor session created. Request MTN/Airtel mobile payment next. The session remains inside this chat; no external link is used.",
  };
  await logToolEvent(
    event,
    chatbotId,
    "create_school_tutor_session",
    args,
    result,
    context,
    { type: "school_tutor_session", id: session.id },
  );
  return result;
};

export const requestSchoolTutorPaymentHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const phone = normalizeText(
    args?.phone || args?.student_phone || context?.customerPhone,
  );
  const schoolSessionId = normalizeText(
    args?.school_session_id || args?.session_id,
  );
  if (!phone || !schoolSessionId)
    return { error: "School session ID and student phone are required." };
  const supabase = getAdmin(event);
  const { data: session } = await supabase
    .from("school_tutor_sessions")
    .select("id, plan_id, payment_status, status, duration_minutes, metadata")
    .eq("id", schoolSessionId)
    .eq("chatbot_id", chatbotId)
    .maybeSingle();
  if (!session) return { error: "School tutor session not found." };
  if (session.payment_status === "paid")
    return { error: "This school tutor session is already paid." };
  let plan: any = null;
  if (session.plan_id) {
    const { data } = await supabase
      .from("school_tutor_plans")
      .select("price, currency")
      .eq("id", session.plan_id)
      .maybeSingle();
    plan = data;
  }
  if (!plan) plan = await getDefaultSchoolPlanFromConfig(event, chatbotId);
  const amount = Number(plan.price || 0);
  if (!amount)
    return { error: "This school tutor plan does not have a payable amount." };

  const { data: existingPayment } = await supabase
    .from("school_tutor_payments")
    .select("id, status")
    .eq("chatbot_id", chatbotId)
    .eq("school_session_id", schoolSessionId)
    .in("status", ["pending", "paid"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingPayment?.status === "pending")
    return {
      error: "A payment request is already pending for this school session.",
      payment_id: existingPayment.id,
    };
  if (existingPayment?.status === "paid")
    return {
      error: "This school session is already paid.",
      payment_id: existingPayment.id,
    };

  const sharedWorkerBaseUrl = await getSharedPaymentWorkerBaseUrl(
    event,
    chatbotId,
  );
  if (!sharedWorkerBaseUrl)
    return { error: "MTN/Airtel mobile payment is not configured." };
  const target = {
    targetType: "school_tutor_session",
    targetId: schoolSessionId,
    amount,
    currency: plan.currency || "RWF",
  };
  const transactionRef = makePaymentTransactionRef(chatbotId, target);
  const workerRes = await fetch(`${sharedWorkerBaseUrl}/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "ReplySuite School Payment/1.0",
    },
    body: JSON.stringify({
      amount,
      phone: normalizePhoneForPaypack(phone),
      transactionRef,
    }),
  });
  const workerText = await workerRes.text();
  let workerData: any = workerText;
  try {
    workerData = JSON.parse(workerText);
  } catch {}
  if (!workerRes.ok)
    return {
      error: "MTN/Airtel mobile payment request failed.",
      details: workerData,
    };
  const providerRef = extractProviderRef(workerData, transactionRef);
  const { data: payment } = await supabase
    .from("school_tutor_payments")
    .insert({
      chatbot_id: chatbotId,
      school_session_id: schoolSessionId,
      provider_ref: providerRef,
      amount,
      currency: plan.currency || "RWF",
      student_phone: phone,
      status: "pending",
      raw_response: {
        provider: "replysuite_mobile_payment_worker",
        transaction_ref: transactionRef,
        response: workerData,
      },
    })
    .select("id")
    .single();
  await supabase
    .from("school_tutor_sessions")
    .update({
      payment_status: "pending",
      status: "pending_payment",
      student_phone: phone,
    })
    .eq("id", schoolSessionId);
  const result = {
    success: true,
    payment_id: payment?.id,
    school_session_id: schoolSessionId,
    amount,
    currency: plan.currency || "RWF",
    message:
      "MTN/Airtel mobile payment prompt sent. The tutor session starts in this chat after payment is confirmed.",
  };
  await logToolEvent(
    event,
    chatbotId,
    "request_school_tutor_payment",
    args,
    result,
    context,
    { type: "school_tutor_session", id: schoolSessionId },
  );
  return result;
};

export const checkSchoolTutorPaymentHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  const supabase = getAdmin(event);
  let query = supabase
    .from("school_tutor_payments")
    .select("*")
    .eq("chatbot_id", chatbotId);
  if (args?.payment_id) query = query.eq("id", args.payment_id);
  else if (args?.school_session_id || args?.session_id)
    query = query
      .eq("school_session_id", args.school_session_id || args.session_id)
      .order("created_at", { ascending: false });
  else return { error: "payment_id or school_session_id is required." };
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "School tutor payment not found." };

  let paymentRecord = data;
  if (paymentRecord.status === "pending") {
    const verified = await verifySharedWorkerPayment(
      event,
      chatbotId,
      paymentRecord,
    );
    if (verified?.status) {
      const nextRawResponse = {
        ...(paymentRecord.raw_response || {}),
        latest_verify: verified.response,
        latest_verify_at: verified.verified_at,
      };
      const updatePayload: any = {
        raw_response: nextRawResponse,
      };
      if (
        ["paid", "failed", "cancelled", "expired", "refunded"].includes(
          verified.status,
        )
      ) {
        updatePayload.status = verified.status;
        if (verified.status === "paid")
          updatePayload.paid_at = verified.verified_at;
      }
      const { data: updatedPayment } = await supabase
        .from("school_tutor_payments")
        .update(updatePayload)
        .eq("id", paymentRecord.id)
        .select("*")
        .maybeSingle();
      if (updatedPayment) paymentRecord = updatedPayment;
    }
  }

  let sessionUpdate: any = null;
  if (paymentRecord.status === "paid") {
    const { data: session } = await supabase
      .from("school_tutor_sessions")
      .select("id, status, duration_minutes, started_at, expires_at")
      .eq("id", paymentRecord.school_session_id)
      .eq("chatbot_id", chatbotId)
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
      sessionUpdate = updated;
    } else sessionUpdate = session;
  } else if (
    ["failed", "cancelled", "expired", "refunded"].includes(
      paymentRecord.status,
    )
  ) {
    await supabase
      .from("school_tutor_sessions")
      .update({
        payment_status:
          paymentRecord.status === "refunded" ? "refunded" : "failed",
      })
      .eq("id", paymentRecord.school_session_id)
      .eq("chatbot_id", chatbotId);
  }
  const result = {
    payment: paymentRecord,
    status: paymentRecord.status,
    school_session: sessionUpdate,
    message:
      paymentRecord.status === "paid"
        ? "Payment is confirmed. Continue the tutoring session inside this chat. Do not send an external school link."
        : undefined,
  };
  await logToolEvent(
    event,
    chatbotId,
    "check_school_tutor_payment",
    args,
    result,
    context,
    { type: "school_tutor_session", id: data.school_session_id },
  );
  return result;
};

export const sendWhatsAppMenuHandler = async (
  event: any,
  chatbotId: string,
  args: any,
  context?: ToolContext,
) => {
  if (!context || context.platform !== "whatsapp") {
    return { error: "This tool is only available for WhatsApp interactions." };
  }

  const { phoneId, whatsappToken, customerPhone } = context;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: customerPhone,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: args.header || "Menu" },
      body: { text: args.body || "Please select an option below." },
      footer: { text: "Powered by ReplySuite" },
      action: {
        button: args.button_text || "View Options",
        sections: [
          {
            title: args.section_title || "Options",
            rows: (args.options || []).map((opt: any) => ({
              id: opt.id,
              title: opt.title,
              description: opt.description,
            })),
          },
        ],
      },
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    const data: any = await res.json();
    if (data.error) throw new Error(data.error.message);
    const result = {
      success: true,
      message: "Interactive menu sent successfully.",
    };
    await logToolEvent(
      event,
      chatbotId,
      "send_whatsapp_menu",
      args,
      result,
      context,
    );
    return result;
  } catch (err: any) {
    console.error("[WhatsApp Menu Tool Error]", err.message);
    const result = { error: err.message };
    await logToolEvent(
      event,
      chatbotId,
      "send_whatsapp_menu",
      args,
      result,
      context,
    );
    return result;
  }
};
