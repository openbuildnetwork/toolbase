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

export const base64Worker = new WorkerClient(
  () => new Worker(new URL('./base64.worker.ts', import.meta.url)),
  'Base64'
);

export const redactSecretsWorker = new WorkerClient(
  () => new Worker(new URL('./redact.worker.ts', import.meta.url)),
  'Redact Secrets'
);

/**
 * Pre-warm heavy WASM runtimes silently in the background
 * after the main application has finished loading its initial paint.
 */
if (typeof window !== 'undefined') {
  const preloadWorkers = () => {
    // Magic PDF takes the longest to compile WASM, boot it first
    magicPdfWorker.init().catch(console.error);
    // Boot others sequentially to avoid CPU spikes
    setTimeout(() => pixelAxeWorker.init().catch(console.error), 2000);
  };

  if ('requestIdleCallback' in window) {
    // Wait for the browser to be completely idle
    const ric = window.requestIdleCallback as (cb: () => void, opts?: { timeout: number }) => void;
    ric(preloadWorkers, { timeout: 5000 });
  } else {
    // Fallback for Safari
    setTimeout(preloadWorkers, 3000);
  }
}

