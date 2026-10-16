"use client";

import { EditorShell } from "@/components/editor/EditorShell";
import { EditorProvider } from "@/components/editor/editor-store";
import type { Plan } from "@/lib/types";

interface EditorProps {
  plan: Plan;
  isAuthenticated: boolean;
  /** Server-provided usage for logged-in users. */
  initialUsed?: number;
  /** A file handed off from the landing page to process immediately. */
  autoFile?: File | null;
}

/**
 * Entry point for the editor. Wraps the multi-panel shell in a store provider
 * so panels, the top bar and the canvas share one source of truth.
 */
export function Editor({
  plan,
  isAuthenticated,
  initialUsed = 0,
  autoFile,
}: EditorProps) {
  return (
    <EditorProvider
      plan={plan}
      isAuthenticated={isAuthenticated}
      initialUsed={initialUsed}
      autoFile={autoFile}
    >
      <EditorShell />
    </EditorProvider>
  );
}
