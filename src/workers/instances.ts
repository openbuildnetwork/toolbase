import { WorkerClient } from './client';

/**
 * Singleton definitions for Toolbase Workers.
 *
 * Using lazy Worker factories `() => new Worker(url)` guarantees:
 * 1. Workers aren't spawned until actually requested by `execute()`
 * 2. Next.js doesn't try to execute WebWorker syntax on the Server (SSR)
 */

export const magicPdfWorker = new WorkerClient(
  () => new Worker(new URL('./magic-pdf.worker.ts', import.meta.url)),
  'Magic PDF'
);

export const pixelAxeWorker = new WorkerClient(
  () => new Worker(new URL('./pixel-axe.worker.ts', import.meta.url)),
  'Pixel Axe'
);

export const dataLensWorker = new WorkerClient(
  () => new Worker(new URL('./data-lens.worker.ts', import.meta.url)),
  'Data Lens'
);

export const openDrawWorker = new WorkerClient(
  () => new Worker(new URL('./open-draw.worker.ts', import.meta.url)),
  'Open Draw'
);

export const base64Worker = new WorkerClient(
  () => new Worker(new URL('./base64.worker.ts', import.meta.url)),
  'Base64'
);

export const redactSecretsWorker = new WorkerClient(
  () => new Worker(new URL('./redact.worker.ts', import.meta.url)),
  'Redact Secrets'
);

// ─── Tool → Worker mapping ────────────────────────────────────────────────────

/**
 * Returns the WorkerClient that backs a given TIP tool ID.
 * Used by the pipeline canvas to trigger node-aware pre-warming:
 * the moment a user drops a node, the relevant WASM runtime starts booting.
 *
 * @param toolId - e.g. 'magic-pdf/compress', 'pixel-axe/resize'
 * @returns The WorkerClient for that tool, or null if no Pyodide worker is needed.
 */
export function workerForTool(toolId: string): WorkerClient | null {
  if (toolId.startsWith('magic-pdf')) return magicPdfWorker;
  if (toolId.startsWith('pixel-axe')) return pixelAxeWorker;
  if (toolId.startsWith('data-lens')) return dataLensWorker;
  if (toolId.startsWith('open-draw')) return openDrawWorker;
  return null;
}

// ─── Idle Pre-Warm ────────────────────────────────────────────────────────────

/**
 * Pre-warm all heavy WASM runtimes silently in the background
 * after the main application has finished loading its initial paint.
 *
 * Staggered by 2 s each to avoid CPU spikes at startup.
 * Order is heaviest → lightest (magic-pdf installs PyMuPDF + Pillow).
 *
 * If the user adds a node first, `workerForTool` triggers init earlier
 * and this becomes a no-op (WorkerClient.init() is idempotent).
 */
if (typeof window !== 'undefined') {
  const preloadWorkers = () => {
    // 1st — Magic PDF (heaviest: PyMuPDF + Pillow + pypdf)
    magicPdfWorker.init().catch(console.error);
    // 2nd — Pixel Axe (Pillow + numpy)
    setTimeout(() => pixelAxeWorker.init().catch(console.error), 2000);
    // 3rd — Data Lens (pandas + openpyxl — large)
    setTimeout(() => dataLensWorker.init().catch(console.error), 4000);
    // 4th — Open Draw (networkx — smaller)
    setTimeout(() => openDrawWorker.init().catch(console.error), 6000);
  };

  if ('requestIdleCallback' in window) {
    // Wait for the browser to be completely idle before starting pre-warm
    const ric = window.requestIdleCallback as (cb: () => void, opts?: { timeout: number }) => void;
    ric(preloadWorkers, { timeout: 5000 });
  } else {
    // Fallback for Safari / older browsers
    setTimeout(preloadWorkers, 3000);
  }
}
