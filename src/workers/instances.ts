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
