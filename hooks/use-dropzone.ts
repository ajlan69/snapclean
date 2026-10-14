"use client";

import {
  useCallback,
  useRef,
  type ChangeEvent,
  type DragEvent,
  type InputHTMLAttributes,
  type RefObject,
} from "react";

interface UseDropzoneOptions {
  onDrop: (files: FileList | File[]) => void;
  onDragChange?: (dragging: boolean) => void;
  accept?: string[];
  multiple?: boolean;
}

interface DropzoneHelpers {
  getRootProps: () => {
    onClick: () => void;
    onDragEnter: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDragLeave: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
  };
  getInputProps: () => InputHTMLAttributes<HTMLInputElement> & {
    ref: RefObject<HTMLInputElement>;
  };
  open: () => void;
}

/**
 * Minimal dependency-free dropzone hook.
 * Handles drag state, filtering by MIME type and forwarding valid files.
 */
export function useDropzone({
  onDrop,
  onDragChange,
  accept,
  multiple = false,
}: UseDropzoneOptions): DropzoneHelpers {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList) => {
      if (!files || files.length === 0) return;
      if (multiple) {
        const filtered = accept
          ? Array.from(files).filter((f) => accept.includes(f.type))
          : Array.from(files);
        onDrop(filtered);
      } else {
        onDrop(files);
      }
    },
    [accept, multiple, onDrop]
  );

  const getRootProps = useCallback(
    () => ({
      onClick: () => inputRef.current?.click(),
      onDragEnter: (e: DragEvent) => {
        e.preventDefault();
        onDragChange?.(true);
      },
      onDragOver: (e: DragEvent) => {
        e.preventDefault();
        onDragChange?.(true);
      },
      onDragLeave: (e: DragEvent) => {
        e.preventDefault();
        onDragChange?.(false);
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        onDragChange?.(false);
        if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
      },
    }),
    [handleFiles, onDragChange]
  );

  const getInputProps = useCallback(
    () => ({
      ref: inputRef,
      type: "file" as const,
      accept: accept?.join(","),
      multiple,
      className: "hidden",
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) handleFiles(e.target.files);
        // Reset so selecting the same file twice re-triggers onChange.
        e.target.value = "";
      },
    }),
    [accept, handleFiles, multiple]
  );

  const open = useCallback(() => inputRef.current?.click(), []);

  return { getRootProps, getInputProps, open };
}