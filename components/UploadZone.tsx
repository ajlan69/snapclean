"use client";

import { useState } from "react";
import { useCallback } from "react";
import { useDropzone } from "@/hooks/use-dropzone";
import { ImageUp, Loader2 } from "lucide-react";
import { cn, isValidImageFile } from "@/lib/utils";
import { toast } from "sonner";

interface UploadZoneProps {
  onFile: (file: File) => void;
  busy?: boolean;
  compact?: boolean;
}

/**
 * Drag-and-drop upload zone accepting JPG / PNG / WEBP files up to 10MB.
 * Elevates validation errors as toasts and hands a valid File to `onFile`.
 */
export function UploadZone({ onFile, busy, compact }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const file = Array.from(files)[0];
      if (!file) return;

      const { ok, error } = isValidImageFile(file);
      if (!ok) {
        toast.error(error ?? "Invalid file.");
        return;
      }
      onFile(file);
    },
    [onFile]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleFiles,
    onDragChange: setDragging,
    accept: ["image/jpeg", "image/png", "image/webp"],
  });

  return (
    <button
      type="button"
      {...getRootProps()}
      disabled={busy}
      className={cn(
        "group relative flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-muted/30 px-6 py-16 text-center outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
        dragging
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border hover:border-primary/60 hover:bg-muted/50",
        compact && "py-8",
        busy && "pointer-events-none opacity-60"
      )}
    >
      <input {...getInputProps()} />
      {busy ? (
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
          <ImageUp className="h-7 w-7" />
        </div>
      )}
      <div>
        <p className="text-base font-semibold">
          {busy ? "Processing…" : "Drag & drop your image"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          or click to browse — JPG, PNG, WEBP · up to 10MB
        </p>
      </div>
      {!busy && (
        <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          Free · No upload to server
        </span>
      )}
    </button>
  );
}