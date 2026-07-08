import {
  serverSupabaseClient,
  serverSupabaseUser,
  serverSupabaseServiceRole,
} from "#supabase/server";
import { syncUserToPolar } from "~~/server/utils/polar";
import {
  deactivateOtherActiveMemberships,
  getPlanPriority,
  isMembershipCurrentlyUsable,
} from "~~/server/utils/membership";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  const client = await serverSupabaseClient(event);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const userId = (user as any)?.id || (user as any)?.sub;
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid user session structure",
    });
  }

  // 1. Sync to Polar (Monitoring requirement)
  let polarCustomerId: string | undefined;
  try {
    const profile = await client
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    const customer = await syncUserToPolar(
      event,
      userId,
      user.email || "unknown@user.com",
      profile.data?.full_name,
    );
    if (customer) {
      polarCustomerId = customer.id;
    }
  } catch (error) {
    console.error("[Onboard-Free] Polar Sync Error:", error);
    // We continue even if polar sync fails, to not block the user
  }

  const adminClient = serverSupabaseServiceRole(event);

  const { data: existingMemberships, error: existingMembershipsError } =
    await adminClient
      .from("user_memberships")
      .select("*, plans(internal_slug, name)")
      .eq("user_id", userId)
      .eq("is_active", true);

  if (existingMembershipsError) {
    console.warn(
      "[Onboard-Free] Existing membership lookup failed:",
      existingMembershipsError,
    );
  }

  const existingPaidOrHigher = (existingMemberships || []).find(
    (membership: any) => {
      const slug = String(membership?.plans?.internal_slug || "").toLowerCase();
      return (
        isMembershipCurrentlyUsable(membership) &&
        getPlanPriority(slug) > getPlanPriority("starter")
      );
    },
  );

  if (existingPaidOrHigher) {
    return {
      success: true,
      message: "Your current plan is already active.",
      plan: existingPaidOrHigher.plans?.name || null,
    };
  }

  // 2. Get the Starter plan ID
  const { data: plan, error: planError } = await client
    .from("plans")
    .select("id")
    .eq("internal_slug", "starter")
    .single();

  if (planError || !plan) {
    throw createError({
      statusCode: 500,
      statusMessage: "Free plan configuration not found",
    });
  }

  // 3. Create membership (Service Role required to bypass RLS)
  const insertData: any = {
    user_id: userId,
    plan_id: plan.id,
    is_active: true,
    starts_at: new Date().toISOString(),
  };

  if (polarCustomerId) {
    insertData.polar_customer_id = polarCustomerId;
  }

  const { data: membership, error: membershipError } = await adminClient
    .from("user_memberships")
    .insert(insertData)
    .select("id")
    .single();

  if (membershipError || !membership?.id) {
    console.error("[Onboard-Free] Membership Error:", membershipError);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to activate free plan",
    });
  }

  const { error: deactivateError } = await deactivateOtherActiveMemberships(
    adminClient,
    userId,
    membership.id,
  );
  if (deactivateError) {
    console.warn("[Onboard-Free] Membership cleanup failed:", deactivateError);
  }

  return {
    success: true,
    message: "Free plan activated successfully",
  };
});
