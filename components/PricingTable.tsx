"use client";

import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WaitlistButton } from "@/components/WaitlistButton";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/types";

interface Feature {
  label: string;
  included: boolean;
}

const FREE_FEATURES: Feature[] = [
  { label: "3 images per day", included: true },
  { label: "AI background removal", included: true },
  { label: "Basic enhancements", included: true },
  { label: "PNG download", included: true },
  { label: "Watermark on export", included: false },
  { label: "HD download", included: false },
  { label: "Unlimited images", included: false },
];

const PRO_FEATURES: Feature[] = [
  { label: "Unlimited images", included: true },
  { label: "AI background removal", included: true },
  { label: "Full enhancement suite", included: true },
  { label: "PNG download", included: true },
  { label: "No watermark", included: true },
  { label: "HD download", included: true },
  { label: "Priority processing", included: true },
];

interface PricingTableProps {
  currentPlan?: Plan;
}

/**
 * Free vs Pro pricing cards. Payments are postponed, so the Pro call-to-action
 * opens the waitlist instead of a Stripe Checkout session.
 */
export function PricingTable({ currentPlan = "free" }: PricingTableProps) {
  const router = useRouter();

  const isPro = currentPlan === "pro";

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
      <PlanCard
        name="Free"
        price="$0"
        period="forever"
        description="Perfect for trying SnapClean and occasional edits."
        features={FREE_FEATURES}
        cta={
          <Button
            variant="outline"
            className="w-full"
            disabled={currentPlan === "free"}
            onClick={() => router.push("/editor")}
          >
            {currentPlan === "free" ? "Current plan" : "Get started"}
          </Button>
        }
      />

      <PlanCard
        name="Pro"
        price="$9"
        period="per month"
        description="For creators who need clean, unlimited, watermark-free exports."
        features={PRO_FEATURES}
        highlighted
        cta={
          isPro ? (
            <Button className="w-full" disabled>
              <Sparkles className="h-4 w-4" />
              You&apos;re on Pro
            </Button>
          ) : (
            <WaitlistButton
              label="Join Pro Waitlist"
              source="pricing"
              className="w-full"
            />
          )
        }
      />
    </div>
  );
}

function PlanCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  highlighted,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: Feature[];
  cta: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all",
        highlighted && "border-primary shadow-lg ring-1 ring-primary/30"
      )}
    >
      {highlighted && (
        <Badge className="absolute -top-3 left-6">Most popular</Badge>
      )}
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight">{price}</span>
        <span className="text-sm text-muted-foreground">/{period}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((f) => (
          <li key={f.label} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                f.included
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "bg-muted text-muted-foreground line-through"
              )}
            >
              {f.included ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-current" />
              )}
            </span>
            <span className={cn(!f.included && "text-muted-foreground")}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-6">{cta}</div>
    </div>
  );
}