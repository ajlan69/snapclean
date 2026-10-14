import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-server";
import { setUserPlan, syncSubscription } from "@/lib/billing";

export const dynamic = "force-dynamic";
// Stripe signature verification needs the raw request body.
export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook
 * Handles subscription lifecycle events and keeps the database in sync.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          const userId =
            (session.metadata?.user_id as string | undefined) ??
            session.client_reference_id ??
            undefined;
          await syncSubscription(subscription, userId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        // Mark the subscription as past_due / revoke Pro access.
        const admin = createAdminClient();
        const { data } = await admin
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (data?.user_id) {
          await admin
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("user_id", data.user_id);
          await setUserPlan(data.user_id, "free");
        }
        break;
      }

      default:
        // Unhandled event types are acknowledged to avoid retries.
        break;
    }
  } catch (err) {
    console.error("webhook handling error", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}