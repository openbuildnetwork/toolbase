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
    magicPdfWorker.init().catch(console.error);
    setTimeout(() => pixelAxeWorker.init().catch(console.error), 2000);
    setTimeout(() => dataLensWorker.init().catch(console.error), 4000);
    setTimeout(() => openDrawWorker.init().catch(console.error), 6000);
  };

  if ('requestIdleCallback' in window) {
    const ric = window.requestIdleCallback as (cb: () => void, opts?: { timeout: number }) => void;
    ric(preloadWorkers, { timeout: 5000 });
  } else {
    setTimeout(preloadWorkers, 3000);
  }
}

import { useEffect, useState } from 'react';

/**
 * Returns true if ANY active Python worker is currently in the 'warming' state.
 * Useful for disabling global UI actions (like saving) during boot.
 */
export function useAnyWorkerWarming(): boolean {
  const allWorkers = [magicPdfWorker, pixelAxeWorker, dataLensWorker, openDrawWorker, base64Worker, redactSecretsWorker];
  
  const checkWarming = () => allWorkers.some(w => w.readyState === 'warming');
  const [isWarming, setIsWarming] = useState(checkWarming);

  useEffect(() => {
    // Initial check
    setIsWarming(checkWarming());

    // Subscription cleanup functions
    const cleanups = allWorkers.map(worker => {
      const prevCallback = worker.onReadyStateChange;
      worker.onReadyStateChange = (state, msg) => {
        setIsWarming(checkWarming());
        prevCallback?.(state, msg);
      };

      return () => {
        if (worker.onReadyStateChange !== prevCallback) {
            // Restore exact previous callback avoiding memory leak chain
            worker.onReadyStateChange = prevCallback;
        }
      };
    });

    return () => cleanups.forEach(clean => clean());
  }, []);

  return isWarming;
}
