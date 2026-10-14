"use client";

import { WaitlistButton } from "@/components/WaitlistButton";

interface BillingButtonsProps {
  isPro: boolean;
  /** Optional pre-fill for the waitlist email field. */
  email?: string;
}

/**
 * Dashboard CTA. Payments are postponed, so free users are invited to join the
 * Pro waitlist. Pro users see nothing here (there is no billing to manage yet).
 */
export function BillingButtons({ isPro, email }: BillingButtonsProps) {
  if (isPro) {
    return null;
  }

  return (
    <WaitlistButton
      label="Join Pro Waitlist"
      defaultEmail={email}
      source="dashboard"
      className="w-full"
    />
  );
}
