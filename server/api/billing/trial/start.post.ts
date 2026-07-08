import {
  serverSupabaseServiceRole,
  serverSupabaseUser,
} from "#supabase/server";
import {
  deactivateOtherActiveMemberships,
  isMembershipCurrentlyUsable,
  isPaidPlanSlug,
  isTrialingMembership,
} from "~~/server/utils/membership";

const TRIAL_DAYS = 3;
const TRIALABLE_PLANS = new Set(["silver", "gold", "enterprise-ready"]);
const sanitizePlanId = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .slice(0, 80);

const isUserEmailVerified = (user: any, profile: any) => {
  if (profile?.is_verified) return true;
  const appMeta = user?.app_metadata || {};
  const providers = Array.isArray(appMeta.providers) ? appMeta.providers : [];
  if (providers.includes("google") || appMeta.provider === "google")
    return true;
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
};

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const userId = (user as any)?.id || (user as any)?.sub;
  if (!userId)
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid user session",
    });

  const body = await readBody(event);
  const planId = sanitizePlanId(body?.planId || body?.plan_id);

  if (!TRIALABLE_PLANS.has(planId)) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Choose Silver, Gold, or Enterprise Ready to start a trial.",
    });
  }

  const adminClient = serverSupabaseServiceRole(event);

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, is_verified")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.warn(
      "[Trial Start] Profile verification lookup failed:",
      profileError,
    );
  }

  if (!isUserEmailVerified(user, profile)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Verify your email before starting a trial.",
    });
  }

  const { data: memberships, error: membershipsError } = await adminClient
    .from("user_memberships")
    .select("*, plans(internal_slug)")
    .eq("user_id", userId);

  if (membershipsError) {
    console.warn("[Trial Start] Membership lookup failed:", membershipsError);
    throw createError({
      statusCode: 500,
      statusMessage: "Could not check your current plan.",
    });
  }

  const usableMemberships = (memberships || []).filter((membership: any) =>
    isMembershipCurrentlyUsable(membership),
  );
  const hasActivePaidPlan = usableMemberships.some((membership: any) => {
    const slug = String(
      (membership?.plans as any)?.internal_slug || "",
    ).toLowerCase();
    return isPaidPlanSlug(slug) && !isTrialingMembership(membership);
  });

  if (hasActivePaidPlan) {
    throw createError({
      statusCode: 409,
      statusMessage: "You already have an active paid plan.",
    });
  }

  const hasUsedTrial = (memberships || []).some((membership: any) =>
    isTrialingMembership(membership),
  );
  if (hasUsedTrial) {
    throw createError({
      statusCode: 409,
      statusMessage: "Your free trial has already been used.",
    });
  }

  const { data: plan, error: planError } = await adminClient
    .from("plans")
    .select("id, name, display_name, internal_slug")
    .eq("internal_slug", planId)
    .maybeSingle();

  if (planError || !plan?.id) {
    console.warn("[Trial Start] Plan lookup failed:", planError);
    throw createError({
      statusCode: 500,
      statusMessage: "Could not prepare the selected trial plan.",
    });
  }

  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setUTCDate(trialEnd.getUTCDate() + TRIAL_DAYS);

  const { data: membership, error: insertError } = await adminClient
    .from("user_memberships")
    .insert({
      user_id: userId,
      plan_id: plan.id,
      is_active: true,
      amount: 0,
      starts_at: now.toISOString(),
      ends_at: trialEnd.toISOString(),
      status: "trialing",
      provider: "trial",
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEnd.toISOString(),
      metadata: {
        source: "dashboard_onboarding",
        trial_days: TRIAL_DAYS,
        plan_slug: planId,
      },
    })
    .select("*, plans(*)")
    .single();

  if (insertError || !membership) {
    console.warn("[Trial Start] Trial membership insert failed:", insertError);
    throw createError({
      statusCode: 500,
      statusMessage: "Could not start your trial.",
    });
  }

  const { error: deactivateError } = await deactivateOtherActiveMemberships(
    adminClient,
    userId,
    membership.id,
  );
  if (deactivateError) {
    console.warn("[Trial Start] Membership cleanup failed:", deactivateError);
  }

  await trackActivity(event, {
    userId,
    type: "TRIAL_STARTED",
    meta: {
      planId,
      trialEndsAt: trialEnd.toISOString(),
    },
  }).catch((error: unknown) =>
    console.warn("[Trial Start] Activity tracking failed:", error),
  );

  return {
    success: true,
    planId,
    planName: plan.display_name || plan.name,
    trialDays: TRIAL_DAYS,
    trialEndsAt: trialEnd.toISOString(),
    membership,
  };
});
