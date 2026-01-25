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

    const processPdf = useCallback(async (action: string, file: File, options: Record<string, any> = {}): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (!workerRef.current) return reject(new Error('Worker not ready'));

            setIsProcessing(true);
            setError(null);

            const fileReader = new FileReader();
            fileReader.onload = (e) => {
                const buffer = e.target?.result as ArrayBuffer;
                const uint8Array = new Uint8Array(buffer);

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
                            // It's a list of lists or list of typed arrays (e.g. multiple images), return as is
                            resolve(data as any);
                        } else if (typeof data === 'object' && !isList && data !== null) {
                            // It's a results object (e.g. detection), return as is
                            resolve(data as any);
                        } else {
                            // It's a flat array of bytes, return as Uint8Array
                            // Use Uint8Array.from if it's not already a typed array
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

                // Construct payload matching Python's expectation
                // The worker will need to be updated to handle this 'data' structure if it expects plain bytes?
                // Actually, let's update the worker to accept { file_bytes, ...options }
                // But typically binary transfer is best done with transfer control. 
                // We'll trust the worker to repackage.

                workerRef.current?.postMessage({
                    type: 'EXECUTE',
                    action,
                    data: {
                        file_bytes: uint8Array,
                        ...options
                    }
                });
            };
            fileReader.readAsArrayBuffer(file);
        });
    }, []);

    return { processPdf, isReady, isProcessing, error };
}
