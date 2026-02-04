import { useState, useEffect, useCallback } from 'react';

// Singleton Worker Manager to avoid re-initializing Pyodide/Worker on every mount
class WorkerManager {
    private static instance: WorkerManager;
    private worker: Worker | null = null;
    private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();
    private readyListeners = new Set<(isReady: boolean) => void>();
    private _isReady = false;
    private initializationPromise: Promise<void> | null = null;

    private constructor() { }

    public static getInstance() {
        if (!WorkerManager.instance) {
            WorkerManager.instance = new WorkerManager();
        }
        return WorkerManager.instance;
    }

    public get isReady() {
        return this._isReady;
    }

    public init() {
        if (this.initializationPromise) return this.initializationPromise;

        this.initializationPromise = new Promise((resolve, reject) => {
            if (this.worker) return resolve();

            try {
                this.worker = new Worker(new URL('../workers/magic-pdf.worker.ts', import.meta.url));

                this.worker.onmessage = (event) => {
                    const { type, data, id, error } = event.data;

                    if (type === 'READY') {
                        this._isReady = true;
                        this.notifyListeners();
                        resolve();
                    } else if (type === 'RESULT') {
                        const request = this.pendingRequests.get(id);
                        if (request) {
                            // Intelligently resolve based on data type (logic preserved)
                            const isList = Array.isArray(data);
                            const isNestedList = isList && data.length > 0 && (Array.isArray(data[0]) || ArrayBuffer.isView(data[0]));

                            let result = data;
                            if (isNestedList) {
                                result = data;
                            } else if (typeof data === 'object' && !isList && data !== null) {
                                result = data;
                            } else {
                                result = data instanceof Uint8Array ? data : new Uint8Array(data);
                            }

                            request.resolve(result);
                            this.pendingRequests.delete(id);
                        }
                    } else if (type === 'ERROR') {
                        const request = this.pendingRequests.get(id);
                        if (request) {
                            request.reject(new Error(error));
                            this.pendingRequests.delete(id);
                        }
                    }
                };

                this.worker.onerror = (err) => {
                    console.error('Worker Global Error:', err);
                    // Reject all pending
                    for (const [_, req] of this.pendingRequests) {
                        req.reject(new Error('Worker crashed'));
                    }
                    this.pendingRequests.clear();
                    this._isReady = false;
                    this.notifyListeners();
                };

            } catch (e) {
                console.error("Failed to create worker:", e);
                reject(e);
            }
        });

        return this.initializationPromise;
    }

    public subscribe(listener: (isReady: boolean) => void) {
        this.readyListeners.add(listener);
        // Initial call
        listener(this._isReady);
        return () => this.readyListeners.delete(listener);
    }

    private notifyListeners() {
        for (const listener of this.readyListeners) {
            listener(this._isReady);
        }
    }

    public execute(action: string, payload: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                this.init(); // Try to init if not ready
            }
            // If still not ready after init call (async), wait? 
            // Better: just queue it if worker exists, or wait for ready?
            // For now, assume UI checks isReady. But we can queue.

            if (!this.worker) return reject(new Error("Worker failed to initialize"));

            const id = crypto.randomUUID();
            this.pendingRequests.set(id, { resolve, reject });

            this.worker.postMessage({
                type: 'EXECUTE',
                action,
                data: payload,
                id
            });
        });
    }

    public terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this._isReady = false;
            this.initializationPromise = null;
            this.notifyListeners();
            // Reject all pending
            for (const [_, req] of this.pendingRequests) {
                req.reject(new Error('Worker terminated'));
            }
            this.pendingRequests.clear();
        }
    }
}

export function useMagicPdfWorker() {
    const manager = WorkerManager.getInstance();
    const [isReady, setIsReady] = useState(manager.isReady);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Initialize worker on hook mount if not already
        manager.init().catch(err => {
            console.error("Failed to init worker from hook:", err);
            setError("Failed to initialize worker");
        });

        // Subscribe to ready state
        const unsubscribe = manager.subscribe(setIsReady);
        return () => { unsubscribe(); };
    }, []);

    const processPdf = useCallback(async (action: string, file: File | File[] | null, options: Record<string, any> = {}): Promise<any> => {
        setIsProcessing(true);
        setError(null);

        try {
            const files = Array.isArray(file) ? file : (file ? [file] : []);
            const readPromises = files.map(f => f.arrayBuffer());
            const buffers = await Promise.all(readPromises);
            const uint8Arrays = buffers.map(b => new Uint8Array(b));

            const payload = {
                file_bytes: uint8Arrays[0], // Keep legacy for single-file ops
                files_bytes: uint8Arrays,   // New for multi-file ops
                ...options
            };

            const result = await manager.execute(action, payload);
            return result;
        } catch (err: any) {
            console.error("Process PDF Error:", err);
            setError(err.message);
            throw err;
        } finally {
            setIsProcessing(false);
        }
    }, []);

    return { processPdf, isReady, isProcessing, error };
}

