/**
 * pixel-axe Worker Bridge — Framework-Agnostic Singleton
 *
 * Worker message protocol (from pixel-axe.worker.ts):
 *   → { type: 'EXECUTE', action: string, data: object, id: string }
 *   ← { type: 'RESULT', data: any, id: string }
 *   ← { type: 'ERROR', error: string, id: string }
 *   ← { type: 'READY' }   (on startup)
 */

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject:  (reason: Error)  => void;
}

class PixelAxeWorkerBridge {
  private static instance: PixelAxeWorkerBridge;
  private worker: Worker | null = null;
  private initPromise: Promise<void> | null = null;
  private pending = new Map<string, PendingRequest>();

  private constructor() {}

  static getInstance(): PixelAxeWorkerBridge {
    if (!PixelAxeWorkerBridge.instance) {
      PixelAxeWorkerBridge.instance = new PixelAxeWorkerBridge();
    }
    return PixelAxeWorkerBridge.instance;
  }

  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(
          new URL('../workers/pixel-axe.worker.ts', import.meta.url)
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
            req.reject(new Error(error ?? 'pixel-axe worker error'));
          }
        };

        this.worker.onerror = (err) => {
          for (const req of this.pending.values()) {
            req.reject(new Error('pixel-axe worker crashed'));
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

  async execute(action: string, payload: Record<string, unknown>): Promise<unknown> {
    await this.init();
    if (!this.worker) throw new Error('pixel-axe worker unavailable');

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ type: 'EXECUTE', action, data: payload, id });
    });
  }
}

export const pixelAxeBridge = PixelAxeWorkerBridge.getInstance();
