"use client";

/**
 * Client-side helper for the RMBG-1.4 "High Quality" background remover.
 *
 * The heavy lifting happens in `workers/matting.worker.ts`. This module owns a
 * single long-lived worker instance (so the model is loaded and cached once)
 * and marshals jobs to it, exposing a simple promise-based API.
 */

/**
 * Default model: the official quantized BRIA RMBG-1.4 ONNX (~42 MB), which runs
 * comfortably on both WebGPU and single-threaded WASM. Override with
 * NEXT_PUBLIC_RMBG_MODEL_URL.
 */
export const DEFAULT_RMBG_MODEL_URL =
  "https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model_quantized.onnx";

export const RMBG_MODEL_URL =
  process.env.NEXT_PUBLIC_RMBG_MODEL_URL || DEFAULT_RMBG_MODEL_URL;

export type MattingStage =
  | "downloading-model"
  | "initializing-model"
  | "preprocessing"
  | "inference"
  | "refining"
  | "complete";

export type MattingDevice = "webgpu" | "wasm";

export interface MattingProgress {
  stage: MattingStage;
  /** Overall progress in the range 0–1. */
  progress: number;
  message: string;
  device?: MattingDevice;
}

interface WorkerMessage {
  type: "progress" | "device" | "result" | "error";
  id: string;
  stage?: MattingStage;
  progress?: number;
  message?: string;
  device?: MattingDevice;
  blob?: Blob;
}

interface Job {
  resolve: (blob: Blob) => void;
  reject: (err: unknown) => void;
  onProgress?: (progress: MattingProgress) => void;
  device?: MattingDevice;
}

let worker: Worker | null = null;
const jobs = new Map<string, Job>();

function handleMessage(event: MessageEvent<WorkerMessage>) {
  const msg = event.data;
  const job = jobs.get(msg.id);
  if (!job) return;

  switch (msg.type) {
    case "progress":
      if (msg.device) job.device = msg.device;
      job.onProgress?.({
        stage: msg.stage ?? "inference",
        progress: msg.progress ?? 0,
        message: msg.message ?? "",
        device: job.device,
      });
      break;
    case "device":
      if (msg.device) job.device = msg.device;
      break;
    case "result":
      if (msg.blob) {
        jobs.delete(msg.id);
        job.resolve(msg.blob);
      }
      break;
    case "error":
      jobs.delete(msg.id);
      job.reject(new Error(msg.message ?? "High-quality removal failed"));
      break;
  }
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("../workers/matting.worker.ts", import.meta.url));
    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", (event) => {
      const err = new Error(event.message || "High-quality worker crashed");
      jobs.forEach((job) => job.reject(err));
      jobs.clear();
      worker?.terminate();
      worker = null;
    });
  }
  return worker;
}

/** Whether the current browser can run the matting worker pipeline. */
export function isMattingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof WebAssembly !== "undefined" &&
    typeof createImageBitmap === "function"
  );
}

/** Whether a WebGPU adapter is likely available (falls back to WASM otherwise). */
export function supportsWebGPU(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "gpu" in navigator &&
    typeof (navigator as Navigator & { gpu?: unknown }).gpu === "object"
  );
}

/** Approximate device memory in GB, or null when the browser can't report it. */
export function getDeviceMemoryGB(): number | null {
  if (typeof navigator === "undefined") return null;
  const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof dm === "number" ? dm : null;
}

export function isLowMemoryDevice(): boolean {
  const gb = getDeviceMemoryGB();
  return gb !== null && gb < 2;
}

export interface RemoveBackgroundRMBGOptions {
  /** Guided-filter radius in pixels (0–3) used to soften mask edges. */
  edgeSmoothing?: number;
  onProgress?: (progress: MattingProgress) => void;
}

/**
 * Remove the background with the RMBG-1.4 model, returning a transparent PNG
 * with a refined (hair-preserving) alpha matte. Resolves with the processed
 * blob; rejects if the model or worker fail.
 */
export async function removeBackgroundRMBG(
  source: Blob,
  options: RemoveBackgroundRMBGOptions = {}
): Promise<Blob> {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  const target = getWorker();

  return new Promise<Blob>((resolve, reject) => {
    jobs.set(id, { resolve, reject, onProgress: options.onProgress });
    target.postMessage({
      type: "process",
      id,
      blob: source,
      modelUrl: RMBG_MODEL_URL,
      edgeSmoothing: options.edgeSmoothing ?? 0,
    });
  });
}
