import { useState, useEffect, useCallback } from 'react';
import type { Base64Request, Base64Response } from '@/types/base64';
import { createTimer } from '@/lib/performance';

export interface UseBase64Result {
    process: (request: Base64Request) => Promise<Base64Response>;
    isReady: boolean;
    isProcessing: boolean;
    result: Base64Response | null;
    previewText: string;
    isLargeFile: boolean;
    error: string | null;
    downloadResult: (filename: string) => void;
    reset: () => void;
}

// Persistent Worker Singleton
let workerInstance: Worker | null = null;
let workerReadyPromise: Promise<boolean> | null = null;

function getBase64Worker() {
    if (!workerInstance) {
        console.log("Worker Manager: Initializing Base64 Worker (Singleton)...");
        workerInstance = new Worker(new URL('../workers/base64.worker.ts', import.meta.url));

        workerReadyPromise = new Promise((resolve) => {
            const tempListener = (event: MessageEvent) => {
                if (event.data.type === 'READY') {
                    console.log("Worker Manager: Base64 Worker Ready");
                    workerInstance?.removeEventListener('message', tempListener);
                    resolve(true);
                }
            };
            workerInstance?.addEventListener('message', tempListener);
        });
    }
    return { worker: workerInstance, ready: workerReadyPromise };
}

export function useBase64(): UseBase64Result {
    const [isReady, setIsReady] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<Base64Response | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const { ready } = getBase64Worker();
        ready?.then(() => {
            setIsReady(true);
        }).catch(err => {
            console.error(err);
            setError("Worker failed to start");
        });
    }, []);

    const process = useCallback((request: Base64Request): Promise<Base64Response> => {
        return new Promise((resolve, reject) => {
            const { worker } = getBase64Worker();
            if (!worker) {
                reject(new Error('Worker not initialized'));
                return;
            }

            const timer = createTimer();
            timer.start();

            setIsProcessing(true);
            setError(null);

            const handleMessage = (event: MessageEvent) => {
                const { type, data, error: workerError } = event.data;

                if (type === 'PROCESS_RESULT') {
                    worker.removeEventListener('message', handleMessage);
                    
                    timer.stop('base64');
                    
                    setIsProcessing(false);
                    setResult(data);
                    resolve(data);
                } else if (type === 'PROCESS_ERROR') {
                    worker.removeEventListener('message', handleMessage);
                    
                    timer.stop('base64');
                    
                    setIsProcessing(false);
                    setError(workerError);
                    reject(new Error(workerError));
                }
            };

            worker.addEventListener('message', handleMessage);
            worker.postMessage({ type: 'PROCESS', data: request });
        });
    }, []);

    const downloadResult = useCallback(
        (filename: string) => {
            if (!result || !result.success) {
                console.error('No result to download');
                return;
            }

            try {
                let blob: Blob;
                let downloadFilename = filename;

                // Determine what to download based on the result
                if (typeof result.result === 'string') {
                    // Text result (encoded string or decoded text)
                    blob = new Blob([result.result], { type: 'text/plain' });
                    if (!downloadFilename.endsWith('.txt')) {
                        downloadFilename += '.txt';
                    }
                } else if (Array.isArray(result.result)) {
                    // Binary result (decoded file)
                    const uint8Array = new Uint8Array(result.result);
                    blob = new Blob([uint8Array], { type: 'application/octet-stream' });
                    // Keep the original filename or add extension
                    if (!downloadFilename.includes('.')) {
                        downloadFilename += '.bin';
                    }
                } else if (result.result === null || result.result === undefined) {
                    console.error('Result data is null or undefined.');
                    setError('Cannot download: Result data is empty.');
                    return;
                } else {
                    console.error('Unknown result type:', typeof result.result, result.result);
                    setError('Cannot download: Unknown result format.');
                    return;
                }

                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = downloadFilename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(url), 100);
            } catch (err) {
                console.error('Error downloading file:', err);
                setError('Failed to download file');
            }
        },
        [result]
    );

    const reset = useCallback(() => {
        setResult(null);
        setError(null);
    }, []);

    const isLargeFile = result?.is_large ?? false;
    const previewText = result?.preview || (typeof result?.result === 'string' ? result.result : '');

    return {
        process,
        isReady,
        isProcessing,
        result,
        previewText,
        isLargeFile,
        error,
        downloadResult,
        reset,
    };
}
