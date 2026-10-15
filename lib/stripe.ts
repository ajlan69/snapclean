import Stripe from "stripe";

import { getAppBaseUrl } from "@/lib/app-url";

/**
 * Stripe server-side client. Only used in API routes / webhooks.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
});

/**
 * The Pro subscription price id from env.
 */
export const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID!;

/**
 * Absolute URL helpers — use NEXT_PUBLIC_APP_URL so redirects / webhooks
 * behave correctly across localhost and production.
 */
export function getAppUrl(path = "/"): string {
  const base = getAppBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Helper to build the full subscription object we store in Supabase.
 */
export function serializeSubscription(sub: Stripe.Subscription) {
  return {
    id: sub.id,
    user_id: "", // populated by the caller
    stripe_customer_id: sub.customer as string,
    status: sub.status,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
  };
}