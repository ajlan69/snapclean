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
    <EditorClient
      plan={plan}
      isAuthenticated={Boolean(userId)}
      initialUsed={used}
    />
  );
}