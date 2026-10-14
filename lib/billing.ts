import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase-server";

/** Which Stripe subscription statuses grant Pro access. */
export function isActiveStatus(status: string): boolean {
  return status === "active" || status === "trialing";
}

/** Update a user's plan in the database. */
export async function setUserPlan(userId: string, plan: "free" | "pro") {
  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ plan })
    .eq("id", userId);
  if (error) console.error("setUserPlan error", error);
}

/**
 * Upsert a subscription row and sync the owner's plan accordingly.
 * `user_id` is taken from subscription metadata, with a lookup by Stripe
 * customer id as a fallback.
 */
export async function syncSubscription(
  subscription: Stripe.Subscription,
  fallbackUserId?: string
) {
  const admin = createAdminClient();
  const customerId = subscription.customer as string;

  let userId =
    (subscription.metadata?.user_id as string | undefined) ?? fallbackUserId;

  if (!userId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    userId = data?.user_id;
  }

  if (!userId) {
    console.error("syncSubscription: could not resolve user for", customerId);
    return;
  }

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      status: subscription.status,
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) console.error("syncSubscription upsert error", error);

  await setUserPlan(userId, isActiveStatus(subscription.status) ? "pro" : "free");
}