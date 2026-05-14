/**
 * useOpenDrawWorker - React Hook for communicating with the OpenDraw Python Worker
 * 
 * Features:
 * - Typed messaging with Zod validation
 * - Promise-based API with timeout fallback
 * - Loading states and error handling
 * - Singleton worker instance
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    WorkerCommand,
    WorkerResponse,
    WorkerResponseSchema,
    Graph,
    GraphNode,
    createMessageId,
} from '../types/open-draw.types';

// --- Types ---
type LayoutAlgorithm = 'hierarchical' | 'circular' | 'spring';

interface WorkerState {
    isReady: boolean;
    isLoading: boolean;
    error: string | null;
}

interface PendingRequest {
    resolve: (response: WorkerResponse) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
}

// --- Constants ---
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds for complex operations

// --- Singleton Worker Instance ---
let workerInstance: Worker | null = null;
let workerReadyPromise: Promise<void> | null = null;
const pendingRequests = new Map<string, PendingRequest>();

function getWorker(): Worker {
    if (!workerInstance) {
        workerInstance = new Worker(
            new URL('@/platform/workers/open-draw.worker.ts', import.meta.url),
            { type: 'module' }
        );

        // Setup global message handler
        workerInstance.onmessage = (event: MessageEvent) => {
            const response = event.data;

            // Handle READY message
            if (response.type === 'READY') {
                console.log('[useOpenDrawWorker] Worker is ready');
                return;
            }

            // Handle responses with IDs
            if (response.id && pendingRequests.has(response.id)) {
                const pending = pendingRequests.get(response.id)!;
                clearTimeout(pending.timeout);
                pendingRequests.delete(response.id);

                if (response.type === 'ERROR') {
                    pending.reject(new Error(response.error));
                } else {
                    pending.resolve(response);
                }
            }
        };

        workerInstance.onerror = (error) => {
            console.error('[useOpenDrawWorker] Worker error:', error);
        };
    }

    return workerInstance;
}

/**
 * Send a command to the worker and wait for a response.
 */
async function sendCommand<T extends WorkerResponse>(
    command: WorkerCommand,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
    const worker = getWorker();

    return new Promise<T>((resolve, reject) => {
        const id = command.id || createMessageId();
        const commandWithId = { ...command, id };

        const timeout = setTimeout(() => {
            pendingRequests.delete(id);
            reject(new Error(`Worker command timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        pendingRequests.set(id, {
            resolve: (response) => {
                // Validate response with Zod
                const parsed = WorkerResponseSchema.safeParse(response);
                if (parsed.success) {
                    resolve(parsed.data as T);
                } else {
                    reject(new Error(`Invalid worker response: ${parsed.error.message}`));
                }
            },
            reject,
            timeout,
        });

        worker.postMessage(commandWithId);
    });
}

/**
 * Wait for the worker to be ready.
 */
async function waitForReady(): Promise<void> {
    if (workerReadyPromise) return workerReadyPromise;

    workerReadyPromise = new Promise<void>((resolve, reject) => {
        const worker = getWorker();

        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'READY') {
                worker.removeEventListener('message', handleMessage);
                resolve();
            }
        };

        worker.addEventListener('message', handleMessage);

        // Also send INIT command
        sendCommand({ type: 'INIT', id: createMessageId() })
            .then(() => { })
            .catch(reject);

        // Timeout for initialization
        setTimeout(() => {
            reject(new Error('Worker initialization timed out'));
        }, 60000); // 60 seconds for cold start
    });

    return workerReadyPromise;
}

// --- React Hook ---

export function useOpenDrawWorker() {
    const [state, setState] = useState<WorkerState>({
        isReady: false,
        isLoading: true,
        error: null,
    });

    // Initialize worker on mount
    useEffect(() => {
        waitForReady()
            .then(() => {
                setState({ isReady: true, isLoading: false, error: null });
            })
            .catch((error) => {
                setState({ isReady: false, isLoading: false, error: error.message });
            });
    }, []);

    /**
     * Apply auto-layout to the graph.
     */
    const applyLayout = useCallback(
        async (
            graph: Graph,
            algorithm: LayoutAlgorithm,
            options?: Record<string, unknown>
        ): Promise<GraphNode[]> => {
            if (!state.isReady) {
                throw new Error('Worker is not ready');
            }

            const response = await sendCommand({
                type: 'AUTO_LAYOUT',
                id: createMessageId(),
                data: { graph, algorithm, options },
            });

            if (response.type === 'AUTO_LAYOUT_RESULT') {
                return response.data.nodes;
            }

            throw new Error('Unexpected response type');
        },
        [state.isReady]
    );

    /**
     * Detect cycles in the graph.
     */
    const detectCycles = useCallback(
        async (graph: Graph): Promise<{ hasCycles: boolean; cycles: string[][] }> => {
            if (!state.isReady) {
                throw new Error('Worker is not ready');
            }

            const response = await sendCommand({
                type: 'DETECT_CYCLES',
                id: createMessageId(),
                data: { graph },
            });

            if (response.type === 'DETECT_CYCLES_RESULT') {
                return response.data;
            }

            throw new Error('Unexpected response type');
        },
        [state.isReady]
    );

    /**
     * Find shortest path between two nodes.
     */
    const findShortestPath = useCallback(
        async (
            graph: Graph,
            sourceId: string,
            targetId: string
        ): Promise<{ path: string[] | null; length: number | null }> => {
            if (!state.isReady) {
                throw new Error('Worker is not ready');
            }

            const response = await sendCommand({
                type: 'SHORTEST_PATH',
                id: createMessageId(),
                data: { graph, sourceId, targetId },
            });

            if (response.type === 'SHORTEST_PATH_RESULT') {
                return response.data;
            }

            throw new Error('Unexpected response type');
        },
        [state.isReady]
    );

    /**
     * Parse Mermaid diagram syntax.
     */
    const parseMermaid = useCallback(
        async (content: string): Promise<Graph> => {
            if (!state.isReady) {
                throw new Error('Worker is not ready');
            }

            const response = await sendCommand({
                type: 'PARSE_MERMAID',
                id: createMessageId(),
                data: { content },
            });

            if (response.type === 'PARSE_RESULT') {
                return response.data.graph;
            }

            throw new Error('Unexpected response type');
        },
        [state.isReady]
    );

    /**
     * Parse XML (draw.io/Visio) diagram format.
     */
    const parseXML = useCallback(
        async (content: string): Promise<Graph> => {
            if (!state.isReady) {
                throw new Error('Worker is not ready');
            }

            const response = await sendCommand({
                type: 'PARSE_XML',
                id: createMessageId(),
                data: { content },
            });

            if (response.type === 'PARSE_RESULT') {
                return response.data.graph;
            }

            throw new Error('Unexpected response type');
        },
        [state.isReady]
    );

    return {
        // State
        isReady: state.isReady,
        isLoading: state.isLoading,
        error: state.error,

        // Methods
        applyLayout,
        detectCycles,
        findShortestPath,
        parseMermaid,
        parseXML,
    };
}

export type UseOpenDrawWorkerReturn = ReturnType<typeof useOpenDrawWorker>;
