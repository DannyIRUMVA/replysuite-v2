import { serverSupabaseServiceRole } from "#supabase/server";

const normalizeCode = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64);

const mediaAssetUrl = (event: any, fileKey: string) => {
  const config = useRuntimeConfig(event);
  const base = String(
    (config as any).replySuiteMediaWorkerUrl ||
      process.env.REPLYSUITE_MEDIA_WORKER_URL ||
      "https://replysuite-media-worker.boyg87059.workers.dev",
  ).replace(/\/+$/, "");
  return `${base}/asset/${fileKey.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/")}`;
};

const mediaWorkerAuthHeaders = (event: any) => {
  const config = useRuntimeConfig(event);
  const secret = String(
    (config as any).replySuiteMediaWorkerSecret ||
      process.env.REPLYSUITE_MEDIA_WORKER_SECRET ||
      process.env.MEDIA_WORKER_SECRET ||
      "",
  ).trim();
  return secret ? { Authorization: `Bearer ${secret}` } : undefined;
};

const denied = async (
  supabase: any,
  link: any | null,
  reason: string,
  status = 404,
) => {
  if (link?.id) {
    await supabase.from("business_delivery_events").insert({
      delivery_link_id: link.id,
      order_id: link.order_id,
      product_id: link.product_id,
      event_type: "blocked",
      metadata: { reason },
    });
  }
  throw createError({ statusCode: status, statusMessage: reason });
};

export default defineEventHandler(async (event) => {
  const code = normalizeCode(getRouterParam(event, "code"));
  if (!code) throw createError({ statusCode: 404, statusMessage: "Not found" });

  const supabase = serverSupabaseServiceRole(event);
  const { data: link, error } = await supabase
    .from("business_delivery_links")
    .select(
      "id, chatbot_id, order_id, product_id, short_code, status, file_key, expires_at, max_downloads, download_count",
    )
    .eq("short_code", code)
    .maybeSingle();

  if (error)
    throw createError({
      statusCode: 500,
      statusMessage: "Unable to load delivery link",
    });
  if (!link) throw createError({ statusCode: 404, statusMessage: "Not found" });
  if (link.status !== "active")
    await denied(
      supabase,
      link,
      "This download link is no longer active.",
      410,
    );
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    await supabase
      .from("business_delivery_links")
      .update({ status: "expired" })
      .eq("id", link.id);
    await denied(supabase, link, "This download link has expired.", 410);
  }
  if (Number(link.download_count || 0) >= Number(link.max_downloads || 1)) {
    await denied(
      supabase,
      link,
      "This download link has reached its download limit.",
      410,
    );
  }

  const { data: order } = await supabase
    .from("business_orders")
    .select("id, payment_status, status")
    .eq("id", link.order_id)
    .eq("chatbot_id", link.chatbot_id)
    .maybeSingle();
  if (!order || order.payment_status !== "paid")
    await denied(
      supabase,
      link,
      "Payment is not confirmed for this download.",
      403,
    );

  const upstream = await fetch(mediaAssetUrl(event, link.file_key), {
    headers: mediaWorkerAuthHeaders(event),
  });
  if (!upstream.ok || !upstream.body)
    await denied(
      supabase,
      link,
      "The file is not available. Please contact support.",
      404,
    );

  const nextCount = Number(link.download_count || 0) + 1;
  await supabase
    .from("business_delivery_links")
    .update({
      download_count: nextCount,
      last_accessed_at: new Date().toISOString(),
      status: nextCount >= Number(link.max_downloads || 1) ? "used" : "active",
    })
    .eq("id", link.id);
  await supabase.from("business_delivery_events").insert({
    delivery_link_id: link.id,
    order_id: link.order_id,
    product_id: link.product_id,
    event_type: "downloaded",
    metadata: { download_count: nextCount },
  });

  const headers = new Headers(upstream.headers);
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.delete("access-control-allow-origin");

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
});
