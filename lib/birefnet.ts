"use client";

/**
 * Client-side helper for the BiRefNet "High Quality" background remover.
 *
 * The heavy lifting happens in `workers/birefnet.worker.ts`. This module owns a
 * single long-lived worker instance (so the model is loaded once) and marshals
 * jobs to it, exposing a simple promise-based API.
 */

/**
 * Default model: an int8 (quantized) 1024×1024 BiRefNet converted for
 * onnxruntime-web. `onnx-community/BiRefNet-ONNX` only ships fp32/fp16 weights,
 * and the fp16 build can't run on the WASM backend, so we default to this
 * quantized conversion. Override with NEXT_PUBLIC_BIREFNET_MODEL_URL.
 */
export const DEFAULT_BIREFNET_MODEL_URL =
  "https://huggingface.co/anakhiu/birefnet-onnx-int8/resolve/main/birefnet_int8.onnx";

export const BIREFNET_MODEL_URL =
  process.env.NEXT_PUBLIC_BIREFNET_MODEL_URL || DEFAULT_BIREFNET_MODEL_URL;

export const BIREFNET_INPUT_SIZE = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_BIREFNET_INPUT_SIZE);
  return Number.isFinite(raw) && raw > 0 ? raw : 1024;
})();

export interface HighQualityProgress {
  phase: "model" | "inference";
  loaded?: number;
  total?: number;
}

interface WorkerMessage {
  type: "progress" | "status" | "result" | "error";
  id: string;
  phase?: "model" | "inference";
  loaded?: number;
  total?: number;
  blob?: Blob;
  message?: string;
}

interface Job {
  resolve: (blob: Blob) => void;
  reject: (err: unknown) => void;
  onProgress?: (progress: HighQualityProgress) => void;
}

let worker: Worker | null = null;
const jobs = new Map<string, Job>();

function handleMessage(event: MessageEvent<WorkerMessage>) {
  const msg = event.data;
  const job = jobs.get(msg.id);
  if (!job) return;

  switch (msg.type) {
    case "progress":
      job.onProgress?.({ phase: "model", loaded: msg.loaded, total: msg.total });
      break;
    case "status":
      job.onProgress?.({ phase: "inference" });
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
    worker = new Worker(
      new URL("../workers/birefnet.worker.ts", import.meta.url)
    );
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

/** Whether the current browser can run the WASM matting pipeline. */
export function isHighQualitySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof WebAssembly !== "undefined" &&
    typeof createImageBitmap === "function"
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

/**
 * Remove the background with the BiRefNet model, returning a transparent PNG.
 * Resolves with the processed blob; rejects if the model or worker fail.
 */
export async function removeBackgroundHighQuality(
  source: Blob,
  onProgress?: (progress: HighQualityProgress) => void
): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  const target = getWorker();

  return new Promise<Blob>((resolve, reject) => {
    jobs.set(id, { resolve, reject, onProgress });
    target.postMessage(
      {
        type: "process",
        id,
        bitmap,
        modelUrl: BIREFNET_MODEL_URL,
        inputSize: BIREFNET_INPUT_SIZE,
      },
      [bitmap]
    );
  });
}
