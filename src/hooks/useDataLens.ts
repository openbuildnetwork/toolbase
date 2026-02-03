
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
    deleteTable: (tableName: string) => Promise<any>;
    clearQueryResult: () => void;
    getRawJson: (tableName: string) => Promise<any>;
    queryJson: (tableName: string, query: string) => Promise<any>;
}

// Persistent Worker Singleton
let workerInstance: Worker | null = null;
let workerReadyPromise: Promise<boolean> | null = null;

function getDataLensWorker() {
    if (!workerInstance) {
        console.log("Worker Manager: Initializing DataLens Worker (Singleton)...");
        workerInstance = new Worker(new URL('../workers/data-lens.worker.ts', import.meta.url));

        workerReadyPromise = new Promise((resolve) => {
            const tempListener = (event: MessageEvent) => {
                if (event.data.type === 'READY') {
                    console.log("Worker Manager: DataLens Worker Ready");
                    workerInstance?.removeEventListener('message', tempListener);
                    resolve(true);
                }
            };
            workerInstance?.addEventListener('message', tempListener);
        });
    }
    return { worker: workerInstance, ready: workerReadyPromise };
}

export function useDataLens(): UseDataLensResult {
    const [isReady, setIsReady] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [schemas, setSchemas] = useState<TableSchema[]>([]);
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

    // Initial load
    useEffect(() => {
        const { ready } = getDataLensWorker();
        ready?.then(() => {
            setIsReady(true);
            // On re-connect, we might want to fetch existing state from worker if we were advanced enough,
            // but for now we just acknowledge readiness.
            // If data persisted in worker memory, we can fetch schemas.
            refreshSchemas();
        }).catch(err => {
            console.error("Worker initialization failed", err);
            setError("Worker initialization failed");
        });
    }, []);

    const sendMessage = useCallback((action: string, data: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            const { worker } = getDataLensWorker();
            if (!worker) {
                reject(new Error("Worker not initialized"));
                return;
            }
            setIsProcessing(true);
            setError(null);

            const messageId = Math.random().toString(36).substring(7);

            const handleMessage = (event: MessageEvent) => {
                const { type, id, data: resultData, error } = event.data;
                // console.log('Hook: Received message from worker:', { type, id, messageId, hasData: !!resultData });
                if (id === messageId) {
                    worker.removeEventListener('message', handleMessage);
                    setIsProcessing(false);
                    if (type === 'ERROR') {
                        console.log('Hook: Error received:', error);
                        setError(error);
                        reject(new Error(error));
                    } else {
                        // console.log('Hook: Success! Result data:', resultData);
                        resolve(resultData);
                    }
                }
            };

            worker.addEventListener('message', handleMessage);
            worker.postMessage({ type: 'EXECUTE', action, data, id: messageId });
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
                if (schemaRes.success) {
                    setSchemas(schemaRes.schemas);
                }
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
            const res = await sendMessage('run_sql', { query });
            if (res && res.success) {
                setQueryResult(res);
            } else {
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
            if (res.success) {
                setSchemas(res.schemas);
                return res.schemas;
            } else {
                // Allow failure if not ready yet
                // throw new Error(res.error || "Failed to fetch schemas");
            }
        } catch (err: any) {
            console.error(err);
        }
    }, [sendMessage]);

    const deleteTable = useCallback(async (tableName: string) => {
        try {
            const res = await sendMessage('delete_table', { table_name: tableName });
            if (res.success) {
                // Refresh schemas after deletion
                const schemaRes = await sendMessage('get_schemas', {});
                if (schemaRes.success) {
                    setSchemas(schemaRes.schemas);
                }
                return res;
            } else {
                throw new Error(res.error || "Failed to delete table");
            }
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    }, [sendMessage]);

    const clearQueryResult = useCallback(() => {
        setQueryResult(null);
    }, []);

    const getRawJson = useCallback(async (tableName: string) => {
        try {
            const res = await sendMessage('get_raw_json', { table_name: tableName });
            return res;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    }, [sendMessage]);

    const queryJson = useCallback(async (tableName: string, query: string) => {
        try {
            const res = await sendMessage('query_json', { table_name: tableName, query });
            if (res.success && !res.is_json) {
                // Regular table result
                setQueryResult(res);
            }
            return res;
        } catch (err: any) {
            setError(err.message);
            throw err;
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
        refreshSchemas,
        deleteTable,
        clearQueryResult,
        getRawJson,
        queryJson
    };
}
