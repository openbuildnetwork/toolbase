import { useState, useEffect, useRef, useCallback } from 'react';
import type { Base64Request, Base64Response } from '@/types/base64';

interface UseBase64Result {
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

export function useBase64(): UseBase64Result {
    const workerRef = useRef<Worker | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<Base64Response | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('Hook: Initializing Base64 worker...');
        // Initialize the worker
        const worker = new Worker(new URL('../workers/base64.worker.ts', import.meta.url));
        workerRef.current = worker;

        worker.onmessage = (event) => {
            console.log('Hook: Message from worker:', event.data.type);
            const { type } = event.data;
            if (type === 'READY') {
                setIsReady(true);
            } else if (type === 'ERROR') {
                setError(event.data.error);
            }
        };

        worker.onerror = (error) => {
            console.error('Hook: Worker error:', error);
            setError('Worker initialization error');
        };

        return () => {
            console.log('Hook: Terminating Base64 worker');
            worker.terminate();
        };
    }, []);

    const process = useCallback((request: Base64Request): Promise<Base64Response> => {
        return new Promise((resolve, reject) => {
            if (!workerRef.current) {
                reject(new Error('Worker not initialized'));
                return;
            }

            setIsProcessing(true);
            setError(null);

            const handleMessage = (event: MessageEvent) => {
                const { type, data, error: workerError } = event.data;

                if (type === 'PROCESS_RESULT') {
                    workerRef.current?.removeEventListener('message', handleMessage);
                    setIsProcessing(false);
                    setResult(data);
                    resolve(data);
                } else if (type === 'PROCESS_ERROR') {
                    workerRef.current?.removeEventListener('message', handleMessage);
                    setIsProcessing(false);
                    setError(workerError);
                    reject(new Error(workerError));
                }
            };

            workerRef.current.addEventListener('message', handleMessage);
            workerRef.current.postMessage({ type: 'PROCESS', data: request });
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
                    // Handle null/undefined result (shouldn't happen with fixed Python code)
                    console.error('Result data is null or undefined. This may indicate a processing error.');
                    setError('Cannot download: Result data is empty. Please try processing again.');
                    return;
                } else {
                    console.error('Unknown result type:', typeof result.result, result.result);
                    setError('Cannot download: Unknown result format.');
                    return;
                }

                // Create download link
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = downloadFilename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Cleanup
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

    // Compute derived states
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
