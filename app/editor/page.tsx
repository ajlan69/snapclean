import type { Metadata } from "next";
import { EditorClient } from "@/components/EditorClient";
import { getCurrentProfile } from "@/lib/profile";

export const metadata: Metadata = {
  title: "Editor",
  description:
    "Remove backgrounds, change backgrounds and enhance your photos — all in your browser.",
  alternates: { canonical: "/editor" },
};

export default async function EditorPage() {
  const { plan, userId, used } = await getCurrentProfile();

  return (
    <div className="container px-4 py-8 md:py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Background Remover
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a photo, then fine-tune the background and enhancements. All
          processing happens on your device.
        </p>
      </div>

      <EditorClient
        plan={plan}
        isAuthenticated={Boolean(userId)}
        initialUsed={used}
      />
    </div>
  );
}