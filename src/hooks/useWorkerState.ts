import { useEffect, useState } from 'react';
import { workerForTool } from '@/workers/instances';
import type { WorkerReadyState } from '@/workers/client';

/**
 * useWorkerState — Subscribes to the WorkerClient readyState for a given tool.
 * Useful for showing "warming up runtime…" indicators while WASM boots.
 */
export function useWorkerState(toolId: string) {
    const worker = workerForTool(toolId);

    const [readyState, setReadyState] = useState<WorkerReadyState>(() => worker?.readyState ?? 'ready');
    const [warmMessage, setWarmMessage] = useState('');

    useEffect(() => {
        if (!worker) return;

        const unsubscribe = worker.subscribe((state, message) => {
            setReadyState(state);
            setWarmMessage(message ?? '');
        });

        return unsubscribe;
    }, [worker]);

    return { readyState, warmMessage };
}
