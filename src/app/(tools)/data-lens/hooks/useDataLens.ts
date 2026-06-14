import { useState, useEffect, useCallback } from 'react';
import { createTimer } from '@/lib/performance';

export interface EtlState {
    isReady: boolean;
    isProcessing: boolean;
    error: string | null;
    schemas: TableSchema[];
    queryResult: QueryResult | null;
    tableResult: QueryResult | null;
}

export interface TableSchema {
    table_name: string;
    rows: number;
    columns: { name: string, type: string }[];
}

export interface QueryResult {
    success: boolean;
    data: Record<string, unknown>[];
    columns: string[];
    rowCount?: number;
    error?: string;
    message?: string;
}

interface WorkerResponse {
    success: boolean;
    schemas?: TableSchema[];
    error?: string;
    schemas_updated?: boolean;
    [key: string]: unknown;
}

export interface UseDataLensResult extends EtlState {
    loadFile: (file: File) => Promise<unknown>;
    runSql: (query: string) => Promise<unknown>;
    runPython: (code: string) => Promise<unknown>;
    refreshSchemas: () => Promise<unknown>;
    deleteTable: (tableName: string) => Promise<unknown>;
    clearAllTables: () => Promise<void>;
    clearQueryResult: () => void;
    getRawJson: (tableName: string) => Promise<unknown>;
    queryJson: (tableName: string, query: string) => Promise<unknown>;
    selectTableData: (tableName: string) => Promise<unknown>;
}

async function readFirstNRows(file: File, maxRows: number): Promise<{ content: Uint8Array; isTruncated: boolean }> {
    const stream = file.stream();
    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');
    const encoder = new TextEncoder();
    
    let rowCount = 0;
    let accumulatedText = '';
    let isTruncated = false;
    
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            
            const text = decoder.decode(value, { stream: true });
            accumulatedText += text;
            
            const newlines = accumulatedText.match(/\n/g);
            rowCount = newlines ? newlines.length : 0;
            
            if (rowCount >= maxRows) {
                isTruncated = true;
                let pos = -1;
                for (let i = 0; i < maxRows; i++) {
                    pos = accumulatedText.indexOf('\n', pos + 1);
                }
                
                if (pos !== -1) {
                    accumulatedText = accumulatedText.substring(0, pos + 1);
                }
                await reader.cancel();
                break;
            }
        }
    } catch (e) {
        console.error("Error streaming file:", e);
    } finally {
        reader.releaseLock();
    }
    
    return {
        content: encoder.encode(accumulatedText),
        isTruncated
    };
}

// Persistent Worker Singleton
let workerInstance: Worker | null = null;
let workerReadyPromise: Promise<boolean> | null = null;

function getDataLensWorker() {
    if (!workerInstance) {
        console.log("Worker Manager: Initializing DataLens Worker (Singleton)...");
        workerInstance = new Worker(new URL('../../../../workers/data-lens.worker.ts', import.meta.url));

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
    const [tableResult, setTableResult] = useState<QueryResult | null>(null);

    const sendMessage = useCallback(<T = unknown>(action: string, data: Record<string, unknown>): Promise<T> => {
        return new Promise((resolve, reject) => {
            const { worker } = getDataLensWorker();
            if (!worker) {
                reject(new Error("Worker not initialized"));
                return;
            }

            const timer = createTimer();
            timer.start();

            setIsProcessing(true);
            setError(null);

            const messageId = Math.random().toString(36).substring(7);

            const handleMessage = (event: MessageEvent) => {
                const { type, id, data: resultData, error } = event.data;
                if (id === messageId) {
                    worker.removeEventListener('message', handleMessage);
                    
                    timer.stop('data-lens');
                    
                    setIsProcessing(false);
                    if (type === 'ERROR') {
                        setError(error);
                        reject(new Error(error));
                    } else {
                        resolve(resultData);
                    }
                }
            };

            worker.addEventListener('message', handleMessage);
            worker.postMessage({ type: 'EXECUTE', action, data, id: messageId });
        });
    }, []);

    const refreshSchemas = useCallback(async () => {
        try {
            const res = await sendMessage<WorkerResponse>('get_schemas', {});
            if (res && res.success && res.schemas) {
                setSchemas(res.schemas);
                return res.schemas;
            }
        } catch (err: unknown) {
            console.error(err);
        }
    }, [sendMessage]);

    // Initial load
    useEffect(() => {
        const { ready } = getDataLensWorker();
        ready?.then(() => {
            setIsReady(true);
            refreshSchemas();
        }).catch(err => {
            console.error("Worker initialization failed", err);
            setError("Worker initialization failed");
        });
    }, [refreshSchemas]);

    const loadFile = useCallback(async (file: File) => {
        try {
            const filenameLower = file.name.toLowerCase();
            const type = filenameLower.endsWith('.csv') ? 'csv' :
                filenameLower.endsWith('.tsv') ? 'tsv' :
                filenameLower.endsWith('.json') ? 'json' :
                filenameLower.endsWith('.xlsx') ? 'xlsx' :
                (filenameLower.endsWith('.parquet') || filenameLower.endsWith('.pq')) ? 'parquet' :
                (filenameLower.endsWith('.feather') || filenameLower.endsWith('.ft')) ? 'feather' :
                filenameLower.endsWith('.xml') ? 'xml' : 'unknown';

            if (type === 'unknown') {
                throw new Error("Unsupported file type");
            }

            const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB threshold for CSV/TSV preview
            const MAX_BINARY_SIZE = 50 * 1024 * 1024; // 50MB limit
            
            let content: Uint8Array;
            let filename = file.name;
            let isPreview = false;

            if ((type === 'csv' || type === 'tsv') && file.size > MAX_FILE_SIZE) {
                isPreview = true;
                const result = await readFirstNRows(file, 100000);
                content = result.content;

                // Append preview marker to filename
                const parts = file.name.split('.');
                const ext = parts.pop();
                filename = `${parts.join('.')}_preview.${ext}`;
            } else if (type !== 'csv' && type !== 'tsv' && file.size > MAX_BINARY_SIZE) {
                throw new Error(`File is too large to load in-browser (limit: 50MB for JSON/Excel/Parquet/Feather/XML).`);
            } else {
                const buffer = await file.arrayBuffer();
                content = new Uint8Array(buffer);
            }

            const res = await sendMessage<WorkerResponse>('load_file', {
                filename: filename,
                content: content,
                type
            });

            if (res.success) {
                const schemaRes = await sendMessage<WorkerResponse>('get_schemas', {});
                if (schemaRes.success && schemaRes.schemas) {
                    setSchemas(schemaRes.schemas);
                }
                
                if (isPreview) {
                    alert(`The file "${file.name}" is very large (${(file.size / (1024 * 1024)).toFixed(1)} MB). To ensure fast performance and prevent browser memory crashes, we loaded the first 100,000 rows as a preview named "${filename}".`);
                }
                return res;
            } else {
                throw new Error(res.error || "Failed to load file");
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            setIsProcessing(false);
            throw err;
        }
    }, [sendMessage]);

    const runSql = useCallback(async (query: string) => {
        try {
            const res = await sendMessage<QueryResult & { schemas_updated?: boolean }>('run_sql', { query });
            if (res && res.success) {
                setQueryResult(res);
                if (res.schemas_updated) {
                    await refreshSchemas();
                }
            } else {
                setError(res?.error || 'Unknown error');
            }
            return res;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('Hook: runSql exception:', err);
            setError(message);
        }
    }, [sendMessage, refreshSchemas]);

    const runPython = useCallback(async (code: string) => {
        try {
            const res = await sendMessage<QueryResult>('run_python', { code });
            if (res.success) {
                setQueryResult(res);
            } else {
                setError(res.error || 'Python execution failed');
            }
            return res;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
        }
    }, [sendMessage]);


    const deleteTable = useCallback(async (tableName: string) => {
        try {
            const res = await sendMessage<WorkerResponse>('delete_table', { table_name: tableName });
            if (res.success) {
                const schemaRes = await sendMessage<WorkerResponse>('get_schemas', {});
                if (schemaRes.success) {
                    setSchemas(schemaRes.schemas ?? []);
                }
                return res;
            } else {
                throw new Error(res.error || "Failed to delete table");
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw err;
        }
    }, [sendMessage]);

    const clearAllTables = useCallback(async () => {
        setIsProcessing(true);
        try {
            await sendMessage('clear_all', {});
            setSchemas([]);
            setTableResult(null);
            setQueryResult(null);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message || 'Failed to clear tables');
        } finally {
            setIsProcessing(false);
        }
    }, [sendMessage]);

    const clearQueryResult = useCallback(() => {
        setQueryResult(null);
    }, []);

    const getRawJson = useCallback(async (tableName: string) => {
        try {
            const res = await sendMessage('get_raw_json', { table_name: tableName });
            return res;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw err;
        }
    }, [sendMessage]);

    const queryJson = useCallback(async (tableName: string, query: string) => {
        try {
            const res = await sendMessage<WorkerResponse & QueryResult>('query_json', { table_name: tableName, query });
            if (res.success && !res.is_json) {
                setQueryResult(res as QueryResult);
            }
            return res;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw err;
        }
    }, [sendMessage]);

    const selectTableData = useCallback(async (tableName: string) => {
        try {
            const res = await sendMessage<QueryResult>('run_sql', { query: `SELECT * FROM "${tableName}" LIMIT 1000` });
            if (res.success) {
                setTableResult(res);
            } else {
                setError(res.error ?? null);
            }
            return res;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
        }
    }, [sendMessage]);

    return {
        isReady,
        isProcessing,
        error,
        schemas,
        queryResult,
        tableResult,
        loadFile,
        runSql,
        runPython,
        refreshSchemas,
        deleteTable,
        clearAllTables,
        clearQueryResult,
        getRawJson,
        queryJson,
        selectTableData
    };
}
