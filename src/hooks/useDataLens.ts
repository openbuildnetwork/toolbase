
import { useState, useEffect, useRef, useCallback } from 'react';

export interface EtlState {
    isReady: boolean;
    isProcessing: boolean;
    error: string | null;
    schemas: TableSchema[];
    queryResult: QueryResult | null;
}

export interface TableSchema {
    table_name: string;
    rows: number;
    columns: { name: string, type: string }[];
}

export interface QueryResult {
    success: boolean;
    data: any[];
    columns: string[];
    rowCount?: number;
    error?: string;
    message?: string;
}

export interface UseDataLensResult extends EtlState {
    loadFile: (file: File) => Promise<any>;
    runSql: (query: string) => Promise<any>;
    runPython: (code: string) => Promise<any>;
    refreshSchemas: () => Promise<any>;
}

export function useDataLens(): UseDataLensResult {
    const workerRef = useRef<Worker | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [schemas, setSchemas] = useState<TableSchema[]>([]);
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

    // Initial load
    useEffect(() => {
        console.log("Hook: Initializing DataLens worker...");
        const worker = new Worker(new URL('../workers/data-lens.worker.ts', import.meta.url));
        workerRef.current = worker;

        worker.onmessage = (event) => {
            const { type, data, error: workerError } = event.data;
            if (type === 'READY') {
                setIsReady(true);
            } else if (type === 'ERROR') {
                setError(workerError);
                setIsProcessing(false);
            }
        };

        worker.onerror = (err) => {
            console.error("Worker error:", err);
            setError("Worker initialization failed");
        };

        return () => {
            worker.terminate();
        };
    }, []);

    const sendMessage = useCallback((action: string, data: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (!workerRef.current) {
                reject(new Error("Worker not initialized"));
                return;
            }
            setIsProcessing(true);
            setError(null);

            const messageId = Math.random().toString(36).substring(7);

            const handleMessage = (event: MessageEvent) => {
                const { type, id, data: resultData, error } = event.data;
                console.log('Hook: Received message from worker:', { type, id, messageId, hasData: !!resultData });
                if (id === messageId) {
                    console.log('Hook: Message ID matches, processing result');
                    workerRef.current?.removeEventListener('message', handleMessage);
                    setIsProcessing(false);
                    if (type === 'ERROR') {
                        console.log('Hook: Error received:', error);
                        setError(error);
                        reject(new Error(error));
                    } else {
                        console.log('Hook: Success! Result data:', resultData);
                        resolve(resultData);
                    }
                }
            };

            workerRef.current.addEventListener('message', handleMessage);
            workerRef.current.postMessage({ type: 'EXECUTE', action, data, id: messageId });
        });
    }, []);

    const loadFile = useCallback(async (file: File) => {
        try {
            const buffer = await file.arrayBuffer();
            const content = new Uint8Array(buffer);
            const type = file.name.endsWith('.csv') ? 'csv' :
                file.name.endsWith('.json') ? 'json' :
                    file.name.endsWith('.xlsx') ? 'xlsx' : 'unknown';

            if (type === 'unknown') {
                throw new Error("Unsupported file type");
            }

            const res = await sendMessage('load_file', {
                filename: file.name,
                content: content,
                type
            });

            if (res.success) {
                // Refresh schemas
                const schemaRes = await sendMessage('get_schemas', {});
                setSchemas(schemaRes);
                return res;
            } else {
                throw new Error(res.error || "Failed to load file");
            }
        } catch (err: any) {
            setError(err.message);
            setIsProcessing(false);
            throw err;
        }
    }, [sendMessage]);

    const runSql = useCallback(async (query: string) => {
        try {
            console.log('Hook: runSql called with query:', query);
            const res = await sendMessage('run_sql', { query });
            console.log('Hook: runSql response:', res);
            if (res && res.success) {
                console.log('Hook: Setting queryResult with', res.data?.length, 'rows');
                setQueryResult(res);
            } else {
                console.log('Hook: runSql failed:', res?.error);
                setError(res?.error || 'Unknown error');
            }
            return res;
        } catch (err: any) {
            console.error('Hook: runSql exception:', err);
            setError(err.message);
        }
    }, [sendMessage]);

    const runPython = useCallback(async (code: string) => {
        try {
            const res = await sendMessage('run_python', { code });
            if (res.success) {
                setQueryResult(res);
            } else {
                setError(res.error);
            }
            return res;
        } catch (err: any) {
            setError(err.message);
        }
    }, [sendMessage]);

    const refreshSchemas = useCallback(async () => {
        try {
            const res = await sendMessage('get_schemas', {});
            setSchemas(res);
            return res;
        } catch (err: any) {
            console.error(err);
        }
    }, [sendMessage]);

    return {
        isReady,
        isProcessing,
        error,
        schemas,
        queryResult,
        loadFile,
        runSql,
        runPython,
        refreshSchemas
    };
}
