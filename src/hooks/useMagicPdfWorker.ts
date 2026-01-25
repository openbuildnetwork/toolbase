import { useState, useEffect, useRef, useCallback } from 'react';

export function useMagicPdfWorker() {
    const workerRef = useRef<Worker | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const worker = new Worker(new URL('../workers/magic-pdf.worker.ts', import.meta.url));
        workerRef.current = worker;

        worker.onmessage = (event) => {
            const { type } = event.data;
            if (type === 'READY') {
                setIsReady(true);
            }
        };

        worker.onerror = (err) => {
            console.error('Worker error:', err);
            setError('Failed to initialize worker');
        };

        return () => {
            worker.terminate();
        };
    }, []);

    const processPdf = useCallback(async (action: string, file: File | File[] | null, options: Record<string, any> = {}): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (!workerRef.current) return reject(new Error('Worker not ready'));

            setIsProcessing(true);
            setError(null);

            const files = Array.isArray(file) ? file : (file ? [file] : []);

            const readPromises = files.map(f => f.arrayBuffer());

            Promise.all(readPromises).then(buffers => {
                const uint8Arrays = buffers.map(b => new Uint8Array(b));

                const handleMessage = (event: MessageEvent) => {
                    const { type, data, error: workerError } = event.data;

                    if (type === 'RESULT') {
                        setIsProcessing(false);
                        workerRef.current?.removeEventListener('message', handleMessage);

                        if (data && data.error) {
                            reject(new Error(data.error));
                            return;
                        }

                        // Intelligently resolve based on data type
                        const isList = Array.isArray(data);
                        const isNestedList = isList && data.length > 0 && (Array.isArray(data[0]) || ArrayBuffer.isView(data[0]));

                        if (isNestedList) {
                            resolve(data as any);
                        } else if (typeof data === 'object' && !isList && data !== null) {
                            resolve(data as any);
                        } else {
                            resolve(data instanceof Uint8Array ? data : new Uint8Array(data));
                        }
                    } else if (type === 'ERROR') {
                        setIsProcessing(false);
                        workerRef.current?.removeEventListener('message', handleMessage);
                        setError(workerError);
                        reject(new Error(workerError));
                    }
                };

                workerRef.current?.addEventListener('message', handleMessage);

                const payload = {
                    file_bytes: uint8Arrays[0], // Keep legacy for single-file ops
                    files_bytes: uint8Arrays,   // New for multi-file ops
                    ...options
                };

                workerRef.current?.postMessage({
                    type: 'EXECUTE',
                    action,
                    data: payload
                });

            }).catch(err => {
                setIsProcessing(false);
                reject(new Error('Failed to read files: ' + err.message));
            });
        });
    }, []);

    return { processPdf, isReady, isProcessing, error };
}
