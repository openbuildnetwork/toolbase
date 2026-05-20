import { useState, useEffect, useCallback } from 'react';
import { RedactRequest, RedactResponse } from '@/app/(tools)/redact-secrets/types/redact';

export type RedactEngineLabel = 'Rust WASM' | 'Unavailable';

import { redactSecretsWorker } from '@/workers/instances';

export function useRedactWorker() {
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [engineLabel, setEngineLabel] = useState<RedactEngineLabel>(
        redactSecretsWorker.readyState === 'ready' ? 'Rust WASM' : 'Unavailable'
    );

    useEffect(() => {
        const handleReadyStateChange = (state: string, message?: string) => {
            setIsReady(state === 'ready');
            setEngineLabel(state === 'ready' ? 'Rust WASM' : 'Unavailable');
            if (state === 'cold' && message) {
                setError(message);
            }
        };

        const unsubscribe = redactSecretsWorker.subscribe(handleReadyStateChange as (state: string, message?: string) => void);
        
        // Trigger initialization
        redactSecretsWorker.init().catch(err => {
            console.error('Failed to init redact secrets worker:', err);
        });

        // Initial sync
        handleReadyStateChange(redactSecretsWorker.readyState);

        return () => {
            unsubscribe();
        };
    }, []);

    const redact = useCallback(async (request: RedactRequest): Promise<RedactResponse> => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await redactSecretsWorker.execute('redact', request as unknown as Record<string, unknown>);
            return result as RedactResponse;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Redaction failed';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { redact, isReady, isLoading, error, engineLabel };
}
