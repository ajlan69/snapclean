"use client";

import { useRouter } from "next/navigation";
import { UploadZone } from "@/components/UploadZone";
import { setPendingFile } from "@/lib/pending-file";

/**
 * Landing-page upload zone. Stashes the chosen file in memory and routes to the
 * editor, where processing begins automatically.
 */
export function HeroUpload() {
  const router = useRouter();

  return (
    <UploadZone
      onFile={(file) => {
        setPendingFile(file);
        router.push("/editor");
      }}
    />
  );
}