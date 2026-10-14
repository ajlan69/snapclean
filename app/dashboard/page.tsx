import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HardDriveDownload, ImageIcon, Sparkles } from "lucide-react";

import { BillingButtons } from "@/components/BillingButtons";
import { AdBanner } from "@/components/AdBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentProfile, todayKey } from "@/lib/profile";
import { FREE_DAILY_LIMIT } from "@/lib/usage";
import { formatDate } from "@/lib/utils";
import type { ImageRecord } from "@/lib/types";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your SnapClean account, plan and processed images.",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile.userId) redirect("/login?next=/dashboard");

  const isPro = profile.plan === "pro";
  const supabase = createServerSupabaseClient();

  // Fetch history and subscription in parallel.
  const [imagesResult, subscriptionResult] = await Promise.all([
    supabase
      .from("images")
      .select("id, original_url, processed_url, created_at")
      .eq("user_id", profile.userId)
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", profile.userId)
      .maybeSingle(),
  ]);

  const images = (imagesResult.data ?? []) as ImageRecord[];
  const subscription = subscriptionResult.data;
  const renewsOn = subscription?.current_period_end;

  return (
    <div className="container px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back{profile.email ? `, ${profile.email}` : ""}.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your images</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/editor">New image</Link>
            </Button>
          </div>

          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
              </div>
              <p className="text-sm text-muted-foreground">
                You haven&apos;t processed any images yet.
              </p>
              <Button asChild>
                <Link href="/editor">Process your first image</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {images.map((image) => (
                <figure
                  key={image.id}
                  className="group overflow-hidden rounded-xl border bg-card"
                >
                  <div className="relative aspect-square bg-checkerboard">
                    {image.processed_url ? (
                      // Stored preview thumbnail (small data URL).
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image.processed_url}
                        alt="Processed image"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <figcaption className="flex items-center justify-between p-3 text-xs text-muted-foreground">
                    <span>{formatDate(image.created_at)}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Your plan</CardTitle>
                <Badge variant={isPro ? "success" : "secondary"}>
                  {isPro ? "Pro" : "Free"}
                </Badge>
              </div>
              <CardDescription>
                {isPro
                  ? `You have unlimited processing.${renewsOn ? ` Renews ${formatDate(renewsOn)}.` : ""}`
                  : `Free accounts can process ${FREE_DAILY_LIMIT} images per day.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isPro && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Today&apos;s usage
                    </span>
                    <span className="font-medium tabular-nums">
                      {profile.used}/{FREE_DAILY_LIMIT}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (profile.used / FREE_DAILY_LIMIT) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Resets daily · {todayKey()}
                  </p>
                </div>
              )}

              {isPro && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="h-4 w-4" />
                  Watermark-free HD exports enabled.
                </div>
              )}

              <BillingButtons isPro={isPro} email={profile.email ?? undefined} />

              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/editor">
                  <HardDriveDownload className="h-4 w-4" />
                  Go to editor
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Ads shown to free users only. */}
          <AdBanner slot="dashboard-sidebar" showAds={!isPro} />
        </aside>
      </div>
    </div>
  );
}