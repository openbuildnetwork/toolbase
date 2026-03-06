import { useState, useEffect, useCallback } from 'react';
import { RedactRequest, RedactResponse } from '@/types/redact';

export type RedactEngineLabel = 'Rust WASM' | 'Unavailable';

// Persistent Worker Singleton
let workerInstance: Worker | null = null;
let workerReadyPromise: Promise<RedactEngineLabel> | null = null;
let currentEngineLabel: RedactEngineLabel = 'Unavailable';

function getRedactWorker() {
    if (!workerInstance) {
        console.log("Worker Manager: Initializing Redact Worker (Singleton)...");
        workerInstance = new Worker(new URL('../workers/redact.worker.ts', import.meta.url), { type: 'module' });

        workerReadyPromise = new Promise((resolve) => {
            const tempListener = (event: MessageEvent) => {
                if (event.data.type === 'READY') {
                    currentEngineLabel = event.data.engine === 'Rust WASM' ? 'Rust WASM' : 'Unavailable';
                    console.log("Worker Manager: Redact Worker Ready");
                    workerInstance?.removeEventListener('message', tempListener);
                    resolve(currentEngineLabel);
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
    const [engineLabel, setEngineLabel] = useState<RedactEngineLabel>(currentEngineLabel);

    useEffect(() => {
        const { ready } = getRedactWorker();

        ready?.then((engine) => {
            setEngineLabel(engine);
            setIsReady(true);
            if (engine !== 'Rust WASM') {
                setError('Rust WASM engine is unavailable. Build artifacts may be missing.');
            }
        });

    }, []);

    const redact = useCallback((request: RedactRequest): Promise<RedactResponse> => {
        return new Promise((resolve, reject) => {
            const { worker } = getRedactWorker();
            if (!worker) {
                reject(new Error('Worker not initialized'));
                return;
            }

            if (engineLabel !== 'Rust WASM') {
                const unavailableError = new Error('Rust WASM engine is unavailable for Redact Secrets.');
                setError(unavailableError.message);
                reject(unavailableError);
                return;
            }

            setIsLoading(true);
            setError(null);

            const handleMessage = (event: MessageEvent) => {
                const { type, data, error: workerError } = event.data;

                if (type === 'REDACT_RESULT') {
                    worker.removeEventListener('message', handleMessage);
                    setIsLoading(false);
                    if (event.data.engine === 'Rust WASM' || event.data.engine === 'Unavailable') {
                        setEngineLabel(event.data.engine);
                    }
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
    }, [engineLabel]);

    return { redact, isReady, isLoading, error, engineLabel };
}
