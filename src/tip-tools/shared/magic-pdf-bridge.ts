/**
 * magic-pdf Worker Bridge — Framework-Agnostic Singleton
 *
 * TIP tools CANNOT use React hooks (no useState, no useEffect).
 * This module provides the same capabilities as WorkerManager inside
 * useMagicPdfWorker.ts but as a plain singleton that works anywhere:
 * in TIP tools, in tests, or in a future CLI.
 *
 * Worker message protocol (from magic-pdf.worker.ts):
 *   → { type: 'EXECUTE', action: string, data: object, id: string }
 *   ← { type: 'RESULT', data: any, id: string }
 *   ← { type: 'ERROR', error: string, id: string }
 *   ← { type: 'READY' }   (on startup)
 */

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject:  (reason: Error)  => void;
}

class MagicPdfWorkerBridge {
  private static instance: MagicPdfWorkerBridge;
  private worker: Worker | null = null;
  private initPromise: Promise<void> | null = null;
  private pending = new Map<string, PendingRequest>();

  private constructor() {}

  static getInstance(): MagicPdfWorkerBridge {
    if (!MagicPdfWorkerBridge.instance) {
      MagicPdfWorkerBridge.instance = new MagicPdfWorkerBridge();
    }
    return MagicPdfWorkerBridge.instance;
  }

  /** Lazily boot the worker. Safe to call multiple times. */
  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(
          new URL('../../workers/magic-pdf.worker.ts', import.meta.url)
        );

        this.worker.onmessage = (event: MessageEvent) => {
          const { type, data, id, error } = event.data as {
            type: 'READY' | 'RESULT' | 'ERROR';
            data?: unknown;
            id?: string;
            error?: string;
          };

          if (type === 'READY') {
            resolve();
            return;
          }

          if (!id) return;
          const req = this.pending.get(id);
          if (!req) return;
          this.pending.delete(id);

          if (type === 'RESULT') {
            req.resolve(data);
          } else {
            req.reject(new Error(error ?? 'magic-pdf worker error'));
          }
        };

        this.worker.onerror = (err) => {
          // Reject all pending on crash
          for (const req of this.pending.values()) {
            req.reject(new Error('magic-pdf worker crashed'));
          }
          this.pending.clear();
          reject(new Error(err.message ?? 'Worker failed to start'));
        };
      } catch (err) {
        reject(err);
      }
    });

    return this.initPromise;
  }

  /**
   * Execute an action on the magic-pdf worker.
   * Automatically initialises the worker on first call.
   *
   * @param action  - Python-side action name (e.g. 'compress', 'to_images')
   * @param payload - Data sent to the worker (must match PdfWorkerPayload shape)
   */
  async execute(action: string, payload: Record<string, unknown>): Promise<unknown> {
    await this.init();

    if (!this.worker) throw new Error('magic-pdf worker unavailable');

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ type: 'EXECUTE', action, data: payload, id });
    });
  }
}

/** Singleton accessor — import this in every magic-pdf TIPTool */
export const magicPdfBridge = MagicPdfWorkerBridge.getInstance();
