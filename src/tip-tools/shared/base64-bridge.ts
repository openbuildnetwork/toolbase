/**
 * base64 Worker Bridge — Framework-Agnostic Singleton
 *
 * Worker message protocol (from base64.worker.ts):
 *   → { type: 'PROCESS', data: Base64Request, id: string }
 *   ← { type: 'PROCESS_RESULT', data: Base64Response, id: string }
 *   ← { type: 'PROCESS_ERROR', error: string, id: string }
 *   ← { type: 'READY' }   (on startup)
 */

import type { Base64Request, Base64Response } from '../../types/base64';

interface PendingRequest {
  resolve: (value: Base64Response) => void;
  reject:  (reason: Error) => void;
}

class Base64WorkerBridge {
  private static instance: Base64WorkerBridge;
  private worker: Worker | null = null;
  private initPromise: Promise<void> | null = null;
  private pending = new Map<string, PendingRequest>();

  private constructor() {}

  static getInstance(): Base64WorkerBridge {
    if (!Base64WorkerBridge.instance) {
      Base64WorkerBridge.instance = new Base64WorkerBridge();
    }
    return Base64WorkerBridge.instance;
  }

  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(
          new URL('../../workers/base64.worker.ts', import.meta.url)
        );

        this.worker.onmessage = (event: MessageEvent) => {
          const { type, data, id, error } = event.data as {
            type: 'READY' | 'PROCESS_RESULT' | 'PROCESS_ERROR' | 'ERROR';
            data?: Base64Response;
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

          if (type === 'PROCESS_RESULT' && data) {
            req.resolve(data);
          } else {
            req.reject(new Error(error ?? 'base64 worker error'));
          }
        };

        this.worker.onerror = (err) => {
          for (const req of this.pending.values()) {
            req.reject(new Error('base64 worker crashed'));
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

  async process(request: Base64Request): Promise<Base64Response> {
    await this.init();
    if (!this.worker) throw new Error('base64 worker unavailable');

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      this.pending.set(id, { resolve, reject });
      // Note: base64 worker uses 'PROCESS' (not 'EXECUTE') and data key (not action)
      this.worker!.postMessage({ type: 'PROCESS', data: request, id });
    });
  }
}

export const base64Bridge = Base64WorkerBridge.getInstance();
