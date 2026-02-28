/**
 * redact-secrets Worker Bridge — Framework-Agnostic Singleton
 *
 * Worker message protocol (from redact.worker.ts):
 *   → { type: 'REDACT', data: RedactRequest, id: string }
 *   ← { type: 'REDACT_RESULT', data: RedactResponse, id: string }
 *   ← { type: 'REDACT_ERROR', error: string, id: string }
 *   ← { type: 'READY' }   (on startup)
 */

import type { RedactRequest, RedactResponse } from '@/types/redact';

interface PendingRequest {
  resolve: (value: RedactResponse) => void;
  reject:  (reason: Error) => void;
}

class RedactWorkerBridge {
  private static instance: RedactWorkerBridge;
  private worker: Worker | null = null;
  private initPromise: Promise<void> | null = null;
  private pending = new Map<string, PendingRequest>();

  private constructor() {}

  static getInstance(): RedactWorkerBridge {
    if (!RedactWorkerBridge.instance) {
      RedactWorkerBridge.instance = new RedactWorkerBridge();
    }
    return RedactWorkerBridge.instance;
  }

  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(
          new URL('../workers/redact.worker.ts', import.meta.url)
        );

        this.worker.onmessage = (event: MessageEvent) => {
          const { type, data, id, error } = event.data as {
            type: 'READY' | 'REDACT_RESULT' | 'REDACT_ERROR';
            data?: RedactResponse;
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

          if (type === 'REDACT_RESULT' && data) {
            req.resolve(data);
          } else {
            req.reject(new Error(error ?? 'redact worker error'));
          }
        };

        this.worker.onerror = (err) => {
          for (const req of this.pending.values()) {
            req.reject(new Error('redact worker crashed'));
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

  async redact(request: RedactRequest): Promise<RedactResponse> {
    await this.init();
    if (!this.worker) throw new Error('redact worker unavailable');

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ type: 'REDACT', data: request, id });
    });
  }
}

export const redactBridge = RedactWorkerBridge.getInstance();
