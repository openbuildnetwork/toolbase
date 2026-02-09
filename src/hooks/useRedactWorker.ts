import { useState, useEffect, useCallback } from 'react';
import { RedactRequest, RedactResponse } from '@/types/redact';

// Persistent Worker Singleton
let workerInstance: Worker | null = null;
let workerReadyPromise: Promise<boolean> | null = null;

function getRedactWorker() {
    if (!workerInstance) {
        console.log("Worker Manager: Initializing Redact Worker (Singleton)...");
        workerInstance = new Worker(new URL('../workers/redact.worker.ts', import.meta.url));

        workerReadyPromise = new Promise((resolve) => {
            const tempListener = (event: MessageEvent) => {
                if (event.data.type === 'READY') {
                    console.log("Worker Manager: Redact Worker Ready");
                    workerInstance?.removeEventListener('message', tempListener);
                    resolve(true);
                }
            };
            workerInstance?.addEventListener('message', tempListener);
        });
    }
    return { worker: workerInstance, ready: workerReadyPromise };
}

export function useRedactWorker() {
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Init or check existing
        const { ready } = getRedactWorker();

        // If already ready, set state immediately
        ready?.then(() => {
            setIsReady(true);
        });

    }, []);

    const redact = useCallback((request: RedactRequest): Promise<RedactResponse> => {
        return new Promise((resolve, reject) => {
            const { worker } = getRedactWorker();
            if (!worker) {
                reject(new Error('Worker not initialized'));
                return;
            }

            setIsLoading(true);
            setError(null);

            const handleMessage = (event: MessageEvent) => {
                const { type, data, error: workerError } = event.data;

                if (type === 'REDACT_RESULT') {
                    worker.removeEventListener('message', handleMessage);
                    setIsLoading(false);
                    resolve(data);
                } else if (type === 'REDACT_ERROR') {
                    worker.removeEventListener('message', handleMessage);
                    setIsLoading(false);
                    setError(workerError);
                    reject(new Error(workerError));
                }
            };

            worker.addEventListener('message', handleMessage);
            worker.postMessage({ type: 'REDACT', data: request });
        });
    }, []);

    return { redact, isReady, isLoading, error };
}
