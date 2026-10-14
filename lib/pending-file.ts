/**
 * Small in-memory hand-off used to pass an uploaded File from the landing page
 * to the editor without ever touching the network or disk. Survives client-side
 * route transitions because both pages live in the same JS runtime.
 */
let pendingFile: File | null = null;

export function setPendingFile(file: File) {
  pendingFile = file;
}

export function getPendingFile(): File | null {
  return pendingFile;
}

/** Read and clear the pending file. */
export function consumePendingFile(): File | null {
  const file = pendingFile;
  pendingFile = null;
  return file;
}