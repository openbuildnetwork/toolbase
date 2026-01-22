import { useState, useEffect, useRef, useCallback } from 'react';
import { RedactRequest, RedactResponse } from '@/types/redact';

export function useRedactWorker() {
    const workerRef = useRef<Worker | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('Hook: Initializing worker...');
        // Initialize the worker
        const worker = new Worker(new URL('../workers/redact.worker.ts', import.meta.url));
        workerRef.current = worker;

        worker.onmessage = (event) => {
            console.log('Hook: Message from worker:', event.data.type);
            const { type } = event.data;
            if (type === 'READY') {
                setIsReady(true);
            }
        };

        worker.onerror = (error) => {
            console.error('Hook: Worker error:', error);
            setError('Worker creation error');
        };

        return () => {
            console.log('Hook: Terminating worker');
            worker.terminate();
        };
    }, []);

    const redact = useCallback((request: RedactRequest): Promise<RedactResponse> => {
        return new Promise((resolve, reject) => {
            if (!workerRef.current) {
                reject(new Error('Worker not initialized'));
                return;
            }

            setIsLoading(true);
            setError(null);

            const handleMessage = (event: MessageEvent) => {
                const { type, data, error: workerError } = event.data;

                if (type === 'REDACT_RESULT') {
                    workerRef.current?.removeEventListener('message', handleMessage);
                    setIsLoading(false);
                    resolve(data);
                } else if (type === 'REDACT_ERROR') {
                    workerRef.current?.removeEventListener('message', handleMessage);
                    setIsLoading(false);
                    setError(workerError);
                    reject(new Error(workerError));
                }
            };

            workerRef.current.addEventListener('message', handleMessage);
            workerRef.current.postMessage({ type: 'REDACT', data: request });
        });
    }, []);

    return { redact, isReady, isLoading, error };
}
