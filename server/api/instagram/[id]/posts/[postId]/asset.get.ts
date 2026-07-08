import { serverSupabaseServiceRole } from "#supabase/server";
import { isUuid } from "~~/server/utils/public-chatbot";

const svgFallback = (label = "POST") => {
  const cleanLabel =
    String(label || "POST")
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 6)
      .toUpperCase() || "POST";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#D4AF37"/><stop offset="1" stop-color="#F3D36B"/></linearGradient></defs><rect width="640" height="640" rx="96" fill="#0B0B0B"/><rect x="24" y="24" width="592" height="592" rx="80" fill="url(#g)" opacity=".92"/><circle cx="320" cy="260" r="72" fill="#0B0B0B" opacity=".18"/><path d="M188 430c34-70 76-105 126-105 39 0 67 19 96 58l32 43h70" fill="none" stroke="#0B0B0B" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" opacity=".22"/><text x="320" y="530" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="44" font-weight="900" fill="#0B0B0B">${cleanLabel}</text></svg>`;
};

export default defineEventHandler(async (event) => {
  const accountId = getRouterParam(event, "id") || "";
  const postId = getRouterParam(event, "postId") || "";

  if (!isUuid(accountId))
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid Instagram account ID.",
    });
  if (!postId)
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid Instagram post ID.",
    });

  const supabase = serverSupabaseServiceRole(event);
  const { data: post, error } = await supabase
    .from("instagram_posts")
    .select("id, instagram_account_id, media_type, media_url, thumbnail_url")
    .eq("id", postId)
    .eq("instagram_account_id", accountId)
    .maybeSingle();

  if (error) throw error;

  const fallback = svgFallback(post?.media_type || "POST");
  const assetUrl = post?.thumbnail_url || post?.media_url;

  if (!assetUrl) {
    setHeader(event, "content-type", "image/svg+xml; charset=utf-8");
    setHeader(event, "cache-control", "public, max-age=300");
    return fallback;
  }

  try {
    const response = await fetch(assetUrl);

    if (!response.ok) {
      const isExpectedInstagramFallback = [401, 403, 404, 410].includes(
        response.status,
      );

      if (!isExpectedInstagramFallback) {
        console.warn(
          "[Instagram Asset] Falling back to generated post asset.",
          {
            status: response.status,
            statusText: response.statusText,
          },
        );
      }

      setHeader(event, "content-type", "image/svg+xml; charset=utf-8");
      setHeader(event, "cache-control", "public, max-age=300");
      return fallback;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const bytes = await response.arrayBuffer();
    setHeader(event, "content-type", contentType);
    setHeader(event, "cache-control", "public, max-age=1800");
    return new Uint8Array(bytes);
  } catch (error) {
    console.warn(
      "[Instagram Asset] Falling back to generated post asset.",
      error,
    );
    setHeader(event, "content-type", "image/svg+xml; charset=utf-8");
    setHeader(event, "cache-control", "public, max-age=300");
    return fallback;
  }
});
