"use client";

import { useState } from "react";
import { Editor } from "@/components/Editor";
import { consumePendingFile } from "@/lib/pending-file";
import type { Plan } from "@/lib/types";

interface EditorClientProps {
  plan: Plan;
  isAuthenticated: boolean;
  initialUsed: number;
}

/**
 * Client wrapper that reads any file handed off from the landing page before
 * mounting the editor.
 */
export function EditorClient({
  plan,
  isAuthenticated,
  initialUsed,
}: EditorClientProps) {
  // useState initializer runs once, so consumePendingFile is called a single time.
  const [file] = useState<File | null>(() => consumePendingFile());

  return (
    <Editor
      plan={plan}
      isAuthenticated={isAuthenticated}
      initialUsed={initialUsed}
      autoFile={file}
    />
  );
}