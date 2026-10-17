/**
 * RMBG-1.4 matting worker.
 *
 * Runs a fast, hair-preserving background-removal pipeline fully off the main
 * thread:
 *
 *   1. Decode the image with `createImageBitmap` + `OffscreenCanvas`.
 *   2. Run the RMBG-1.4 segmentation model (quantized, ~42 MB) through ONNX
 *      Runtime Web — using the WebGPU execution provider when available, with a
 *      single-threaded WASM SIMD fallback.
 *   3. Reconstruct a sub-pixel bilinear alpha matte at full resolution and
 *      refine it with an edge-preserving Guided Filter to keep flyaway hair,
 *      fur and semi-transparent edges (the "sticker cutout" fix).
 *
 * ONNX Runtime is loaded from the CDN via `importScripts` (never bundled) so the
 * app bundle stays small and we avoid ORT's self-referencing worker machinery
 * tripping up webpack. The pure matting math (bilinear reconstruction + guided
 * filter + defringe) is provided by the MIT-licensed `@pixir/background-remover`
 * package; its `onnxruntime-web` import is aliased away in `next.config.mjs`
 * because we supply ORT through the CDN global instead.
 */
import {
  reconstructAlphaBilinear,
  refineAlphaMask,
} from "@pixir/background-remover";

// onnxruntime-web version we pin to. Kept in sync with package.json.
const ORT_VERSION = "1.21.0";
const ORT_DIST = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
// WebGPU build also contains the WASM EP, so it can fall back transparently.
const ORT_WEBGPU_SCRIPT = `${ORT_DIST}ort.webgpu.min.js`;
const ORT_WASM_SCRIPT = `${ORT_DIST}ort.wasm.min.js`;

const DB_NAME = "snapclean-models";
const DB_STORE = "models";

// RMBG-1.4 expects a fixed 1024×1024 input and outputs a 1024×1024 map.
const INPUT_SIZE = 1024;
const MODEL_MASK_SIZE = 1024;

interface OrtTensor {
  data: Float32Array;
  dims: number[];
}

interface OrtSession {
  inputNames: string[];
  outputNames: string[];
  run(feeds: Record<string, unknown>): Promise<Record<string, OrtTensor>>;
  release?(): Promise<void>;
}

interface OrtApi {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  Tensor: new (type: string, data: Float32Array, dims: number[]) => OrtTensor;
  InferenceSession: {
    create(
      data: Uint8Array | ArrayBuffer,
      options?: Record<string, unknown>
    ): Promise<OrtSession>;
  };
}

/** Minimal view of the dedicated-worker global scope we rely on. */
const ctx = self as unknown as {
  importScripts: (...urls: string[]) => void;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
  addEventListener: (type: "message", listener: (ev: MessageEvent) => void) => void;
  ort?: OrtApi;
};

type MattingStage =
  | "downloading-model"
  | "initializing-model"
  | "preprocessing"
  | "inference"
  | "refining"
  | "complete";

interface ProcessRequest {
  type: "process";
  id: string;
  blob: Blob;
  modelUrl: string;
  /** Guided-filter radius in pixels (0–3) for edge smoothing. */
  edgeSmoothing: number;
}

type Device = "webgpu" | "wasm";

function post(message: unknown, transfer?: Transferable[]) {
  ctx.postMessage(message, transfer);
}

function postProgress(
  id: string,
  stage: MattingStage,
  progress: number,
  message: string,
  device?: Device
) {
  post({ type: "progress", id, stage, progress, message, device });
}

// ---------------------------------------------------------------------------
// onnxruntime-web loading (CDN, not bundled)
// ---------------------------------------------------------------------------

let ortPromise: Promise<OrtApi> | null = null;
let ortUseWebGPU = false;

function hasWebGPU(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "gpu" in navigator &&
    typeof (navigator as Navigator & { gpu?: unknown }).gpu === "object"
  );
}

function loadOrt(): Promise<OrtApi> {
  if (!ortPromise) {
    ortPromise = new Promise<OrtApi>((resolve, reject) => {
      try {
        ortUseWebGPU = hasWebGPU();
        ctx.importScripts(ortUseWebGPU ? ORT_WEBGPU_SCRIPT : ORT_WASM_SCRIPT);
        const ort = ctx.ort;
        if (!ort) throw new Error("onnxruntime-web failed to initialize");
        ort.env.wasm.wasmPaths = ORT_DIST;
        // Multi-threaded WASM needs cross-origin isolation (COOP/COEP), which
        // this app deliberately doesn't set, so pin to a single thread.
        ort.env.wasm.numThreads = 1;
        resolve(ort);
      } catch (err) {
        ortPromise = null;
        reject(err);
      }
    });
  }
  return ortPromise;
}

// ---------------------------------------------------------------------------
// IndexedDB model cache (the ~42 MB model is downloaded once, then local)
// ---------------------------------------------------------------------------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DB_STORE)) {
        req.result.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDb();
    return await new Promise<ArrayBuffer | null>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve((req.result as ArrayBuffer) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, value: ArrayBuffer): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Quota errors are non-fatal: the model just won't be cached.
  }
}

async function fetchModel(
  url: string,
  onProgress: (loaded: number, total: number) => void
): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Model download failed (HTTP ${res.status})`);

  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body?.getReader();
  if (!reader) return res.arrayBuffer();

  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      onProgress(received, total);
    }
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged.buffer;
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

let sessionPromise: Promise<{ session: OrtSession; device: Device }> | null =
  null;

function createSession(
  ort: OrtApi,
  bytes: Uint8Array
): Promise<{ session: OrtSession; device: Device }> {
  const create = async (executionProviders: string[]): Promise<OrtSession> =>
    ort.InferenceSession.create(bytes, {
      executionProviders,
      graphOptimizationLevel: "all",
    });

  return (async () => {
    if (ortUseWebGPU) {
      try {
        const session = await create(["webgpu", "wasm"]);
        return { session, device: "webgpu" as Device };
      } catch (err) {
        console.warn(
          "[matting] WebGPU session failed, falling back to WASM:",
          err
        );
      }
    }
    const session = await create(["wasm"]);
    return { session, device: "wasm" as Device };
  })();
}

function getSession(
  modelUrl: string,
  onProgress: (stage: MattingStage, progress: number, message: string) => void
): Promise<{ session: OrtSession; device: Device }> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await loadOrt();

      let bytes = await idbGet(modelUrl);
      if (!bytes) {
        bytes = await fetchModel(modelUrl, (loaded, total) => {
          const ratio = total > 0 ? Math.min(1, loaded / total) : 0;
          const mb = (n: number) => Math.round(n / 1024 / 1024);
          onProgress(
            "downloading-model",
            ratio * 0.9,
            total > 0
              ? `Downloading AI model… ${mb(loaded)}/${mb(total)} MB`
              : "Downloading AI model…"
          );
        });
        await idbSet(modelUrl, bytes);
      }

      onProgress("initializing-model", 0.95, "Initializing neural engine…");
      const created = await createSession(ort, new Uint8Array(bytes));
      onProgress(
        "initializing-model",
        1,
        `Neural engine ready (${created.device.toUpperCase()}).`
      );
      return created;
    })().catch((err) => {
      sessionPromise = null;
      throw err;
    });
  }
  return sessionPromise;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

async function processImage(
  req: ProcessRequest
): Promise<{ blob: Blob; device: Device }> {
  const { id, blob, modelUrl, edgeSmoothing } = req;

  const bitmap = await createImageBitmap(blob);
  const width = bitmap.width;
  const height = bitmap.height;

  const { session, device } = await getSession(modelUrl, (stage, p, m) =>
    postProgress(id, stage, p, m)
  );

  // --- Preprocess: native RGBA + a normalized 1×3×1024×1024 tensor ----------
  postProgress(id, "preprocessing", 0.05, "Preparing image…", device);

  const origCanvas = new OffscreenCanvas(width, height);
  const origCtx = origCanvas.getContext("2d", { willReadFrequently: true });
  if (!origCtx) throw new Error("Canvas 2D context unavailable");
  origCtx.drawImage(bitmap, 0, 0, width, height);
  const origImageData = origCtx.getImageData(0, 0, width, height);
  const origRgbaData = origImageData.data;

  const modelCanvas = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
  const modelCtx = modelCanvas.getContext("2d", { willReadFrequently: true });
  if (!modelCtx) throw new Error("Canvas 2D context unavailable");
  modelCtx.imageSmoothingEnabled = true;
  modelCtx.imageSmoothingQuality = "high";
  modelCtx.drawImage(bitmap, 0, 0, INPUT_SIZE, INPUT_SIZE);
  const modelData = modelCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;

  // RMBG-1.4 normalization: (pixel / 255) - 0.5, NCHW planar.
  const area = INPUT_SIZE * INPUT_SIZE;
  const floatData = new Float32Array(3 * area);
  for (let i = 0; i < area; i++) {
    const idx = i * 4;
    floatData[i] = modelData[idx] / 255 - 0.5;
    floatData[area + i] = modelData[idx + 1] / 255 - 0.5;
    floatData[2 * area + i] = modelData[idx + 2] / 255 - 0.5;
  }

  const ort = await loadOrt();
  const inputName = session.inputNames[0] ?? "input";
  const outputName = session.outputNames[0] ?? "output";
  const feeds = {
    [inputName]: new ort.Tensor("float32", floatData, [1, 3, INPUT_SIZE, INPUT_SIZE]),
  };

  postProgress(id, "inference", 0.5, "Removing background…", device);
  const results = await session.run(feeds);
  const maskData = results[outputName].data;

  // --- Refine: bilinear reconstruction + guided filter ---------------------
  postProgress(id, "refining", 0.78, "Refining hair & edges…", device);
  const rawAlpha = reconstructAlphaBilinear(
    maskData,
    width,
    height,
    MODEL_MASK_SIZE
  );

  const radius = Math.max(0, Math.min(3, Math.round(edgeSmoothing)));
  const { finalImageData } = refineAlphaMask(
    origRgbaData,
    rawAlpha,
    width,
    height,
    {
      radius,
      eps: 0.001,
      fgThreshold: 0.95,
      bgThreshold: 0.03,
      defringe: true,
    }
  );

  const outCanvas = new OffscreenCanvas(width, height);
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) throw new Error("Canvas 2D context unavailable");
  outCtx.putImageData(finalImageData, 0, 0);

  postProgress(id, "complete", 1, "Done", device);
  bitmap.close();

  const outBlob = await outCanvas.convertToBlob({ type: "image/png" });
  return { blob: outBlob, device };
}

ctx.addEventListener("message", (event: MessageEvent) => {
  const data = event.data as ProcessRequest | undefined;
  if (!data || data.type !== "process") return;

  const { id } = data;
  processImage(data)
    .then(({ blob }) => {
      post({ type: "result", id, blob }, []);
    })
    .catch((err: unknown) => {
      post({
        type: "error",
        id,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    });
});
