/**
 * BiRefNet "High Quality" background-removal worker.
 *
 * Runs the full matting pipeline off the main thread. onnxruntime-web is loaded
 * from a CDN at runtime (not bundled) so the app bundle stays small and the
 * WASM runtime can be cached by the browser.
 */

// onnxruntime-web version we pin to. Kept in sync with package.json and the CDN
// URL below.
const ORT_VERSION = "1.21.0";
const ORT_DIST = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
// UMD build exposes a global `ort`; loaded via importScripts in this classic worker.
const ORT_SCRIPT = `${ORT_DIST}ort.wasm.min.js`;

const DB_NAME = "snapclean-models";
const DB_STORE = "models";

const MEAN = [0.485, 0.456, 0.406] as const;
const STD = [0.229, 0.224, 0.225] as const;

interface OrtTensor {
  data: Float32Array;
  dims: number[];
}

interface OrtSession {
  inputNames: string[];
  outputNames: string[];
  run(feeds: Record<string, unknown>): Promise<Record<string, OrtTensor>>;
}

interface OrtApi {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  Tensor: new (type: string, data: Float32Array, dims: number[]) => OrtTensor;
  InferenceSession: {
    create(
      bytes: Uint8Array,
      options?: Record<string, unknown>
    ): Promise<OrtSession>;
  };
}

/** Minimal view of the dedicated-worker global scope we rely on. */
const ctx = self as unknown as {
  importScripts: (...urls: string[]) => void;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
  addEventListener: (type: "message", listener: (ev: MessageEvent) => void) => void;
};

interface ProcessRequest {
  type: "process";
  id: string;
  bitmap: ImageBitmap;
  modelUrl: string;
  inputSize: number;
}

function post(message: unknown, transfer?: Transferable[]) {
  ctx.postMessage(message, transfer);
}

// ---------------------------------------------------------------------------
// onnxruntime-web loading
// ---------------------------------------------------------------------------

let ortPromise: Promise<OrtApi> | null = null;

function loadOrt(): Promise<OrtApi> {
  if (!ortPromise) {
    ortPromise = new Promise<OrtApi>((resolve, reject) => {
      try {
        ctx.importScripts(ORT_SCRIPT);
        const ort = (self as unknown as { ort?: OrtApi }).ort;
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
// IndexedDB model cache
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

let sessionPromise: Promise<OrtSession> | null = null;

function getSession(
  modelUrl: string,
  onProgress: (loaded: number, total: number) => void
): Promise<OrtSession> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await loadOrt();

      let bytes = await idbGet(modelUrl);
      if (!bytes) {
        bytes = await fetchModel(modelUrl, onProgress);
        await idbSet(modelUrl, bytes);
      }

      return ort.InferenceSession.create(new Uint8Array(bytes), {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
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

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

async function processImage(req: ProcessRequest): Promise<Blob> {
  const { id, bitmap, modelUrl, inputSize } = req;

  const session = await getSession(modelUrl, (loaded, total) =>
    post({ type: "progress", id, phase: "model", loaded, total })
  );

  post({ type: "status", id, phase: "inference" });

  const area = inputSize * inputSize;

  // Preprocess: stretch to inputSize², normalise with ImageNet stats, NCHW.
  const inputCanvas = new OffscreenCanvas(inputSize, inputSize);
  const inputCtx = inputCanvas.getContext("2d");
  if (!inputCtx) throw new Error("Canvas 2D context unavailable");
  inputCtx.drawImage(bitmap, 0, 0, inputSize, inputSize);
  const { data: pixels } = inputCtx.getImageData(0, 0, inputSize, inputSize);

  const floatData = new Float32Array(3 * area);
  for (let i = 0; i < area; i++) {
    const r = pixels[i * 4] / 255;
    const g = pixels[i * 4 + 1] / 255;
    const b = pixels[i * 4 + 2] / 255;
    floatData[i] = (r - MEAN[0]) / STD[0];
    floatData[area + i] = (g - MEAN[1]) / STD[1];
    floatData[2 * area + i] = (b - MEAN[2]) / STD[2];
  }

  const ort = await loadOrt();
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  const feeds = {
    [inputName]: new ort.Tensor("float32", floatData, [1, 3, inputSize, inputSize]),
  };

  const results = await session.run(feeds);
  const logits = results[outputName].data;

  // Build an alpha matte from the logits (BiRefNet heads output raw logits).
  const maskCanvas = new OffscreenCanvas(inputSize, inputSize);
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) throw new Error("Canvas 2D context unavailable");
  const mask = maskCtx.createImageData(inputSize, inputSize);
  for (let i = 0; i < area; i++) {
    const alpha = Math.round(sigmoid(logits[i]) * 255);
    const p = i * 4;
    mask.data[p] = 0;
    mask.data[p + 1] = 0;
    mask.data[p + 2] = 0;
    mask.data[p + 3] = alpha;
  }
  maskCtx.putImageData(mask, 0, 0);

  // Composite the original over the matte at full resolution, preserving edges.
  const width = bitmap.width;
  const height = bitmap.height;
  const outCanvas = new OffscreenCanvas(width, height);
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) throw new Error("Canvas 2D context unavailable");
  outCtx.drawImage(bitmap, 0, 0, width, height);
  outCtx.globalCompositeOperation = "destination-in";
  outCtx.drawImage(maskCanvas, 0, 0, width, height);
  outCtx.globalCompositeOperation = "source-over";

  return outCanvas.convertToBlob({ type: "image/png" });
}

ctx.addEventListener("message", (event: MessageEvent) => {
  const data = event.data as ProcessRequest | undefined;
  if (!data || data.type !== "process") return;

  const { id, bitmap } = data;
  processImage(data)
    .then((blob) => {
      post({ type: "result", id, blob }, []);
      bitmap.close();
    })
    .catch((err: unknown) => {
      post({
        type: "error",
        id,
        message: err instanceof Error ? err.message : "Unknown error",
      });
      bitmap.close();
    });
});
