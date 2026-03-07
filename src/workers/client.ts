/**
 * Generic Worker Client
 *
 * Replaces all bespoke bridge files (magic-pdf-bridge.ts, pixel-axe-bridge.ts, etc).
 * Manages the lifecycle of a Web Worker (initialization, message passing, error handling).
 *
 * Worker message protocol:
 *   → { type: 'EXECUTE', action: string, data: object, id: string }
 *   ← { type: 'RESULT', data: any, id: string }
 *   ← { type: 'ERROR', error: string, id: string }
 *   ← { type: 'READY' }   (on startup)
 */

export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

export class WorkerClient {
  private worker: Worker | null = null;
  private initPromise: Promise<void> | null = null;
  private pending = new Map<string, PendingRequest>();

  /**
   * @param createWorker A factory function that returns a new Web Worker instance.
   *                     e.g. () => new Worker(new URL('../workers/magic-pdf.worker.ts', import.meta.url))
   * @param workerName   A human-readable name for logging and error messages.
   */
  constructor(
    private createWorker: () => Worker,
    private workerName: string
  ) {}

  /** Lazily boot the worker. Safe to call multiple times. */
  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      try {
        this.worker = this.createWorker();

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
            req.reject(new Error(error ?? `${this.workerName} worker error`));
          }
        };

        this.worker.onerror = (err) => {
          // Reject all pending on crash
          for (const req of this.pending.values()) {
            req.reject(new Error(`${this.workerName} worker crashed`));
          }
          this.pending.clear();
          reject(new Error(err.message ?? `Failed to start ${this.workerName} worker`));
        };
      } catch (err) {
        reject(err);
      }
    });

    return this.initPromise;
  }

  /**
   * Execute an action on the worker.
   * Automatically initializes the worker on first call.
   *
   * @param action  - Python-side action name (e.g. 'compress', 'to_images')
   * @param payload - Data sent to the worker, translated to Python kwargs
   * @param transfer - Optional array of Transferable objects to transfer ownership
   */
  async execute(action: string, payload: Record<string, unknown>, transfer?: Transferable[]): Promise<unknown> {
    await this.init();

    if (!this.worker) throw new Error(`${this.workerName} worker unavailable`);

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ type: 'EXECUTE', action, data: payload, id }, transfer || []);
    });
  }
}
