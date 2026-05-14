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

export const pixelsWorker = new WorkerClient(
  () => new Worker(new URL('./pixels.worker.ts', import.meta.url)),
  'Pixels'
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
  () => new Worker(new URL('./redact-secrets.worker.ts', import.meta.url)),
  'Redact Secrets'
);

export const qrForgeWorker = new WorkerClient(
  () => new Worker(new URL('./qr-forge.worker.ts', import.meta.url)),
  'QR Forge'
);

export const archiveKitWorker = new WorkerClient(
  () => new Worker(new URL('./archive-kit.worker.ts', import.meta.url)),
  'Archive Kit'
);

export const noteVaultWorker = new WorkerClient(
  () => new Worker(new URL('./note-vault.worker.ts', import.meta.url)),
  'Note Vault'
);

// ─── Tool → Worker mapping ────────────────────────────────────────────────────

/**
 * Returns the WorkerClient that backs a given TIP tool ID.
 * Used by the pipeline canvas to trigger node-aware pre-warming:
 * the moment a user drops a node, the relevant WASM runtime starts booting.
 *
 * @param toolId - e.g. 'magic-pdf/compress', 'pixels/resize'
 * @returns The WorkerClient for that tool, or null if no Pyodide worker is needed.
 */
export function workerForTool(toolId: string): WorkerClient | null {
  if (toolId.startsWith('magic-pdf')) return magicPdfWorker;
  if (toolId.startsWith('pixels')) return pixelsWorker;
  if (toolId.startsWith('data-lens')) return dataLensWorker;
  if (toolId.startsWith('open-draw')) return openDrawWorker;
  if (toolId.startsWith('redact-secrets')) return redactSecretsWorker;
  if (toolId.startsWith('base64')) return base64Worker;
  if (toolId.startsWith('qr-forge')) return qrForgeWorker;
  if (toolId.startsWith('archive-kit')) return archiveKitWorker;
  if (toolId.startsWith('note-vault')) return noteVaultWorker;
  return null;
}

// ─── Idle Pre-Warm ────────────────────────────────────────────────────────────

/**
 * Pre-warm all heavy WASM runtimes silently in the background
 * after the main application has finished loading its initial paint.
 *
 * Staggered by 800ms each to avoid CPU spikes at startup.
 */
if (typeof window !== 'undefined') {
  const preloadWorkers = () => {
    magicPdfWorker.init().catch(console.error);
    setTimeout(() => pixelsWorker.init().catch(console.error), 800);
    setTimeout(() => dataLensWorker.init().catch(console.error), 1600);
    setTimeout(() => openDrawWorker.init().catch(console.error), 2400);
    setTimeout(() => redactSecretsWorker.init().catch(console.error), 3200);
    setTimeout(() => archiveKitWorker.init().catch(console.error), 4000);
  };

  if (document.readyState === 'complete') {
    preloadWorkers();
  } else {
    window.addEventListener('load', preloadWorkers);
  }
}



import { useEffect, useState, useMemo } from 'react';

/**
 * Returns true if ANY active Python worker is currently in the 'warming' state.
 * Useful for disabling global UI actions (like saving) during boot.
 */
export function useAnyWorkerWarming(): boolean {
  const allWorkers = useMemo(() => [
    magicPdfWorker, 
    pixelsWorker, 
    dataLensWorker, 
    openDrawWorker, 
    base64Worker, 
    redactSecretsWorker, 
    qrForgeWorker,
    archiveKitWorker,
    noteVaultWorker
  ], []);
  
  const [isWarming, setIsWarming] = useState(() => allWorkers.some(w => w.readyState === 'warming'));

  useEffect(() => {
    const check = () => {
      const warming = allWorkers.some(w => w.readyState === 'warming');
      setIsWarming(warming);
    };

    const cleanups = allWorkers.map(worker => worker.subscribe(check));
    return () => cleanups.forEach(unsubscribe => unsubscribe());
  }, [allWorkers]);

  return isWarming;
}
